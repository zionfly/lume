[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [العربية](README.ar.md)

# Lume

**Ilumina tu flujo de trabajo con una IA que crece contigo.**

Lume es un asistente de IA de escritorio construido con Tauri v2, que incorpora un sistema de memoria de 3 capas, revelado progresivo de habilidades e integración con bots multiplataforma.

## Arquitectura

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  Frontend │◄─│  Núcleo  │──│  Agent    │  │
│  │  + Tail-  │  │ (SQLite, │  │  Sidecar  │  │
│  │  windCSS  │  │  Memoria,│  │ (LLM,     │  │
│  │           │  │  Skills) │  │  Herram.) │  │
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

## Funcionalidades principales

### 1. Sistema de memoria de 3 capas
- **L1 (USER.md)**: Perfil del usuario — estilo, preferencias, zona horaria (hasta 1375 caracteres)
- **L2 (ENV.md)**: Datos del entorno — proyectos, convenciones, problemas conocidos (hasta 2200 caracteres)
- **L3 (SQLite FTS5)**: Busqueda de texto completo en conversaciones, historial ilimitado

### 2. Revelado progresivo de habilidades
- **L0**: Solo nombres y descripciones de habilidades (~3K tokens para mas de 40 habilidades)
- **L1**: Carga completa del archivo SKILL.md bajo demanda
- **L2**: Recuperacion de secciones especificas
- Generacion automatica de habilidades cada 15 llamadas a herramientas mediante autoevaluacion

### 3. Entorno de produccion
- Aislamiento de procesos por sesion
- Trazado de llamadas a herramientas con duracion y estado
- Registros de auditoria de ejecucion en SQLite
- Deteccion de inyeccion de prompts

### 4. Bot Gateway
- Capa de adaptacion unificada para Feishu, Telegram y DingTalk
- Mapeo de comandos slash a habilidades
- Las operaciones sensibles se redirigen a la aplicacion de escritorio para aprobacion

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Shell de escritorio | Tauri v2 |
| Frontend | React + TypeScript + TailwindCSS |
| Nucleo | Rust (SQLite, Memoria, Habilidades) |
| Agente | Bun Sidecar (enrutamiento LLM, herramientas) |
| IA | Anthropic Claude SDK |
| Base de datos | SQLite con FTS5 |

## Primeros pasos

```bash
# Instalar dependencias
npm install
cd agent && bun install && cd ..

# Desarrollo
npm run tauri dev

# Compilar
npm run tauri build
```

## Licencia

MIT
