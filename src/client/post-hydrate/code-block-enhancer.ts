import { resolveStandaloneContextName } from './code-surface-shared.js';

const CODE_BLOCK_ROOT_SELECTOR = '[data-code-block-root]:not([data-code-group-owned="true"])';
const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';
const OVERFLOW_THRESHOLD = 1;

type OwnedAttribute = 'tabindex' | 'role' | 'aria-label';

interface CodeBlockRootState {
  readonly root: HTMLElement;
  readonly blocks: HTMLElement[];
  readonly signal: AbortSignal | undefined;
  readonly resizeObserver: ResizeObserver | null;
}

const activeRoots = new WeakMap<HTMLElement, CodeBlockRootState>();
const ownedAttributes = new WeakMap<HTMLElement, Map<OwnedAttribute, string>>();
const pendingRoots = new Set<HTMLElement>();
let pendingFrame: number | null = null;

const getCodeBlockRoots = (root: ParentNode): HTMLElement[] => {
  const roots: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches(CODE_BLOCK_ROOT_SELECTOR)) {
    roots.push(root);
  }
  roots.push(...root.querySelectorAll<HTMLElement>(CODE_BLOCK_ROOT_SELECTOR));
  return roots;
};

const resolveCodeBlockLabel = (block: HTMLElement): string => {
  const contextName = resolveStandaloneContextName(block);
  return contextName === 'コード' ? 'コードブロック' : `${contextName} のコードブロック`;
};

const rememberOwnedAttribute = (
  block: HTMLElement,
  attribute: OwnedAttribute,
  value: string,
): void => {
  const owned = ownedAttributes.get(block) ?? new Map<OwnedAttribute, string>();
  owned.set(attribute, value);
  ownedAttributes.set(block, owned);
};

const setEnhancerAttribute = (
  block: HTMLElement,
  attribute: OwnedAttribute,
  value: string,
): void => {
  const owned = ownedAttributes.get(block);
  const currentOwnedValue = owned?.get(attribute);
  if (currentOwnedValue === undefined && block.hasAttribute(attribute)) {
    return;
  }
  if (currentOwnedValue !== undefined && block.getAttribute(attribute) !== currentOwnedValue) {
    owned?.delete(attribute);
    return;
  }

  block.setAttribute(attribute, value);
  rememberOwnedAttribute(block, attribute, value);
};

const removeEnhancerAttributes = (block: HTMLElement): void => {
  const owned = ownedAttributes.get(block);
  if (!owned) {
    return;
  }

  for (const [attribute, value] of owned.entries()) {
    if (block.getAttribute(attribute) === value) {
      block.removeAttribute(attribute);
    }
  }
  ownedAttributes.delete(block);
};

const syncCodeBlockAccessibility = (block: HTMLElement): void => {
  const wrapEnabled = block.dataset['codeWrap'] === 'true';
  const hasOverflow = block.scrollWidth > block.clientWidth + OVERFLOW_THRESHOLD;
  if (wrapEnabled || !hasOverflow) {
    removeEnhancerAttributes(block);
    return;
  }

  setEnhancerAttribute(block, 'tabindex', '0');
  setEnhancerAttribute(block, 'role', 'region');
  setEnhancerAttribute(block, 'aria-label', resolveCodeBlockLabel(block));
};

const flushMeasurements = (): void => {
  pendingFrame = null;
  const roots = Array.from(pendingRoots);
  pendingRoots.clear();

  for (const root of roots) {
    const state = activeRoots.get(root);
    if (!state || state.signal?.aborted === true || !root.isConnected) {
      continue;
    }
    for (const block of state.blocks) {
      syncCodeBlockAccessibility(block);
    }
  }
};

const scheduleMeasurement = (root: HTMLElement): void => {
  pendingRoots.add(root);
  if (pendingFrame !== null) {
    return;
  }

  pendingFrame = window.requestAnimationFrame(flushMeasurements);
};

const cleanupRoot = (root: HTMLElement): void => {
  const state = activeRoots.get(root);
  if (!state) {
    return;
  }

  state.resizeObserver?.disconnect();
  for (const block of state.blocks) {
    removeEnhancerAttributes(block);
  }
  activeRoots.delete(root);
  pendingRoots.delete(root);
};

const enhanceStandaloneCodeBlock = (root: HTMLElement, signal?: AbortSignal): void => {
  if (signal?.aborted === true) {
    return;
  }

  const active = activeRoots.get(root);
  if (active && active.signal?.aborted !== true) {
    scheduleMeasurement(root);
    return;
  }
  if (active?.signal?.aborted === true) {
    cleanupRoot(root);
  }

  const blocks = Array.from(root.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR));
  if (blocks.length === 0) {
    return;
  }

  root.dataset['codeBlockEnhanced'] = 'true';

  let resizeObserver: ResizeObserver | null = null;
  if (typeof window.ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      scheduleMeasurement(root);
    });
    resizeObserver.observe(root);
  }

  activeRoots.set(root, { root, blocks, signal, resizeObserver });
  signal?.addEventListener(
    'abort',
    () => {
      cleanupRoot(root);
    },
    { once: true },
  );
  scheduleMeasurement(root);

  const fontReady = document.fonts?.ready;
  fontReady
    ?.then(() => {
      scheduleMeasurement(root);
    })
    .catch(() => {
      // font readiness の失敗は初回測定の契約を変えない。
    });
};

export const enhanceCodeBlocks = (root: ParentNode, signal?: AbortSignal): void => {
  const codeBlockRoots = getCodeBlockRoots(root);
  for (const codeBlockRoot of codeBlockRoots) {
    enhanceStandaloneCodeBlock(codeBlockRoot, signal);
  }
};
