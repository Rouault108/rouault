import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { buildStaticExploreResponse } from '../../build/search/build-static-explore-response.js';
import type { SearchState } from '../../shared/search/search-types.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { createStaticRenderIdContext } from '../../shared/static-render-id-context.js';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasAttribute = (node: ElementNode, name: string): boolean =>
  node.attrs.some((attribute) => attribute.name === name);

const getTextContent = (node: ElementNode): string =>
  node.childNodes
    .map((child) => {
      if ('value' in child) {
        return child.value;
      }
      return isElementNode(child) ? getTextContent(child) : '';
    })
    .join('');

const collectElements = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
  matches: ElementNode[] = [],
): ElementNode[] => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }
    if (predicate(child)) {
      matches.push(child);
    }
    collectElements(child, predicate, matches);
  }
  return matches;
};

const findElement = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
): ElementNode | null => collectElements(node, predicate).at(0) ?? null;

const isDescendantOf = (root: ParentLike, ancestor: ElementNode, descendant: ElementNode): boolean =>
  collectElements(ancestor, (element) => element === descendant).length > 0 &&
  collectElements(root, (element) => element === ancestor).length > 0;

const searchState: SearchState = {
  q: 'router',
  tags: ['architecture'],
  tagMode: 'and',
  sort: 'date-desc',
};

const renderSearchPageFragment = () => {
  const rendered = renderSearchPageHtml({
    initialState: searchState,
    initialResponse: buildStaticExploreResponse({
      state: searchState,
      notes: [
        {
          title: 'Router',
          permalink: '/notes/router/',
          description: 'Router contract',
          date: '2026-01-01',
          tags: ['architecture'],
        },
      ],
    }),
    siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    idContext: createStaticRenderIdContext('test:search-page-static-choice-menu'),
  });

  return {
    fragment: parseFragment(rendered),
    rendered,
  };
};

describe('search page static choice menu contract', () => {
  it('removes native and legacy select surfaces', () => {
    const { fragment } = renderSearchPageFragment();

    expect(collectElements(fragment, (element) => element.tagName === 'select')).toEqual([]);
    expect(collectElements(fragment, (element) => element.tagName === 'option')).toEqual([]);
    expect(collectElements(fragment, (element) => element.tagName === 'ui-select')).toEqual([]);
    expect(
      collectElements(fragment, (element) => getAttribute(element, 'role') === 'listbox'),
    ).toEqual([]);
    expect(
      collectElements(fragment, (element) => getAttribute(element, 'role') === 'option'),
    ).toEqual([]);
  });

  it('keeps FormData values inside the search form through enabled hidden inputs', () => {
    const { fragment } = renderSearchPageFragment();
    const form = findElement(fragment, (element) => hasAttribute(element, 'data-search-page-form'));
    expect(form).not.toBe(null);

    for (const [name, expectedValue] of [
      ['tagMode', searchState.tagMode],
      ['sort', searchState.sort],
    ] as const) {
      const input = findElement(
        fragment,
        (element) =>
          element.tagName === 'input' &&
          getAttribute(element, 'type') === 'hidden' &&
          getAttribute(element, 'name') === name &&
          hasAttribute(element, 'data-search-choice-value'),
      );

      expect(input, name).not.toBe(null);
      if (!input || !form) {
        continue;
      }
      expect(isDescendantOf(fragment, form, input), name).toBe(true);
      expect(getAttribute(input, 'value'), name).toBe(expectedValue);
      expect(hasAttribute(input, 'disabled'), name).toBe(false);
    }
  });

  it('renders accessible triggers and exactly one selected item per menu', () => {
    const { fragment } = renderSearchPageFragment();
    const menus = collectElements(fragment, (element) =>
      hasAttribute(element, 'data-search-choice-menu'),
    );

    expect(menus).toHaveLength(2);
    for (const menu of menus) {
      const summary = findElement(
        menu,
        (element) => element.tagName === 'summary' && hasAttribute(element, 'data-static-choice-trigger'),
      );
      const current = findElement(menu, (element) =>
        hasAttribute(element, 'data-static-choice-current-label'),
      );
      const selectedItems = collectElements(
        menu,
        (element) =>
          element.tagName === 'button' &&
          getAttribute(element, 'data-selected') === 'true' &&
          getAttribute(element, 'aria-pressed') === 'true',
      );

      expect(summary).not.toBe(null);
      expect(current).not.toBe(null);
      expect(getAttribute(summary as ElementNode, 'aria-expanded')).toBe('false');
      expect(getAttribute(summary as ElementNode, 'aria-labelledby')).not.toBe(null);
      expect(hasAttribute(summary as ElementNode, 'aria-label')).toBe(false);
      expect(selectedItems).toHaveLength(1);
      expect(getTextContent(current as ElementNode).trim()).toBe(
        hasAttribute(menu, 'data-search-choice-menu') &&
          getAttribute(menu, 'data-search-choice-menu') === 'tag-mode'
          ? 'すべて'
          : '新しい順',
      );
    }
  });
});
