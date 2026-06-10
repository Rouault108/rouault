import { expect } from '@open-wc/testing';
import type { Heading } from '../../src/components/ui/toc/toc.js';
import {
  applyTocScopeSelections,
  filterHeadingsByScopeSelections,
  filterVisibleHeadings,
  readTocScopeSelectionMap,
  resolveTabValueForDescendant,
  revealHeadingInTabs,
} from '../../src/toc/filter-visible-headings.js';

describe('filterVisibleHeadings', () => {
  it('非アクティブな tabpanel 内の見出しを除外すること', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="top">トップ</h2>

        <ui-tabs>
          <div slot="tab" value="js">JavaScript</div>
          <div slot="panel" role="tabpanel" aria-hidden="false">
            <h3 id="js-heading">JavaScript の見出し</h3>
          </div>

          <div slot="tab" value="rust">Rust</div>
          <div slot="panel" role="tabpanel" aria-hidden="true" hidden>
            <h3 id="rust-heading">Rust の見出し</h3>
          </div>
        </ui-tabs>
      </article>
    `;

    const contentRoot = document.getElementById('content-root');
    if (!contentRoot) return;
    const headings: Heading[] = [
      { id: 'top', text: 'トップ', level: 2 },
      { id: 'js-heading', text: 'JavaScript の見出し', level: 3 },
      { id: 'rust-heading', text: 'Rust の見出し', level: 3 },
    ];

    expect(filterVisibleHeadings(contentRoot, headings)).to.deep.equal([
      { id: 'top', text: 'トップ', level: 2 },
      { id: 'js-heading', text: 'JavaScript の見出し', level: 3 },
    ]);
  });

  it('ネストした非表示 tabpanel も除外すること', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="top">トップ</h2>

        <ui-tabs>
          <div slot="tab" value="outer-a">A</div>
          <div slot="panel" role="tabpanel" aria-hidden="false">
            <ui-tabs>
              <div slot="tab" value="inner-a">A-1</div>
              <div slot="panel" role="tabpanel" aria-hidden="false">
                <h3 id="visible-heading">見える見出し</h3>
              </div>

              <div slot="tab" value="inner-b">A-2</div>
              <div slot="panel" role="tabpanel" aria-hidden="true" hidden>
                <h3 id="hidden-heading">隠れた見出し</h3>
              </div>
            </ui-tabs>
          </div>
        </ui-tabs>
      </article>
    `;

    const contentRoot = document.getElementById('content-root');
    if (!contentRoot) return;
    const headings: Heading[] = [
      { id: 'top', text: 'トップ', level: 2 },
      { id: 'visible-heading', text: '見える見出し', level: 3 },
      { id: 'hidden-heading', text: '隠れた見出し', level: 3 },
    ];

    expect(filterVisibleHeadings(contentRoot, headings)).to.deep.equal([
      { id: 'top', text: 'トップ', level: 2 },
      { id: 'visible-heading', text: '見える見出し', level: 3 },
    ]);
  });

  it('hash 対象見出しに対して祖先タブを外側から順に開くこと', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <ui-tabs id="tabs-root">
          <div slot="tab" value="overview">概要</div>
          <div slot="panel" role="tabpanel" aria-hidden="true" hidden>
            <h3 id="overview-heading">概要見出し</h3>
          </div>

          <div slot="tab" value="details">詳細</div>
          <div slot="panel" role="tabpanel" aria-hidden="true" hidden>
            <h3 id="details-heading">詳細見出し</h3>
          </div>
        </ui-tabs>
      </article>
    `;

    const contentRoot = document.getElementById('content-root');
    if (!contentRoot) return;
    const tabs = document.getElementById('tabs-root') as HTMLElement & {
      calls?: {
        value: string;
        historyMode: string | undefined;
      }[];
      select: (value: string, options?: { historyMode?: string }) => void;
    };
    const target = document.getElementById('details-heading');
    if (!target) return;

    tabs.calls = [];
    tabs.select = (value: string, options?: { historyMode?: string }) => {
      tabs.calls?.push({ value, historyMode: options?.historyMode });
    };

    revealHeadingInTabs(contentRoot, target);

    expect(tabs.calls).to.deep.equal([{ value: 'details', historyMode: 'none' }]);
  });

  it('descendant 見出しから属する panel の tab value を解決できること', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <ui-tabs id="tabs-root">
          <div slot="tab" value="overview">概要</div>
          <div slot="panel" role="tabpanel" aria-hidden="false">
            <h3 id="overview-heading">Overview Heading</h3>
          </div>

          <div slot="tab" value="details">詳細</div>
          <div slot="panel" role="tabpanel" aria-hidden="false">
            <h3 id="details-heading">Details Heading</h3>
          </div>
        </ui-tabs>
      </article>
    `;

    const tabs = document.getElementById('tabs-root');
    const target = document.getElementById('details-heading');
    if (!(tabs instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

    expect(resolveTabValueForDescendant(tabs, target)).to.equal('details');
  });

  it('ネストした tabs でも外側 host に対する panel value を解決できること', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <ui-tabs id="outer-tabs">
          <div slot="tab" value="outer-a">A</div>
          <div slot="panel" role="tabpanel" aria-hidden="false">
            <ui-tabs>
              <div slot="tab" value="inner-a">A-1</div>
              <div slot="panel" role="tabpanel" aria-hidden="false">
                <h3 id="nested-heading">Nested Heading</h3>
              </div>
            </ui-tabs>
          </div>

          <div slot="tab" value="outer-b">B</div>
          <div slot="panel" role="tabpanel" aria-hidden="false">
            <h3 id="other-heading">Other Heading</h3>
          </div>
        </ui-tabs>
      </article>
    `;

    const tabs = document.getElementById('outer-tabs');
    const target = document.getElementById('nested-heading');
    if (!(tabs instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

    expect(resolveTabValueForDescendant(tabs, target)).to.equal('outer-a');
  });

  it('data-toc-scope ごとの選択状態を読み取り、scopeSelections で見出しを絞り込めること', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <ui-tabs data-toc-scope="toc-scope-1" selected-value="details">
          <div slot="tab" value="overview">概要</div>
          <div slot="panel" role="tabpanel" aria-hidden="true" hidden></div>
          <div slot="tab" value="details">詳細</div>
          <div slot="panel" role="tabpanel" aria-hidden="false"></div>
        </ui-tabs>
      </article>
    `;

    const contentRoot = document.getElementById('content-root');
    if (!(contentRoot instanceof HTMLElement)) return;

    const selections = readTocScopeSelectionMap(contentRoot);
    expect(Array.from(selections.entries())).to.deep.equal([['toc-scope-1', 'details']]);

    const headings: Heading[] = [
      {
        id: 'overview-heading',
        text: 'Overview',
        level: 2,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'overview' }],
      },
      {
        id: 'details-heading',
        text: 'Details',
        level: 2,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'details' }],
      },
      { id: 'shared-heading', text: 'Shared', level: 2 },
    ];

    expect(filterHeadingsByScopeSelections(headings, selections)).to.deep.equal([
      {
        id: 'details-heading',
        text: 'Details',
        level: 2,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'details' }],
      },
      { id: 'shared-heading', text: 'Shared', level: 2 },
    ]);
  });

  it('scope selection 適用時に history mode を指定できること', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <ui-tabs id="tabs-root" data-toc-scope="toc-scope-1">
          <div slot="tab" value="overview">概要</div>
          <div slot="panel" role="tabpanel" aria-hidden="false"></div>
          <div slot="tab" value="details">詳細</div>
          <div slot="panel" role="tabpanel" aria-hidden="true" hidden></div>
        </ui-tabs>
      </article>
    `;

    const contentRoot = document.getElementById('content-root');
    const tabs = document.getElementById('tabs-root') as HTMLElement & {
      calls?: {
        value: string;
        historyMode: string | undefined;
      }[];
      select: (value: string, options?: { historyMode?: string }) => void;
    };
    if (!(contentRoot instanceof HTMLElement) || !(tabs instanceof HTMLElement)) return;

    tabs.calls = [];
    tabs.select = (value: string, options?: { historyMode?: string }) => {
      tabs.calls?.push({ value, historyMode: options?.historyMode });
    };

    applyTocScopeSelections(
      contentRoot,
      [{ scopeId: 'toc-scope-1', value: 'details' }],
      { historyMode: 'none' },
    );

    expect(tabs.calls).to.deep.equal([{ value: 'details', historyMode: 'none' }]);
  });
});
