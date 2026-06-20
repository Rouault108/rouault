import { detectUnsafeHref } from '../../../../shared/link/unsafe-href-detector.js';
import {
  STATIC_HEADER_ALLOWED_ELEMENTS,
  STATIC_HEADER_FORBIDDEN_ELEMENTS,
  STATIC_HEADER_ROOT_SELECTOR,
  STATIC_HEADER_SEARCH_TRIGGER_CONTRACT,
  STATIC_HEADER_SEARCH_TRIGGER_REQUIRED_ATTRIBUTES,
  isStaticHeaderAllowedAttribute,
  validateStaticHeaderRootAttributes,
} from '../../../../shared/navigation/static-header-contract.js';

export class StaticHeaderDomValidationError extends Error {
  override readonly name = 'StaticHeaderDomValidationError';
}

const fail = (message: string): never => {
  throw new StaticHeaderDomValidationError(`[static-header] ${message}`);
};

const requireNonEmptyAttribute = (element: Element, name: string): string => {
  const value = element.getAttribute(name);
  if (value === null || value.trim().length === 0) {
    fail(`search trigger ${name} is required.`);
  }
  return value as string;
};

const requireAttributeValue = (element: Element, name: string, expected: string): void => {
  const value = requireNonEmptyAttribute(element, name);
  if (value !== expected) {
    fail(`search trigger ${name} must be "${expected}".`);
  }
};

const requireFoundElement = (element: Element | null, message: string): Element => {
  if (element === null) {
    fail(message);
  }
  return element as Element;
};

const validateSearchTrigger = (trigger: Element): void => {
  const contract = STATIC_HEADER_SEARCH_TRIGGER_CONTRACT;
  if (!(trigger instanceof HTMLAnchorElement)) {
    fail('search trigger must be an <a>.');
  }
  if (!trigger.classList.contains(contract.className)) {
    fail(`search trigger class must include ${contract.className}.`);
  }

  for (const name of STATIC_HEADER_SEARCH_TRIGGER_REQUIRED_ATTRIBUTES) {
    requireNonEmptyAttribute(trigger, name);
  }

  requireAttributeValue(trigger, 'data-search-dialog-trigger', contract.dialogTrigger);
  requireAttributeValue(trigger, 'data-no-router', contract.noRouter);
  requireAttributeValue(trigger, 'data-link-kind', contract.linkKind);
  requireAttributeValue(trigger, 'data-link-surface', contract.linkSurface);
  requireAttributeValue(trigger, 'aria-haspopup', contract.ariaHasPopup);
  requireAttributeValue(trigger, 'aria-expanded', contract.initialAriaExpanded);
  requireAttributeValue(trigger, 'aria-label', contract.accessibleName);

  requireFoundElement(
    trigger.querySelector(`.${contract.iconClassName}`),
    'search trigger icon is required.',
  );

  const placeholder = requireFoundElement(
    trigger.querySelector(`.${contract.placeholderClassName}`),
    'search trigger placeholder is required.',
  );
  requireAttributeValue(placeholder, 'aria-hidden', 'true');
  if (placeholder.textContent !== contract.visibleLabel) {
    fail(`search trigger placeholder text must be "${contract.visibleLabel}".`);
  }
};

const validateSearchTriggerContract = (root: Element): void => {
  const className = STATIC_HEADER_SEARCH_TRIGGER_CONTRACT.className;
  const triggers = root.querySelectorAll(`.${className}`);
  if (triggers.length !== 1) {
    fail(`header must contain exactly one ${className} search trigger.`);
  }
  const trigger = triggers.item(0);
  validateSearchTrigger(trigger);
};

const validateElement = (element: Element): void => {
  const tagName = element.localName;
  if (
    STATIC_HEADER_FORBIDDEN_ELEMENTS.has(tagName) ||
    !STATIC_HEADER_ALLOWED_ELEMENTS.has(tagName)
  ) {
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
  validateStaticHeaderRootAttributes({
    sourceLabel: 'static-header:dom',
    readAttribute: (name) => root.getAttribute(name),
  });
  validateSearchTriggerContract(root);
  validateElement(root);
  for (const element of root.querySelectorAll('*')) {
    validateElement(element);
  }
};
