[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [العربية](README.ar.md)

# Lume

**Eclairez votre flux de travail avec une IA qui evolue avec vous.**

Lume est un assistant IA de bureau construit avec Tauri v2, dote d'un systeme de memoire a 3 niveaux, d'une divulgation progressive des competences et d'une integration multi-plateforme de bots.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  Frontend │◄─│  Noyau   │──│  Agent    │  │
│  │  + Tail-  │  │ (SQLite, │  │  Sidecar  │  │
│  │  windCSS  │  │  Memoire,│  │ (LLM,     │  │
│  │           │  │  Skills) │  │  Outils)  │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    Passerelle Bot   │
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

## Fonctionnalites principales

### 1. Systeme de memoire a 3 niveaux
- **L1 (USER.md)** : Profil utilisateur — style, preferences, fuseau horaire (jusqu'a 1375 caracteres)
- **L2 (ENV.md)** : Donnees d'environnement — projets, conventions, problemes connus (jusqu'a 2200 caracteres)
- **L3 (SQLite FTS5)** : Recherche plein texte dans les conversations, historique illimite

### 2. Divulgation progressive des competences
- **L0** : Noms et descriptions des competences uniquement (~3K tokens pour plus de 40 competences)
- **L1** : Chargement complet du fichier SKILL.md a la demande
- **L2** : Extraction de sections specifiques
- Generation automatique de competences toutes les 15 invocations d'outils via auto-evaluation

### 3. Cadre de production
- Isolation des processus par session
- Tracage des appels d'outils avec duree et statut
- Journaux d'audit d'execution dans SQLite
- Detection d'injection de prompts

### 4. Passerelle Bot
- Couche d'adaptation unifiee pour Feishu, Telegram et DingTalk
- Correspondance des commandes slash vers les competences
- Les operations sensibles sont redirigees vers l'application de bureau pour approbation

## Stack technique

| Couche | Technologie |
|--------|------------|
| Shell de bureau | Tauri v2 |
| Frontend | React + TypeScript + TailwindCSS |
| Noyau | Rust (SQLite, Memoire, Competences) |
| Agent | Bun Sidecar (routage LLM, outils) |
| IA | Anthropic Claude SDK |
| Base de donnees | SQLite avec FTS5 |

## Demarrage rapide

```bash
# Installer les dependances
npm install
cd agent && bun install && cd ..

# Developpement
npm run tauri dev

# Compilation
npm run tauri build
```

## Licence

MIT
