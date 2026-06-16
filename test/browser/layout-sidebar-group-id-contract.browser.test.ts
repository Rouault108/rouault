import { expect, fixture, html } from '@open-wc/testing';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import {
  createSidebarGroupIdPrefixFromSidebarIdentity,
  parseSidebarGroupId,
} from '../../shared/navigation/sidebar-group-id.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';
import '../../src/components/layout/layout-sidebar.js';
import { layoutSidebarController } from '../../src/components/layout/layout-sidebar-controller.js';

const rows: readonly SidebarNavRow[] = [
  {
    id: 'music',
    label: 'Music',
    kind: 'branch',
    depth: 0,
    isCurrent: false,
    hasCurrentDescendant: false,
    showsCurrentPathIndicator: false,
    isInitiallyExpanded: true,
    children: [
      {
        id: 'music/mozart',
        label: 'Mozart',
        kind: 'leaf',
        href: '/notes/music/mozart',
        depth: 1,
        isCurrent: false,
        hasCurrentDescendant: false,
        showsCurrentPathIndicator: false,
        isInitiallyExpanded: false,
        children: [],
      },
    ],
  },
];

const collectUlIds = (root: ParentNode): string[] =>
  [...root.querySelectorAll<HTMLUListElement>('ul[id]')].map((element) => element.id);

const renderMarkup = (sidebarId: string): string =>
  renderNoteSidebarNav(rows, {
    sidebarId,
    topologyRevision: 'topology:groups',
    groupIdPrefix: createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', sidebarId),
  });

const waitForElementUpdate = async (element: Element): Promise<void> => {
  const maybeLit = element as Element & { updateComplete?: Promise<unknown> };
  if (maybeLit.updateComplete) {
    await maybeLit.updateComplete;
  }
};

const settle = async (root: ParentNode = document): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();

  const litElements = [
    ...root.querySelectorAll('layout-sidebar'),
    ...document.querySelectorAll('layout-sidebar-surface'),
  ];

  for (const element of litElements) {
    await waitForElementUpdate(element);
  }

  await Promise.resolve();
  await Promise.resolve();
};

const expectUniqueControlledGroups = (root: ParentNode): string[] => {
  const ids = collectUlIds(root);
  expect(ids.length).to.be.greaterThan(0);
  expect(new Set(ids).size).to.equal(ids.length);

  for (const button of root.querySelectorAll<HTMLButtonElement>('button[aria-controls]')) {
    const controlledId = button.getAttribute('aria-controls');
    const row = button.closest('li');
    const directGroup = row?.querySelector<HTMLUListElement>(':scope > ul');

    expect(controlledId).to.be.a('string');
    expect(directGroup).to.be.instanceOf(HTMLUListElement);
    expect(directGroup?.id).to.equal(controlledId);
  }

  return ids;
};

describe('layout-sidebar group id browser contract', () => {
  afterEach(() => {
    layoutSidebarController.reset();
    document
      .querySelectorAll('[data-app-shell-sidebar-overlay-layer]')
      .forEach((element) => element.remove());
  });

  it('同一 rowId でも stateScopeId / sidebarId ごとに document-wide に一意な ul[id] を生成すること', async () => {
    const primaryMarkup = renderMarkup('note-primary');
    const secondaryMarkup = renderMarkup('note-secondary');

    const wrapper = await fixture<HTMLDivElement>(html`
      <div data-app-shell-sidebar-overlay-layer>
        <section data-app-shell-sidebar-host>${unsafeHTML(primaryMarkup)}</section>
        <section data-app-shell-sidebar-host>${unsafeHTML(secondaryMarkup)}</section>
      </div>
    `);

    const ids = expectUniqueControlledGroups(wrapper);
    const parsed = ids.map((id) => parseSidebarGroupId(id));
    expect(parsed.every((item) => item !== null)).to.equal(true);
    expect(parsed.map((item) => item?.sidebarId)).to.deep.equal(['note-primary', 'note-secondary']);
  });

  it('overlay surface mount 後も controlled group id が document-wide に一意で direct child ul を指すこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <layout-sidebar
          sidebar-id="note-primary"
          state-scope-id="note-navigation"
          initial-expanded-ids='["music"]'
          presentation="overlay"
        >
          ${unsafeHTML(renderMarkup('note-primary'))}
        </layout-sidebar>
        <layout-sidebar
          sidebar-id="note-secondary"
          state-scope-id="note-navigation"
          initial-expanded-ids='["music"]'
          presentation="overlay"
        >
          ${unsafeHTML(renderMarkup('note-secondary'))}
        </layout-sidebar>
      </div>
    `);

    await settle(wrapper);

    const overlayLayer = document.querySelector<HTMLElement>(
      '[data-app-shell-sidebar-overlay-layer]',
    );
    expect(overlayLayer).to.be.instanceOf(HTMLElement);
    const ids = expectUniqueControlledGroups(document);
    const parsed = ids.map((id) => parseSidebarGroupId(id));

    expect(parsed.every((item) => item !== null)).to.equal(true);
    expect(parsed.map((item) => item?.sidebarId).sort()).to.deep.equal([
      'note-primary',
      'note-secondary',
    ]);
  });

  it('fixed / overlay 切替後に stale duplicate group id を残さないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <layout-sidebar
          sidebar-id="note-primary"
          state-scope-id="note-navigation"
          initial-expanded-ids='["music"]'
          presentation="fixed"
        >
          ${unsafeHTML(renderMarkup('note-primary'))}
        </layout-sidebar>
      </div>
    `);
    const sidebar = wrapper.querySelector('layout-sidebar') as HTMLElement & {
      presentation: 'fixed' | 'overlay';
    };

    await settle(wrapper);
    expectUniqueControlledGroups(document);

    sidebar.presentation = 'overlay';
    sidebar.setAttribute('presentation', 'overlay');
    await settle(wrapper);
    expectUniqueControlledGroups(document);

    sidebar.presentation = 'fixed';
    sidebar.setAttribute('presentation', 'fixed');
    await settle(wrapper);
    expectUniqueControlledGroups(document);
  });
});
