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
    session_id: String,
    content: String,
    provider: Option<String>,
    model: Option<String>,
    api_key: Option<String>,
    base_url: Option<String>,
    workspace_path: Option<String>,
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
    let history: Vec<serde_json::Value> = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT role, content FROM messages WHERE session_id = ?1 ORDER BY created_at DESC LIMIT 20",
            )
            .map_err(|e| e.to_string())?;
        let msgs: Vec<(String, String)> = stmt
            .query_map(rusqlite::params![&session_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        msgs.into_iter().rev()
            .map(|(role, content)| serde_json::json!({"role": role, "content": content}))
            .collect()
    };

    // Build memory context + skills summary for system prompt
    let system_context = memory.build_system_context();
    let skills_list: Vec<String> = skills
        .list()
        .iter()
        .map(|s| format!("- {}: {}", s.name, s.description))
        .collect();
    let skills_block = if skills_list.is_empty() {
        String::new()
    } else {
        format!("\n<available_skills>\n{}\n</available_skills>", skills_list.join("\n"))
    };

    // Build workspace context (runs in blocking thread pool to avoid blocking async executor)
    let (workspace_block, auto_read_files) = if let Some(ws_path) = workspace_path.clone() {
        tracing::info!("Building workspace context for: {}", ws_path);
        let content_clone = content.clone();
        let result = tokio::task::spawn_blocking(move || {
            build_workspace_context_detailed(&ws_path, &content_clone)
        })
        .await
        .unwrap_or_else(|_| (String::new(), vec![]));
        tracing::info!(
            "Workspace context: {} chars, {} auto-read files",
            result.0.len(),
            result.1.len()
        );
        result
    } else {
        tracing::info!("No workspace set for this message");
        (String::new(), vec![])
    };

    let workspace_instruction = if workspace_block.is_empty() {
        ""
    } else {
        "\n\n**IMPORTANT**: You DO have access to the workspace files shown above. \
         When the user mentions a file that appears in 'Files Referenced in Your Message', \
         its full content is embedded in this prompt — read it directly. \
         Never claim you lack permission to read files; the content is right there. \
         If a file's content is not in the context, it means the user did not mention it by exact filename — \
         ask them to clarify which specific file."
    };

    let system_prompt = format!(
        "You are Lume, an AI assistant that illuminates the user's workflow. \
         You grow smarter with every interaction through your memory and skill systems.\n\n\
         {}\n{}\n{}{}\n\n\
         Be concise and direct. Show your reasoning for non-trivial decisions.",
        system_context, skills_block, workspace_block, workspace_instruction
    );

    // Direct API call using saved settings
    let provider_id = provider.unwrap_or_else(|| "openai".into());
    let model_id = model.unwrap_or_else(|| "gpt-4o".into());
    let key = api_key.unwrap_or_default();

    if key.is_empty() {
        return Ok(Message {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.clone(),
            role: "assistant".into(),
            content: "No API key configured. Go to **Settings** to connect a provider.".into(),
            tool_calls: None,
            token_count: 0,
            created_at: chrono::Utc::now().to_rfc3339(),
        });
    }

    let mut reply_content = call_llm_direct(
        &provider_id, &model_id, &key, base_url.as_deref(),
        &system_prompt, &history,
    ).await?;

    // Prepend a diagnostic line showing what was auto-read (if anything)
    if !auto_read_files.is_empty() {
        let files_summary: Vec<String> = auto_read_files
            .iter()
            .take(5)
            .map(|p| {
                std::path::Path::new(p)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| p.clone())
            })
            .collect();
        let diag = format!(
            "> *auto-read from workspace: {}*\n\n",
            files_summary.join(", ")
        );
        reply_content = format!("{}{}", diag, reply_content);
    } else if workspace_path.is_some() && (content.to_lowercase().contains(".pdf") || content.contains("@")) {
        // User referenced a file but none was matched — warn them
        reply_content = format!(
            "> *no files matched in workspace — check that the file exists at `{}` and the filename is spelled correctly*\n\n{}",
            workspace_path.as_deref().unwrap_or(""),
            reply_content
        );
    }

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

#[tauri::command]
pub async fn rename_session(
    db: State<'_, Database>,
    session_id: String,
    title: String,
) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE sessions SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![&title, &session_id],
    )
    .map_err(|e| e.to_string())?;
    Ok("renamed".into())
}

#[tauri::command]
pub async fn delete_session(db: State<'_, Database>, session_id: String) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM messages WHERE session_id = ?1",
        rusqlite::params![&session_id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM sessions WHERE id = ?1",
        rusqlite::params![&session_id],
    )
    .map_err(|e| e.to_string())?;
    Ok("deleted".into())
}

// ────────────────────────── Workspace ──────────────────────────

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
pub async fn list_workspace(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = std::path::Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }
        entries.push(FileEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

/// Debug: preview what workspace context will be injected for a given message
#[tauri::command]
pub async fn preview_workspace_context(
    workspace_path: String,
    user_message: String,
) -> Result<String, String> {
    let result = tokio::task::spawn_blocking(move || {
        build_workspace_context_with_mentions(&workspace_path, &user_message)
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub async fn read_workspace_file(path: String) -> Result<String, String> {
    // Support PDFs via pdf-extract
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if ext == "pdf" {
        return pdf_extract::extract_text(&path)
            .map_err(|e| format!("PDF extraction failed: {}", e));
    }

    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
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

/// Start OAuth PKCE flow for providers that support it (OpenAI).
/// For other providers, opens their login page in browser.
#[tauri::command]
pub async fn start_oauth(
    oauth: State<'_, OAuthManager>,
    provider: String,
) -> Result<String, String> {
    match provider.as_str() {
        "openai" => oauth.start_openai_flow(),
        _ => oauth.start_browser_flow(&provider),
    }
}

/// Open provider's login page in default browser (for manual API key flow)
#[tauri::command]
pub async fn open_provider_auth(
    oauth: State<'_, OAuthManager>,
    provider: String,
) -> Result<String, String> {
    match provider.as_str() {
        "openai" => oauth.start_openai_flow(),
        _ => oauth.start_browser_flow(&provider),
    }
}

/// Poll OAuth result (called by frontend after starting flow)
#[tauri::command]
pub async fn poll_oauth_result(
    oauth: State<'_, OAuthManager>,
) -> Result<Option<crate::oauth::OAuthResult>, String> {
    Ok(oauth.get_result())
}

// ────────────────────────── Direct LLM Call ──────────────────────────

async fn call_llm_direct(
    provider: &str,
    model: &str,
    api_key: &str,
    base_url: Option<&str>,
    system_prompt: &str,
    history: &[serde_json::Value],
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    if provider == "anthropic" {
        // Anthropic Messages API
        let url = format!(
            "{}/v1/messages",
            base_url.unwrap_or("https://api.anthropic.com")
        );
        let body = serde_json::json!({
            "model": model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": history,
        });

        let resp = client
            .post(&url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("API request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Anthropic API error {}: {}", status, &text[..text.len().min(300)]));
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let content = json["content"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|block| block["text"].as_str())
            .unwrap_or("(empty response)")
            .to_string();
        Ok(content)
    } else {
        // OpenAI-compatible format (covers OpenAI, DeepSeek, Gemini, etc.)
        let default_base = match provider {
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
        let base = base_url.unwrap_or(default_base);
        let url = format!("{}/chat/completions", base.trim_end_matches('/'));

        let mut messages = vec![serde_json::json!({"role": "system", "content": system_prompt})];
        messages.extend_from_slice(history);

        let body = serde_json::json!({
            "model": model,
            "max_tokens": 4096,
            "messages": messages,
        });

        let resp = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("API request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, &text[..text.len().min(300)]));
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let content = json["choices"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|choice| choice["message"]["content"].as_str())
            .unwrap_or("(empty response)")
            .to_string();
        Ok(content)
    }
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

// ────────────────────────── Workspace Context ──────────────────────────

/// Same as build_workspace_context_with_mentions but also returns list of auto-read files
pub fn build_workspace_context_detailed(workspace_path: &str, user_message: &str) -> (String, Vec<String>) {
    let path = std::path::Path::new(workspace_path);
    if !path.is_dir() {
        return (String::new(), vec![]);
    }
    let all_files = index_workspace_files(path);
    let mentioned = find_mentioned_files(user_message, &all_files);
    let context = build_workspace_context_with_mentions(workspace_path, user_message);
    (context, mentioned)
}

/// Build workspace context with:
/// - File tree overview
/// - Key project files (README, package.json, etc.)
/// - Auto-read files that the user mentions in their message (by name or path)
fn build_workspace_context_with_mentions(workspace_path: &str, user_message: &str) -> String {
    let path = std::path::Path::new(workspace_path);
    if !path.is_dir() {
        return String::new();
    }

    let mut out = String::new();
    out.push_str(&format!("\n<workspace path=\"{}\">\n", workspace_path));

    // 1. Build a complete file index (for mention matching)
    let all_files = index_workspace_files(path);

    // 2. Parse user message for file mentions
    let mentioned = find_mentioned_files(user_message, &all_files);

    // 3. Project tree
    out.push_str("## File Tree\n```\n");
    walk_tree(path, path, 0, 3, &mut out);
    out.push_str("```\n\n");

    // 4. Auto-read files mentioned in user message
    if !mentioned.is_empty() {
        out.push_str("## Files Referenced in Your Message\n");
        for file_path in mentioned.iter().take(5) {
            let filename = std::path::Path::new(file_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| file_path.clone());

            let content = read_file_smart(file_path);
            out.push_str(&format!("\n### {}\n```\n{}\n```\n", filename, content));
        }
    }

    // 5. Key project files (only if not already shown)
    let key_files = [
        "README.md", "README.rst", "README",
        "package.json", "Cargo.toml", "pyproject.toml", "go.mod",
        "tsconfig.json", "requirements.txt",
    ];
    let mut found = Vec::new();
    for filename in &key_files {
        let file_path = path.join(filename);
        let path_str = file_path.to_string_lossy().to_string();
        if mentioned.contains(&path_str) {
            continue; // Already included
        }
        if file_path.is_file() {
            if let Ok(content) = std::fs::read_to_string(&file_path) {
                let truncated = if content.len() > 1500 {
                    format!("{}\n... (truncated)", &content[..1500])
                } else {
                    content
                };
                found.push((filename.to_string(), truncated));
            }
        }
    }
    if !found.is_empty() {
        out.push_str("\n## Key Project Files\n");
        for (name, content) in found {
            out.push_str(&format!("\n### {}\n```\n{}\n```\n", name, content));
        }
    }

    out.push_str("</workspace>\n");

    // Limit total workspace context to 15000 chars (was 8000 — increased for file content)
    if out.len() > 15000 {
        let truncated = &out[..14800];
        format!("{}\n... (workspace context truncated)\n</workspace>\n", truncated)
    } else {
        out
    }
}

/// Recursively index all files in workspace (for mention detection)
fn index_workspace_files(root: &std::path::Path) -> Vec<String> {
    let skip = [
        "node_modules", ".git", "target", "dist", "build", ".next",
        "__pycache__", ".venv", "venv", ".idea", ".vscode",
    ];

    walkdir::WalkDir::new(root)
        .max_depth(4)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !skip.iter().any(|s| name == *s) && !name.starts_with('.')
                || name == ".gitignore"
                || name == ".env.example"
        })
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.path().to_string_lossy().to_string())
        .collect()
}

/// Find files mentioned in the user's message (by exact filename or partial path)
fn find_mentioned_files(message: &str, all_files: &[String]) -> Vec<String> {
    let mut matches = Vec::new();
    let msg_lower = message.to_lowercase();

    for file_path in all_files {
        let filename = std::path::Path::new(file_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        // Match if user mentions the full filename (case-insensitive, at least 5 chars to avoid false positives)
        if filename.len() >= 5 && msg_lower.contains(&filename) {
            matches.push(file_path.clone());
        }
    }

    // Fallback: if no match in workspace, search common user folders (Desktop, Documents, Downloads)
    if matches.is_empty() {
        if let Ok(home) = std::env::var("HOME") {
            for folder in &["Desktop", "Documents", "Downloads"] {
                let search_root = std::path::Path::new(&home).join(folder);
                if !search_root.is_dir() {
                    continue;
                }
                // Shallow scan (1 level only) to find mentioned files
                if let Ok(entries) = std::fs::read_dir(&search_root) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_lowercase();
                        if name.len() >= 5 && msg_lower.contains(&name) {
                            matches.push(entry.path().to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    matches
}

/// Read a file smartly — handles text files, PDFs, and binary detection
fn read_file_smart(path: &str) -> String {
    let p = std::path::Path::new(path);
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    // PDF: extract text (with size limit + timeout via thread)
    if ext == "pdf" {
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        const MAX_PDF_SIZE: u64 = 10 * 1024 * 1024; // 10 MB
        if size > MAX_PDF_SIZE {
            return format!(
                "[PDF too large to auto-read: {:.1} MB. Ask user for specific pages/sections.]",
                size as f64 / 1024.0 / 1024.0
            );
        }

        tracing::info!("Extracting PDF: {} ({:.1} KB)", path, size as f64 / 1024.0);

        // Run extraction in a thread with 15s timeout
        let path_owned = path.to_string();
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                pdf_extract::extract_text(&path_owned)
            }));
            let _ = tx.send(result);
        });

        match rx.recv_timeout(std::time::Duration::from_secs(15)) {
            Ok(Ok(Ok(text))) => {
                tracing::info!("PDF extracted: {} chars", text.len());
                let truncated = if text.len() > 5000 {
                    format!("{}\n... (PDF truncated, {} chars total)", &text[..5000], text.len())
                } else {
                    text
                };
                return truncated;
            }
            Ok(Ok(Err(e))) => {
                tracing::error!("PDF extraction error: {}", e);
                return format!("[PDF extraction failed: {}]", e);
            }
            Ok(Err(_)) => {
                tracing::error!("PDF extraction panicked");
                return "[PDF extraction panicked — file may be corrupted or unsupported format]".into();
            }
            Err(_) => {
                tracing::error!("PDF extraction timed out");
                return "[PDF extraction timed out after 15s — file too complex]".into();
            }
        }
    }

    // Binary files — just show info
    let binary_exts = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "mp3", "mp4", "mov", "zip", "tar", "gz", "exe", "dll", "so", "dylib"];
    if binary_exts.contains(&ext.as_str()) {
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        return format!("[binary file, {} bytes]", size);
    }

    // Text file
    match std::fs::read_to_string(path) {
        Ok(content) => {
            if content.len() > 5000 {
                format!("{}\n... (truncated, {} chars total)", &content[..5000], content.len())
            } else {
                content
            }
        }
        Err(e) => format!("[read error: {}]", e),
    }
}

/// Recursive directory walk with depth limit and skip patterns
fn walk_tree(root: &std::path::Path, current: &std::path::Path, depth: usize, max_depth: usize, out: &mut String) {
    if depth > max_depth {
        return;
    }
    let entries = match std::fs::read_dir(current) {
        Ok(e) => e,
        Err(_) => return,
    };

    let skip_patterns = [
        "node_modules", ".git", "target", "dist", "build", ".next", ".nuxt",
        "__pycache__", ".venv", "venv", ".idea", ".vscode", ".DS_Store",
        "coverage", ".cache", ".pytest_cache", "__MACOSX",
    ];

    let mut items: Vec<_> = entries.filter_map(|e| e.ok()).collect();
    items.sort_by_key(|e| e.file_name());

    // Limit to 50 items per directory to avoid explosion
    let shown: Vec<_> = items.iter().take(50).collect();
    let remaining = items.len().saturating_sub(50);

    for entry in shown {
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden and noise
        if name.starts_with('.') && depth == 0 {
            // Allow .gitignore, .env.example at top level
            if name != ".gitignore" && name != ".env.example" {
                continue;
            }
        }
        if skip_patterns.iter().any(|p| name == *p) {
            continue;
        }

        let indent = "  ".repeat(depth);
        let rel = entry.path().strip_prefix(root).unwrap_or(&entry.path()).to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);

        if is_dir {
            out.push_str(&format!("{}{}/\n", indent, name));
            walk_tree(root, &entry.path(), depth + 1, max_depth, out);
        } else {
            // Suppress file path for depth 0, use relative for deeper
            let display = if depth == 0 { name } else { rel };
            out.push_str(&format!("{}{}\n", indent, display));
        }
    }

    if remaining > 0 {
        let indent = "  ".repeat(depth);
        out.push_str(&format!("{}... ({} more items)\n", indent, remaining));
    }
}
