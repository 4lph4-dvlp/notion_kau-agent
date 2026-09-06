// Agent Bridge — 플러그인 샌드박스 쪽.
// UI(iframe)가 브리지 서버에서 받아온 코드를 여기서 Plugin API 로 실행한다.

figma.showUI(__html__, { width: 320, height: 190, themeColors: true });

const MAX_DIM = 1024;

function safeStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (k, v) => {
    if (typeof v === 'bigint') return String(v);
    if (typeof v === 'function') return '[function]';
    if (v && typeof v === 'object') {
      if (seen.has(v)) return '[circular]';
      seen.add(v);
      // Figma 노드는 통째로 직렬화하면 거대하므로 요약만 남긴다.
      // 일반 객체까지 잡지 않도록 노드 전용 메서드로 판별한다.
      if (typeof v.id === 'string' && typeof v.type === 'string' &&
          typeof v.getPluginData === 'function') {
        return { __node: v.id, type: v.type, name: v.name };
      }
    }
    return v;
  }, 2);
}

// eval 이 막혀 있을 수 있으므로 두 경로를 모두 시도한다
function compile(code) {
  const src = '(async (figma, snap, AL) => {\n' + code + '\n})';
  let firstError;
  try {
    return (0, eval)(src);
  } catch (e) {
    firstError = e;
  }
  try {
    return new Function('figma', 'snap', 'AL',
      'return (async () => {\n' + code + '\n})()');
  } catch (e2) {
    throw new Error(
      '이 샌드박스는 동적 코드 실행을 허용하지 않는다.\n' +
      'eval: ' + (firstError && firstError.message) + '\n' +
      'new Function: ' + e2.message
    );
  }
}

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== 'run') return;

  const images = [];

  // 결과에 PNG 스크린샷을 첨부한다
  const snap = async (node, scale) => {
    const target = node || figma.currentPage.selection[0];
    if (!target || typeof target.exportAsync !== 'function') {
      throw new Error('snap(): 내보낼 수 없는 노드다');
    }
    const longest = Math.max(target.width || 1, target.height || 1);
    const s = scale || Math.min(0.5, MAX_DIM / longest);
    const bytes = await target.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: Math.max(0.01, s) },
    });
    images.push({
      name: target.name + ' (' + Math.round(target.width) + 'x' + Math.round(target.height) + ')',
      b64: figma.base64Encode(bytes),
    });
    return target.id;
  };

  // 공식 MCP 의 figma.createAutoLayout 대응 헬퍼
  const AL = (direction, props) => {
    let dir = direction, p = props;
    if (typeof direction === 'object') { p = direction; dir = 'HORIZONTAL'; }
    const f = figma.createFrame();
    f.layoutMode = dir || 'HORIZONTAL';
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'AUTO';
    f.fills = [];
    if (p) for (const k of Object.keys(p)) f[k] = p[k];
    return f;
  };

  let payload;
  try {
    const fn = compile(msg.code);
    const value = await fn(figma, snap, AL);
    payload = { id: msg.id, ok: true, result: safeStringify(value), images: images };
  } catch (e) {
    payload = {
      id: msg.id,
      ok: false,
      error: (e && e.message) || String(e),
      stack: (e && e.stack) || '',
      images: images,
    };
  }

  figma.ui.postMessage({ type: 'result', payload: payload });
};
