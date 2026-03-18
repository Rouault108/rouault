export interface NavigationRequest {
  url: string;
  historyMode: 'none' | 'push' | 'replace';
  state?: Record<string, unknown>;
}

interface NavigationContext {
  currentUrl: string;
  nextUrl: string;
  historyMode: 'none' | 'push' | 'replace';
  state?: Record<string, unknown>;
}

interface RouterCoreDeps {
  events: RouterEventBus;
  queue: NavigationQueue;
  location: LocationAdapter;
  contentLoader: ContentLoader;
  contentCommitter: ContentCommitter;
  navigationPolicies: NavigationPolicy[];
  afterCommitEffects: AfterCommitEffect[];
}

class RouterCore {
  navigate(path: string, state?: Record<string, unknown>): Promise<void>;
  handlePopstate(): Promise<void>;
  getCurrentUrl(): string;
  isNavigating(): boolean;
}