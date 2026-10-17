import type { NavigationShellSnapshot } from '../../shared/navigation/navigation-shell-snapshot.js';
import { MAIN_CONTENT_SELECTOR } from '../../shared/navigation/main-landmark-contract.js';
import type { AppShellValidatedDetail } from '../components/app/shell/app-shell-events.js';
import {
  readContentTransitionShell,
  type ContentTransitionShell,
} from './content-transition-shell.js';
import {
  readContentContext,
  type NavigationIntent,
} from '../navigation/content-navigation-context.js';

interface ActiveTransition {
  transition: ViewTransition | null;
  release: () => void;
}

export class ContentTransitionCoordinator {
  private readonly lifetime = new AbortController();
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private verifiedShell: ContentTransitionShell | null = null;
  private active: ActiveTransition | null = null;
  private interruptedIntent: number | undefined;
  private disposed = false;

  constructor(private readonly outlet: HTMLElement) {
    const signal = this.lifetime.signal;
    document.addEventListener(
      'app-shell:validated',
      (event) => {
        const detail = (event as CustomEvent<AppShellValidatedDetail>).detail;
        this.verifiedShell = readContentTransitionShell(detail.shell, document);
      },
      { signal },
    );
    document.addEventListener(
      'app-shell:rollback-start',
      () => {
        // 復元通知はshell snapshotを持たない。次の検証完了までは通常commitへ縮退する。
        this.verifiedShell = null;
        this.skip();
      },
      { signal },
    );
    const intervene = (): void => {
      this.interruptedIntent = readContentContext()?.intent?.intentId;
      this.skip();
    };
    for (const name of ['wheel', 'touchmove', 'pointerdown'] as const)
      window.addEventListener(name, intervene, { capture: true, passive: true, signal });
    window.addEventListener(
      'keydown',
      (event) => {
        if (
          [
            'ArrowDown',
            'ArrowUp',
            'ArrowLeft',
            'ArrowRight',
            'PageDown',
            'PageUp',
            'Home',
            'End',
            ' ',
            'Tab',
            'Escape',
            'Enter',
          ].includes(event.key)
        )
          intervene();
      },
      { capture: true, signal },
    );
    window.addEventListener('pagehide', intervene, { signal });
    window.addEventListener('resize', intervene, { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState !== 'visible') intervene();
      },
      { signal },
    );
    this.motion.addEventListener(
      'change',
      () => {
        if (this.motion.matches) intervene();
      },
      { signal },
    );
  }

  skip(): void {
    const active = this.active;
    if (!active) return;
    // skipTransitionは更新callbackを取り消さない。最新intentの照合はrouterに残す。
    active.transition?.skipTransition();
    this.cleanup(active);
  }

  dispose(): void {
    this.disposed = true;
    this.skip();
    this.lifetime.abort();
  }

  async run<T>(
    shell: NavigationShellSnapshot,
    intent: NavigationIntent | undefined,
    eligible: boolean,
    update: () => Promise<T>,
  ): Promise<T> {
    this.skip();
    const main = this.outlet.matches(MAIN_CONTENT_SELECTOR)
      ? this.outlet
      : this.outlet.querySelector(MAIN_CONTENT_SELECTOR);
    if (
      !eligible ||
      this.disposed ||
      !intent ||
      intent.signal.aborted ||
      this.interruptedIntent === intent.intentId ||
      !main?.isConnected ||
      this.verifiedShell === null ||
      typeof document.startViewTransition !== 'function' ||
      this.motion.matches ||
      document.visibilityState !== 'visible'
    )
      return update();
    // 両端のprofileが既知なら配置差を許容する。位置・寸法の補間はCSSでも行わない。
    if (!readContentTransitionShell(shell, document)) return update();

    const updateState: { promise: Promise<T> | null } = { promise: null };
    const once = (): Promise<T> => {
      // APIの同期例外・演出失敗・遅れて呼ばれるcallbackでもtransactionは最大一度。
      updateState.promise ??= Promise.resolve().then(update);
      return updateState.promise;
    };
    const active: ActiveTransition = {
      transition: null,
      release: () => {
        /* 開始前は購読なし。 */
      },
    };
    this.active = active;
    document.documentElement.setAttribute('data-content-transition', '');
    const abort = (): void => {
      if (this.active === active) this.skip();
    };
    intent.signal.addEventListener('abort', abort, { once: true });
    active.release = () => {
      intent.signal.removeEventListener('abort', abort);
    };
    const cleanup = (): void => {
      this.cleanup(active);
    };
    let transition: ViewTransition;
    try {
      transition = document.startViewTransition(async () => {
        await once();
      });
      active.transition = transition;
    } catch {
      cleanup();
      return once();
    }
    void transition.ready.catch(() => {
      if (this.active === active) this.skip();
    });
    void transition.finished.then(cleanup, cleanup);
    try {
      await transition.updateCallbackDone;
    } catch (error) {
      // ready/finishedの失敗と更新失敗を混ぜず、更新の実結果を返す。
      cleanup();
      if (!updateState.promise) throw error;
    }
    if (!updateState.promise) throw new Error('view transition update callback was not invoked.');
    return updateState.promise;
  }

  private cleanup(active: ActiveTransition): void {
    if (this.active !== active) return;
    this.active = null;
    active.release();
    document.documentElement.removeAttribute('data-content-transition');
  }
}
