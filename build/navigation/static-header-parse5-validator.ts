import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import {
  STATIC_HEADER_ALLOWED_ELEMENTS,
  STATIC_HEADER_FORBIDDEN_ELEMENTS,
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
  validateElement(element);
  visit(element);
};

export const validateStaticHeaderHtmlFragment = (html: string): void => {
  const fragment = parse5.parseFragment(html);
  for (const child of fragment.childNodes) {
    visit(child);
  }
};
