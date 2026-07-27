import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import '../../src/components/ui/list/list.js';
import '../../src/components/ui/list-item/list-item.js';
import type {
  ColumnDef,
  List,
  PaginationState,
  UiContextRequestDetail,
  UiPreviewRequestDetail,
} from '../../src/components/ui/list/list.js';
import type { ListItem } from '../../src/components/ui/list-item/list-item.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './harness/browser-test-utilities.js';

const columns: ColumnDef[] = [
  { id: 'title', label: 'タイトル', width: '1fr', lead: true, defaultAction: true, sortable: true },
  { id: 'date', label: '日付', width: '120px', sortable: true },
];

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: List | ListItem): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const getRowCell = (row: ListItem, columnId: string): HTMLElement =>
  expectPresent(
    row.shadowRoot?.querySelector<HTMLElement>(`.cell--data[data-column-id="${columnId}"]`),
    `row cell ${columnId}`,
  );

describe('ui-list browser contract', () => {
  it('row navigation / preview request / context request / default action を公開 event として扱うこと', async () => {
    const host = await fixture<List>(html`
      <ui-list .columns=${columns} .currentRowId=${'row-1'} .currentColumnId=${'title'}>
        <ui-list-item row-id="row-1">
          <a id="row-1-link" slot="title" href="/notes/row-1">row 1</a>
          <time slot="date" datetime="2026-04-01">2026-04-01</time>
        </ui-list-item>
        <ui-list-item row-id="row-2">
          <a id="row-2-link" slot="title" href="/notes/row-2">row 2</a>
          <time slot="date" datetime="2026-04-02">2026-04-02</time>
        </ui-list-item>
      </ui-list>
    `);

    const rows = Array.from(host.querySelectorAll<ListItem>('ui-list-item'));
    const firstRow = expectPresent(rows[0], 'first row');
    const secondRow = expectPresent(rows[1], 'second row');

    await flush(host);
    await flush(firstRow);
    await flush(secondRow);

    const currentChanges: { rowId: string; columnId: string }[] = [];
    const previewRequests: UiPreviewRequestDetail[] = [];
    const contextRequests: UiContextRequestDetail[] = [];

    host.addEventListener('ui-current-change', (event) => {
      currentChanges.push((event as CustomEvent<{ rowId: string; columnId: string }>).detail);
    });
    host.addEventListener('ui-preview-request', (event) => {
      previewRequests.push((event as CustomEvent<UiPreviewRequestDetail>).detail);
    });
    host.addEventListener('ui-context-request', (event) => {
      contextRequests.push((event as CustomEvent<UiContextRequestDetail>).detail);
    });

    dispatchKey(getRowCell(firstRow, 'title'), 'ArrowDown');
    expect(currentChanges.at(-1)).to.deep.equal({ rowId: 'row-2', columnId: 'title' });

    host.currentRowId = 'row-2';
    host.currentColumnId = 'title';
    await flush(host);
    await flush(secondRow);

    let secondRowPrimaryClicks = 0;
    const secondRowPrimaryLink = expectPresent(
      secondRow.querySelector<HTMLAnchorElement>('#row-2-link'),
      'row 2 primary link',
    );
    const originalClick = secondRowPrimaryLink.click.bind(secondRowPrimaryLink);
    secondRowPrimaryLink.click = (): void => {
      secondRowPrimaryClicks += 1;
    };

    try {
      dispatchKey(getRowCell(secondRow, 'title'), 'Enter');
      expect(secondRowPrimaryClicks).to.equal(1);
      expect(currentChanges.at(-1)).to.deep.equal({ rowId: 'row-2', columnId: 'title' });

      dispatchKey(getRowCell(secondRow, 'title'), ' ', { shiftKey: true });
      expect(previewRequests.at(-1)).to.deep.equal({ rowId: 'row-2' });

      dispatchKey(getRowCell(secondRow, 'title'), 'F10', { shiftKey: true });
      expect(contextRequests.at(-1)?.rowId).to.equal('row-2');
      expect(contextRequests.at(-1)?.origin).to.equal('keyboard');
      expect(contextRequests.at(-1)?.anchorRect).to.not.equal(undefined);
    } finally {
      secondRowPrimaryLink.click = originalClick;
    }
  });

  it('sort header click と pagination projection を公開 DOM で観測できること', async () => {
    const pagination: PaginationState = {
      offset: 20,
      limit: 10,
      total: 95,
    };

    const host = await fixture<List>(html`
      <ui-list
        .columns=${columns}
        .pagination=${pagination}
        .getPageHref=${(page: number): string => `/notes?page=${String(page)}`}
      >
        <ui-list-item row-id="row-1">
          <a slot="title" href="/notes/row-1">row 1</a>
          <time slot="date" datetime="2026-04-01">2026-04-01</time>
        </ui-list-item>
      </ui-list>
    `);

    const row = expectPresent(host.querySelector<ListItem>('ui-list-item'), 'row');
    await flush(host);
    await flush(row);

    const sortChanges: { key: string | null; direction: 'asc' | 'desc' | null }[] = [];
    host.addEventListener('ui-sort-change', (event) => {
      sortChanges.push(
        (event as CustomEvent<{ key: string | null; direction: 'asc' | 'desc' | null }>).detail,
      );
    });

    const sortableHeader = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.header-cell--sortable'),
      'sortable header',
    );
    sortableHeader.click();

    expect(sortChanges.at(-1)).to.deep.equal({ key: 'title', direction: 'asc' });

    const paginationNav = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('[data-pagination]'),
      'pagination',
    );
    expect(paginationNav.classList.contains('ui-pagination')).to.equal(true);
    expect(paginationNav.getAttribute('aria-label')).to.equal('ページネーション');
    expect(paginationNav.querySelector('[data-pagination-current]')?.textContent?.trim()).to.equal(
      '3 / 10',
    );
    const previous = expectPresent(
      paginationNav.querySelector<HTMLAnchorElement>('[data-pagination-prev]'),
      'pagination previous',
    );
    const next = expectPresent(
      paginationNav.querySelector<HTMLAnchorElement>('[data-pagination-next]'),
      'pagination next',
    );
    expect(previous.getAttribute('href')).to.equal('/notes?page=2');
    expect(previous.getAttribute('rel')).to.equal('prev');
    expect(previous.getAttribute('aria-disabled')).to.equal('false');
    expect(next.getAttribute('href')).to.equal('/notes?page=4');
    expect(next.getAttribute('rel')).to.equal('next');
    expect(next.getAttribute('aria-disabled')).to.equal('false');
    expect(paginationNav.querySelectorAll('a')).to.have.length(2);
    expect(paginationNav.querySelectorAll('[data-pagination-current]')).to.have.length(1);
  });

  it('pagination の不正値を DOM contract へ漏らさず row index に正規化 offset を使うこと', async () => {
    const requestedPages: number[] = [];
    const pagination: PaginationState = {
      offset: Number.POSITIVE_INFINITY,
      limit: 0,
      total: Number.NaN,
    };

    const host = await fixture<List>(html`
      <ui-list
        .columns=${columns}
        .pagination=${pagination}
        .getPageHref=${(page: number): string => {
          requestedPages.push(page);
          return `/notes?page=${String(page)}`;
        }}
      >
        <ui-list-item row-id="row-1">
          <a slot="title" href="/notes/row-1">row 1</a>
          <time slot="date" datetime="2026-04-01">2026-04-01</time>
        </ui-list-item>
      </ui-list>
    `);

    const row = expectPresent(host.querySelector<ListItem>('ui-list-item'), 'row');
    await flush(host);
    await flush(row);

    const grid = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('[role="grid"]'),
      'grid',
    );
    const paginationNav = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('[data-pagination]'),
      'pagination',
    );
    const previous = expectPresent(
      paginationNav.querySelector<HTMLAnchorElement>('[data-pagination-prev]'),
      'pagination previous',
    );
    const next = expectPresent(
      paginationNav.querySelector<HTMLAnchorElement>('[data-pagination-next]'),
      'pagination next',
    );

    expect(grid.getAttribute('aria-rowcount')).to.equal('0');
    expect(row.rowIndex).to.equal(2);
    expect(paginationNav.querySelector('[data-pagination-current]')?.textContent?.trim()).to.equal(
      '1 / 1',
    );
    expect(previous.getAttribute('href')).to.equal('/notes?page=1');
    expect(previous.getAttribute('aria-disabled')).to.equal('true');
    expect(next.getAttribute('href')).to.equal('/notes?page=1');
    expect(next.getAttribute('aria-disabled')).to.equal('true');
    expect(requestedPages).to.deep.equal([1, 1]);

    const serializedPagination = paginationNav.outerHTML;
    expect(serializedPagination).not.to.contain('Infinity');
    expect(serializedPagination).not.to.contain('NaN');
    expect(serializedPagination).not.to.contain('undefined');
  });

  it('loading=false かつ row 不在では empty status を出し、loading=true では loading status を優先すること', async () => {
    const empty = await fixture<List>(html` <ui-list .columns=${columns}></ui-list> `);

    await flush(empty);

    const emptyStatus = expectPresent(
      empty.shadowRoot?.querySelector<HTMLElement>('.status'),
      'empty status',
    );
    expect(emptyStatus.textContent?.trim()).to.equal('表示するアイテムがありません');

    const loading = await fixture<List>(html`
      <ui-list .columns=${columns} .loading=${true} loading-label="取得中です"></ui-list>
    `);

    await flush(loading);

    const loadingStatus = expectPresent(
      loading.shadowRoot?.querySelector<HTMLElement>('.status'),
      'loading status',
    );
    expect(loadingStatus.textContent?.trim()).to.equal('取得中です');
  });
});
