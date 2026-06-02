import {
  classifyLinkHref,
  createManifestLoadedRouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import type { LinkKind } from '../../shared/link/link-kind.js';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import { isLinkSurface } from '../../shared/link/link-surface.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { stripBasePathFromPathname } from '../../shared/url/normalize-rouault-url.js';
import type { LoadedInternalDocumentRouteManifestState } from './internal-document-route-manifest-loader.js';

const LINK_KINDS: readonly LinkKind[] = [
  'internal-document',
  'internal-fragment',
  'internal-resource',
  'external-web',
  'external-action',
  'unsafe',
] as const;

export class RuntimeDomLinkContractError extends Error {
  override readonly name = 'RuntimeDomLinkContractError';
}

const fail = (sourceLabel: string, message: string): never => {
  throw new RuntimeDomLinkContractError(`[${sourceLabel}] ${message}`);
};

const relTokens = (value: string | null): readonly string[] =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter((token) => token.length > 0);

const isFootnoteStructuralException = (anchor: HTMLAnchorElement): boolean =>
  anchor.hasAttribute('data-footnote-ref') ||
  anchor.hasAttribute('data-footnote-backref') ||
  anchor.hasAttribute('data-footnote-fallback-trigger');

const isFooterNavLink = (anchor: HTMLAnchorElement): boolean =>
  anchor.closest('.ui-footer[data-footer] .ui-footer__nav') !== null;

const toCurrentPathname = (siteUrlContext: SiteUrlContext, currentAbsoluteUrl: string): string => {
  const resolved = new URL(currentAbsoluteUrl);
  return stripBasePathFromPathname(resolved.pathname, siteUrlContext.basePath);
};

const validateAnchor = (
  anchor: HTMLAnchorElement,
  options: {
    readonly sourceLabel: string;
    readonly siteUrlContext: SiteUrlContext;
    readonly currentAbsoluteUrl: string;
    readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
  },
): void => {
  const href = anchor.getAttribute('href');
  if (href === null || href.trim().length === 0) {
    return fail(options.sourceLabel, 'anchor href is missing');
  }

  const unsafe = detectUnsafeHref(href);
  if (!unsafe.ok) {
    fail(options.sourceLabel, `unsafe href is forbidden: ${unsafe.reason}`);
  }

  const kind = anchor.getAttribute('data-link-kind');
  const surface = anchor.getAttribute('data-link-surface');
  if (!isFootnoteStructuralException(anchor) && (kind === null || surface === null)) {
    fail(options.sourceLabel, 'link annotation is missing');
  }
  if (kind === 'unsafe') {
    fail(options.sourceLabel, 'unsafe link kind must not be rendered');
  }
  if (kind !== null && !LINK_KINDS.includes(kind as LinkKind)) {
    fail(options.sourceLabel, 'invalid link kind');
  }
  if (surface !== null && !isLinkSurface(surface)) {
    fail(options.sourceLabel, 'invalid link surface');
  }

  const tokens = relTokens(anchor.getAttribute('rel'));
  if (tokens.includes('opener')) {
    fail(options.sourceLabel, 'rel opener is forbidden');
  }
  if (anchor.getAttribute('target') === '_blank' && !tokens.includes('noopener')) {
    fail(options.sourceLabel, 'target blank requires noopener');
  }
  const target = anchor.getAttribute('target');
  if (target !== null && target !== '_blank' && target !== '_self') {
    fail(options.sourceLabel, 'invalid target');
  }

  if (!isFootnoteStructuralException(anchor)) {
    if (kind === null || surface === null || !isLinkSurface(surface)) {
      return fail(options.sourceLabel, 'link annotation is invalid');
    }
    const annotatedHref = href;
    const annotatedSurface = surface;
    const rel = anchor.getAttribute('rel') ?? undefined;
    const downloadValue = anchor.getAttribute('download');
    const download = anchor.hasAttribute('download')
      ? downloadValue === ''
        ? true
        : (downloadValue ?? true)
      : undefined;
    const currentPathname = toCurrentPathname(options.siteUrlContext, options.currentAbsoluteUrl);
    const annotation = classifyLinkHref({
      href: annotatedHref,
      surface: annotatedSurface,
      siteUrlContext: options.siteUrlContext,
      currentUrl: options.currentAbsoluteUrl,
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (pathname) =>
          options.routeManifestState.routeSet.has(pathname) || pathname === currentPathname,
      }),
      runtimeEnvironment: 'production',
      ...(target === '_blank' || target === '_self' ? { target } : {}),
      ...(rel !== undefined ? { rel } : {}),
      noRouter: anchor.hasAttribute('data-no-router'),
      ...(download !== undefined ? { download } : {}),
    });
    if (annotation.isUnsafe) {
      fail(options.sourceLabel, 'unsafe annotation must not be rendered');
    }
    if (annotation.kind !== kind) {
      fail(
        options.sourceLabel,
        `link kind mismatch: href="${annotatedHref}" expected="${kind}" actual="${annotation.kind}"`,
      );
    }
    if (annotation.surface !== surface) {
      fail(
        options.sourceLabel,
        `link surface mismatch: href="${annotatedHref}" expected="${surface}" actual="${annotation.surface}"`,
      );
    }
  }

  if (anchor.getAttribute('data-external') === 'true' && kind !== 'external-web') {
    fail(options.sourceLabel, 'data-external mismatch');
  }
  if (kind === 'external-web' && anchor.getAttribute('data-external') !== 'true' && !isFooterNavLink(anchor)) {
    fail(options.sourceLabel, 'external-web requires data-external="true"');
  }
};

export const validateRuntimeDomLinkContracts = (options: {
  readonly root: ParentNode;
  readonly sourceLabel: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly currentAbsoluteUrl: string;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
}): void => {
  options.root.querySelectorAll('a').forEach((anchor) => {
    if (anchor instanceof HTMLAnchorElement) {
      validateAnchor(anchor, options);
    }
  });
};

export const validateRuntimeDomLinkContractSubtree = (options: {
  readonly root: Element;
  readonly sourceLabel: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly currentAbsoluteUrl: string;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
}): void => {
  if (options.root instanceof HTMLAnchorElement) {
    validateAnchor(options.root, options);
  }
  options.root.querySelectorAll('a').forEach((anchor) => {
    if (anchor instanceof HTMLAnchorElement) {
      validateAnchor(anchor, options);
    }
  });
};

export const validateHydratedRuntimeDomLinkContracts = validateRuntimeDomLinkContracts;
export const validateCommittedRuntimeDomLinkContracts = validateRuntimeDomLinkContracts;
