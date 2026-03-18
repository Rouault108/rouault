import {
  dispatchUrlStateChange,
  isPrimaryTabOnlyNavigation,
  readDecodedHash,
} from './url-state.js';
import { LocationAdapter } from '../router/location-adapter.js';
import type { NavigationRequest } from '../router/router-types.js';

export class PrimaryTabNavigationPolicy {
  constructor(private location: LocationAdapter) {}

  matches(currentUrl: string, nextUrl: string): boolean {
    return isPrimaryTabOnlyNavigation(currentUrl, nextUrl);
  }

  async apply(
    currentUrl: string,
    nextUrl: string,
    request: NavigationRequest,
  ): Promise<void> {
    if (request.historyMode === 'push') {
      this.location.push(nextUrl, request.state);
    } else if (request.historyMode === 'replace') {
      this.location.replace(nextUrl, request.state);
    }

    dispatchUrlStateChange(currentUrl, nextUrl);
    await this.scrollToHashAfterStateNavigation(nextUrl);
  }

  private async scrollToHashAfterStateNavigation(url: string): Promise<void> {
    const hash = readDecodedHash(url);
    if (hash.length === 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const target = document.getElementById(hash);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'start', inline: 'nearest' });
    }
  }
}