import type {
  TranslationRenderMode,
  UiTranslation,
} from './translation';

export type TranslationIntentMode = 'lookup' | 'parallel';

export interface TranslationModeChangeDetail {
  intentMode: TranslationIntentMode;
  renderMode: TranslationRenderMode;
}

export interface ResolveRenderModeOptions {
  intentMode: TranslationIntentMode;
  isMobile: boolean;
  studyMode: boolean;
}

export interface TranslationOrchestratorOptions {
  root?: Document | Element | DocumentFragment;
  keyTarget?: Document | Element;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  studyMode?: boolean;
  mobileBreakpoint?: number;
  isMobileViewport?: () => boolean;
}

export const TRANSLATION_MODE_STORAGE_KEY = 'rouault:translation-mode';
export const DEFAULT_TRANSLATION_MOBILE_BREAKPOINT = 1280;

const VALID_INTENT_MODES = new Set<TranslationIntentMode>(['lookup', 'parallel']);

const isTranslationElement = (value: EventTarget | null): value is UiTranslation =>
  value instanceof HTMLElement && value.tagName === 'UI-TRANSLATION';

const isEditableTarget = (value: EventTarget | null): boolean => {
  if (!(value instanceof HTMLElement)) return false;
  if (value.isContentEditable) return true;

  const tagName = value.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
};

const normalizeIntentMode = (value: string | null | undefined): TranslationIntentMode =>
  VALID_INTENT_MODES.has(value as TranslationIntentMode) ? (value as TranslationIntentMode) : 'lookup';

const createDefaultViewportResolver = (mobileBreakpoint: number): (() => boolean) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => false;
  }

  const maxWidth = Math.max(0, Math.trunc(mobileBreakpoint) - 1);
  const mediaQuery = `(max-width: ${String(maxWidth)}px)`;
  return () => window.matchMedia(mediaQuery).matches;
};

export const resolveTranslationRenderMode = ({
  intentMode,
  isMobile,
  studyMode,
}: ResolveRenderModeOptions): TranslationRenderMode => {
  if (!isMobile) {
    return intentMode === 'parallel' ? 'drawer' : 'popover';
  }

  if (intentMode === 'parallel' && studyMode) {
    return 'interlinear';
  }

  return 'popover';
};

export class TranslationOrchestrator {
  private readonly _root: Document | Element | DocumentFragment;
  private readonly _keyTarget: EventTarget;
  private readonly _storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  private readonly _storageKey: string;
  private readonly _isMobileViewport: () => boolean;
  private _intentMode: TranslationIntentMode;
  private _studyMode: boolean;
  private _observer: MutationObserver | null = null;
  private _started = false;

  constructor(options: TranslationOrchestratorOptions = {}) {
    const resolvedRoot = options.root ?? (typeof document !== 'undefined' ? document : null);
    if (!resolvedRoot) {
      throw new Error('[TranslationOrchestrator] root が必要です。');
    }

    this._root = resolvedRoot;
    this._keyTarget = options.keyTarget ?? (typeof document !== 'undefined' ? document : resolvedRoot);
    this._storage = options.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    this._storageKey = options.storageKey ?? TRANSLATION_MODE_STORAGE_KEY;
    this._studyMode = options.studyMode ?? false;

    const mobileBreakpoint = options.mobileBreakpoint ?? DEFAULT_TRANSLATION_MOBILE_BREAKPOINT;
    this._isMobileViewport = options.isMobileViewport ?? createDefaultViewportResolver(mobileBreakpoint);
    this._intentMode = this._readIntentMode();
  }

  get intentMode(): TranslationIntentMode {
    return this._intentMode;
  }

  get studyMode(): boolean {
    return this._studyMode;
  }

  start(): void {
    if (this._started) return;
    this._started = true;

    this._root.addEventListener('translation-request-mode-toggle', this._onModeToggleRequest);
    this._keyTarget.addEventListener('keydown', this._onGlobalKeyDown);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onViewportChange, { passive: true });
    }

    this._observer = this._createObserver();
    this._applyResolvedRenderMode();
  }

  destroy(): void {
    if (!this._started) return;
    this._started = false;

    this._root.removeEventListener('translation-request-mode-toggle', this._onModeToggleRequest);
    this._keyTarget.removeEventListener('keydown', this._onGlobalKeyDown);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onViewportChange);
    }

    this._observer?.disconnect();
    this._observer = null;
  }

  setIntentMode(mode: TranslationIntentMode, options: { persist?: boolean } = {}): void {
    const nextMode = normalizeIntentMode(mode);
    if (this._intentMode === nextMode) return;

    this._intentMode = nextMode;
    if (options.persist !== false) {
      this._writeIntentMode(nextMode);
    }

    this._applyResolvedRenderMode();
    this._emitModeChange();
  }

  toggleIntentMode(): void {
    this.setIntentMode(this._intentMode === 'lookup' ? 'parallel' : 'lookup');
  }

  setStudyMode(studyMode: boolean): void {
    if (this._studyMode === studyMode) return;
    this._studyMode = studyMode;
    this._applyResolvedRenderMode();
    this._emitModeChange();
  }

  refresh(): void {
    this._applyResolvedRenderMode();
  }

  private _queryTranslations(): UiTranslation[] {
    return Array.from(this._root.querySelectorAll<UiTranslation>('ui-translation'));
  }

  private _resolveRenderMode(): TranslationRenderMode {
    return resolveTranslationRenderMode({
      intentMode: this._intentMode,
      isMobile: this._isMobileViewport(),
      studyMode: this._studyMode,
    });
  }

  private _applyResolvedRenderMode(): void {
    const resolvedRenderMode = this._resolveRenderMode();
    const targets = this._queryTranslations();

    for (const target of targets) {
      if (target.renderMode === resolvedRenderMode) continue;
      target.renderMode = resolvedRenderMode;
    }
  }

  private _readIntentMode(): TranslationIntentMode {
    if (!this._storage) return 'lookup';

    try {
      return normalizeIntentMode(this._storage.getItem(this._storageKey));
    } catch {
      return 'lookup';
    }
  }

  private _writeIntentMode(mode: TranslationIntentMode): void {
    if (!this._storage) return;

    try {
      this._storage.setItem(this._storageKey, mode);
    } catch {
      // ストレージ利用不可環境では永続化をスキップする
    }
  }

  private _emitModeChange(): void {
    const event = new CustomEvent<TranslationModeChangeDetail>('translation-mode-change', {
      detail: {
        intentMode: this._intentMode,
        renderMode: this._resolveRenderMode(),
      },
      bubbles: true,
      composed: true,
    });

    this._root.dispatchEvent(event);
  }

  private _createObserver(): MutationObserver | null {
    if (typeof MutationObserver === 'undefined') return null;

    const observerTarget =
      this._root instanceof Document ? this._root.documentElement : this._root;

    const observer = new MutationObserver(() => {
      this._applyResolvedRenderMode();
    });
    observer.observe(observerTarget, {
      childList: true,
      subtree: true,
    });

    return observer;
  }

  private _findTranslationFromEvent(event: KeyboardEvent): UiTranslation | null {
    if (typeof event.composedPath === 'function') {
      const path = event.composedPath();
      for (const candidate of path) {
        if (!isTranslationElement(candidate)) continue;
        if (this._root.contains(candidate)) {
          return candidate;
        }
      }
    }

    if (!(event.target instanceof Element)) return null;
    const fallback = event.target.closest<UiTranslation>('ui-translation');
    if (!fallback) return null;
    return this._root.contains(fallback) ? fallback : null;
  }

  private _onViewportChange = (): void => {
    this._applyResolvedRenderMode();
  };

  private _onModeToggleRequest = (event: Event): void => {
    if (!(event instanceof CustomEvent)) return;
    if (!event.bubbles) return;
    this.toggleIntentMode();
  };

  private _onGlobalKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.defaultPrevented || event.repeat) return;
    if (isEditableTarget(event.target)) return;

    const normalizedKey = event.key.toLowerCase();
    const wantsGlobalToggle =
      normalizedKey === 'l' && event.shiftKey && !event.altKey && (event.ctrlKey || event.metaKey);

    if (wantsGlobalToggle) {
      event.preventDefault();
      this.toggleIntentMode();
      return;
    }

    const wantsInlineToggle =
      normalizedKey === 'p' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey;

    if (!wantsInlineToggle) return;

    const activeTranslation = this._findTranslationFromEvent(event);
    if (!activeTranslation?.open) return;
    if (activeTranslation.renderMode === 'interlinear') return;

    event.preventDefault();
    this.toggleIntentMode();
  };
}

let defaultTranslationOrchestrator: TranslationOrchestrator | null = null;

export const initTranslationOrchestrator = (): TranslationOrchestrator | null => {
  if (defaultTranslationOrchestrator) return defaultTranslationOrchestrator;
  if (typeof document === 'undefined') return null;

  defaultTranslationOrchestrator = new TranslationOrchestrator({ root: document });
  defaultTranslationOrchestrator.start();
  return defaultTranslationOrchestrator;
};

export const getTranslationOrchestrator = (): TranslationOrchestrator | null =>
  defaultTranslationOrchestrator;
