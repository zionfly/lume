use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

/// Manages the Bun agent sidecar process.
/// Communication via stdin/stdout JSON-RPC (newline-delimited JSON).
pub struct SidecarManager {
    process: Mutex<Option<Child>>,
}

#[derive(Serialize)]
struct RpcRequest {
    id: String,
    method: String,
    params: serde_json::Value,
}

#[derive(Deserialize)]
pub struct RpcResponse {
    pub id: String,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ChatParams {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub messages: Vec<ChatMessage>,
    #[serde(rename = "systemContext")]
    pub system_context: String,
    #[serde(rename = "skillsSummary")]
    pub skills_summary: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize, Debug)]
pub struct ChatResult {
    pub content: String,
    #[serde(rename = "tokenUsage")]
    pub token_usage: Option<TokenUsage>,
    #[serde(rename = "skillUpdate")]
    pub skill_update: Option<SkillUpdate>,
}

#[derive(Deserialize, Debug)]
pub struct TokenUsage {
    pub input: i64,
    pub output: i64,
}

#[derive(Deserialize, Debug)]
pub struct SkillUpdate {
    pub name: String,
    pub action: String,
    pub content: String,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }

    /// Spawn the Bun agent sidecar process
    pub fn spawn(&self, agent_dir: &str) -> Result<(), String> {
        let mut lock = self.process.lock().map_err(|e| e.to_string())?;

        // Kill existing process if any
        if let Some(ref mut child) = *lock {
            let _ = child.kill();
        }

        let bun_path = Self::find_bun();

        let child = Command::new(&bun_path)
            .arg("run")
            .arg("src/index.ts")
            .current_dir(agent_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}. Bun path: {}", e, bun_path))?;

        tracing::info!("Agent sidecar spawned (pid: {})", child.id());
        *lock = Some(child);
        Ok(())
    }

    /// Send a chat request to the sidecar and get the response
    pub fn chat(&self, params: ChatParams) -> Result<ChatResult, String> {
        let req = RpcRequest {
            id: uuid::Uuid::new_v4().to_string(),
            method: "chat".into(),
            params: serde_json::to_value(&params).map_err(|e| e.to_string())?,
        };

        let response = self.send_rpc(req)?;

        match response.error {
            Some(err) => Err(err),
            None => {
                let result: ChatResult = serde_json::from_value(
                    response.result.unwrap_or(serde_json::Value::Null),
                )
                .map_err(|e| e.to_string())?;
                Ok(result)
            }
        }
    }

    /// Send a health check
    pub fn health(&self) -> Result<bool, String> {
        let req = RpcRequest {
            id: uuid::Uuid::new_v4().to_string(),
            method: "health".into(),
            params: serde_json::json!({}),
        };
        let response = self.send_rpc(req)?;
        Ok(response.error.is_none())
    }

    fn send_rpc(&self, req: RpcRequest) -> Result<RpcResponse, String> {
        let mut lock = self.process.lock().map_err(|e| e.to_string())?;
        let child = lock
            .as_mut()
            .ok_or("Sidecar not running. Call spawn() first.")?;

        let stdin = child
            .stdin
            .as_mut()
            .ok_or("Sidecar stdin not available")?;
        let stdout = child
            .stdout
            .as_mut()
            .ok_or("Sidecar stdout not available")?;

        let mut payload = serde_json::to_string(&req).map_err(|e| e.to_string())?;
        payload.push('\n');
        stdin
            .write_all(payload.as_bytes())
            .map_err(|e| format!("Failed to write to sidecar: {}", e))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush sidecar stdin: {}", e))?;

        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .map_err(|e| format!("Failed to read from sidecar: {}", e))?;

        serde_json::from_str(&line)
            .map_err(|e| format!("Failed to parse sidecar response: {} — raw: {}", e, line))
    }

    fn find_bun() -> String {
        // Check common paths
        for path in &[
            "bun",
            "/usr/local/bin/bun",
            "/opt/homebrew/bin/bun",
        ] {
            if Command::new(path).arg("--version").output().is_ok() {
                return path.to_string();
            }
        }
        // Check home dir
        let home = std::env::var("HOME").unwrap_or_default();
        let home_bun = format!("{}/.bun/bin/bun", home);
        if Command::new(&home_bun).arg("--version").output().is_ok() {
            return home_bun;
        }
        "bun".to_string()
    }
}

impl Drop for SidecarManager {
    fn drop(&mut self) {
        if let Ok(mut lock) = self.process.lock() {
            if let Some(ref mut child) = *lock {
                let _ = child.kill();
                tracing::info!("Agent sidecar terminated");
            }
        }
    }
}
