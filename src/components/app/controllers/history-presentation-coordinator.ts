import { MAIN_CONTENT_SELECTOR } from '../../../../shared/navigation/main-landmark-contract.js';
import {
  isNavigationIntentCurrent,
  readContentContext,
  subscribeContentContext,
  type NavigationIntent,
} from '../../../navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../../../navigation/history-entry.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';

export interface HistoryPresentationOwner {
  readonly root: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly contentEpoch: number;
  readonly shellCommitId: number;
  readonly intent: NavigationIntent;
  readonly entryId: string;
  readonly url: string;
}

interface PresentationSession {
  readonly owner: HistoryPresentationOwner;
  readonly animation: Animation;
  readonly release: () => void;
}

export class HistoryPresentationCoordinator {
  private readonly lifetime = new AbortController();
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly unsubscribe: () => void;
  private active: PresentationSession | null = null;
  private disposed = false;

  constructor() {
    const signal = this.lifetime.signal;
    const cancel = (): void => {
      this.cancel('interrupted');
    };
    this.unsubscribe = subscribeContentContext((reason) => {
      if (
        reason === 'intent' ||
        reason === 'feature' ||
        reason === 'before-mutation' ||
        reason === 'mutation' ||
        reason === 'recovery'
      )
        cancel();
      else if (this.active && !this.owns(this.active.owner)) cancel();
    });
    for (const name of [
      'popstate',
      'pagehide',
      'resize',
      'wheel',
      'touchstart',
      'touchmove',
      'pointerdown',
      'keydown',
      'input',
    ] as const)
      window.addEventListener(name, cancel, { capture: true, passive: true, signal });
    window.addEventListener(
      'pageshow',
      (event) => {
        if (event.persisted) cancel();
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState !== 'visible') cancel();
      },
      { signal },
    );
    this.motion.addEventListener(
      'change',
      () => {
        if (this.motion.matches) cancel();
      },
      { signal },
    );
    document.fonts.addEventListener(
      'loading',
      () => {
        // loading通知は完了後に遅配されることがある。現在の読込状態で判定する。
        if (document.fonts.status === 'loading') cancel();
      },
      { signal },
    );
    for (const name of ['app-shell:rollback-start', 'app-shell:restored'] as const)
      document.addEventListener(name, cancel, { signal });
    document.addEventListener(
      'app-shell:validated',
      () => {
        if (this.active && !this.owns(this.active.owner)) cancel();
      },
      { signal },
    );
  }

  start(owner: HistoryPresentationOwner): boolean {
    // 遅れて届いた旧jobの開始要求では、現在の表示sessionを取り消さない。
    if (!this.canStart(owner)) return false;
    const fixedOwner = Object.freeze({ ...owner });
    this.cancel('replaced');
    if (!this.canStart(fixedOwner)) return false;

    let animation: Animation | null = null;
    let release = (): void => {
      /* 作成前には解放対象がない。 */
    };
    try {
      const geometry = this.geometry(fixedOwner);
      animation = fixedOwner.root.animate([{ opacity: 0.82 }, { opacity: 1 }], {
        id: 'rouault-history-content',
        duration: 180,
        easing: 'ease-out',
        fill: 'none',
      });
      const ownedAnimation = animation;
      const checkGeometry = (): void => {
        if (this.active?.animation !== ownedAnimation) return;
        try {
          const measured = this.geometry(fixedOwner);
          if (
            !this.canStart(fixedOwner) ||
            measured.some((value, index) => Math.abs(value - (geometry[index] ?? Infinity)) > 0.1)
          )
            this.cancel('geometry-invalidated');
        } catch {
          // 測定できない場合も演出だけを終了し、位置jobの通常補正へ戻す。
          this.cancel('geometry-unavailable');
        }
      };
      // 初回通知は必ず届くため、通知の有無でなく開始時の実幾何との差で取り消す。
      const resizeObserver = new ResizeObserver(checkGeometry);
      const observer = new MutationObserver((records) => {
        // 同task内の再接続でも、取り外されたroot/anchorの旧寿命は引き継がない。
        const detached = records.some((record) =>
          [...record.removedNodes].some(
            (node) =>
              node === fixedOwner.root ||
              node.contains(fixedOwner.root) ||
              (fixedOwner.anchor !== undefined &&
                (node === fixedOwner.anchor || node.contains(fixedOwner.anchor))),
          ),
        );
        if (this.active?.animation !== ownedAnimation) return;
        if (detached || !this.owns(fixedOwner)) this.cancel('root-invalidated');
        else checkGeometry();
      });
      const abort = (): void => {
        if (this.active?.animation === ownedAnimation) this.cancel('intent-aborted');
      };
      release = () => {
        try {
          observer.disconnect();
        } finally {
          try {
            resizeObserver.disconnect();
          } finally {
            fixedOwner.intent.signal.removeEventListener('abort', abort);
          }
        }
      };
      fixedOwner.intent.signal.addEventListener('abort', abort, { once: true });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      resizeObserver.observe(fixedOwner.root, { box: 'border-box' });
      if (fixedOwner.anchor && fixedOwner.anchor !== fixedOwner.root)
        resizeObserver.observe(fixedOwner.anchor, { box: 'border-box' });
      const session: PresentationSession = { owner: fixedOwner, animation, release };
      this.active = session;
      // finishedは表示sessionの解放だけに使い、位置jobやnavigationの成功へ接続しない。
      void animation.finished.then(
        () => {
          this.finish(session);
        },
        () => {
          this.finish(session);
        },
      );
      if (!this.canStart(fixedOwner)) {
        this.cancel('owner-invalidated');
        return false;
      }
      return true;
    } catch {
      // 表示APIの失敗を、受理済みcommitや位置復元の失敗へ波及させない。
      if (this.active?.animation === animation) this.active = null;
      try {
        release();
      } catch {
        /* 購読の解放失敗でも生成済み効果の取消を続ける。 */
      }
      try {
        animation?.cancel();
      } catch {
        /* 解放失敗も表示層へ局所化する。 */
      }
      return false;
    }
  }

  cancel(_reason: string): void {
    const session = this.active;
    if (!session) return;
    this.active = null;
    try {
      session.release();
    } catch {
      /* observer等の解放失敗を、位置補正や残る効果の取消へ伝播させない。 */
    }
    // inline styleを書き換えず、自分のWAAPI効果だけを解除して通常表示へ戻す。
    try {
      session.animation.cancel();
    } catch {
      /* 表示の解放失敗を位置writerへ漏らさない。 */
    }
  }

  cancelForGeometry(root: HTMLElement, contentEpoch: number, shellCommitId: number): boolean {
    const owner = this.active?.owner;
    if (
      owner?.root !== root ||
      owner.contentEpoch !== contentEpoch ||
      owner.shellCommitId !== shellCommitId ||
      !this.owns(owner)
    )
      return false;
    // 位置jobのsettled後にもAnimationは残り得る。同じ表示ownerだけを書込み前に止める。
    this.cancel('table-geometry-change');
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel('disposed');
    this.unsubscribe();
    this.lifetime.abort();
  }

  private finish(session: PresentationSession): void {
    // 旧finishedの遅延resolve/rejectでは、新token・新Animationに触れない。
    if (this.active !== session) return;
    this.cancel('finished');
  }

  private canStart(owner: HistoryPresentationOwner): boolean {
    return (
      !this.disposed &&
      owner.intent.cause === 'traverse' &&
      !this.motion.matches &&
      document.visibilityState === 'visible' &&
      typeof owner.root.animate === 'function' &&
      this.visible(owner.root) &&
      this.owns(owner)
    );
  }

  private visible(root: HTMLElement): boolean {
    const style = getComputedStyle(root);
    const rect = root.getBoundingClientRect();
    return (
      root.closest('[hidden], [inert]') === null &&
      root.getClientRects().length > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility === 'visible' &&
      style.contentVisibility !== 'hidden'
    );
  }

  private geometry(owner: HistoryPresentationOwner): readonly number[] {
    const { root, anchor } = owner;
    const rect = root.getBoundingClientRect();
    const anchorRect = anchor?.getBoundingClientRect();
    return [
      rect.left + window.scrollX,
      rect.top + window.scrollY,
      rect.width,
      rect.height,
      root.scrollWidth,
      root.scrollHeight,
      ...(anchorRect
        ? [
            anchorRect.left + window.scrollX,
            anchorRect.top + window.scrollY,
            anchorRect.width,
            anchorRect.height,
          ]
        : []),
    ];
  }

  private owns(owner: HistoryPresentationOwner): boolean {
    const context = readContentContext();
    return (
      owner.root.isConnected &&
      (owner.anchor === undefined ||
        (owner.anchor.isConnected && owner.root.contains(owner.anchor))) &&
      owner.root.matches(MAIN_CONTENT_SELECTOR) &&
      context?.root === owner.root &&
      context.recoveryRequired !== true &&
      context.contentEpoch === owner.contentEpoch &&
      !context.mutation &&
      context.intent?.intentId === owner.intent.intentId &&
      isNavigationIntentCurrent(owner.intent) &&
      owner.intent.target.entryId === owner.entryId &&
      owner.intent.target.url === owner.url &&
      context.displayedBinding.entryId === owner.entryId &&
      context.displayedBinding.url === owner.url &&
      context.addressBinding.entryId === owner.entryId &&
      context.addressBinding.url === owner.url &&
      readHistoryEntry()?.id === owner.entryId &&
      readAddress() === owner.url &&
      readCurrentShellCommitId() === owner.shellCommitId
    );
  }
}
