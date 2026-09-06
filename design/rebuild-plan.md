# 중앙 정사각형 + 흑백 테마

> **상태: 완료 (2026-09-07).** 로컬 브리지(`bridge/`)로 작업했다.
> 검수 이슈 0건 — 크기·중앙 정사각형·하드코딩 fill·그림자 전부 통과.
> 이 문서는 **왜 이렇게 됐는지의 근거**로 남긴다. 실제 노드 ID는 `design/figma-file.json`.

---

## 왜 바꾸는가

### 1. 중앙 정사각형 (center square)

1080×1350 게시물이 프로필 그리드에서 크롭될 때:

| 크롭 | 잘리는 곳 | 남는 안전영역 |
|---|---|---|
| 1:1 정사각 (캐러셀 커버) | **위아래 각 135px** | 1080 × 1080 |
| 3:4 그리드 | 좌우 각 34px | 1012 × 1350 |

기존 여백(상 80 / 하 120)은 **1:1 크롭 영역 안에 있어서 배지와 하단 로고가 잘린다.**
좌우 80은 3:4 기준(34) 대비 여유가 있어 문제없다.

→ **세로 여백을 135(`spacing/squareInset`)로 올려 콘텐츠를 중앙 정사각형 안에 가둔다.**
스토리(1080×1920)는 그리드 크롭 대상이 아니므로 기존 상하 250을 유지한다.

**출처:** [Instagram grid size guide 2026](https://www.oktopost.com/blog/instagram-grid-size-guide/) ·
[Instagram safe zone sizes 2026](https://campaignswift.com/blog/instagram-safe-zone-sizes)

### 2. 흑백 테마

모든 카드에 `theme` = `light`(흰 배경) | `dark`(#191919 배경) 변형을 만든다.
`theme`는 **배경색**을 가리킨다. 모든 컴포넌트에서 이 의미로 통일한다.

무료 플랜은 변수 모드가 1개뿐이라 변수 모드로 다크모드를 만들 수 없다. **변형(variant)으로 처리한다.**

---

## 결과

**최상위 컴포넌트 12개가 전부 변형 세트가 됐다.** `theme` 축이 필요한 11개는 모두 갖췄다.

| 컴포넌트 | 변형 |
|---|---|
| `CN/Cover` `CN/Body` `CN/Quote` `CN/CTA` `PT/Single` | `theme=light \| dark` · 1080×1350 · 여백 135 |
| `ST/Base` | `theme=light \| dark` · 1080×1920 · 여백 250 (정사각형 규칙 미적용) |
| `UI/Callout` | `color` 6 × `theme` 2 = **12변형** |
| `UI/Logo` `UI/Tag` `UI/ProgressDots` `UI/Divider` | `theme=light \| dark` |
| `UI/Badge` | **`color` 6종만.** 밝은 알약이 양쪽 배경에서 모두 읽혀 테마 축이 불필요 |

추가된 토큰
- `spacing/squareInset` = 135 — 중앙 정사각형 여백
- `color/line/onInverse` = `#373737` + `Line/OnInverse` 스타일
  (노션 다크모드 구분선 = 흰색 13% over `#191919` 의 **계산값**. 공식 문서로 확인한 값이 아니다)

`UI/Logo` 의 `variant=dark|light` 는 "글자색"을 뜻해 다른 컴포넌트와 의미가 반대였다.
**`theme=light|dark`(배경색 기준)로 통일**했다.

### 검수 결과 (2026-09-07)

| 항목 | 결과 |
|---|---|
| 4:5 카드 10개 변형 전부 1080×1350 | ✅ |
| 콘텐츠가 중앙 정사각형(y 135~1215) 안에 있는가 | ✅ 위반 0건 |
| 하드코딩 fill | ✅ 0건 |
| 그림자·효과 | ✅ 0건 |
| `theme` 축 누락 | ✅ 없음 |

---

## 작업 방법 — 로컬 브리지

공식 MCP 대신 **`bridge/`** 의 로컬 플러그인 브리지를 쓴다. 호출 한도가 없다.
설치·사용법은 [`bridge/README.md`](../bridge/README.md).

1. Figma **데스크톱**에서 `Notion CL` 파일을 연다
2. `Plugins → Development → Agent Bridge` 실행 (초록 점 확인)
3. 에이전트에서 `figma_status` → `figma_run` 으로 작업

### 코드 이식 시 주의

브리지는 **표준 Plugin API 그대로**다. 이전에 쓰던 공식 MCP 확장은 없다.

| 이전 (`use_figma`) | 브리지 |
|---|---|
| `node.query('TEXT[name=title]').first()` | `node.findAll(n => n.type==='TEXT' && n.name==='title')[0]` |
| `figma.createAutoLayout('VERTICAL', {...})` | `AL('VERTICAL', {...})` |
| `await node.screenshot()` | `await snap(node)` |
| `node.set({...})` | 속성 개별 대입 |

`combineAsVariants` · `setBoundVariable` · `setFillStyleIdAsync` · `addComponentProperty` ·
`isExposedInstance` 는 전부 표준 API라 그대로 쓴다.

### 상태 확인은 REST 로

브리지·MCP 와 무관하게 언제든 쓸 수 있다.
```bash
node scripts/export-frames.mjs --list
```
