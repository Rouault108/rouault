import { type HydrationPlanItem, type HydrationScopePlan } from './types.js';
import { readDomHydrationMarkerResult } from './dom-hydration-markers.js';
import { HYDRATION_MARKER_ATTRIBUTE } from '../../../shared/hydration/hydration-markers.js';
import {
  HYDRATION_CAPABILITY_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
  HYDRATION_SCOPE_ATTRIBUTE,
  HYDRATION_TRIGGER_ATTRIBUTE,
  isHydrationCapability,
  isHydrationTrigger,
} from '../../../shared/hydration/hydration-directives.js';
import { TOC_TRIGGER_RESERVED_DATA_ATTRIBUTE } from '../../toc/toc-mobile-panel-dom-css-contract.js';

export interface HydrationPlanOptions {
  readonly excludeSubtrees?: readonly Element[];
}

const isElement = (value: ParentNode | Element | null | undefined): value is Element =>
  value instanceof Element;

const readHydrationKey = (element: Element): string | null => {
  const value = element.getAttribute(HYDRATION_KEY_ATTRIBUTE)?.trim();
  return value && value.length > 0 ? value : null;
};

const hasHydrationKey = (element: Element): boolean => readHydrationKey(element) !== null;

const hasHydrationScopeAttribute = (element: Element): boolean =>
  element.hasAttribute(HYDRATION_SCOPE_ATTRIBUTE);

const readHydrationScopeId = (element: Element): string | null => {
  const value = element.getAttribute(HYDRATION_SCOPE_ATTRIBUTE)?.trim();
  return value && value.length > 0 ? value : null;
};

const hasMalformedHydrationScope = (element: Element): boolean =>
  hasHydrationScopeAttribute(element) && readHydrationScopeId(element) === null;

const createScopeId = (scope: Element): string => {
  const scopeId = readHydrationScopeId(scope);
  if (scopeId === null) {
    throw new Error('hydration scope root に空の scope id は許可されません');
  }
  return scopeId;
};

const isMarkerOnlySourceElement = (element: Element): boolean =>
  element.localName === 'script' &&
  element.getAttribute('type')?.toLowerCase() === 'application/json' &&
  element.hasAttribute(HYDRATION_MARKER_ATTRIBUTE);

const isReservedTocTrigger = (element: Element): boolean =>
  element.getAttribute(TOC_TRIGGER_RESERVED_DATA_ATTRIBUTE) === 'true';

const isAutonomousCustomElementName = (element: Element): boolean =>
  element.localName.includes('-');

const hasExecutableHydrationDirective = (element: Element): boolean =>
  element.hasAttribute(HYDRATION_CAPABILITY_ATTRIBUTE) &&
  element.hasAttribute(HYDRATION_TRIGGER_ATTRIBUTE);

const isSelfScopedCustomElement = (element: Element): boolean => {
  const scopeId = readHydrationScopeId(element);
  return (
    scopeId !== null && isAutonomousCustomElementName(element) && scopeId === element.localName
  );
};

const isHydrationItemCandidate = (element: Element): boolean => {
  if (!hasExecutableHydrationDirective(element)) {
    return false;
  }

  if (hasHydrationKey(element)) {
    return true;
  }

  return isAutonomousCustomElementName(element);
};

const isHydrationScopeRootCandidate = (element: Element, isRoot: boolean): boolean => {
  const scopeId = readHydrationScopeId(element);
  if (scopeId === null) {
    return false;
  }

  if (isMarkerOnlySourceElement(element)) {
    return false;
  }

  if (hasHydrationKey(element)) {
    return false;
  }

  if (!hasExecutableHydrationDirective(element)) {
    return true;
  }

  if (isRoot) {
    return isAutonomousCustomElementName(element);
  }

  return isSelfScopedCustomElement(element);
};

const readPlanItem = (element: Element, scopeId: string): HydrationPlanItem | null => {
  if (isReservedTocTrigger(element)) {
    return null;
  }

  const capabilityValue = element.getAttribute(HYDRATION_CAPABILITY_ATTRIBUTE)?.trim();
  const triggerValue = element.getAttribute(HYDRATION_TRIGGER_ATTRIBUTE)?.trim();
  const capability = isHydrationCapability(capabilityValue) ? capabilityValue : null;
  const trigger = isHydrationTrigger(triggerValue) ? triggerValue : null;

  if (!capability || !trigger) {
    return null;
  }

  const markerResult = readDomHydrationMarkerResult(element);

  return {
    tag: readHydrationKey(element) ?? element.localName,
    element: element as HTMLElement,
    scope: scopeId,
    trigger,
    capability,
    ...(markerResult.status === 'valid' ? { marker: markerResult.marker } : {}),
  };
};

const createIsExcluded = (options: HydrationPlanOptions): ((element: Element) => boolean) => {
  const excludedSubtrees = options.excludeSubtrees ?? [];

  return (element: Element): boolean =>
    excludedSubtrees.some((excluded) => excluded === element || excluded.contains(element));
};

const findScopeRoots = (root: ParentNode, isExcluded: (element: Element) => boolean): Element[] => {
  const roots: Element[] = [];

  if (isElement(root) && !isExcluded(root) && isHydrationScopeRootCandidate(root, true)) {
    roots.push(root);
  }

  if ('querySelectorAll' in root) {
    const candidates = Array.from(root.querySelectorAll(`[${HYDRATION_SCOPE_ATTRIBUTE}]`));
    roots.push(
      ...candidates.filter(
        (candidate) => !isExcluded(candidate) && isHydrationScopeRootCandidate(candidate, false),
      ),
    );
  }

  return roots;
};

const hasDeclaredForeignOrMalformedScope = (element: Element, scopeId: string): boolean => {
  if (!hasHydrationScopeAttribute(element)) {
    return false;
  }

  if (hasMalformedHydrationScope(element)) {
    return true;
  }

  return readHydrationScopeId(element) !== scopeId;
};

const findOwningScopeRoot = (element: Element, currentScope: Element): Element | null => {
  let candidate: Element | null = hasHydrationKey(element) ? element.parentElement : element;

  while (candidate) {
    if (candidate === currentScope) {
      return currentScope;
    }

    if (isHydrationScopeRootCandidate(candidate, false)) {
      return candidate;
    }

    candidate = candidate.parentElement;
  }

  return null;
};

const buildScopePlan = (
  scope: Element,
  scopeId: string,
  isExcluded: (element: Element) => boolean,
): HydrationScopePlan => {
  const items: HydrationPlanItem[] = [];

  if (isHydrationItemCandidate(scope)) {
    const directItem = readPlanItem(scope, scopeId);
    if (directItem) {
      items.push(directItem);
    }
  }

  for (const element of scope.querySelectorAll(
    `[${HYDRATION_CAPABILITY_ATTRIBUTE}][${HYDRATION_TRIGGER_ATTRIBUTE}]`,
  )) {
    if (isExcluded(element)) {
      continue;
    }

    if (isMarkerOnlySourceElement(element)) {
      continue;
    }

    if (!isHydrationItemCandidate(element)) {
      continue;
    }

    if (hasDeclaredForeignOrMalformedScope(element, scopeId)) {
      continue;
    }

    const owningScopeRoot = findOwningScopeRoot(element, scope);
    if (owningScopeRoot !== scope) {
      continue;
    }

    const item = readPlanItem(element, scopeId);
    if (item) {
      items.push(item);
    }
  }

  return { scope: scopeId, items };
};

export const planHydration = (
  root: ParentNode,
  options: HydrationPlanOptions = {},
): HydrationScopePlan[] => {
  const isExcluded = createIsExcluded(options);
  const scopes = findScopeRoots(root, isExcluded);
  return scopes.map((scope) => buildScopePlan(scope, createScopeId(scope), isExcluded));
};
