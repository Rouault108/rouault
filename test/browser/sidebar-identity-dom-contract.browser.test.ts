import { expect, fixture, html } from '@open-wc/testing';

import {
  SidebarIdentityDocumentContractError,
  validateSidebarIdentityInstances,
} from '../../shared/navigation/sidebar-identity-document-contract.js';

const readLayoutSidebarInstances = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>('layout-sidebar')].map((sidebar, index) => ({
    sidebarId: sidebar.getAttribute('sidebar-id'),
    present: !sidebar.hasAttribute('hidden'),
    sourceLabel: `fixture:${String(index)}`,
  }));

describe('sidebar identity document contract', () => {
  it('stateScopeId が異なっても document-wide の sidebar-id 重複を拒否すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <layout-sidebar sidebar-id="note-primary" state-scope-id="scope-a"></layout-sidebar>
        <layout-sidebar sidebar-id="note-primary" state-scope-id="scope-b"></layout-sidebar>
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
        <layout-sidebar sidebar-id="note-primary" state-scope-id="scope-a"></layout-sidebar>
        <layout-sidebar hidden sidebar-id="note-primary" state-scope-id="scope-b"></layout-sidebar>
      </div>
    `);

    expect(() =>
      validateSidebarIdentityInstances(readLayoutSidebarInstances(wrapper), {
        sourceLabel: 'browser-test',
      }),
    ).not.to.throw();
  });
});
