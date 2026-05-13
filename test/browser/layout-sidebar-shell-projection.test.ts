import { expect, fixture, html } from '@open-wc/testing';

import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import '../../src/components/layout/layout-sidebar.js';
import { createCanonicalAbsentRuntimeSidebarProjection } from '../../shared/navigation/sidebar-shell-projection-contract.js';
import { validateRuntimeSidebarProjection } from '../../shared/navigation/shell-projection-validator.js';
import {
  applyPayloadShellSnapshot,
  applyRuntimeSidebarSnapshotForRollback,
} from '../../src/components/app/shell/layout-sidebar-shell-adapter.js';

const navHtml = '<nav data-sidebar-nav aria-label="ノートナビゲーション"><ul><li data-node-id="a" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/a"><span data-sidebar-nav-label>A</span></a></li></ul></nav>';

describe('layout-sidebar shell projection browser contract', () => {
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

    applyPayloadShellSnapshot(
      {
        header: {
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: false,
          sidebarEnabled: false,
          sidebarId: 'note-primary',
          tocPresence: 'absent',
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
