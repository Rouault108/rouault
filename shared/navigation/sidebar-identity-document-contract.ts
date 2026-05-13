import { assertValidSidebarId } from './sidebar-identity-contract.js';

export class SidebarIdentityDocumentContractError extends Error {
  override name = 'SidebarIdentityDocumentContractError' as const;
}

export interface SidebarIdentityDocumentInstance {
  readonly sidebarId: unknown;
  readonly present: boolean;
  readonly sourceLabel: string;
}

export interface ValidateSidebarIdentityInstancesOptions {
  readonly sourceLabel?: string;
}

const fail = (sourceLabel: string, message: string): never => {
  throw new SidebarIdentityDocumentContractError(`[sidebar-identity:${sourceLabel}] ${message}`);
};

export const validateSidebarIdentityInstances = (
  instances: readonly SidebarIdentityDocumentInstance[],
  options: ValidateSidebarIdentityInstancesOptions = {},
): void => {
  const sourceLabel = options.sourceLabel ?? 'document';
  const seenSidebarIds = new Set<string>();

  for (const instance of instances) {
    if (!instance.present) {
      continue;
    }

    let sidebarId: string;
    try {
      sidebarId = assertValidSidebarId(instance.sidebarId, 'layout-sidebar[sidebar-id]');
    } catch (error) {
      fail(instance.sourceLabel || sourceLabel, error instanceof Error ? error.message : 'sidebar id is invalid.');
    }

    if (seenSidebarIds.has(sidebarId)) {
      fail(instance.sourceLabel || sourceLabel, `duplicate layout-sidebar sidebar-id: ${sidebarId}`);
    }
    seenSidebarIds.add(sidebarId);
  }
};

export interface SidebarIdentityDocumentRecord {
  readonly sidebarId: unknown;
  readonly stateScopeId?: unknown;
  readonly hidden?: boolean;
  readonly sourceLabel?: string;
}

export const assertUniqueDocumentSidebarIds = (
  records: readonly SidebarIdentityDocumentRecord[],
  sourceLabel = 'document',
): void => {
  validateSidebarIdentityInstances(
    records.map((record, index) => ({
      sidebarId: record.sidebarId,
      present: record.hidden !== true,
      sourceLabel: record.sourceLabel ?? `${sourceLabel}:layout-sidebar[${String(index)}]`,
    })),
    { sourceLabel },
  );
};
