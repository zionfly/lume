use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub tool_calls: Option<String>,
    pub token_count: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolLog {
    pub id: String,
    pub session_id: String,
    pub tool_name: String,
    pub input: Option<String>,
    pub output: Option<String>,
    pub status: String,
    pub duration_ms: Option<i64>,
    pub created_at: String,
}

/// Harness statistics for observability
#[derive(Debug, Serialize, Deserialize)]
pub struct HarnessStats {
    pub total_sessions: i64,
    pub total_messages: i64,
    pub total_tool_calls: i64,
    pub tool_success_rate: f64,
    pub avg_tool_duration_ms: f64,
    pub top_tools: Vec<(String, i64)>,
}
