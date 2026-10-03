import type { HydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';
import {
  AnchoredOverlayController,
  type AnchoredOverlayCommitSnapshot,
} from '../../components/ui/overlay/internal/anchored-overlay-controller.js';
import { DropdownOpenSequencer } from '../../components/ui/dropdown/internal/dropdown-open-sequencer.js';

export interface CodePreviewState {
  readonly previewTheme: 'page' | 'light' | 'dark';
  readonly previewSurface: 'surface' | 'canvas' | 'muted';
  readonly previewViewport: 'full' | 'tablet' | 'mobile';
}
export interface CodePreviewStateChangeDetail {
  readonly keys: (keyof CodePreviewState)[];
  readonly state: CodePreviewState;
  readonly userInitiated: boolean;
}

const roots = new WeakSet<HTMLElement>();

class CommandMenuController {
  private readonly trigger: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly items: HTMLButtonElement[];
  private readonly overlay: AnchoredOverlayController;
  private readonly sequencer = new DropdownOpenSequencer();
  private snapshot: AnchoredOverlayCommitSnapshot | null = null;
  private opened = false;
  private ready = false;
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
  private tabTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly root: HTMLElement,
    signal: AbortSignal,
    onSelect: (value: string) => void,
  ) {
    const trigger = root.querySelector<HTMLButtonElement>(':scope > [data-command-menu-trigger]');
    const panel = root.querySelector<HTMLElement>(':scope > [data-command-menu-panel]');
    if (!trigger || !panel) throw new Error('[command-menu] native controls が必要です');
    this.trigger = trigger;
    this.panel = panel;
    this.items = Array.from(
      panel.querySelectorAll<HTMLButtonElement>(':scope > [data-command-menu-value]'),
    );
    this.overlay = new AnchoredOverlayController({
      ownerDocument: root.ownerDocument,
      getReference: () => trigger,
      getFloating: () => panel,
      getOpen: () => this.opened,
      getPlacement: () => 'bottom-end',
      getOffset: () => 4,
      outsidePointerDismiss: true,
      escapeDismiss: true,
      scrollStrategy: 'close',
      shouldDismissOnScroll: (event) =>
        !(event.target instanceof Node && panel.contains(event.target)),
      onCommit: (snapshot) => {
        this.snapshot = snapshot;
      },
      onDismissRequest: (reason, event) => {
        if (reason === 'escape') event.preventDefault();
        this.close(reason === 'escape');
      },
    });
    trigger.addEventListener(
      'click',
      () => {
        if (this.opened) this.close(false);
        else this.open(false);
      },
      { signal },
    );
    trigger.addEventListener(
      'keydown',
      (event) => {
        if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        if ((event.key === 'Enter' || event.key === ' ') && this.opened) this.close(false);
        else if (!this.opened) this.open(event.key === 'ArrowUp');
      },
      { signal },
    );
    const select = (item: HTMLButtonElement, keyboard: boolean): void => {
      if (!this.ready || item.disabled) return;
      onSelect(item.dataset['commandMenuValue'] ?? '');
      this.close(keyboard);
    };
    for (const item of this.items)
      item.addEventListener(
        'click',
        (event) => {
          select(item, event.detail === 0);
        },
        { signal },
      );
    panel.addEventListener(
      'keydown',
      (event) => {
        if (!this.ready) return;
        const enabled = this.items.filter((item) => !item.disabled);
        const index = enabled.findIndex((item) => item === root.ownerDocument.activeElement);
        let next: HTMLButtonElement | undefined;
        switch (event.key) {
          case 'ArrowDown':
            next = enabled[(index + 1) % enabled.length];
            break;
          case 'ArrowUp':
            next = enabled[(index - 1 + enabled.length) % enabled.length];
            break;
          case 'Home':
            next = enabled[0];
            break;
          case 'End':
            next = enabled.at(-1);
            break;
          case 'Enter':
          case ' ': {
            event.preventDefault();
            const item = enabled[index];
            if (item) select(item, true);
            return;
          }
          case 'Tab':
            this.tabTimer = setTimeout(() => {
              this.close(false);
            }, 0);
            return;
          default:
            if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
            this.typeahead += event.key.toLocaleLowerCase();
            clearTimeout(this.typeaheadTimer);
            this.typeaheadTimer = setTimeout(() => {
              this.typeahead = '';
            }, 500);
            next = [...enabled.slice(index + 1), ...enabled.slice(0, index + 1)].find((item) =>
              item.textContent.trim().toLocaleLowerCase().startsWith(this.typeahead),
            );
        }
        event.preventDefault();
        next?.focus({ preventScroll: true });
      },
      { signal },
    );
    root.hidden = false;
  }

  private open(last: boolean): void {
    this.opened = true;
    this.ready = false;
    this.panel.hidden = false;
    this.panel.inert = true;
    this.panel.dataset['positionPhase'] = 'positioning';
    this.overlay.activate();
    this.sequencer.begin({
      recomputePosition: () => this.overlay.recomputePosition(),
      isStillOpen: () => this.opened,
      getLastCommitSnapshot: () => this.snapshot,
      onReady: () => {
        this.ready = true;
        this.panel.inert = false;
        this.panel.dataset['positionPhase'] = 'ready';
        this.trigger.setAttribute('aria-expanded', 'true');
        this.overlay.startAutoUpdate();
        const enabled = this.items.filter((item) => !item.disabled);
        (last ? enabled.at(-1) : enabled[0])?.focus({ preventScroll: true });
      },
      onFail: () => {
        this.close(false);
      },
    });
  }

  private close(restore: boolean): void {
    this.opened = false;
    this.ready = false;
    this.sequencer.cancel();
    this.overlay.deactivate();
    this.panel.hidden = true;
    this.panel.inert = true;
    this.panel.dataset['positionPhase'] = 'idle';
    this.trigger.setAttribute('aria-expanded', 'false');
    if (restore && this.root.isConnected) this.trigger.focus({ preventScroll: true });
  }

  destroy(): void {
    this.close(false);
    clearTimeout(this.tabTimer);
    clearTimeout(this.typeaheadTimer);
    this.overlay.destroy();
    this.root.hidden = true;
  }
}

export const activateCodePreview = (
  root: HTMLElement,
  signal: AbortSignal,
): HydrationActivationResult => {
  if (signal.aborted) return { status: 'aborted' };
  if (roots.has(root)) return { status: 'skipped', reason: 'already-activated' };
  const lifetime = new AbortController();
  const theme = root.dataset['previewTheme'];
  const surface = root.dataset['previewSurface'];
  const viewport = root.dataset['previewViewport'];
  if (
    (theme !== 'page' && theme !== 'light' && theme !== 'dark') ||
    (surface !== 'surface' && surface !== 'canvas' && surface !== 'muted') ||
    (viewport !== 'full' && viewport !== 'tablet' && viewport !== 'mobile')
  )
    throw new Error('[code-preview] canonical metadata が必要です');
  let state: CodePreviewState = {
    previewTheme: theme,
    previewSurface: surface,
    previewViewport: viewport,
  };
  const menus = Array.from(
    root.querySelectorAll<HTMLElement>('[data-code-preview-control]'),
  ).filter((menu) => menu.closest('[data-code-preview-root]') === root);
  const project = (): void => {
    root.dataset['previewTheme'] = state.previewTheme;
    root.dataset['previewSurface'] = state.previewSurface;
    root.dataset['previewViewport'] = state.previewViewport;
    for (const menu of menus) {
      const control = menu.dataset['codePreviewControl'];
      const value =
        control === 'theme'
          ? state.previewTheme
          : control === 'surface'
            ? state.previewSurface
            : state.previewViewport;
      for (const label of menu.querySelectorAll<HTMLElement>('[data-command-menu-label]'))
        label.hidden = label.dataset['commandMenuLabel'] !== value;
    }
  };
  const controllers = menus.map(
    (menu) =>
      new CommandMenuController(menu, lifetime.signal, (value) => {
        const control = menu.dataset['codePreviewControl'];
        let key: keyof CodePreviewState;
        let next = state;
        if (control === 'theme' && (value === 'page' || value === 'light' || value === 'dark')) {
          key = 'previewTheme';
          next = { ...state, previewTheme: value };
        } else if (
          control === 'surface' &&
          (value === 'surface' || value === 'canvas' || value === 'muted')
        ) {
          key = 'previewSurface';
          next = { ...state, previewSurface: value };
        } else if (
          control === 'viewport' &&
          (value === 'full' || value === 'tablet' || value === 'mobile')
        ) {
          key = 'previewViewport';
          next = { ...state, previewViewport: value };
        } else return;
        if (state[key] === next[key]) return;
        state = next;
        project();
        const detail: CodePreviewStateChangeDetail = {
          keys: [key],
          state: { ...state },
          userInitiated: true,
        };
        root.dispatchEvent(
          new CustomEvent('ui-code-preview-state-change', {
            detail,
            bubbles: true,
            composed: true,
          }),
        );
      }),
  );
  project();
  roots.add(root);
  root.setAttribute('data-code-preview-enhanced', '');
  const cleanup = (): void => {
    if (lifetime.signal.aborted) return;
    lifetime.abort();
    signal.removeEventListener('abort', cleanup);
    controllers.forEach((controller) => {
      controller.destroy();
    });
    roots.delete(root);
    root.removeAttribute('data-code-preview-enhanced');
  };
  signal.addEventListener('abort', cleanup, { once: true });
  return { status: 'activated', cleanup };
};
