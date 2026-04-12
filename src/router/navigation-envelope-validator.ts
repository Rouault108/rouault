import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { DocumentRenderSnapshot } from '../../shared/navigation/document-render-snapshot.js';
import type { HydrationPlan } from '../../shared/navigation/hydration-plan.js';
import type {
  HeaderShellProjection,
  ShellProjectionSnapshot,
  SidebarShellProjection,
} from '../../shared/navigation/shell-projection.js';

type SidebarShellProjectionInput = Omit<
  SidebarShellProjection,
  'structuralExpandedIds' | 'topologyRevision' | 'navHtml'
> & {
  structuralExpandedIds?: string[];
  topologyRevision?: string | null;
  navHtml?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isRenderedKind = (value: unknown): value is DocumentRenderSnapshot['renderedKind'] =>
  value === 'page' || value === 'not-found' || value === 'error';

const isHeaderShellProjection = (value: unknown): value is HeaderShellProjection => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value['breadcrumbs']) &&
    Array.isArray(value['corpora']) &&
    isString(value['currentCorpusKey']) &&
    isBoolean(value['noteLayout']) &&
    isBoolean(value['sidebarEnabled'])
  );
};

const isSidebarPresentation = (value: unknown): value is SidebarShellProjection['presentation'] =>
  value === 'auto' || value === 'fixed' || value === 'overlay';

const isSidebarShellProjection = (value: unknown): value is SidebarShellProjectionInput => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBoolean(value['present']) &&
    isString(value['sidebarId']) &&
    isString(value['stateScopeId']) &&
    (value['selectedId'] === null || isString(value['selectedId'])) &&
    (value['structuralExpandedIds'] === undefined ||
      (Array.isArray(value['structuralExpandedIds']) &&
        value['structuralExpandedIds'].every((entry: unknown) => isString(entry)))) &&
    (value['topologyRevision'] === undefined ||
      value['topologyRevision'] === null ||
      isString(value['topologyRevision'])) &&
    (value['navHtml'] === undefined || value['navHtml'] === null || isString(value['navHtml'])) &&
    isString(value['heading']) &&
    typeof value['fixedBreakpoint'] === 'number' &&
    isString(value['itemsJson']) &&
    isSidebarPresentation(value['presentation'])
  );
};

const normalizeSidebarShellProjection = (
  value: SidebarShellProjectionInput,
): SidebarShellProjection => ({
  present: value.present,
  sidebarId: value.sidebarId,
  stateScopeId: value.stateScopeId,
  selectedId: value.selectedId,
  structuralExpandedIds: value.structuralExpandedIds ?? [],
  topologyRevision: value.topologyRevision ?? null,
  navHtml: value.navHtml ?? null,
  heading: value.heading,
  fixedBreakpoint: value.fixedBreakpoint,
  itemsJson: value.itemsJson,
  presentation: value.presentation,
});

const isShellProjectionSnapshot = (value: unknown): value is ShellProjectionSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isHeaderShellProjection(value['header']) &&
    (value['sidebar'] === null || isSidebarShellProjection(value['sidebar']))
  );
};

const isHydrationPlan = (value: unknown): value is HydrationPlan => {
  if (!isRecord(value) || !Array.isArray(value['scopes'])) {
    return false;
  }

  return value['scopes'].every((scope: unknown) => {
    if (!isRecord(scope) || !isString(scope['scope'])) {
      return false;
    }

    if (scope['capability'] !== undefined) {
      const capability = scope['capability'];
      if (
        capability !== 'static' &&
        capability !== 'progressive' &&
        capability !== 'interactive'
      ) {
        return false;
      }
    }

    if (scope['trigger'] !== undefined) {
      const trigger = scope['trigger'];
      if (
        trigger !== 'initial' &&
        trigger !== 'post-commit' &&
        trigger !== 'visible' &&
        trigger !== 'interaction'
      ) {
        return false;
      }
    }

    return true;
  });
};

const isDocumentRenderSnapshot = (value: unknown): value is DocumentRenderSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value['html']) &&
    isString(value['title']) &&
    (value['description'] === null || isString(value['description'])) &&
    isRenderedKind(value['renderedKind']) &&
    (value['announcedTitle'] === undefined ||
      value['announcedTitle'] === null ||
      isString(value['announcedTitle']))
  );
};

export class NavigationEnvelopeValidationError extends Error {
  override name = 'NavigationEnvelopeValidationError' as const;
}

export const validateNavigationEnvelope = (value: unknown): NavigationEnvelope => {
  if (!isRecord(value)) {
    throw new NavigationEnvelopeValidationError('navigation envelope は object である必要があります。');
  }

  if (value['schemaVersion'] !== NAVIGATION_ENVELOPE_SCHEMA_VERSION) {
    throw new NavigationEnvelopeValidationError(
      `navigation envelope schemaVersion ${String(value['schemaVersion'])} は未対応です。`,
    );
  }

  if (!isDocumentRenderSnapshot(value['document'])) {
    throw new NavigationEnvelopeValidationError('navigation envelope document が不正です。');
  }

  if (value['shellProjection'] !== null && !isShellProjectionSnapshot(value['shellProjection'])) {
    throw new NavigationEnvelopeValidationError(
      'navigation envelope shellProjection が不正です。',
    );
  }

  if (value['hydrationPlan'] !== undefined && value['hydrationPlan'] !== null) {
    if (!isHydrationPlan(value['hydrationPlan'])) {
      throw new NavigationEnvelopeValidationError('navigation envelope hydrationPlan が不正です。');
    }
  }

  const shellProjection = value['shellProjection'];

  return {
    schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
    buildId:
      value['buildId'] === undefined || value['buildId'] === null || isString(value['buildId'])
        ? (value['buildId'])
        : null,
    generatedAt:
      value['generatedAt'] === undefined ||
      value['generatedAt'] === null ||
      isString(value['generatedAt'])
        ? (value['generatedAt'])
        : null,
    document: value['document'],
    shellProjection:
      shellProjection === null
        ? null
        : {
            header: shellProjection.header,
            sidebar:
              shellProjection.sidebar === null
                ? null
                : normalizeSidebarShellProjection(shellProjection.sidebar),
          },
    hydrationPlan: value['hydrationPlan'] ?? null,
  };
};
