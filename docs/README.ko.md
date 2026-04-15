[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [العربية](README.ar.md)

# Lume

**당신과 함께 성장하는 AI로, 워크플로우를 밝혀드립니다.**

Lume는 Tauri v2로 구축된 데스크톱 AI 어시스턴트로, 3계층 메모리 시스템, 점진적 스킬 공개, 멀티플랫폼 봇 통합 기능을 제공합니다.

## 아키텍처

```
┌─────────────────────────────────────────────┐
│                  Tauri v2 Shell              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  React    │  │  Rust    │  │   Bun     │  │
│  │  프론트   │◄─│  코어    │──│  Agent    │  │
│  │  엔드     │  │ (SQLite, │  │  Sidecar  │  │
│  │  + Tail-  │  │  메모리, │  │ (LLM,     │  │
│  │  windCSS  │  │  스킬)   │  │  도구)    │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    봇 게이트웨이      │
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

## 핵심 기능

### 1. 3계층 메모리 시스템
- **L1 (USER.md)**: 사용자 프로필 — 스타일, 선호도, 시간대 (1375자 이내)
- **L2 (ENV.md)**: 환경 정보 — 프로젝트, 규칙, 알려진 이슈 (2200자 이내)
- **L3 (SQLite FTS5)**: 전체 대화 검색, 무제한 히스토리

### 2. 점진적 스킬 공개
- **L0**: 스킬 이름과 설명만 표시 (40개 이상의 스킬에 약 3K 토큰)
- **L1**: 필요 시 전체 SKILL.md 로드
- **L2**: 특정 섹션 검색
- 15회 도구 호출마다 자기 평가를 통해 스킬 자동 생성

### 3. 프로덕션 하네스
- 세션별 프로세스 격리
- 실행 시간 및 상태를 포함한 도구 호출 추적
- SQLite에 실행 감사 로그 기록
- 프롬프트 인젝션 탐지

### 4. 봇 게이트웨이
- Feishu, Telegram, DingTalk를 위한 통합 어댑터 레이어
- 슬래시 명령어에서 스킬로의 매핑
- 민감한 작업은 데스크톱 앱으로 라우팅하여 승인 처리

## 기술 스택

| 계층 | 기술 |
|------|------|
| 데스크톱 셸 | Tauri v2 |
| 프론트엔드 | React + TypeScript + TailwindCSS |
| 코어 | Rust (SQLite, 메모리, 스킬) |
| 에이전트 | Bun Sidecar (LLM 라우팅, 도구) |
| AI | Anthropic Claude SDK |
| 데이터베이스 | SQLite + FTS5 전문 검색 |

## 시작하기

```bash
# 의존성 설치
npm install
cd agent && bun install && cd ..

# 개발 모드
npm run tauri dev

# 빌드
npm run tauri build
```

## 라이선스

MIT
