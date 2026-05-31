import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { describe, expect, it } from 'vitest';
import { loadBuildMetadataData } from '../../src/data/buildMetadata.js';
import { loadSiteUrlContextData } from '../../src/data/siteUrlContext.js';
import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';

type Node = DefaultTreeAdapterMap['node'];
type ElementNode = DefaultTreeAdapterMap['element'];

const TEST_BUILD_METADATA = loadBuildMetadataData({
  buildId: 'theme-bootstrap-contract',
  buildLabel: 'theme bootstrap contract',
  generatedAt: '2026-01-01T00:00:00.000Z',
  sourceLabel: 'base-layout-theme-bootstrap-contract-test',
});

const TEST_SITE_URL_CONTEXT = loadSiteUrlContextData({
  siteOrigin: 'https://example.com',
  basePath: '',
  sourceLabel: 'base-layout-theme-bootstrap-contract-test',
});

const isElementNode = (node: Node): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasAttribute = (node: ElementNode, name: string): boolean =>
  node.attrs.some((attribute) => attribute.name === name);

const findFirstElement = (
  node: Node,
  predicate: (element: ElementNode) => boolean,
): ElementNode | null => {
  if (isElementNode(node) && predicate(node)) {
    return node;
  }

  if (!('childNodes' in node)) {
    return null;
  }

  for (const child of node.childNodes) {
    const match = findFirstElement(child, predicate);
    if (match !== null) {
      return match;
    }
  }

  return null;
};

const getTextContent = (node: Node): string => {
  if (node.nodeName === '#text' && 'value' in node) {
    return node.value;
  }

  return 'childNodes' in node ? node.childNodes.map((child) => getTextContent(child)).join('') : '';
};

describe('BaseLayout theme chrome bootstrap contract', () => {
  it('layout-header 直後かつ app-router 前へ通常 inline script を出力すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      content: '<p>Home</p>',
    });
    const document = parse(rendered);
    const appRoot = findFirstElement(
      document,
      (element) => element.tagName === 'div' && getAttribute(element, 'id') === 'app',
    );

    expect(appRoot).not.toBeNull();
    if (appRoot === null) {
      return;
    }

    const children = appRoot.childNodes.filter(isElementNode);
    const tags = children.map((child) => child.tagName);
    expect(tags.slice(0, 3)).toEqual(['layout-header', 'script', 'app-router']);

    const [header, script, router] = children;
    expect(header?.tagName).toBe('layout-header');
    expect(script?.tagName).toBe('script');
    expect(router?.tagName).toBe('app-router');
    if (header === undefined || script === undefined || router === undefined) {
      return;
    }

    expect(hasAttribute(script, 'data-theme-chrome-bootstrap')).toBe(true);
    expect(getAttribute(script, 'type')).toBeNull();

    for (const name of [
      'data-hydration-capability',
      'data-hydration-trigger',
      'data-hydration-scope',
      'data-hydration-key',
      'data-hydration-marker',
      'data-hydration-owner-id',
      'data-hydration-owner',
      'data-hydration-id',
    ]) {
      expect(hasAttribute(script, name)).toBe(false);
    }

    expect(getAttribute(header, 'data-hydration-capability')).toBe('interactive');
    expect(getAttribute(header, 'data-hydration-trigger')).toBe('initial');
    expect(getAttribute(router, 'data-hydration-capability')).toBe('interactive');
    expect(getAttribute(router, 'data-hydration-trigger')).toBe('initial');
    expect(getAttribute(appRoot, 'data-hydration-marker')).toBe('reading-shell');

    const scriptBody = getTextContent(script);
    expect(scriptBody.trim().length).toBeGreaterThan(0);
    expect(scriptBody).not.toMatch(/<\/script/iu);
    expect(scriptBody).toContain("document.documentElement.getAttribute('data-theme')");
    expect(scriptBody).not.toContain('localStorage');
  });
});
