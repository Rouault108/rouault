import { expect, fixture, html } from '@open-wc/testing';

import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import type { PayloadDocumentShellSnapshot } from '../../src/router/router.js';
import '../../src/components/layout/layout-sidebar.js';
import { createCanonicalAbsentRuntimeSidebarProjection } from '../../shared/navigation/sidebar-shell-projection-contract.js';
import { validateRuntimeSidebarProjection } from '../../shared/navigation/shell-projection-validator.js';
import { layoutSidebarController } from '../../src/components/layout/layout-sidebar-controller.js';
import { getLayoutSidebarTreeStateStorageKey } from '../../src/components/layout/layout-sidebar-tree-state.js';
import {
  applyPayloadShellSnapshot,
  applyRuntimeSidebarSnapshotForRollback,
} from '../../src/components/app/shell/layout-sidebar-shell-adapter.js';
import { type LitLikeElement, waitForLitUpdate } from './helpers/wait-for-lit.js';

const navHtml = '<nav data-sidebar-nav aria-label="ノートナビゲーション"><ul><li data-node-id="a" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/a" data-link-kind="internal-document" data-link-surface="navigation"><span data-sidebar-nav-label>A</span></a></li></ul></nav>';
const OVERLAY_LAYER_SELECTOR = '[data-app-shell-sidebar-overlay-layer]';

const noteNavHtml = `
  <nav data-sidebar-nav aria-label="ノートナビゲーション">
    <ul>
      <li data-node-id="music" data-node-kind="branch" data-node-depth="0" data-current-branch="true">
        <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="false" aria-controls="sidebar-group-music">
          <span data-sidebar-nav-label>Music</span>
        </button>
        <ul id="sidebar-group-music" hidden>
          <li data-node-id="music/classical" data-node-kind="branch" data-node-depth="1" data-current-branch="true">
            <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="false" aria-controls="sidebar-group-classical">
              <span data-sidebar-nav-label>Classical</span>
            </button>
            <ul id="sidebar-group-classical" hidden>
              <li data-node-id="music/classical/beethoven/symphony-9" data-node-kind="leaf" data-node-depth="2">
                <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/beethoven/symphony-9" data-link-kind="internal-document" data-link-surface="navigation">
                  <span data-sidebar-nav-label>Symphony 9</span>
                </a>
              </li>
              <li data-node-id="music/classical/tchaikovsky/the-nutcracker" data-node-kind="leaf" data-node-depth="2">
                <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/tchaikovsky/the-nutcracker" data-link-kind="internal-document" data-link-surface="navigation">
                  <span data-sidebar-nav-label>The Nutcracker</span>
                </a>
              </li>
            </ul>
          </li>
          <li data-node-id="legacy-only" data-node-kind="branch" data-node-depth="1">
            <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="false" aria-controls="sidebar-group-legacy">
              <span data-sidebar-nav-label>Legacy</span>
            </button>
            <ul id="sidebar-group-legacy" hidden>
              <li data-node-id="legacy-only/leaf" data-node-kind="leaf" data-node-depth="2">
                <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/legacy-only/leaf" data-link-kind="internal-document" data-link-surface="navigation">
                  <span data-sidebar-nav-label>Legacy Leaf</span>
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
`.trim();

const noteNavHtmlWithoutLegacy = `
  <nav data-sidebar-nav aria-label="ノートナビゲーション">
    <ul>
      <li data-node-id="music" data-node-kind="branch" data-node-depth="0" data-current-branch="true">
        <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="false" aria-controls="sidebar-group-music-v2">
          <span data-sidebar-nav-label>Music</span>
        </button>
        <ul id="sidebar-group-music-v2" hidden>
          <li data-node-id="music/classical" data-node-kind="branch" data-node-depth="1" data-current-branch="true">
            <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="false" aria-controls="sidebar-group-classical-v2">
              <span data-sidebar-nav-label>Classical</span>
            </button>
            <ul id="sidebar-group-classical-v2" hidden>
              <li data-node-id="music/classical/mozart/requiem" data-node-kind="leaf" data-node-depth="2">
                <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/mozart/requiem" data-link-kind="internal-document" data-link-surface="navigation">
                  <span data-sidebar-nav-label>Requiem</span>
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
`.trim();

interface PersistedLayoutSidebarState {
  expandedIds?: string[];
}

interface SidebarProjectionMethodHost extends HTMLElement {
  applyShellProjection(snapshot: unknown): void;
}

const headerSnapshot: PayloadDocumentShellSnapshot['header'] = {
  corpora: [],
  currentCorpusKey: 'all',
  noteLayout: true,
  sidebarEnabled: true,
  sidebarId: 'note-primary',
  tocPresence: 'absent',
  tocRuntimeId: null,
  tocOwnerId: null,
  tocTriggerReserved: false,
};

const absentHeaderSnapshot: PayloadDocumentShellSnapshot['header'] = {
  ...headerSnapshot,
  noteLayout: false,
  sidebarEnabled: false,
};

const createPresentSidebarSnapshot = (options: {
  selectedId?: string;
  initialExpandedIds?: string[];
  topologyRevision?: string;
  navHtml?: string;
}) => ({
  present: true as const,
  sidebarId: 'note-primary',
  stateScopeId: 'note-navigation',
  selectedId: options.selectedId ?? 'music/classical/beethoven/symphony-9',
  initialExpandedIds: options.initialExpandedIds ?? ['music', 'music/classical'],
  topologyRevision: options.topologyRevision ?? 'topology:note-v1',
  navHtml: options.navHtml ?? noteNavHtml,
  heading: 'Notes',
  fixedBreakpoint: 1024,
  presentation: 'overlay' as const,
});

const getSidebarDomRoot = (host: LayoutSidebar): ParentNode => {
  const hostNav = host.querySelector('nav[data-sidebar-nav]');
  const hostSurface = host.querySelector('layout-sidebar-surface');

  if (hostNav instanceof HTMLElement || hostSurface instanceof HTMLElement) {
    return host;
  }

  return document.querySelector<HTMLElement>(OVERLAY_LAYER_SELECTOR) ?? host;
};

const settleSidebarProjection = async (sidebar: LayoutSidebar): Promise<void> => {
  await waitForLitUpdate(sidebar);

  const root = getSidebarDomRoot(sidebar);
  const surfaces = Array.from(
    root.querySelectorAll<LitLikeElement>('layout-sidebar-surface'),
  );
  await Promise.all(surfaces.map((surface) => waitForLitUpdate(surface)));

  const shells = Array.from(root.querySelectorAll<LitLikeElement>('ui-sidebar-shell'));
  await Promise.all(shells.map((shell) => waitForLitUpdate(shell)));

  await Promise.resolve();
  await Promise.resolve();
};

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const getBranchGroup = (host: LayoutSidebar, id: string): HTMLUListElement | null => {
  const row = getSidebarDomRoot(host).querySelector<HTMLElement>(`li[data-node-id="${id}"]`);
  const group = row?.querySelector(':scope > ul');
  return group instanceof HTMLUListElement ? group : null;
};

const getControl = (
  host: LayoutSidebar,
  id: string,
): HTMLButtonElement | HTMLAnchorElement | null => {
  const row = getSidebarDomRoot(host).querySelector<HTMLElement>(`li[data-node-id="${id}"]`);
  const control = row?.querySelector(':scope > [data-sidebar-nav-control]');
  return control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement
    ? control
    : null;
};

const getShellFixture = async (): Promise<{
  router: HTMLElement;
  sidebarColumn: HTMLElement;
  sidebar: LayoutSidebar;
}> => {
  const shell = await fixture<HTMLElement>(html`
    <div>
      <app-router></app-router>
      <aside data-app-shell-sidebar-host>
        <layout-sidebar hidden></layout-sidebar>
      </aside>
      <div data-app-shell-sidebar-overlay-layer></div>
    </div>
  `);

  return {
    router: expectPresent(shell.querySelector<HTMLElement>('app-router'), 'app-router'),
    sidebarColumn: expectPresent(
      shell.querySelector<HTMLElement>('[data-app-shell-sidebar-host]'),
      'sidebar column',
    ),
    sidebar: expectPresent(shell.querySelector<LayoutSidebar>('layout-sidebar'), 'layout-sidebar'),
  };
};

describe('layout-sidebar shell projection browser contract', () => {
  afterEach(() => {
    localStorage.clear();
    layoutSidebarController.reset();
    document.querySelectorAll(OVERLAY_LAYER_SELECTOR).forEach((element) => {
      element.remove();
    });
  });

  it('absent projection 適用時に stale runtime state と projection attributes を canonical に戻すこと', async () => {
    const sidebar = await fixture<LayoutSidebar>(html`<layout-sidebar></layout-sidebar>`);

    sidebar.applyShellProjection({
      present: true,
      sidebarId: 'note-primary',
      stateScopeId: 'note-navigation',
      selectedId: 'a',
      initialExpandedIds: ['a'],
      topologyRevision: 'topology:test',
      navHtml,
      heading: 'Notes',
      fixedBreakpoint: 1024,
      presentation: 'overlay',
    });

    expect(sidebar.hidden).to.equal(false);
    expect(sidebar.getAttribute('sidebar-id')).to.equal('note-primary');

    sidebar.applyShellProjection(createCanonicalAbsentRuntimeSidebarProjection());

    expect(sidebar.hidden).to.equal(true);
    expect(sidebar.getAttribute('sidebar-id')).to.equal(null);
    expect(sidebar.getAttribute('state-scope-id')).to.equal(null);
    expect(sidebar.innerHTML).to.equal('');
    expect(validateRuntimeSidebarProjection(sidebar.readShellProjection())).to.deep.equal(
      createCanonicalAbsentRuntimeSidebarProjection(),
    );
  });

  it('shell snapshot の absent から note projection へ入ると initialExpandedIds の branch を開くこと', async () => {
    const { router, sidebarColumn, sidebar } = await getShellFixture();

    applyPayloadShellSnapshot(
      {
        header: absentHeaderSnapshot,
        sidebar: null,
      },
      router,
      sidebarColumn,
      sidebar,
    );
    await settleSidebarProjection(sidebar);

    applyPayloadShellSnapshot(
      {
        header: headerSnapshot,
        sidebar: createPresentSidebarSnapshot({}),
      },
      router,
      sidebarColumn,
      sidebar,
    );
    await settleSidebarProjection(sidebar);

    expect(router.getAttribute('data-sidebar-presence')).to.equal('present');
    expect(sidebarColumn.hidden).to.equal(false);
    expect(sidebar.hidden).to.equal(false);
    expect(expectPresent(getBranchGroup(sidebar, 'music'), 'music group').hidden).to.equal(false);
    expect(
      expectPresent(getBranchGroup(sidebar, 'music/classical'), 'classical group').hidden,
    ).to.equal(false);
    expect(
      getControl(sidebar, 'music/classical/beethoven/symphony-9')?.getAttribute('aria-current'),
    ).to.equal('page');
  });

  it('保存済み expandedIds が空でも absent から note projection へ入ると現在位置の branch を開くこと', async () => {
    const { router, sidebarColumn, sidebar } = await getShellFixture();

    localStorage.setItem(
      getLayoutSidebarTreeStateStorageKey({
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
      }),
      JSON.stringify({ expandedIds: [] } satisfies PersistedLayoutSidebarState),
    );

    applyPayloadShellSnapshot(
      {
        header: absentHeaderSnapshot,
        sidebar: null,
      },
      router,
      sidebarColumn,
      sidebar,
    );
    await settleSidebarProjection(sidebar);

    applyPayloadShellSnapshot(
      {
        header: headerSnapshot,
        sidebar: createPresentSidebarSnapshot({}),
      },
      router,
      sidebarColumn,
      sidebar,
    );
    await settleSidebarProjection(sidebar);

    expect(expectPresent(getBranchGroup(sidebar, 'music'), 'music group').hidden).to.equal(false);
    expect(
      expectPresent(getBranchGroup(sidebar, 'music/classical'), 'classical group').hidden,
    ).to.equal(false);
  });

  it('同一 topology の selectedId / initialExpandedIds 変更では再展開せず topology 変更では再評価すること', async () => {
    const { router, sidebarColumn, sidebar } = await getShellFixture();
    const storageKey = getLayoutSidebarTreeStateStorageKey({
      sidebarId: 'note-primary',
      stateScopeId: 'note-navigation',
    });

    applyPayloadShellSnapshot(
      {
        header: headerSnapshot,
        sidebar: createPresentSidebarSnapshot({
          selectedId: 'music/classical/tchaikovsky/the-nutcracker',
          topologyRevision: 'topology:note-v1',
        }),
      },
      router,
      sidebarColumn,
      sidebar,
    );
    await settleSidebarProjection(sidebar);

    const classicalButton = expectPresent(
      getControl(sidebar, 'music/classical'),
      'classical toggle',
    ) as HTMLButtonElement;
    classicalButton.click();
    await settleSidebarProjection(sidebar);

    expect(
      expectPresent(getBranchGroup(sidebar, 'music/classical'), 'classical group').hidden,
    ).to.equal(true);

    applyPayloadShellSnapshot(
      {
        header: headerSnapshot,
        sidebar: createPresentSidebarSnapshot({
          selectedId: 'music/classical/beethoven/symphony-9',
          initialExpandedIds: ['music', 'music/classical'],
          topologyRevision: 'topology:note-v1',
        }),
      },
      router,
      sidebarColumn,
      sidebar,
    );
    await settleSidebarProjection(sidebar);

    expect(
      expectPresent(getBranchGroup(sidebar, 'music/classical'), 'same topology classical group')
        .hidden,
    ).to.equal(true);

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        expandedIds: ['legacy-only', 'music'],
      } satisfies PersistedLayoutSidebarState),
    );

    applyPayloadShellSnapshot(
      {
        header: headerSnapshot,
        sidebar: createPresentSidebarSnapshot({
          selectedId: 'music/classical/mozart/requiem',
          initialExpandedIds: ['music', 'music/classical'],
          topologyRevision: 'topology:note-v2',
          navHtml: noteNavHtmlWithoutLegacy,
        }),
      },
      router,
      sidebarColumn,
      sidebar,
    );
    await settleSidebarProjection(sidebar);

    expect(
      expectPresent(getBranchGroup(sidebar, 'music/classical'), 'new topology classical group')
        .hidden,
    ).to.equal(false);
    expect(getControl(sidebar, 'legacy-only')).to.equal(null);

    const stored = JSON.parse(
      localStorage.getItem(storageKey) ?? '{}',
    ) as PersistedLayoutSidebarState;
    expect(stored.expandedIds ?? []).to.not.include('legacy-only');
  });

  it('custom element method path では applyShellProjection 前に host.hidden を変更しないこと', () => {
    const router = document.createElement('app-router');
    const sidebarColumn = document.createElement('aside');
    const sidebar = document.createElement('div') as unknown as SidebarProjectionMethodHost;
    const observedHidden: boolean[] = [];

    sidebar.applyShellProjection = (snapshot: unknown): void => {
      observedHidden.push(sidebar.hidden);
      sidebar.hidden = !(snapshot as { present?: boolean }).present;
    };

    sidebar.hidden = true;
    applyPayloadShellSnapshot(
      {
        header: headerSnapshot,
        sidebar: createPresentSidebarSnapshot({ navHtml }),
      },
      router,
      sidebarColumn,
      sidebar,
    );

    sidebar.hidden = false;
    applyPayloadShellSnapshot(
      {
        header: absentHeaderSnapshot,
        sidebar: null,
      },
      router,
      sidebarColumn,
      sidebar,
    );

    expect(observedHidden).to.deep.equal([true, false]);
    expect(sidebar.hidden).to.equal(true);
  });

  it('SSR hidden sidebar の readShellProjection は stale attributes を canonical absent として読むこと', async () => {
    const sidebar = await fixture<LayoutSidebar>(html`
      <layout-sidebar
        hidden
        sidebar-id="note-primary"
        state-scope-id="note-navigation"
        selected-id="stale"
        initial-expanded-ids='["stale"]'
        topology-revision="topology:stale"
        fixed-breakpoint="1024"
        presentation="overlay"
      >${navHtml}</layout-sidebar>
    `);

    expect(validateRuntimeSidebarProjection(sidebar.readShellProjection())).to.deep.equal(
      createCanonicalAbsentRuntimeSidebarProjection(),
    );
  });

  it('custom element method 不在 fallback path でも absent commit が stale state を残さないこと', () => {
    const router = document.createElement('app-router');
    const sidebarColumn = document.createElement('aside');
    const sidebar = document.createElement('div') as HTMLElement & {
      sidebarId?: unknown;
      stateScopeId?: unknown;
      initialExpandedIdsJson?: unknown;
      presentation?: unknown;
      fixedBreakpoint?: unknown;
    };

    sidebar.setAttribute('sidebar-id', 'note-secondary');
    sidebar.setAttribute('state-scope-id', 'note-secondary-scope');
    sidebar.setAttribute('selected-id', 'stale');
    sidebar.setAttribute('initial-expanded-ids', '["stale"]');
    sidebar.setAttribute('topology-revision', 'topology:stale');
    sidebar.setAttribute('presentation', 'overlay');
    sidebar.setAttribute('fixed-breakpoint', '768');
    sidebar.sidebarId = 'note-secondary';
    sidebar.stateScopeId = 'note-secondary-scope';
    sidebar.initialExpandedIdsJson = '["stale"]';
    sidebar.presentation = 'overlay';
    sidebar.fixedBreakpoint = 768;
    sidebar.innerHTML = navHtml;
    layoutSidebarController.reset();
    layoutSidebarController.initialize('note-secondary', {
      presentation: 'overlay',
      fixedBreakpoint: 1024,
      storage: null,
    });
    layoutSidebarController.open('note-secondary');
    expect(layoutSidebarController.getSnapshot('note-secondary').state).to.equal('expanded');

    applyPayloadShellSnapshot(
      {
        header: {
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: false,
          sidebarEnabled: false,
          sidebarId: 'note-primary',
          tocPresence: 'absent',
          tocRuntimeId: null,
          tocOwnerId: null,
          tocTriggerReserved: false,
        },
        sidebar: null,
      },
      router,
      sidebarColumn,
      sidebar,
    );

    expect(router.getAttribute('data-sidebar-presence')).to.equal('absent');
    expect(sidebarColumn.hidden).to.equal(true);
    expect(sidebar.hidden).to.equal(true);
    expect(sidebar.getAttribute('sidebar-id')).to.equal(null);
    expect(sidebar.getAttribute('state-scope-id')).to.equal(null);
    expect(sidebar.getAttribute('selected-id')).to.equal(null);
    expect(sidebar.getAttribute('initial-expanded-ids')).to.equal(null);
    expect(sidebar.getAttribute('topology-revision')).to.equal(null);
    expect(sidebar.sidebarId).to.equal('note-primary');
    expect(sidebar.stateScopeId).to.equal('note-navigation');
    expect(sidebar.initialExpandedIdsJson).to.equal('[]');
    expect(sidebar.presentation).to.equal('auto');
    expect(sidebar.fixedBreakpoint).to.equal(1024);
    expect(sidebar.innerHTML).to.equal('');
    expect(layoutSidebarController.getSnapshot('note-secondary').state).to.equal('collapsed');
  });

  it('rollback path は runtime absent snapshot を canonical object として復元すること', () => {
    const router = document.createElement('app-router');
    const sidebarColumn = document.createElement('aside');
    const sidebar = document.createElement('div');

    sidebar.setAttribute('sidebar-id', 'note-primary');
    sidebar.setAttribute('state-scope-id', 'note-navigation');
    sidebar.setAttribute('selected-id', 'visible');
    sidebar.setAttribute('initial-expanded-ids', '[]');
    sidebar.setAttribute('topology-revision', 'topology:visible');
    sidebar.setAttribute('presentation', 'auto');
    sidebar.setAttribute('fixed-breakpoint', '1024');
    sidebar.innerHTML = navHtml;

    applyRuntimeSidebarSnapshotForRollback(
      {
        header: {
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: false,
          sidebarEnabled: false,
          sidebarId: 'note-primary',
          tocPresence: 'absent',
          tocRuntimeId: null,
          tocOwnerId: null,
          tocTriggerReserved: false,
        },
        sidebar: createCanonicalAbsentRuntimeSidebarProjection(),
      },
      router,
      sidebarColumn,
      sidebar,
    );

    expect(router.getAttribute('data-sidebar-presence')).to.equal('absent');
    expect(sidebarColumn.hidden).to.equal(true);
    expect(sidebar.hidden).to.equal(true);
    expect(sidebar.innerHTML).to.equal('');
    expect(sidebar.getAttribute('topology-revision')).to.equal(null);
  });

  it('visible sidebar の missing identity を runtime readback で default 化しないこと', async () => {
    const sidebar = await fixture<LayoutSidebar>(html`
      <layout-sidebar
        state-scope-id="note-navigation"
        selected-id="a"
        initial-expanded-ids="[]"
        topology-revision="topology:test"
      >${navHtml}</layout-sidebar>
    `);

    sidebar.hidden = false;
    sidebar.removeAttribute('sidebar-id');
    sidebar.sidebarId = '';

    expect(() => sidebar.readShellProjection()).to.throw();
  });

});
