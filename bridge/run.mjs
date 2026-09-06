#!/usr/bin/env node
/**
 * 실행 중인 Agent Bridge 에 스크립트를 던진다. MCP 없이도 쓸 수 있는 CLI.
 *
 *   node bridge/run.mjs script.js            파일을 실행
 *   echo 'return 1+1' | node bridge/run.mjs  표준입력으로 실행
 *   node bridge/run.mjs -e 'return figma.root.name'
 *
 * 스크린샷(snap)은 exports/_bridge/ 에 PNG 로 저장된다.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = `http://localhost:${process.env.FIGMA_BRIDGE_PORT || 3055}`;

const argv = process.argv.slice(2);
let code = '';

if (argv[0] === '-e') {
  code = argv.slice(1).join(' ');
} else if (argv[0]) {
  code = await readFile(path.resolve(argv[0]), 'utf8');
} else {
  code = await new Promise((resolve) => {
    let s = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { s += c; });
    process.stdin.on('end', () => resolve(s));
  });
}

if (!code.trim()) {
  console.error('실행할 코드가 없다. 사용법: node bridge/run.mjs <file> | -e <code> | (stdin)');
  process.exit(1);
}

// 브리지 · 플러그인 상태 먼저 확인
try {
  const h = await (await fetch(`${BASE}/agent/health`)).json();
  if (!h.pluginConnected) {
    console.error('✖ Figma 플러그인이 연결돼 있지 않다.');
    console.error('  Figma 데스크톱 → Plugins → Development → Agent Bridge 를 실행할 것.');
    process.exit(1);
  }
} catch {
  console.error(`✖ 브리지 서버(${BASE})가 응답하지 않는다. \`node bridge/server.mjs\` 를 실행할 것.`);
  process.exit(1);
}

const out = await (await fetch(`${BASE}/agent/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code }),
})).json();

if (out.images?.length) {
  const dir = path.join(ROOT, 'exports', '_bridge');
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < out.images.length; i++) {
    const img = out.images[i];
    const safe = img.name.replace(/[^\w가-힣.\-() ]+/g, '_').slice(0, 60);
    const dest = path.join(dir, `${String(i + 1).padStart(2, '0')}_${safe}.png`);
    await writeFile(dest, Buffer.from(img.b64, 'base64'));
    console.error(`  [png] ${path.relative(ROOT, dest)}`);
  }
}

if (out.ok) {
  console.log(out.result ?? '(no return value)');
} else {
  console.error(`✖ ${out.error}`);
  if (out.stack) console.error(out.stack);
  process.exit(1);
}
