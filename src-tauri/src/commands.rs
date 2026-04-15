use crate::db::Database;
use crate::memory::MemoryManager;
use crate::oauth::OAuthManager;
use crate::session::{HarnessStats, Message, Session};
use crate::sidecar::{ChatMessage, ChatParams, SidecarManager};
use crate::skills::SkillRegistry;
use serde::{Deserialize, Serialize};
use tauri::State;

// ────────────────────────── Chat ──────────────────────────

#[tauri::command]
pub async fn send_message(
    db: State<'_, Database>,
    memory: State<'_, MemoryManager>,
    skills: State<'_, SkillRegistry>,
    sidecar: State<'_, SidecarManager>,
    session_id: String,
    content: String,
) -> Result<Message, String> {
    let msg_id = uuid::Uuid::new_v4().to_string();

    // Store user message
    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content) VALUES (?1, ?2, 'user', ?3)",
            rusqlite::params![&msg_id, &session_id, &content],
        )
        .map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?1",
            rusqlite::params![&session_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Fetch recent messages for context
    let history = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT role, content FROM messages WHERE session_id = ?1 ORDER BY created_at DESC LIMIT 20",
            )
            .map_err(|e| e.to_string())?;
        let msgs: Vec<ChatMessage> = stmt
            .query_map(rusqlite::params![&session_id], |row| {
                Ok(ChatMessage {
                    role: row.get(0)?,
                    content: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        msgs.into_iter().rev().collect::<Vec<_>>()
    };

    // Build memory context
    let system_context = memory.build_system_context();

    // Build L0 skill list
    let skills_summary: Vec<String> = skills
        .list()
        .iter()
        .map(|s| format!("- {}: {}", s.name, s.description))
        .collect();

    // Try sidecar, fall back to local response
    let reply_content = match sidecar.chat(ChatParams {
        session_id: session_id.clone(),
        messages: history,
        system_context,
        skills_summary,
    }) {
        Ok(result) => {
            // Handle skill auto-creation
            if let Some(skill_update) = result.skill_update {
                let _ = skills.save_skill(&skill_update.name, &skill_update.content);
                tracing::info!("Auto-created skill: {}", skill_update.name);
            }
            result.content
        }
        Err(_) => {
            // Sidecar not running — return a helpful message
            format!(
                "Hi! I'm Lume, your AI assistant. I received your message:\n\n> {}\n\nThe agent sidecar is not connected yet. To enable AI responses:\n\n1. Set your API key in **Settings**\n2. Or use the **Built-in Relay** (no key needed)\n\nI'll remember everything once connected.",
                content
            )
        }
    };

    // Record tool call for skill checkpoint
    let should_evaluate = skills.record_tool_call();
    if should_evaluate {
        tracing::info!("Skill evaluation checkpoint triggered for session {}", session_id);
    }

    // Store reply
    let reply_id = uuid::Uuid::new_v4().to_string();
    let reply = Message {
        id: reply_id.clone(),
        session_id: session_id.clone(),
        role: "assistant".into(),
        content: reply_content,
        tool_calls: None,
        token_count: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content) VALUES (?1, ?2, 'assistant', ?3)",
            rusqlite::params![&reply.id, &session_id, &reply.content],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(reply)
}

// ────────────────────────── Sessions ──────────────────────────

#[tauri::command]
pub async fn create_session(db: State<'_, Database>, title: String) -> Result<Session, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO sessions (id, title) VALUES (?1, ?2)",
        rusqlite::params![&id, &title],
    )
    .map_err(|e| e.to_string())?;

    Ok(Session {
        id,
        title,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn get_sessions(db: State<'_, Database>) -> Result<Vec<Session>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let sessions = stmt
        .query_map([], |row| {
            Ok(Session {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(sessions)
}

#[tauri::command]
pub async fn get_session_messages(
    db: State<'_, Database>,
    session_id: String,
) -> Result<Vec<Message>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, session_id, role, content, tool_calls, token_count, created_at
             FROM messages WHERE session_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let messages = stmt
        .query_map(rusqlite::params![&session_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tool_calls: row.get(4)?,
                token_count: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(messages)
}

// ────────────────────────── Memory ──────────────────────────

#[tauri::command]
pub async fn get_memory_profile(
    memory: State<'_, MemoryManager>,
) -> Result<crate::memory::MemoryProfile, String> {
    let profile = memory.profile.lock().map_err(|e| e.to_string())?;
    Ok(profile.clone())
}

#[tauri::command]
pub async fn update_memory(
    memory: State<'_, MemoryManager>,
    layer: String,
    content: String,
) -> Result<String, String> {
    match layer.as_str() {
        "user" => {
            memory.update_user(&content)?;
            Ok("USER.md updated".into())
        }
        "env" => {
            memory.update_env(&content)?;
            Ok("ENV.md updated".into())
        }
        _ => Err("Invalid layer. Use 'user' or 'env'.".into()),
    }
}

#[tauri::command]
pub async fn search_memory(
    db: State<'_, Database>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<Message>, String> {
    let limit = limit.unwrap_or(10);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.session_id, m.role, m.content, m.tool_calls, m.token_count, m.created_at
             FROM messages m
             JOIN messages_fts f ON m.rowid = f.rowid
             WHERE messages_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map(rusqlite::params![&query, &limit], |row| {
            Ok(Message {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tool_calls: row.get(4)?,
                token_count: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

// ────────────────────────── Skills ──────────────────────────

#[tauri::command]
pub async fn list_skills(
    skills: State<'_, SkillRegistry>,
) -> Result<Vec<crate::skills::SkillMeta>, String> {
    Ok(skills.list())
}

#[tauri::command]
pub async fn get_skill(
    skills: State<'_, SkillRegistry>,
    name: String,
    section: Option<String>,
) -> Result<String, String> {
    match section {
        Some(s) => skills
            .get_section(&name, &s)
            .ok_or_else(|| format!("Section '{}' not found in skill '{}'", s, name)),
        None => skills
            .get_full(&name)
            .ok_or_else(|| format!("Skill '{}' not found", name)),
    }
}

// ────────────────────────── Harness Stats ──────────────────────────

#[tauri::command]
pub async fn get_harness_stats(db: State<'_, Database>) -> Result<HarnessStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let total_sessions: i64 = conn
        .query_row("SELECT COUNT(*) FROM sessions", [], |row| row.get(0))
        .unwrap_or(0);
    let total_messages: i64 = conn
        .query_row("SELECT COUNT(*) FROM messages", [], |row| row.get(0))
        .unwrap_or(0);
    let total_tool_calls: i64 = conn
        .query_row("SELECT COUNT(*) FROM tool_logs", [], |row| row.get(0))
        .unwrap_or(0);

    let tool_success_rate: f64 = conn
        .query_row(
            "SELECT COALESCE(
                CAST(SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(*), 0),
                0.0
             ) FROM tool_logs",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let avg_tool_duration_ms: f64 = conn
        .query_row(
            "SELECT COALESCE(AVG(duration_ms), 0.0) FROM tool_logs WHERE duration_ms IS NOT NULL",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let mut stmt = conn
        .prepare(
            "SELECT tool_name, COUNT(*) as cnt FROM tool_logs GROUP BY tool_name ORDER BY cnt DESC LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let top_tools: Vec<(String, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(HarnessStats {
        total_sessions,
        total_messages,
        total_tool_calls,
        tool_success_rate,
        avg_tool_duration_ms,
        top_tools,
    })
}

// ────────────────────────── Onboarding ──────────────────────────

#[derive(Deserialize)]
pub struct OnboardingData {
    pub role: Option<String>,
    pub tools: Option<Vec<String>>,
    pub model: Option<String>,
}

#[tauri::command]
pub async fn save_onboarding(
    memory: State<'_, MemoryManager>,
    data: OnboardingData,
) -> Result<String, String> {
    let role = data.role.unwrap_or_else(|| "User".into());
    let tools = data
        .tools
        .unwrap_or_default()
        .join(", ");
    let model = data.model.unwrap_or_else(|| "Built-in Relay".into());

    let user_md = format!(
        "# User Profile\n\n## Role\n- {}\n\n## Preferred Tools\n- {}\n\n## AI Model\n- {}\n\n## Communication Style\n- (learning from interactions)\n\n## Timezone\n- (auto-detected)\n",
        role,
        if tools.is_empty() { "(none specified)" } else { &tools },
        model
    );

    memory.update_user(&user_md)?;
    Ok("Onboarding saved to USER.md".into())
}

// ────────────────────────── Settings ──────────────────────────

#[derive(Serialize, Deserialize)]
pub struct AppSettings {
    pub api_provider: String,
    pub api_key: String,
    pub model: String,
    pub relay_endpoint: String,
    pub action_preview: bool,
}

#[tauri::command]
pub async fn get_settings(db: State<'_, Database>) -> Result<AppSettings, String> {
    // For now, use defaults. In production, store in SQLite or tauri-plugin-store.
    Ok(AppSettings {
        api_provider: "relay".into(),
        api_key: "".into(),
        model: "claude-sonnet-4-20250514".into(),
        relay_endpoint: "https://api.lume.dev/v1".into(),
        action_preview: true,
    })
}

#[tauri::command]
pub async fn save_settings(
    _db: State<'_, Database>,
    settings: AppSettings,
) -> Result<String, String> {
    // Store in environment for sidecar to pick up
    if !settings.api_key.is_empty() {
        std::env::set_var("ANTHROPIC_API_KEY", &settings.api_key);
    }
    tracing::info!("Settings saved: provider={}, model={}", settings.api_provider, settings.model);
    Ok("Settings saved".into())
}

// ────────────────────────── OAuth ──────────────────────────

/// Start OAuth flow: returns the auth URL to open in browser
#[tauri::command]
pub async fn start_oauth(
    oauth: State<'_, OAuthManager>,
    provider: String,
) -> Result<String, String> {
    oauth.start_flow(&provider)
}

/// Open provider's API key page or OAuth URL in default browser
#[tauri::command]
pub async fn open_provider_auth(provider: String) -> Result<String, String> {
    let url = match provider.as_str() {
        "anthropic" => "https://console.anthropic.com/settings/keys",
        "openai" => "https://platform.openai.com/api-keys",
        "google" => "https://aistudio.google.com/apikey",
        "deepseek" => "https://platform.deepseek.com/api_keys",
        "mistral" => "https://console.mistral.ai/api-keys",
        "moonshot" => "https://platform.moonshot.cn/console/api-keys",
        "zhipu" => "https://open.bigmodel.cn/usercenter/apikeys",
        "qwen" => "https://dashscope.console.aliyun.com/apiKey",
        "baichuan" => "https://platform.baichuan-ai.com/console/apikey",
        "groq" => "https://console.groq.com/keys",
        "together" => "https://api.together.xyz/settings/api-keys",
        "openrouter" => "https://openrouter.ai/keys",
        "siliconflow" => "https://cloud.siliconflow.cn/account/ak",
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    // Open in default browser
    open::that(url).map_err(|e| format!("Failed to open browser: {}", e))?;
    Ok(url.to_string())
}

// ────────────────────────── Connection Test ──────────────────────────

#[derive(Serialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: u64,
}

/// Test API key connectivity by making a minimal API call
#[tauri::command]
pub async fn test_connection(
    provider: String,
    api_key: String,
    model: String,
    base_url: Option<String>,
) -> Result<ConnectionTestResult, String> {
    let start = std::time::Instant::now();

    // Determine the test endpoint
    let (url, headers, body) = match provider.as_str() {
        "anthropic" => {
            let url = format!(
                "{}/v1/messages",
                base_url.unwrap_or_else(|| "https://api.anthropic.com".into())
            );
            let body = serde_json::json!({
                "model": model,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "hi"}]
            });
            (
                url,
                vec![
                    ("x-api-key".to_string(), api_key.clone()),
                    ("anthropic-version".to_string(), "2023-06-01".to_string()),
                    ("content-type".to_string(), "application/json".to_string()),
                ],
                body,
            )
        }
        _ => {
            // OpenAI-compatible format for all other providers
            let default_base = match provider.as_str() {
                "openai" => "https://api.openai.com/v1",
                "google" => "https://generativelanguage.googleapis.com/v1beta/openai",
                "deepseek" => "https://api.deepseek.com/v1",
                "zhipu" => "https://open.bigmodel.cn/api/paas/v4",
                "moonshot" => "https://api.moonshot.cn/v1",
                "qwen" => "https://dashscope.aliyuncs.com/compatible-mode/v1",
                "doubao" => "https://ark.cn-beijing.volces.com/api/v3",
                "mistral" => "https://api.mistral.ai/v1",
                "groq" => "https://api.groq.com/openai/v1",
                "openrouter" => "https://openrouter.ai/api/v1",
                "siliconflow" => "https://api.siliconflow.cn/v1",
                "baichuan" => "https://api.baichuan-ai.com/v1",
                "minimax" => "https://api.minimax.chat/v1",
                "stepfun" => "https://api.stepfun.com/v1",
                "yi" => "https://api.lingyiwanwu.com/v1",
                "together" => "https://api.together.xyz/v1",
                _ => "http://localhost:11434/v1",
            };
            let base = base_url.unwrap_or_else(|| default_base.to_string());
            let url = format!("{}/chat/completions", base.trim_end_matches('/'));
            let body = serde_json::json!({
                "model": model,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "hi"}]
            });
            (
                url,
                vec![
                    ("Authorization".to_string(), format!("Bearer {}", api_key)),
                    ("Content-Type".to_string(), "application/json".to_string()),
                ],
                body,
            )
        }
    };

    // Make the request
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.post(&url);
    for (key, value) in &headers {
        req = req.header(key, value);
    }
    req = req.json(&body);

    match req.send().await {
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;
            let status = resp.status().as_u16();
            if status == 200 || status == 201 {
                Ok(ConnectionTestResult {
                    success: true,
                    message: format!("Connected! ({}ms)", latency),
                    latency_ms: latency,
                })
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                // 400/401 with a proper error body still means the endpoint is reachable
                // 401 = wrong key, 400 = bad request but server is alive
                if status == 401 {
                    Ok(ConnectionTestResult {
                        success: false,
                        message: "Invalid API key".into(),
                        latency_ms: latency,
                    })
                } else {
                    Ok(ConnectionTestResult {
                        success: false,
                        message: format!("HTTP {}: {}", status, error_text.chars().take(200).collect::<String>()),
                        latency_ms: latency,
                    })
                }
            }
        }
        Err(e) => {
            let latency = start.elapsed().as_millis() as u64;
            Ok(ConnectionTestResult {
                success: false,
                message: format!("Connection failed: {}", e),
                latency_ms: latency,
            })
        }
    }
}
