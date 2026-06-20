import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import {
  STATIC_HEADER_ALLOWED_ELEMENTS,
  STATIC_HEADER_FORBIDDEN_ELEMENTS,
  STATIC_HEADER_SEARCH_TRIGGER_CONTRACT,
  STATIC_HEADER_SEARCH_TRIGGER_REQUIRED_ATTRIBUTES,
  isStaticHeaderAllowedAttribute,
  validateStaticHeaderRootAttributes,
} from '../../shared/navigation/static-header-contract.js';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5ParentNode = DefaultTreeAdapterMap['parentNode'];

export class StaticHeaderParse5ValidationError extends Error {
  override readonly name = 'StaticHeaderParse5ValidationError';
}

const fail = (message: string): never => {
  throw new StaticHeaderParse5ValidationError(`[static-header] ${message}`);
};

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const isParentNode = (node: Parse5Node): node is Parse5ParentNode =>
  Array.isArray((node as { childNodes?: unknown }).childNodes);

const attr = (element: Parse5Element, name: string): string | null =>
  element.attrs.find((item) => item.name === name)?.value ?? null;

const classListContains = (element: Parse5Element, className: string): boolean =>
  (attr(element, 'class') ?? '').split(/\s+/u).includes(className);

const elementChildren = (element: Parse5Element): readonly Parse5Element[] => {
  if (!isParentNode(element)) {
    return [];
  }
  return element.childNodes.filter(isElementNode);
};

const descendantElements = (element: Parse5Element): Parse5Element[] => {
  const descendants: Parse5Element[] = [];
  for (const child of elementChildren(element)) {
    descendants.push(child, ...descendantElements(child));
  }
  return descendants;
};

const directTextContent = (element: Parse5Element): string => {
  if (!isParentNode(element)) {
    return '';
  }
  return element.childNodes
    .map((node) => ('value' in node && typeof node.value === 'string' ? node.value : ''))
    .join('');
};

const requireNonEmptyAttribute = (element: Parse5Element, name: string): string => {
  const value = attr(element, name);
  if (value === null || value.trim().length === 0) {
    fail(`search trigger ${name} is required.`);
  }
  return value ?? '';
};

const requireAttributeValue = (element: Parse5Element, name: string, expected: string): void => {
  const value = requireNonEmptyAttribute(element, name);
  if (value !== expected) {
    fail(`search trigger ${name} must be "${expected}".`);
  }
};

const requireFoundElement = (
  element: Parse5Element | undefined,
  message: string,
): Parse5Element => {
  if (element === undefined) {
    fail(message);
  }
  return element as Parse5Element;
};

const validateSearchTrigger = (trigger: Parse5Element): void => {
  const contract = STATIC_HEADER_SEARCH_TRIGGER_CONTRACT;
  if (trigger.tagName !== 'a') {
    fail('search trigger must be an <a>.');
  }
  if (!classListContains(trigger, contract.className)) {
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

  const descendants = descendantElements(trigger);
  requireFoundElement(
    descendants.find((element) => classListContains(element, contract.iconClassName)),
    'search trigger icon is required.',
  );

  const placeholder = requireFoundElement(
    descendants.find((element) => classListContains(element, contract.placeholderClassName)),
    'search trigger placeholder is required.',
  );
  requireAttributeValue(placeholder, 'aria-hidden', 'true');
  if (directTextContent(placeholder) !== contract.visibleLabel) {
    fail(`search trigger placeholder text must be "${contract.visibleLabel}".`);
  }
};

const validateSearchTriggerContract = (header: Parse5Element): void => {
  const className = STATIC_HEADER_SEARCH_TRIGGER_CONTRACT.className;
  const triggers = descendantElements(header).filter((element) =>
    classListContains(element, className),
  );
  if (triggers.length !== 1) {
    fail(`header must contain exactly one ${className} search trigger.`);
  }
  const trigger = requireFoundElement(
    triggers[0],
    `header must contain exactly one ${className} search trigger.`,
  );
  validateSearchTrigger(trigger);
};

const validateElement = (element: Parse5Element): void => {
  const tagName = element.tagName;
  if (
    STATIC_HEADER_FORBIDDEN_ELEMENTS.has(tagName) ||
    !STATIC_HEADER_ALLOWED_ELEMENTS.has(tagName)
  ) {
    fail(`element <${tagName}> is not allowed.`);
  }
  if (tagName === 'header' && attr(element, 'data-layout-header') !== null) {
    validateStaticHeaderRootAttributes({
      sourceLabel: 'static-header:parse5',
      readAttribute: (name) => attr(element, name),
    });
    validateSearchTriggerContract(element);
  }

  for (const attribute of element.attrs) {
    const name = attribute.name;
    if (!isStaticHeaderAllowedAttribute(tagName, name)) {
      fail(`attribute ${name} is not allowed on <${tagName}>.`);
    }
    if ((name === 'href' || name === 'xlink:href') && tagName !== 'a') {
      fail(`URL attribute ${name} is not allowed on <${tagName}>.`);
    }
    if (tagName === 'a' && name === 'href') {
      const unsafe = detectUnsafeHref(attribute.value);
      if (!unsafe.ok) {
        fail(`unsafe href is forbidden: ${unsafe.reason}.`);
      }
    }
  }

  if (tagName === 'a' && (attr(element, 'href') ?? '').trim().length === 0) {
    fail('anchor href is required.');
  }
};

const visit = (node: Parse5Node): void => {
  if (isElementNode(node)) {
    validateElement(node);
  }
  if (!isParentNode(node)) {
    return;
  }
  for (const child of node.childNodes) {
    visit(child);
  }
};

export const validateStaticHeaderParse5Tree = (element: Parse5Element): void => {
  visit(element);
};

export const validateStaticHeaderHtmlFragment = (html: string): void => {
  const fragment = parse5.parseFragment(html);
  for (const child of fragment.childNodes) {
    visit(child);
  }
};
