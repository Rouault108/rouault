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
  eyebrow?: string;
  siteName: string;
  siteUrl?: string;
  description?: string;
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
  eyebrow?: string;
  siteName: string;
  siteUrl?: string;
  description?: string;
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
  --_footer-max-inline-size: var(--footer-max-inline-size, var(--bp-lg, 72rem));
  --_footer-padding-block: var(--footer-padding-block, clamp(var(--space-5), 2.8vw, var(--space-7)));
  --_footer-padding-inline: var(--footer-padding-inline, max(var(--space-4), min(var(--space-7), 4vi)));
  --_footer-gap: var(--footer-gap, clamp(var(--space-3), 1.4vw, var(--space-4)));
  --_footer-column-gap: var(--footer-column-gap, clamp(var(--space-4), 2vw, var(--space-5)));
  --_footer-primary-max-inline-size: var(--footer-primary-max-inline-size, 40rem);
  --_footer-nav-inline-size: var(--footer-nav-inline-size, 12rem);
  --_footer-build-opacity: var(--footer-build-opacity, 0.58);
  --_footer-link-underline-offset: var(--footer-link-underline-offset, 0.16em);
  --_footer-kicker-fg: var(--footer-kicker-fg, var(--fg-subtle, var(--fg-muted)));
  --_footer-description-fg: var(--footer-description-fg, var(--fg-muted));
  --_footer-legal-gap: var(--footer-legal-gap, var(--space-2));
  inline-size: 100%;
  background: var(--_footer-bg);
  border-top: var(--_footer-border-width) solid var(--_footer-border);
  color: var(--_footer-fg);
  padding-block: var(--_footer-padding-block);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__inner {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: var(--_footer-gap);
  inline-size: 100%;
  max-inline-size: var(--_footer-max-inline-size);
  margin-block: var(--space-3, 12px);
  margin-inline: auto;
  padding-inline: var(--_footer-padding-inline);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__meta {
  display: grid;
  gap: var(--space-1);
  min-inline-size: 0;
  max-inline-size: none;
  margin-top: 0;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__brand {
  display: grid;
  gap: var(--space-1);
  min-inline-size: 0;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__subline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0;
  min-inline-size: 0;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__eyebrow,
${FOOTER_SCOPE_SELECTOR} .ui-footer__site,
${FOOTER_SCOPE_SELECTOR} .ui-footer__description,
${FOOTER_SCOPE_SELECTOR} .ui-footer__copyright,
${FOOTER_SCOPE_SELECTOR} .ui-footer__build {
  margin: 0;
  overflow-wrap: anywhere;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__eyebrow {
  color: var(--_footer-kicker-fg);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  line-height: var(--line-height-tight);
  text-transform: uppercase;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__site {
  color: var(--_footer-fg);
  font-weight: var(--font-medium);
  font-size: clamp(var(--text-base, 1rem), 1vw, var(--text-xl, 1.25rem));
  letter-spacing: var(--tracking-tight);
  line-height: 1.2;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__description {
  color: var(--_footer-description-fg);
  max-inline-size: 34ch;
  font-size: var(--text-sm);
  line-height: var(--line-height-relaxed);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__legal {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  min-inline-size: 0;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__copyright {
  color: var(--_footer-fg);
  font-size: var(--text-sm);
  line-height: var(--line-height-relaxed);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__build {
  color: var(--_footer-fg-muted);
  opacity: var(--_footer-build-opacity);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  line-height: var(--line-height-tight);
  text-transform: uppercase;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__build::before,
${FOOTER_SCOPE_SELECTOR} .ui-footer__nav::before,
${FOOTER_SCOPE_SELECTOR} .ui-footer__nav-item + .ui-footer__nav-item::before {
  content: '·';
  color: var(--_footer-fg-muted);
  opacity: var(--_footer-build-opacity);
  margin-inline: var(--space-2);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__nav {
  min-inline-size: 0;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  padding-top: 0;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__nav-list {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__nav-item {
  display: inline-flex;
  align-items: baseline;
}

${FOOTER_SCOPE_SELECTOR} a {
  color: inherit;
  text-decoration-color: transparent;
  text-decoration-thickness: from-font;
  text-underline-offset: var(--_footer-link-underline-offset);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__site a {
  text-decoration: none;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__site a:hover,
${FOOTER_SCOPE_SELECTOR} .ui-footer__site a:focus-visible {
  color: inherit;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__site a:focus-visible {
  outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, currentColor);
  outline-offset: 3px;
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__nav a {
  color: var(--_footer-fg);
  font-size: var(--text-sm);
  line-height: var(--line-height-relaxed);
}

${FOOTER_SCOPE_SELECTOR} .ui-footer__nav a[data-external='true']::after {
  content: '↗';
  display: inline-block;
  margin-inline-start: 0.28em;
  color: var(--_footer-fg-muted);
  font-size: 0.78em;
  line-height: 1;
  text-decoration: none;
  vertical-align: 0.08em;
}

${FOOTER_SCOPE_SELECTOR} a:hover,
${FOOTER_SCOPE_SELECTOR} a:focus-visible {
  text-decoration-color: currentColor;
}

@media (min-width: 64rem) {
  ${FOOTER_SCOPE_SELECTOR} .ui-footer__inner {
    gap: var(--space-3);
  }
}

@media (forced-colors: active) {
  ${FOOTER_SCOPE_SELECTOR} {
    border-top-color: CanvasText;
    color: CanvasText;
  }

  ${FOOTER_SCOPE_SELECTOR} a {
    text-decoration-color: currentColor;
  }

  ${FOOTER_SCOPE_SELECTOR} .ui-footer__site a:focus-visible {
    outline-color: CanvasText;
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

const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      return false;
    }

    return (codePoint >= 0 && codePoint <= 31) || (codePoint >= 127 && codePoint <= 159);
  });

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
  const eyebrow = normalizeOptionalText(meta.eyebrow);
  const description = normalizeOptionalText(meta.description);

  return {
    ...(eyebrow ? { eyebrow } : {}),
    siteName,
    ...(siteUrl ? { siteUrl } : {}),
    ...(description ? { description } : {}),
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
  <span class="ui-footer__nav-item">
    <a
      href=${link.href}
      rel=${ifDefined(link.external ? 'noreferrer' : undefined)}
      data-external=${ifDefined(link.external ? 'true' : undefined)}
      data-link-kind=${link.external ? 'external-web' : 'internal-document'}
      data-link-surface="ui"
      aria-label=${ifDefined(link.external ? `${link.label}（外部サイト）` : undefined)}
      >${link.label}</a
    >
  </span>
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
          <div class="ui-footer__brand">
            ${meta.eyebrow ? html`<p class="ui-footer__eyebrow">${meta.eyebrow}</p>` : nothing}
            <p class="ui-footer__site">${renderSiteName(meta)}</p>
            ${meta.description
              ? html`<p class="ui-footer__description">${meta.description}</p>`
              : nothing}
          </div>

          <div class="ui-footer__subline">
            <div class="ui-footer__legal">
              <p class="ui-footer__copyright">${meta.copyrightText}</p>
              ${meta.buildLabel ? html`<p class="ui-footer__build">${meta.buildLabel}</p>` : nothing}
            </div>

            ${links.length > 0
              ? html`
                  <nav class="ui-footer__nav" aria-label=${navLabel}>
                    <div class="ui-footer__nav-list">
                      ${links.map((link) => renderFooterLink(link))}
                    </div>
                  </nav>
                `
              : nothing}
          </div>
        </div>
      </div>
    </footer>
  `;
};