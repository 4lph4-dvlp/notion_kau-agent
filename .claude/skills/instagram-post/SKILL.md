---
name: instagram-post
description: 브리프를 받아 인스타그램 카드뉴스·포스트·스토리를 만든다. 카피를 확정하고 Figma 02_Workspace에 컴포넌트 인스턴스로 조립한 뒤 PNG로 내보낸다.
---

# 게시물 제작 (02_Workspace)

인자로 slug를 받는다. 예: `/instagram-post notion-db-tips`
slug가 없으면 `content/briefs/` 의 목록을 보여주고 선택을 요청한다.

## 시작 전 반드시 읽는다
1. `AGENTS.md`
2. `content/briefs/<slug>.md` — 소재
3. `design/formats.md` — 포맷 규격 · 카테고리별 강조색 · 카피 톤
4. `design/brand.md` — Notion 보이스와 색 사용 규칙
5. `design/figma-file.json` — 쓸 수 있는 컴포넌트와 프로퍼티

---

## 1단계 — 카피 확정 (Figma 접근 전)

브리프를 읽고 카드별 카피를 작성해 `content/posts/<slug>.md`에 쓴다.

```markdown
---
slug: notion-db-tips
format: cardnews
accent: red          # design/formats.md 의 카테고리별 강조색에서 1개
date: 2026-09-06
status: draft
---

## 카드

### 01 — CN/Cover
badge: 노션 입문
title: 노션 DB, 이것부터 틀렸습니다
subtitle: 초보가 가장 많이 하는 실수 5가지

### 02 — CN/Body
title: 페이지마다 새 DB를 만든다
body: 데이터베이스는 하나면 충분합니다. ...

## 캡션

(인스타그램 캡션 본문)

#노션 #노션템플릿 #대학생

## figma-nodes

(디자인 생성 후 자동으로 채워진다)
```

**규격 준수를 검증한다** (`design/formats.md`):
- 표지 제목 20자 이내 · 본문 제목 15자 이내 · 본문 카드당 150자 이내
- 톤: 단정적이고 짧게. 낚시성 표현·과장·느낌표 남발 금지. 기능이 아니라 결과를 말한다.
- `accent` 색을 주제에 맞게 하나 고르고, 전 카드에 그 색만 쓴다.

→ 여기서 **멈추고 사용자에게 카피 승인을 받는다.** 승인 없이 Figma에 쓰지 않는다.

---

## 2단계 — Figma 조립

1. `02_Workspace` 페이지로 이동한다. (Assets 페이지에 쓰지 않도록 페이지 ID를 확인)
2. 섹션 `YYYY-MM-DD_<slug>`를 만들고 그 안에 작업한다.
3. **카드 1장씩** 진행한다:
   - `design/figma-file.json`의 컴포넌트 인스턴스를 생성
   - 프레임 이름을 `YYYY-MM-DD_<slug>_NN`으로 지정
   - 텍스트 프로퍼티를 승인된 카피로 채움
   - 스크린샷으로 확인 → 다음 장
4. 전체를 가로로 나란히 배치해 한눈에 흐름을 볼 수 있게 한다.

**새 도형을 그리지 않는다.** 필요한 컴포넌트가 없으면 만들지 말고 보고한다.

---

## 3단계 — 검수

각 프레임에 대해 확인하고 결과를 표로 보고한다.

- [ ] 크기 정확 (카드뉴스/포스트 1080×1350, 스토리 1080×1920)
- [ ] 텍스트 넘침 없음, 마지막 줄 잘림 없음
- [ ] 안전영역 침범 없음 (카드뉴스 하단 120 / 스토리 상하 250)
- [ ] 어색한 한국어 줄바꿈 없음 (조사만 다음 줄로 넘어가는 등)
- [ ] 카드 순서와 번호가 일치
- [ ] 마지막 카드에 행동 유도가 하나만 있음
- [ ] **강조색이 전 카드에서 하나로 통일**되어 있음
- [ ] `theme`이 전 카드에서 하나로 통일되어 있음 (light 또는 dark)
- [ ] **콘텐츠가 중앙 정사각형(y 135~1215) 안에 있고, 그 안에서 중앙에 자리잡았는가**
- [ ] `showImage`를 켠 카드는 텍스트가 잘리지 않았는가 (**켠 상태로 눈으로 확인**)

## 4단계 — 내보내기

`content/posts/<slug>.md`의 `## figma-nodes` 섹션에 노드 ID를 기록한다.

```
## figma-nodes
01 = 12:345
02 = 12:346
```

그 다음 실행:
```bash
node scripts/export-frames.mjs --slug <slug>
```

결과를 `exports/<slug>/`에서 확인하고, 파일 목록과 캡션을 최종 보고한다.
`content/posts/<slug>.md`의 `status`를 `approved`로 바꾼다.

---

## 하지 않는 것

- 카피 승인 전에 Figma에 쓰기
- `01_Assets`의 마스터 컴포넌트 수정
- 여러 게시물을 동시에 캔버스에 생성
- 노드 삭제 (승인 후에만)
