# CLAUDE.md

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

## 스킬

- `/figma-assets` — `01_Assets` 페이지에 디자인 시스템 구축·수정
- `/content-plan` — 주제를 조사해 Notion «콘텐츠 기획» DB에 기획 문서 작성 (Figma 안 씀)
- `/instagram-post` — Notion 기획 문서를 읽어 `02_Workspace`에 게시물 제작 후 내보내기

콘텐츠 흐름: **Notion 기획 → repo 확정 카피 → Figma 조립 → PNG → Notion 역기록**

## 주의

- Figma **무료(Starter)** 플랜이다. 팀 라이브러리 게시가 불가하므로 Assets와 Workspace는
  **반드시 같은 파일의 서로 다른 페이지**여야 한다. 파일을 분리하자는 제안은 하지 말 것.
- 변수 모드(mode)는 컬렉션당 1개만 쓸 수 있다. 다크모드 등 멀티모드 설계를 하지 않는다.
- 디자인은 **Notion 브랜드 언어**를 따른다. 색·서체를 임의로 추가하지 말고
  `design/brand.md`의 규칙 안에서 해결한다.
- 폰트는 **Noto Sans KR** 하나다. 세리프(명조)를 쓰지 않는다 — 위계는 웨이트와 크기로 만든다.
  Pretendard를 설치하면 전체를 그쪽으로 교체할 수 있다. 그 외 폰트를 임의로 고르지 않는다.
- **콘텐츠의 정본은 Notion이다.** 디자인 단계에서 카피를 지어내거나 규격 위반을 저장소에서
  몰래 고치지 않는다. 고칠 것은 보고하고 Notion을 고친 뒤 다시 내려받는다.
  Notion MCP(`notion` 서버)가 안 붙어 있으면 사용자에게 설정을 요청하고 멈춘다(README 4.3) —
  로컬에 기획 문서를 대신 만들지 않는다. 토큰은 `.env`의 `NOTION_TOKEN` 하나이고
  `node scripts/notion-mcp.mjs --check`로 가려낼 수 있다. **시작 전 실제 노출된 도구 이름을
  확인한다** — 로컬 서버(`API-*`)와 호스팅 서버(`notion-*`)가 이름이 다르다.
- `design/figma-file.json`에 컴포넌트 키가 채워져 있으면 `01_Assets`는 **이미 구축된 것이다.**
  다시 만들지 말고 그 노드 ID를 쓴다. 레지스트리가 비어 있으면 자기 파일로 새로 구성하는
  경우(README 4.2 경로 B)이므로 `/figma-assets`로 먼저 구축한다.
