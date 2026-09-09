# Figma Agent Bridge

Figma 공식 MCP의 **월 20회 호출 한도**(Starter 플랜)를 우회하는 로컬 브리지.
호출 한도가 없고, Claude Code · Codex · Antigravity 세 곳에서 모두 쓸 수 있다.

```
에이전트 ──stdio(MCP)──> server.mjs ──HTTP long-poll──> Figma 플러그인 ──> Plugin API
```

- **의존성 0.** npm install 필요 없다. Node 18+ 만 있으면 된다.
- 통신은 로컬 루프백 `3055` 포트에서만 일어난다. 외부로 나가는 요청은 없다.
  플러그인 manifest 가 IP 표기를 못 쓰게 하므로 `http://localhost:3055` 로 접속하는데,
  Windows 에서 `localhost` 가 `::1` 로 해석될 수 있어 서버는 **`127.0.0.1` 과 `::1` 양쪽**에 바인딩한다.
- 여러 에이전트가 동시에 켜져도 된다. 먼저 포트를 잡은 쪽이 host, 나머지는 client로 붙는다.
  host가 죽으면 남은 client 중 하나가 자동 승격한다.

---

## 설치

### 1. MCP 등록

에이전트마다 한 번씩. `server.mjs`의 **절대 경로**로 등록한다
(`<PROJECT>` = 클론한 경로. 자세한 설명은 [`README.ko.md` 4.3](../README.ko.md#43-mcp-서버-등록)).

```bash
claude mcp add --scope user figma-bridge -- node "<PROJECT>/bridge/server.mjs"
codex  mcp add            figma-bridge -- node "<PROJECT>/bridge/server.mjs"
```

Antigravity는 CLI가 없어서 설정 파일에 직접 쓴다. 등록 결과는 이 파일들에 남는다.

| 에이전트 | 위치 |
|---|---|
| Claude Code | `~/.claude.json` (user 스코프) |
| Codex | `~/.codex/config.toml` |
| Antigravity | `~/.gemini/antigravity/mcp_config.json`, `~/.gemini/config/mcp_config.json` |

### 2. Figma 플러그인 설치 — **사용자가 직접 해야 함**

1. **Figma 데스크톱 앱**을 연다 (브라우저 아님)
2. 작업할 Figma 파일을 연다
3. 메뉴 → `Plugins` → `Development` → **`Import plugin from manifest…`**
4. 이 폴더의 `plugin/manifest.json` 을 고른다
   ```
   <PROJECT>/bridge/plugin/manifest.json
   ```
5. `Plugins` → `Development` → **`Agent Bridge`** 실행

플러그인 창에 **초록 점 + "연결됨"** 이 뜨면 준비 끝이다.

> 플러그인 창을 닫으면 브리지가 끊긴다. 작업하는 동안 열어둘 것.
> 빨간 점이면 브리지 서버가 없는 것이다 — 에이전트 세션을 새로 시작하거나
> 터미널에서 `node bridge/server.mjs` 를 직접 실행한다.

---

## 사용

에이전트에서 도구 두 개를 쓸 수 있다.

### `figma_status`
플러그인 연결 상태를 본다. 작업 전에 먼저 호출하면 좋다.

### `figma_run`
Figma Plugin API JavaScript 를 실행한다. 코드는 async 함수 본문으로 감싸지므로
**최상위 `await` 와 `return`** 을 쓸 수 있다.

```js
// 예: 페이지 목록
return figma.root.children.map(p => ({ id: p.id, name: p.name }));
```

**전역**

| 이름 | 설명 |
|---|---|
| `figma` | Figma Plugin API |
| `snap(node, scale?)` | 노드를 PNG로 캡처해 결과에 첨부한다. 기본 배율은 긴 변이 1024px을 넘지 않게 자동 계산 |
| `AL(direction, props?)` | 오토레이아웃 프레임 생성. `figma.createFrame()` + `layoutMode` 설정을 한 번에 |

### CLI — 에이전트 없이 실행

`bridge/run.mjs` 로 스크립트를 직접 던질 수 있다. 긴 작업은 파일로 두고 돌리는 편이 편하다.

```bash
node bridge/run.mjs task.js                    # 파일 실행
node bridge/run.mjs -e 'return figma.root.name' # 인라인
echo 'return 1+1' | node bridge/run.mjs         # 표준입력
```

`snap()` 으로 찍은 PNG는 `exports/_bridge/` 에 저장된다.
브리지·플러그인이 꺼져 있으면 실행 전에 알려준다.

---

## 공식 MCP(`use_figma`)와 다른 점

브리지는 **표준 Plugin API 그대로**다. 공식 MCP가 얹어주던 편의 확장은 없다.

| 공식 MCP 확장 | 브리지에서는 |
|---|---|
| `node.query('FRAME[name=x]')` | `node.findAll(n => n.type === 'FRAME' && n.name === 'x')` |
| `node.set({...})` | 속성을 하나씩 대입 |
| `figma.createAutoLayout(dir, props)` | `AL(dir, props)` (브리지가 제공) |
| `await node.screenshot()` | `await snap(node)` (브리지가 제공) |
| `node.placeholder = true` | 없음 |

나머지(`createComponent`, `combineAsVariants`, `setBoundVariable`,
`setFillStyleIdAsync`, `isExposedInstance`, `addComponentProperty` …)는 전부 표준 API라 그대로 쓴다.

---

## 지켜야 할 것

`use_figma` 스킬의 규칙이 여기서도 그대로 적용된다.

- 색은 **0–1 범위** (`{r:1,g:0,b:0}` = 빨강)
- `fills` 는 읽기 전용 배열 — 복제해서 재대입
- 텍스트를 건드리기 전에 **폰트를 `await figma.loadFontAsync()` 로 로드**
- 페이지 전환은 `await figma.setCurrentPageAsync(page)` (동기 대입은 실패)
- `layoutSizing*` 의 `FILL`/`HUG` 는 **`appendChild` 이후**에 설정
- `resize()` 는 sizing mode 설정 **이전**에 호출
- **생성·수정한 노드 ID를 반드시 `return`** 할 것
- 한 번에 10개 남짓의 작업으로 끊어서 진행하고, 단계마다 `snap()` 으로 확인
- **컴포넌트 세트는 변형을 옮겨도 프레임이 자동으로 커지지 않는다.** 변형 위치를 바꿨으면
  `set.resizeWithoutConstraints(w, h)` 로 직접 맞춰야 한다. 안 그러면 변형이 세트 밖으로
  삐져나가고 `snap()`/내보내기에서 잘린다.
- `insertChild` 로 바꾸는 것은 **논리적 순서**(프로퍼티 드롭다운)뿐이다. 캔버스상 배치까지
  바꾸려면 각 변형의 `x`/`y` 를 따로 지정해야 한다.

`figma.notify()` 는 쓰지 않는다. `console.log()` 는 반환되지 않는다 — `return` 을 쓴다.

---

## 문제 해결

| 증상 | 원인 / 조치 |
|---|---|
| `Invalid value for allowedDomains` | Figma는 `networkAccess`에 **IP 표기를 거부한다.** `http://127.0.0.1:3055` 같은 항목을 넣지 말 것. `http://localhost:3055` 만 쓴다 |
| `플러그인이 연결돼 있지 않다` | Figma 데스크톱에서 Agent Bridge 플러그인을 실행할 것 |
| 플러그인 창이 빨간 점 | 브리지 서버 없음. 에이전트 세션 재시작 또는 `node bridge/server.mjs` |
| `이 샌드박스는 동적 코드 실행을 허용하지 않는다` | Figma 플러그인 샌드박스가 `eval`·`new Function` 을 모두 막은 경우. 이 경로는 아직 실측되지 않았다 |
| 포트 충돌 | 자동 처리된다. 바꾸려면 `FIGMA_BRIDGE_PORT` 환경변수 |
| 작업이 오래 걸려 타임아웃 | 기본 180초. `FIGMA_BRIDGE_TIMEOUT` (ms) 로 조정 |

브리지를 거치지 않는 읽기(파일 구조·PNG 내보내기)는 REST API라 언제든 쓸 수 있다.
```bash
node scripts/export-frames.mjs --list
```
