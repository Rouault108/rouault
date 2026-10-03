import { describe, expect, it } from 'vitest';
import type { HastNode } from '../../build/rehype/hast-utils.js';
import type { TocHeading } from '../../src/toc/toc-headings.js';
import {
  applyTocScopeSelections,
  filterHeadingsByScopeSelections,
  filterVisibleHeadings,
  readTocScopeSelectionMap,
  resolveTabValueForDescendant,
  revealHeadingInTabs,
} from '../../src/toc/filter-visible-headings.js';
import { activateTabs, readTabsSelection } from '../../src/client/post-hydrate/tabs-enhancer.js';
import { fixtureAbortController, requireFixtureValue } from './harness/browser-fixture.js';
import { element, text, nativeNoteFixture } from './harness/native-note-fixture.js';

const tabsInput = (scope: string, nested = false): HastNode =>
  element('ui-tabs', { 'data-toc-scope': scope }, [
    element('div', { slot: 'tab', value: 'overview' }, [text('概要')]),
    element('div', { slot: 'panel' }, [
      element('h2', { id: `${scope}-overview` }, [text('Overview')]),
    ]),
    element('div', { slot: 'tab', value: 'details' }, [text('詳細')]),
    element(
      'div',
      { slot: 'panel' },
      nested
        ? [tabsInput('inner')]
        : [element('h2', { id: `${scope}-details` }, [text('Details')])],
    ),
  ]);
const create = async (nested = false) =>
  nativeNoteFixture(element('article', {}, [tabsInput('outer', nested)]));
const roots = (content: HTMLElement) => [
  ...content.querySelectorAll<HTMLElement>('[data-tabs-root]'),
];
const enhance = (content: HTMLElement) => {
  const lifetime = fixtureAbortController(content);
  for (const root of roots(content)) activateTabs(root, lifetime.signal);
};
const headings: TocHeading[] = [
  {
    id: 'outer-overview',
    text: 'Overview',
    level: 2,
    scopeSelections: [{ scopeId: 'outer', value: 'overview' }],
  },
  {
    id: 'outer-details',
    text: 'Details',
    level: 2,
    scopeSelections: [{ scopeId: 'outer', value: 'details' }],
  },
];

describe('native tabs TOC integration', () => {
  it('未enhanceでは全panelの見出しを可視として扱う', async () => {
    const content = await create();
    expect(filterVisibleHeadings(content, headings)).toEqual(headings);
    expect(readTocScopeSelectionMap(content).size).toBe(0);
    expect(filterHeadingsByScopeSelections(headings, readTocScopeSelectionMap(content))).toEqual(
      headings,
    );
  });
  it('非アクティブpanel内の見出しを除外する', async () => {
    const content = await create();
    enhance(content);
    expect(filterVisibleHeadings(content, headings)).toEqual([headings[0]]);
  });
  it('ネストした非表示panelも除外する', async () => {
    const content = await create(true);
    enhance(content);
    const nested = [{ id: 'inner-overview', text: 'Overview', level: 2 }];
    expect(filterVisibleHeadings(content, nested)).toEqual([]);
  });
  it('hash対象の祖先tabsを外側から順に開き、URLを変更しない', async () => {
    const content = await create(true);
    enhance(content);
    const order: string[] = [];
    content.addEventListener('ui-tab-change', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) order.push(target.dataset['tocScope'] ?? '');
    });
    const url = location.href;
    revealHeadingInTabs(
      content,
      requireFixtureValue(content.querySelector<HTMLElement>('#inner-details')),
    );
    expect(order).toEqual(['outer', 'inner']);
    expect(roots(content).map(readTabsSelection)).toEqual(['details', 'details']);
    expect(location.href).toBe(url);
  });
  it('descendantから所属panelのvalueを解決する', async () => {
    const content = await create();
    expect(
      resolveTabValueForDescendant(
        requireFixtureValue(roots(content)[0]),
        requireFixtureValue(content.querySelector<HTMLElement>('#outer-details')),
      ),
    ).toBe('details');
  });
  it('ネストしたdescendantから外側panelのvalueを解決する', async () => {
    const content = await create(true);
    expect(
      resolveTabValueForDescendant(
        requireFixtureValue(roots(content)[0]),
        requireFixtureValue(content.querySelector<HTMLElement>('#inner-details')),
      ),
    ).toBe('details');
  });
  it('scopeSelectionsをcontrollerへ適用し、canonical selectionで絞り込む', async () => {
    const content = await create();
    enhance(content);
    const url = location.href;
    applyTocScopeSelections(content, [{ scopeId: 'outer', value: 'details' }], {
      historyMode: 'none',
    });
    const selections = readTocScopeSelectionMap(content);
    expect([...selections]).toEqual([['outer', 'details']]);
    expect(filterHeadingsByScopeSelections(headings, selections)).toEqual([headings[1]]);
    expect(location.href).toBe(url);
  });
});
