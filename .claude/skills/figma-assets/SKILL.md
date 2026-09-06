---
name: figma-assets
description: Figma의 01_Assets 페이지에 인스타그램용 디자인 시스템(변수·텍스트 스타일·카드 컴포넌트)을 만들거나 수정한다. 디자인 에셋 제작·정비를 요청받았을 때 사용.
---

# 디자인 에셋 구축 (01_Assets)

## 시작 전 반드시 읽는다
1. `AGENTS.md` — 절대 규칙
2. `design/brand.md` — **Notion 브랜드 기준.** 왜 이 색·이 서체인지의 근거
3. `design/tokens.json` — 값의 원본
4. `design/design-system.md` — 만들 대상 명세와 순서
5. `design/figma-file.json` — 이미 만들어진 것이 무엇인지

## 절차

### 0. 폰트 확인 (먼저 한다)
Figma에서 **Pretendard** 사용 가능 여부를 확인한다.
- 있으면 `figma-file.json`의 `fonts.sansInstalled`를 `true`로 기록하고 진행한다.
- 없으면 `false`로 기록하고 **Noto Sans KR**로 만든 뒤, 작업 종료 시
  "Pretendard 설치하면 다시 만들 수 있다"고 보고한다. 다른 폰트를 임의로 고르지 않는다.
- 명조는 **Noto Serif KR** 을 쓴다. Display·Quote 전용이다.

### 1. 연결 확인
Figma MCP로 대상 파일을 연다. `design/figma-file.json`의 `fileKey`가 비어 있으면
사용자에게 파일 URL을 요청하고, 받은 뒤 `fileKey`/`fileUrl`/페이지 ID를 채운다.

### 2. 페이지 확인
`01_Assets`, `02_Workspace` 페이지가 없으면 만든다.

### 3. 기존 상태 조회
중복 생성 금지. 기존 변수·스타일·컴포넌트를 먼저 읽는다.

### 4. STEP 순서대로 생성
`design/design-system.md`의 순서를 지킨다:
변수 → 텍스트 스타일 → 페인트 스타일 → UI 부품 → 카드 컴포넌트.
각 STEP이 끝날 때마다 결과를 확인하고 다음으로 넘어간다. 한 번에 전부 밀어넣지 않는다.

### 5. 컴포넌트마다 검증
컴포넌트 1개를 만들 때마다 스크린샷으로 확인한다.
- 프레임 크기가 정확한가
- 오토레이아웃이 의도대로 늘어나는가
- 한국어 긴 문장에서 깨지지 않는가
- **노션 톤인가** — 그림자·그라디언트·굵은 테두리가 없는가, 여백이 충분한가

### 6. 레지스트리 갱신
만든 노드의 이름·ID·키를 `design/figma-file.json`에 기록하고 `lastUpdated`를 오늘 날짜로 쓴다.

### 7. 검수
`design/design-system.md` 하단 체크리스트를 실행하고 결과를 표로 보고한다.

## 하지 않는 것

- **토큰에 없는 색을 쓰기.** Notion 공식 팔레트 밖의 색은 만들지 않는다.
  필요하면 먼저 `tokens.json` 추가를 제안한다.
- **Noto Serif KR / Noto Sans KR / Pretendard 외의 폰트 사용**
- `Body` 행간 1.5를 좁혀서 레이아웃 문제를 해결하기 → 대신 글자 수를 줄인다
- 그림자·그라디언트·굵은 테두리 추가 (노션 톤 위반)
- 기존 마스터 컴포넌트를 사용자 승인 없이 수정·삭제하기
- `02_Workspace` 페이지 건드리기
- 변수 모드를 2개 이상 만들기 (무료 플랜에서 불가)
- **Notion 로고를 그리거나 재현하기** (`design/brand.md` 4항)

## 보고 형식

```
폰트
  Pretendard  미설치 → Noto Sans KR 로 생성함
  Noto Serif KR   사용 가능 (명조)

만든 것
  변수      Core · 중립 8 / accent 9 / accentBg 9 / accentBgDark 9 / 간격 8 / 반경 5
  텍스트    Display(명조) Quote(명조) Title Subtitle Body Caption Label
  컴포넌트  CN/Cover (12:345), CN/Body (12:401) ...

검수
  [x] 프레임 1080×1350
  [x] 하드코딩된 hex 없음
  [ ] CN/Body 본문 8줄 초과 시 프레임이 늘어남 → 수정 필요

확인 요청
  - UI/Logo 의 계정명·핸들을 알려달라. 현재 placeholder 상태다.
```
