# 01_Assets 페이지 명세

> **상태: 구축 완료 (2026-09-07).** 변수 55 · 페인트 스타일 38 · 텍스트 스타일 7 · 컴포넌트 12(전부 변형 세트).
> 실제 노드 ID와 키는 `design/figma-file.json`에 있다.
> 이 문서는 **재구축·수정 시의 기준**이다. 아래 명세와 다른 것을 발견하면 명세를 고치지 말고 보고한다.

## 두 개의 공통 축

1. **`theme` = `light` | `dark`** — `theme`은 **배경색**을 가리킨다. `light`=흰 배경(어두운 글자).
   `UI/Badge`를 뺀 모든 컴포넌트가 이 축을 갖는다. 한 게시물 안에서는 하나로 통일한다.
2. **중앙 정사각형** — 4:5 카드의 세로 여백은 **135**(`spacing/squareInset`)다.
   1:1 크롭 시 위아래 135px이 잘리기 때문이다. 근거는 `design/rebuild-plan.md`.
   스토리는 그리드 크롭 대상이 아니라 상하 250을 쓴다.

   **안에 넣는 것으로 끝이 아니다.** 콘텐츠 덩어리는 정사각형 안에서 **세로 중앙**에 온다.
   구현은 `top`(또는 `content`) 프레임에 `layoutSizingVertical='FILL'` +
   `primaryAxisAlignItems='CENTER'` 를 주는 방식이다. 카드 루트는 `MIN` 정렬이고,
   푸터는 자연히 하단에 남는다. 루트를 `SPACE_BETWEEN` 으로 되돌리면
   가운데가 텅 비므로 바꾸지 말 것.

3. **이미지 슬롯** — 모든 카드에 `showImage`(BOOLEAN, 기본 꺼짐)가 있다.
   16:9 **920×518**, 반경 `radius/md`, 배경 `BG/Subtle`(light) / `AccentBgDark/Gray`(dark).
   위치는 `design/formats.md` 표를 따른다.

`design/brand.md`(왜 이 값인지) → `design/tokens.json`(값) 순서로 읽고,
아래 컴포넌트를 만든다. **만드는 순서를 반드시 지킬 것** — 뒤 단계가 앞 단계를 참조한다.

> 이 디자인 시스템은 **Notion 브랜드 언어**를 따른다.
> 흰 배경 + 따뜻한 먹색 텍스트 + 넓은 여백이 기본이고, 컬러는 뱃지·강조 한 군데에만 쓴다.
> 그림자·그라디언트·굵은 테두리는 쓰지 않는다.

---

## STEP 1. 변수 컬렉션 `Core`

`tokens.json`의 `color` / `spacing` / `radius`를 변수로 만든다.

- 그룹은 `/`로 계층화한다: `color/text/primary`, `color/accent/blue`, `spacing/md` …
- `color.accent`(9색) · `color.accentBg`(9색) · `color.accentBgDark`(9색)를 전부 만든다.
  카테고리별 색 고정에 쓰인다.
- 모드는 **1개(`Default`)만** 만든다. (무료 플랜 제약)
- 타입: 색은 COLOR, 간격·반경은 FLOAT.
- `_`로 시작하는 키(`_desc`, `_contrastRule` 등)는 주석이므로 변수로 만들지 않는다.

## STEP 2. 텍스트 스타일

`tokens.json`의 `typography.style` 7개를 그대로 텍스트 스타일로 만든다.
이름: `Display` · `Quote` · `Title` · `Subtitle` · `Body` · `Caption` · `Label`

- 각 스타일의 `family` 키를 `typography.family`에서 실제 폰트명으로 치환하고, 스타일명은
  **`figmaStyle` 필드를 그대로** 쓴다. 추측한 이름(`SemiBold` vs `Semi Bold`)을 쓰면 폰트
  로드가 실패한다.
  - `sans` → **Noto Sans KR**. 7개 스타일 전부 이 하나를 쓴다. Pretendard가 설치되면
    그쪽으로 교체한다.
- **세리프는 쓰지 않는다.** 위계는 서체가 아니라 웨이트와 크기로 만든다
  (`Display` Black 88 ↔ `Title` Bold 60).
- 폰트가 없다고 임의의 다른 폰트로 대체하지 않는다. Noto Sans KR 외의 선택지는 없다.
- 크기·굵기·행간·자간은 토큰 값을 그대로 적용한다. `Body`의 행간 1.5는 노션 본문 규격이므로
  레이아웃이 넘친다고 좁히지 않는다. 대신 **글자 수를 줄인다.**

## STEP 3. 페인트 스타일

색 변수를 참조하는 페인트 스타일을 만든다.

```
BG/Default    color/bg/default    #FFFFFF
BG/Subtle     color/bg/subtle     #F1F1EF
BG/Warm       color/bg/warm       #F7F6F3
BG/Inverse    color/bg/inverse    #191919
Text/Primary  color/text/primary  #373530
Text/Secondary color/text/secondary #787774
Line/Default  color/line/default  #E9E9E7
Accent/Blue … Accent/Red          color/accent/*      (9개)
AccentBg/Blue … AccentBg/Red      color/accentBg/*    (9개)
```

---

## STEP 4. UI 부품 컴포넌트

레이아웃은 전부 **오토레이아웃**으로 구성한다. 고정 좌표 배치 금지.

### `UI/Logo` — 종이비행기 심볼 + `@notion_kau`
- 구성: `symbol`(34×32) + `handle`(텍스트 `Label`). 간격 `spacing/xs`. 전체 206×32.
- **심볼은 벡터가 아니라 이미지다.** 원본 `notion_kau-logo 1`(`23:21`)은 투명 배경 PNG로,
  fill 색을 직접 바꿀 수 없다. 그래서 **알파 마스크**로 색을 입힌다:
  ```
  symbol (FRAME, clipsContent)
  ├─ mask (RECTANGLE, 이미지 fill, isMask=true, maskType='ALPHA')   ← 아래
  └─ ink  (RECTANGLE, 페인트 스타일)                                  ← 마스크 적용 대상
  ```
  Figma 마스크는 **자기보다 뒤에 오는 형제**에 적용되므로 순서를 바꾸면 안 된다.
- 색: `theme=light` → `Text/Secondary`, `theme=dark` → `Text/OnInverseMuted` (심볼·핸들 동일)
- 프로퍼티: `handle`(TEXT, 기본값 `@notion_kau`), `theme` = `light` | `dark`
- **Notion 로고를 새로 그리거나 재현하지 않는다**(`brand.md` 4항).

### `UI/Badge`
- 텍스트 `Label`, 배경 `AccentBg/<색>`, 글자색 `Accent/<색>`, 반경 `radius/pill`,
  패딩 `spacing/sm` × `spacing/xs`. **테두리 없음.**
- 노션의 인라인 태그(알약형 배경 + 같은 계열 진한 글자)를 그대로 옮긴 형태다.
- 프로퍼티: `text`(TEXT), `color` = `blue` | `purple` | `orange` | `red` | `green` | `gray`
- **`theme` 축이 없는 유일한 컴포넌트다.** 밝은 알약이 흰 배경·검은 배경 양쪽에서 다 읽힌다.

### `UI/Tag`
- 해시태그·카테고리 표기. 배경 없음, 텍스트 `Caption`.
- 색: `light` → `Text/Secondary`, `dark` → `Text/OnInverseMuted`
- 프로퍼티: `text`(TEXT), `theme`

### `UI/ProgressDots`
- 카드뉴스 진행 표시(예: `3 / 8`). 텍스트형(`Caption`)으로 단순하게.
- 프로퍼티: `current`(TEXT), `total`(TEXT), `theme`

### `UI/Callout`
- 노션의 콜아웃 블록. 배경 `AccentBg/<색>`, 반경 `radius/md`, 패딩 `spacing/md`,
  좌측 이모지 슬롯 + 본문(`Body`, `Text/Primary`). **테두리·그림자 없음.**
- 다크 테마는 배경 `AccentBgDark/<색>`, 글자 `Text/OnInverseMuted`.
- 프로퍼티: `emoji`(TEXT), `text`(TEXT), `color`(6), `theme`(2) → **12변형**

### `UI/Divider`
- 높이 1px, 가로 fill. 노션 구분선.
- 색: `light` → `Line/Default`, `dark` → `Line/OnInverse`
- 프로퍼티: `theme`

---

## STEP 5. 카드 컴포넌트

모두 **1080 × 1350** 프레임(스토리 제외). 안전영역은 `tokens.json.safeArea.cardnews`.
루트에 세로 오토레이아웃 + 패딩(**좌우 80, 상하 135**)을 적용한다.
상하 135는 중앙 정사각형 규칙이라 임의로 줄이지 않는다.

각 카드는 `theme=light|dark` 변형 세트다. 테마별 색 대응은 `design/rebuild-plan.md`의 표를 따른다.

### `CN/Cover` — 표지
- 배경 `BG/Inverse`(#191919), 제목 `text/onInverse`, 부제 `text/onInverseMuted`
- 구성: `top`(FILL + CENTER) → 하단 `footer`
  - `top`: `UI/Badge` → 제목(**`Display` = Black 88**, 최대 3줄) → 부제(`Subtitle`, 최대 2줄) → `[imageSlot]`
  - `footer`: `UI/Logo` + "넘겨보기 →" (정사각형 하단 1215에 고정)
- 프로퍼티: `title`, `subtitle`(TEXT), `showBadge`, `showImage`(BOOLEAN), `theme`
- `showImage` 를 켜면 부제 아래에 16:9 슬롯이 나온다. 이때 제목은 2줄까지가 안전하다.
- 반전 배경 위 뱃지는 `accentBgDark`를 배경으로, `accent` 색을 글자로 쓴다.

### `CN/Body` — 본문
- 배경 `BG/Default`(흰색). 노션 문서를 그대로 옮긴 인상이어야 한다.
- 구성: `header`(상단 고정) → `content`(FILL + CENTER) → `footer`(하단)
  - `header`: `UI/ProgressDots` 우측 정렬 (정사각형 상단 135)
  - `content`: `[imageSlot]` → 제목(`Title`, 최대 2줄) → 본문(`Body`, 최대 8줄) → `[UI/Callout]`
  - `footer`: `UI/Logo`
- 프로퍼티: `title`(TEXT), `body`(TEXT), `showImage`, `showCallout`(BOOLEAN), `theme`
  진행표시 숫자는 `UI/ProgressDots` 인스턴스가 노출돼 있어 거기서 직접 고친다.
- `showImage`가 true면 본문 위에 16:9 이미지 슬롯(반경 `radius/md`).
- `showCallout`이 true면 본문 아래에 `UI/Callout` 하나.

### `CN/Quote` — 인용/강조
- 배경 `BG/Warm`(#F7F6F3). 인용문(**`Quote` = Light 52**) + 출처(`Caption`, `Text/Secondary`).
- 좌측에 세로 라인(4px, `Line/Strong`)을 두는 노션 인용 블록 형태.
- 카드 루트가 CENTER 정렬이라 인용문이 정사각형 한가운데 온다. 로고 없음.
- `dark` 배경은 `BG/Inverse`(`BG/Warm` 의 다크 대응이 없다), 세로선은 `Text/OnInverse`.
- 프로퍼티: `quote`(TEXT), `source`(TEXT), `showImage`(BOOLEAN), `theme`
- `showImage` 를 켜면 인용문 **위**에 슬롯. 이때 인용문은 3줄까지가 안전하다.

### `CN/CTA` — 마지막 카드
- 메시지(`Title`) + 유도 문구(`Body`). `top` 이 FILL + CENTER, `footer` 에 `UI/Logo`.
- 프로퍼티: `headline`(TEXT), `sub`(TEXT), `showImage`(BOOLEAN), `theme`
- `showImage` 를 켜면 메시지 **위**에 슬롯.

### `PT/Single` — 단일 포스트
- 1080 × 1350. 배경 `BG/Default`.
- 구성: `top`(FILL + CENTER) → `footer`
  - `top`: `UI/Badge` → `[imageSlot]` → 제목(`Display`, 최대 3줄) → 본문(`Body`, 최대 6줄)
  - `footer`: `UI/Logo`
- 프로퍼티: `title`(TEXT), `body`(TEXT), `showImage`(BOOLEAN), `theme`
- `showImage` 를 켜면 제목 2줄 + 본문 2줄까지가 안전하다.

### `ST/Base` — 스토리
- **1080 × 1920**. 안전영역 `safeArea.story`(상하 250) 안에만 콘텐츠를 배치한다.
- `content`(FILL + CENTER) + `footer`(`UI/Logo`). 하단에 링크/설문 스티커 자리를 비워둔다.
- 본문은 `Subtitle`(40px)을 쓴다 — 스토리는 스크롤이 빨라 큰 글씨가 필수다.
- **그리드 크롭 대상이 아니라 중앙 정사각형 규칙을 적용하지 않는다.**
- 프로퍼티: `title`(TEXT), `body`(TEXT), `showImage`(BOOLEAN), `theme`

---

## 검수 체크리스트

컴포넌트를 만든 뒤 아래를 확인하고 결과를 표로 보고한다.

- [ ] 모든 프레임이 정확히 1080 × 1350 (스토리는 1080 × 1920)
- [ ] 색·간격이 변수를 참조하는가 (하드코딩된 hex가 없는가)
- [ ] 텍스트가 스타일을 참조하는가
- [ ] 7개 스타일이 전부 Noto Sans KR 인가 (세리프가 섞이지 않았는가)
- [ ] `Body` 행간이 1.5인가 (임의로 좁히지 않았는가)
- [ ] 그림자·그라디언트·불필요한 테두리가 없는가 (노션 톤 위반)
- [ ] 오토레이아웃에서 텍스트 최대 줄 수를 넘겼을 때 프레임이 커지지 않고 잘리는가
- [ ] 한국어 긴 문장(공백 없는 40자)을 넣어도 레이아웃이 깨지지 않는가
- [ ] 안전영역을 침범하는 요소가 없는가
- [ ] **콘텐츠가 중앙 정사각형(y 135~1215) 안에 있고, 그 안에서 중앙에 자리잡았는가**
- [ ] `showImage`를 켠 상태에서도 텍스트가 잘리지 않는가
- [ ] `theme=dark` 에서 중첩 인스턴스(로고·진행표시·콜아웃)가 밝은 쪽으로 바뀌는가
