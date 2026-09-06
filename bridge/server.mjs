#!/usr/bin/env node
/**
 * Figma Agent Bridge — MCP stdio 서버 + 로컬 HTTP 브리지 (의존성 0, Node 18+)
 *
 *   에이전트 ──stdio(MCP)──> server.mjs ──HTTP long-poll──> Figma 플러그인 ──> Plugin API
 *
 * 도구
 *   figma_run    : Figma Plugin API JavaScript 를 실행한다. (핵심)
 *   figma_status : 플러그인 연결 상태를 본다.
 *
 * Figma 공식 MCP 와 달리 호출 한도가 없다. 대신 Figma 데스크톱에서
 * "Agent Bridge" 플러그인을 실행해두어야 한다.
 *
 * 여러 에이전트(Claude Code / Codex / Antigravity)가 동시에 이 서버를 띄워도 된다.
 * 포트를 먼저 잡은 프로세스가 host 가 되고, 나머지는 client 로 붙어 host 를 경유한다.
 * host 가 죽으면 남은 client 중 하나가 포트를 잡아 host 로 승격한다.
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.FIGMA_BRIDGE_PORT || 3055);
const JOB_TIMEOUT_MS = Number(process.env.FIGMA_BRIDGE_TIMEOUT || 180000);
const POLL_HOLD_MS = 25000;

const log = (...a) => process.stderr.write('[bridge] ' + a.join(' ') + '\n');

// ────────────────────────────── job queue ──────────────────────────────
const queue = [];          // jobs waiting to be picked up by the plugin
const inflight = new Map(); // id -> job
let waiter = null;         // a held-open GET /agent/poll response
let lastSeen = 0;          // last time the plugin polled

function dispatch() {
  if (!waiter || queue.length === 0) return;
  const job = queue.shift();
  inflight.set(job.id, job);
  const res = waiter;
  waiter = null;
  clearTimeout(res.__holdTimer);
  send(res, 200, { id: job.id, code: job.code });
}

function runInFigma(code) {
  return new Promise((resolve, reject) => {
    const job = { id: randomUUID(), code, resolve, reject };
    job.timer = setTimeout(() => {
      inflight.delete(job.id);
      const i = queue.indexOf(job);
      if (i >= 0) queue.splice(i, 1);
      reject(new Error(
        pluginConnected()
          ? `Figma 플러그인이 ${JOB_TIMEOUT_MS / 1000}초 안에 응답하지 않았다.`
          : 'Figma 플러그인이 연결돼 있지 않다. Figma 데스크톱에서 "Agent Bridge" 플러그인을 실행할 것.'
      ));
    }, JOB_TIMEOUT_MS);
    queue.push(job);
    dispatch();
  });
}

const pluginConnected = () => Date.now() - lastSeen < POLL_HOLD_MS + 10000;

// ────────────────────────────── http bridge ──────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, status, body) {
  const payload = JSON.stringify(body ?? {});
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

const readBody = (req) => new Promise((resolve) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
});

const handler = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  if (url.pathname === '/agent/poll' && req.method === 'GET') {
    lastSeen = Date.now();
    if (queue.length) {
      const job = queue.shift();
      inflight.set(job.id, job);
      return send(res, 200, { id: job.id, code: job.code });
    }
    if (waiter) { clearTimeout(waiter.__holdTimer); send(waiter, 200, {}); }
    waiter = res;
    res.__holdTimer = setTimeout(() => { if (waiter === res) { waiter = null; send(res, 200, {}); } }, POLL_HOLD_MS);
    req.on('close', () => { if (waiter === res) waiter = null; });
    return;
  }

  if (url.pathname === '/agent/result' && req.method === 'POST') {
    lastSeen = Date.now();
    const body = await readBody(req);
    const job = inflight.get(body.id);
    if (job) {
      inflight.delete(body.id);
      clearTimeout(job.timer);
      job.resolve(body);
    }
    return send(res, 200, { ok: true });
  }

  // 다른 에이전트 프로세스(client 모드)가 작업을 위임하는 경로
  if (url.pathname === '/agent/run' && req.method === 'POST') {
    const body = await readBody(req);
    try {
      return send(res, 200, await runInFigma(String(body.code ?? '')));
    } catch (e) {
      return send(res, 200, { ok: false, error: e.message });
    }
  }

  if (url.pathname === '/agent/health') {
    return send(res, 200, { ok: true, pluginConnected: pluginConnected(), queued: queue.length });
  }

  send(res, 404, { error: 'not found' });
};

// ── host / client 역할 결정 ──
// 플러그인 manifest 는 http://localhost 만 허용한다(IP 표기는 Figma 가 거부).
// Windows 에서 localhost 가 ::1 로 먼저 해석될 수 있으므로 루프백 양쪽에 바인딩한다.
const BASE = `http://127.0.0.1:${PORT}`;
let isHost = false;
let sock4 = null;
let sock6 = null;

const listenOn = (host) => new Promise((resolve) => {
  const s = http.createServer(handler);
  s.once('error', (e) => {
    if (e.code !== 'EADDRINUSE') log(`listen ${host} failed: ${e.message}`);
    resolve(null);
  });
  s.once('listening', () => resolve(s));
  s.listen(PORT, host);
});

async function claimPort() {
  if (isHost) return true;
  sock4 = await listenOn('127.0.0.1');
  if (!sock4) return false;
  isHost = true;
  sock6 = await listenOn('::1'); // best effort
  log(`host — http bridge on ${BASE}${sock6 ? ' and [::1]' : ''}`);
  return true;
}

await claimPort();
if (!isHost) log(`client — 기존 브리지(${BASE})를 경유한다`);

/** host 면 직접, client 면 host 를 경유해 실행한다. host 가 사라졌으면 승격을 시도한다. */
async function execute(code) {
  if (isHost) return runInFigma(code);
  try {
    const r = await fetch(`${BASE}/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return await r.json();
  } catch {
    log('host 가 응답하지 않는다. 포트 확보를 시도한다.');
    if (await claimPort()) return runInFigma(code);
    throw new Error('브리지 host 에 연결할 수 없다. `node bridge/server.mjs` 를 직접 실행해볼 것.');
  }
}

async function health() {
  if (isHost) return { pluginConnected: pluginConnected(), queued: queue.length };
  try {
    return await (await fetch(`${BASE}/agent/health`)).json();
  } catch {
    return { pluginConnected: false, queued: 0, note: 'host 브리지에 연결할 수 없다' };
  }
}

// ────────────────────────────── MCP (stdio JSON-RPC) ──────────────────────────────
const TOOLS = [
  {
    name: 'figma_run',
    description:
      'Figma 파일에서 Plugin API JavaScript 를 실행한다. 노드 생성·수정·삭제, 변수·스타일·컴포넌트 작업 전부 가능하다. ' +
      '코드는 async 함수 본문으로 감싸지므로 최상위 await 와 return 을 쓸 수 있다. ' +
      '`figma` 전역과 헬퍼 `snap(node, scale?)`(PNG 스크린샷을 결과에 첨부), `AL(direction, props?)`(오토레이아웃 프레임 생성) 을 쓸 수 있다. ' +
      '생성·수정한 노드 ID 를 반드시 return 할 것. Figma 데스크톱에서 "Agent Bridge" 플러그인이 실행 중이어야 한다.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '실행할 JavaScript. 최상위 await/return 사용 가능.' },
        description: { type: 'string', description: '이 코드가 하려는 일에 대한 짧은 설명.' },
      },
      required: ['code'],
    },
  },
  {
    name: 'figma_status',
    description: 'Figma 플러그인 브리지의 연결 상태를 확인한다. 작업 전에 먼저 호출하면 좋다.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function reply(id, result) { write({ jsonrpc: '2.0', id, result }); }
function fail(id, code, message) { write({ jsonrpc: '2.0', id, error: { code, message } }); }
function write(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

async function callTool(name, args) {
  if (name === 'figma_status') {
    const h = await health();
    return { content: [{ type: 'text', text: JSON.stringify({
      ...h, port: PORT, role: isHost ? 'host' : 'client',
      hint: h.pluginConnected ? '연결됨. figma_run 을 쓸 수 있다.'
        : 'Figma 데스크톱에서 파일을 열고 Plugins → Development → Agent Bridge 를 실행할 것.',
    }, null, 2) }] };
  }

  if (name !== 'figma_run') throw new Error(`unknown tool: ${name}`);

  const out = await execute(String(args?.code ?? ''));
  const content = [];

  if (out.ok) {
    content.push({ type: 'text', text: out.result === undefined ? '(no return value)' : String(out.result) });
  } else {
    content.push({ type: 'text', text: `ERROR: ${out.error}\n\n${out.stack || ''}`.trim() });
  }
  for (const img of out.images || []) {
    content.push({ type: 'text', text: `[screenshot] ${img.name}` });
    content.push({ type: 'image', data: img.b64, mimeType: 'image/png' });
  }
  return { content, isError: !out.ok };
}

let buf = '';
process.stdin.on('data', async (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;

    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    const { id, method, params } = msg;

    try {
      if (method === 'initialize') {
        reply(id, {
          protocolVersion: params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'figma-agent-bridge', version: '1.0.0' },
        });
      } else if (method === 'tools/list') {
        reply(id, { tools: TOOLS });
      } else if (method === 'tools/call') {
        reply(id, await callTool(params?.name, params?.arguments));
      } else if (method === 'ping') {
        reply(id, {});
      } else if (method && method.startsWith('notifications/')) {
        // no response for notifications
      } else if (id !== undefined) {
        fail(id, -32601, `method not found: ${method}`);
      }
    } catch (e) {
      if (id !== undefined) fail(id, -32000, e.message);
    }
  }
});

process.stdin.resume();
log('mcp stdio ready');
