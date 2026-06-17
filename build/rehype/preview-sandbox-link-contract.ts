import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import {
  classifyLinkHref,
  type RouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import { parseSrcset } from '../../shared/media/srcset-parser.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { isPathnameInsideBasePath } from '../../shared/site/site-url-context.js';
import { stripBasePathFromPathname } from '../../shared/url/normalize-rouault-url.js';

export const PREVIEW_SANDBOX_MARKER = 'data-link-contract-sandbox="preview"';

export interface PreviewSandboxHtmlSnippetLinkContext {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
  readonly isInternalResourcePathname?: (pathname: string) => boolean;
}

type ElementNode = DefaultTreeAdapterMap['element'];
type Node = DefaultTreeAdapterMap['node'];

const URL_BEARING_HTML_RE = /<(?:a|img|video|audio|source|track)\b/iu;

const isElementNode = (node: Node): node is ElementNode =>
  'tagName' in node && Array.isArray((node as ElementNode).attrs);

const attr = (node: ElementNode, name: string): string | null =>
  node.attrs.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? null;

function fail(reason: string): never {
  throw new Error(reason);
}

export const previewSandboxHtmlMayContainUrlBearingAttributes = (source: string): boolean =>
  URL_BEARING_HTML_RE.test(source);

export const isAllowedPreviewResourcePathname = (pathnameWithoutBasePath: string): boolean =>
  pathnameWithoutBasePath.startsWith('/assets/preview/') ||
  pathnameWithoutBasePath.startsWith('/media/preview/');

const validatePreviewResourceUrl = (value: string, siteUrlContext: SiteUrlContext): string => {
  const unsafe = detectUnsafeHref(value);
  if (!unsafe.ok) {
    fail('invalid-preview-sandbox-resource-url');
  }

  const url = new URL(value, `${siteUrlContext.siteOrigin}${siteUrlContext.basePath}/`);
  if (url.username.length > 0 || url.password.length > 0) {
    fail('invalid-preview-sandbox-resource-url');
  }
  if (url.origin !== siteUrlContext.siteOrigin) {
    fail('invalid-preview-sandbox-resource-url');
  }
  if (!isPathnameInsideBasePath(url.pathname, siteUrlContext.basePath)) {
    fail('invalid-preview-sandbox-resource-url');
  }
  const pathnameWithoutBasePath = stripBasePathFromPathname(url.pathname, siteUrlContext.basePath);
  if (!isAllowedPreviewResourcePathname(pathnameWithoutBasePath)) {
    fail('invalid-preview-sandbox-resource-url');
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

const validatePreviewSandboxAnchorHref = (
  href: string,
  context: PreviewSandboxHtmlSnippetLinkContext,
): void => {
  const annotation = classifyLinkHref({
    href,
    surface: 'prose',
    siteUrlContext: context.siteUrlContext,
    currentUrl: context.currentUrl,
    routeClassificationMode: context.routeClassificationMode,
    ...(context.isInternalResourcePathname
      ? { isInternalResourcePathname: context.isInternalResourcePathname }
      : {}),
  });

  if (annotation.isUnsafe) {
    fail('invalid-preview-sandbox-link-url');
  }

  if (annotation.kind === 'internal-resource') {
    validatePreviewResourceUrl(href, context.siteUrlContext);
  }
};

const validatePreviewSandboxSrcset = (value: string, siteUrlContext: SiteUrlContext): void => {
  const parsed = parseSrcset(value);
  if (!parsed.ok) {
    return fail('invalid-preview-sandbox-srcset');
  }

  for (const candidate of parsed.candidates) {
    validatePreviewResourceUrl(candidate.url, siteUrlContext);
  }
};

const validateElementUrlAttributes = (
  node: ElementNode,
  context: PreviewSandboxHtmlSnippetLinkContext,
): void => {
  switch (node.tagName) {
    case 'a': {
      const href = attr(node, 'href');
      if (href !== null) {
        validatePreviewSandboxAnchorHref(href, context);
      }
      return;
    }
    case 'img': {
      const src = attr(node, 'src');
      if (src !== null) validatePreviewResourceUrl(src, context.siteUrlContext);
      const srcset = attr(node, 'srcset');
      if (srcset !== null) validatePreviewSandboxSrcset(srcset, context.siteUrlContext);
      return;
    }
    case 'video': {
      const src = attr(node, 'src');
      if (src !== null) validatePreviewResourceUrl(src, context.siteUrlContext);
      const poster = attr(node, 'poster');
      if (poster !== null) validatePreviewResourceUrl(poster, context.siteUrlContext);
      return;
    }
    case 'audio':
    case 'source':
    case 'track': {
      const src = attr(node, 'src');
      if (src !== null) validatePreviewResourceUrl(src, context.siteUrlContext);
      const srcset = attr(node, 'srcset');
      if (srcset !== null) validatePreviewSandboxSrcset(srcset, context.siteUrlContext);
      return;
    }
    default:
      return;
  }
};

const visit = (node: Node, context: PreviewSandboxHtmlSnippetLinkContext): void => {
  if (isElementNode(node)) {
    validateElementUrlAttributes(node, context);
  }

  const childNodes = 'childNodes' in node ? node.childNodes : [];
  for (const child of childNodes) {
    visit(child, context);
  }
};

export const validatePreviewSandboxHtmlSnippetLinkContract = (
  source: string,
  context: PreviewSandboxHtmlSnippetLinkContext,
): void => {
  if (!previewSandboxHtmlMayContainUrlBearingAttributes(source)) {
    return;
  }

  const document = parse5.parseFragment(source);
  visit(document, context);
};

export const validatePreviewSandboxBaseUrl = (
  value: string,
  siteUrlContext: SiteUrlContext,
): string => {
  validatePreviewResourceUrl(value, siteUrlContext);
  const url = new URL(value, siteUrlContext.siteOrigin);
  return url.href;
};
