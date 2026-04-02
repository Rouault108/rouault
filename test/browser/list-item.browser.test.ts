import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/list/list.js';
import '../../src/components/ui/list-item/list-item.js';
import type { ColumnDef, List } from '../../src/components/ui/list/list.js';
import type { ListItem } from '../../src/components/ui/list-item/list-item.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const columns: ColumnDef[] = [
  { id: 'title', label: 'タイトル', width: '1fr', lead: true },
  { id: 'date', label: '日付', width: '120px' },
  { id: 'tags', label: 'タグ', width: '140px', hideOnMobile: true },
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

const getDataCell = (host: ListItem, columnId: string): HTMLElement =>
  expectPresent(
    host.shadowRoot?.querySelector<HTMLElement>(`.cell--data[data-column-id="${columnId}"]`),
    `data cell ${columnId}`,
  );

describe('ui-list-item browser contract', () => {
  it('list context を受けて grid row と current column projection を構成すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-list
          .columns=${columns}
          .showActions=${true}
          .currentRowId=${'row-1'}
          .currentColumnId=${'date'}
        >
          <ui-list-item row-id="row-1">
            <a id="title-link" slot="title" href="/notes/row-1">List Item 単体検証</a>
            <time slot="date" datetime="2026-04-01">2026-04-01</time>
            <span slot="tags">component</span>
            <span slot="mobile-supplement">・ 2026-04-01</span>
            <button slot="actions" type="button">操作</button>
          </ui-list-item>
        </ui-list>
      </div>
    `);

    const list = expectPresent(wrapper.querySelector<List>('ui-list'), 'list');
    const row = expectPresent(wrapper.querySelector<ListItem>('ui-list-item'), 'row');

    await flush(list);
    await flush(row);

    const cells = Array.from(row.shadowRoot?.querySelectorAll('[role="gridcell"]') ?? []);
    expect(row.getAttribute('role')).to.equal('row');
    expect(row.getAttribute('aria-rowindex')).to.equal('2');
    expect(cells.length).to.equal(4);

    const currentCell = getDataCell(row, 'date');
    expect(currentCell.classList.contains('cell--current')).to.equal(true);

    const titleLink = expectPresent(
      row.querySelector<HTMLAnchorElement>('#title-link'),
      'title link',
    );
    expect(titleLink.tabIndex).to.equal(-1);
  });

  it('data cell click / ArrowRight は ui-current-change を発火し、actions click は除外すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-list .columns=${columns} .showActions=${true}>
          <ui-list-item row-id="row-1">
            <a slot="title" href="/notes/row-1">List Item 単体検証</a>
            <time slot="date" datetime="2026-04-01">2026-04-01</time>
            <span slot="tags">component</span>
            <button id="actions-button" slot="actions" type="button">操作</button>
          </ui-list-item>
        </ui-list>
      </div>
    `);

    const list = expectPresent(wrapper.querySelector<List>('ui-list'), 'list');
    const row = expectPresent(wrapper.querySelector<ListItem>('ui-list-item'), 'row');

    await flush(list);
    await flush(row);

    const changes: { rowId: string; columnId: string }[] = [];
    row.addEventListener('ui-current-change', (event) => {
      changes.push((event as CustomEvent<{ rowId: string; columnId: string }>).detail);
    });

    getDataCell(row, 'title').click();
    expect(changes.at(-1)).to.deep.equal({ rowId: 'row-1', columnId: 'title' });

    dispatchKey(getDataCell(row, 'title'), 'ArrowRight');
    expect(changes.at(-1)).to.deep.equal({ rowId: 'row-1', columnId: 'date' });

    const actionButton = expectPresent(
      row.querySelector<HTMLButtonElement>('#actions-button'),
      'actions button',
    );
    actionButton.click();
    expect(changes.length).to.equal(2);
  });

  it('standalone では fallback cell を描画すること', async () => {
    const host = await fixture<ListItem>(html` <ui-list-item>Standalone fallback</ui-list-item> `);

    await flush(host);

    const fallbackCell = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.cell--data[data-column-id="__default__"]'),
      'fallback cell',
    );

    expect(host.getAttribute('role')).to.equal('row');
    expect(host.textContent?.includes('Standalone fallback')).to.equal(true);
  });
});
