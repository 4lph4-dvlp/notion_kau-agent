---
name: instagram-post
description: Notion 기획 문서를 읽어 인스타그램 카드뉴스·포스트·스토리를 만든다. 확정 카피를 저장소에 내려받아 승인받고, Figma 02_Workspace에 컴포넌트 인스턴스로 조립한 뒤 PNG로 내보낸다.
---

# 게시물 제작 (02_Workspace)

인자로 slug를 받는다. 예: `/instagram-post notion-db-tips`
slug가 없으면 Notion DB에서 `기획완료` 이상인 행 목록을 보여주고 선택을 요청한다.

**입력은 Notion 기획 문서다.** 기획·조사는 `/content-plan`이 이미 끝냈다고 전제한다.

## 시작 전 반드시 읽는다
1. `AGENTS.md`
2. `design/content-plan.md` — 기획 문서 규격과 **파싱 계약**
3. `design/formats.md` — 포맷 규격 · 카테고리별 강조색 · 카피 톤
4. `design/brand.md` — Notion 보이스와 색 사용 규칙
5. `design/figma-file.json` — 쓸 수 있는 컴포넌트와 프로퍼티
6. `content/notion.json` — DB 연결 정보

---

## 1단계 — 기획 문서 읽기 (Figma 접근 전)

Notion DB에서 `slug`로 행을 찾아 페이지 본문을 가져온다.
본문은 **마크다운으로 읽는다**:
- 원격 서버: `notion-fetch` (페이지 ID/URL로 본문 마크다운 조회), 행 검색은 `notion-query-data-sources` (`mode: "rows"`)
- 로컬 서버 fallback: `API-retrieve-page-markdown`, 행 검색은 `API-query-data-source`
시작 전 실제 노출된 도구 이름을 확인한다(`AGENTS.md` 5항).

**시작 조건을 확인한다:**
- `상태`가 `기획완료` 이상인가 → 아니면 **거부하고** `/content-plan <slug>`를 먼저 하도록 안내한다
- `## 3. 카드 구성`의 카드 수가 DB 속성 `카드 수`와 일치하는가
- 필요한 컴포넌트가 `design/figma-file.json`에 전부 있는가

Notion에 접근할 수 없는데 `content/posts/<slug>.md`가 이미 있으면, 그 스냅샷으로 진행할 수
있다. 이때는 **Notion 역기록을 못 한다는 사실을 먼저 보고**하고 사용자 확인을 받는다.

### 확정 카피 내려받기

읽은 내용을 `content/posts/<slug>.md`로 쓴다. 이것이 git에 남는 스냅샷이다.
**여기서 카피를 새로 지어내지 않는다.** 기획 문서를 그대로 옮기고, 옮기면서 규격을 검증한다.

```markdown
---
slug: notion-db-tips
format: cardnews
accent: red          # design/formats.md 의 카테고리별 강조색에서 1개
theme: light         # light | dark, 전 카드 통일
date: 2026-09-06
status: draft
notion: https://www.notion.so/…       # 기획 문서 링크
---

## 카드

### 01 — CN/Cover
title: 노션 DB, 이것부터 틀렸습니다
subtitle: 초보가 가장 많이 하는 실수 5가지
showBadge: true
badge: 노션 입문
showImage: false
이미지: —

### 02 — CN/Body
title: 페이지마다 새 DB를 만든다
body: 데이터베이스는 하나면 충분합니다. ...
showImage: true
showCallout: false
이미지: 과제가 흩어진 DB 화면 — content/images/notion-db-tips/02-scattered.png

## 캡션

(인스타그램 캡션 본문)

#노션 #노션템플릿 #대학생

## figma-nodes

(디자인 생성 후 자동으로 채워진다)
```

**규격을 다시 검증한다** (`design/formats.md`):
- 표지 제목 20자 이내 · 본문 제목 15자 이내 · 본문 카드당 150자 이내
- `showImage: true`인 카드의 텍스트가 충분히 짧은가 (표지 2줄 · 본문 4줄 · 인용 3줄)
- 톤: 단정적이고 짧게. 낚시성 표현·과장·느낌표 남발 금지
- `accent` · `theme`가 전 카드에서 하나로 통일

규격 위반을 찾으면 **고치지 말고 보고한다.** 카피는 기획 문서가 정본이다. 여기서 고치면
Notion과 저장소가 갈라진다. 사용자 판단을 받아 Notion을 고치고 다시 내려받는다.

→ 여기서 **멈추고 사용자에게 카피 승인을 받는다.** 승인 없이 Figma에 쓰지 않는다.
승인되면 Notion의 `상태`를 `디자인중`으로 올린다.

---

## 2단계 — Figma 조립

1. `02_Workspace` 페이지로 이동한다. (Assets 페이지에 쓰지 않도록 페이지 ID를 확인)
2. 기존 섹션 목록을 확인하고, 섹션 `YYYY-MM-DD_<slug>`를 만들어 그 안에서만 작업한다.
3. **카드 1장씩** 진행한다:
   - `design/figma-file.json`의 컴포넌트 인스턴스를 생성
   - 프레임 이름을 `YYYY-MM-DD_<slug>_NN`으로 지정
   - **영문 소문자 키를 그대로 프로퍼티에 넣는다** (`title` `body` `showImage` …)
   - 중첩 인스턴스를 채운다: `badge` → `UI/Badge.text`, `callout.*` → `UI/Callout`
   - 기획 문서에 없는 값을 여기서 정한다:
     `theme` = 프론트매터 `theme`, 뱃지·콜아웃 `color` = `accent`,
     `UI/ProgressDots`의 `current`/`total` = 카드 번호 / 총 장수
   - 스크린샷으로 확인 → 다음 장
4. 전체를 가로로 나란히 배치해 한눈에 흐름을 볼 수 있게 한다.

**이미지 슬롯**: `content/images/<slug>/`에 파일이 있으면 슬롯에 채운다. 없으면 회색
플레이스홀더로 두고 **어느 카드가 비었는지 3단계 보고에 적는다.** 임의의 다른 이미지로 채우지 않는다.

**새 도형을 그리지 않는다.** 필요한 컴포넌트가 없으면 만들지 말고 보고한다.

---

## 3단계 — 검수

각 프레임에 대해 확인하고 결과를 표로 보고한다.

- [ ] 크기 정확 (카드뉴스/포스트 1080×1350, 스토리 1080×1920)
- [ ] 텍스트 넘침 없음, 마지막 줄 잘림 없음
- [ ] 안전영역 침범 없음 (카드뉴스 상하 135 / 스토리 상하 250)
- [ ] 어색한 한국어 줄바꿈 없음 (조사만 다음 줄로 넘어가는 등)
- [ ] 카드 순서와 번호가 일치, 진행표시 숫자가 맞음
- [ ] 마지막 카드에 행동 유도가 하나만 있음
- [ ] **강조색이 전 카드에서 하나로 통일**되어 있음
- [ ] `theme`이 전 카드에서 하나로 통일되어 있음 (light 또는 dark)
- [ ] **콘텐츠가 중앙 정사각형(y 135~1215) 안에 있고, 그 안에서 중앙에 자리잡았는가**
- [ ] `showImage`를 켠 카드는 텍스트가 잘리지 않았는가 (**켠 상태로 눈으로 확인**)
- [ ] 비어 있는 이미지 슬롯이 어디인가 (목록으로)

## 4단계 — 내보내기

`content/posts/<slug>.md`의 `## figma-nodes` 섹션에 노드 ID를 기록한다.

```
## figma-nodes
section = 12:340
01 = 12:345
02 = 12:346
```

그 다음 실행:
```bash
node scripts/export-frames.mjs --slug <slug>
```

결과를 `exports/<slug>/`에서 확인한다.
`content/posts/<slug>.md`의 `status`를 `approved`로 바꾼다.

## 5단계 — Notion 역기록

기획 문서로 돌아가 결과를 적는다. 이걸 빼먹으면 Notion만 보는 사람은 진행 상황을 모른다.

- DB 속성 `Figma 섹션` = `YYYY-MM-DD_<slug>`, `내보내기 경로` = `exports/<slug>/`,
  `상태`를 `발행준비`로 (`notion-update-page` 또는 로컬 `API-patch-page`). `발행됨`은 **사람만** 올린다
- 본문 `## 6. 디자인 결과`에 Figma 섹션 이름 · 노드 ID 목록 · 내보낸 파일 목록

본문을 고칠 때는 **`## 6. 디자인 결과` 섹션만** 바꾼다. 다른 섹션을 덮어쓰지 않도록
먼저 읽고(`notion-fetch` 또는 `API-retrieve-page-markdown`) 해당 섹션만 치환한 본문을 쓰거나(`notion-update-page`),
합친 결과를 쓴다. 사람이 그 사이 고쳐둔 내용을 날리지 않는다.

최종 보고: 파일 목록 · 캡션 · Notion 페이지 링크 · 사람이 확인해야 할 항목.

---

## 하지 않는 것

- `기획완료` 미만인 기획 문서로 시작하기
- 카피 승인 전에 Figma에 쓰기
- 규격 위반을 저장소에서 몰래 고치기 (기획 문서가 정본이다)
- `01_Assets`의 마스터 컴포넌트 수정
- 여러 게시물을 동시에 캔버스에 생성
- 빈 이미지 슬롯을 임의의 이미지로 채우기
- 노드 삭제 (승인 후에만)
