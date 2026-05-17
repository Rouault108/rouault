import type { TocPresence } from '../note/toc-presence.js';
import {
  assertValidSidebarId,
  assertValidSidebarStateScopeId,
} from './sidebar-identity-contract.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from './sidebar-shell-defaults.js';
import type {
  HeaderShellProjection,
  PayloadSidebarShellProjection,
  RuntimeSidebarShellSnapshot,
  ShellProjectionSnapshot,
  SidebarPresentation,
} from './shell-projection.js';
import {
  SidebarNavHtmlPresenceError,
  assertRuntimeSidebarNavHtmlPresence,
} from './sidebar-nav-html-presence.js';
import { parseCorpusNavigationProjectionPayload } from './corpus-navigation-projection.js';

export type ShellProjectionValidationReason =
  | 'invalid-shell'
  | 'invalid-header'
  | 'invalid-sidebar'
  | 'payload-present-false'
  | 'runtime-absent-non-canonical'
  | 'sidebar-id-invalid'
  | 'state-scope-id-invalid'
  | 'nav-html-invalid';

export class ShellProjectionValidationError extends Error {
  override name = 'ShellProjectionValidationError' as const;
  readonly reason: ShellProjectionValidationReason;
  readonly sourceLabel?: string;

  constructor({
    reason,
    sourceLabel,
  }: {
    reason: ShellProjectionValidationReason;
    sourceLabel?: string;
  }) {
    super(`[shell-projection]${sourceLabel ? ` ${sourceLabel}:` : ''} ${reason}`);
    this.reason = reason;
    if (sourceLabel !== undefined) {
      this.sourceLabel = sourceLabel;
    }
  }
}

function fail(
  _message: string,
  reason: ShellProjectionValidationReason,
  sourceLabel = 'shellProjection',
): never {
  throw new ShellProjectionValidationError({ reason, sourceLabel });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireRecord = (
  value: unknown,
  message: string,
  reason: ShellProjectionValidationReason,
): Record<string, unknown> => {
  if (!isRecord(value)) {
    fail(message, reason);
  }
  return value;
};

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isTocPresence = (value: unknown): value is TocPresence =>
  value === 'present' || value === 'absent';
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

const validateHeader = (value: unknown): HeaderShellProjection => {
  const record = requireRecord(value, 'shellProjection.header must be object.', 'invalid-header');

  const normalizedCorpora = parseCorpusNavigationProjectionPayload(record['corpora']);
  if (normalizedCorpora === null) {
    fail('header.corpora must be CorpusNavigationProjectionPayload.', 'invalid-header');
  }

  const currentCorpusKey = record['currentCorpusKey'];
  const noteLayout = record['noteLayout'];
  const sidebarEnabled = record['sidebarEnabled'];
  if (!isString(currentCorpusKey) || !isBoolean(noteLayout) || !isBoolean(sidebarEnabled)) {
    fail('header scalar fields are invalid.', 'invalid-header');
  }

  const sidebarId = readSidebarId(record['sidebarId'], 'header.sidebarId');
  const tocPresence = record['tocPresence'];
  if (!isTocPresence(tocPresence)) {
    fail('header.tocPresence is invalid.', 'invalid-header');
  }
  const tocRuntimeId = optionalStringOrNull(record['tocRuntimeId'], 'header.tocRuntimeId');
  const tocOwnerId = optionalStringOrNull(record['tocOwnerId'], 'header.tocOwnerId');
  const tocTriggerReserved = record['tocTriggerReserved'];
  if (!isBoolean(tocTriggerReserved)) {
    fail('header.tocTriggerReserved must be boolean.', 'invalid-header');
  }

  if (tocPresence === 'absent') {
    if (tocRuntimeId !== null || tocOwnerId !== null || tocTriggerReserved) {
      fail('absent TOC header projection must clear TOC identity.', 'invalid-header');
    }
  } else if (tocRuntimeId === null || tocOwnerId === null) {
    fail('present TOC header projection requires TOC identity.', 'invalid-header');
  }

  return {
    corpora: normalizedCorpora,
    currentCorpusKey: currentCorpusKey.trim(),
    noteLayout,
    sidebarEnabled,
    sidebarId,
    tocPresence,
    tocRuntimeId,
    tocOwnerId,
    tocTriggerReserved,
  };
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
      sourceLabel: 'shellProjection.sidebar',
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
    'shellProjection.sidebar must be object or null.',
    'invalid-sidebar',
  );

  if (record['present'] === false) {
    fail('payload shellProjection.sidebar must use null for absent sidebar.', 'payload-present-false');
  }

  if (record['present'] !== true) {
    fail('payload shellProjection.sidebar.present must be true.', 'invalid-sidebar');
  }

  return validatePresentSidebar(record);
};

export const validateNavigationEnvelopeShellProjection = (
  value: unknown,
): ShellProjectionSnapshot | null => {
  if (value === null) {
    return null;
  }

  const record = requireRecord(value, 'shellProjection must be object or null.', 'invalid-shell');
  const header = validateHeader(record['header']);
  const sidebar = record['sidebar'] === null ? null : validatePayloadSidebar(record['sidebar']);

  if (header.sidebarEnabled && sidebar === null) {
    fail('header.sidebarEnabled=true requires present sidebar payload.', 'invalid-shell');
  }

  if (!header.sidebarEnabled && sidebar !== null) {
    fail('header.sidebarEnabled=false requires shellProjection.sidebar=null.', 'invalid-shell');
  }

  if (!header.sidebarEnabled && header.sidebarId !== DEFAULT_SIDEBAR_ID) {
    fail('header.sidebarId must be the default sidebar id when sidebar is disabled.', 'sidebar-id-invalid');
  }

  if (sidebar !== null && header.sidebarId !== sidebar.sidebarId) {
    fail('header.sidebarId must match sidebar.sidebarId.', 'sidebar-id-invalid');
  }

  return { header, sidebar };
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

  const canonical =
    record['sidebarId'] === DEFAULT_SIDEBAR_ID &&
    record['stateScopeId'] === DEFAULT_SIDEBAR_STATE_SCOPE_ID &&
    record['selectedId'] === null &&
    Array.isArray(record['initialExpandedIds']) &&
    record['initialExpandedIds'].length === 0 &&
    record['topologyRevision'] === null &&
    record['navHtml'] === null &&
    record['heading'] === null &&
    record['fixedBreakpoint'] === DEFAULT_SIDEBAR_FIXED_BREAKPOINT &&
    record['presentation'] === DEFAULT_SIDEBAR_PRESENTATION;

  if (!canonical) {
    fail('runtime absent sidebar projection is not canonical.', 'runtime-absent-non-canonical');
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

export const normalizeRuntimeSidebarProjectionForPayload = (
  value: RuntimeSidebarShellSnapshot | null,
): PayloadSidebarShellProjection | null => {
  if (value === null || value.present === false) {
    return null;
  }
  return value;
};
