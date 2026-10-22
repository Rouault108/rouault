import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const NATIVE_RELOAD_CONTROL_HEADER = 'x-rouault-preview-mode-only';
// 対照に座標保存・scroll・focusを追加せず、Readingのnative初期採用とmodeだけを揃える。
export const nativeReloadControlScript = `history.scrollRestoration='auto';
addEventListener('pagehide',()=>{history.scrollRestoration='auto';});
addEventListener('load',()=>requestAnimationFrame(()=>{
  const entry=history.state?.__rouaultHistoryEntry;
  history.scrollRestoration=entry?.version===1&&typeof entry.id==='string'?'manual':'auto';
}),{once:true});`;
const etag = `W/"${createHash('sha256').update(nativeReloadControlScript).digest('hex')}"`;

// 実HTTP cacheを保ち、同一origin/URLの対照をcontext別headerで選ぶ。配信成果物は変更しない。
export const nativeReloadControlMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
): void => {
  const pathname = new URL(request.url ?? '/', 'http://preview.local').pathname;
  if (
    !pathname.includes('/client-assets/') ||
    !pathname.endsWith('.js') ||
    (request.method !== 'GET' && request.method !== 'HEAD')
  ) {
    next();
    return;
  }
  const previous = response.getHeader('Vary');
  response.setHeader(
    'Vary',
    previous
      ? `${String(previous)}, ${NATIVE_RELOAD_CONTROL_HEADER}`
      : NATIVE_RELOAD_CONTROL_HEADER,
  );
  if (request.headers[NATIVE_RELOAD_CONTROL_HEADER] !== '1') {
    next();
    return;
  }
  response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  response.setHeader('ETag', etag);
  const matches = request.headers['if-none-match']?.split(',').map((value) => value.trim());
  response.statusCode = matches?.some((value) => value === etag || value === '*') ? 304 : 200;
  response.end(
    response.statusCode === 304 || request.method === 'HEAD'
      ? undefined
      : nativeReloadControlScript,
  );
};
