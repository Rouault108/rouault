import type { HydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';
import { AnchoredOverlayController } from '../../components/ui/overlay/internal/anchored-overlay-controller.js';

const roots = new WeakSet<HTMLDetailsElement>();
const orchestrators = new WeakMap<Document, { retain(): void; release(): void }>();

const ensureOrchestrator = (document: Document): { retain(): void; release(): void } => {
  const existing = orchestrators.get(document);
  if (existing) return existing;
  const observed = new WeakMap<HTMLDetailsElement, boolean>();
  const query = (): HTMLDetailsElement[] =>
    Array.from(document.querySelectorAll('details[data-translation-overlay][open]'));
  const closeOthers = (active: HTMLDetailsElement): void => {
    for (const root of query())
      if (root !== active) {
        root.open = false;
        observed.set(root, false);
      }
  };
  const opened = query();
  const retained = opened.find((root) => root.contains(document.activeElement)) ?? opened[0];
  if (retained) closeOthers(retained);
  for (const root of document.querySelectorAll<HTMLDetailsElement>(
    'details[data-translation-overlay]',
  ))
    observed.set(root, root.open);
  // 未enhanceのdisclosureもnative toggleを通じて同じone-open policyに参加する。
  const onToggle = (event: Event): void => {
    const root = event.target;
    if (!(root instanceof HTMLDetailsElement) || !root.matches('[data-translation-overlay]'))
      return;
    const previouslyOpen = observed.get(root);
    observed.set(root, root.open);
    if (root.open && previouslyOpen !== true) closeOthers(root);
  };
  document.addEventListener('toggle', onToggle, true);
  let references = 0;
  const orchestrator = {
    retain(): void {
      references += 1;
    },
    release(): void {
      references -= 1;
      if (references !== 0) return;
      document.removeEventListener('toggle', onToggle, true);
      orchestrators.delete(document);
    },
  };
  orchestrators.set(document, orchestrator);
  return orchestrator;
};

export const activateTranslationOverlay = (
  root: HTMLElement,
  signal: AbortSignal,
): HydrationActivationResult => {
  if (signal.aborted) return { status: 'aborted' };
  if (!(root instanceof HTMLDetailsElement))
    return { status: 'skipped', reason: 'invalid-element' };
  if (roots.has(root)) return { status: 'skipped', reason: 'already-activated' };
  const summary = root.querySelector<HTMLElement>(':scope > summary');
  const content = root.querySelector<HTMLElement>(':scope > [data-translation-content]');
  if (!summary || !content) throw new Error('[translation] native disclosure が必要です');
  const orchestrator = ensureOrchestrator(root.ownerDocument);
  orchestrator.retain();
  roots.add(root);
  const surface = root.dataset['surface'] === 'drawer' ? 'drawer' : 'popover';
  const overlay = new AnchoredOverlayController({
    ownerDocument: root.ownerDocument,
    getReference: () => summary,
    getFloating: () => content,
    getOpen: () => root.open,
    getPlacement: () => 'bottom-start',
    getOffset: () => 8,
    outsidePointerDismiss: true,
    escapeDismiss: true,
    scrollStrategy: 'ignore',
    onDismissRequest: (reason, event) => {
      if (!root.isConnected || signal.aborted || !root.open) return;
      root.open = false;
      if (reason === 'escape') {
        event.preventDefault();
        summary.focus();
      }
    },
  });
  let notified = false;
  const sync = (): void => {
    if (signal.aborted) return;
    if (surface === 'popover') overlay.syncOpenState(root.open);
    else if (root.open) overlay.activate();
    else overlay.deactivate();
    if (notified === root.open) return;
    notified = root.open;
    root.dispatchEvent(
      new CustomEvent('translation-toggle', {
        detail: { open: root.open, surface },
        bubbles: true,
        composed: true,
      }),
    );
  };
  root.addEventListener('toggle', sync, { signal });
  root.setAttribute('data-translation-enhanced', '');
  sync();
  let disposed = false;
  const cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('toggle', sync);
    signal.removeEventListener('abort', cleanup);
    overlay.destroy();
    root.removeAttribute('data-translation-enhanced');
    roots.delete(root);
    orchestrator.release();
  };
  signal.addEventListener('abort', cleanup, { once: true });
  return { status: 'activated', cleanup };
};
