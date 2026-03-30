import {
  type HydrationCapability,
  type HydrationPlanItem,
  type HydrationScopePlan,
  type HydrationTrigger,
} from './types.js';

export interface HydrationPlannerOptions {
  readonly allowFallback?: boolean;
}

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

const readPlanItem = (
  element: Element,
  scopeId: string,
): HydrationPlanItem | null => {
  const capabilityValue = element.getAttribute(CAPABILITY_ATTRIBUTE)?.trim();
  const triggerValue = element.getAttribute(TRIGGER_ATTRIBUTE)?.trim();
  const capability = capabilityValue && capabilityValue.length > 0 ? (capabilityValue as HydrationCapability) : null;
  const trigger = triggerValue && triggerValue.length > 0 ? (triggerValue as HydrationTrigger) : null;

  if (!capability || !trigger) {
    return null;
  }

  if (!VALID_CAPABILITIES.has(capability) || !VALID_TRIGGERS.has(trigger)) {
    return null;
  }

  return {
    tag: (() => {
      const value = element.getAttribute(KEY_ATTRIBUTE)?.trim();
      return value && value.length > 0 ? value : element.localName;
    })(),
    element: element as HTMLElement,
    scope: scopeId,
    trigger,
    capability,
    fallback: false,
  };
};

const buildScopePlan = (scope: Element, scopeId: string): HydrationScopePlan => {
  const items: HydrationPlanItem[] = [];

  if (
    scope.hasAttribute(CAPABILITY_ATTRIBUTE) &&
    scope.hasAttribute(TRIGGER_ATTRIBUTE)
  ) {
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

const buildFallbackPlan = (root: ParentNode, scopeId: string, selector: string): HydrationScopePlan => {
  const items: HydrationPlanItem[] = [];

  if (selector.length === 0 || !('querySelectorAll' in root)) {
    return { scope: scopeId, items };
  }

  if (isElement(root) && root.matches(selector)) {
    items.push({
      tag: (() => {
        const value = root.getAttribute(KEY_ATTRIBUTE)?.trim();
        return value && value.length > 0 ? value : root.localName;
      })(),
      element: root as HTMLElement,
      scope: scopeId,
      trigger: 'initial',
      capability: 'interactive',
      fallback: true,
    });
  }

  for (const element of root.querySelectorAll(selector)) {
    items.push({
      tag: (() => {
        const value = element.getAttribute(KEY_ATTRIBUTE)?.trim();
        return value && value.length > 0 ? value : element.localName;
      })(),
      element: element as HTMLElement,
      scope: scopeId,
      trigger: 'initial',
      capability: 'interactive',
      fallback: true,
    });
  }

  return { scope: scopeId, items };
};

export const planHydration = (
  root: ParentNode,
  fallbackSelector: string,
  options: HydrationPlannerOptions = {},
): HydrationScopePlan[] => {
  const scopes = findScopes(root);
  if (scopes.length === 0 && options.allowFallback === true) {
    return [buildFallbackPlan(root, 'fallback-root', fallbackSelector)];
  }

  return scopes.map((scope, index) => buildScopePlan(scope, createScopeId(scope, index)));
};
