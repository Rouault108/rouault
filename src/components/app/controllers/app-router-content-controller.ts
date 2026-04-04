import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ContentUpdateAdapter } from '../../../router/router.js';
import {
  createRouterContentHtml,
  type RouterContentHtml,
} from '../../../router/router-content-html.js';

export class AppRouterContentController implements ReactiveController {
  private didInitializeFromSsr = false;
  private currentContent: RouterContentHtml = createRouterContentHtml('');

  constructor(
    host: ReactiveControllerHost,
    private setPageContent: (html: RouterContentHtml) => void,
    private enableClientRender: () => void,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    // no-op
  }

  captureInitialContent(hostElement: HTMLElement): void {
    if (this.didInitializeFromSsr) {
      return;
    }

    const existingMain = hostElement.querySelector('main');
    this.currentContent = createRouterContentHtml(existingMain?.innerHTML ?? '');
    // 初回接続時は SSR 済み DOM をそのまま維持する。ここで reactive update を流すと、
    // AppRouter 側の client render 解禁前に更新が握り潰され、その後の SPA 遷移で
    // host だけ空にして main-content を再描画できない状態に落ちる。
    // 初期 HTML は serverContent / 既存 DOM を唯一の正本として扱い、
    // クライアント描画は最初の commit / rollback から開始する。
    // 初回 SSR の declarative shadow DOM を失うと、content hydration 前に
    // search-page / article-header / toc などの静的成立条件が崩れる。
    // Lit hydrate support に既存 DOM を引き継がせるため、ここでは破棄しない。
    this.didInitializeFromSsr = true;
  }

  createContentAdapter(waitForUpdate: () => Promise<unknown>): ContentUpdateAdapter {
    return {
      prepare: ({ html }) => {
        const previousContent = this.currentContent;
        const nextContent = createRouterContentHtml(html);

        return {
          commit: async () => {
            this.enableClientRender();
            this.currentContent = nextContent;
            this.setPageContent(nextContent);
            await waitForUpdate();
          },
          rollback: async () => {
            this.enableClientRender();
            this.currentContent = previousContent;
            this.setPageContent(previousContent);
            await waitForUpdate();
          },
        };
      },
    };
  }
}