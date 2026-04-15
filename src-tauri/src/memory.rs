use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Three-layer memory system inspired by Hermes Agent's architecture:
///
/// Layer 1 (USER.md): User profile — communication style, tool preferences, timezone.
///   Frozen and injected into every session's system prompt. Max ~1375 chars.
///
/// Layer 2 (ENV.md): Environment facts — project paths, conventions, past failures.
///   Auto-compressed on aging. Max ~2200 chars.
///
/// Layer 3 (SQLite FTS5): Full conversation history, unlimited capacity.
///   Searched on-demand, LLM-summarized before injection into context.

const USER_MD_MAX_CHARS: usize = 1375;
const ENV_MD_MAX_CHARS: usize = 2200;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub raw: String,
    pub char_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvFacts {
    pub raw: String,
    pub char_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoryProfile {
    pub user: UserProfile,
    pub env: EnvFacts,
}

pub struct MemoryManager {
    data_dir: PathBuf,
    pub profile: Mutex<MemoryProfile>,
}

impl MemoryManager {
    pub fn new(app_data: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir = app_data.join("memory");
        fs::create_dir_all(&data_dir)?;

        let user_path = data_dir.join("USER.md");
        let env_path = data_dir.join("ENV.md");

        // Initialize with defaults if not exists
        if !user_path.exists() {
            fs::write(
                &user_path,
                "# User Profile\n\n<!-- Lume learns about you over time. This file stores your preferences. -->\n\n## Communication Style\n- (will be learned)\n\n## Preferred Tools\n- (will be learned)\n\n## Timezone\n- (will be detected)\n",
            )?;
        }
        if !env_path.exists() {
            fs::write(
                &env_path,
                "# Environment\n\n<!-- Lume tracks your working environment here. Auto-maintained. -->\n\n## Projects\n- (will be discovered)\n\n## Conventions\n- (will be learned from usage)\n\n## Known Issues\n- (will be tracked)\n",
            )?;
        }

        let user_raw = fs::read_to_string(&user_path)?;
        let env_raw = fs::read_to_string(&env_path)?;

        let profile = MemoryProfile {
            user: UserProfile {
                char_count: user_raw.len(),
                raw: user_raw,
            },
            env: EnvFacts {
                char_count: env_raw.len(),
                raw: env_raw,
            },
        };

        tracing::info!(
            "Memory loaded: USER.md={} chars, ENV.md={} chars",
            profile.user.char_count,
            profile.env.char_count
        );

        Ok(Self {
            data_dir,
            profile: Mutex::new(profile),
        })
    }

    /// Update USER.md with new content, enforcing char limit
    pub fn update_user(&self, content: &str) -> Result<UserProfile, String> {
        if content.len() > USER_MD_MAX_CHARS {
            return Err(format!(
                "USER.md exceeds limit: {} > {} chars. Compress before saving.",
                content.len(),
                USER_MD_MAX_CHARS
            ));
        }

        // Security: scan for prompt injection patterns
        if Self::detect_injection(content) {
            return Err("Blocked: content contains potential prompt injection patterns".into());
        }

        let path = self.data_dir.join("USER.md");
        fs::write(&path, content).map_err(|e| e.to_string())?;

        let profile = UserProfile {
            char_count: content.len(),
            raw: content.to_string(),
        };
        self.profile.lock().unwrap().user = profile.clone();
        Ok(profile)
    }

    /// Update ENV.md with new content, enforcing char limit
    pub fn update_env(&self, content: &str) -> Result<EnvFacts, String> {
        if content.len() > ENV_MD_MAX_CHARS {
            return Err(format!(
                "ENV.md exceeds limit: {} > {} chars. Compress before saving.",
                content.len(),
                ENV_MD_MAX_CHARS
            ));
        }

        if Self::detect_injection(content) {
            return Err("Blocked: content contains potential prompt injection patterns".into());
        }

        let path = self.data_dir.join("ENV.md");
        fs::write(&path, content).map_err(|e| e.to_string())?;

        let facts = EnvFacts {
            char_count: content.len(),
            raw: content.to_string(),
        };
        self.profile.lock().unwrap().env = facts.clone();
        Ok(facts)
    }

    /// Build the system prompt injection for a session
    pub fn build_system_context(&self) -> String {
        let profile = self.profile.lock().unwrap();
        format!(
            "<user_profile>\n{}\n</user_profile>\n\n<environment>\n{}\n</environment>",
            profile.user.raw, profile.env.raw
        )
    }

    /// Basic prompt injection detection
    fn detect_injection(content: &str) -> bool {
        let lower = content.to_lowercase();
        let patterns = [
            "ignore previous instructions",
            "ignore all instructions",
            "disregard the above",
            "you are now",
            "new system prompt",
            "override system",
            "<|im_start|>",
            "<|endoftext|>",
        ];
        patterns.iter().any(|p| lower.contains(p))
    }
}
