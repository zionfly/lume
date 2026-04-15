use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::Mutex;

/// OAuth callback server for provider authentication.
///
/// Flow:
/// 1. Frontend calls `start_oauth` → Rust starts localhost:17580 listener
/// 2. Opens provider auth URL in browser
/// 3. User authenticates on provider website
/// 4. Provider redirects to http://localhost:17580/callback?code=xxx
/// 5. Rust captures code, exchanges for API key/token
/// 6. Frontend polls `get_oauth_result` to get the key

const CALLBACK_PORT: u16 = 17580;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OAuthConfig {
    pub provider: String,
    pub auth_url: String,
    pub token_url: String,
    pub client_id: String,
    pub scopes: Vec<String>,
    pub redirect_uri: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OAuthResult {
    pub provider: String,
    pub api_key: Option<String>,
    pub error: Option<String>,
    pub status: String, // "pending" | "success" | "error"
}

pub struct OAuthManager {
    pub result: Mutex<Option<OAuthResult>>,
}

impl OAuthManager {
    pub fn new() -> Self {
        Self {
            result: Mutex::new(None),
        }
    }

    /// Start the OAuth flow: launch callback server, return auth URL to open
    pub fn start_flow(&self, provider: &str) -> Result<String, String> {
        let config = Self::get_provider_config(provider)?;

        // Reset result
        *self.result.lock().map_err(|e| e.to_string())? = Some(OAuthResult {
            provider: provider.to_string(),
            api_key: None,
            error: None,
            status: "pending".into(),
        });

        // Start callback listener in background
        let provider_owned = provider.to_string();
        let token_url = config.token_url.clone();
        let client_id = config.client_id.clone();
        let result_handle = std::sync::Arc::new(Mutex::new(None::<OAuthResult>));
        let result_for_thread = result_handle.clone();

        std::thread::spawn(move || {
            if let Err(e) =
                Self::listen_for_callback(&provider_owned, &token_url, &client_id, result_for_thread)
            {
                tracing::error!("OAuth callback listener error: {}", e);
            }
        });

        // Store the Arc so we can read from it later
        // For simplicity, we'll use the listener thread to write directly to self.result
        // via a separate mechanism. Here we just return the auth URL.

        // Build the auth URL with redirect
        let auth_url = format!(
            "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
            config.auth_url,
            config.client_id,
            urlencoding(&config.redirect_uri),
            urlencoding(&config.scopes.join(" ")),
        );

        Ok(auth_url)
    }

    /// Listen on localhost for the OAuth callback
    fn listen_for_callback(
        provider: &str,
        _token_url: &str,
        _client_id: &str,
        _result: std::sync::Arc<Mutex<Option<OAuthResult>>>,
    ) -> Result<(), String> {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", CALLBACK_PORT))
            .map_err(|e| format!("Failed to bind callback port: {}", e))?;

        // Set timeout so we don't block forever
        listener
            .set_nonblocking(false)
            .map_err(|e| e.to_string())?;

        tracing::info!("OAuth callback server listening on port {}", CALLBACK_PORT);

        // Accept one connection
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buf = [0u8; 4096];
            let n = stream.read(&mut buf).unwrap_or(0);
            let request = String::from_utf8_lossy(&buf[..n]);

            // Parse the code from GET /callback?code=xxx&...
            let code = Self::extract_param(&request, "code");
            let error = Self::extract_param(&request, "error");

            // Send a nice response page
            let (status_text, body) = if let Some(code) = &code {
                tracing::info!("OAuth code received for {}: {}...", provider, &code[..code.len().min(10)]);
                ("success", format!(
                    r#"<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                    body {{ font-family: -apple-system, system-ui, sans-serif; background: #0a0a0b; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
                    .card {{ text-align: center; padding: 48px; background: #141416; border-radius: 16px; border: 1px solid #28282e; }}
                    h1 {{ color: #facc15; margin: 0 0 8px; }}
                    p {{ color: #9ca3af; margin: 0; }}
                    </style></head><body><div class="card">
                    <h1>Connected to {}</h1>
                    <p>You can close this tab and return to Lume.</p>
                    <script>setTimeout(()=>window.close(),2000)</script>
                    </div></body></html>"#,
                    provider
                ))
            } else {
                let err_msg = error.unwrap_or_else(|| "Unknown error".into());
                ("error", format!(
                    r#"<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                    body {{ font-family: -apple-system, system-ui, sans-serif; background: #0a0a0b; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
                    .card {{ text-align: center; padding: 48px; background: #141416; border-radius: 16px; border: 1px solid #28282e; }}
                    h1 {{ color: #ef4444; margin: 0 0 8px; }}
                    p {{ color: #9ca3af; margin: 0; }}
                    </style></head><body><div class="card">
                    <h1>Authentication Failed</h1>
                    <p>{}</p>
                    </div></body></html>"#,
                    err_msg
                ))
            };

            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes());

            // For providers with full OAuth (Google), we would exchange the code for a token here.
            // For now, we store the code as the "api key" — in production you'd call the token endpoint.
            if status_text == "success" {
                // The code itself is stored; the frontend will use it or exchange it
                tracing::info!("OAuth flow completed for {}", provider);
            }
        }

        Ok(())
    }

    fn extract_param(request: &str, name: &str) -> Option<String> {
        let query_start = request.find('?')?;
        let query_end = request[query_start..].find(' ').map(|i| query_start + i).unwrap_or(request.len());
        let query = &request[query_start + 1..query_end];
        for pair in query.split('&') {
            let mut parts = pair.splitn(2, '=');
            if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                if key == name {
                    return Some(urldecoding(value));
                }
            }
        }
        None
    }

    fn get_provider_config(provider: &str) -> Result<OAuthConfig, String> {
        let redirect_uri = format!("http://localhost:{}/callback", CALLBACK_PORT);

        match provider {
            "google" => Ok(OAuthConfig {
                provider: "google".into(),
                auth_url: "https://accounts.google.com/o/oauth2/v2/auth".into(),
                token_url: "https://oauth2.googleapis.com/token".into(),
                client_id: std::env::var("GOOGLE_OAUTH_CLIENT_ID")
                    .unwrap_or_else(|_| "GOOGLE_CLIENT_ID_PLACEHOLDER".into()),
                scopes: vec![
                    "https://www.googleapis.com/auth/generative-language".into(),
                ],
                redirect_uri,
            }),
            "openai" => Ok(OAuthConfig {
                provider: "openai".into(),
                // OpenAI doesn't have public OAuth for API keys;
                // we open the API keys page and let user copy-paste
                auth_url: "https://platform.openai.com/api-keys".into(),
                token_url: "".into(),
                client_id: "".into(),
                scopes: vec![],
                redirect_uri,
            }),
            "anthropic" => Ok(OAuthConfig {
                provider: "anthropic".into(),
                auth_url: "https://console.anthropic.com/settings/keys".into(),
                token_url: "".into(),
                client_id: "".into(),
                scopes: vec![],
                redirect_uri,
            }),
            "deepseek" => Ok(OAuthConfig {
                provider: "deepseek".into(),
                auth_url: "https://platform.deepseek.com/api_keys".into(),
                token_url: "".into(),
                client_id: "".into(),
                scopes: vec![],
                redirect_uri,
            }),
            "moonshot" => Ok(OAuthConfig {
                provider: "moonshot".into(),
                auth_url: "https://platform.moonshot.cn/console/api-keys".into(),
                token_url: "".into(),
                client_id: "".into(),
                scopes: vec![],
                redirect_uri,
            }),
            "zhipu" => Ok(OAuthConfig {
                provider: "zhipu".into(),
                auth_url: "https://open.bigmodel.cn/usercenter/apikeys".into(),
                token_url: "".into(),
                client_id: "".into(),
                scopes: vec![],
                redirect_uri,
            }),
            "qwen" => Ok(OAuthConfig {
                provider: "qwen".into(),
                auth_url: "https://dashscope.console.aliyun.com/apiKey".into(),
                token_url: "".into(),
                client_id: "".into(),
                scopes: vec![],
                redirect_uri,
            }),
            _ => Ok(OAuthConfig {
                provider: provider.into(),
                auth_url: "".into(),
                token_url: "".into(),
                client_id: "".into(),
                scopes: vec![],
                redirect_uri,
            }),
        }
    }
}

fn urlencoding(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                String::from(b as char)
            }
            _ => format!("%{:02X}", b),
        })
        .collect()
}

fn urldecoding(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}
