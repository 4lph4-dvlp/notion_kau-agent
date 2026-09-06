# figma-agent

> 🇬🇧 **English: [README.md](README.md)**

인스타그램 계정 운영을 위한 에이전트 기반 디자인 시스템. AI 에이전트(Claude Code, Codex,
Antigravity)가 Figma에 재사용 가능한 디자인 에셋을 만들고, 그 에셋으로 카드뉴스·포스트·
스토리를 일관되게 조립한다.

**Notion Campus Leader** 계정용으로 만들었기 때문에 시각 언어는 노션 브랜드를 따른다 —
따뜻한 무채색, 세리프 헤드라인, 넉넉한 여백, 장식 없음.

---

## 목차

1. [이게 뭔가](#1-이게-뭔가)
2. [어떻게 작동하나](#2-어떻게-작동하나)
3. [사전 준비](#3-사전-준비)
4. [설치](#4-설치)
5. [브리지 실행](#5-브리지-실행)
6. [명령어와 도구](#6-명령어와-도구)
7. [디자인 시스템](#7-디자인-시스템)
8. [실제 게시물 만들기](#8-실제-게시물-만들기)
9. [제약과 함정](#9-제약과-함정)
10. [문제 해결](#10-문제-해결)

---

## 1. 이게 뭔가

Figma 파일 하나 안에 두 가지가 있다.

```
Figma 파일 "Notion CL"
├─ 페이지 01_Assets      디자인 시스템 — 마스터 컴포넌트, 변수, 스타일
└─ 페이지 02_Workspace   실제 게시물 — 위 컴포넌트의 인스턴스
```

**Assets = 원본, Workspace = 조립.** 이 방향은 절대 역전되지 않는다. 에이전트가
`01_Assets`에 컴포넌트를 한 번 만들어두면, 이후 모든 게시물은 인스턴스에 텍스트만 채우는
작업이 된다. 게시물이 백 개가 되어도 한 계정처럼 보이게 만드는 건 이 구조다.

이 저장소에는 **명세**(토큰, 컴포넌트 스펙, 브랜드 규칙, 에이전트 지침)와
**도구**(Figma 브리지, 내보내기 스크립트)가 들어 있다. 실제 픽셀은 Figma 파일에 있다.

### 왜 Figma 브리지를 직접 만들었나

Figma는 공식 MCP 서버를 제공하고 잘 작동한다. 그런데 **무료(Starter) 플랜에서는 월 20회**
호출뿐이다. 무언가를 만들기에도 부족하고, 주간 게시물 워크플로를 돌리는 건 불가능하다.
게다가 모든 클라이언트에서 쓸 수 있는 것도 아니다 — Figma 카탈로그 기준 Antigravity는
로컬 전용·읽기 전용이다.

그래서 이 프로젝트는 자체 브리지를 포함한다. 로컬 Figma 플러그인과 HTTP로 통신하는 작은
MCP 서버다. **호출 한도 없음, 모든 MCP 클라이언트에서 작동, npm 의존성 0.**

기성 대안(`figma-edit-mcp`, `talk-to-figma-mcp`)은 `create_frame`, `set_fill_color` 같은
세분화된 도구 수십 개를 제공한다. `combineAsVariants`, 변수 바인딩, exposed instance,
알파 마스크 같은 걸 못 하는데, 이 디자인 시스템은 전부 필요하다. 이 브리지는
**임의의 Figma Plugin API JavaScript를 실행하는 도구 하나**를 노출한다. Plugin API로
할 수 있는 건 에이전트도 할 수 있다.

---

## 2. 어떻게 작동하나

```
┌────────────────┐   stdio (MCP)    ┌──────────────┐   HTTP long-poll   ┌───────────────┐
│  Claude Code   │ ───────────────► │              │ ◄───────────────── │ Figma 플러그인 │
│  Codex         │                  │  server.mjs  │                    │ "Agent Bridge"│
│  Antigravity   │ ◄─────────────── │  :3055       │ ──────────────────►│  (데스크톱)    │
└────────────────┘   결과 + PNG      └──────────────┘   실행할 코드        └───────┬───────┘
                                                                                │
                                                                       Figma Plugin API
                                                                                │
                                                                                ▼
                                                                          Figma 파일
```

1. 에이전트가 `figma_run` MCP 도구에 JavaScript를 넘긴다.
2. `server.mjs`가 작업을 큐에 넣고, 폴링 중인 플러그인에 전달한다.
3. 플러그인의 UI iframe이 샌드박스로 중계하고, 샌드박스가 `figma` 전역과 함께 `eval`한다.
4. 반환값(과 스크린샷)이 같은 경로로 돌아온다.

**여러 에이전트를 동시에 켜도 된다.** 포트 3055를 먼저 잡은 프로세스가 *host*가 되고,
나머지는 포트가 잡힌 걸 감지해 *client*로 붙어 host를 경유한다. host가 종료되면 남은
client 하나가 스스로 승격한다.

플러그인이 필요 없는 읽기 작업(파일 구조 조회, PNG 내보내기)은 Figma **REST API**를
쓴다. 별도의 넉넉한 한도가 적용된다.

---

## 3. 사전 준비

| 항목 | 이유 | 비고 |
|---|---|---|
| **Node.js 18+** | 브리지와 내보내기 스크립트 실행 | 의존성이 0이라 `npm install` 불필요 |
| **Figma 데스크톱 앱** | 플러그인은 여기서만 실행된다 | 브라우저 버전은 로컬 개발 플러그인을 못 돌린다 |
| **Figma 계정** | — | 무료 Starter로 충분 |
| MCP 클라이언트 최소 1개 | Claude Code, Codex, Antigravity | 셋 다 동시에 등록 가능 |
| Figma 개인 액세스 토큰 | REST로 PNG 내보내기 | 무료, [4.5](#45-rest-api-토큰-env) 참고 |

한글은 **Noto Sans KR**과 **Noto Serif KR**로 조판한다. 둘 다 Figma 기본 제공이라 설치할
게 없다. (Pretendard 업그레이드는 [7.2](#72-디자인-토큰) 참고)

---

## 4. 설치

### 4.1 프로젝트 배치

저장소는 아무 데나 둬도 된다. 아래 모든 명령은 프로젝트 루트에서 실행한다.
MCP 등록에 절대 경로가 필요하므로 경로를 확인해둔다.

```
<PROJECT>/
```

> 이 저장소의 실제 경로는
> `D:\대외활동\2026-2027 Notion Campust Leader\figma-agent` 다.
> `<PROJECT>`가 나오는 자리에 각자의 경로를 넣으면 된다.

### 4.2 Figma 파일 준비

Figma 디자인 파일 **하나**를 만들고 페이지 **둘**을 정확히 이 이름으로 만든다.

```
01_Assets
02_Workspace
```

> **두 파일로 나누지 말 것.** 무료 플랜은 팀 라이브러리 게시가 안 되므로 컴포넌트를
> 파일 간에 공유할 수 없다. 한 파일, 두 페이지다.

그다음 `design/figma-file.json`에 파일 키를 적는다. 키는 URL의 이 부분이다.

```
https://www.figma.com/design/<FILE_KEY>/<파일명>
                             ^^^^^^^^^^
```

```jsonc
{
  "fileKey": "l4iUTnc5fRX9vPDLSY8eDI",
  "fileName": "Notion CL",
  "pages": {
    "assets":    { "name": "01_Assets",    "id": "23:15" },
    "workspace": { "name": "02_Workspace", "id": "0:1" }
  }
}
```

페이지 ID는 에이전트가 첫 실행 때 채운다. 시작할 때는 `fileKey`만 있으면 된다.

### 4.3 MCP 서버 등록

에이전트마다 한 번씩. `bridge/server.mjs`의 **절대 경로**를 쓴다.

#### Claude Code

```bash
claude mcp add --scope user figma-bridge -- node "<PROJECT>/bridge/server.mjs"
```

`claude mcp list`로 확인. 도구가 로드되도록 세션을 새로 시작한다.

#### Codex

```bash
codex mcp add figma-bridge -- node "<PROJECT>/bridge/server.mjs"
```

`codex mcp list`로 확인. `~/.codex/config.toml`에 이렇게 기록된다.

```toml
[mcp_servers.figma-bridge]
command = "node"
args = ['<PROJECT>/bridge/server.mjs']
```

#### Antigravity

CLI가 없어서 설정 파일을 직접 고친다. 설치된 버전에 따라 읽는 파일이 다르므로
**둘 다** 쓴다.

```
~/.gemini/antigravity-ide/mcp_config.json
~/.gemini/config/mcp_config.json
```

```json
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": ["<PROJECT>/bridge/server.mjs"]
    }
  }
}
```

> Windows에서도 **슬래시(`/`)를 쓸 것.** Node가 받아주고, JSON에서 백슬래시 이스케이프가
> 깨지는 사고를 막을 수 있다.

### 4.4 Figma 플러그인 설치

직접 해야 하는 단계. 한 번만 하면 된다.

1. **Figma 데스크톱 앱**을 연다 (브라우저 아님).
2. 디자인 파일을 연다.
3. 메뉴 → `Plugins` → `Development` → **`Import plugin from manifest…`**
4. `<PROJECT>/bridge/plugin/manifest.json` 을 고른다.
5. 실행: `Plugins` → `Development` → **`Agent Bridge`**

작은 패널이 뜬다. **초록 점 + "연결됨"이 보이면 준비 완료다.**
빨간 점이면 브리지 서버가 안 떠 있는 것 — [5장](#5-브리지-실행) 참고.

> **작업하는 동안 플러그인 패널을 열어둘 것.** 닫으면 연결이 끊긴다.
> 파일을 전환하면 Figma가 플러그인을 내리므로 다시 실행해야 한다.

### 4.5 REST API 토큰 (`.env`)

PNG 내보내기와 파일 구조 조회에만 필요하다. 둘 다 브리지와 무관하게 동작한다.

1. Figma → 계정 메뉴 → `Settings` → `Security` → **Personal access tokens** →
   **File content: Read** 권한으로 발급.
2. `.env.example`을 `.env`로 복사하고 채운다.

```bash
FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxx
FIGMA_FILE_KEY=l4iUTnc5fRX9vPDLSY8eDI
```

> `FIGMA_FILE_KEY`는 URL 전체가 아니라 **키만** 넣는다. `.env`는 gitignore 대상이니
> 절대 커밋하지 말 것.

확인:

```bash
node scripts/export-frames.mjs --list
```

페이지와 최상위 노드 목록이 나오면 성공이다.

---

## 5. 브리지 실행

두 가지 방법이 있고 서로 대체 가능하다.

**자동** — MCP 클라이언트가 세션을 시작할 때 `server.mjs`를 알아서 띄운다. Claude Code,
Codex, Antigravity를 쓰고 있다면 할 일이 없다.

**수동** — 에이전트 세션 없이 브리지만 띄우거나 로그를 보고 싶을 때.

```bash
node bridge/server.mjs
```

```
[bridge] host — http bridge on http://127.0.0.1:3055 and [::1]
[bridge] mcp stdio ready
```

**이후 로그가 멈춰 있는 건 정상이다.** 서버는 시작할 때와 오류가 났을 때만 기록하고,
폴링은 조용히 돌아간다. 플러그인의 초록 점이 연결의 증거다.

상태는 언제든 확인할 수 있다.

```bash
curl http://localhost:3055/agent/health
# {"ok":true,"pluginConnected":true,"queued":0}
```

### 환경 변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `FIGMA_BRIDGE_PORT` | `3055` | 포트가 충돌할 때 변경 |
| `FIGMA_BRIDGE_TIMEOUT` | `180000` | 플러그인 응답 대기 시간(ms) |

> 포트를 바꾸면 `bridge/plugin/manifest.json`의 `networkAccess.allowedDomains`와
> `bridge/plugin/ui.html`의 `BASE`도 같이 바꾸고 플러그인을 다시 import해야 한다.
> Figma는 manifest에 없는 도메인을 차단한다.

---

## 6. 명령어와 도구

### 6.1 MCP 도구 (에이전트 안에서)

#### `figma_status`

플러그인 연결 여부를 알려준다. Figma 작업 전에 먼저 호출하면 좋다.

```json
{ "pluginConnected": true, "queued": 0, "port": 3055, "role": "host" }
```

#### `figma_run`

Figma Plugin API JavaScript를 실행한다. 코드가 async 함수로 감싸지므로
**최상위 `await`와 `return`을 모두 쓸 수 있다.**

```js
// 페이지 목록
return figma.root.children.map(p => ({ id: p.id, name: p.name }));
```

전역 세 개를 쓸 수 있다.

| 전역 | 역할 |
|---|---|
| `figma` | [Figma Plugin API](https://developers.figma.com/docs/plugins/api/api-reference/) 전체 |
| `snap(node, scale?)` | 노드를 PNG로 캡처해 결과에 첨부. 배율 생략 시 긴 변 1024px에 맞춰 자동 계산 |
| `AL(direction, props?)` | 오토레이아웃 프레임 생성 (`figma.createFrame()` + `layoutMode`를 한 번에) |

**생성하거나 수정한 노드 ID를 반드시 `return`할 것.** 다음 호출에서 필요하고, 무슨 일이
일어났는지 남는 유일한 기록이다.

### 6.2 CLI — 에이전트 없이

#### `bridge/run.mjs` — 스크립트를 Figma에 실행

```bash
node bridge/run.mjs task.js                       # 파일
node bridge/run.mjs -e 'return figma.root.name'   # 인라인
echo 'return 1 + 1' | node bridge/run.mjs         # 표준입력
```

`snap()`으로 찍은 스크린샷은 `exports/_bridge/`에 저장된다. 브리지나 플러그인이 꺼져
있으면 실행 전에 알려준다.

여러 단계 작업에는 이 방법이 가장 편하다. 스크립트를 파일로 두고 실행 → 출력 확인 →
수정 → 재실행.

#### `scripts/export-frames.mjs` — PNG 내보내기 (REST, 플러그인 불필요)

```bash
# 파일 구조 조회: 페이지와 최상위 노드 ID
node scripts/export-frames.mjs --list

# 완성된 게시물 내보내기 (content/posts/<slug>.md 에서 노드 ID를 읽는다)
node scripts/export-frames.mjs --slug notion-db-tips

# 임의 노드 내보내기
node scripts/export-frames.mjs --ids 47:43,47:66 --out exports/tmp

# 옵션
--scale 1        # 기본값. 프레임이 이미 1080px 폭이다
--format png     # png | jpg | svg
```

> `--scale 1`을 유지할 것. 프레임이 원래 1080px이고 인스타가 원하는 크기가 정확히
> 그것이다. 2배로 뽑으면 재압축만 거쳐 오히려 나빠진다.

### 6.3 스킬 (Claude Code)

| 스킬 | 용도 |
|---|---|
| `/figma-assets` | `01_Assets`의 디자인 시스템 구축·수정 |
| `/instagram-post <slug>` | 브리프를 받아 `02_Workspace`에 카드 제작 |

---

## 7. 디자인 시스템

### 7.1 파일별 역할

처음이라면 이 순서로 읽으면 된다. 에이전트가 반드시 따라야 하는 건 `AGENTS.md`다.

| 파일 | 역할 |
|---|---|
| **`AGENTS.md`** | **모든 에이전트가 지키는 규칙.** 절대 규칙, 워크플로, 네이밍. 여기서 시작 |
| `CLAUDE.md` | Claude Code 진입점. `AGENTS.md`를 가리키고 빠른 참조표를 담는다 |
| `design/brand.md` | 색과 서체가 **왜** 이 값인지. 노션 팔레트, 세리프/산세리프 전략, 그리고 노션에서 온 것과 아닌 것을 구분한 표 |
| `design/tokens.json` | **값의 원본.** 색, 타입 스케일, 간격, 반경, 캔버스 크기, 안전영역. Figma 변수가 여기서 생성된다 |
| `design/design-system.md` | `01_Assets`의 컴포넌트별 명세: 구조, 프로퍼티, 제작 순서, 검수 체크리스트 |
| `design/formats.md` | 포맷별 규칙: 캔버스 크기, 안전영역, 중앙 정사각형 법칙, 카테고리별 강조색, 카피 길이 제한, 톤 |
| `design/figma-file.json` | **레지스트리.** 파일 키, 페이지 ID, 모든 컴포넌트의 노드 ID·키·프로퍼티. 에이전트가 작업 전에 읽고 작업 후에 갱신한다 |
| `design/rebuild-plan.md` | 중앙 정사각형 + 흑백 테마 전환 기록과 색 대응표. 재구축할 때 유용 |
| `bridge/README.md` | 브리지 내부 구조, Plugin API 함정, 공식 MCP와의 API 차이 |
| `content/briefs/` | **입력.** 게시물 소재 하나당 마크다운 하나 |
| `content/posts/` | **출력.** 확정 카피 + 생성된 프레임의 노드 ID |
| `exports/` | 생성된 PNG (gitignore 대상) |
| `scripts/export-frames.mjs` | REST 기반 PNG 내보내기 |
| `bridge/` | MCP 서버, Figma 플러그인, CLI 러너 |

### 7.2 디자인 토큰

전부 `design/tokens.json`에 있고 Figma에 변수·스타일로 반영돼 있다.
**색·폰트·간격을 하드코딩하지 말 것** — 변수나 스타일을 참조한다.

#### 색 — 노션 팔레트

노션의 무채색은 순수한 회색이 아니라 미묘한 갈색 언더톤을 갖는다. 노션 같은 느낌을
만드는 건 대부분 이 디테일이다.

| 역할 | 값 | 출처 |
|---|---|---|
| 기본 텍스트 | `#373530` | 노션 라이트모드 기본 텍스트 |
| 보조 텍스트 | `#787774` | 노션 gray 텍스트 |
| 배경 | `#FFFFFF` | — |
| 보조 배경 | `#F1F1EF` | 노션 gray 배경 |
| 따뜻한 배경 | `#F7F6F3` | 사이드바 톤 (공식 문서 미확인) |
| 반전 배경 | `#191919` | 노션 다크모드 페이지 배경 |
| 반전 텍스트 | `#D4D4D4` | 노션 다크모드 기본 텍스트 |
| 구분선 | `#E9E9E7` / `#373737`(다크) | 다크 값은 계산값, 공식 문서 아님 |

여기에 노션 **강조 9색**. 각각 라이트 텍스트값, 라이트 배경, 다크 배경을 갖는다.

| | gray | brown | orange | yellow | green | blue | purple | pink | red |
|---|---|---|---|---|---|---|---|---|---|
| 텍스트 | `#787774` | `#976D57` | `#CC782F` | `#C29343` | `#548164` | `#487CA5` | `#8A67AB` | `#B35488` | `#C4554D` |
| 배경 | `#F1F1EF` | `#F3EEEE` | `#F8ECDF` | `#FAF3DD` | `#EEF3ED` | `#E9F3F7` | `#F6F3F8` | `#F9F2F5` | `#FAECEC` |
| 다크 배경 | `#252525` | `#2E2724` | `#36291F` | `#372E20` | `#242B26` | `#1F282D` | `#2A2430` | `#2E2328` | `#332523` |

**규칙**
- **한 게시물에 강조색 하나.** 카드마다 색을 바꾸지 않는다.
- 강조색은 같은 이름의 배경과만 짝지어 쓴다. `blue` 글자에 `green` 배경 같은 조합 금지.
- `yellow`, `orange`, `gray`는 흰 배경에서 명암비가 약 3:1이다. 뱃지·배경·40px 이상
  텍스트에만 쓰고 본문에는 쓰지 않는다.
- 콘텐츠 카테고리별로 색을 고정한다.

| 카테고리 | 강조색 |
|---|---|
| 노션 기능·튜토리얼 | `blue` |
| 템플릿 공유 | `purple` |
| 공지·모집 | `orange` |
| 실수·주의 | `red` |
| 후기·성과 | `green` |
| 중립 | `gray` |

#### 타이포그래피

노션은 **마케팅 헤드라인에 세리프**(Lyon), **제품 UI에 산세리프**(Inter)를 쓴다.
이 프로젝트는 그 전략을 한글로 옮겼다.

| 노션 | 원본 | 여기 |
|---|---|---|
| 에디토리얼 헤드라인 | Lyon (유료 라이선스) | **Noto Serif KR** |
| 제품·본문 | Inter | **Noto Sans KR** |

텍스트 스타일 7종:

| 스타일 | 계열 | Figma 스타일 | 크기 | 행간 | 자간 | 용도 |
|---|---|---|---|---|---|---|
| `Display` | 세리프 | SemiBold | 88 | 1.2 | −2% | 표지 대제목, 최대 3줄 |
| `Quote` | 세리프 | Regular | 52 | 1.5 | −1% | 인용문 |
| `Title` | 산세리프 | Bold | 60 | 1.3 | −2% | 본문 카드 제목, 최대 2줄 |
| `Subtitle` | 산세리프 | Medium | 40 | 1.4 | −2% | 표지 부제, 스토리 본문 |
| `Body` | 산세리프 | Regular | 34 | 1.5 | −1% | 본문 |
| `Caption` | 산세리프 | Regular | 26 | 1.5 | 0% | 출처, 진행 표시 |
| `Label` | 산세리프 | Bold | 24 | 1.2 | +2% | 뱃지, 로고 워드마크 |

> **`Body` 행간 1.5는 노션 규격이다.** 텍스트가 넘치면 행간을 좁히지 말고 글자를 줄인다.

> **선택적 업그레이드:** [Pretendard](https://github.com/orioncactus/pretendard)는 Inter와
> 메트릭이 같아 더 적합하지만 Google Fonts에 없다. 로컬 설치 후 `tokens.json`의
> `typography.family.sans`를 바꾸고 텍스트 스타일 7개만 다시 만들면 모든 컴포넌트에
> 자동 반영된다.

> `figmaStyle` 필드는 Figma가 인식하는 정확한 문자열이다. 추측하면
> (`SemiBold` vs `Semi Bold`) 폰트 로드가 실패한다.

#### 간격과 반경

```
간격   xs 8 · sm 16 · md 24 · lg 40 · xl 64 · 2xl 96
       pagePadding 80 · squareInset 135 · blockGap 32
반경   none 0 · sm 12 · md 20 · lg 32 · pill 999
```

> 8px 스케일은 일반적인 디자인 시스템 관행이지 노션이 공개한 값이 **아니다.**
> 노션에서 온 것과 아닌 것을 구분한 표가 `design/brand.md`에 있다.

### 7.3 컴포넌트

12개 전부 `01_Assets`의 변형 세트다. 노드 ID는 `design/figma-file.json`에 있다.

#### 두 개의 공통 축

1. **`theme` = `light` | `dark`** — `theme`은 **배경색**을 가리킨다. `light`는 흰 카드에
   어두운 글자다. `UI/Badge`를 뺀 모든 컴포넌트가 이 축을 갖는다. 한 게시물에 하나로 통일.
2. **`showImage`** — 모든 카드에 16:9(920×518) 이미지 자리가 있다. 기본은 꺼짐.

#### 카드

| 컴포넌트 | 크기 | 프로퍼티 |
|---|---|---|
| `CN/Cover` | 1080×1350 | `title`, `subtitle`, `showBadge`, `showImage`, `theme` |
| `CN/Body` | 1080×1350 | `title`, `body`, `showImage`, `showCallout`, `theme` |
| `CN/Quote` | 1080×1350 | `quote`, `source`, `showImage`, `theme` |
| `CN/CTA` | 1080×1350 | `headline`, `sub`, `showImage`, `theme` |
| `PT/Single` | 1080×1350 | `title`, `body`, `showImage`, `theme` |
| `ST/Base` | 1080×1920 | `title`, `body`, `showImage`, `theme` |

- `CN/Cover` — 캐러셀 표지. 뱃지 위에 세리프 `Display` 헤드라인. 제목은 20자 이내.
- `CN/Body` — 주력 카드. 진행 표시는 상단 고정, 콘텐츠는 중앙, 로고는 하단.
  `showCallout`을 켜면 본문 아래 노션식 콜아웃이 붙는다.
- `CN/Quote` — 좌측 세로선이 있는 인용 카드. 세로 중앙 정렬. 로고 없음.
- `CN/CTA` — 마지막 카드. 행동 유도는 **하나만**.
- `PT/Single` — 한 장으로 메시지가 완결되는 단일 포스트.
- `ST/Base` — 스토리. 스크롤이 빨라 본문에 `Subtitle`(40px)을 쓴다.

#### UI 부품

| 컴포넌트 | 프로퍼티 | 비고 |
|---|---|---|
| `UI/Logo` | `handle`, `theme` | 종이비행기 심볼 + `@notion_kau` |
| `UI/Badge` | `text`, `color`(6) | 노션 인라인 태그 알약. **`theme` 없음** — 밝은 알약이 양쪽 배경에서 다 읽힌다 |
| `UI/Callout` | `emoji`, `text`, `color`(6), `theme`(2) → 12변형 | 노션 콜아웃 블록 |
| `UI/ProgressDots` | `current`, `total`, `theme` | `3 / 8` 표시 |
| `UI/Tag` | `text`, `theme` | 해시태그·카테고리 |
| `UI/Divider` | `theme` | 1px 구분선 |

> **`UI/Logo`의 심볼은 벡터가 아니라 래스터 이미지라** fill 색을 직접 못 바꾼다.
> 그래서 **알파 마스크**로 색을 입힌다. 이미지가 아래에서 `isMask = true` /
> `maskType = 'ALPHA'`로 놓이고, 그 위의 색 사각형이 비행기 실루엣으로 잘린다.
> 덕분에 이미지 하나로 두 테마를 다 커버한다. Figma 마스크는 **자기보다 뒤에 오는 형제**에
> 적용되므로 두 레이어의 순서를 바꾸면 안 된다.

### 7.4 레이아웃 법칙

#### 중앙 정사각형

1080×1350 게시물은 프로필 그리드에서 크롭된다.

| 크롭 | 잘리는 곳 | 남는 영역 |
|---|---|---|
| 1:1 (그리드의 캐러셀 표지) | **위아래 각 135px** | 1080×1080 |
| 3:4 (그리드) | 좌우 각 34px | 1012×1350 |

따라서 콘텐츠는 **y 135–1215, x 80–1000** 안에 둔다. 두 크롭을 모두 만족하는 영역이다.

**안에 넣는 것만으로는 부족하다.** 콘텐츠 덩어리를 그 정사각형 안에서 **세로 중앙**에
둔다. 위아래 끝에만 붙여 놓으면 가운데가 텅 비어서, 정사각형으로 크롭했을 때 미완성 카드로
읽힌다.

| 요소 | 자리 |
|---|---|
| 제목·본문 덩어리 | 정사각형 안 세로 중앙 |
| 로고 푸터 | 정사각형 하단(1215) |
| 진행 표시(`CN/Body`) | 정사각형 상단(135) |

구현: `top` 또는 `content` 프레임에 `layoutSizingVertical = 'FILL'`과
`primaryAxisAlignItems = 'CENTER'`를 주고, 카드 루트는 `MIN`으로 둔다.
**루트를 `SPACE_BETWEEN`으로 되돌리지 말 것** — 그게 바로 이 구조가 고친 문제다.

스토리는 그리드 크롭 대상이 아니라 상하 250px 여백을 쓴다.

#### 카피 길이

| 자리 | 제한 |
|---|---|
| 표지 제목 | 20자, 한 문장 |
| 본문 카드 제목 | 15자 |
| 본문 | 2~4문장, 150자, 최대 8줄 |
| 마지막 카드 | 행동 유도 정확히 하나 |

`showImage`를 켜면 정사각형 1080px 중 518px을 이미지가 쓴다. 그만큼 줄인다 —
표지 제목 2줄 · 본문 4줄 · 인용 3줄 · 단일 포스트 제목 2줄 + 본문 2줄.
**이미지를 켠 상태로 눈으로 확인할 것.** `maxLines`가 조용히 잘라내기 때문이다.

### 7.5 브랜드 규칙

`design/brand.md`에서:

- 종이 같은 따뜻한 무채색. 본문에 순수한 검정이나 회색을 쓰지 않는다.
- **그림자·그라디언트·굵은 테두리 없음.** 위계는 서체와 여백으로 만든다.
- 색은 의미를 표시할 때만 쓴다. 장식 금지. 한 게시물에 강조색 하나.
- 세리프는 `Display`와 `Quote` 전용. 세리프 본문은 가독성도 톤도 어긋난다.
- 톤: 단정적이고 짧게. 기능이 아니라 결과를 말한다. 낚시성 표현 금지.
- **Notion 로고를 그리거나 재현하지 않는다.** 카드에는 계정 자체 마크를 넣는다.
  Campus Leader 프로그램에 앰배서더 브랜드 규정이 있다면 그쪽이 우선한다.

---

## 8. 실제 게시물 만들기

### 1단계 — 브리프 작성

`content/briefs/<slug>.md`. `_example.md`를 복사해서 시작하면 된다.

```markdown
---
slug: notion-db-tips
format: cardnews        # cardnews | post | story
cards: 7
accent: red             # blue | purple | orange | red | green | gray
date: 2026-09-07
status: draft
---

# 주제
노션 데이터베이스를 처음 쓰는 사람이 가장 많이 하는 실수 5가지

## 타깃
노션을 막 시작한 대학생.

## 핵심 메시지
데이터베이스는 표가 아니라, 하나의 데이터를 여러 방식으로 보는 도구다.

## 담을 내용
1. ...

## 행동 유도
저장해두고 팔로우.
```

### 2단계 — Figma를 건드리기 전에 카피부터 확정

```
/instagram-post notion-db-tips
```

에이전트가 카드별 카피를 `content/posts/<slug>.md`에 쓰고 **승인을 받으려고 멈춘다.**
의도적인 설계다. 캔버스 왕복은 비싸고, 프레임을 만든 뒤 텍스트를 고치는 건 미리 읽어보는
것보다 훨씬 많은 시간을 쓴다.

[7.4](#74-레이아웃-법칙)의 제한과 대조해서 확인한다 — 제목 길이, 문장 수, CTA 하나.

### 3단계 — 프레임 생성

승인 후 에이전트가 `02_Workspace`에서 작업한다.

1. `YYYY-MM-DD_<slug>` 이름의 섹션 생성
2. 카드마다 컴포넌트 **인스턴스** 배치 — 직접 그린 도형은 절대 쓰지 않는다
3. 프레임 이름을 `YYYY-MM-DD_<slug>_NN`으로 지정
4. 텍스트 프로퍼티를 채우고 `theme`과 강조색을 일관되게 설정
5. 프레임마다 스크린샷을 찍어 확인

### 4단계 — 검수

| 확인 | 이유 |
|---|---|
| 1080×1350 (또는 1080×1920) | 인스타는 캐러셀 전체를 첫 장 비율에 맞춘다 |
| 콘텐츠가 y 135–1215 안에, 중앙 정렬 | 그리드 크롭을 견딘다 |
| 잘린 텍스트 없음 | 특히 `showImage`를 켠 카드 |
| 전 카드에 강조색 하나, `theme` 하나 | 일관성 |
| 한국어 줄바꿈이 자연스러운가 | 조사만 넘어가는 줄바꿈 방지 |
| 마지막 카드에 CTA 정확히 하나 | — |

### 5단계 — 내보내기

`content/posts/<slug>.md` 하단에 노드 ID를 기록한다.

```markdown
## figma-nodes
01 = 12:345
02 = 12:346
```

그다음:

```bash
node scripts/export-frames.mjs --slug notion-db-tips
```

PNG가 `exports/<slug>/`에 순서대로 저장된다. 업로드하고, 포스트 파일의 캡션을 붙여넣으면
끝. `status: approved`로 바꾼다.

---

## 9. 제약과 함정

### Figma 무료(Starter) 플랜

| 항목 | 상태 |
|---|---|
| 공식 원격 MCP (`mcp.figma.com`) | **월 20회** — 사실상 사용 불가, 그래서 이 브리지를 만들었다 |
| 로컬 Dev Mode MCP | 유료 Dev/Full 시트 필요 |
| 팀 라이브러리 게시 | 불가 → Assets와 Workspace가 **반드시** 한 파일에 있어야 한다 |
| 변수 모드 | 컬렉션당 1개 → 라이트/다크를 모드가 아니라 **변형**으로 처리 |
| REST API (읽기 + 이미지 내보내기) | 정상 동작, 별도 한도 |

### Figma Plugin API

다시 알아내려면 시간이 드는 것들:

- **컴포넌트 세트는 자동으로 리사이즈되지 않는다.** 변형을 옮겨도 세트 프레임은 그대로라
  자식이 삐져나가고 내보낼 때 잘린다. `resizeWithoutConstraints()`를 호출해야 한다.
- `insertChild`는 **프로퍼티 드롭다운 순서**만 바꾼다. 캔버스 배치는 `x`/`y`로 따로.
- `figma.createFrame()`은 **흰색 fill로 시작한다.** 비우지(`fills = []`) 않으면 흰 글자를
  가린다.
- `textTruncation = 'ENDING'`을 `maxLines`보다 **먼저** 설정해야 한다. 순서가 반대면
  `maxLines`가 1로 초기화된다.
- `resize()`는 sizing mode 설정 전에. `layoutSizing*`의 `FILL`/`HUG`는 `appendChild` 후에.
- 텍스트를 건드리기 전에 `await figma.loadFontAsync()`로 폰트를 로드한다.
- 페이지 전환은 `await figma.setCurrentPageAsync(page)`. 동기 대입은 예외를 던진다.
- 색은 0–255가 아니라 **0–1** 범위다.
- `figma.notify()`는 예외를 던지고 `console.log()`는 반환되지 않는다. `return`을 쓴다.

### 플러그인 manifest

`networkAccess.allowedDomains`는 **IP 표기를 거부한다.** `http://127.0.0.1:3055`은
검증에 실패한다. `http://localhost:3055`만 받는다. 그런데 Windows에서 `localhost`가
IPv6로 먼저 해석될 수 있어서, 서버는 `127.0.0.1`과 `::1` **양쪽**에 바인딩한다.

---

## 10. 문제 해결

| 증상 | 원인과 조치 |
|---|---|
| import 시 `Invalid value for allowedDomains` | manifest에 IP 표기가 있다. `http://localhost:3055`만 쓸 것 |
| 플러그인이 빨간 점 | 브리지 서버가 안 떠 있다. 에이전트 세션을 시작하거나 `node bridge/server.mjs` |
| `Figma 플러그인이 연결돼 있지 않다` | Figma 데스크톱에서 플러그인이 실행 중이 아니거나 패널을 닫았다 |
| 시작 후 서버 로그가 없음 | **정상.** 시작과 오류만 기록한다 |
| 내보내기에서 `Figma API 404` | `FIGMA_FILE_KEY`에 URL 전체가 들어갔다. 키만 넣을 것 |
| 내보내기에서 `Figma API 429` | REST 요청 한도. 몇 분 기다린다. 큰 페이지 렌더는 비용이 크다 |
| `이 샌드박스는 동적 코드 실행을 허용하지 않는다` | Figma가 `eval`과 `new Function`을 모두 막은 경우. 실제로 발생한 적은 없다. 발생하면 명령 기반 프로토콜로 바꿔야 한다 |
| 포트 3055 충돌 | 자동 처리된다(host/client). 바꾸려면 `FIGMA_BRIDGE_PORT`와 **함께** manifest, `ui.html`을 고치고 플러그인을 다시 import |
| 에이전트에 도구가 안 보임 | MCP 서버는 세션 시작 시 로드된다. 등록 후 세션을 다시 시작할 것 |

구조 조회와 PNG 내보내기는 브리지를 거치지 않으므로 항상 동작한다.

```bash
node scripts/export-frames.mjs --list
```

---

## 라이선스 / 출처

**Notion Campus Leader** 활동의 일부로 제작했다.
노션의 색 값과 타이포그래피 전략은 노션의 공개 제품·브랜드 자료를 참고했고, 레이아웃
규칙은 노션이 아니라 인스타그램의 크롭 동작에서 나왔다. 전체 출처 구분표는
`design/brand.md`에 있다.
