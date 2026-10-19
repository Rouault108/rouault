import type { TocCapabilities, TocHeading } from './toc-headings.js';
import {
  filterHeadingsByScopeSelections,
  isHeadingInsideInactivePanel,
  readTocScopeSelectionMap,
} from './filter-visible-headings.js';
import { resolveTocActivationOffset } from './toc-scroll-contract.js';

interface HeadingWitness {
  readonly element: HTMLElement;
  readonly rect: readonly number[];
  readonly offset: number;
}

export interface TocViewportSnapshot {
  readonly visibleHeadings: TocHeading[];
  readonly activeId: string;
  readonly witness: readonly HeadingWitness[];
}

// 初期表示と通常追跡で候補・隣接見出し・activation lineを同じ測定から決める。
export const readTocViewportSnapshot = (
  root: HTMLElement,
  headings: readonly TocHeading[],
  capabilities: TocCapabilities,
): TocViewportSnapshot | null => {
  const ids = new Map<string, HTMLElement>();
  const wanted = new Set(headings.map((heading) => heading.id));
  if (wanted.size !== headings.length) return null;
  for (const element of root.ownerDocument.querySelectorAll<HTMLElement>('[id]')) {
    if (!wanted.has(element.id)) continue;
    if (ids.has(element.id) || !root.contains(element)) return null;
    ids.set(element.id, element);
  }
  if (ids.size !== wanted.size) return null;
  const scoped = filterHeadingsByScopeSelections(headings, readTocScopeSelectionMap(root));
  const visibleHeadings = scoped.filter((heading) => {
    const element = ids.get(heading.id);
    return element !== undefined && !isHeadingInsideInactivePanel(element, root);
  });
  const witness: HeadingWitness[] = [];
  let activeId = visibleHeadings[0]?.id ?? '';
  let passed = true;
  for (const heading of visibleHeadings) {
    const element = ids.get(heading.id);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const offset = resolveTocActivationOffset(element);
    const values = [rect.left, rect.top, rect.width, rect.height];
    if (![...values, offset].every(Number.isFinite)) return null;
    witness.push({ element, rect: values, offset });
    if (capabilities.activeTracking && passed && rect.top <= offset) activeId = heading.id;
    else passed = false;
  }
  return { visibleHeadings, activeId, witness };
};

export const matchesTocViewportSnapshot = (
  before: TocViewportSnapshot,
  after: TocViewportSnapshot | null,
): boolean =>
  after !== null &&
  before.activeId === after.activeId &&
  before.visibleHeadings.length === after.visibleHeadings.length &&
  before.visibleHeadings.every(
    (heading, index) => heading.id === after.visibleHeadings[index]?.id,
  ) &&
  before.witness.every((item, index) => {
    const next = after.witness[index];
    return (
      item.element === next?.element &&
      Math.abs(item.offset - next.offset) <= 0.1 &&
      item.rect.every((value, rectIndex) => Math.abs(value - (next.rect[rectIndex] ?? NaN)) <= 0.1)
    );
  });
