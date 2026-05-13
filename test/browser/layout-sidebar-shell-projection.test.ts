import { expect, fixture, html } from '@open-wc/testing';

import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import '../../src/components/layout/layout-sidebar.js';
import { createCanonicalAbsentRuntimeSidebarProjection } from '../../shared/navigation/sidebar-shell-projection-contract.js';
import { validateRuntimeSidebarProjection } from '../../shared/navigation/shell-projection-validator.js';

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
