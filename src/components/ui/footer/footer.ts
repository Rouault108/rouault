import { html, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

declare const __GIT_HASH__: string | undefined;

export const FOOTER_DOCUMENT_STYLE_ID = 'ui-footer-document-styles';
export const FOOTER_SCOPE_SELECTOR = '.ui-footer';
export const FOOTER_DEFAULT_APP_NAME = 'Rouault';
export const FOOTER_DEFAULT_REVISION = 'dev';

const VALID_REVISION_PATTERN = /^[0-9a-f]{7,40}$/i;

export interface UiFooterRenderOptions {
  id?: string;
  revision?: string;
  year?: number;
}

export interface UiFooterData {
  appName: string;
  revision: string;
  year: number;
}

export const FOOTER_DOCUMENT_CSS = `
${FOOTER_SCOPE_SELECTOR} {
  position: static;
  inline-size: 100%;
  block-size: var(--header-height);
  background: var(--bg-default);
  border-top: var(--border-width) solid var(--border-ghost);
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: var(--tracking-wide);
}

${FOOTER_SCOPE_SELECTOR} .footer-content {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  inline-size: 100%;
  block-size: 100%;
  max-inline-size: var(--bp-xl);
  margin-inline: auto;
  padding-block: var(--space-5);
  padding-inline: max(var(--space-4), min(var(--space-8), 4vi));
}

${FOOTER_SCOPE_SELECTOR} .separator {
  opacity: var(--separator-opacity, 0.3);
}

${FOOTER_SCOPE_SELECTOR} .copyright {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

${FOOTER_SCOPE_SELECTOR} .copyright iconify-icon {
  font-size: 0.75em;
  flex: none;
}

@media (forced-colors: active) {
  ${FOOTER_SCOPE_SELECTOR} {
    border-top: var(--border-width) solid CanvasText;
  }
}

@media print {
  ${FOOTER_SCOPE_SELECTOR} {
    display: none !important;
  }
}
`;

const normalizeRevisionValue = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
};

const sanitizeRevisionValue = (value: string): string => {
  const normalized = normalizeRevisionValue(value);
  if (normalized === FOOTER_DEFAULT_REVISION) {
    return FOOTER_DEFAULT_REVISION;
  }
  return VALID_REVISION_PATTERN.test(normalized)
    ? normalized
    : FOOTER_DEFAULT_REVISION;
};

const resolveBuildRevision = (): string | undefined => {
  if (typeof __GIT_HASH__ !== 'string') {
    return undefined;
  }

  const normalized = normalizeRevisionValue(__GIT_HASH__);
  return normalized.length > 0 ? normalized : undefined;
};

export const resolveFooterYear = (year?: number): number => {
  if (typeof year === 'number' && Number.isFinite(year) && year >= 1) {
    return Math.trunc(year);
  }
  return new Date().getFullYear();
};

export const resolveFooterRevision = (revision?: string): string => {
  const source =
    typeof revision === 'string'
      ? revision
      : (resolveBuildRevision() ?? FOOTER_DEFAULT_REVISION);
  return sanitizeRevisionValue(source);
};

export const buildFooterData = (
  options: UiFooterRenderOptions = {},
): UiFooterData => {
  const year = resolveFooterYear(options.year);
  const resolvedRevision = resolveFooterRevision(options.revision);

  return {
    appName: FOOTER_DEFAULT_APP_NAME,
    revision: `#${resolvedRevision}`,
    year,
  };
};

export const ensureFooterDocumentStyles = (): void => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FOOTER_DOCUMENT_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = FOOTER_DOCUMENT_STYLE_ID;
  style.textContent = FOOTER_DOCUMENT_CSS;
  document.head.appendChild(style);
};

export const renderFooter = (
  options: UiFooterRenderOptions = {},
): TemplateResult => {
  ensureFooterDocumentStyles();

  const data = buildFooterData(options);
  const footerId = options.id?.trim();

  return html`
    <footer id=${ifDefined(footerId)} class="ui-footer">
      <div class="footer-content">
        <span class="copyright">
          <iconify-icon icon="lucide:copyright" aria-hidden="true"></iconify-icon>
          <span>${data.year.toString()} ${data.appName}</span>
        </span>
        <span class="separator" aria-hidden="true">·</span>
        <span class="revision">${data.revision}</span>
      </div>
    </footer>
  `;
};

ensureFooterDocumentStyles();
