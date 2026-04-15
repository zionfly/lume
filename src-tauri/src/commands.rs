use crate::db::Database;
use crate::memory::MemoryManager;
use crate::session::{HarnessStats, Message, Session};
use crate::skills::SkillRegistry;
use tauri::State;

/// Send a message and get AI response (placeholder — actual LLM routing happens in agent sidecar)
#[tauri::command]
pub async fn send_message(
    db: State<'_, Database>,
    memory: State<'_, MemoryManager>,
    skills: State<'_, SkillRegistry>,
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

    // Record tool call for skill checkpoint
    let should_evaluate = skills.record_tool_call();
    if should_evaluate {
        tracing::info!("Skill evaluation checkpoint triggered for session {}", session_id);
    }

    // Build context with memory layers
    let _system_context = memory.build_system_context();

    // Build L0 skill list for prompt
    let _skills_summary: Vec<String> = skills
        .list()
        .iter()
        .map(|s| format!("- {}: {}", s.name, s.description))
        .collect();

    // TODO: Route to agent sidecar for actual LLM inference
    // For now, return a placeholder
    let reply_id = uuid::Uuid::new_v4().to_string();
    let reply = Message {
        id: reply_id.clone(),
        session_id: session_id.clone(),
        role: "assistant".into(),
        content: format!("🔮 Lume is thinking... (Agent sidecar not yet connected)\n\nYour message: {}", content),
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

#[tauri::command]
pub async fn list_skills(skills: State<'_, SkillRegistry>) -> Result<Vec<crate::skills::SkillMeta>, String> {
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
