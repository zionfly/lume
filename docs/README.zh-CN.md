[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [العربية](README.ar.md)

# Lume

**以 AI 之光照亮你的工作流，与你共同成长。**

Lume 是一款基于 Tauri v2 构建的桌面 AI 助手，具备三层记忆系统、渐进式技能展示以及多平台机器人集成能力。

## 架构

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  前端     │◄─│  核心    │──│  Agent    │  │
│  │  + Tail-  │  │ (SQLite, │  │  Sidecar  │  │
│  │  windCSS  │  │  记忆,   │  │ (LLM,     │  │
│  │           │  │  技能)   │  │  工具)    │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    Bot 网关          │
            │  ┌──────┐ ┌──────┐  │
            │  │飞书  │ │Tele- │  │
            │  │      │ │gram  │  │
            │  └──────┘ └──────┘  │
            │  ┌──────┐           │
            │  │钉钉  │           │
            │  │      │           │
            │  └──────┘           │
            └─────────────────────┘
```

## 核心功能

### 1. 三层记忆系统
- **L1 (USER.md)**：用户画像 — 风格偏好、习惯设置、时区（不超过 1375 字符）
- **L2 (ENV.md)**：环境信息 — 项目、规范约定、已知问题（不超过 2200 字符）
- **L3 (SQLite FTS5)**：全文对话搜索，无限历史记录

### 2. 渐进式技能展示
- **L0**：仅显示技能名称和描述（40+ 技能约占 3K tokens）
- **L1**：按需加载完整的 SKILL.md 文件
- **L2**：精确到章节的检索
- 每 15 次工具调用自动通过自评估生成新技能

### 3. 生产级安全框架
- 按会话隔离进程
- 工具调用全链路追踪（含耗时与状态）
- SQLite 中存储执行审计日志
- 提示词注入检测

### 4. Bot 网关
- 统一适配层，支持飞书、Telegram、钉钉
- 斜杠命令到技能的映射
- 敏感操作路由至桌面端进行审批

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面外壳 | Tauri v2 |
| 前端 | React + TypeScript + TailwindCSS |
| 核心 | Rust（SQLite、记忆、技能） |
| Agent | Bun Sidecar（LLM 路由、工具） |
| AI | Anthropic Claude SDK |
| 数据库 | SQLite + FTS5 全文搜索 |

## 快速开始

```bash
# 安装依赖
npm install
cd agent && bun install && cd ..

# 开发模式
npm run tauri dev

# 构建
npm run tauri build
```

## 许可证

MIT
