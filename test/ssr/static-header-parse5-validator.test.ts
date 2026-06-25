import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { validateStaticHeaderHtmlFragment } from '../../build/navigation/static-header-parse5-validator.js';
import { renderLayoutHeaderHtml } from '../../src/layouts/layout-header-html.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import {
  STATIC_HEADER_CONTRACT_ACCEPTED_HTML,
  STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML,
  STATIC_HEADER_CONTRACT_REJECTED_CASES,
} from '../fixtures/static-header-contract-cases.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasClass = (node: ElementNode, className: string): boolean =>
  (getAttribute(node, 'class') ?? '').split(/\s+/u).includes(className);

const getTextContent = (node: ElementNode): string =>
  node.childNodes
    .map((child) => {
      if ('value' in child) {
        return child.value;
      }
      return isElementNode(child) ? getTextContent(child) : '';
    })
    .join('');

const findElements = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
): ElementNode[] => {
  const results: ElementNode[] = [];
  for (const child of node.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }
    if (predicate(child)) {
      results.push(child);
    }
    results.push(...findElements(child, predicate));
  }
  return results;
};

const elementChildren = (node: ElementNode): ElementNode[] => node.childNodes.filter(isElementNode);

const requireElement = (element: ElementNode | undefined, message: string): ElementNode => {
  if (element === undefined) {
    throw new Error(message);
  }
  return element;
};

describe('static header parse5 validator', () => {
  it('runtime DOM validator と共有する accepted fixture を受け付けること', () => {
    expect(() =>
      validateStaticHeaderHtmlFragment(STATIC_HEADER_CONTRACT_ACCEPTED_HTML),
    ).not.toThrow();
    expect(() =>
      validateStaticHeaderHtmlFragment(STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML),
    ).not.toThrow();
  });

  it('static header menu hook を details fallback の semantics と escaped text hook として出力すること', () => {
    const html = renderLayoutHeaderHtml({
      noteLayout: true,
      sidebarEnabled: true,
      sidebarId: 'note-primary',
      tocPresence: 'absent',
      tocTriggerReserved: false,
      corpora: {
        schemaVersion: 1,
        source: 'corpus-navigation-projection',
        items: [
          {
            key: 'all',
            label: 'すべて "Alpha" & <Beta>',
            href: '/corpora/all/',
          },
          {
            key: 'journal',
            label: '日誌 & Memo',
            href: '/corpora/journal/',
          },
        ],
      },
      currentCorpusKey: 'all',
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      searchHref: '/search/',
    });

    expect(() => validateStaticHeaderHtmlFragment(html)).not.toThrow();
    expect(html).toContain('<details class="corpus-switcher" data-header-menu="corpus">');
    expect(html).toContain('<summary id="static-header-corpus-trigger"');
    expect(html).toContain('data-header-menu-trigger="true"');
    expect(html).toContain('data-header-menu-trigger-id="static-header-corpus-trigger"');
    expect(html).toContain('aria-controls="static-header-corpus-panel"');
    expect(html).toContain('data-header-menu-text="すべて &quot;Alpha&quot; &amp; &lt;Beta&gt;"');
    expect(html).toContain(
      '<span class="corpus-menu-item__indicator static-icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="check">',
    );
    expect(html).toContain(
      '<span class="corpus-menu-item__label">すべて "Alpha" &amp; &lt;Beta&gt;</span>',
    );
    expect(html).toContain(
      '<span class="corpus-menu-item__indicator corpus-menu-item__indicator--placeholder" aria-hidden="true"></span>',
    );
    expect(html).toContain('<nav id="static-header-corpus-panel"');
    expect(html).toContain('data-header-menu-panel="true"');
    expect(html).toContain('data-header-menu-panel-id="static-header-corpus-panel"');
    expect(html).toContain('data-header-menu-item="true"');
    expect(html).toContain('<details class="theme-switcher"');
    expect(html).toContain('data-header-menu="theme"');
    expect(html).toContain('<summary id="static-header-theme-trigger"');
    expect(html).toContain('data-header-menu-trigger-id="static-header-theme-trigger"');
    expect(html).toContain('aria-controls="static-header-theme-panel"');
    expect(html).toContain(
      '<div id="static-header-theme-panel" class="theme-switcher__menu" role="group"',
    );
    expect(html).toContain('data-header-menu-panel-id="static-header-theme-panel"');
    expect(html).toContain('data-theme-value="system"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain('role="menuitem"');
    expect(html).not.toContain('aria-selected');
    expect(html).not.toMatch(/\s(?:tabindex|hidden|inert)=/u);

    const fragment = parseFragment(html);
    const corpusItems = findElements(
      fragment,
      (element) =>
        element.tagName === 'a' && getAttribute(element, 'data-header-menu-item') === 'true',
    );
    const currentItems = corpusItems.filter(
      (element) => getAttribute(element, 'aria-current') === 'page',
    );
    const nonCurrentItems = corpusItems.filter(
      (element) => getAttribute(element, 'aria-current') !== 'page',
    );
    expect(currentItems).toHaveLength(1);
    expect(nonCurrentItems.length).toBeGreaterThan(0);

    const currentItem = requireElement(currentItems[0], 'Current corpus item is missing.');
    const currentChildren = elementChildren(currentItem);
    const currentIndicator = requireElement(
      currentChildren[0],
      'Current corpus indicator is missing.',
    );
    const currentLabel = requireElement(currentChildren[1], 'Current corpus label is missing.');
    expect(hasClass(currentIndicator, 'corpus-menu-item__indicator')).toBe(true);
    expect(hasClass(currentIndicator, 'static-icon')).toBe(true);
    expect(currentIndicator.attrs.some((attribute) => attribute.name === 'aria-hidden')).toBe(true);
    expect(hasClass(currentLabel, 'corpus-menu-item__label')).toBe(true);
    expect(getTextContent(currentLabel)).toBe('すべて "Alpha" & <Beta>');
    expect(getAttribute(currentItem, 'data-header-menu-text')).toBe('すべて "Alpha" & <Beta>');
    expect(
      findElements(
        currentIndicator,
        (element) => element.tagName === 'svg' && getAttribute(element, 'data-icon') === 'check',
      ),
    ).toHaveLength(1);

    const nonCurrentItem = requireElement(
      nonCurrentItems[0],
      'Non-current corpus item is missing.',
    );
    const nonCurrentChildren = elementChildren(nonCurrentItem);
    const nonCurrentIndicator = requireElement(
      nonCurrentChildren[0],
      'Non-current corpus indicator is missing.',
    );
    const nonCurrentLabel = requireElement(
      nonCurrentChildren[1],
      'Non-current corpus label is missing.',
    );
    expect(hasClass(nonCurrentIndicator, 'corpus-menu-item__indicator')).toBe(true);
    expect(hasClass(nonCurrentIndicator, 'corpus-menu-item__indicator--placeholder')).toBe(true);
    expect(hasClass(nonCurrentLabel, 'corpus-menu-item__label')).toBe(true);
    expect(getTextContent(nonCurrentLabel)).toBe('日誌 & Memo');
    expect(getAttribute(nonCurrentItem, 'data-header-menu-text')).toBe('日誌 & Memo');
    expect(
      findElements(
        nonCurrentIndicator,
        (element) => element.tagName === 'svg' && getAttribute(element, 'data-icon') === 'check',
      ),
    ).toHaveLength(0);
  });

  it.each(STATIC_HEADER_CONTRACT_REJECTED_CASES)(
    'runtime DOM validator と共有する rejected fixture を拒否すること: $label',
    ({ html }) => {
      expect(() => validateStaticHeaderHtmlFragment(html)).toThrow();
    },
  );
});
