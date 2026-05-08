import {
  addHydrationIssue,
  createHydrationDiagnostics,
  finalizeHydrationDiagnostics,
  type MutableHydrationDiagnostics,
} from './diagnostics.js';
import { HYDRATION_REGISTRY_BY_TAG } from './registry.js';
import { planHydration } from './planner.js';
import { normalizeHydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';
import type {
  HydrationDiagnostics,
  HydrationPlanItem,
  HydrationRegistryEntry,
  HydrationScopePlan,
  HydrationSessionKind,
  HydrationTrigger,
} from './types.js';

interface HydrationSession {
  readonly id: number;
  readonly root: ParentNode;
  readonly controller: AbortController;
  readonly kind: HydrationSessionKind;
}

interface HydrationSchedulerOptions {
  readonly dispatchTarget?: EventTarget | null;
}

interface PreparedSession {
  readonly diagnostics: MutableHydrationDiagnostics;
  readonly processed: WeakSet<HTMLElement>;
  readonly visibleItems: readonly HydrationPlanItem[];
  readonly interactionItems: readonly HydrationPlanItem[];
}

const matchPlanItems = (
  plans: readonly HydrationScopePlan[],
  trigger: HydrationTrigger,
): HydrationPlanItem[] =>
  plans.flatMap((scope) => scope.items.filter((item) => item.trigger === trigger));

const isKeyboardActivation = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' || event.key === ' ';

const isEventInsideElement = (event: Event, element: HTMLElement): boolean => {
  const path = event.composedPath();
  return path.some((item) => item instanceof Node && element.contains(item));
};

const delayTask = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
};

export class HydrationScheduler {
  private loadedTags = new Map<string, Promise<void>>();
  private activeContentSession: HydrationSession | null = null;
  private nextSessionId = 0;

  constructor(
    private registry: ReadonlyMap<string, HydrationRegistryEntry> = HYDRATION_REGISTRY_BY_TAG,
  ) {}

  async hydrateShell(root: ParentNode): Promise<HydrationDiagnostics> {
    const session = {
      id: 0,
      root,
      controller: new AbortController(),
      kind: 'shell',
    } satisfies HydrationSession;

    const prepared = await this.#prepareSession(session);

    await Promise.all([
      this.#waitForVisible(
        prepared.visibleItems,
        session,
        prepared.diagnostics,
        prepared.processed,
      ),
      this.#waitForInteraction(
        prepared.interactionItems,
        session,
        prepared.diagnostics,
        prepared.processed,
      ),
    ]);

    return finalizeHydrationDiagnostics(prepared.diagnostics);
  }

  async hydrateContent(root: ParentNode, options: HydrationSchedulerOptions = {}): Promise<void> {
    this.activeContentSession?.controller.abort();

    const session = {
      id: ++this.nextSessionId,
      root,
      controller: new AbortController(),
      kind: 'content',
    } satisfies HydrationSession;
    this.activeContentSession = session;

    const prepared = await this.#prepareSession(session);
    const activeContentSession = this.activeContentSession;

    if (activeContentSession.id !== session.id || session.controller.signal.aborted) {
      return;
    }

    void Promise.all([
      this.#waitForVisible(
        prepared.visibleItems,
        session,
        prepared.diagnostics,
        prepared.processed,
      ),
      this.#waitForInteraction(
        prepared.interactionItems,
        session,
        prepared.diagnostics,
        prepared.processed,
      ),
    ]).then(() => {
      const currentSession = this.activeContentSession;
      if (currentSession?.id !== session.id || session.controller.signal.aborted) {
        return;
      }

      this.#dispatchDiagnostics(
        finalizeHydrationDiagnostics(prepared.diagnostics),
        options.dispatchTarget ?? null,
      );
    });
  }

  #dispatchDiagnostics(
    diagnostics: HydrationDiagnostics,
    dispatchTarget: EventTarget | null,
  ): void {
    if (dispatchTarget instanceof EventTarget) {
      dispatchTarget.dispatchEvent(
        new CustomEvent<HydrationDiagnostics>('app-router:hydration-diagnostics', {
          detail: diagnostics,
          bubbles: true,
          composed: true,
        }),
      );
    }

    if (!diagnostics.degraded || typeof window === 'undefined') {
      return;
    }

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.warn('[hydration] 縮退状態です', diagnostics);
    }
  }

  async #prepareSession(session: HydrationSession): Promise<PreparedSession> {
    const diagnostics = createHydrationDiagnostics();
    const processed = new WeakSet<HTMLElement>();

    const firstPass = this.#plan(session.root);
    diagnostics.plannedCount += firstPass.reduce((sum, scope) => sum + scope.items.length, 0);

    this.#preloadPlannedEntries(firstPass, session);

    await this.#executePhase(matchPlanItems(firstPass, 'initial'), session, diagnostics, processed);

    if (session.controller.signal.aborted) {
      return {
        diagnostics,
        processed,
        visibleItems: [],
        interactionItems: [],
      };
    }

    await delayTask();

    await this.#executePhase(
      matchPlanItems(firstPass, 'post-commit'),
      session,
      diagnostics,
      processed,
    );

    const secondPass = this.#plan(session.root);
    const firstPassElements = new Set(
      firstPass.flatMap((scope) => scope.items.map((item) => item.element)),
    );
    const secondPassItems = secondPass
      .flatMap((scope) => scope.items)
      .filter((item) => !processed.has(item.element) && !firstPassElements.has(item.element));

    diagnostics.plannedCount += secondPassItems.length;

    const secondPassItemSet = new Set(secondPassItems);
    const secondPassPreloadPlan = secondPass
      .map((scope) => ({
        scope: scope.scope,
        items: scope.items.filter((item) => secondPassItemSet.has(item)),
      }))
      .filter((scope) => scope.items.length > 0);

    this.#preloadPlannedEntries(secondPassPreloadPlan, session);

    return {
      diagnostics,
      processed,
      visibleItems: [
        ...matchPlanItems(firstPass, 'visible'),
        ...secondPassItems.filter((item) => item.trigger === 'visible'),
      ],
      interactionItems: [
        ...matchPlanItems(firstPass, 'interaction'),
        ...secondPassItems.filter((item) => item.trigger === 'interaction'),
      ],
    };
  }

  #plan(root: ParentNode): HydrationScopePlan[] {
    return planHydration(root);
  }

  #preloadPlannedEntries(
    plans: readonly HydrationScopePlan[],
    session: HydrationSession,
  ): void {
    const seenTags = new Set<string>();

    for (const item of plans.flatMap((scope) => scope.items)) {
      if (seenTags.has(item.tag)) {
        continue;
      }
      seenTags.add(item.tag);

      const entry = this.registry.get(item.tag);
      if (!entry || entry.preload?.when !== 'planned') {
        continue;
      }

      const preloadScopes = entry.preload.scopes;
      if (preloadScopes && !preloadScopes.includes(session.kind)) {
        continue;
      }

      void this.#loadEntry(entry).catch(() => {
        // 通常 hydration 側で再試行し、その時点の診断へ記録する。
      });
    }
  }

  async #executePhase(
    items: readonly HydrationPlanItem[],
    session: HydrationSession,
    diagnostics: MutableHydrationDiagnostics,
    processed: WeakSet<HTMLElement>,
  ): Promise<void> {
    for (const item of items) {
      await this.#executeItem(item, session, diagnostics, processed);
      if (session.controller.signal.aborted) {
        return;
      }
    }
  }

  async #executeItem(
    item: HydrationPlanItem,
    session: HydrationSession,
    diagnostics: MutableHydrationDiagnostics,
    processed: WeakSet<HTMLElement>,
  ): Promise<void> {
    if (processed.has(item.element)) {
      diagnostics.skippedCount += 1;
      return;
    }

    if (!item.element.isConnected) {
      diagnostics.skippedCount += 1;
      return;
    }

    const entry = this.registry.get(item.tag);
    if (!entry) {
      diagnostics.skippedCount += 1;
      addHydrationIssue(diagnostics, {
        code: 'missing-directive',
        capability: item.capability,
        trigger: item.trigger,
      });
      processed.add(item.element);
      return;
    }

    try {
      await this.#loadEntry(entry);
      diagnostics.loadedCount += 1;
    } catch {
      diagnostics.failedCount += 1;
      addHydrationIssue(diagnostics, {
        code: 'module-load-failed',
        capability: item.capability,
        trigger: item.trigger,
      });
      processed.add(item.element);
      return;
    }

    if (entry.kind !== 'enhancer') {
      try {
        await customElements.whenDefined(item.tag);
        customElements.upgrade(item.element);
        diagnostics.upgradedCount += 1;
      } catch {
        diagnostics.failedCount += 1;
        addHydrationIssue(diagnostics, {
          code: 'upgrade-failed',
          capability: item.capability,
          trigger: item.trigger,
        });
        processed.add(item.element);
        return;
      }
    }

    try {
      if (entry.activate) {
        const result = normalizeHydrationActivationResult(await entry.activate({
          element: item.element,
          root: session.root,
          signal: session.controller.signal,
          sessionId: String(session.id),
        }));
        if (result.status === 'activated') {
          diagnostics.activatedCount += 1;
        } else if (result.status === 'skipped') {
          diagnostics.skippedCount += 1;
        } else if (result.status === 'aborted') {
          diagnostics.skippedCount += 1;
        } else {
          diagnostics.skippedCount += 1;
        }
      }

      this.#cleanupBootMarker(entry, item.element);
    } catch {
      diagnostics.failedCount += 1;
      addHydrationIssue(diagnostics, {
        code: 'activation-failed',
        capability: item.capability,
        trigger: item.trigger,
      });
    }

    processed.add(item.element);
  }

  async #loadEntry(entry: HydrationRegistryEntry): Promise<void> {
    const existing = this.loadedTags.get(entry.tag);
    if (existing) {
      await existing;
      return;
    }

    const pending = Promise.resolve()
      .then(() => entry.loader())
      .then(() => undefined);
    this.loadedTags.set(entry.tag, pending);

    try {
      await pending;
    } catch (error) {
      this.loadedTags.delete(entry.tag);
      throw error;
    }
  }

  #cleanupBootMarker(entry: HydrationRegistryEntry, element: HTMLElement): void {
    const marker = entry.bootMarker;
    if (marker?.remove !== 'after-activation') {
      return;
    }

    const current = element.getAttribute(marker.attribute);
    if (current === null) {
      return;
    }

    if (marker.value !== undefined && current !== marker.value) {
      return;
    }

    element.removeAttribute(marker.attribute);
  }

  async #waitForVisible(
    items: readonly HydrationPlanItem[],
    session: HydrationSession,
    diagnostics: MutableHydrationDiagnostics,
    processed: WeakSet<HTMLElement>,
  ): Promise<void> {
    const pending = items.filter((item) => !processed.has(item.element));
    if (pending.length === 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      let remaining = pending.length;
      const root = session.root instanceof Document ? document : session.root;
      const observer =
        typeof IntersectionObserver === 'function'
          ? new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (!entry.isIntersecting) {
                    continue;
                  }

                  const element = entry.target;
                  if (!(element instanceof HTMLElement)) {
                    continue;
                  }

                  const item = pending.find((candidate) => candidate.element === element);
                  if (!item) {
                    continue;
                  }

                  observer?.unobserve(element);
                  void this.#executeItem(item, session, diagnostics, processed).finally(() => {
                    remaining -= 1;
                    if (remaining <= 0) {
                      cleanup();
                    }
                  });
                }
              },
              { rootMargin: '240px 0px' },
            )
          : null;

      const onFocusIn = (event: Event): void => {
        for (const item of pending) {
          if (processed.has(item.element)) {
            continue;
          }
          if (!isEventInsideElement(event, item.element)) {
            continue;
          }

          observer?.unobserve(item.element);
          void this.#executeItem(item, session, diagnostics, processed).finally(() => {
            remaining -= 1;
            if (remaining <= 0) {
              cleanup();
            }
          });
        }
      };

      const cleanup = (): void => {
        observer?.disconnect();
        root.removeEventListener('focusin', onFocusIn, true);
        session.controller.signal.removeEventListener('abort', onAbort);
        resolve();
      };

      const onAbort = (): void => {
        cleanup();
      };

      root.addEventListener('focusin', onFocusIn, true);
      session.controller.signal.addEventListener('abort', onAbort, { once: true });

      if (observer) {
        for (const item of pending) {
          observer.observe(item.element);
        }
      } else {
        void Promise.all(
          pending.map(async (item) => {
            await this.#executeItem(item, session, diagnostics, processed);
          }),
        ).finally(() => {
          cleanup();
        });
      }
    });
  }

  async #waitForInteraction(
    items: readonly HydrationPlanItem[],
    session: HydrationSession,
    diagnostics: MutableHydrationDiagnostics,
    processed: WeakSet<HTMLElement>,
  ): Promise<void> {
    const pending = items.filter((item) => !processed.has(item.element));
    if (pending.length === 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      let remaining = pending.length;
      const root = session.root instanceof Document ? document : session.root;

      const tryHydrate = (event: Event): void => {
        for (const item of pending) {
          if (processed.has(item.element)) {
            continue;
          }
          if (!isEventInsideElement(event, item.element)) {
            continue;
          }

          void this.#executeItem(item, session, diagnostics, processed).finally(() => {
            remaining -= 1;
            if (remaining <= 0) {
              cleanup();
            }
          });
        }
      };

      const onClick = (event: Event): void => {
        tryHydrate(event);
      };

      const onKeyDown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent) || !isKeyboardActivation(event)) {
          return;
        }
        tryHydrate(event);
      };

      const cleanup = (): void => {
        root.removeEventListener('click', onClick, true);
        root.removeEventListener('keydown', onKeyDown, true);
        session.controller.signal.removeEventListener('abort', onAbort);
        resolve();
      };

      const onAbort = (): void => {
        cleanup();
      };

      root.addEventListener('click', onClick, true);
      root.addEventListener('keydown', onKeyDown, true);
      session.controller.signal.addEventListener('abort', onAbort, { once: true });
    });
  }
}
