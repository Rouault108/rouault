import {
  assertValidSidebarId,
  assertValidSidebarStateScopeId,
} from './sidebar-identity-contract.js';

export class SidebarIdentityDocumentContractError extends Error {
  override name = 'SidebarIdentityDocumentContractError' as const;
}

export interface SidebarIdentityDocumentRecord {
  readonly sidebarId: unknown;
  readonly stateScopeId: unknown;
  readonly hidden?: boolean;
  readonly sourceLabel?: string;
}

const fail = (sourceLabel: string, message: string): never => {
  throw new SidebarIdentityDocumentContractError(`[sidebar-identity:${sourceLabel}] ${message}`);
};

export const assertUniqueDocumentSidebarIds = (
  records: readonly SidebarIdentityDocumentRecord[],
  sourceLabel = 'document',
): void => {
  const seenSidebarIds = new Set<string>();

  for (const record of records) {
    if (record.hidden === true) {
      continue;
    }

    let sidebarId: string;
    try {
      sidebarId = assertValidSidebarId(record.sidebarId, 'layout-sidebar[sidebar-id]');
      assertValidSidebarStateScopeId(record.stateScopeId, 'layout-sidebar[state-scope-id]');
    } catch (error) {
      fail(record.sourceLabel ?? sourceLabel, error instanceof Error ? error.message : 'sidebar identity is invalid.');
    }

    if (seenSidebarIds.has(sidebarId)) {
      fail(record.sourceLabel ?? sourceLabel, `duplicate layout-sidebar sidebar-id: ${sidebarId}`);
    }
    seenSidebarIds.add(sidebarId);
  }
};
