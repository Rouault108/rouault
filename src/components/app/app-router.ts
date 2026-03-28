import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { PrimaryTabNavigationPolicy } from '../../lib/tabs/primary-tab-navigation-policy.js';
import {
  RouterNotStartedError,
  type NavigationResult,
  type ShellAdapter,
} from '../../lib/router.js';
import { RouterController } from '../../lib/controllers/router-controller.js';
import {
  type RouterContentHtml,
  unwrapRouterContentHtml,
} from '../../lib/router/router-content-html.js';
import { AppRouterContentController } from './controllers/app-router-content-controller.js';
import { AppRouterPostRenderController } from './controllers/app-router-post-render-controller.js';

interface BreadcrumbShellItem {
  label: string;
  href?: string;
}

interface CorpusShellItem {
  key: string;
  label: string;
  href: string;
}

const parseBreadcrumbs = (value: string | null): BreadcrumbShellItem[] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }

        const record = item as Record<string, unknown>;
        const label = typeof record['label'] === 'string' ? record['label'].trim() : '';
        const href = typeof record['href'] === 'string' ? record['href'].trim() : '';
        if (label.length === 0) {
          return null;
        }

        return href.length > 0 ? { label, href } : { label };
      })
      .filter((item): item is BreadcrumbShellItem => item !== null);
  } catch {
    return [];
  }
};

const parseCorpora = (value: string | null): CorpusShellItem[] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }

        const record = item as Record<string, unknown>;
        const key = typeof record['key'] === 'string' ? record['key'].trim() : '';
        const label = typeof record['label'] === 'string' ? record['label'].trim() : '';
        const href = typeof record['href'] === 'string' ? record['href'].trim() : '';
        if (key.length === 0 || label.length === 0 || href.length === 0) {
          return null;
        }

        return { key, label, href };
      })
      .filter((item): item is CorpusShellItem => item !== null);
  } catch {
    return [];
  }
};

const createLayoutHeaderShellAdapter = (): ShellAdapter => ({
  extract(documentSnapshot: Document) {
    const nextHeader = documentSnapshot.querySelector('layout-header');

    return {
      header: {
        breadcrumbs: parseBreadcrumbs(nextHeader?.getAttribute('breadcrumbs-json') ?? null),
        corpora: parseCorpora(nextHeader?.getAttribute('corpora-json') ?? null),
        currentCorpusKey: (() => {
          const currentCorpusKey = nextHeader?.getAttribute('current-corpus-key')?.trim();
          return currentCorpusKey === '' ? 'all' : currentCorpusKey ?? 'all';
        })(),
        noteLayout: nextHeader?.hasAttribute('note-layout') ?? false,
      },
    };
  },
  apply(shell) {
    const currentHeader = document.querySelector('layout-header');
    if (!(currentHeader instanceof HTMLElement)) {
      return;
    }

    const breadcrumbsJson = JSON.stringify(shell?.header.breadcrumbs ?? []);
    const corporaJson = JSON.stringify(shell?.header.corpora ?? []);
    currentHeader.setAttribute('breadcrumbs-json', breadcrumbsJson);
    currentHeader.setAttribute('corpora-json', corporaJson);
    currentHeader.setAttribute('current-corpus-key', shell?.header.currentCorpusKey ?? 'all');
    currentHeader.toggleAttribute('note-layout', shell?.header.noteLayout ?? false);
  },
});

const createNotStartedResult = (url: string): NavigationResult => ({
  outcome: 'failed',
  requestedUrl: url,
  normalizedUrl: url,
  historyMode: 'push',
  stateOnly: false,
  committed: false,
  degraded: false,
  issues: [],
  source: 'none',
  renderedKind: null,
  error: new RouterNotStartedError('app-router が未初期化です。'),
  errorReason: 'not-started',
});

export class AppRouter extends LitElement {
  static override properties = {
    _pageContent: { state: true },
    _ariaAnnouncement: { state: true },
  };

  declare private _pageContent: RouterContentHtml | null;
  declare private _ariaAnnouncement: string;

  override createRenderRoot(): this {
    return this;
  }

  private _routerController = new RouterController(this);
  private _contentController = new AppRouterContentController(this, (html) => {
    this._pageContent = html;
  });
  private _postRenderController = new AppRouterPostRenderController(this, (text) => {
    this._ariaAnnouncement = text;
  });

  constructor() {
    super();
    this._pageContent = null;
    this._ariaAnnouncement = '';
  }

  serverContent: RouterContentHtml | null = null;

  override connectedCallback(): void {
    this._contentController.captureInitialContent(this);
    super.connectedCallback();

    const router = this._routerController.initRouter(this, {
      skipInitialNavigation: true,
      contentAdapter: this._contentController.createContentAdapter(async () => {
        await this.updateComplete;
      }),
      postCommitController: this._postRenderController.createPostCommitController(this),
      shellAdapter: createLayoutHeaderShellAdapter(),
      urlStateNavigationPolicy: new PrimaryTabNavigationPolicy(),
    });

    void router.start();
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has('_pageContent')) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent('app-router:content-rendered', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  async navigate(url: string): Promise<NavigationResult> {
    const router = this._routerController.router;
    if (!router) {
      return createNotStartedResult(url);
    }

    return router.navigate({
      url,
      historyMode: 'push',
    });
  }

  override render() {
    const pageContent = this._pageContent ?? this.serverContent;

    return html`
      <div aria-live="polite" aria-atomic="true" class="sr-only">${this._ariaAnnouncement}</div>

      <main
        id="main-content"
        tabindex="-1"
        aria-busy=${this._routerController.isNavigating ? 'true' : nothing}
      >
        ${pageContent ? unsafeHTML(unwrapRouterContentHtml(pageContent)) : nothing}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-router': AppRouter;
  }
}

if (!customElements.get('app-router')) {
  customElements.define('app-router', AppRouter);
}
