import path from 'node:path';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { normalizeRouaultPathname } from '../../shared/url/rouault-url-policy.js';

export const STATIC_GENERATED_DOCUMENT_ROUTES = ['/', '/about/', '/search/', '/corpora/'] as const;

export interface GeneratedDocumentRouteSource {
  readonly pageUrl?: unknown;
  readonly notePermalink?: unknown;
  readonly notes?: readonly {
    readonly permalink?: unknown;
    readonly genre?: unknown;
  }[];
  readonly corpusPages?: readonly { readonly href?: unknown }[];
  readonly tagPages?: readonly { readonly tag?: unknown }[];
}

export const normalizeGeneratedDocumentRoutePathname = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  let pathname: string;
  try {
    pathname = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed).pathname
      : new URL(trimmed, 'https://rouault.invalid').pathname;
  } catch {
    return null;
  }
  if (pathname === '/index.html') {
    pathname = '/';
  } else if (pathname.endsWith('/index.html')) {
    pathname = `${pathname.slice(0, -'/index.html'.length)}/`;
  }
  if (pathname === '/404.html') {
    return null;
  }
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }
  return pathname.endsWith('/') || /\.[^/]+$/u.test(pathname) ? pathname : `${pathname}/`;
};

const addGeneratedRoute = (routes: Set<string>, value: unknown): void => {
  const pathname = normalizeGeneratedDocumentRoutePathname(value);
  if (pathname !== null) {
    routes.add(pathname);
    routes.add(normalizeRouaultPathname(pathname));
  }
};

export const buildGeneratedDocumentRouteSet = (
  source: GeneratedDocumentRouteSource,
): Set<string> => {
  const routes = new Set<string>(STATIC_GENERATED_DOCUMENT_ROUTES);
  addGeneratedRoute(routes, source.pageUrl);
  addGeneratedRoute(routes, source.notePermalink);

  for (const note of source.notes ?? []) {
    addGeneratedRoute(routes, note.permalink);
    const genres = Array.isArray(note.genre) ? note.genre : [];
    for (const genre of genres) {
      if (typeof genre === 'string' && genre.trim().length > 0) {
        addGeneratedRoute(routes, `/tags/${encodeURIComponent(genre.trim())}/`);
      }
    }
  }

  for (const corpusPage of source.corpusPages ?? []) {
    addGeneratedRoute(routes, corpusPage.href);
  }

  for (const tagPage of source.tagPages ?? []) {
    if (typeof tagPage.tag === 'string' && tagPage.tag.trim().length > 0) {
      addGeneratedRoute(routes, `/tags/${encodeURIComponent(tagPage.tag.trim())}/`);
    }
  }

  return routes;
};

export const resolveGeneratedDocumentCurrentUrl = (options: {
  readonly pathname: unknown;
  readonly fallbackPathname?: unknown;
  readonly siteUrlContext: SiteUrlContext;
}): string => {
  const pathname =
    normalizeGeneratedDocumentRoutePathname(options.pathname) ??
    normalizeGeneratedDocumentRoutePathname(options.fallbackPathname) ??
    '/';
  return `${options.siteUrlContext.siteOrigin}${options.siteUrlContext.basePath}${pathname}`;
};

const normalizeRelativePath = (value: string): string => value.split(path.sep).join('/');

export const resolveContentPathnameFromHtmlFile = (
  outputDir: string,
  htmlFilePath: string,
): string => {
  const relativeHtmlPath = normalizeRelativePath(path.relative(outputDir, htmlFilePath));

  if (relativeHtmlPath === 'index.html') {
    return '/';
  }

  if (relativeHtmlPath.endsWith('/index.html')) {
    return `/${relativeHtmlPath.slice(0, -'/index.html'.length)}/`;
  }

  const extension = path.extname(relativeHtmlPath);
  const basename =
    extension.length > 0 ? relativeHtmlPath.slice(0, -extension.length) : relativeHtmlPath;

  return `/${basename}`;
};
