// 配信policyの正本は生成済み_headersとし、preview専用のcache値を重複管理しない。
export const createStaticCacheControlResolver = (
  source: string,
): ((requestUrl: string) => string | null) => {
  const rules: { pattern: RegExp; value: string }[] = [];
  let pattern: RegExp | null = null;
  for (const line of source.split(/\r?\n/u)) {
    if (line.startsWith('/')) {
      const expression = line
        .trim()
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
        .join('.*');
      pattern = new RegExp(`^${expression}$`, 'u');
      continue;
    }
    const header = /^\s+Cache-Control:\s*(.+?)\s*$/iu.exec(line);
    if (pattern && header?.[1]) rules.push({ pattern, value: header[1] });
  }
  return (requestUrl) => {
    let pathname: string;
    try {
      pathname = new URL(requestUrl, 'http://preview.local').pathname;
    } catch {
      return null;
    }
    let value: string | null = null;
    for (const rule of rules) if (rule.pattern.test(pathname)) value = rule.value;
    return value;
  };
};
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const createStaticCacheControlMiddleware = (
  source: string,
): ((request: IncomingMessage, response: ServerResponse, next: () => void) => void) => {
  const resolve = createStaticCacheControlResolver(source);
  return (request, response, next) => {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const value = resolve(request.url ?? '/');
      if (value !== null) {
        response.setHeader('Cache-Control', value);
        // network応答ごとに変え、保存済みHTTP応答の再利用をtiming値とは独立に証明する。
        response.setHeader('X-Rouault-Preview-Response-Id', randomUUID());
      }
    }
    next();
  };
};
