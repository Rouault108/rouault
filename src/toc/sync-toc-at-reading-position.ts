import { normalizeTocCapabilities, normalizeTocHeading } from './toc-headings.js';
import { parseTocHeadingsJson } from '../../shared/toc/toc-normalization.js';
import { readTocJsonSourceScriptContract } from './toc-json-source-script.js';
import {
  syncTocActiveLinks,
  syncTocHeadingVisibility,
  type TocDomWriter,
} from './toc-desktop-nav-sync.js';
import { resolveTocDensityTier } from './toc-density-tier.js';
import { independentTocTrack } from './toc-track-independence.js';
import { matchesTocViewportSnapshot, readTocViewportSnapshot } from './toc-viewport-snapshot.js';
import { ownsAcceptedHistoryCommit } from '../components/app/controllers/accepted-history-commit.js';
import type { AcceptedReadingPosition } from '../components/app/controllers/reading-position-controller.js';

export type TocPositionSyncResult =
  | 'accepted'
  | 'skipped'
  | 'rejected-before'
  | 'rejected-after'
  | 'superseded';

interface AttributeChange {
  readonly element: HTMLElement;
  readonly name: string;
  readonly before: string | null;
  readonly written: string | null;
}

const readPosition = (): number[] => {
  const scroll = document.scrollingElement ?? document.documentElement;
  return [
    scrollX,
    scrollY,
    Math.max(0, scroll.scrollWidth - scroll.clientWidth),
    Math.max(0, scroll.scrollHeight - scroll.clientHeight),
  ];
};
const samePosition = (before: readonly number[], after: readonly number[]): boolean =>
  before.every((value, index) => Math.abs(value - (after[index] ?? NaN)) <= 0.1);

// TOCの失敗は座標candidateを失わせない。runtime公開は通常controllerの一括採用に委ねる。
export const syncTocAtReadingPosition = (
  position: AcceptedReadingPosition,
): TocPositionSyncResult => {
  const { root, intent, receipt } = position;
  const journal: AttributeChange[] = [];
  let owner: (() => boolean) | null = null;
  let ownsElement: ((element: HTMLElement) => boolean) | null = null;
  let result: TocPositionSyncResult = 'rejected-before';
  try {
    if (!receipt || receipt.stateOnly || !ownsAcceptedHistoryCommit(root, intent, receipt)) {
      result = 'superseded';
      return result;
    }
    if (receipt.url.includes('#')) return (result = 'skipped');
    const roots = root.querySelectorAll<HTMLElement>('[data-layout-toc-root]');
    if (roots.length === 0) return (result = 'skipped');
    if (roots.length !== 1) return result;
    const toc = roots[0];
    if (!toc || toc.getAttribute('data-toc-hydration') === 'static') return (result = 'skipped');
    const controllers = toc.querySelectorAll<HTMLElement>('layout-toc-controller');
    const navs = toc.querySelectorAll<HTMLElement>('[data-layout-toc-nav]');
    const controller = controllers[0];
    const nav = navs[0];
    if (controllers.length !== 1 || navs.length !== 1 || !controller || !nav) return result;
    const sourceId = controller.getAttribute('source-id') ?? '';
    const sources = Array.from(root.ownerDocument.querySelectorAll('[id]')).filter(
      (e) => e.id === sourceId,
    );
    const source = sources[0];
    if (sources.length !== 1 || !(source instanceof HTMLScriptElement) || !toc.contains(source))
      return result;
    const contract = readTocJsonSourceScriptContract(source);
    const ownerId = controller.getAttribute('toc-owner-id');
    const contentRootId = controller.getAttribute('content-root-id');
    const contentRoots = Array.from(
      root.ownerDocument.querySelectorAll<HTMLElement>('[id]'),
    ).filter((element) => element.id === contentRootId);
    const contentRoot = contentRoots[0];
    if (
      contract?.ownerId !== ownerId ||
      toc.getAttribute('data-hydration-owner-id') !== ownerId ||
      contentRoots.length !== 1 ||
      !contentRoot ||
      !root.contains(contentRoot) ||
      controller.getAttribute('toc-runtime-id') !== sourceId
    )
      return result;
    const text = source.text;
    const tocOwner = toc.getAttribute('data-hydration-owner-id');
    const sourceIdentity = Array.from(source.attributes).map((a) => [a.name, a.value]);
    const navTree = Array.from(nav.querySelectorAll('*'));
    const capturedNavNodes = new Set<Element>(navTree);
    ownsElement = (element) =>
      element === toc ||
      element === nav ||
      (capturedNavNodes.has(element) && nav.contains(element));
    const navIdentity = navTree.map(
      (element) => [element, element.getAttribute('data-heading-id')] as const,
    );
    const controllerIdentity = Array.from(controller.attributes).map((a) => [a.name, a.value]);
    owner = () =>
      ownsAcceptedHistoryCommit(root, intent, receipt) &&
      root.contains(toc) &&
      toc.getAttribute('data-hydration-owner-id') === tocOwner &&
      sourceIdentity.every(
        ([name, value]) => name !== undefined && source.getAttribute(name) === value,
      ) &&
      toc.contains(controller) &&
      toc.querySelector('[data-layout-toc-nav]') === nav &&
      toc.contains(source) &&
      root.contains(contentRoot) &&
      contentRoot.id === contentRootId &&
      root.ownerDocument.getElementById(contentRootId) === contentRoot &&
      source.text === text &&
      controllerIdentity.every(
        ([name, value]) => name !== undefined && controller.getAttribute(name) === value,
      );
    const ownsStructure = (): boolean => {
      const currentTree = nav.querySelectorAll('*');
      const ids = Array.from(root.ownerDocument.querySelectorAll('[id]'));
      return (
        ids.filter((element) => element.id === sourceId).length === 1 &&
        ids.filter((element) => element.id === contentRootId).length === 1 &&
        toc.querySelectorAll('layout-toc-controller').length === 1 &&
        toc.querySelectorAll('[data-layout-toc-nav]').length === 1 &&
        currentTree.length === navTree.length &&
        navIdentity.every(
          ([element, id], index) =>
            currentTree[index] === element && element.getAttribute('data-heading-id') === id,
        )
      );
    };
    const parsed = parseTocHeadingsJson({ sourceId, serializedSourceText: text });
    if (parsed.status !== 'valid') return result;
    const raw: unknown = JSON.parse(text);
    if (
      !Array.isArray(raw) ||
      raw.some((heading: unknown) => normalizeTocHeading(heading) === null)
    )
      return result;
    const capabilities = normalizeTocCapabilities(
      JSON.parse(controller.getAttribute('capabilities-json') ?? '{}') as unknown,
    );
    const headings = parsed.headings;
    const links = Array.from(nav.querySelectorAll<HTMLElement>('[data-toc-link][data-heading-id]'));
    if (
      links.length !== headings.length ||
      headings.some(
        (heading) =>
          links.filter((link) => link.getAttribute('data-heading-id') === heading.id).length !== 1,
      )
    )
      return result;
    if (!independentTocTrack(root)) return (result = 'skipped');
    const snapshot = readTocViewportSnapshot(contentRoot, headings, capabilities);
    if (!snapshot || !owner() || !ownsStructure()) return result;
    const beforePosition = readPosition();
    const visible = new Set(snapshot.visibleHeadings.map((heading) => heading.id));
    const density = resolveTocDensityTier(snapshot.visibleHeadings);
    const assertOwner = (element: HTMLElement): void => {
      if (!owner?.() || !ownsElement?.(element)) throw new Error('TOC owner superseded');
    };
    const writer: TocDomWriter = {
      attribute(element, name, written) {
        assertOwner(element);
        const before = element.getAttribute(name);
        if (before === written) return;
        journal.push({ element, name, before, written });
        if (written === null) element.removeAttribute(name);
        else element.setAttribute(name, written);
      },
      activeClass(element, active) {
        assertOwner(element);
        const before = element.classList.contains('is-active');
        if (before === active) return;
        journal.push({
          element,
          name: 'class:is-active',
          before: String(before),
          written: String(active),
        });
        element.classList.toggle('is-active', active);
      },
    };
    if (!owner()) return (result = 'superseded');
    syncTocHeadingVisibility(nav, visible, writer);
    syncTocActiveLinks({
      nav,
      ownerId,
      activeHeadingId: snapshot.activeId || null,
      visibleHeadingIds: visible,
      writer,
    });
    writer.attribute(nav, 'data-density-tier', density);
    writer.attribute(toc, 'data-density-tier', density);
    const after = readTocViewportSnapshot(contentRoot, headings, capabilities);
    if (!owner() || !ownsStructure()) result = 'superseded';
    else if (
      !samePosition(beforePosition, readPosition()) ||
      !matchesTocViewportSnapshot(snapshot, after)
    )
      result = 'rejected-after';
    else result = 'accepted';
  } catch {
    try {
      result =
        owner && !owner()
          ? 'superseded'
          : journal.length > 0
            ? 'rejected-after'
            : 'rejected-before';
    } catch {
      result = journal.length > 0 ? 'rejected-after' : 'rejected-before';
    }
  } finally {
    if (journal.length > 0 && result !== 'accepted') {
      // 一つの属性の失敗で後続の復元を止めず、後続ownerの変更には触れない。
      for (const change of journal) {
        try {
          if (!owner?.()) break;
          if (!ownsElement?.(change.element)) continue;
          if (change.name === 'class:is-active') {
            if (String(change.element.classList.contains('is-active')) === change.written)
              change.element.classList.toggle('is-active', change.before === 'true');
            continue;
          }
          if (
            change.element.getAttribute(change.name) !== change.written ||
            change.before === change.written
          )
            continue;
          if (change.before === null) change.element.removeAttribute(change.name);
          else change.element.setAttribute(change.name, change.before);
        } catch {
          /* rollbackの例外もReading外側へ伝播させない。 */
        }
      }
      try {
        readPosition();
      } catch {
        /* 次の位置照合は既存Reading jobが所有する。 */
      }
    }
    try {
      if (receipt && ownsAcceptedHistoryCommit(root, intent, receipt))
        root.dataset['tocPositionSync'] = result;
    } catch {
      /* 診断属性の失敗で復元candidateを捨てない。 */
    }
  }
  return result;
};
