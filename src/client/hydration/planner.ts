import { type HydrationPlanItem, type HydrationScopePlan } from './types.js';
import { readDomHydrationMarkerResult } from './dom-hydration-markers.js';
import {
  HYDRATION_CAPABILITY_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
  HYDRATION_SCOPE_ATTRIBUTE,
  HYDRATION_TRIGGER_ATTRIBUTE,
  isHydrationCapability,
  isHydrationTrigger,
} from '../../../shared/hydration/hydration-directives.js';

const TOC_TRIGGER_RESERVED_ATTRIBUTE = 'data-toc-trigger-reserved';

const isElement = (value: ParentNode | Element | null | undefined): value is Element =>
  value instanceof Element;

const hasExecutableHydrationDirective = (element: Element): boolean =>
  element.hasAttribute(HYDRATION_CAPABILITY_ATTRIBUTE) &&
  element.hasAttribute(HYDRATION_TRIGGER_ATTRIBUTE);

const findScopeRoots = (root: ParentNode): Element[] => {
  const roots: Element[] = [];
  if (isElement(root)) {
    if (root.hasAttribute(HYDRATION_SCOPE_ATTRIBUTE) && !hasExecutableHydrationDirective(root)) {
      roots.push(root);
    }
  }

  if ('querySelectorAll' in root) {
    const candidates = Array.from(root.querySelectorAll(`[${HYDRATION_SCOPE_ATTRIBUTE}]`));
    roots.push(
      ...candidates.filter((candidate) => !hasExecutableHydrationDirective(candidate)),
    );
  }

  return roots;
};

const createScopeId = (scope: Element, fallbackIndex: number): string => {
  const value = scope.getAttribute(HYDRATION_SCOPE_ATTRIBUTE)?.trim();
  return value && value.length > 0 ? value : `scope-${String(fallbackIndex)}`;
};

const readPlanItem = (element: Element, scopeId: string): HydrationPlanItem | null => {
  if (element.getAttribute(TOC_TRIGGER_RESERVED_ATTRIBUTE) === 'true') {
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
    tag: (() => {
      const value = element.getAttribute(HYDRATION_KEY_ATTRIBUTE)?.trim();
      return value && value.length > 0 ? value : element.localName;
    })(),
    element: element as HTMLElement,
    scope: scopeId,
    trigger,
    capability,
    ...(markerResult.status === 'valid' ? { marker: markerResult.marker } : {}),
  };
};

const buildScopePlan = (scope: Element, scopeId: string): HydrationScopePlan => {
  const items: HydrationPlanItem[] = [];

  if (
    scope.hasAttribute(HYDRATION_CAPABILITY_ATTRIBUTE) &&
    scope.hasAttribute(HYDRATION_TRIGGER_ATTRIBUTE)
  ) {
    const directItem = readPlanItem(scope, scopeId);
    if (directItem) {
      items.push(directItem);
    }
  }

  for (const element of scope.querySelectorAll(
    `[${HYDRATION_CAPABILITY_ATTRIBUTE}][${HYDRATION_TRIGGER_ATTRIBUTE}]`,
  )) {
    const nestedScopeRoot = element.closest(
      `[${HYDRATION_SCOPE_ATTRIBUTE}]:not([${HYDRATION_CAPABILITY_ATTRIBUTE}])`,
    );
    if (nestedScopeRoot !== null && nestedScopeRoot !== scope) {
      continue;
    }

    const item = readPlanItem(element, scopeId);
    if (item) {
      items.push(item);
    }
  }

  return { scope: scopeId, items };
};

export const planHydration = (root: ParentNode): HydrationScopePlan[] => {
  const scopes = findScopeRoots(root);
  return scopes.map((scope, index) => buildScopePlan(scope, createScopeId(scope, index)));
};
