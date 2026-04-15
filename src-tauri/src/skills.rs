use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Progressive Disclosure Skill System
///
/// L0: skills_list() → [{name, description}]       — only metadata in prompt (~3K tokens for 40+ skills)
/// L1: skill_view(name) → full SKILL.md content     — loaded on demand
/// L2: skill_view(name, section) → specific section  — precision retrieval
///
/// Every 15 tool calls triggers a SkillEvaluator checkpoint that decides
/// whether to create/update a skill based on the execution history.

const CHECKPOINT_INTERVAL: usize = 15;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillMeta {
    pub name: String,
    pub description: String,
    pub trigger: String,
    pub version: u32,
    pub auto_generated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillFull {
    pub meta: SkillMeta,
    pub when_to_use: String,
    pub steps: Vec<String>,
    pub pitfalls: Vec<String>,
    pub verification: String,
    pub raw_md: String,
}

pub struct SkillRegistry {
    skills_dir: PathBuf,
    pub index: Mutex<HashMap<String, SkillMeta>>,
    pub call_counter: Mutex<usize>,
}

impl SkillRegistry {
    pub fn new(app_data: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let skills_dir = app_data.join("skills");
        fs::create_dir_all(&skills_dir)?;

        let mut index = HashMap::new();
        Self::scan_skills(&skills_dir, &mut index)?;

        tracing::info!("Loaded {} skills", index.len());

        Ok(Self {
            skills_dir,
            index: Mutex::new(index),
            call_counter: Mutex::new(0),
        })
    }

    fn scan_skills(
        dir: &Path,
        index: &mut HashMap<String, SkillMeta>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if !dir.exists() {
            return Ok(());
        }
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "md") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Some(meta) = Self::parse_frontmatter(&content) {
                        index.insert(meta.name.clone(), meta);
                    }
                }
            }
        }
        Ok(())
    }

    fn parse_frontmatter(content: &str) -> Option<SkillMeta> {
        if !content.starts_with("---") {
            return None;
        }
        let parts: Vec<&str> = content.splitn(3, "---").collect();
        if parts.len() < 3 {
            return None;
        }
        let fm = parts[1].trim();
        let mut name = String::new();
        let mut description = String::new();
        let mut trigger = String::new();
        let mut version = 1u32;
        let mut auto_generated = false;

        for line in fm.lines() {
            let line = line.trim();
            if let Some(v) = line.strip_prefix("name:") {
                name = v.trim().trim_matches('"').to_string();
            } else if let Some(v) = line.strip_prefix("description:") {
                description = v.trim().trim_matches('"').to_string();
            } else if let Some(v) = line.strip_prefix("trigger:") {
                trigger = v.trim().trim_matches('"').to_string();
            } else if let Some(v) = line.strip_prefix("version:") {
                version = v.trim().parse().unwrap_or(1);
            } else if let Some(v) = line.strip_prefix("auto_generated:") {
                auto_generated = v.trim() == "true";
            }
        }

        if name.is_empty() {
            return None;
        }

        Some(SkillMeta {
            name,
            description,
            trigger,
            version,
            auto_generated,
        })
    }

    /// L0: Get all skill names and descriptions (lightweight)
    pub fn list(&self) -> Vec<SkillMeta> {
        self.index.lock().unwrap().values().cloned().collect()
    }

    /// L1: Get full skill content
    pub fn get_full(&self, name: &str) -> Option<String> {
        let path = self.skills_dir.join(format!("{}.md", name));
        fs::read_to_string(&path).ok()
    }

    /// L2: Get specific section of a skill
    pub fn get_section(&self, name: &str, section: &str) -> Option<String> {
        let content = self.get_full(name)?;
        let header = format!("## {}", section);
        let start = content.find(&header)?;
        let rest = &content[start..];
        let end = rest[header.len()..]
            .find("\n## ")
            .map(|i| i + header.len())
            .unwrap_or(rest.len());
        Some(rest[..end].to_string())
    }

    /// Record a tool call and check if we should trigger skill evaluation
    pub fn record_tool_call(&self) -> bool {
        let mut counter = self.call_counter.lock().unwrap();
        *counter += 1;
        *counter % CHECKPOINT_INTERVAL == 0
    }

    /// Save a new or updated skill
    pub fn save_skill(&self, name: &str, content: &str) -> Result<(), String> {
        let path = self.skills_dir.join(format!("{}.md", name));
        fs::write(&path, content).map_err(|e| e.to_string())?;

        if let Some(meta) = Self::parse_frontmatter(content) {
            self.index.lock().unwrap().insert(name.to_string(), meta);
        }
        Ok(())
    }
}
