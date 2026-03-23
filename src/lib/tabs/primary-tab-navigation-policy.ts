import { isPrimaryTabOnlyNavigation } from './url-state.js';
import type { UrlStateNavigationDecision, UrlStateNavigationPolicy } from '../router/router-types.js';

export class PrimaryTabNavigationPolicy implements UrlStateNavigationPolicy {
  evaluate(context: {
    currentUrl: string;
    requestedUrl: string;
    normalizedUrl: string;
    historyMode: 'none' | 'push' | 'replace';
  }): UrlStateNavigationDecision {
    const { currentUrl, normalizedUrl } = context;

    if (!isPrimaryTabOnlyNavigation(currentUrl, normalizedUrl)) {
      return { kind: 'full' };
    }

    return {
      kind: 'state-only',
      scrollToHash: true,
    };
  }
}
