import { FocusManager } from '../../../router/focus-manager.js';
import type { PostCommitController } from '../../../router/router.js';
import { MAIN_CONTENT_SELECTOR } from '../../../../shared/navigation/main-landmark-contract.js';
import {
  dispatchPrimaryTabUrlStateChange,
  readDecodedHash,
} from '../navigation/primary-tab-url-state.js';

export class AppRouterPostRenderController {
  private readonly focusManager = new FocusManager();
  private clearTimer: number | null = null;
  private currentHashTarget: HTMLElement | null = null;

  constructor(private readonly setAnnouncement: (text: string) => void) {}

  dispose(): void {
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    this.clearHashTarget();
  }

  createPostCommitController(hostElement: HTMLElement): PostCommitController {
    return {
      run: async (context) => {
        if (context.stateOnly) {
          dispatchPrimaryTabUrlStateChange(context.previousUrl, context.url);

          await this.scrollToHash(context.url);
          return;
        }

        this.setAnnouncement('ページが読み込まれました');
        if (this.clearTimer !== null) {
          window.clearTimeout(this.clearTimer);
        }
        this.clearTimer = window.setTimeout(() => {
          this.setAnnouncement('');
          this.clearTimer = null;
        }, 1000);

        const didScrollToHash = await this.scrollToHash(context.url);
        if (!didScrollToHash) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }

        const main = hostElement.querySelector(MAIN_CONTENT_SELECTOR);
        if (main instanceof HTMLElement) {
          this.focusManager.focusMainContent(main);
        }
      },
    };
  }

  restoreInitialScrollImmediately(url: string): boolean {
    const didScroll = this.scrollToHashImmediately(url);
    if (didScroll) {
      return true;
    }

    this.scrollToTopImmediately(url);
    return false;
  }

  async restoreInitialScroll(): Promise<void> {
    const waitForLoad = async (): Promise<void> => {
      if (document.readyState === 'complete') {
        return;
      }

      await new Promise<void>((resolve) => {
        window.addEventListener(
          'load',
          () => {
            resolve();
          },
          { once: true },
        );
      });
    };

    await waitForLoad();

    const didScroll = await this.scrollToHash(window.location.href);
    if (didScroll) {
      return;
    }

    const hash = readDecodedHash(window.location.href);
    if (hash.length === 0) {
      await this.waitForStableLayout();
      this.scrollToTopIfNeeded();
      return;
    }

    const target = document.getElementById(hash);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    await this.waitForStableLayout();
    this.setHashTarget(target);

    const absoluteTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: absoluteTop, left: 0, behavior: 'instant' });
  }

  private async scrollToHash(url: string): Promise<boolean> {
    const hash = readDecodedHash(url);
    if (hash.length === 0) {
      this.clearHashTarget();
      return false;
    }

    await this.waitForStableLayout();

    const target = document.getElementById(hash);
    if (!(target instanceof HTMLElement)) {
      this.clearHashTarget();
      return false;
    }

    this.setHashTarget(target);
    target.scrollIntoView({ block: 'start', inline: 'nearest' });
    return true;
  }

  private scrollToTopImmediately(url: string): void {
    const hash = readDecodedHash(url);
    if (hash.length > 0) {
      return;
    }

    this.scrollToTopIfNeeded();
  }

  private async waitForStableLayout(): Promise<void> {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  private scrollToHashImmediately(url: string): boolean {
    const hash = readDecodedHash(url);
    if (hash.length === 0) {
      this.clearHashTarget();
      return false;
    }

    const target = document.getElementById(hash);
    if (!(target instanceof HTMLElement)) {
      this.clearHashTarget();
      return false;
    }

    this.setHashTarget(target);
    /*
     * 初回 boot では TOC current 同期が先に進みやすいため、
     * 最低限の hash 到達だけは同期的に済ませて viewport 契約を先に成立させる。
     * その後の restoreInitialScroll() が load 後の再整列を担当する。
     */
    target.scrollIntoView({ block: 'start', inline: 'nearest' });
    return true;
  }

  private scrollToTopIfNeeded(): void {
    /*
     * 初期 SSR 文書ではブラウザ自身が先頭位置を保持していることがある。
     * その状態で同じ先頭座標へ再度 scrollTo すると、hash 遷移テストや履歴復元の観測を汚すため抑止する。
     */
    if (window.scrollX === 0 && window.scrollY === 0) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  private clearHashTarget(): void {
    if (this.currentHashTarget === null) {
      return;
    }
    this.currentHashTarget.removeAttribute('data-router-hash-target');
    this.currentHashTarget = null;
  }

  private setHashTarget(target: HTMLElement): void {
    if (this.currentHashTarget === target) {
      target.setAttribute('data-router-hash-target', 'true');
      return;
    }

    this.clearHashTarget();
    target.setAttribute('data-router-hash-target', 'true');
    this.currentHashTarget = target;
  }
}
