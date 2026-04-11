import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import {
  APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC,
  APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE,
  APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE,
  APP_ROUTER_ANNOUNCEMENT_CLASS_NAME,
} from '../../shared/app-router/app-router-announcement-contract.js';
import {
  MAIN_CONTENT_ID,
  MAIN_CONTENT_TABINDEX,
} from '../../shared/navigation/main-landmark-contract.js';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5ChildNode = DefaultTreeAdapterMap['childNode'];
type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];

const createFragmentNode = (childNodes: Parse5ChildNode[]): Parse5DocumentFragment => ({
  nodeName: '#document-fragment',
  childNodes,
});

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const getAttributeIndex = (element: Parse5Element, name: string): number =>
  element.attrs.findIndex((attribute) => attribute.name === name);

const getAttributeValue = (element: Parse5Element, name: string): string | null => {
  const attribute = element.attrs.find((candidate) => candidate.name === name);
  return attribute?.value ?? null;
};

const setAttribute = (element: Parse5Element, name: string, value: string): void => {
  const attributeIndex = getAttributeIndex(element, name);

  if (attributeIndex >= 0) {
    element.attrs[attributeIndex] = { name, value };
    return;
  }

  element.attrs.push({ name, value });
};

const appendClassName = (element: Parse5Element, className: string): void => {
  const classValue = getAttributeValue(element, 'class');
  if (classValue === null) {
    setAttribute(element, 'class', className);
    return;
  }

  const classNames = classValue
    .split(/\s+/u)
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);
  if (!classNames.includes(className)) {
    classNames.push(className);
  }

  setAttribute(element, 'class', classNames.join(' '));
};

const isAnnouncementRegion = (element: Parse5Element): boolean =>
  getAttributeIndex(element, APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE) >= 0;

const createAnnouncementRegion = (): Parse5Element => {
  const fragment = parse5.parseFragment('<div></div>');
  const region = fragment.childNodes[0];
  if (region === undefined || !isElementNode(region) || region.tagName !== 'div') {
    throw new Error('app-router announcement region を生成できませんでした。');
  }

  setAttribute(region, APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE, '');
  setAttribute(region, 'aria-live', APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE);
  setAttribute(region, 'aria-atomic', APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC);
  setAttribute(region, 'class', APP_ROUTER_ANNOUNCEMENT_CLASS_NAME);
  return region;
};

const createCanonicalMain = (contentNodes: readonly Parse5ChildNode[]): Parse5Element => {
  const mainFragment = parse5.parseFragment('<main></main>');
  const main = mainFragment.childNodes[0];
  if (main === undefined || !isElementNode(main) || main.tagName !== 'main') {
    throw new Error('app-router canonical main を生成できませんでした。');
  }

  main.childNodes = [...contentNodes];
  for (const childNode of main.childNodes) {
    childNode.parentNode = main;
  }

  return main;
};

const ensureCanonicalMainAttributes = (main: Parse5Element): void => {
  setAttribute(main, 'id', MAIN_CONTENT_ID);
  setAttribute(main, 'tabindex', MAIN_CONTENT_TABINDEX);
};

const summarizeHtml = (html: string): string => {
  const normalized = html.replace(/\s+/gu, ' ').trim();
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 157)}...`;
};

const createContractViolationError = (message: string, html: string): Error =>
  new Error(`${message} Input: ${summarizeHtml(html)}`);

export const normalizeAppRouterLightDom = (innerHtml: string): string => {
  const fragment = parse5.parseFragment(innerHtml);
  const directChildElements = fragment.childNodes.filter((node) => isElementNode(node));
  const directChildMains = directChildElements.filter((node) => node.tagName === 'main');
  const announcementRegions = directChildElements.filter(isAnnouncementRegion);

  if (directChildMains.length > 1) {
    throw createContractViolationError(
      'app-router SSR は direct child の <main> を 1 つまでしか許可しません。',
      innerHtml,
    );
  }

  if (announcementRegions.length > 1) {
    throw createContractViolationError(
      'app-router SSR は direct child の announcement region を 1 つまでしか許可しません。',
      innerHtml,
    );
  }

  const announcementRegion = announcementRegions[0] ?? createAnnouncementRegion();
  setAttribute(announcementRegion, APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE, '');
  setAttribute(announcementRegion, 'aria-live', APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE);
  setAttribute(announcementRegion, 'aria-atomic', APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC);
  appendClassName(announcementRegion, APP_ROUTER_ANNOUNCEMENT_CLASS_NAME);

  const main =
    directChildMains[0] ??
    createCanonicalMain(fragment.childNodes.filter((node) => node !== announcementRegion));
  ensureCanonicalMainAttributes(main);

  const nextChildren = directChildMains[0]
    ? announcementRegions[0]
      ? [...fragment.childNodes]
      : [announcementRegion, ...fragment.childNodes]
    : [announcementRegion, main];

  fragment.childNodes = nextChildren;
  for (const childNode of fragment.childNodes) {
    childNode.parentNode = fragment;
  }

  return parse5.serialize(createFragmentNode(fragment.childNodes));
};
