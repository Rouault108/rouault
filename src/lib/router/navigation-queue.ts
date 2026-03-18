import type { NavigationRequest, PendingNavigation } from './router-types.js';

export class NavigationQueue {
  private navigationInProgress = false;
  private pendingNavigation: PendingNavigation | null = null;
  private isDisposed = false;

  constructor(private runNavigation: (request: NavigationRequest) => Promise<void>) {}

  enqueue(request: NavigationRequest): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.isDisposed) {
        resolve();
        return;
      }

      if (this.navigationInProgress) {
        if (this.pendingNavigation) {
          this.pendingNavigation.resolve();
        }
        this.pendingNavigation = {
          request,
          resolve,
          reject,
        };
        return;
      }

      this.navigationInProgress = true;
      void this.processNavigationLoop(request, resolve, reject);
    });
  }

  dispose(): void {
    this.isDisposed = true;
    if (this.pendingNavigation) {
      this.pendingNavigation.resolve();
      this.pendingNavigation = null;
    }
  }

  private async processNavigationLoop(
    initialRequest: NavigationRequest,
    initialResolve: () => void,
    initialReject: (reason?: unknown) => void,
  ): Promise<void> {
    let currentRequest = initialRequest;
    let currentResolve = initialResolve;
    let currentReject = initialReject;

    for (;;) {
      try {
        await this.runNavigation(currentRequest);
        currentResolve();
      } catch (error) {
        currentReject(error);
      }

      if (!this.pendingNavigation) {
        break;
      }

      const next = this.pendingNavigation;
      this.pendingNavigation = null;
      currentRequest = next.request;
      currentResolve = next.resolve;
      currentReject = next.reject;
    }

    this.navigationInProgress = false;
  }
}