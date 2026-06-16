import { STATIC_HEADER_ROOT_SELECTOR } from '../../../../shared/navigation/static-header-contract.js';
import { validateStaticHeaderDomTree } from './static-header-dom-validator.js';

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

export const prepareStaticHeaderMutation = (headerHtml: string): PreparedStaticHeaderMutation => {
  const currentHeader = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
  if (!(currentHeader instanceof HTMLElement)) {
    throw new Error(`current ${STATIC_HEADER_ROOT_SELECTOR} is required.`);
  }
  const nextHeader = parseAndValidateStaticHeaderHtml(headerHtml, document);
  const previousHeaderHtml = currentHeader.outerHTML;

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
