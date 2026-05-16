import {
  classifyLinkHref,
  createManifestLoadedRouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import type { LinkKind } from '../../shared/link/link-kind.js';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import { isLinkSurface } from '../../shared/link/link-surface.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
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

const toAbsoluteCurrentUrl = (siteUrlContext: SiteUrlContext, normalizedUrl: string): string => {
  const resolved = new URL(normalizedUrl, `${siteUrlContext.siteOrigin}/`);
  return resolved.href;
};

const validateAnchor = (
  anchor: HTMLAnchorElement,
  options: {
    readonly sourceLabel: string;
    readonly siteUrlContext: SiteUrlContext;
    readonly currentUrl: string;
    readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
  },
): void => {
  const href = anchor.getAttribute('href');
  if (href === null || href.trim().length === 0) {
    fail(options.sourceLabel, 'anchor href is missing');
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
      fail(options.sourceLabel, 'link annotation is invalid');
    }
    const annotation = classifyLinkHref({
      href,
      surface,
      siteUrlContext: options.siteUrlContext,
      currentUrl: toAbsoluteCurrentUrl(options.siteUrlContext, options.currentUrl),
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (pathname) => options.routeManifestState.routeSet.has(pathname),
      }),
      runtimeEnvironment: 'production',
      target: target === '_blank' || target === '_self' ? target : undefined,
      rel: anchor.getAttribute('rel') ?? undefined,
      noRouter: anchor.hasAttribute('data-no-router'),
      download: anchor.hasAttribute('download')
        ? anchor.getAttribute('download') === ''
          ? true
          : (anchor.getAttribute('download') ?? true)
        : undefined,
    });
    if (annotation.isUnsafe) {
      fail(options.sourceLabel, 'unsafe annotation must not be rendered');
    }
    if (annotation.kind !== kind) {
      fail(options.sourceLabel, 'link kind mismatch');
    }
    if (annotation.surface !== surface) {
      fail(options.sourceLabel, 'link surface mismatch');
    }
  }

  if (anchor.getAttribute('data-external') === 'true' && kind !== 'external-web') {
    fail(options.sourceLabel, 'data-external mismatch');
  }
  if (kind === 'external-web' && anchor.getAttribute('data-external') !== 'true') {
    fail(options.sourceLabel, 'external-web requires data-external="true"');
  }
};

export const validateRuntimeDomLinkContracts = (options: {
  readonly root: ParentNode;
  readonly sourceLabel: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
}): void => {
  options.root.querySelectorAll('a').forEach((anchor) => {
    if (anchor instanceof HTMLAnchorElement) {
      validateAnchor(anchor, options);
    }
  });
};

export const validateHydratedRuntimeDomLinkContracts = validateRuntimeDomLinkContracts;
export const validateCommittedRuntimeDomLinkContracts = validateRuntimeDomLinkContracts;
