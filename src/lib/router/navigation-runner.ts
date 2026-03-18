import { ContentCommitter } from './content-committer';
import { ContentLoader } from './content-loader';
import { LocationAdapter } from './location-adapter';
import { RouterEventBus } from './router-event-bus';
import { StandaloneNavigationEffects } from './standalone-navigation-effects.js';
import { PrimaryTabNavigationPolicy } from '../tabs/primary-tab-navigation-policy.js';
import type { NavigationRequest } from './router-types';

export class NavigationRunner {
  private navigating = false;
  private navigationHistory: string[] = [];
  private isInitialLoad = true;
  private currentUrl: string;

  constructor(
    initialUrl: string,
    private events: RouterEventBus,
    private location: LocationAdapter,
    private loader: ContentLoader,
    private committer: ContentCommitter,
    private tabNavigationPolicy: PrimaryTabNavigationPolicy,
    private standaloneEffects: StandaloneNavigationEffects | null,
  ) {
    this.currentUrl = initialUrl;
  }

  start(
    skipInitialNavigation: boolean,
    enqueue: (request: NavigationRequest) => Promise<void>,
  ): void {
    if (skipInitialNavigation) {
      this.navigationHistory.push(this.currentUrl);
      this.isInitialLoad = false;
      return;
    }

    void enqueue({
      url: this.currentUrl,
      historyMode: 'none',
    });
  }

  isNavigating(): boolean {
    return this.navigating;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  getHistory(): string[] {
    return [...this.navigationHistory];
  }

  async run(request: NavigationRequest): Promise<void> {
    const normalizedUrl = this.location.normalizeUrl(request.url);

    if (!this.events.emitCancelable('before:navigate', normalizedUrl)) {
      return;
    }

    if (this.tabNavigationPolicy.matches(this.currentUrl, normalizedUrl)) {
      const previousUrl = this.currentUrl;
      await this.tabNavigationPolicy.apply(previousUrl, normalizedUrl, {
        ...request,
        url: normalizedUrl,
      });
      this.currentUrl = normalizedUrl;
      this.navigationHistory.push(normalizedUrl);
      this.isInitialLoad = false;
      this.events.emit('after:navigate', normalizedUrl);
      return;
    }

    this.navigating = true;
    this.events.emit('loading:start');

    try {
      if (request.historyMode === 'push') {
        this.location.push(normalizedUrl, request.state);
      } else if (request.historyMode === 'replace') {
        this.location.replace(normalizedUrl, request.state);
      }

      this.currentUrl = normalizedUrl;

      const startViewTransition = (
        document.startViewTransition as typeof document.startViewTransition | undefined
      )?.bind(document);

      const applyContent = async (): Promise<void> => {
        const result = await this.loader.load(normalizedUrl);
        const announcedTitle = await this.committer.commit(result);
        this.finalizeContentUpdate(normalizedUrl, announcedTitle);
      };

      if (!startViewTransition) {
        await applyContent();
        return;
      }

      const transition = startViewTransition(async () => {
        await applyContent();
      });

      await transition.finished;
    } catch (error) {
      console.error('Transition failed', error);
      this.events.emit('error', new Error('Transition failed'));
    } finally {
      this.navigating = false;
      this.events.emit('loading:end');
      this.events.emit('after:navigate', normalizedUrl);
    }
  }

  private finalizeContentUpdate(url: string, _announcedTitle: string): void {
    this.navigationHistory.push(url);

    if (!this.isInitialLoad) {
      this.events.emit('route:change', url);
    }
    this.isInitialLoad = false;

    this.events.emit('content:load', url);

    this.standaloneEffects?.afterContentCommit();
  }
}