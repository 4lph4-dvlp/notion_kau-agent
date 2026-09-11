#!/usr/bin/env node
/**
 * Notion MCP 서버 런처. (의존성 없음 · Node 18+)
 *
 * 공식 로컬 서버 `@notionhq/notion-mcp-server` 를 stdio 로 띄우되,
 * 토큰은 이 저장소의 `.env`(NOTION_TOKEN)에서 읽는다.
 *
 * 이렇게 하는 이유: 에이전트가 셋(Claude Code · Codex · Antigravity)이라
 * 각 클라이언트 설정 파일에 토큰을 세 번 복사해두면 갱신할 때 반드시 어긋난다.
 * 세 클라이언트 모두 이 파일 하나를 실행하게 하고, 토큰은 `.env` 한 곳에만 둔다.
 * 브리지(`bridge/server.mjs`)를 등록하는 방식과 같은 모양이다.
 *
 *   node scripts/notion-mcp.mjs            MCP 서버 (stdio). 클라이언트가 실행한다
 *   node scripts/notion-mcp.mjs --check    토큰이 살아있는지 확인하고 종료 (사람용)
 *
 * 환경 변수
 *   NOTION_TOKEN         내부 통합 시크릿 (ntn_...). 필수
 *   NOTION_MCP_PACKAGE   띄울 npm 패키지 스펙.
 *                        기본 @notionhq/notion-mcp-server@2.5.1 (버전 고정)
 *
 * stdio 가 MCP 프로토콜 채널이다. **stdout 에 아무것도 쓰지 않는다.**
 * 진단 메시지는 전부 stderr 로 보낸다.
 */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = (msg) => process.stderr.write(`${msg}\n`);

// ---------- .env ----------
async function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!existsSync(file)) return;
  const text = await readFile(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// 진행 중인 비동기 작업이 있을 때 process.exit() 를 부르면 Windows 의 libuv 가
// 핸들 정리 중에 assert 로 죽는다(exit 127). 종료 코드만 세우고 자연스럽게 빠져나간다.
function fail(msg) {
  log(`\n✖ ${msg}\n`);
  process.exitCode = 1;
  return false;
}

// 비동기 작업이 없는 시점에서만 쓴다.
function fatal(msg) {
  log(`
✖ ${msg}
`);
  process.exit(1);
}

// ---------- 토큰 확인 ----------
async function check(token) {
  let res;
  try {
    res = await fetch('https://api.notion.com/v1/users/me', {
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
    });
  } catch (err) {
    return fail(`Notion API 에 닿지 못했다: ${err.message}`);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return fail(
      `Notion 토큰이 거부됐다 (${res.status} ${body.code ?? ''}).\n` +
        `  https://www.notion.so/profile/integrations 에서 시크릿을 다시 확인한다.`,
    );
  }

  log(`✓ 통합: ${body.name ?? '(이름 없음)'}  id=${body.id}`);
  log(`  설정: https://www.notion.so/profile/integrations/internal/${body.id}`);
  log(
    `\n페이지가 안 보이면 토큰 문제가 아니라 **접근 권한** 문제다.\n` +
      `  Notion 에서 상위 페이지 → ⋯ → 연결(Connections) → 이 통합을 추가한다.\n` +
      `  내부 통합은 명시적으로 공유한 페이지만 볼 수 있다.`,
  );
  return true;
}

// ---------- main ----------
await loadEnv();

const token = process.env.NOTION_TOKEN;
if (!token) {
  fail(
    `NOTION_TOKEN 이 없다.\n` +
      `  1. https://www.notion.so/profile/integrations 에서 내부 통합을 만든다\n` +
      `  2. 시크릿(ntn_...)을 복사한다\n` +
      `  3. ${path.join(ROOT, '.env')} 에 NOTION_TOKEN=ntn_... 로 적는다\n` +
      `  4. 기획 문서를 둘 상위 페이지에서 ⋯ → 연결 → 그 통합을 추가한다`,
  );
} else {
  if (!/^(ntn_|secret_)/.test(token)) {
    log(`⚠ NOTION_TOKEN 이 ntn_ / secret_ 으로 시작하지 않는다. 시크릿이 맞는지 확인할 것.`);
  }

  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    await check(token);
  } else {
    // 버전을 고정한다. npx 는 캐시에 있는 옛 버전을 그냥 쓰는 경우가 있는데,
    // 2.4 미만에는 기획 문서를 다루는 데 쓰는 API-retrieve-page-markdown /
    // API-update-page-markdown 이 없다. 올릴 때는 .env 의 NOTION_MCP_PACKAGE 로 덮어쓴다.
    const pkg = process.env.NOTION_MCP_PACKAGE || '@notionhq/notion-mcp-server@2.5.1';

    // Windows 는 shell 을 거쳐야 한다. Node 는 CVE-2024-27980 대응으로 .cmd/.bat 를 직접
    // spawn 하는 것을 막았고(EINVAL), Windows 의 npx 는 npx.cmd 다.
    // shell 을 쓰는 만큼 패키지 스펙에 셸 메타문자가 없는지 먼저 본다.
    const isWin = process.platform === 'win32';
    if (!/^[@A-Za-z0-9._/-]+$/.test(pkg)) {
      fatal(`NOTION_MCP_PACKAGE 에 쓸 수 없는 문자가 있다: ${pkg}`);
    }

    // shell:true 에 args 배열을 같이 주면 Node 가 DEP0190 경고를 낸다.
    // Windows 에서는 명령을 문자열 하나로 만들어 넘긴다(pkg 는 위에서 검증했다).
    const opts = { stdio: 'inherit', env: { ...process.env, NOTION_TOKEN: token } };
    const child = isWin
      ? spawn(['npx', '-y', pkg, ...args].join(' '), { ...opts, shell: true })
      : spawn('npx', ['-y', pkg, ...args], opts);

    child.on('error', (err) =>
      fail(`npx 를 실행하지 못했다: ${err.message}
  Node/npm 이 PATH 에 있는지 확인한다.`),
    );
    child.on('exit', (code, signal) => {
      process.exitCode = signal ? 1 : (code ?? 0);
    });

    for (const sig of ['SIGINT', 'SIGTERM']) {
      process.on(sig, () => child.kill(sig));
    }
  }
}
