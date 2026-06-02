import { detectUnsafeHref } from '../../../../shared/link/unsafe-href-detector.js';
import {
  STATIC_HEADER_ALLOWED_ELEMENTS,
  STATIC_HEADER_FORBIDDEN_ELEMENTS,
  STATIC_HEADER_ROOT_SELECTOR,
  isStaticHeaderAllowedAttribute,
} from '../../../../shared/navigation/static-header-contract.js';

export class StaticHeaderDomValidationError extends Error {
  override readonly name = 'StaticHeaderDomValidationError';
}

const fail = (message: string): never => {
  throw new StaticHeaderDomValidationError(`[static-header] ${message}`);
};

const validateElement = (element: Element): void => {
  const tagName = element.localName;
  if (STATIC_HEADER_FORBIDDEN_ELEMENTS.has(tagName) || !STATIC_HEADER_ALLOWED_ELEMENTS.has(tagName)) {
    fail(`element <${tagName}> is not allowed.`);
  }

  for (const attribute of [...element.attributes]) {
    if (!isStaticHeaderAllowedAttribute(tagName, attribute.name)) {
      fail(`attribute ${attribute.name} is not allowed on <${tagName}>.`);
    }
    if ((attribute.name === 'href' || attribute.name === 'xlink:href') && tagName !== 'a') {
      fail(`URL attribute ${attribute.name} is not allowed on <${tagName}>.`);
    }
  }

  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute('href');
    if (href === null || href.trim().length === 0) {
      fail('anchor href is required.');
    }
    const unsafe = detectUnsafeHref(href);
    if (!unsafe.ok) {
      fail(`unsafe href is forbidden: ${unsafe.reason}.`);
    }
  }
};

export const validateStaticHeaderDomTree = (root: Element): void => {
  if (!(root instanceof HTMLElement) || !root.matches(STATIC_HEADER_ROOT_SELECTOR)) {
    fail(`root must match ${STATIC_HEADER_ROOT_SELECTOR}.`);
  }
  validateElement(root);
  for (const element of root.querySelectorAll('*')) {
    validateElement(element);
  }
};
