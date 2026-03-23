import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

export const FOOTER_DOCUMENT_STYLE_ID = 'ui-footer-document-styles';
export const FOOTER_SCOPE_SELECTOR = '.ui-footer';
export const FOOTER_DEFAULT_NAV_LABEL = '補助ナビゲーション';

const EXTERNAL_PROTOCOL_PATTERN = /^(https?:|mailto:|tel:)/iu;
const INTERNAL_REFERENCE_PATTERN = /^(\/|\.\/|\.\.\/|#|\?)/u;
const FORBIDDEN_PROTOCOL_PATTERN = /^(javascript:|data:|vbscript:)/iu;

export interface FooterLinkItem {
  href: string;
  label: string;
  external?: boolean;
}

export interface FooterMetaContent {
  siteName: string;
  siteUrl?: string;
  copyrightText: string;
  buildLabel?: string;
}

export interface FooterA11yLabels {
  navLabel: string;
}

export interface FooterRenderOptions {
  id?: string;
  meta: FooterMetaContent;
  links?: readonly FooterLinkItem[];
  a11y?: Partial<FooterA11yLabels>;
}

export interface NormalizedFooterLinkItem {
  href: string;
  label: string;
  external: boolean;
}

export interface NormalizedFooterMetaContent {
  siteName: string;
  siteUrl?: string;
  copyrightText: string;
  buildLabel?: string;
}

export const FOOTER_DOCUMENT_CSS = `
${FOOTER_SCOPE_SELECTOR} {
  --_footer-bg: var(--footer-bg, var(--bg-default));
  --_footer-fg: var(--footer-fg, var(--fg-muted));
  --_footer-fg-muted: var(--footer-fg-muted, var(--fg-subtle, var(--fg-muted)));
  --_footer-border: var(--footer-border, var(--border-ghost));
  --_footer-border-width: var(--footer-border-width, var(--border-width));
  --_footer-max-inline-size: var(--footer-max-inline-size, var(--bp-xl));
  --_footer-padding-block: var(--footer-padding-block, var(--space-5));
  --_footer-padding-inline: var(--footer-padding-inline, max(var(--space-4), min(var(--space-8), 4vi)));
  --_footer-gap: var(--footer-gap, var(--space-4));
  --_footer-build-opacity: var(--footer-build-opacity, 0.72);
  --_footer-link-underline-offset: var(--footer-link-underline-offset, 0.2em);
  inline-size: 100%;
  min-block-size: calc(var(--_footer-padding-block) * 2 + 1lh);
  background: var(--_footer-bg);
  border-top: var(--_footer-border-width) solid var(--_footer-border);
  color: var(--_footer-fg);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__inner {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--_footer-gap);
  inline-size: 100%;
  max-inline-size: var(--_footer-max-inline-size);
  margin-inline: auto;
  padding-block: var(--_footer-padding-block);
  padding-inline: var(--_footer-padding-inline);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__meta {
  display: grid;
  gap: calc(var(--_footer-gap) * 0.5);
  min-inline-size: min(100%, 18rem);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__site,
${FOOTER_SCOPE_SELECTOR} .ui-footer__copyright,
${FOOTER_SCOPE_SELECTOR} .ui-footer__build {
  margin: 0;
  overflow-wrap: anywhere;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__site {
  color: var(--footer-fg, var(--fg-default));
  font-weight: var(--font-medium);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__copyright {
  color: var(--_footer-fg);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__build {
  color: var(--_footer-fg-muted);
  opacity: var(--_footer-build-opacity);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: calc(var(--_footer-gap) * 0.5) var(--_footer-gap);
  min-inline-size: min(100%, 16rem);
}

${FOOTER_SCOPE_SELECTOR} a {
  color: inherit;
  text-decoration-color: transparent;
  text-decoration-thickness: from-font;
  text-underline-offset: var(--_footer-link-underline-offset);
}

${FOOTER_SCOPE_SELECTOR} a:hover,
${FOOTER_SCOPE_SELECTOR} a:focus-visible {
  text-decoration-color: currentColor;
}

@media (forced-colors: active) {
  ${FOOTER_SCOPE_SELECTOR} {
    border-top-color: CanvasText;
    color: CanvasText;
  }

  ${FOOTER_SCOPE_SELECTOR} a {
    text-decoration-color: currentColor;
  }
}

@media print {
  ${FOOTER_SCOPE_SELECTOR} {
    display: none !important;
  }
}
`;

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeRequiredText = (value: string, fieldName: string): string => {
  const normalized = normalizeOptionalText(value);
  if (normalized === undefined) {
    throw new Error(`${fieldName} は trim 後に空文字列であってはなりません`);
  }
  return normalized;
};

export const isFooterHrefAllowed = (value: string | undefined): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (hasControlCharacter(trimmed)) {
    return false;
  }
  if (FORBIDDEN_PROTOCOL_PATTERN.test(trimmed)) {
    return false;
  }

  return EXTERNAL_PROTOCOL_PATTERN.test(trimmed) || INTERNAL_REFERENCE_PATTERN.test(trimmed);
};

export const isFooterExternalHref = (href: string): boolean => EXTERNAL_PROTOCOL_PATTERN.test(href);

export const normalizeFooterLinkItem = (
  item: FooterLinkItem,
): NormalizedFooterLinkItem | undefined => {
  const label = normalizeOptionalText(item.label);
  if (!label || !isFooterHrefAllowed(item.href)) {
    return undefined;
  }

  const href = item.href.trim();
  return {
    href,
    label,
    external: typeof item.external === 'boolean' ? item.external : isFooterExternalHref(href),
  };
};

export const normalizeFooterLinks = (
  links: readonly FooterLinkItem[] | undefined,
): readonly NormalizedFooterLinkItem[] => {
  if (!links || links.length === 0) {
    return [];
  }

  return links.flatMap((item) => {
    const normalized = normalizeFooterLinkItem(item);
    return normalized ? [normalized] : [];
  });
};

export const normalizeFooterMeta = (meta: FooterMetaContent): NormalizedFooterMetaContent => {
  const siteName = normalizeRequiredText(meta.siteName, 'meta.siteName');
  const copyrightText = normalizeRequiredText(meta.copyrightText, 'meta.copyrightText');
  const siteUrl = isFooterHrefAllowed(meta.siteUrl) ? meta.siteUrl.trim() : undefined;
  const buildLabel = normalizeOptionalText(meta.buildLabel);

  return {
    siteName,
    ...(siteUrl ? { siteUrl } : {}),
    copyrightText,
    ...(buildLabel ? { buildLabel } : {}),
  };
};

export const resolveFooterNavLabel = (a11y?: Partial<FooterA11yLabels>): string =>
  normalizeOptionalText(a11y?.navLabel) ?? FOOTER_DEFAULT_NAV_LABEL;

export const ensureFooterDocumentStyles = (): void => {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(FOOTER_DOCUMENT_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = FOOTER_DOCUMENT_STYLE_ID;
  style.textContent = FOOTER_DOCUMENT_CSS;
  document.head.appendChild(style);
};

const renderSiteName = (meta: NormalizedFooterMetaContent): TemplateResult =>
  meta.siteUrl ? html`<a href=${meta.siteUrl}>${meta.siteName}</a>` : html`${meta.siteName}`;

const renderFooterLink = (link: NormalizedFooterLinkItem): TemplateResult => html`
  <a
    href=${link.href}
    rel=${ifDefined(link.external ? 'noreferrer' : undefined)}
    data-external=${ifDefined(link.external ? 'true' : undefined)}
    >${link.label}</a
  >
`;

export const renderFooter = (options: FooterRenderOptions): TemplateResult => {
  const footerId = normalizeOptionalText(options.id);
  const meta = normalizeFooterMeta(options.meta);
  const links = normalizeFooterLinks(options.links);
  const navLabel = resolveFooterNavLabel(options.a11y);

  return html`
    <footer id=${ifDefined(footerId)} class="ui-footer">
      <div class="ui-footer__inner">
        <div class="ui-footer__meta">
          <p class="ui-footer__site">${renderSiteName(meta)}</p>
          <p class="ui-footer__copyright">${meta.copyrightText}</p>
          ${meta.buildLabel ? html`<p class="ui-footer__build">${meta.buildLabel}</p>` : nothing}
        </div>
        ${links.length > 0
          ? html`
              <nav class="ui-footer__nav" aria-label=${navLabel}>
                ${links.map((link) => renderFooterLink(link))}
              </nav>
            `
          : nothing}
      </div>
    </footer>
  `;
};
const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      return false;
    }

    return (codePoint >= 0 && codePoint <= 31) || (codePoint >= 127 && codePoint <= 159);
  });
