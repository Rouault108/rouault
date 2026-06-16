import { scrollRootTo } from '../router/root-scroll.js';
import {
  buildHashHrefFromId,
  decodeHashFragment,
  updateHashInCurrentUrlFromId,
} from '../router/url-hash.js';
import type { TocActiveTracker, TocNavigationCancelReason } from './toc-active-tracker.js';
import {
  canSkipTocScrollForTarget,
  hasProgrammaticTargetSettled,
  hasRootScrollReachedTocTargetY,
  isHeadingIntersectingViewport,
  resolveTocScrollMetrics,
  TOC_SCROLL_SETTLE_STABLE_FRAMES,
  TOC_SCROLL_SETTLE_TIMEOUT_MS,
} from './toc-scroll-contract.js';

export interface TocNavigationContext {
  tocRuntimeId: string;
  contentRoot: HTMLElement;
  tracker: TocActiveTracker;
  getActiveId: () => string;
  applyActiveId: (id: string) => void;
}

export type TocNavigationRejectReason =
  | 'non-primary-click'
  | 'external-url'
  | 'download-link'
  | 'empty-hash'
  | 'malformed-hash'
  | 'href-data-id-mismatch'
  | 'target-not-found'
  | 'target-not-unique';

export type TocNavigationClickResult =
  | { owned: true; targetId: string; link: HTMLAnchorElement }
  | { owned: false; reason: TocNavigationRejectReason };

export const shouldCloseMobilePanelAfterTocNavigation = (
  result: TocNavigationClickResult,
  mobilePanelNav: HTMLElement | null,
): boolean =>
  result.owned && mobilePanelNav instanceof HTMLElement && mobilePanelNav.contains(result.link);

const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
]);

const isPrimaryPlainClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const hasExternalBrowsingTarget = (link: HTMLAnchorElement): boolean => {
  const target = link.getAttribute('target');
  return target !== null && target.trim().length > 0 && target.trim().toLowerCase() !== '_self';
};

const resolveLinkFromEvent = (event: MouseEvent): HTMLAnchorElement | null => {
  for (const node of event.composedPath()) {
    if (
      node instanceof HTMLAnchorElement &&
      node.hasAttribute('data-toc-link') &&
      node.hasAttribute('data-heading-id')
    ) {
      return node;
    }
  }

  return null;
};

export const resolveHeadingInContentRoot = (
  contentRoot: HTMLElement,
  rawId: string,
): HTMLElement | null => {
  const matches = Array.from(contentRoot.querySelectorAll<HTMLElement>('[id]')).filter(
    (element) => element.id === rawId,
  );

  return matches.length === 1 ? (matches[0] ?? null) : null;
};

type ContentRootHeadingResolution =
  | { status: 'found'; target: HTMLElement }
  | { status: 'not-found' }
  | { status: 'not-unique' };

const resolveHeadingInContentRootWithReason = (
  contentRoot: HTMLElement,
  rawId: string,
): ContentRootHeadingResolution => {
  const matches = Array.from(contentRoot.querySelectorAll<HTMLElement>('[id]')).filter(
    (element) => element.id === rawId,
  );

  if (matches.length === 0) {
    return { status: 'not-found' };
  }

  if (matches.length > 1) {
    return { status: 'not-unique' };
  }

  const target = matches[0];
  if (target === undefined) {
    return { status: 'not-found' };
  }

  return { status: 'found', target };
};

export class TocNavigationController {
  private _rafId: number | null = null;
  private _timeoutId: number | null = null;
  private _generation = 0;
  private _cleanupUserInterventionListeners: (() => void) | null = null;
  private _context: TocNavigationContext | null = null;

  handleTocLinkClick(event: MouseEvent, context: TocNavigationContext): TocNavigationClickResult {
    const link = resolveLinkFromEvent(event);
    if (link === null || !isPrimaryPlainClick(event)) {
      return { owned: false, reason: 'non-primary-click' };
    }

    if (link.hasAttribute('download')) {
      return { owned: false, reason: 'download-link' };
    }

    if (hasExternalBrowsingTarget(link)) {
      return { owned: false, reason: 'external-url' };
    }

    const url = new URL(link.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search
    ) {
      return { owned: false, reason: 'external-url' };
    }

    if (url.hash.length === 0) {
      return { owned: false, reason: 'empty-hash' };
    }

    const decodedHash = decodeHashFragment(url.hash);
    if (decodedHash === null) {
      return { owned: false, reason: 'malformed-hash' };
    }

    const headingId = link.getAttribute('data-heading-id') ?? '';
    if (headingId.length === 0 || decodedHash !== headingId) {
      return { owned: false, reason: 'href-data-id-mismatch' };
    }

    try {
      buildHashHrefFromId(headingId);
    } catch {
      return { owned: false, reason: 'malformed-hash' };
    }

    const headingResolution = resolveHeadingInContentRootWithReason(context.contentRoot, headingId);
    if (headingResolution.status === 'not-found') {
      return { owned: false, reason: 'target-not-found' };
    }
    if (headingResolution.status === 'not-unique') {
      return { owned: false, reason: 'target-not-unique' };
    }
    const { target } = headingResolution;

    event.preventDefault();
    this.cancelNavigation('new-navigation');
    this._context = context;

    const metrics = resolveTocScrollMetrics(target);
    context.applyActiveId(headingId);
    updateHashInCurrentUrlFromId(headingId, 'push');

    const skipScroll = canSkipTocScrollForTarget(target, metrics);
    if (skipScroll) {
      if (metrics.isTargetEndClamped && this._canHoldTarget(target, metrics, context)) {
        context.tracker.beginPostSettlementHold(headingId, metrics);
      } else {
        context.tracker.finishProgrammaticNavigation(headingId);
      }
      return { owned: true, targetId: headingId, link };
    }

    context.tracker.beginProgrammaticNavigation(headingId, metrics);
    this._attachUserInterventionListeners();
    this._startSettleWatcher(context, headingId, target, metrics);

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    scrollRootTo(metrics.targetY, behavior);

    return { owned: true, targetId: headingId, link };
  }

  cancelNavigation(reason: TocNavigationCancelReason): void {
    this._generation += 1;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this._cleanupUserInterventionListeners?.();
    this._cleanupUserInterventionListeners = null;
    this._context?.tracker.cancelProgrammaticNavigation(reason);
  }

  destroy(): void {
    this.cancelNavigation('destroy');
    this._context = null;
  }

  private _startSettleWatcher(
    context: TocNavigationContext,
    targetId: string,
    target: HTMLElement,
    metrics: ReturnType<typeof resolveTocScrollMetrics>,
  ): void {
    const generation = this._generation;
    let stableFrames = 0;

    this._timeoutId = window.setTimeout(() => {
      if (generation !== this._generation) {
        return;
      }
      this.cancelNavigation('timeout');
    }, TOC_SCROLL_SETTLE_TIMEOUT_MS);

    const tick = (): void => {
      if (generation !== this._generation) {
        return;
      }

      const settled = hasProgrammaticTargetSettled(target, metrics);
      stableFrames = settled ? stableFrames + 1 : 0;

      if (stableFrames >= TOC_SCROLL_SETTLE_STABLE_FRAMES) {
        this._finishSettled(context, targetId, target, metrics);
        return;
      }

      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  private _finishSettled(
    context: TocNavigationContext,
    targetId: string,
    target: HTMLElement,
    metrics: ReturnType<typeof resolveTocScrollMetrics>,
  ): void {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._cleanupUserInterventionListeners?.();
    this._cleanupUserInterventionListeners = null;

    if (metrics.isTargetEndClamped && this._canHoldTarget(target, metrics, context)) {
      context.tracker.beginPostSettlementHold(targetId, metrics);
    } else {
      context.tracker.finishProgrammaticNavigation(targetId);
    }
    this._generation += 1;
  }

  private _canHoldTarget(
    target: HTMLElement,
    metrics: ReturnType<typeof resolveTocScrollMetrics>,
    context: TocNavigationContext,
  ): boolean {
    return (
      hasRootScrollReachedTocTargetY(metrics) &&
      isHeadingIntersectingViewport(target) &&
      context.tracker.canHoldProgrammaticTarget(target.id, target)
    );
  }

  private _attachUserInterventionListeners(): void {
    this._cleanupUserInterventionListeners?.();

    const cancelForUserScroll = (): void => {
      this.cancelNavigation('user-scroll');
    };
    const cancelForPopstate = (): void => {
      this.cancelNavigation('popstate');
    };
    const cancelForHashchange = (): void => {
      this.cancelNavigation('hashchange');
    };
    const cancelForResize = (): void => {
      this.cancelNavigation('resize');
    };
    const cancelForKeydown = (event: KeyboardEvent): void => {
      if (SCROLL_KEYS.has(event.key)) {
        this.cancelNavigation('user-scroll');
      }
    };

    window.addEventListener('wheel', cancelForUserScroll, { passive: true });
    window.addEventListener('touchmove', cancelForUserScroll, { passive: true });
    window.addEventListener('keydown', cancelForKeydown);
    window.addEventListener('popstate', cancelForPopstate);
    window.addEventListener('hashchange', cancelForHashchange);
    window.addEventListener('resize', cancelForResize);

    this._cleanupUserInterventionListeners = () => {
      window.removeEventListener('wheel', cancelForUserScroll);
      window.removeEventListener('touchmove', cancelForUserScroll);
      window.removeEventListener('keydown', cancelForKeydown);
      window.removeEventListener('popstate', cancelForPopstate);
      window.removeEventListener('hashchange', cancelForHashchange);
      window.removeEventListener('resize', cancelForResize);
    };
  }
}
