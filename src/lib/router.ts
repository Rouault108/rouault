/**
 * View Transition API を利用した SPA ルーター
 */

import { PrimaryTabNavigationPolicy } from './tabs/primary-tab-navigation-policy.js';
import { BrowserLinkInterceptor } from './router/browser-link-interceptor.js';
import { ContentCommitter } from './router/content-committer.js';
import { ContentLoader } from './router/content-loader.js';
import { LocationAdapter } from './router/location-adapter.js';
import { NavigationQueue } from './router/navigation-queue.js';
import { NavigationRunner } from './router/navigation-runner.js';
import { ReinitializeHookRegistry } from './router/reinitialize-hook-registry.js';
import { RouteRegistry } from './router/route-registry.js';
import { RouterEventBus } from './router/router-event-bus.js';
import { RouterAnnouncer } from './router/router-announcer.js';
import { StandaloneNavigationEffects } from './router/standalone-navigation-effects.js';
import type { EventCallback, RouteHandler, RouterOptions } from './router/router-types.js';

export type { RouterOptions } from './router/router-types.js';

export class Router {
  private eventBus = new RouterEventBus();
  private reinitializeHooks = new ReinitializeHookRegistry();
  private location = new LocationAdapter();
  private routeRegistry = new RouteRegistry();
  private announcer: RouterAnnouncer;
  private standaloneEffects: StandaloneNavigationEffects | null;
  private loader: ContentLoader;
  private committer: ContentCommitter;
  private tabNavigationPolicy: PrimaryTabNavigationPolicy;
  private runner: NavigationRunner;
  private queue: NavigationQueue;
  private linkInterceptor: BrowserLinkInterceptor;
  private isDestroyed = false;

  constructor(
    outlet: HTMLElement,
    private options: RouterOptions = {},
  ) {
    this.announcer = new RouterAnnouncer(!options.skipAriaLiveRegion);
    this.standaloneEffects = options.onContentUpdate
      ? null
      : new StandaloneNavigationEffects(outlet, this.reinitializeHooks, this.announcer);
    this.loader = new ContentLoader(this.routeRegistry, this.location);
    this.committer = new ContentCommitter(outlet, options.onContentUpdate);
    this.tabNavigationPolicy = new PrimaryTabNavigationPolicy(this.location);
    this.runner = new NavigationRunner(
      this.location.readCurrentUrl(),
      this.eventBus,
      this.location,
      this.loader,
      this.committer,
      this.tabNavigationPolicy,
      this.standaloneEffects,
    );
    this.queue = new NavigationQueue(async (request) =>
      this.runner.run({
        ...request,
        url: this.location.normalizeUrl(request.url),
      }),
    );
    this.linkInterceptor = new BrowserLinkInterceptor(
      this.location,
      () => this.runner.getCurrentUrl(),
      async (request) => this.requestNavigation(request),
    );

    this.init();
  }

  setTimeout(ms: number): void {
    this.loader.setTimeout(ms);
  }

  private init(): void {
    this.linkInterceptor.attach();
    this.announcer.attach();
    this.runner.start(!!this.options.skipInitialNavigation, async (request) =>
      this.requestNavigation(request),
    );
  }

  destroy(): void {
    this.isDestroyed = true;
    this.linkInterceptor.detach();
    this.eventBus.clear();
    this.reinitializeHooks.clear();
    this.queue.dispose();
    this.announcer.destroy();
  }

  on(event: string, callback: EventCallback): void {
    this.eventBus.on(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.eventBus.off(event, callback);
  }

  isNavigating(): boolean {
    return this.runner.isNavigating();
  }

  async navigate(path: string, state: Record<string, unknown> = {}): Promise<void> {
    await this.requestNavigation({
      url: path,
      historyMode: 'push',
      state,
    });
  }

  addReinitializeHook(hook: () => void): void {
    this.reinitializeHooks.add(hook);
  }

  removeReinitializeHook(hook: () => void): void {
    this.reinitializeHooks.remove(hook);
  }

  runReinitializeHooks(): void {
    this.reinitializeHooks.run();
  }

  addRoute(pattern: string | RegExp, handler: RouteHandler): void {
    this.routeRegistry.add(pattern, handler);
  }

  getParams(): Record<string, string> {
    const path = new URL(this.getCurrentUrl(), window.location.origin).pathname;
    const params: Record<string, string> = {};
    const segments = path.split('/').filter(Boolean);

    if (segments.length >= 2 && segments[0] === 'posts') {
      if (segments.length === 2 && segments[1]) {
        params['id'] = segments[1];
      } else if (segments.length === 3 && segments[1] && segments[2]) {
        params['category'] = segments[1];
        params['id'] = segments[2];
      }
    }

    return params;
  }

  getQuery(): Record<string, string> {
    return this.location.getQuery(this.getCurrentUrl());
  }

  getCurrentPath(): string {
    return this.location.getPath(this.getCurrentUrl());
  }

  getHistory(): string[] {
    return this.runner.getHistory();
  }

  private getCurrentUrl(): string {
    return this.runner.getCurrentUrl();
  }

  private requestNavigation(request: {
    url: string;
    historyMode: 'none' | 'push' | 'replace';
    state?: Record<string, unknown>;
  }): Promise<void> {
    const normalizedRequest = {
      ...request,
      url: this.location.normalizeUrl(request.url),
    };

    if (this.isDestroyed) {
      return Promise.resolve();
    }

    return this.queue.enqueue(normalizedRequest);
  }
}