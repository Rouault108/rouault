import {
  type HydrationCapability,
  type HydrationPlanItem,
  type HydrationScopePlan,
  type HydrationTrigger,
} from './types.js';
import { readDomHydrationMarker } from './dom-hydration-markers.js';

const SCOPE_ATTRIBUTE = 'data-hydration-scope';
const CAPABILITY_ATTRIBUTE = 'data-hydration-capability';
const TRIGGER_ATTRIBUTE = 'data-hydration-trigger';
const KEY_ATTRIBUTE = 'data-hydration-key';

const VALID_CAPABILITIES = new Set<HydrationCapability>([
  'static',
  'progressive',
  'interactive',
  'sandboxed',
]);
const VALID_TRIGGERS = new Set<HydrationTrigger>([
  'initial',
  'post-commit',
  'visible',
  'interaction',
]);

const isElement = (value: ParentNode | Element | null | undefined): value is Element =>
  value instanceof Element;

const findScopes = (root: ParentNode): Element[] => {
  const scopes: Element[] = [];
  if (isElement(root) && root.hasAttribute(SCOPE_ATTRIBUTE)) {
    scopes.push(root);
  }

  if ('querySelectorAll' in root) {
    scopes.push(...Array.from(root.querySelectorAll(`[${SCOPE_ATTRIBUTE}]`)));
  }

  return scopes;
};

const createScopeId = (scope: Element, fallbackIndex: number): string => {
  const value = scope.getAttribute(SCOPE_ATTRIBUTE)?.trim();
  return value && value.length > 0 ? value : `scope-${String(fallbackIndex)}`;
};

const readPlanItem = (element: Element, scopeId: string): HydrationPlanItem | null => {
  const capabilityValue = element.getAttribute(CAPABILITY_ATTRIBUTE)?.trim();
  const triggerValue = element.getAttribute(TRIGGER_ATTRIBUTE)?.trim();
  const capability =
    capabilityValue && capabilityValue.length > 0 ? (capabilityValue as HydrationCapability) : null;
  const trigger =
    triggerValue && triggerValue.length > 0 ? (triggerValue as HydrationTrigger) : null;

  if (!capability || !trigger) {
    return null;
  }

  if (!VALID_CAPABILITIES.has(capability) || !VALID_TRIGGERS.has(trigger)) {
    return null;
  }

  const marker = readDomHydrationMarker(element);

  return {
    tag: (() => {
      const value = element.getAttribute(KEY_ATTRIBUTE)?.trim();
      return value && value.length > 0 ? value : element.localName;
    })(),
    element: element as HTMLElement,
    scope: scopeId,
    trigger,
    capability,
    ...(marker !== null ? { marker } : {}),
  };
};

const buildScopePlan = (scope: Element, scopeId: string): HydrationScopePlan => {
  const items: HydrationPlanItem[] = [];

  if (scope.hasAttribute(CAPABILITY_ATTRIBUTE) && scope.hasAttribute(TRIGGER_ATTRIBUTE)) {
    const directItem = readPlanItem(scope, scopeId);
    if (directItem) {
      items.push(directItem);
    }
  }

  for (const element of scope.querySelectorAll(`[${CAPABILITY_ATTRIBUTE}][${TRIGGER_ATTRIBUTE}]`)) {
    const ownerScope = element.closest(`[${SCOPE_ATTRIBUTE}]`);
    if (ownerScope !== scope) {
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
  const scopes = findScopes(root);
  return scopes.map((scope, index) => buildScopePlan(scope, createScopeId(scope, index)));
};
