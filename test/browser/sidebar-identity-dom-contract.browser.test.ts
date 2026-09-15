import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';

import {
  SidebarIdentityDocumentContractError,
  validateSidebarIdentityInstances,
} from '../../shared/navigation/sidebar-identity-document-contract.js';

const readLayoutSidebarInstances = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>('[data-layout-sidebar-root]')].map((sidebar, index) => ({
    sidebarId: sidebar.getAttribute('data-sidebar-id'),
    present: !sidebar.hasAttribute('hidden'),
    sourceLabel: `fixture:${String(index)}`,
  }));

describe('sidebar identity document contract', () => {
  it('stateScopeId が異なっても document-wide の sidebar-id 重複を拒否すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <aside
          data-layout-sidebar-root
          data-sidebar-id="note-primary"
          data-state-scope-id="scope-a"
        ></aside>
        <aside
          data-layout-sidebar-root
          data-sidebar-id="note-primary"
          data-state-scope-id="scope-b"
        ></aside>
      </div>
    `);

    expect(() =>
      validateSidebarIdentityInstances(readLayoutSidebarInstances(wrapper), {
        sourceLabel: 'browser-test',
      }),
    ).to.throw(SidebarIdentityDocumentContractError);
  });

  it('hidden な absent placeholder は document-wide sidebar-id 重複として数えないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <aside
          data-layout-sidebar-root
          data-sidebar-id="note-primary"
          data-state-scope-id="scope-a"
        ></aside>
        <aside
          data-layout-sidebar-root
          hidden
          data-sidebar-id="note-primary"
          data-state-scope-id="scope-b"
        ></aside>
      </div>
    `);

    expect(() =>
      validateSidebarIdentityInstances(readLayoutSidebarInstances(wrapper), {
        sourceLabel: 'browser-test',
      }),
    ).not.to.throw();
  });
});
