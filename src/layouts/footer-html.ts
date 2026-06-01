import { escapeHtmlAttribute, escapeHtmlText } from './html-output.js';
import { buildLayoutFooterOptions, type FooterRenderOptions } from './footer-options.js';
import {
  createStaticRenderIdContext,
  type StaticRenderIdContext,
} from '../../shared/static-render-id-context.js';

type FooterLinkKind = 'internal-document' | 'external-web' | 'external-action';
type FooterRequiredTextField = 'meta.siteName' | 'meta.copyrightText';

interface NormalizedFooterLink {
  readonly href: string;
  readonly label: string;
  readonly kind: FooterLinkKind;
  readonly external: boolean;
}

interface NormalizedFooterMeta {
  readonly eyebrow?: string;
  readonly siteName: string;
  readonly siteUrl: string | null;
  readonly description?: string;
  readonly copyrightText: string;
  readonly buildLabel?: string;
}

const FORBIDDEN_FOOTER_PROTOCOL_PATTERN = /^(?:javascript|data|vbscript):/iu;
const ALLOWED_FOOTER_WEB_URL_PATTERN = /^https?:\/\//iu;
const ALLOWED_FOOTER_ACTION_PROTOCOL_PATTERN = /^(?:mailto|tel):/iu;
const FOOTER_INTERNAL_REFERENCE_PATTERN = /^(?:\/|\.\/|\.\.\/|#|\?)/u;
const FOOTER_WEB_URL_MISSING_HOST_PATTERN = /^https?:\/\/(?:[/?#]|$)/iu;

const normalizeRequiredFooterText = (
  value: unknown,
  fieldName: FooterRequiredTextField,
): string => {
  if (typeof value !== 'string') {
    throw new Error(`Footer requires non-empty ${fieldName}.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Footer requires non-empty ${fieldName}.`);
  }

  return normalized;
};

const normalizeOptionalFooterText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const hasUnsafeFooterHrefCharacter = (value: string): boolean => {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint <= 0x20 || codePoint === 0x5c || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      return true;
    }
  }

  return false;
};

const normalizeExternalWebFooterHref = (href: string): string | null => {
  if (!ALLOWED_FOOTER_WEB_URL_PATTERN.test(href)) return null;
  if (FOOTER_WEB_URL_MISSING_HOST_PATTERN.test(href)) return null;
  if (href.includes('\\')) return null;

  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.hostname.length === 0) return null;
    return href;
  } catch {
    return null;
  }
};

const normalizeExternalActionFooterHref = (href: string): string | null => {
  if (!ALLOWED_FOOTER_ACTION_PROTOCOL_PATTERN.test(href)) return null;

  const separatorIndex = href.indexOf(':');
  const payload = separatorIndex >= 0 ? href.slice(separatorIndex + 1) : '';
  return payload.length > 0 ? href : null;
};

const normalizeFooterHref = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (hasUnsafeFooterHrefCharacter(trimmed)) return null;
  if (FORBIDDEN_FOOTER_PROTOCOL_PATTERN.test(trimmed)) return null;
  if (trimmed.startsWith('//')) return null;

  const externalWebHref = normalizeExternalWebFooterHref(trimmed);
  if (externalWebHref !== null) return externalWebHref;

  const externalActionHref = normalizeExternalActionFooterHref(trimmed);
  if (externalActionHref !== null) return externalActionHref;

  if (FOOTER_INTERNAL_REFERENCE_PATTERN.test(trimmed)) return trimmed;

  return null;
};

const normalizeFooterSiteHref = (value: unknown): string | null => {
  const href = normalizeFooterHref(value);
  if (href === null) return null;
  if (ALLOWED_FOOTER_ACTION_PROTOCOL_PATTERN.test(href)) return null;
  return href;
};

const resolveFooterLinkKind = (href: string): FooterLinkKind => {
  if (ALLOWED_FOOTER_WEB_URL_PATTERN.test(href)) {
    return 'external-web';
  }
  if (ALLOWED_FOOTER_ACTION_PROTOCOL_PATTERN.test(href)) {
    return 'external-action';
  }
  return 'internal-document';
};

const normalizeFooterLinks = (links: unknown): readonly NormalizedFooterLink[] => {
  if (!Array.isArray(links)) return [];

  return links.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return [];
    }

    const candidate = item as {
      readonly href?: unknown;
      readonly label?: unknown;
      readonly external?: unknown;
    };
    const href = normalizeFooterHref(candidate.href);
    const label = normalizeOptionalFooterText(candidate.label);
    if (href === null || label === undefined) return [];

    const kind = resolveFooterLinkKind(href);
    const external =
      typeof candidate.external === 'boolean' ? candidate.external : kind === 'external-web';

    return [{ href, label, kind, external }];
  });
};

const resolveFooterNavLabel = (a11y: FooterRenderOptions['a11y']): string =>
  normalizeOptionalFooterText(a11y?.navLabel) ?? '補助ナビゲーション';

const renderFooterSiteName = (siteName: string, siteUrl: string | null): string => {
  if (siteUrl === null) {
    return escapeHtmlText(siteName);
  }

  const kind = resolveFooterLinkKind(siteUrl);
  const isExternalWebLink = kind === 'external-web';
  const externalAttribute = isExternalWebLink ? ' data-external="true"' : '';
  const relAttribute = isExternalWebLink ? ' rel="noreferrer"' : '';
  return `<a href="${escapeHtmlAttribute(siteUrl)}"${relAttribute} data-link-kind="${kind}" data-link-surface="navigation"${externalAttribute}>${escapeHtmlText(
    siteName,
  )}</a>`;
};

const renderFooterLink = (link: NormalizedFooterLink): string => {
  const shouldAnnotateNavExternalWeb = link.kind === 'external-web' && link.external;
  const externalAttribute = shouldAnnotateNavExternalWeb ? ' data-external="true"' : '';
  const relAttribute = link.kind === 'external-web' ? ' rel="noreferrer"' : '';
  const ariaLabelAttribute = shouldAnnotateNavExternalWeb
    ? ` aria-label="${escapeHtmlAttribute(`${link.label}（外部サイト）`)}"`
    : '';

  return `<span class="ui-footer__nav-item"><a href="${escapeHtmlAttribute(
    link.href,
  )}"${relAttribute}${externalAttribute} data-link-kind="${link.kind}" data-link-surface="navigation"${ariaLabelAttribute}>${escapeHtmlText(
    link.label,
  )}</a></span>`;
};

const normalizeFooterMeta = (meta: FooterRenderOptions['meta']): NormalizedFooterMeta => {
  const eyebrow = normalizeOptionalFooterText(meta.eyebrow);
  const description = normalizeOptionalFooterText(meta.description);
  const buildLabel = normalizeOptionalFooterText(meta.buildLabel);

  return {
    ...(eyebrow ? { eyebrow } : {}),
    siteName: normalizeRequiredFooterText(meta.siteName, 'meta.siteName'),
    siteUrl: normalizeFooterSiteHref(meta.siteUrl),
    ...(description ? { description } : {}),
    copyrightText: normalizeRequiredFooterText(meta.copyrightText, 'meta.copyrightText'),
    ...(buildLabel ? { buildLabel } : {}),
  };
};

export const renderFooterHtml = (
  options: FooterRenderOptions & { readonly idContext?: StaticRenderIdContext },
): string => {
  const idContext = options.idContext ?? createStaticRenderIdContext('layout:footer');
  const meta = normalizeFooterMeta(options.meta);
  const links = normalizeFooterLinks(options.links);
  const navLabel = resolveFooterNavLabel(options.a11y);
  const footerIdInput = normalizeOptionalFooterText(options.id);
  const footerId = footerIdInput ? idContext.reserveId('footer', footerIdInput) : undefined;
  const idAttribute = footerId ? ` id="${escapeHtmlAttribute(footerId)}"` : '';

  return `
    <footer${idAttribute} class="ui-footer" data-footer data-layout-footer>
      <div class="ui-footer__inner">
        <div class="ui-footer__meta">
          <div class="ui-footer__brand">
            ${meta.eyebrow ? `<p class="ui-footer__eyebrow">${escapeHtmlText(meta.eyebrow)}</p>` : ''}
            <p class="ui-footer__site">${renderFooterSiteName(meta.siteName, meta.siteUrl)}</p>
            ${
              meta.description
                ? `<p class="ui-footer__description">${escapeHtmlText(meta.description)}</p>`
                : ''
            }
          </div>
          <div class="ui-footer__subline">
            <div class="ui-footer__legal">
              <p class="ui-footer__copyright">${escapeHtmlText(meta.copyrightText)}</p>
              ${
                meta.buildLabel
                  ? `<p class="ui-footer__build">${escapeHtmlText(meta.buildLabel)}</p>`
                  : ''
              }
            </div>
            ${
              links.length > 0
                ? `<nav class="ui-footer__nav" aria-label="${escapeHtmlAttribute(
                    navLabel,
                  )}"><div class="ui-footer__nav-list">${links
                    .map((link) => renderFooterLink(link))
                    .join('')}</div></nav>`
                : ''
            }
          </div>
        </div>
      </div>
    </footer>
  `.trim();
};

export const renderDefaultLayoutFooterHtml = (
  buildLabel: string,
  options: { readonly idContext?: StaticRenderIdContext } = {},
): string =>
  renderFooterHtml(
    {
      ...buildLayoutFooterOptions({
        footerId: undefined,
        siteEyebrow: undefined,
        siteName: undefined,
        siteUrl: undefined,
        siteDescription: undefined,
        copyrightText: undefined,
        buildLabel,
        navLabel: undefined,
        linksJson: undefined,
      }),
      ...(options.idContext ? { idContext: options.idContext } : {}),
    },
  );
