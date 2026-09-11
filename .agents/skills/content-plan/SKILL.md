---
name: content-plan
description: 주제를 받아 조사하고, Notion «콘텐츠 기획» DB에 구조화된 기획 문서를 만든다. 카드별 카피·이미지 계획까지 확정해 이후 /instagram-post 가 그대로 읽어 디자인할 수 있게 한다.
---

# content-plan

이 스킬의 실제 절차는 프로젝트 정본 파일 하나에만 있다. 중복을 만들지 않기 위해
여기서는 위치만 가리킨다.

1. **지금** `.claude/skills/content-plan/SKILL.md` 를 읽는다. 그 파일의 절차를 그대로 따른다.
2. 시작 전 `AGENTS.md` (공용 절대 규칙) 와 `design/content-plan.md` (기획 문서 규격) 를 읽는다.
3. Notion 쓰기는 `notion` MCP 서버(`scripts/notion-mcp.mjs`) 를 쓴다. 설치는 README 4.3.
   붙어 있지 않으면 사용자에게 설정을 요청하고 멈춘다. 로컬에 대신 만들지 않는다.
   **시작 전 실제로 노출된 도구 이름을 확인한다** — 로컬 서버와 호스팅 서버가 이름이 다르다.
4. 이 스킬은 **Figma를 열지 않는다.** 디자인은 `/instagram-post` 가 한다.
