import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { renderStaticIconTemplate } from '../icon/static-icon-template.js';
import type { IconName } from '../../../../shared/icons/icons-catalog.js';

export type ToastVariant = 'success' | 'warning' | 'danger' | 'info';
type ToastRole = 'status' | 'alert';

export const TOAST_VARIANTS = [
  'success',
  'warning',
  'danger',
  'info',
] as const satisfies ToastVariant[];
export const MAX_TOAST_STACK = 3;
export const DEFAULT_TOAST_DURATION_MS = 4000;
export const DANGER_TOAST_DURATION_MS = 6000;
export const TOAST_EXIT_DURATION_MS = 150;

const TOAST_CLOSE_LABEL = '通知を閉じる';
const TOAST_ID_PREFIX = 'ui-toast';

const TOAST_ROLE_BY_VARIANT: Record<ToastVariant, ToastRole> = {
  success: 'status',
  info: 'status',
  warning: 'alert',
  danger: 'alert',
};

const TOAST_ICON_BY_VARIANT: Record<ToastVariant, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-octagon',
};

export interface ToastShowOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  dismissible?: boolean;
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
  dismissible: boolean;
  duplicateKey: string;
  isExiting: boolean;
}

type ToastPauseReason = 'hover' | 'focus' | 'visibility';

interface ToastTimerState {
  timeoutId: number | null;
  startedAt: number | null;
  remaining: number;
  pauseReasons: Set<ToastPauseReason>;
}

type ToastSubscriber = (items: readonly ToastItem[]) => void;

const normalizeMessage = (message: string): string => message.replace(/\s+/g, ' ').trim();

const resolveDuration = (duration: number | undefined, variant: ToastVariant): number => {
  const fallback = variant === 'danger' ? DANGER_TOAST_DURATION_MS : DEFAULT_TOAST_DURATION_MS;
  if (typeof duration !== 'number' || !Number.isFinite(duration)) return fallback;
  return Math.max(0, Math.trunc(duration));
};

const snapshotItems = (items: readonly ToastItem[]): ToastItem[] =>
  items.map((item) => ({ ...item }));

class ToastStore {
  private readonly _subscribers = new Set<ToastSubscriber>();
  private readonly _timers = new Map<string, ToastTimerState>();
  private readonly _exitTimers = new Map<string, number>();
  private _toasts: ToastItem[] = [];
  private _sequence = 0;

  subscribe(subscriber: ToastSubscriber): () => void {
    this._subscribers.add(subscriber);
    subscriber(this.getSnapshot());

    return () => {
      this._subscribers.delete(subscriber);
    };
  }

  getSnapshot(): ToastItem[] {
    return snapshotItems(this._toasts);
  }

  show(options: ToastShowOptions): string | null {
    const normalizedMessage = normalizeMessage(options.message);
    if (normalizedMessage === '') return null;

    const variant = this._resolveVariant(options.variant);
    const duration = resolveDuration(options.duration, variant);
    const dismissible = duration === 0 ? true : (options.dismissible ?? true);
    const duplicateKey = `${variant}::${normalizedMessage}`;

    const existing = this._toasts.find((item) => item.duplicateKey === duplicateKey);
    if (existing) {
      existing.message = normalizedMessage;
      existing.duration = duration;
      existing.dismissible = dismissible;
      existing.isExiting = false;
      this._clearExitTimer(existing.id);
      this._resetTimer(existing.id, duration);
      this._emit();
      return existing.id;
    }

    const nextItem: ToastItem = {
      id: this._nextId(),
      variant,
      message: normalizedMessage,
      duration,
      dismissible,
      duplicateKey,
      isExiting: false,
    };

    this._toasts.unshift(nextItem);
    this._resetTimer(nextItem.id, duration);

    while (this._toasts.length > MAX_TOAST_STACK) {
      const oldestIndex = this._toasts.length - 1;
      this._removeAtIndex(oldestIndex, false);
    }

    this._emit();
    return nextItem.id;
  }

  dismiss(id: string): boolean {
    const target = this._toasts.find((item) => item.id === id);
    if (!target) return false;
    if (target.isExiting) return true;

    target.isExiting = true;
    this._clearTimer(target.id);
    this._clearExitTimer(target.id);

    const timeoutId = window.setTimeout(() => {
      this._exitTimers.delete(target.id);
      const index = this._toasts.findIndex((item) => item.id === target.id);
      if (index === -1) return;
      this._removeAtIndex(index, true);
    }, TOAST_EXIT_DURATION_MS);
    this._exitTimers.set(target.id, timeoutId);
    this._emit();
    return true;
  }

  clear(): void {
    if (this._toasts.length === 0) return;

    for (const timer of this._timers.values()) {
      if (timer.timeoutId !== null) {
        window.clearTimeout(timer.timeoutId);
      }
    }
    for (const timeoutId of this._exitTimers.values()) {
      window.clearTimeout(timeoutId);
    }

    this._timers.clear();
    this._exitTimers.clear();
    this._toasts = [];
    this._emit();
  }

  pause(id: string, reason: ToastPauseReason): void {
    const timer = this._timers.get(id);
    if (!timer) return;
    if (timer.pauseReasons.has(reason)) return;

    const wasPaused = this._isTimerPaused(timer);
    timer.pauseReasons.add(reason);

    if (!wasPaused) {
      this._pauseTimer(timer);
    }
  }

  resume(id: string, reason: ToastPauseReason): void {
    const timer = this._timers.get(id);
    if (!timer) return;
    if (!timer.pauseReasons.has(reason)) return;

    timer.pauseReasons.delete(reason);

    if (!this._isTimerPaused(timer)) {
      this._resumeTimer(id, timer);
    }
  }

  setVisibilityPaused(paused: boolean): void {
    for (const id of this._timers.keys()) {
      if (paused) {
        this.pause(id, 'visibility');
        continue;
      }

      this.resume(id, 'visibility');
    }
  }

  private _resolveVariant(variant: string | undefined): ToastVariant {
    if (
      variant === 'success' ||
      variant === 'warning' ||
      variant === 'danger' ||
      variant === 'info'
    ) {
      return variant;
    }

    return 'info';
  }

  private _nextId(): string {
    this._sequence += 1;
    return `${TOAST_ID_PREFIX}-${String(Date.now())}-${String(this._sequence)}`;
  }

  private _removeAtIndex(index: number, notify: boolean): void {
    const target = this._toasts[index];
    if (!target) return;

    this._clearTimer(target.id);
    this._clearExitTimer(target.id);
    this._toasts.splice(index, 1);

    if (notify) {
      this._emit();
    }
  }

  private _clearTimer(id: string): void {
    const timer = this._timers.get(id);
    if (!timer) return;

    if (timer.timeoutId !== null) {
      window.clearTimeout(timer.timeoutId);
    }

    this._timers.delete(id);
  }

  private _clearExitTimer(id: string): void {
    const timeoutId = this._exitTimers.get(id);
    if (typeof timeoutId !== 'number') return;
    window.clearTimeout(timeoutId);
    this._exitTimers.delete(id);
  }

  private _resetTimer(id: string, duration: number): void {
    this._clearTimer(id);
    if (duration <= 0) return;

    const nextTimer: ToastTimerState = {
      timeoutId: null,
      startedAt: null,
      remaining: duration,
      pauseReasons: new Set<ToastPauseReason>(),
    };

    if (this._isDocumentHidden()) {
      nextTimer.pauseReasons.add('visibility');
    }

    this._timers.set(id, nextTimer);
    this._resumeTimer(id, nextTimer);
  }

  private _pauseTimer(timer: ToastTimerState): void {
    if (timer.timeoutId !== null) {
      window.clearTimeout(timer.timeoutId);
      timer.timeoutId = null;
    }

    if (timer.startedAt !== null) {
      const elapsed = Date.now() - timer.startedAt;
      timer.remaining = Math.max(0, timer.remaining - elapsed);
      timer.startedAt = null;
    }
  }

  private _resumeTimer(id: string, timer: ToastTimerState): void {
    if (this._isTimerPaused(timer)) return;
    if (timer.timeoutId !== null) return;

    if (timer.remaining <= 0) {
      this.dismiss(id);
      return;
    }

    timer.startedAt = Date.now();
    timer.timeoutId = window.setTimeout(() => {
      timer.timeoutId = null;
      timer.startedAt = null;
      this.dismiss(id);
    }, timer.remaining);
  }

  private _isDocumentHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }

  private _isTimerPaused(timer: ToastTimerState): boolean {
    return timer.pauseReasons.size > 0;
  }

  private _emit(): void {
    const snapshot = this.getSnapshot();
    for (const subscriber of this._subscribers) {
      subscriber(snapshot);
    }
  }
}

const toastStore = new ToastStore();

export const ToastManager = {
  show: (options: ToastShowOptions): string | null => toastStore.show(options),
  dismiss: (id: string): boolean => toastStore.dismiss(id),
  clear: (): void => {
    toastStore.clear();
  },
  pause: (id: string, reason: ToastPauseReason): void => {
    toastStore.pause(id, reason);
  },
  resume: (id: string, reason: ToastPauseReason): void => {
    toastStore.resume(id, reason);
  },
  setVisibilityPaused: (paused: boolean): void => {
    toastStore.setVisibilityPaused(paused);
  },
  subscribe: (subscriber: ToastSubscriber): (() => void) => toastStore.subscribe(subscriber),
  getSnapshot: (): ToastItem[] => toastStore.getSnapshot(),
};

@customElement('ui-toast')
export class UiToast extends LitElement {
  static override styles = css`
    :host {
      --toast-max-width: 320px;
      display: block;
      position: fixed;
      inset-block-start: var(--space-4, 16px);
      inset-inline-end: var(--space-4, 16px);
      z-index: var(--z-toast, 500);
      pointer-events: none;
    }

    .toast-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
      inline-size: min(var(--toast-max-width), calc(100vw - var(--space-8, 32px)));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3, 12px);
      margin: 0;
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border: var(--border-width, 1px) solid var(--border-default, oklch(20% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      box-shadow: var(--elevation-lg, 0 10px 15px -3px oklch(0% 0 0 / 0.1));
      color: var(--fg-default, oklch(20% 0 0));
      pointer-events: auto;
      inline-size: 100%;
      animation: toast-slide-in var(--duration-slow, 200ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    .toast[data-exiting='true'] {
      animation: toast-fade-out var(--duration-normal, 150ms)
        var(--ease-in, cubic-bezier(0.32, 0, 0.67, 0.24));
      animation-fill-mode: both;
      pointer-events: none;
    }

    .toast[data-variant='info'] {
      background: var(--bg-surface-2, oklch(100% 0 0));
      --_toast-icon-color: var(--fg-info, var(--primary, oklch(55% 0.2 250)));
    }

    .toast[data-variant='success'] {
      background: var(--bg-success-subtle, oklch(96% 0.04 145));
      --_toast-icon-color: var(--fg-success, oklch(55% 0.18 145));
    }

    .toast[data-variant='warning'] {
      background: var(--bg-warning-subtle, oklch(96% 0.04 85));
      --_toast-icon-color: var(--fg-warning, oklch(55% 0.16 85));
    }

    .toast[data-variant='danger'] {
      background: var(--bg-danger-subtle, oklch(96% 0.03 25));
      --_toast-icon-color: var(--fg-danger, oklch(55% 0.2 25));
    }

    .toast-content {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2, 8px);
      min-width: 0;
      flex: 1;
    }

    .toast-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      width: var(--icon-base, 16px);
      /* 1行目のテキスト中央に合わせてアイコンの縦位置を安定させる */
      height: calc(1em * var(--line-height-normal, 1.5));
      font-size: var(--icon-base, 16px);
      color: var(--_toast-icon-color, var(--fg-muted, oklch(45% 0 0)));
    }

    .toast-message {
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-normal, 1.5);
      color: var(--fg-default, oklch(20% 0 0));
      word-break: break-word;
    }

    .toast-close {
      appearance: none;
      border: 0;
      border-radius: var(--radius-sm, 4px);
      background: transparent;
      color: var(--fg-muted, oklch(45% 0 0));
      inline-size: 24px;
      block-size: 24px;
      padding: 0;
      margin: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      flex-shrink: 0;
      transition:
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    .toast-close::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      inline-size: var(--control-min-touch, 24px);
      block-size: var(--control-min-touch, 24px);
    }

    .toast-close:hover {
      background: var(--bg-hover, oklch(from var(--fg-default, oklch(20% 0 0)) l c h / 0.05));
      color: var(--fg-default, oklch(20% 0 0));
    }

    .toast-close:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(55% 0.2 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    .toast-close svg {
      inline-size: var(--icon-sm, 14px);
      block-size: var(--icon-sm, 14px);
    }

    @keyframes toast-slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }

      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes toast-fade-out {
      from {
        transform: scale(1);
        opacity: 1;
      }

      to {
        transform: scale(0.95);
        opacity: 0;
      }
    }

    @keyframes toast-fade-only {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    @keyframes toast-fade-only-out {
      from {
        opacity: 1;
      }

      to {
        opacity: 0;
      }
    }

    @media (max-width: 639px) {
      :host {
        inset-block-start: auto;
        inset-block-end: var(--space-4, 16px);
        inset-inline-start: var(--space-4, 16px);
        inset-inline-end: var(--space-4, 16px);
      }

      .toast-container {
        inline-size: auto;
      }

      .toast {
        inline-size: 100%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation-name: toast-fade-only;
        animation-duration: var(--duration-slow, 200ms);
      }

      .toast[data-exiting='true'] {
        animation-name: toast-fade-only-out;
        animation-duration: var(--duration-normal, 150ms);
      }
    }

    @media (forced-colors: active) {
      .toast {
        background: Canvas;
        border: var(--border-width, 1px) solid CanvasText;
        box-shadow: none;
      }

      .toast-icon,
      .toast-message,
      .toast-close {
        color: CanvasText;
      }
    }

    @media print {
      :host {
        display: none !important;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: ToastVariant = 'info';

  @property({ type: Number, reflect: true })
  duration = DEFAULT_TOAST_DURATION_MS;

  @property({ type: Boolean, reflect: true })
  dismissible = true;

  @state()
  private _toasts: ToastItem[] = [];

  private _unsubscribe: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe = ToastManager.subscribe((items) => {
      this._toasts = [...items];
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
  }

  show(message: string, options: Omit<ToastShowOptions, 'message'> = {}): string | null {
    return ToastManager.show({
      message,
      variant: options.variant ?? this.variant,
      duration: options.duration ?? this.duration,
      dismissible: options.dismissible ?? this.dismissible,
    });
  }

  dismiss(id: string): boolean {
    return ToastManager.dismiss(id);
  }

  clear(): void {
    ToastManager.clear();
  }

  static show(options: ToastShowOptions): string | null {
    return ToastManager.show(options);
  }

  static dismiss(id: string): boolean {
    return ToastManager.dismiss(id);
  }

  static clear(): void {
    ToastManager.clear();
  }

  private _onVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    ToastManager.setVisibilityPaused(document.visibilityState === 'hidden');
  };

  private _onToastMouseEnter = (event: MouseEvent): void => {
    const toastId = this._getToastId(event.currentTarget);
    if (!toastId) return;
    ToastManager.pause(toastId, 'hover');
  };

  private _onToastMouseLeave = (event: MouseEvent): void => {
    const toastId = this._getToastId(event.currentTarget);
    if (!toastId) return;
    ToastManager.resume(toastId, 'hover');
  };

  private _onToastFocusIn = (event: FocusEvent): void => {
    const toastId = this._getToastId(event.currentTarget);
    if (!toastId) return;
    ToastManager.pause(toastId, 'focus');
  };

  private _onToastFocusOut = (event: FocusEvent): void => {
    const current = event.currentTarget;
    if (!(current instanceof HTMLElement)) return;

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && current.contains(nextTarget)) return;

    const toastId = this._getToastId(current);
    if (!toastId) return;
    ToastManager.resume(toastId, 'focus');
  };

  private _onDismissClick = (event: MouseEvent): void => {
    const toastId = this._getToastId(event.currentTarget);
    if (!toastId) return;
    ToastManager.dismiss(toastId);
  };

  private _getToastId(target: EventTarget | null): string | null {
    if (!(target instanceof HTMLElement)) return null;

    const toastId = target.dataset['toastId'];
    if (typeof toastId !== 'string' || toastId === '') return null;
    return toastId;
  }

  override render() {
    return html`
      <div class="toast-container">
        ${this._toasts.map(
          (toast) => html`
            <output
              class="toast"
              role="${TOAST_ROLE_BY_VARIANT[toast.variant]}"
              data-variant="${toast.variant}"
              data-toast-id="${toast.id}"
              data-exiting="${String(toast.isExiting)}"
              @mouseenter="${this._onToastMouseEnter}"
              @mouseleave="${this._onToastMouseLeave}"
              @focusin="${this._onToastFocusIn}"
              @focusout="${this._onToastFocusOut}"
            >
              <div class="toast-content">
                ${renderStaticIconTemplate(TOAST_ICON_BY_VARIANT[toast.variant], 'toast-icon')}
                <span class="toast-message">${toast.message}</span>
              </div>

              ${toast.dismissible
                ? html`
                    <button
                      type="button"
                      class="toast-close"
                      aria-label="${TOAST_CLOSE_LABEL}"
                      data-toast-id="${toast.id}"
                      @click="${this._onDismissClick}"
                    >
                      ${renderStaticIconTemplate('x')}
                    </button>
                  `
                : nothing}
            </output>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-toast': UiToast;
  }
}
