import {
  classifyLinkHref,
  type RouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';

export type ArticleHeaderSourceLinkKind =
  | 'external-web'
  | 'internal-document'
  | 'internal-resource';

export interface ArticleHeaderSourceLinkAnnotation {
  readonly href: string;
  readonly kind: ArticleHeaderSourceLinkKind;
  readonly surface: 'metadata';
  readonly isExternalWeb: boolean;
  readonly ariaLabel: string;
}

export type ArticleHeaderSourceLinkMode =
  | { readonly kind: 'raw-fallback' }
  | {
      readonly kind: 'classified';
      readonly annotation: ArticleHeaderSourceLinkAnnotation | null;
    };

export const createArticleHeaderSourceLinkAnnotation = (options: {
  readonly href: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
}): ArticleHeaderSourceLinkAnnotation => {
  const annotation = classifyLinkHref({
    href: options.href,
    surface: 'metadata',
    target: '_blank',
    rel: 'noopener noreferrer',
    siteUrlContext: options.siteUrlContext,
    currentUrl: options.currentUrl,
    routeClassificationMode: options.routeClassificationMode,
  });

  if (annotation.isUnsafe) {
    throw new Error('Article header source link classification returned unsafe.');
  }

  if (
    annotation.kind !== 'external-web' &&
    annotation.kind !== 'internal-document' &&
    annotation.kind !== 'internal-resource'
  ) {
    throw new Error(
      `Article header source link classification returned unsupported kind: ${annotation.kind}.`,
    );
  }

  return {
    href: annotation.renderHref,
    kind: annotation.kind,
    surface: 'metadata',
    isExternalWeb: annotation.isExternalWeb,
    ariaLabel: annotation.isExternalWeb
      ? '出典（外部サイト、新しいタブで開く）'
      : '出典（新しいタブで開く）',
  };
};
