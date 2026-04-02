import type { TranslationOverlaySurface, UiTranslation } from './translation.js';

export interface TranslationOverlayOrchestratorOptions {
  root?: Document | Element | DocumentFragment;
}

const POPOVER_EDGE_PADDING = 16;
const POPOVER_TRIGGER_GAP = 8;

const isTranslationElement = (value: EventTarget | null): value is UiTranslation =>
  value instanceof HTMLElement && value.tagName === 'UI-TRANSLATION';

export class TranslationOverlayOrchestrator {
  private readonly _root: Document | Element | DocumentFragment;
  private readonly _openTranslations = new Set<UiTranslation>();
  private _started = false;
  private _positionRaf: number | null = null;
  private _listeningViewport = false;

  constructor(options: TranslationOverlayOrchestratorOptions = {}) {
    const resolvedRoot = options.root ?? (typeof document !== 'undefined' ? document : null);
    if (!resolvedRoot) {
      throw new Error('[TranslationOverlayOrchestrator] root が必要です。');
    }

    this._root = resolvedRoot;
  }

  start(): void {
    if (this._started) {
      return;
    }

    this._started = true;
    this._root.addEventListener('translation-toggle', this._onTranslationToggle as EventListener);
    this._syncOpenTranslationsFromDom();
  }

  destroy(): void {
    if (!this._started) {
      return;
    }

    this._started = false;
    this._root.removeEventListener(
      'translation-toggle',
      this._onTranslationToggle as EventListener,
    );
    this._detachViewportListeners();
    this._openTranslations.clear();

    if (this._positionRaf !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._positionRaf);
      this._positionRaf = null;
    }
  }

  refresh(): void {
    this._syncOpenTranslationsFromDom();
  }

  private _queryTranslations(): UiTranslation[] {
    return Array.from(this._root.querySelectorAll<UiTranslation>('ui-translation'));
  }

  private _syncOpenTranslationsFromDom(): void {
    this._openTranslations.clear();

    for (const translation of this._queryTranslations()) {
      if (translation.open) {
        this._openTranslations.add(translation);
      }
    }

    this._syncViewportListeners();
    this._schedulePositioning();
  }

  private _syncViewportListeners(): void {
    const needsViewportListeners =
      this._openTranslations.size > 0 &&
      Array.from(this._openTranslations).some((item) => item.surface === 'popover');

    if (needsViewportListeners === this._listeningViewport || typeof window === 'undefined') {
      return;
    }

    this._listeningViewport = needsViewportListeners;

    if (needsViewportListeners) {
      window.addEventListener('resize', this._onViewportChange, { passive: true });
      window.addEventListener('scroll', this._onViewportChange, {
        passive: true,
        capture: true,
      });
      return;
    }

    this._detachViewportListeners();
  }

  private _detachViewportListeners(): void {
    if (!this._listeningViewport || typeof window === 'undefined') {
      return;
    }

    this._listeningViewport = false;
    window.removeEventListener('resize', this._onViewportChange);
    window.removeEventListener('scroll', this._onViewportChange, true);
  }

  private _onViewportChange = (): void => {
    this._schedulePositioning();
  };

  private _schedulePositioning(): void {
    if (this._positionRaf !== null || typeof window === 'undefined') {
      return;
    }

    this._positionRaf = window.requestAnimationFrame(() => {
      this._positionRaf = null;
      this._updateOpenPopovers();
    });
  }

  private _updateOpenPopovers(): void {
    for (const translation of this._openTranslations) {
      if (!translation.open || translation.surface !== 'popover') {
        continue;
      }
      this._positionPopover(translation);
    }
  }

  private _positionPopover(translation: UiTranslation): void {
    const trigger = translation.getTriggerElement();
    const content = translation.getContentElement();
    if (!trigger || !content || content.hidden) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxLeft = Math.max(
      POPOVER_EDGE_PADDING,
      viewportWidth - contentRect.width - POPOVER_EDGE_PADDING,
    );
    const left = Math.min(Math.max(triggerRect.left, POPOVER_EDGE_PADDING), maxLeft);

    const preferredBelowTop = triggerRect.bottom + POPOVER_TRIGGER_GAP;
    const preferredAboveTop = triggerRect.top - contentRect.height - POPOVER_TRIGGER_GAP;
    const canPlaceBelow =
      preferredBelowTop + contentRect.height + POPOVER_EDGE_PADDING <= viewportHeight;
    const topCandidate = canPlaceBelow ? preferredBelowTop : preferredAboveTop;
    const maxTop = Math.max(
      POPOVER_EDGE_PADDING,
      viewportHeight - contentRect.height - POPOVER_EDGE_PADDING,
    );
    const top = Math.min(Math.max(topCandidate, POPOVER_EDGE_PADDING), maxTop);

    translation.style.setProperty('--ui-translation-popover-left', `${String(Math.round(left))}px`);
    translation.style.setProperty('--ui-translation-popover-top', `${String(Math.round(top))}px`);
  }

  private _closeOtherLookups(activeTranslation: UiTranslation): void {
    for (const translation of this._queryTranslations()) {
      if (translation === activeTranslation) {
        continue;
      }
      if (!translation.open) {
        continue;
      }
      translation.closeTranslation();
    }
  }

  private _onTranslationToggle = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    const translation = event.target;
    if (!isTranslationElement(translation)) {
      return;
    }

    const detail = event.detail as { open?: boolean; surface?: TranslationOverlaySurface } | null;
    if (detail?.open) {
      this._closeOtherLookups(translation);
      this._openTranslations.add(translation);
    } else {
      this._openTranslations.delete(translation);
    }

    this._syncViewportListeners();
    this._schedulePositioning();
  };
}

let defaultTranslationOverlayOrchestrator: TranslationOverlayOrchestrator | null = null;

export const initTranslationOverlayOrchestrator = (): TranslationOverlayOrchestrator | null => {
  if (defaultTranslationOverlayOrchestrator) {
    return defaultTranslationOverlayOrchestrator;
  }
  if (typeof document === 'undefined') {
    return null;
  }

  defaultTranslationOverlayOrchestrator = new TranslationOverlayOrchestrator({ root: document });
  defaultTranslationOverlayOrchestrator.start();
  return defaultTranslationOverlayOrchestrator;
};

export const getTranslationOverlayOrchestrator = (): TranslationOverlayOrchestrator | null =>
  defaultTranslationOverlayOrchestrator;
