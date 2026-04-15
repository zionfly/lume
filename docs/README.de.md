[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [العربية](README.ar.md)

# Lume

**Erhelle deinen Workflow mit KI, die mit dir waechst.**

Lume ist ein Desktop-KI-Assistent, der mit Tauri v2 entwickelt wurde und ein 3-Schichten-Gedaechtnissystem, schrittweise Faehigkeitenoffenlegung sowie plattformuebergreifende Bot-Integration bietet.

## Architektur

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  Frontend │◄─│  Kern    │──│  Agent    │  │
│  │  + Tail-  │  │ (SQLite, │  │  Sidecar  │  │
│  │  windCSS  │  │  Speicher,│ │ (LLM,     │  │
│  │           │  │  Skills) │  │  Tools)   │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    Bot-Gateway      │
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

## Kernfunktionen

### 1. 3-Schichten-Gedaechtnissystem
- **L1 (USER.md)**: Benutzerprofil — Stil, Praeferenzen, Zeitzone (bis zu 1375 Zeichen)
- **L2 (ENV.md)**: Umgebungsinformationen — Projekte, Konventionen, bekannte Probleme (bis zu 2200 Zeichen)
- **L3 (SQLite FTS5)**: Volltextsuche in Konversationen, unbegrenzter Verlauf

### 2. Schrittweise Faehigkeitenoffenlegung
- **L0**: Nur Faehigkeitsnamen und Beschreibungen (~3K Tokens fuer ueber 40 Faehigkeiten)
- **L1**: Vollstaendige SKILL.md-Datei wird bei Bedarf geladen
- **L2**: Abruf spezifischer Abschnitte
- Automatische Generierung von Faehigkeiten alle 15 Werkzeugaufrufe durch Selbstbewertung

### 3. Produktionsumgebung
- Prozessisolierung pro Sitzung
- Werkzeugaufruf-Tracing mit Dauer und Status
- Ausfuehrungsaudit-Protokolle in SQLite
- Erkennung von Prompt-Injection

### 4. Bot-Gateway
- Einheitliche Adapterschicht fuer Feishu, Telegram und DingTalk
- Zuordnung von Slash-Befehlen zu Faehigkeiten
- Sensible Operationen werden zur Genehmigung an die Desktop-App weitergeleitet

## Technologie-Stack

| Schicht | Technologie |
|---------|------------|
| Desktop-Shell | Tauri v2 |
| Frontend | React + TypeScript + TailwindCSS |
| Kern | Rust (SQLite, Speicher, Faehigkeiten) |
| Agent | Bun Sidecar (LLM-Routing, Tools) |
| KI | Anthropic Claude SDK |
| Datenbank | SQLite mit FTS5 |

## Erste Schritte

```bash
# Abhaengigkeiten installieren
npm install
cd agent && bun install && cd ..

# Entwicklung
npm run tauri dev

# Build
npm run tauri build
```

## Lizenz

MIT
