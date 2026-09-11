# GEMINI.md

이 프로젝트의 운영 규칙은 **[AGENTS.md](./AGENTS.md)** 에 있다. Figma 작업 전 반드시 읽을 것.

## 빠른 참조

| 파일 | 용도 |
|---|---|
| `AGENTS.md` | 공용 규칙 (절대 규칙 · 워크플로 · 네이밍) |
| `README.md` / `README.ko.md` | 사람용 전체 가이드 (설치 · 명령어 · 시스템 설명 · 제작 절차) |
| `design/figma-file.json` | 파일 키 / 페이지 · 컴포넌트 노드 ID 레지스트리 |
| `design/brand.md` | **Notion 브랜드 기준** — 색·서체의 근거와 사용 규칙 |
| `design/tokens.json` | 색 · 타이포 · 간격 토큰 (Figma 변수의 원본) |
| `design/design-system.md` | `01_Assets` 페이지에 만들 컴포넌트 명세 |
| `design/formats.md` | 카드뉴스 / 포스트 / 스토리 규격 · 안전영역 |
| `design/content-plan.md` | **Notion 기획 문서 규격** — DB 스키마 · 본문 스켈레톤 · 파싱 계약 |
| `content/notion.json` | Notion DB ID / 연결 정보 레지스트리 |
| `content/briefs/` | 선택: 기획 전 손메모 (정본 아님) |
| `content/posts/` | 확정 카피 스냅샷 + 노드 ID (Notion에서 내려받음) |
| `content/images/<slug>/` | 카드에 넣을 이미지 파일 |
| `scripts/export-frames.mjs` | Agent Bridge를 통해 프레임 PNG 내보내기 (토큰 불필요) |
| `scripts/notion-mcp.mjs` | Notion MCP 서버 런처 (`.env`의 `NOTION_TOKEN` 사용). `--check`로 연결 확인 |

## 스킬 (Skills)

Antigravity는 `.agents/skills/`를 통해 다음 스킬을 자동 인식한다:

- `content-plan` — 주제를 조사해 Notion «콘텐츠 기획» DB에 기획 문서 작성 (Figma 안 씀)
- `instagram-post` — Notion 기획 문서를 읽어 `02_Workspace`에 게시물 제작 후 내보내기
- `figma-assets` — `01_Assets` 페이지에 디자인 시스템 구축·수정

> 모든 스킬의 절차 정본은 `.claude/skills/<스킬명>/SKILL.md`이며, `.agents/skills/`의 스킬은 정본을 참조한다.

콘텐츠 흐름: **Notion 기획 → repo 확정 카피 → Figma 조립 → PNG → Notion 역기록**

## Antigravity MCP 도구 사용 지침

1. **Figma 조작**:
   - `figma-bridge` 서버의 `figma_status` 및 `figma_run` 사용.
   - Figma 데스크톱 앱에서 `Agent Bridge` 플러그인이 실행 중이어야 함 (포트 3055).
   - 공식 MCP(`mcp.figma.com`)는 한도 초과로 절대 쓰지 않는다.
   - 작업 전 항상 `figma_status`로 연결 상태 확인.

2. **Notion 연동**:
   - `notion` 로컬 서버 도구군 (`API-*`) 사용.
   - 페이지 본문은 마크다운(`API-retrieve-page-markdown`, `API-update-page-markdown`)으로 읽고 쓴다 (블록 JSON 쓰지 않음).
   - DB 행 조회는 `API-query-data-source` (인자: `data_source_id`).
   - `scripts/notion-mcp.mjs --check`로 권한 및 연결 상태 사전 검증 가능.

3. **조사 및 사실 확인**:
   - 노션 관련 사실 조사는 노션 공식 도움말 및 `exa` 도구를 적극 활용.
   - 출처 없는 사실은 카드에 넣지 않는다.

## 주요 주의사항

- Figma **무료(Starter)** 플랜이므로 `01_Assets`와 `02_Workspace`는 **반드시 단일 파일의 서로 다른 페이지**로 유지한다.
- `01_Assets`의 마스터 컴포넌트, 변수, 스타일은 사용자 승인 없이 임의 수정하지 않는다.
- `02_Workspace`에는 컴포넌트 인스턴스만 배치한다.
- 색상은 **Notion 공식 팔레트**(`design/tokens.json`), 서체는 **Noto Sans KR**만 사용한다.
- **콘텐츠의 정본은 Notion 기획 문서다.** Figma 작업 단계에서 카피를 임의 수정하지 않는다.
- 상태 변경 중 `카피승인`과 `발행됨`은 사용자(사람)만 올릴 수 있다.
