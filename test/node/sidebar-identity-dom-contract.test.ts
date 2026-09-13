import { describe, expect, it } from 'vitest';
import * as parse5 from 'parse5';

import { validateDocumentSidebarIdentityContract } from '../../build/navigation/sidebar-identity-dom-contract.js';
import { SidebarIdentityDocumentContractError } from '../../shared/navigation/sidebar-identity-document-contract.js';

describe('sidebar identity DOM contract', () => {
  it('validateDocumentSidebarIdentityContract() は present layout-sidebar の sidebar-id 重複を拒否すること', () => {
    const document = parse5.parse(`
      <html>
        <body>
          <aside data-layout-sidebar-root sidebar-id="note-primary"></aside>
          <aside data-layout-sidebar-root sidebar-id="note-primary"></aside>
        </body>
      </html>
    `);

    expect(() =>
      validateDocumentSidebarIdentityContract(document, { sourceLabel: 'dom-contract-test' }),
    ).toThrow(SidebarIdentityDocumentContractError);
  });

  it('hidden root も structural cardinality に数えること', () => {
    const document = parse5.parse(`
      <html>
        <body>
          <aside data-layout-sidebar-root sidebar-id="note-primary"></aside>
          <aside data-layout-sidebar-root hidden sidebar-id="note-primary"></aside>
        </body>
      </html>
    `);

    expect(() =>
      validateDocumentSidebarIdentityContract(document, { sourceLabel: 'dom-contract-test' }),
    ).toThrow(SidebarIdentityDocumentContractError);
  });
});
