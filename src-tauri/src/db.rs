use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn init(app_data: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = app_data.join("lume.db");
        let conn = Connection::open(&db_path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                metadata TEXT DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                tool_calls TEXT,
                token_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);

            -- Layer 3: FTS5 full-text search over all conversations
            CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
                content,
                session_id UNINDEXED,
                role UNINDEXED,
                content=messages,
                content_rowid=rowid,
                tokenize='porter unicode61'
            );

            -- Triggers to keep FTS in sync
            CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
                INSERT INTO messages_fts(rowid, content, session_id, role)
                VALUES (new.rowid, new.content, new.session_id, new.role);
            END;

            CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
                INSERT INTO messages_fts(messages_fts, rowid, content, session_id, role)
                VALUES ('delete', old.rowid, old.content, old.session_id, old.role);
            END;

            CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
                INSERT INTO messages_fts(messages_fts, rowid, content, session_id, role)
                VALUES ('delete', old.rowid, old.content, old.session_id, old.role);
                INSERT INTO messages_fts(rowid, content, session_id, role)
                VALUES (new.rowid, new.content, new.session_id, new.role);
            END;

            -- Harness: tool execution logs for observability
            CREATE TABLE IF NOT EXISTS tool_logs (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL REFERENCES sessions(id),
                tool_name TEXT NOT NULL,
                input TEXT,
                output TEXT,
                status TEXT NOT NULL CHECK(status IN ('started', 'success', 'error', 'timeout')),
                duration_ms INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_tool_logs_session ON tool_logs(session_id, created_at);

            -- Skill evaluation checkpoints
            CREATE TABLE IF NOT EXISTS skill_checkpoints (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                tool_call_count INTEGER NOT NULL,
                evaluation TEXT,
                skill_created TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            ",
        )?;

        tracing::info!("Database initialized at {:?}", db_path);
        Ok(Self { conn: Mutex::new(conn) })
    }
}
