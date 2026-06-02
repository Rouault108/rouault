import { STATIC_HEADER_ROOT_SELECTOR } from '../../../../shared/navigation/static-header-contract.js';
import { validateStaticHeaderDomTree } from './static-header-dom-validator.js';

export interface PreparedStaticHeaderMutation {
  commit(): void;
  rollback(): void;
}

const parseStaticHeaderHtml = (html: string, document: Document): HTMLElement => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const header = template.content.querySelector(STATIC_HEADER_ROOT_SELECTOR);
  if (!(header instanceof HTMLElement) || header.parentElement !== null) {
    throw new Error(`shell.headerHtml must contain one ${STATIC_HEADER_ROOT_SELECTOR}.`);
  }
  if (template.content.querySelectorAll(STATIC_HEADER_ROOT_SELECTOR).length !== 1) {
    throw new Error(`shell.headerHtml must contain exactly one ${STATIC_HEADER_ROOT_SELECTOR}.`);
  }
  validateStaticHeaderDomTree(header);
  return header;
};

export const prepareStaticHeaderMutation = (headerHtml: string): PreparedStaticHeaderMutation => {
  const currentHeader = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
  const nextHeader = parseStaticHeaderHtml(headerHtml, document);
  const previousHeader = currentHeader?.cloneNode(true);

  return {
    commit() {
      if (currentHeader instanceof HTMLElement) {
        currentHeader.replaceWith(nextHeader);
        return;
      }
      const app = document.querySelector('#app');
      if (!(app instanceof HTMLElement)) {
        throw new Error('app shell root is required to insert static header.');
      }
      app.prepend(nextHeader);
    },
    rollback() {
      if (!(previousHeader instanceof HTMLElement)) {
        nextHeader.remove();
        return;
      }
      const current = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
      if (current instanceof HTMLElement) {
        current.replaceWith(previousHeader);
        return;
      }
      const app = document.querySelector('#app');
      if (app instanceof HTMLElement) {
        app.prepend(previousHeader);
      }
    },
  };
};
