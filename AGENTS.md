# Instagram 디자인 에셋 · 콘텐츠 제작 에이전트 규칙

이 문서는 **모든 에이전트(Claude Code, Codex, Antigravity)의 공용 운영 규칙**이다.
Figma 작업을 시작하기 전에 반드시 이 문서를 읽고, 아래 규칙을 벗어나지 않는다.

> 시스템 전체 설명·설치·명령어는 [`README.ko.md`](README.ko.md) (영문 [`README.md`](README.md)).
> 이 문서는 **규칙**만 담는다. 둘이 어긋나면 이 문서가 우선이다.

---

## 1. 시스템 구조

```
Notion «콘텐츠 기획» DB      ← 기획·조사·이미지 계획. 게시물 하나 = 페이지 하나
      │  /content-plan
      ▼
repo  content/posts/<slug>.md ← 확정 카피 스냅샷 (git 이력)
      │  /instagram-post
      ▼
Figma 파일 1개 (무료 플랜이므로 라이브러리 게시 불가 → 반드시 단일 파일)
├─ 페이지 01_Assets     ← 디자인 시스템. 마스터 컴포넌트 + 변수 + 스타일
└─ 페이지 02_Workspace  ← 실제 게시물. 01_Assets 의 컴포넌트 인스턴스만 배치
      │
      ▼
Notion 같은 페이지 «6. 디자인 결과» ← 노드 ID · 내보낸 파일 (되돌려 기록)
```

- **Assets = 원본, Workspace = 조립.** 이 방향은 절대 역전되지 않는다.
- Workspace에서 만든 것을 Assets로 승격하려면 사람이 명시적으로 요청해야 한다.
- **기획 = Notion, 조립 = Figma.** 카피의 정본은 Notion 기획 문서다. Figma 단계에서
  카피를 지어내거나 몰래 고치지 않는다. 고칠 것이 있으면 Notion을 고치고 다시 내려받는다.

연결 정보(파일 키, 페이지 ID, 컴포넌트 키)는 `design/figma-file.json`에 기록한다.
Notion 쪽(DB ID, workspace)은 `content/notion.json`에 기록한다.
작업 전 이 두 파일을 먼저 읽고, 새 노드나 새 DB를 만들면 여기에 ID를 갱신한다.
기획 문서의 구조와 파싱 규칙은 `design/content-plan.md`에 있다.

**디자인 기준은 Notion 브랜드다.** 색·서체의 근거와 사용 규칙은 `design/brand.md`에 있다.
값을 바꾸거나 새 색을 쓰고 싶으면 그 문서를 먼저 읽는다.

---

## 2. 절대 규칙

1. **`01_Assets` 페이지의 마스터 컴포넌트·변수·스타일은 사용자의 명시적 요청 없이 수정하지 않는다.**
   포스트 하나 때문에 마스터를 고치는 것은 금지. 예외가 필요하면 먼저 물어본다.
2. **`02_Workspace`에는 컴포넌트 인스턴스만 배치한다.** 사각형·텍스트를 직접 그려서
   컴포넌트를 흉내내지 않는다. 필요한 컴포넌트가 없으면 만들지 말고 사용자에게 보고한다.
3. **색·폰트·간격을 하드코딩하지 않는다.** 반드시 Figma 변수/스타일을 참조한다.
   값의 근거는 `design/tokens.json`이다. 토큰에 없는 값이 필요하면 먼저 토큰에 추가를 제안한다.
   색은 **Notion 공식 팔레트 안에서만** 고른다. 팔레트 밖의 색을 지어내지 않는다.
   폰트는 **Noto Sans KR** 하나뿐이다. 세리프(명조)를 들이지 않는다. 위계는 서체가 아니라
   웨이트와 크기로 만든다.
   그림자·그라디언트·굵은 테두리를 쓰지 않는다(노션 톤 위반).
4. **삭제는 하지 않는다.** 잘못 만든 노드는 사용자에게 알리고 승인 후 정리한다.
5. **한 번에 한 게시물.** 여러 게시물을 동시에 캔버스에 쓰지 않는다(노드 ID 충돌·검수 불가).
6. 텍스트는 **한국어 기준**으로 줄바꿈·자간을 검수한다. 영문 기준 레이아웃을 그대로 쓰지 않는다.
7. **공유 작업공간이면 파일을 여러 사람이 함께 쓴다.** 내가 만들지 않은 섹션·프레임은 읽기만 한다.
   옮기거나 고치거나 지우지 않는다. 참고할 것이 있으면 복제해서 본다.
   작업 시작 전 `02_Workspace`의 기존 섹션 목록을 확인하고, 새 섹션은 겹치지 않는 이름으로
   캔버스의 빈 자리에 만든다. 같은 `YYYY-MM-DD_<slug>` 섹션이 이미 있으면 이어서 쓰지 말고
   사용자에게 먼저 확인한다.
8. **카피의 정본은 Notion 기획 문서다.** 디자인 단계에서 카피를 새로 지어내거나 규격 위반을
   저장소에서 몰래 고치지 않는다. 고칠 것을 찾으면 보고하고, 사용자 판단으로 Notion을 고친 뒤
   다시 내려받는다. Notion과 저장소가 갈라지는 것이 가장 나쁜 상태다.
9. **출처 없는 사실은 카드에 넣지 않는다.** 노션 기능은 공식 도움말로 확인한다.
   기억으로 쓰지 않는다. 근거는 기획 문서 «2. 조사»에 링크로 남긴다.

---

## 3. 표준 워크플로

### A. 에셋 제작 (`01_Assets`)
1. `design/design-system.md`와 `design/tokens.json`을 읽는다.
2. 변수 컬렉션 → 텍스트/색 스타일 → 컴포넌트 순서로 만든다. (의존성 순서를 지킬 것)
3. 만든 컴포넌트의 이름과 키를 `design/figma-file.json`에 기록한다.
4. 마지막에 무엇을 만들었는지 **목록으로 보고**한다. 스크린샷 확인을 요청한다.

### B. 콘텐츠 기획 (Notion) — `/content-plan`
1. `design/content-plan.md`(기획 문서 규격)와 `design/formats.md`를 읽는다.
2. Notion DB의 기존 행을 조회해 **주제 중복**과 톤 일관성을 점검한다.
3. 조사한다. 사실은 출처 링크와 함께, 조판 레퍼런스는 노션 공식 SNS(`@notionhq`·`@notionhq_kr`)에서.
4. DB에 행을 만들고 본문을 스켈레톤 그대로 채운다. **카드별 카피와 `showImage`를 여기서 확정한다.**
5. `design/formats.md`의 글자 수·톤 규격을 직접 세어 검증한다. 디자인 단계에서 되돌아오는 것이 가장 비싸다.
6. 상태를 `기획완료`로 올리고 링크와 함께 보고한다.

### C. 게시물 제작 (`02_Workspace`) — `/instagram-post`
1. Notion 기획 문서를 `slug`로 찾아 읽는다. **`상태`가 `기획완료` 미만이면 거부하고 기획을 먼저 시킨다.**
2. `design/formats.md`에서 해당 포맷(카드뉴스/포스트/스토리)의 규격을 확인한다.
3. 확정 카피를 `content/posts/<slug>.md`로 내려받고 규격을 재검증한 뒤 **사용자 승인을 받는다.**
   → 디자인 생성 전에 카피 승인을 받는 것이 원칙이다. 캔버스 왕복 비용이 크기 때문이다.
4. 승인 후 Figma에 인스턴스를 생성하고 텍스트를 채운다.
   기획 문서의 **영문 소문자 키는 그대로 컴포넌트 프로퍼티로 들어간다**(`design/content-plan.md` 3항).
5. 프레임을 스크린샷으로 확인한다. 넘침(overflow), 줄바꿈 깨짐, 안전영역 침범을 점검한다.
6. 노드 ID를 `content/posts/<slug>.md` 하단 메타 블록에 기록한다.
7. `node scripts/export-frames.mjs --slug <slug>` 로 PNG를 내보낸다.
8. **Notion에 되돌려 기록한다.** «6. 디자인 결과»에 노드 ID·내보낸 파일, 상태는 `발행준비`로.

---

## 4. 네이밍 규칙

**컴포넌트** (`01_Assets`)
```
CN/Cover      카드뉴스 표지
CN/Body       카드뉴스 본문
CN/Quote      인용 카드
CN/CTA        마지막 카드(팔로우/링크 유도)
PT/Single     단일 포스트
ST/Base       스토리 기본
UI/Badge, UI/Tag, UI/ProgressDots, UI/Callout, UI/Divider, UI/Logo
```

**Workspace 프레임**
```
YYYY-MM-DD_<slug>_<번호 2자리>
예) 2026-09-06_notion-db-tips_01
```
같은 게시물의 프레임은 하나의 섹션(Section)으로 묶고, 섹션 이름은 `YYYY-MM-DD_<slug>`로 한다.

---

## 5. MCP 도구 사용 지침

Figma 쓰기는 **로컬 브리지**(`figma_run` / `figma_status`)를 쓴다. 호출 한도가 없다.
설치·API 차이는 [`bridge/README.md`](bridge/README.md) 참고. Figma 데스크톱에서
`Agent Bridge` 플러그인이 실행 중이어야 한다.

> 공식 원격 MCP(`mcp.figma.com`)도 등록돼 있지만 **Starter 플랜은 월 20회**라
> 이미 소진했다. 쓰지 말 것. 파일 구조 확인·PNG 내보내기는 `Agent Bridge`(`scripts/export-frames.mjs`)로
> 하면 한도와 토큰 없이 바로 내보낼 수 있다.

- 작업 시작 전 `figma_status` 로 연결을 확인한다.
- 작업 시작 전 현재 선택/페이지 상태를 조회해 **어디에 쓰는지 확인**한 뒤 쓴다.
- 한 번에 거대한 생성 요청을 보내지 말고, **프레임 1개 → 확인 → 다음**으로 진행한다.
- 생성 후에는 반드시 스크린샷/이미지로 결과를 확인한다. "만들었다"고만 보고하지 않는다.
- 도구 호출이 실패하면 재시도 전에 원인을 확인한다. 같은 호출을 그대로 반복하지 않는다.

### Notion

기획 문서 읽기·쓰기는 **공식 원격 Notion MCP 서버(`https://mcp.notion.com/mcp`)**를 기본으로 쓴다.
(토큰 기반 환경에서는 로컬 런처 `scripts/notion-mcp.mjs`가 fallback으로 사용될 수 있다.)

> **작업 시작 전 실제로 노출된 도구 이름을 확인하고 쓴다.**
> 원격 서버(`notion-*`)와 로컬 레거시 서버(`API-*`)에 따라 도구명이 다르다.

주요 도구 매핑:

| 하는 일 | 원격 서버 (`mcp.notion.com`) | 로컬 서버 (v2.x fallback) |
|---|---|---|
| 검색 | `notion-search` / `notion-ai-search` | `API-post-search` |
| 페이지 본문/데이터 읽기 | `notion-fetch` | `API-retrieve-page-markdown` |
| 페이지 생성 | `notion-create-pages` | `API-post-page` |
| 페이지 속성/본문 수정 | `notion-update-page` | `API-update-page-markdown` · `API-patch-page` |
| DB 조회 (행 목록) | `notion-query-data-sources` (`mode: "rows"`) | `API-query-data-source` |
| DB 생성 / 스키마 수정 | `notion-create-database` / `notion-update-data-source` | `API-create-a-data-source` / `API-update-a-data-source` |

**본문은 블록 JSON이 아니라 마크다운으로 다룬다.** 기획 문서 스켈레톤이 마크다운 헤딩
구조라서 원격의 `notion-fetch` / `notion-update-page` (또는 로컬의 `API-retrieve-page-markdown` / `API-update-page-markdown`)로
충분하며, 블록 단위로 쪼개는 것보다 토큰이 훨씬 적게 든다.

- 원격 서버는 OAuth 기반이므로 Notion 브라우저 인증이 필요하다.
- DB 질의는 `content/notion.json`에 기록된 `id` 또는 `dataSourceId` / URL을 쓴다.
- MCP가 안 붙어 있으면 사용자에게 설정을 요청하고 **멈춘다**(README 4.3).
  대신 로컬에 기획 문서를 만들지 않는다. 산출물이 두 군데로 갈라진다.
- **내가 만들지 않은 페이지를 고치지 않는다.** DB의 다른 행은 읽기만 한다.
- 페이지를 고칠 때는 기존 내용을 날리지 않으려면 먼저 읽고, 변경이 필요한 부분만 수정하거나 합쳐서 쓴다.
- `상태`를 `카피승인`·`발행됨`으로 올리는 것은 **사람만** 한다.

---

## 6. 보고 형식

작업 종료 시 다음을 보고한다.
- 만든/수정한 노드 목록 (이름 + 노드 ID)
- 규격 점검 결과 (사이즈, 안전영역, 텍스트 넘침)
- 내보낸 파일 경로
- 사람이 확인해야 할 항목
