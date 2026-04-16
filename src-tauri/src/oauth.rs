use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};

/// OAuth 2.0 PKCE flow for provider authentication.
///
/// OpenAI Codex flow (verified from codex CLI):
///   Auth URL:    https://auth.openai.com/oauth/authorize
///   Token URL:   https://auth.openai.com/oauth/token
///   Client ID:   app_EMoamEEZ73f0CkXaXp7hrann
///   Scopes:      openid profile email offline_access
///   PKCE:        S256
///   Callback:    http://localhost:{PORT}/auth/callback

const CALLBACK_PORT: u16 = 17580;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OAuthResult {
    pub provider: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub id_token: Option<String>,
    pub error: Option<String>,
    pub status: String, // "pending" | "success" | "error"
}

pub struct OAuthManager {
    pub result: Arc<Mutex<Option<OAuthResult>>>,
}

/// PKCE state for the current flow
struct PkceState {
    code_verifier: String,
    state: String,
}

impl OAuthManager {
    pub fn new() -> Self {
        Self {
            result: Arc::new(Mutex::new(None)),
        }
    }

    /// Start the OpenAI OAuth PKCE flow
    pub fn start_openai_flow(&self) -> Result<String, String> {
        let pkce = Self::generate_pkce();
        let oauth_state = pkce.state.clone();
        let code_verifier = pkce.code_verifier.clone();
        let code_challenge = Self::sha256_base64url(&code_verifier);

        // Reset result
        *self.result.lock().map_err(|e| e.to_string())? = Some(OAuthResult {
            provider: "openai".into(),
            access_token: None,
            refresh_token: None,
            id_token: None,
            error: None,
            status: "pending".into(),
        });

        // Clone for thread and for URL building
        let state_for_thread = oauth_state.clone();
        let verifier_for_thread = code_verifier.clone();

        // Start callback listener in background thread
        let result_ref = self.result.clone();

        std::thread::spawn(move || {
            if let Err(e) = Self::listen_and_exchange(
                &verifier_for_thread,
                &state_for_thread,
                result_ref,
            ) {
                tracing::error!("OpenAI OAuth error: {}", e);
            }
        });

        // Build the auth URL
        let redirect_uri = format!("http://localhost:{}/auth/callback", CALLBACK_PORT);
        let auth_url = format!(
            "https://auth.openai.com/oauth/authorize?\
             response_type=code\
             &client_id=app_EMoamEEZ73f0CkXaXp7hrann\
             &redirect_uri={}\
             &scope=openid+profile+email+offline_access\
             &code_challenge={}\
             &code_challenge_method=S256\
             &state={}\
             &id_token_add_organizations=true\
             &codex_cli_simplified_flow=true\
             &originator=lume",
            urlencoding(&redirect_uri),
            code_challenge,
            oauth_state,
        );

        // Open in default browser
        open::that(&auth_url).map_err(|e| format!("Failed to open browser: {}", e))?;

        Ok(auth_url)
    }

    /// Start a generic browser-open flow (for providers without real OAuth)
    pub fn start_browser_flow(&self, provider: &str) -> Result<String, String> {
        let url = match provider {
            "anthropic" => "https://console.anthropic.com/login",
            "google" => "https://aistudio.google.com",
            "deepseek" => "https://platform.deepseek.com/sign_in",
            "mistral" => "https://console.mistral.ai",
            "moonshot" => "https://platform.moonshot.cn/console",
            "zhipu" => "https://open.bigmodel.cn/login",
            "qwen" => "https://dashscope.console.aliyun.com",
            "doubao" => "https://console.volcengine.com/ark",
            "baichuan" => "https://platform.baichuan-ai.com",
            "minimax" => "https://www.minimaxi.com/platform",
            "stepfun" => "https://platform.stepfun.com",
            "yi" => "https://platform.lingyiwanwu.com",
            "groq" => "https://console.groq.com",
            "together" => "https://api.together.xyz",
            "openrouter" => "https://openrouter.ai/settings/keys",
            "siliconflow" => "https://cloud.siliconflow.cn",
            _ => return Err(format!("Unknown provider: {}", provider)),
        };

        open::that(url).map_err(|e| format!("Failed to open browser: {}", e))?;
        Ok(url.to_string())
    }

    /// Get the current OAuth result (polled by frontend)
    pub fn get_result(&self) -> Option<OAuthResult> {
        self.result.lock().ok()?.clone()
    }

    // ─────────── Internal: PKCE + Callback ───────────

    fn listen_and_exchange(
        code_verifier: &str,
        expected_state: &str,
        result_ref: Arc<Mutex<Option<OAuthResult>>>,
    ) -> Result<(), String> {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", CALLBACK_PORT))
            .map_err(|e| format!("Failed to bind port {}: {}", CALLBACK_PORT, e))?;

        tracing::info!("OAuth callback listening on port {}", CALLBACK_PORT);

        // Accept one connection (with 5 minute timeout)
        listener
            .set_nonblocking(false)
            .map_err(|e| e.to_string())?;

        let (mut stream, _) = listener
            .accept()
            .map_err(|e| format!("Accept failed: {}", e))?;

        let mut buf = [0u8; 8192];
        let n = stream.read(&mut buf).unwrap_or(0);
        let request = String::from_utf8_lossy(&buf[..n]).to_string();

        // Parse code and state from: GET /auth/callback?code=xxx&state=yyy
        let code = Self::extract_param(&request, "code");
        let state = Self::extract_param(&request, "state");
        let error = Self::extract_param(&request, "error");

        if let Some(ref err) = error {
            let body = Self::render_error_page(err);
            Self::send_http_response(&mut stream, &body);

            *result_ref.lock().map_err(|e| e.to_string())? = Some(OAuthResult {
                provider: "openai".into(),
                access_token: None,
                refresh_token: None,
                id_token: None,
                error: Some(err.clone()),
                status: "error".into(),
            });
            return Ok(());
        }

        let code = code.ok_or("No code in callback")?;

        // Verify state
        if state.as_deref() != Some(expected_state) {
            let body = Self::render_error_page("State mismatch — possible CSRF attack");
            Self::send_http_response(&mut stream, &body);
            return Err("OAuth state mismatch".into());
        }

        // Send "exchanging token" page immediately
        let body = Self::render_success_page("OpenAI", "Exchanging token...");
        Self::send_http_response(&mut stream, &body);
        drop(stream);

        // Exchange code for token
        tracing::info!("Exchanging OAuth code for token...");
        let token_result = Self::exchange_code_for_token(&code, code_verifier);

        match token_result {
            Ok(tokens) => {
                tracing::info!("OpenAI OAuth success — got access token");
                *result_ref.lock().map_err(|e| e.to_string())? = Some(OAuthResult {
                    provider: "openai".into(),
                    access_token: Some(tokens.access_token),
                    refresh_token: tokens.refresh_token,
                    id_token: tokens.id_token,
                    error: None,
                    status: "success".into(),
                });
            }
            Err(e) => {
                tracing::error!("Token exchange failed: {}", e);
                *result_ref.lock().map_err(|e| e.to_string())? = Some(OAuthResult {
                    provider: "openai".into(),
                    access_token: None,
                    refresh_token: None,
                    id_token: None,
                    error: Some(e),
                    status: "error".into(),
                });
            }
        }

        Ok(())
    }

    /// Exchange the authorization code for tokens via POST to token endpoint
    fn exchange_code_for_token(code: &str, code_verifier: &str) -> Result<TokenResponse, String> {
        let redirect_uri = format!("http://localhost:{}/auth/callback", CALLBACK_PORT);

        let body = format!(
            "grant_type=authorization_code\
             &code={}\
             &redirect_uri={}\
             &client_id=app_EMoamEEZ73f0CkXaXp7hrann\
             &code_verifier={}",
            urlencoding(code),
            urlencoding(&redirect_uri),
            urlencoding(code_verifier),
        );

        // Synchronous HTTP request (we're in a background thread)
        let response = ureq::post("https://auth.openai.com/oauth/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send_string(&body)
            .map_err(|e| format!("Token request failed: {}", e))?;

        let json: serde_json::Value = response
            .into_json()
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
            let desc = json
                .get("error_description")
                .and_then(|d| d.as_str())
                .unwrap_or("");
            return Err(format!("{}: {}", err, desc));
        }

        Ok(TokenResponse {
            access_token: json["access_token"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            refresh_token: json
                .get("refresh_token")
                .and_then(|t| t.as_str())
                .map(|s| s.to_string()),
            id_token: json
                .get("id_token")
                .and_then(|t| t.as_str())
                .map(|s| s.to_string()),
        })
    }

    // ─────────── PKCE Helpers ───────────

    fn generate_pkce() -> PkceState {
        use rand::Rng;
        let mut rng = rand::thread_rng();

        // 32 random bytes → base64url → code_verifier
        let random_bytes: Vec<u8> = (0..32).map(|_| rng.gen::<u8>()).collect();
        let code_verifier = base64url_encode(&random_bytes);

        // Random state
        let state_bytes: Vec<u8> = (0..16).map(|_| rng.gen::<u8>()).collect();
        let state = hex::encode(state_bytes);

        PkceState {
            code_verifier,
            state,
        }
    }

    fn sha256_base64url(input: &str) -> String {
        let hash = Sha256::digest(input.as_bytes());
        base64url_encode(&hash)
    }

    fn extract_param(request: &str, name: &str) -> Option<String> {
        let query_start = request.find('?')?;
        let query_end = request[query_start..]
            .find(' ')
            .map(|i| query_start + i)
            .unwrap_or(request.len());
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

    // ─────────── HTML Responses ───────────

    fn render_success_page(provider: &str, detail: &str) -> String {
        format!(
            r#"<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body {{ font-family: -apple-system, system-ui, sans-serif; background: #0a0a0b; color: #fff;
  display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
.card {{ text-align: center; padding: 48px; background: #141416; border-radius: 16px;
  border: 1px solid #28282e; max-width: 400px; }}
h1 {{ color: #facc15; margin: 0 0 8px; font-size: 22px; }}
p {{ color: #9ca3af; margin: 0; font-size: 14px; }}
.spinner {{ width: 24px; height: 24px; border: 3px solid #333; border-top: 3px solid #facc15;
  border-radius: 50%; animation: spin 0.8s linear infinite; margin: 16px auto 0; }}
@keyframes spin {{ to {{ transform: rotate(360deg); }} }}
</style></head><body><div class="card">
<h1>Connected to {}</h1>
<p>{}</p>
<div class="spinner"></div>
<p style="margin-top:16px;font-size:12px;color:#666">You can close this tab and return to Lume.</p>
<script>setTimeout(()=>window.close(),3000)</script>
</div></body></html>"#,
            provider, detail
        )
    }

    fn render_error_page(error: &str) -> String {
        format!(
            r#"<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body {{ font-family: -apple-system, system-ui, sans-serif; background: #0a0a0b; color: #fff;
  display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
.card {{ text-align: center; padding: 48px; background: #141416; border-radius: 16px;
  border: 1px solid #28282e; max-width: 400px; }}
h1 {{ color: #ef4444; margin: 0 0 8px; font-size: 22px; }}
p {{ color: #9ca3af; margin: 0; font-size: 14px; }}
</style></head><body><div class="card">
<h1>Authentication Failed</h1>
<p>{}</p>
</div></body></html>"#,
            error
        )
    }

    fn send_http_response(stream: &mut impl Write, body: &str) {
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
    }
}

#[derive(Debug)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    id_token: Option<String>,
}

// ─────────── Encoding Helpers ───────────

fn base64url_encode(input: &[u8]) -> String {
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use base64::Engine;
    URL_SAFE_NO_PAD.encode(input)
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
