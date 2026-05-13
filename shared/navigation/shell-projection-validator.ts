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

const fail = (
  _message: string,
  reason: ShellProjectionValidationReason,
  sourceLabel = 'shellProjection',
): never => {
  throw new ShellProjectionValidationError({ reason, sourceLabel });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isTocPresence = (value: unknown): value is TocPresence =>
  value === 'present' || value === 'absent';
const isSidebarPresentation = (value: unknown): value is SidebarPresentation =>
  value === 'auto' || value === 'fixed' || value === 'overlay';

const optionalStringOrNull = (value: unknown, label: string): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isString(value)) {
    fail(`${label} must be string or null.`, 'invalid-sidebar');
  }
  const valueString = value as string;
  const normalized = valueString.trim();
  return normalized.length > 0 ? normalized : null;
};

const requiredString = (value: unknown, label: string, options?: { preserveWhitespace?: boolean }): string => {
  if (!isString(value)) {
    fail(`${label} must be string.`, 'invalid-sidebar');
  }
  const valueString = value as string;
  const normalized = valueString.trim();
  if (normalized.length === 0) {
    fail(`${label} must be non-empty.`, label === 'navHtml' ? 'nav-html-invalid' : 'invalid-sidebar');
  }
  return options?.preserveWhitespace === true ? valueString : normalized;
};

const readStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || !value.every(isString)) {
    fail(`${label} must be string[].`, 'invalid-sidebar');
  }
  return (value as string[]).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
};

const validateHeader = (value: unknown): HeaderShellProjection => {
  if (!isRecord(value)) {
    fail('shellProjection.header must be object.', 'invalid-header');
  }

  const corpora = value['corpora'];
  if (!Array.isArray(corpora)) {
    fail('header.corpora must be array.', 'invalid-header');
  }

  const normalizedCorpora = corpora.map((item): HeaderShellProjection['corpora'][number] => {
    if (!isRecord(item) || !isString(item['key']) || !isString(item['label']) || !isString(item['href'])) {
      fail('header.corpora item is invalid.', 'invalid-header');
    }
    return {
      key: (item['key'] as string).trim(),
      label: (item['label'] as string).trim(),
      href: (item['href'] as string).trim(),
    };
  });

  if (!isString(value['currentCorpusKey']) || !isBoolean(value['noteLayout']) || !isBoolean(value['sidebarEnabled'])) {
    fail('header scalar fields are invalid.', 'invalid-header');
  }

  let sidebarId: string;
  try {
    sidebarId = assertValidSidebarId(value['sidebarId'], 'header.sidebarId');
  } catch (error) {
    fail(error instanceof Error ? error.message : 'header.sidebarId is invalid.', 'sidebar-id-invalid');
  }

  if (!isTocPresence(value['tocPresence'])) {
    fail('header.tocPresence is invalid.', 'invalid-header');
  }

  return {
    corpora: normalizedCorpora,
    currentCorpusKey: (value['currentCorpusKey'] as string).trim(),
    noteLayout: value['noteLayout'],
    sidebarEnabled: value['sidebarEnabled'],
    sidebarId,
    tocPresence: value['tocPresence'],
    tocRuntimeId: optionalStringOrNull(value['tocRuntimeId'], 'header.tocRuntimeId'),
    tocOwnerId: optionalStringOrNull(value['tocOwnerId'], 'header.tocOwnerId'),
    ...(value['tocTriggerReserved'] === undefined
      ? {}
      : { tocTriggerReserved: Boolean(value['tocTriggerReserved']) }),
  };
};

const validatePresentSidebar = (value: Record<string, unknown>): PayloadSidebarShellProjection => {
  let sidebarId: string;
  let stateScopeId: string;
  try {
    sidebarId = assertValidSidebarId(value['sidebarId'], 'sidebar.sidebarId');
  } catch (error) {
    fail(error instanceof Error ? error.message : 'sidebar.sidebarId is invalid.', 'sidebar-id-invalid');
  }
  try {
    stateScopeId = assertValidSidebarStateScopeId(value['stateScopeId'], 'sidebar.stateScopeId');
  } catch (error) {
    fail(
      error instanceof Error ? error.message : 'sidebar.stateScopeId is invalid.',
      'state-scope-id-invalid',
    );
  }

  if (value['selectedId'] !== null && !isString(value['selectedId'])) {
    fail('sidebar.selectedId must be string or null.', 'invalid-sidebar');
  }

  if (!isSidebarPresentation(value['presentation']) || typeof value['fixedBreakpoint'] !== 'number') {
    fail('sidebar presentation fields are invalid.', 'invalid-sidebar');
  }

  return {
    present: true,
    sidebarId,
    stateScopeId,
    selectedId: value['selectedId'] === null ? null : (value['selectedId'] as string).trim(),
    initialExpandedIds: readStringArray(value['initialExpandedIds'], 'sidebar.initialExpandedIds'),
    topologyRevision: requiredString(value['topologyRevision'], 'topologyRevision'),
    navHtml: (() => {
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
      return (navHtml as string).trim();
    })(),
    heading: optionalStringOrNull(value['heading'], 'sidebar.heading'),
    fixedBreakpoint: value['fixedBreakpoint'] as number,
    presentation: value['presentation'] as SidebarPresentation,
  };
};

const validatePayloadSidebar = (value: unknown): PayloadSidebarShellProjection => {
  if (!isRecord(value)) {
    fail('shellProjection.sidebar must be object or null.', 'invalid-sidebar');
  }

  if (value['present'] === false) {
    fail('payload shellProjection.sidebar must use null for absent sidebar.', 'payload-present-false');
  }

  if (value['present'] !== true) {
    fail('payload shellProjection.sidebar.present must be true.', 'invalid-sidebar');
  }

  return validatePresentSidebar(value as Record<string, unknown>);
};

export const validateNavigationEnvelopeShellProjection = (
  value: unknown,
): ShellProjectionSnapshot | null => {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    fail('shellProjection must be object or null.', 'invalid-shell');
  }

  const header = validateHeader(value['header']);
  const sidebar = value['sidebar'] === null ? null : validatePayloadSidebar(value['sidebar']);

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
  if (!isRecord(value)) {
    fail('runtime sidebar projection must be object.', 'invalid-sidebar');
  }

  if (value['present'] === true) {
    return validatePresentSidebar(value as Record<string, unknown>);
  }

  if (value['present'] !== false) {
    fail('runtime sidebar projection present must be boolean.', 'invalid-sidebar');
  }

  const canonical =
    value['sidebarId'] === DEFAULT_SIDEBAR_ID &&
    value['stateScopeId'] === DEFAULT_SIDEBAR_STATE_SCOPE_ID &&
    value['selectedId'] === null &&
    Array.isArray(value['initialExpandedIds']) &&
    value['initialExpandedIds'].length === 0 &&
    value['topologyRevision'] === null &&
    value['navHtml'] === null &&
    value['heading'] === null &&
    value['fixedBreakpoint'] === DEFAULT_SIDEBAR_FIXED_BREAKPOINT &&
    value['presentation'] === DEFAULT_SIDEBAR_PRESENTATION;

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
