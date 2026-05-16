import type { HistoryMode, NavigationResult } from './router-types.js';
import type { InternalDocumentNormalizedUrl } from './internal-document-normalized-url.js';
import type { RouterDiagnosticPayload } from './router-diagnostics.js';

export interface QueuedNavigationRequest {
  requestedUrl: string;
  normalizedUrl: InternalDocumentNormalizedUrl;
  historyMode: HistoryMode;
  state: Record<string, unknown> | undefined;
}

interface PendingNavigation {
  request: QueuedNavigationRequest;
  resolve: (result: NavigationResult) => void;
}

interface ActiveNavigation {
  controller: AbortController;
  superseded: boolean;
}

export class NavigationQueue {
  private activeNavigation: ActiveNavigation | null = null;
  private pendingNavigation: PendingNavigation | null = null;
  private isDisposed = false;

  constructor(
    private runNavigation: (
      request: QueuedNavigationRequest,
      signal: AbortSignal,
    ) => Promise<NavigationResult>,
    private createSupersededResult: (request: QueuedNavigationRequest) => NavigationResult,
    private reportDiagnostic?: (diagnostic: RouterDiagnosticPayload) => void,
  ) {}

  enqueue(request: QueuedNavigationRequest): Promise<NavigationResult> {
    return new Promise<NavigationResult>((resolve) => {
      if (this.isDisposed) {
        resolve(this.createSupersededResult(request));
        return;
      }

      if (this.activeNavigation) {
        this.activeNavigation.superseded = true;
        this.activeNavigation.controller.abort();
        this.reportDiagnostic?.({
          reason: 'route-state-mismatch',
          routeId: request.normalizedUrl,
        });

        if (this.pendingNavigation) {
          this.pendingNavigation.resolve(
            this.createSupersededResult(this.pendingNavigation.request),
          );
        }

        this.pendingNavigation = {
          request,
          resolve,
        };
        return;
      }

      void this.startNavigation({
        request,
        resolve,
      });
    });
  }

  dispose(): void {
    this.isDisposed = true;
    this.activeNavigation?.controller.abort();

    if (this.pendingNavigation) {
      this.pendingNavigation.resolve(this.createSupersededResult(this.pendingNavigation.request));
      this.pendingNavigation = null;
    }
  }

  private async startNavigation(pending: PendingNavigation): Promise<void> {
    const controller = new AbortController();
    this.activeNavigation = {
      controller,
      superseded: false,
    };

    const result = await this.runNavigation(pending.request, controller.signal);
    pending.resolve(result);

    const nextPending = this.pendingNavigation;
    this.pendingNavigation = null;
    this.activeNavigation = null;

    if (!nextPending || this.isDisposed) {
      return;
    }

    await this.startNavigation(nextPending);
  }
}
