[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [العربية](README.ar.md)

# Lume

**Ilumine seu fluxo de trabalho com uma IA que cresce com voce.**

Lume e um assistente de IA para desktop construido com Tauri v2, que conta com um sistema de memoria de 3 camadas, revelacao progressiva de habilidades e integracao com bots multiplataforma.

## Arquitetura

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  Frontend │◄─│  Nucleo  │──│  Agent    │  │
│  │  + Tail-  │  │ (SQLite, │  │  Sidecar  │  │
│  │  windCSS  │  │  Memoria,│  │ (LLM,     │  │
│  │           │  │  Skills) │  │  Ferram.) │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    Gateway de Bots  │
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

## Funcionalidades principais

### 1. Sistema de memoria de 3 camadas
- **L1 (USER.md)**: Perfil do usuario — estilo, preferencias, fuso horario (ate 1375 caracteres)
- **L2 (ENV.md)**: Dados do ambiente — projetos, convencoes, problemas conhecidos (ate 2200 caracteres)
- **L3 (SQLite FTS5)**: Busca completa em conversas, historico ilimitado

### 2. Revelacao progressiva de habilidades
- **L0**: Apenas nomes e descricoes das habilidades (~3K tokens para mais de 40 habilidades)
- **L1**: Carregamento completo do arquivo SKILL.md sob demanda
- **L2**: Recuperacao de secoes especificas
- Geracao automatica de habilidades a cada 15 chamadas de ferramentas por meio de autoavaliacao

### 3. Ambiente de producao
- Isolamento de processos por sessao
- Rastreamento de chamadas de ferramentas com duracao e status
- Logs de auditoria de execucao no SQLite
- Deteccao de injecao de prompts

### 4. Gateway de Bots
- Camada de adaptacao unificada para Feishu, Telegram e DingTalk
- Mapeamento de comandos slash para habilidades
- Operacoes sensiveis sao redirecionadas ao aplicativo desktop para aprovacao

## Stack tecnologico

| Camada | Tecnologia |
|--------|-----------|
| Shell de desktop | Tauri v2 |
| Frontend | React + TypeScript + TailwindCSS |
| Nucleo | Rust (SQLite, Memoria, Habilidades) |
| Agente | Bun Sidecar (roteamento LLM, ferramentas) |
| IA | Anthropic Claude SDK |
| Banco de dados | SQLite com FTS5 |

## Primeiros passos

```bash
# Instalar dependencias
npm install
cd agent && bun install && cd ..

# Desenvolvimento
npm run tauri dev

# Build
npm run tauri build
```

## Licenca

MIT
