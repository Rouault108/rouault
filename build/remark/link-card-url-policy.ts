import { classifyLinkHref, type ResolvedLinkAnnotation, type RouteClassificationMode } from '../../shared/link/link-annotation.js';
import type { LinkKind } from '../../shared/link/link-kind.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';

export interface LinkCardUrlPolicyContext {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
}

export type LinkCardUrlPolicyResult =
  | {
      readonly ok: true;
      readonly href: string;
      readonly kind: Extract<LinkKind, 'internal-document' | 'external-web'>;
      readonly annotation: Extract<ResolvedLinkAnnotation, { readonly isUnsafe: false }>;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'unsafe-link-card-url'
        | 'link-card-prose-fallback'
        | 'invalid-link-card-url';
      readonly unsafeReason?: string;
    };

export const validateLinkCardUrlInput = (
  value: string,
  siteUrlContext: SiteUrlContext,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } => {
  const unsafe = detectUnsafeHref(value);
  if (unsafe.ok === false) return { ok: false, reason: unsafe.reason };
  try {
    const url = new URL(value, siteUrlContext.siteOrigin);
    if (url.username.length > 0 || url.password.length > 0) {
      return { ok: false, reason: 'url-with-credentials' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }
};

export const resolveLinkCardUrlPolicy = (
  value: string,
  context: LinkCardUrlPolicyContext,
): LinkCardUrlPolicyResult => {
  const unsafe = detectUnsafeHref(value);
  if (unsafe.ok === false) {
    return { ok: false, reason: 'unsafe-link-card-url', unsafeReason: unsafe.reason };
  }

  let annotation: ResolvedLinkAnnotation;
  try {
    annotation = classifyLinkHref({
      href: value,
      siteUrlContext: context.siteUrlContext,
      currentUrl: context.currentUrl,
      routeClassificationMode: context.routeClassificationMode,
      surface: 'card',
    });
  } catch {
    return { ok: false, reason: 'invalid-link-card-url' };
  }

  if (annotation.isUnsafe) {
    return { ok: false, reason: 'unsafe-link-card-url' };
  }

  if (annotation.kind === 'internal-document' || annotation.kind === 'external-web') {
    return {
      ok: true,
      href: annotation.renderHref,
      kind: annotation.kind,
      annotation,
    };
  }

  return { ok: false, reason: 'link-card-prose-fallback' };
};
