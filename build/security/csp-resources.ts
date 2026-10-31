import { parse as parseCss } from 'postcss';
import { validateDataImageUrl } from '../../shared/media/data-image-url.js';

export type ResourceKind = 'script' | 'style' | 'font' | 'image' | 'media' | 'frame' | 'connect';
export interface CspResource {
  kind: ResourceKind;
  origin: string;
  pathname: string;
  scope: 'document' | 'template' | 'stylesheet' | 'envelope' | 'bundle';
  reason: string;
}
export interface ResourceContext {
  siteOrigin: string;
  mediaOrigin: string | null;
}

export const classifyCspResource = (
  url: URL,
  kind: ResourceKind,
  scope: CspResource['scope'],
  context: ResourceContext,
): CspResource => {
  if (kind === 'frame') throw new Error('[csp] runner resource profile not adopted');
  if (url.username || url.password) throw new Error('[csp] credential-bearing resource');
  // query/fragmentを診断manifestへコピーせず、未分類queryを既知資源と誤認しない。
  if (url.search) throw new Error('[csp] static resource query requires explicit classification');
  if (url.protocol === 'data:') {
    if (kind !== 'image' || !validateDataImageUrl(url.href).ok)
      throw new Error('[csp] unapproved data resource');
    return {
      kind,
      scope,
      origin: 'data:',
      pathname: '',
      reason: 'validated-raster-data-image-at-most-32KiB',
    };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new Error('[csp] unclassified resource scheme');
  if (url.protocol === 'http:' && url.origin !== context.siteOrigin)
    throw new Error('[csp] external HTTP resource');
  const sameOrigin = url.origin === context.siteOrigin;
  if (
    !sameOrigin &&
    !((kind === 'image' || kind === 'media') && url.origin === context.mediaOrigin)
  )
    throw new Error('[csp] unapproved resource origin');
  return {
    kind,
    scope,
    origin: url.origin,
    pathname: url.pathname,
    reason: sameOrigin ? 'same-origin-static-resource-contract' : 'explicit-ROUAULT_MEDIA_BASE_URL',
  };
};

export const cssResourceUrls = (css: string, baseUrl: string): string[] => {
  const resources: string[] = [];
  const urls = (value: string): void => {
    for (const match of value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/giu))
      resources.push(new URL(match[1] ?? match[2] ?? match[3] ?? '', baseUrl).href);
  };
  const root = parseCss(css);
  root.walkDecls((declaration) => {
    urls(declaration.value);
  });
  root.walkAtRules(/^import$/iu, (rule) => {
    const quoted = /^\s*["']([^"']+)["']/u.exec(rule.params);
    if (quoted?.[1]) resources.push(new URL(quoted[1], baseUrl).href);
    else urls(rule.params);
  });
  return resources;
};

export const cssResourceKind = (url: URL): ResourceKind =>
  /\.(?:woff2?|ttf|otf)(?:$)/iu.test(url.pathname)
    ? 'font'
    : /\.css$/iu.test(url.pathname)
      ? 'style'
      : 'image';

export const srcsetUrls = (source: string): string[] => {
  const result: string[] = [];
  let rest = source;
  while (rest.trim()) {
    rest = rest.replace(/^[\s,]+/u, '');
    const token = /^\S+/u.exec(rest)?.[0];
    if (!token) break;
    rest = rest.slice(token.length);
    result.push(token.replace(/,+$/u, ''));
    if (!token.endsWith(',')) rest = rest.replace(/^[^,]*(?:,|$)/u, '');
  }
  return result;
};
