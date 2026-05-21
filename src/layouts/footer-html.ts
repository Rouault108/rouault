import {
  type FooterRenderOptions,
  normalizeFooterLinks,
  normalizeFooterMeta,
  resolveFooterLinkKind,
  resolveFooterNavLabel,
} from '../components/ui/footer/footer.js';
import { escapeHtmlAttribute, escapeHtmlText } from './html-output.js';
import { buildLayoutFooterOptions } from './footer-options.js';

const renderFooterSiteName = (meta: ReturnType<typeof normalizeFooterMeta>): string => {
  if (!meta.siteUrl) {
    return escapeHtmlText(meta.siteName);
  }

  const kind = resolveFooterLinkKind(meta.siteUrl);
  const externalAttribute = kind === 'external-web' ? ' data-external="true"' : '';
  return `<a href="${escapeHtmlAttribute(meta.siteUrl)}" data-link-kind="${kind}" data-link-surface="navigation"${externalAttribute}>${escapeHtmlText(
    meta.siteName,
  )}</a>`;
};

const renderFooterLink = (link: ReturnType<typeof normalizeFooterLinks>[number]): string => {
  const externalAttribute = link.kind === 'external-web' ? ' data-external="true"' : '';
  const relAttribute = link.kind === 'external-web' ? ' rel="noreferrer"' : '';
  const ariaLabelAttribute = link.external
    ? ` aria-label="${escapeHtmlAttribute(`${link.label}（外部サイト）`)}"`
    : '';

  return `<span class="ui-footer__nav-item"><a href="${escapeHtmlAttribute(
    link.href,
  )}"${relAttribute}${externalAttribute} data-link-kind="${link.kind}" data-link-surface="navigation"${ariaLabelAttribute}>${escapeHtmlText(
    link.label,
  )}</a></span>`;
};

export const renderFooterHtml = (options: FooterRenderOptions): string => {
  const meta = normalizeFooterMeta(options.meta);
  const links = normalizeFooterLinks(options.links);
  const navLabel = resolveFooterNavLabel(options.a11y);
  const idAttribute = options.id ? ` id="${escapeHtmlAttribute(options.id)}"` : '';

  return `
    <footer${idAttribute} class="ui-footer" data-layout-footer>
      <div class="ui-footer__inner">
        <div class="ui-footer__meta">
          <div class="ui-footer__brand">
            ${meta.eyebrow ? `<p class="ui-footer__eyebrow">${escapeHtmlText(meta.eyebrow)}</p>` : ''}
            <p class="ui-footer__site">${renderFooterSiteName(meta)}</p>
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

export const renderDefaultLayoutFooterHtml = (buildLabel: string): string =>
  renderFooterHtml(
    buildLayoutFooterOptions({
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
  );
