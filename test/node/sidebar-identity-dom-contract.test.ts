import { describe, expect, it } from 'vitest';
import * as parse5 from 'parse5';

import { validateDocumentSidebarIdentityContract } from '../../build/navigation/sidebar-identity-dom-contract.js';
import { SidebarIdentityDocumentContractError } from '../../shared/navigation/sidebar-identity-document-contract.js';

describe('sidebar identity DOM contract', () => {
  it('validateDocumentSidebarIdentityContract() は present layout-sidebar の sidebar-id 重複を拒否すること', () => {
    const document = parse5.parse(`
      <html>
        <body>
          <layout-sidebar sidebar-id="note-primary"></layout-sidebar>
          <layout-sidebar sidebar-id="note-primary"></layout-sidebar>
        </body>
      </html>
    `);

    expect(() =>
      validateDocumentSidebarIdentityContract(document, { sourceLabel: 'dom-contract-test' }),
    ).toThrow(SidebarIdentityDocumentContractError);
  });

  it('hidden absent placeholder は document-wide 重複判定から除外すること', () => {
    const document = parse5.parse(`
      <html>
        <body>
          <layout-sidebar sidebar-id="note-primary"></layout-sidebar>
          <layout-sidebar hidden sidebar-id="note-primary"></layout-sidebar>
        </body>
      </html>
    `);

    expect(() =>
      validateDocumentSidebarIdentityContract(document, { sourceLabel: 'dom-contract-test' }),
    ).not.toThrow();
  });
});
