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

const getSelectedOptions = (select: ElementNode): ElementNode[] =>
  collectElements(
    select,
    (element) => element.tagName === 'option' && hasAttribute(element, 'selected'),
  );

const searchState: SearchState = {
  q: 'router',
  tags: ['architecture'],
  tagMode: 'and',
  sort: 'date-desc',
};

const renderSearchPageFragment = () => {
  const idContext = createStaticRenderIdContext('test:search-page-static-select');
  const expectedIdContext = createStaticRenderIdContext('test:search-page-static-select');
  expectedIdContext.reserveId('search-page', 'search-page-query');
  const tagModeSelectId = expectedIdContext.reserveId('search-page', 'search-page-tag-mode-select');
  const sortSelectId = expectedIdContext.reserveId('search-page', 'search-page-sort-select');
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
    idContext,
  });

  return {
    fragment: parseFragment(rendered),
    rendered,
    expectedIds: {
      tagMode: tagModeSelectId,
      sort: sortSelectId,
    },
  };
};

describe('search page static select contract', () => {
  it('enumerates every native select surface and keeps legacy select surfaces out', () => {
    const { fragment, rendered } = renderSearchPageFragment();
    const selects = collectElements(fragment, (element) => element.tagName === 'select');

    expect(selects.map((select) => getAttribute(select, 'name'))).toEqual(['tagMode', 'sort']);
    expect(collectElements(fragment, (element) => element.tagName === 'ui-select')).toEqual([]);
    expect(
      collectElements(fragment, (element) => getAttribute(element, 'role') === 'listbox'),
    ).toEqual([]);
    expect(
      collectElements(fragment, (element) => getAttribute(element, 'role') === 'option'),
    ).toEqual([]);
    expect(rendered).not.toContain('readonly');
  });

  it('binds tagMode and sort selects to explicit labels and selected values', () => {
    const { fragment, expectedIds } = renderSearchPageFragment();
    const expectations = [
      {
        name: 'tagMode',
        dataAttribute: 'data-search-tag-mode-select',
        expectedId: expectedIds.tagMode,
        selectedValue: searchState.tagMode,
      },
      {
        name: 'sort',
        dataAttribute: 'data-search-sort-select',
        expectedId: expectedIds.sort,
        selectedValue: searchState.sort,
      },
    ] as const;

    for (const expectation of expectations) {
      const select = findElement(
        fragment,
        (element) =>
          element.tagName === 'select' &&
          getAttribute(element, 'name') === expectation.name &&
          hasAttribute(element, expectation.dataAttribute),
      );

      expect(select, expectation.name).not.toBe(null);
      if (!select) {
        continue;
      }

      const id = getAttribute(select, 'id');
      const label = findElement(
        fragment,
        (element) => element.tagName === 'label' && getAttribute(element, 'for') === id,
      );
      const selectedOptions = getSelectedOptions(select);

      expect(id, expectation.name).toBe(expectation.expectedId);
      expect(label, expectation.name).not.toBe(null);
      expect(label ? getTextContent(label).trim() : '', expectation.name).not.toBe('');
      expect(hasAttribute(select, 'readonly'), expectation.name).toBe(false);
      expect(selectedOptions, expectation.name).toHaveLength(1);
      expect(getAttribute(selectedOptions[0] as ElementNode, 'value'), expectation.name).toBe(
        expectation.selectedValue,
      );
    }
  });
});
