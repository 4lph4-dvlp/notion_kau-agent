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
| `content/briefs/` | 입력: 게시물 소재 |
| `content/posts/` | 출력: 확정 카피 + 노드 ID |
| `scripts/export-frames.mjs` | REST API로 프레임 PNG 내보내기 |

## 스킬

- `/figma-assets` — `01_Assets` 페이지에 디자인 시스템 구축·수정
- `/instagram-post` — 브리프로부터 `02_Workspace`에 게시물 제작 후 내보내기

## 주의

- Figma **무료(Starter)** 플랜이다. 팀 라이브러리 게시가 불가하므로 Assets와 Workspace는
  **반드시 같은 파일의 서로 다른 페이지**여야 한다. 파일을 분리하자는 제안은 하지 말 것.
- 변수 모드(mode)는 컬렉션당 1개만 쓸 수 있다. 다크모드 등 멀티모드 설계를 하지 않는다.
- 디자인은 **Notion 브랜드 언어**를 따른다. 색·서체를 임의로 추가하지 말고
  `design/brand.md`의 규칙 안에서 해결한다.
- 폰트는 **Noto Serif KR**(Display·Quote 전용) + **Noto Sans KR**(나머지) 두 가지뿐이다.
  Pretendard를 설치하면 본문용으로 교체할 수 있다. 그 외 폰트를 임의로 고르지 않는다.
- `01_Assets`는 **이미 구축돼 있다.** 다시 만들지 말고 `design/figma-file.json`의 노드 ID를 쓴다.
