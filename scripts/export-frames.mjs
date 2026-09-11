#!/usr/bin/env node
/**
 * Figma 프레임을 PNG로 내보낸다. (의존성 없음 · Node 18+)
 *
 *   node scripts/export-frames.mjs --list
 *       파일의 페이지와 최상위 프레임 이름/ID를 출력한다.
 *
 *   node scripts/export-frames.mjs --slug notion-db-tips
 *       content/posts/<slug>.md 의 "## figma-nodes" 섹션을 읽어
 *       exports/<slug>/ 에 내보낸다.
 *
 *   node scripts/export-frames.mjs --ids 12:345,12:346 --out exports/tmp
 *
 * 옵션: --scale 1 --format png|jpg|svg
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

// ---------- args ----------
function parseArgs(argv) {
  const out = { scale: '1', format: 'png' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') out.list = true;
    else if (a === '--slug') out.slug = argv[++i];
    else if (a === '--ids') out.ids = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--scale') out.scale = argv[++i];
    else if (a === '--format') out.format = argv[++i];
  }
  return out;
}

function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const normalizeId = (id) => id.trim().replace('-', ':');

const PORT = Number(process.env.FIGMA_BRIDGE_PORT || 3055);

// ---------- bridge helpers ----------
async function getBridgeHealth(port = PORT) {
  try {
    const res = await fetch(`http://localhost:${port}/agent/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function runViaBridge(code, port = PORT) {
  const res = await fetch(`http://localhost:${port}/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Bridge HTTP ${res.status}`);
  return await res.json();
}

async function listFileViaBridge(port = PORT) {
  console.log('[bridge] Figma 데스크톱 플러그인을 통해 파일 구조를 조회합니다...');
  const code = `
    await figma.loadAllPagesAsync();
    return {
      name: figma.root.name,
      pages: figma.root.children.map(p => ({
        name: p.name,
        id: p.id,
        children: (p.children || []).map(c => ({
          name: c.name,
          id: c.id,
          w: Math.round(c.width || 0),
          h: Math.round(c.height || 0)
        }))
      }))
    };
  `;
  const resp = await runViaBridge(code, port);
  if (!resp.ok) die(`브리지 파일 조회 실패: ${resp.error}`);
  const data = typeof resp.result === 'string' ? JSON.parse(resp.result) : resp.result;

  console.log(`\n파일: ${data.name}\n`);
  for (const page of data.pages ?? []) {
    console.log(`[페이지] ${page.name}  (${page.id})`);
    for (const child of page.children ?? []) {
      const size = child.w && child.h ? ` ${child.w}×${child.h}` : '';
      console.log(`   ${child.id.padEnd(12)} ${child.name}${size}`);
    }
    console.log('');
  }
}

async function exportNodesViaBridge(entries, outDir, { scale, format }, port = PORT) {
  console.log('[bridge] Figma 데스크톱 플러그인(Agent Bridge)으로 내보냅니다 (토큰 불필요)...');
  await mkdir(outDir, { recursive: true });

  const fmt = format.toUpperCase();
  const scaleNum = Number(scale) || 1;

  const code = `
    const entries = ${JSON.stringify(entries)};
    const results = [];
    for (const entry of entries) {
      const node = await figma.getNodeByIdAsync(entry.id);
      if (!node) {
        results.push({ name: entry.name, id: entry.id, error: '노드를 찾을 수 없음' });
        continue;
      }
      if (typeof node.exportAsync !== 'function') {
        results.push({ name: entry.name, id: entry.id, error: '내보낼 수 없는 노드 타입: ' + node.type });
        continue;
      }
      const bytes = await node.exportAsync({
        format: '${fmt}',
        constraint: { type: 'SCALE', value: ${scaleNum} }
      });
      results.push({
        name: entry.name,
        id: entry.id,
        b64: figma.base64Encode(bytes),
        w: Math.round(node.width),
        h: Math.round(node.height),
        byteLength: bytes.length
      });
    }
    return results;
  `;

  const resp = await runViaBridge(code, port);
  if (!resp.ok) die(`브리지 렌더 실패: ${resp.error}`);

  const results = typeof resp.result === 'string' ? JSON.parse(resp.result) : resp.result;
  let ok = 0;
  for (const r of results) {
    if (r.error) {
      console.warn(`  ! ${r.name} (${r.id}) — ${r.error}`);
      continue;
    }
    const buf = Buffer.from(r.b64, 'base64');
    const dest = path.join(outDir, `${r.name}.${format.toLowerCase()}`);
    await writeFile(dest, buf);
    console.log(`  ✓ ${path.relative(ROOT, dest)}  (${(buf.length / 1024).toFixed(0)} KB) [${r.w}×${r.h}]`);
    ok++;
  }
  console.log(`\n${ok}/${entries.length} 개 내보냄 → ${path.relative(ROOT, outDir)}\n`);
}

async function figma(url, token) {
  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    die(`Figma API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// ---------- --list ----------
async function listFile(fileKey, token) {
  const data = await figma(
    `https://api.figma.com/v1/files/${fileKey}?depth=2`,
    token
  );
  console.log(`\n파일: ${data.name}\n`);
  for (const page of data.document.children ?? []) {
    console.log(`[페이지] ${page.name}  (${page.id})`);
    for (const child of page.children ?? []) {
      const size = child.absoluteBoundingBox
        ? ` ${Math.round(child.absoluteBoundingBox.width)}×${Math.round(child.absoluteBoundingBox.height)}`
        : '';
      console.log(`   ${child.id.padEnd(12)} ${child.name}${size}`);
    }
    console.log('');
  }
}

// ---------- content/posts/<slug>.md ----------
async function readNodesFromPost(slug) {
  const file = path.join(ROOT, 'content', 'posts', `${slug}.md`);
  if (!existsSync(file)) die(`파일이 없다: ${path.relative(ROOT, file)}`);
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/);

  const start = lines.findIndex((l) => /^##\s*figma-nodes\s*$/i.test(l));
  if (start === -1) die(`"## figma-nodes" 섹션이 없다: ${path.relative(ROOT, file)}`);

  const entries = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    const m = lines[i].match(/^\s*([\w.-]+)\s*=\s*(\d+[:-]\d+)\s*$/);
    if (m) entries.push({ name: m[1], id: normalizeId(m[2]) });
  }
  if (!entries.length) die('figma-nodes 섹션에서 노드 ID를 찾지 못했다. (형식: 01 = 12:345)');
  return entries;
}

// ---------- export ----------
async function exportNodes(entries, outDir, { fileKey, token, scale, format }) {
  const ids = entries.map((e) => e.id).join(',');
  const url =
    `https://api.figma.com/v1/images/${fileKey}` +
    `?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`;

  const data = await figma(url, token);
  if (data.err) die(`이미지 렌더 실패: ${data.err}`);

  await mkdir(outDir, { recursive: true });

  let ok = 0;
  for (const entry of entries) {
    const imageUrl = data.images?.[entry.id];
    if (!imageUrl) {
      console.warn(`  ! ${entry.name} (${entry.id}) — 렌더 결과 없음. 노드 ID를 확인할 것`);
      continue;
    }
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.warn(`  ! ${entry.name} — 다운로드 실패 ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const dest = path.join(outDir, `${entry.name}.${format}`);
    await writeFile(dest, buf);
    console.log(`  ✓ ${path.relative(ROOT, dest)}  (${(buf.length / 1024).toFixed(0)} KB)`);
    ok++;
  }
  console.log(`\n${ok}/${entries.length} 개 내보냄 → ${path.relative(ROOT, outDir)}\n`);
}

// ---------- main ----------
await loadEnv();
const args = parseArgs(process.argv.slice(2));

const token = process.env.FIGMA_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY;

const health = await getBridgeHealth(PORT);
const useBridge = Boolean(health && health.pluginConnected);

if (!useBridge) {
  if (!token) {
    die(
      'Figma 데스크톱에서 Agent Bridge 플러그인이 실행되어 있지 않습니다.\n' +
      '  → Figma 데스크톱 앱에서 작업할 파일을 열고 Plugins → Development → Agent Bridge 를 실행할 것.'
    );
  }
  if (!fileKey) die('FIGMA_FILE_KEY 가 없다. 파일 URL 의 /design/<KEY>/ 부분이다.');
}

if (args.list) {
  if (useBridge) {
    await listFileViaBridge(PORT);
  } else {
    await listFile(fileKey, token);
  }
} else if (args.slug) {
  const entries = await readNodesFromPost(args.slug);
  const outDir = path.join(ROOT, 'exports', args.slug);
  if (useBridge) {
    await exportNodesViaBridge(entries, outDir, { scale: args.scale, format: args.format }, PORT);
  } else {
    await exportNodes(entries, outDir, { fileKey, token, scale: args.scale, format: args.format });
  }
} else if (args.ids) {
  const entries = args.ids.split(',').filter(Boolean).map((id, i) => ({
    name: String(i + 1).padStart(2, '0'),
    id: normalizeId(id),
  }));
  const outDir = path.resolve(ROOT, args.out ?? 'exports/tmp');
  if (useBridge) {
    await exportNodesViaBridge(entries, outDir, { scale: args.scale, format: args.format }, PORT);
  } else {
    await exportNodes(entries, outDir, { fileKey, token, scale: args.scale, format: args.format });
  }
} else {
  console.log(`
사용법
  node scripts/export-frames.mjs --list
  node scripts/export-frames.mjs --slug <slug> [--scale 1] [--format png]
  node scripts/export-frames.mjs --ids 12:345,12:346 --out exports/tmp

안내
  Figma 데스크톱에서 Agent Bridge 플러그인이 실행 중이면 토큰 없이 바로 내보내집니다.
`);
}
