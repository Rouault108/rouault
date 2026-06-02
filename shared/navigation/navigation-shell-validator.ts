import {
  assertValidSidebarId,
  assertValidSidebarStateScopeId,
} from './sidebar-identity-contract.js';
import type {
  RuntimeSidebarShellSnapshot,
  NavigationShellSnapshot,
  PayloadSidebarShellProjection,
  SidebarPresentation,
} from './navigation-shell-snapshot.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from './sidebar-shell-defaults.js';
import {
  SidebarNavHtmlPresenceError,
  assertRuntimeSidebarNavHtmlPresence,
} from './sidebar-nav-html-presence.js';

export type NavigationShellValidationReason =
  | 'invalid-shell'
  | 'invalid-header-html'
  | 'invalid-sidebar'
  | 'payload-present-false'
  | 'runtime-absent-non-canonical'
  | 'sidebar-id-invalid'
  | 'state-scope-id-invalid'
  | 'nav-html-invalid';

export class NavigationShellValidationError extends Error {
  override name = 'NavigationShellValidationError' as const;
  readonly reason: NavigationShellValidationReason;
  readonly sourceLabel?: string;

  constructor({
    reason,
    sourceLabel,
  }: {
    reason: NavigationShellValidationReason;
    sourceLabel?: string;
  }) {
    super(`[navigation-shell]${sourceLabel ? ` ${sourceLabel}:` : ''} ${reason}`);
    this.reason = reason;
    if (sourceLabel !== undefined) {
      this.sourceLabel = sourceLabel;
    }
  }
}

function fail(
  _message: string,
  reason: NavigationShellValidationReason,
  sourceLabel = 'shell',
): never {
  throw new NavigationShellValidationError({ reason, sourceLabel });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireRecord = (
  value: unknown,
  message: string,
  reason: NavigationShellValidationReason,
): Record<string, unknown> => {
  if (!isRecord(value)) {
    fail(message, reason);
  }
  return value;
};

const isString = (value: unknown): value is string => typeof value === 'string';
const isSidebarPresentation = (value: unknown): value is SidebarPresentation =>
  value === 'auto' || value === 'fixed' || value === 'overlay';

const readSidebarId = (value: unknown, label: string): string => {
  try {
    return assertValidSidebarId(value, label);
  } catch (error) {
    fail(error instanceof Error ? error.message : `${label} is invalid.`, 'sidebar-id-invalid');
  }
};

const readStateScopeId = (value: unknown, label: string): string => {
  try {
    return assertValidSidebarStateScopeId(value, label);
  } catch (error) {
    fail(error instanceof Error ? error.message : `${label} is invalid.`, 'state-scope-id-invalid');
  }
};

const optionalStringOrNull = (value: unknown, label: string): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isString(value)) {
    fail(`${label} must be string or null.`, 'invalid-sidebar');
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const requiredString = (
  value: unknown,
  label: string,
  options?: { preserveWhitespace?: boolean },
): string => {
  if (!isString(value)) {
    fail(`${label} must be string.`, 'invalid-sidebar');
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    fail(
      `${label} must be non-empty.`,
      label === 'navHtml' ? 'nav-html-invalid' : 'invalid-sidebar',
    );
  }
  return options?.preserveWhitespace === true ? value : normalized;
};

const readStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || !value.every(isString)) {
    fail(`${label} must be string[].`, 'invalid-sidebar');
  }
  return value.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
};

const validatePresentSidebar = (value: Record<string, unknown>): PayloadSidebarShellProjection => {
  const sidebarId = readSidebarId(value['sidebarId'], 'sidebar.sidebarId');
  const stateScopeId = readStateScopeId(value['stateScopeId'], 'sidebar.stateScopeId');

  const rawSelectedId = value['selectedId'];
  const selectedId: string | null = rawSelectedId === null
    ? null
    : isString(rawSelectedId)
      ? rawSelectedId
      : fail('sidebar.selectedId must be string or null.', 'invalid-sidebar');

  const presentation = value['presentation'];
  const fixedBreakpoint = value['fixedBreakpoint'];
  if (!isSidebarPresentation(presentation) || typeof fixedBreakpoint !== 'number') {
    fail('sidebar presentation fields are invalid.', 'invalid-sidebar');
  }

  const navHtml = value['navHtml'];
  try {
    assertRuntimeSidebarNavHtmlPresence({
      sidebarPresent: true,
      navHtml,
      sourceLabel: 'shell.sidebarProjection',
    });
  } catch (error) {
    if (error instanceof SidebarNavHtmlPresenceError) {
      fail(error.message, 'nav-html-invalid', error.sourceLabel);
    }
    throw error;
  }
  if (!isString(navHtml)) {
    fail('sidebar.navHtml must be string.', 'nav-html-invalid');
  }

  return {
    present: true,
    sidebarId,
    stateScopeId,
    selectedId: selectedId === null ? null : selectedId.trim(),
    initialExpandedIds: readStringArray(value['initialExpandedIds'], 'sidebar.initialExpandedIds'),
    topologyRevision: requiredString(value['topologyRevision'], 'topologyRevision'),
    navHtml: navHtml.trim(),
    heading: optionalStringOrNull(value['heading'], 'sidebar.heading'),
    fixedBreakpoint,
    presentation,
  };
};

const validatePayloadSidebar = (value: unknown): PayloadSidebarShellProjection => {
  const record = requireRecord(
    value,
    'shell.sidebarProjection must be object or null.',
    'invalid-sidebar',
  );

  if (record['present'] === false) {
    fail('payload shell.sidebarProjection must use null for absent sidebar.', 'payload-present-false');
  }

  if (record['present'] !== true) {
    fail('payload shell.sidebarProjection.present must be true.', 'invalid-sidebar');
  }

  return validatePresentSidebar(record);
};

export const validateRuntimeSidebarProjection = (
  value: unknown,
): RuntimeSidebarShellSnapshot => {
  const record = requireRecord(value, 'runtime sidebar projection must be object.', 'invalid-sidebar');
  if (record['present'] === true) {
    return validatePresentSidebar(record);
  }
  if (record['present'] !== false) {
    fail('runtime sidebar projection present must be boolean.', 'invalid-sidebar');
  }
  if (
    record['sidebarId'] !== DEFAULT_SIDEBAR_ID ||
    record['stateScopeId'] !== DEFAULT_SIDEBAR_STATE_SCOPE_ID ||
    record['selectedId'] !== null ||
    !Array.isArray(record['initialExpandedIds']) ||
    record['initialExpandedIds'].length !== 0 ||
    record['topologyRevision'] !== null ||
    record['navHtml'] !== null ||
    record['heading'] !== null ||
    record['fixedBreakpoint'] !== DEFAULT_SIDEBAR_FIXED_BREAKPOINT ||
    record['presentation'] !== DEFAULT_SIDEBAR_PRESENTATION
  ) {
    fail('absent runtime sidebar projection must be canonical.', 'runtime-absent-non-canonical');
  }
  return {
    present: false,
    sidebarId: DEFAULT_SIDEBAR_ID,
    stateScopeId: DEFAULT_SIDEBAR_STATE_SCOPE_ID,
    selectedId: null,
    initialExpandedIds: [],
    topologyRevision: null,
    navHtml: null,
    heading: null,
    fixedBreakpoint: DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
    presentation: DEFAULT_SIDEBAR_PRESENTATION,
  };
};

export const validateNavigationEnvelopeShell = (
  value: unknown,
): NavigationShellSnapshot => {
  const record = requireRecord(value, 'shell must be object.', 'invalid-shell');
  const headerHtml = record['headerHtml'];
  if (!isString(headerHtml) || headerHtml.trim().length === 0) {
    fail('shell.headerHtml must be a non-empty string.', 'invalid-header-html');
  }

  return {
    headerHtml,
    sidebarProjection:
      record['sidebarProjection'] === null ? null : validatePayloadSidebar(record['sidebarProjection']),
  };
};
