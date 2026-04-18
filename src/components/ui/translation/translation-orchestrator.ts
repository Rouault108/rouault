import type { TranslationOverlaySurface, UiTranslation } from './translation.js';

export interface TranslationOverlayOrchestratorOptions {
  root?: Document | Element | DocumentFragment;
}

const isTranslationElement = (value: EventTarget | null): value is UiTranslation =>
  value instanceof HTMLElement && value.tagName === 'UI-TRANSLATION';

export class TranslationOverlayOrchestrator {
  private readonly _root: Document | Element | DocumentFragment;
  private _started = false;

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
  }

  refresh(): void {
    // Phase 2C では orchestrator は positioning を担当しない。
  }

  private _queryTranslations(): UiTranslation[] {
    return Array.from(this._root.querySelectorAll<UiTranslation>('ui-translation'));
  }

  private _closeOtherLookups(
    activeTranslation: UiTranslation,
    _activeSurface: TranslationOverlaySurface,
  ): void {
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
    if (!detail?.open) {
      return;
    }

    this._closeOtherLookups(translation, detail.surface ?? translation.surface);
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
