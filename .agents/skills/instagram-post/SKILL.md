---
name: instagram-post
description: Notion 기획 문서를 읽어 인스타그램 카드뉴스·포스트·스토리를 만든다. 확정 카피를 저장소에 내려받아 승인받고, Figma 02_Workspace에 컴포넌트 인스턴스로 조립한 뒤 PNG로 내보낸다.
---

# instagram-post

이 스킬의 실제 절차는 프로젝트 정본 파일 하나에만 있다. 중복을 만들지 않기 위해
여기서는 위치만 가리킨다.

1. **지금** `.claude/skills/instagram-post/SKILL.md` 를 읽는다. 그 파일의 절차를 그대로 따른다.
2. 시작 전 `AGENTS.md` (공용 절대 규칙) 를 먼저 읽는다.
3. 입력은 Notion «콘텐츠 기획» 문서다. 규격은 `design/content-plan.md`.
   기획이 안 돼 있으면 `/content-plan` 을 먼저 돌린다.
4. Figma 쓰기는 `figma-bridge` MCP 의 `figma_status` / `figma_run` 을 쓴다.
   공식 원격 MCP(`mcp.figma.com`)는 호출 한도가 소진돼 사용 금지다.
