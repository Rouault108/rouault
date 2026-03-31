const EXCLUDED_PREFIXES = ['/@', '/src/', '/node_modules/', '/assets/', '/static/'] as const;

/**
 * 静的HTMLの配置に合わせて、拡張子なしURLを trailing slash 付きに内部 rewrite する。
 * URL表示はそのまま維持したいので、サーバー側の解決専用として使う。
 */
export function resolveTrailingSlashRewrite(requestUrl: string): string | null {
  const url = new URL(requestUrl, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/' || pathname.endsWith('/')) {
    return null;
  }

  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const lastSegment = pathname.split('/').pop() ?? '';
  if (lastSegment.includes('.')) {
    return null;
  }

  url.pathname = `${pathname}/`;
  return `${url.pathname}${url.search}`;
}
