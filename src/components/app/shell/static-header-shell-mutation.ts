import { STATIC_HEADER_ROOT_SELECTOR } from '../../../../shared/navigation/static-header-contract.js';
import { validateStaticHeaderDomTree } from './static-header-dom-validator.js';
import { THEME_UI_OPTIONS } from '../../../theme/theme-ui-options.js';
import { resolveStaticIconBody } from '../../../../shared/icons/icon-paths.js';

export interface PreparedStaticHeaderMutation {
  commit(): void;
  rollback(): void;
}

export const parseAndValidateStaticHeaderHtml = (html: string, document: Document): HTMLElement => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const meaningfulNodes = [...template.content.childNodes].filter(
    (node) =>
      node.nodeType !== Node.COMMENT_NODE &&
      !(node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === ''),
  );
  const header = meaningfulNodes[0];
  if (!(header instanceof HTMLElement) || !header.matches(STATIC_HEADER_ROOT_SELECTOR)) {
    throw new Error(`shell.headerHtml must contain one ${STATIC_HEADER_ROOT_SELECTOR}.`);
  }
  if (
    meaningfulNodes.length !== 1 ||
    template.content.querySelectorAll(STATIC_HEADER_ROOT_SELECTOR).length !== 1
  ) {
    throw new Error(`shell.headerHtml must contain exactly one ${STATIC_HEADER_ROOT_SELECTOR}.`);
  }
  validateStaticHeaderDomTree(header);
  return header;
};

export const readCanonicalStaticHeaderHtml = (header: HTMLElement): string => {
  // runtime属性をrollbackへ持ち込まず、initial validationと同じ正規形に戻す。
  const canonical = header.cloneNode(true) as HTMLElement;
  for (const name of ['data-sidebar-mode', 'data-sidebar-state', 'data-overlay-sidebar-open']) {
    canonical.removeAttribute(name);
  }
  for (const element of canonical.querySelectorAll<HTMLElement>('[tabindex], [inert], [style]')) {
    element.removeAttribute('tabindex');
    element.removeAttribute('inert');
    element.removeAttribute('style');
  }
  for (const menu of canonical.querySelectorAll('details[data-header-menu]')) {
    menu.removeAttribute('open');
    menu.querySelector('summary')?.setAttribute('aria-expanded', 'false');
  }
  const sidebar = canonical.querySelector<HTMLElement>('[data-layout-sidebar-toggle]');
  if (sidebar) {
    sidebar.hidden = true;
    sidebar.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-label', 'サイドバーを開く');
  }
  const toc = canonical.querySelector<HTMLElement>('[data-toc-trigger]');
  if (toc) {
    toc.removeAttribute('hidden');
    toc.removeAttribute('aria-disabled');
    toc.setAttribute('data-visible', 'false');
    toc.setAttribute('data-toc-trigger-interactive', 'false');
    toc.setAttribute('data-toc-hydration-state', 'unhydrated');
    toc.setAttribute('aria-expanded', 'false');
    toc.setAttribute('aria-label', '目次を開く');
    toc.setAttribute('aria-controls', toc.getAttribute('data-toc-static-root-id') ?? '');
  }
  const option = THEME_UI_OPTIONS.system;
  canonical
    .querySelector('[data-theme-switcher] summary')
    ?.setAttribute('aria-label', `テーマ: ${option.label}`);
  canonical
    .querySelector('[data-theme-preference]')
    ?.setAttribute('data-theme-preference', 'system');
  const label = canonical.querySelector('[data-theme-current-label]');
  if (label) label.textContent = option.label;
  const icon = canonical.querySelector('.theme-trigger-icon svg[data-icon]');
  if (icon) {
    icon.setAttribute('data-icon', option.icon);
    icon.innerHTML = resolveStaticIconBody(option.icon);
  }
  for (const item of canonical.querySelectorAll('[data-theme-value]')) {
    const selected = item.getAttribute('data-theme-value') === 'system';
    item.setAttribute('aria-pressed', String(selected));
    if (selected) item.setAttribute('data-selected', 'true');
    else item.removeAttribute('data-selected');
  }
  return parseAndValidateStaticHeaderHtml(canonical.outerHTML, header.ownerDocument).outerHTML;
};

export const prepareStaticHeaderMutation = (headerHtml: string): PreparedStaticHeaderMutation => {
  const currentHeader = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
  if (!(currentHeader instanceof HTMLElement)) {
    throw new Error(`current ${STATIC_HEADER_ROOT_SELECTOR} is required.`);
  }
  const nextHeader = parseAndValidateStaticHeaderHtml(headerHtml, document);
  const previousHeaderHtml = readCanonicalStaticHeaderHtml(currentHeader);

  return {
    commit() {
      currentHeader.replaceWith(nextHeader);
    },
    rollback() {
      const previousHeader = parseAndValidateStaticHeaderHtml(previousHeaderHtml, document);
      const current = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
      if (!(current instanceof HTMLElement)) {
        throw new Error(`current ${STATIC_HEADER_ROOT_SELECTOR} is required for rollback.`);
      }
      current.replaceWith(previousHeader);
    },
  };
};
