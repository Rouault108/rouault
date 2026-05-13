import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from './sidebar-shell-defaults.js';
import type {
  AbsentRuntimeSidebarShellProjection,
  PayloadSidebarShellProjection,
  RuntimeSidebarShellSnapshot,
} from './shell-projection.js';

export const createCanonicalAbsentRuntimeSidebarProjection =
  (): AbsentRuntimeSidebarShellProjection => ({
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
  });

export const assertPayloadSidebarProjectionPresent = (
  value: RuntimeSidebarShellSnapshot,
): PayloadSidebarShellProjection => {
  if (value.present !== true) {
    throw new Error('payload sidebar shellProjection must be present:true or null.');
  }

  if (typeof value.navHtml !== 'string' || value.navHtml.trim().length === 0) {
    throw new Error('present payload sidebar shellProjection.navHtml must be non-empty.');
  }

  if (typeof value.topologyRevision !== 'string' || value.topologyRevision.trim().length === 0) {
    throw new Error('present payload sidebar shellProjection.topologyRevision must be non-empty.');
  }

  return value;
};
