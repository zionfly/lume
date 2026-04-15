[English](README.md) | [简体中文](docs/README.zh-CN.md) | [繁體中文](docs/README.zh-TW.md) | [日本語](docs/README.ja.md) | [한국어](docs/README.ko.md) | [Español](docs/README.es.md) | [Français](docs/README.fr.md) | [Deutsch](docs/README.de.md) | [Português](docs/README.pt.md) | [Русский](docs/README.ru.md) | [العربية](docs/README.ar.md)

# Lume

**Illuminate your workflow with AI that grows with you.**

Lume is a desktop AI assistant built with Tauri v2, featuring a 3-layer memory system, progressive skill disclosure, and multi-platform bot integration.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  Frontend │◄─│  Core    │──│  Agent    │  │
│  │  + Tail-  │  │ (SQLite, │  │  Sidecar  │  │
│  │  windCSS  │  │  Memory, │  │ (LLM,     │  │
│  │           │  │  Skills) │  │  Tools)   │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    Bot Gateway      │
            │  ┌──────┐ ┌──────┐  │
            │  │Feishu│ │Tele- │  │
            │  │      │ │gram  │  │
            │  └──────┘ └──────┘  │
            │  ┌──────┐           │
            │  │Ding- │           │
            │  │Talk  │           │
            │  └──────┘           │
            └─────────────────────┘
```

## Core Features

### 1. Three-Layer Memory System
- **L1 (USER.md)**: User profile — style, preferences, timezone (≤1375 chars)
- **L2 (ENV.md)**: Environment facts — projects, conventions, known issues (≤2200 chars)
- **L3 (SQLite FTS5)**: Full conversation search, unlimited history

### 2. Progressive Skill Disclosure
- **L0**: Skill names + descriptions only (~3K tokens for 40+ skills)
- **L1**: Full SKILL.md loaded on demand
- **L2**: Specific section retrieval
- Auto-generates skills every 15 tool calls via self-evaluation

### 3. Production Harness
- Per-session process isolation
- Tool call tracing with duration/status
- Execution audit logs in SQLite
- Prompt injection detection

### 4. Bot Gateway
- Unified adapter layer for Feishu, Telegram, DingTalk
- Slash commands → Skills mapping
- Sensitive operations route to desktop app for approval

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri v2 |
| Frontend | React + TypeScript + TailwindCSS |
| Core | Rust (SQLite, Memory, Skills) |
| Agent | Bun Sidecar (LLM routing, tools) |
| AI | Anthropic Claude SDK |
| Database | SQLite with FTS5 |

## Getting Started

```bash
# Install dependencies
npm install
cd agent && bun install && cd ..

# Development
npm run tauri dev

# Build
npm run tauri build
```

## License

MIT
