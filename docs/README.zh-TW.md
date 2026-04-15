[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [العربية](README.ar.md)

# Lume

**以 AI 之光照亮你的工作流程，與你共同成長。**

Lume 是一款基於 Tauri v2 打造的桌面 AI 助理，具備三層記憶系統、漸進式技能揭示以及多平台機器人整合能力。

## 架構

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  前端     │◄─│  核心    │──│  Agent    │  │
│  │  + Tail-  │  │ (SQLite, │  │  Sidecar  │  │
│  │  windCSS  │  │  記憶,   │  │ (LLM,     │  │
│  │           │  │  技能)   │  │  工具)    │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    Bot 閘道          │
            │  ┌──────┐ ┌──────┐  │
            │  │飛書  │ │Tele- │  │
            │  │      │ │gram  │  │
            │  └──────┘ └──────┘  │
            │  ┌──────┐           │
            │  │釘釘  │           │
            │  │      │           │
            │  └──────┘           │
            └─────────────────────┘
```

## 核心功能

### 1. 三層記憶系統
- **L1 (USER.md)**：使用者檔案 — 風格偏好、習慣設定、時區（不超過 1375 字元）
- **L2 (ENV.md)**：環境資訊 — 專案、慣例規範、已知問題（不超過 2200 字元）
- **L3 (SQLite FTS5)**：全文對話搜尋，無限歷史紀錄

### 2. 漸進式技能揭示
- **L0**：僅顯示技能名稱與描述（40+ 技能約佔 3K tokens）
- **L1**：依需求載入完整的 SKILL.md 檔案
- **L2**：精確到章節的檢索
- 每 15 次工具呼叫自動透過自我評估產生新技能

### 3. 生產級安全框架
- 依會話隔離處理程序
- 工具呼叫全鏈路追蹤（含耗時與狀態）
- SQLite 中儲存執行稽核日誌
- 提示詞注入偵測

### 4. Bot 閘道
- 統一適配層，支援飛書、Telegram、釘釘
- 斜線命令對應技能映射
- 敏感操作路由至桌面端進行審核

## 技術棧

| 層級 | 技術 |
|------|------|
| 桌面外殼 | Tauri v2 |
| 前端 | React + TypeScript + TailwindCSS |
| 核心 | Rust（SQLite、記憶、技能） |
| Agent | Bun Sidecar（LLM 路由、工具） |
| AI | Anthropic Claude SDK |
| 資料庫 | SQLite + FTS5 全文搜尋 |

## 快速開始

```bash
# 安裝依賴
npm install
cd agent && bun install && cd ..

# 開發模式
npm run tauri dev

# 建置
npm run tauri build
```

## 授權條款

MIT
