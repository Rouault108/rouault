export type SidebarIdentityValidationResult =
  | { kind: 'missing' }
  | { kind: 'empty' }
  | { kind: 'invalid-type'; value: unknown }
  | { kind: 'too-long'; value: string }
  | { kind: 'invalid-format'; value: string }
  | { kind: 'valid'; value: string };

const SIDEBAR_ID_PATTERN = /^[A-Za-z0-9._:-]+$/u;
const MAX_SIDEBAR_ID_LENGTH = 128;

const validateSidebarIdentityInput = (value: unknown): SidebarIdentityValidationResult => {
  if (value === null || value === undefined) {
    return { kind: 'missing' };
  }

  if (typeof value !== 'string') {
    return { kind: 'invalid-type', value };
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return { kind: 'empty' };
  }

  if (normalized.length > MAX_SIDEBAR_ID_LENGTH) {
    return { kind: 'too-long', value: normalized };
  }

  if (!SIDEBAR_ID_PATTERN.test(normalized)) {
    return { kind: 'invalid-format', value: normalized };
  }

  return { kind: 'valid', value: normalized };
};

export const validateSidebarIdInput = (value: unknown): SidebarIdentityValidationResult =>
  validateSidebarIdentityInput(value);

export const validateSidebarStateScopeIdInput = (value: unknown): SidebarIdentityValidationResult =>
  validateSidebarIdentityInput(value);

export const normalizeSidebarId = (value: string): string | null => {
  const result = validateSidebarIdInput(value);
  return result.kind === 'valid' ? result.value : null;
};

export const normalizeSidebarStateScopeId = (value: string): string | null => {
  const result = validateSidebarStateScopeIdInput(value);
  return result.kind === 'valid' ? result.value : null;
};

export const assertValidSidebarId = (value: unknown, label = 'sidebarId'): string => {
  const result = validateSidebarIdInput(value);
  if (result.kind !== 'valid') {
    throw new Error(`${label} is invalid: ${result.kind}`);
  }
  return result.value;
};

export const assertValidSidebarStateScopeId = (value: unknown, label = 'stateScopeId'): string => {
  const result = validateSidebarStateScopeIdInput(value);
  if (result.kind !== 'valid') {
    throw new Error(`${label} is invalid: ${result.kind}`);
  }
  return result.value;
};
