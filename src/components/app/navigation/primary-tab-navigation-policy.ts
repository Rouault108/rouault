import type { UrlStateNavigationDecision, UrlStateNavigationPolicy } from '../../../router/router.js';
import { isPrimaryTabOnlyNavigation } from './primary-tab-url-state.js';

export class PrimaryTabNavigationPolicy implements UrlStateNavigationPolicy {
  evaluate(context: {
    currentUrl: string;
    requestedUrl: string;
    normalizedUrl: string;
    historyMode: 'none' | 'push' | 'replace';
  }): UrlStateNavigationDecision {
    if (!isPrimaryTabOnlyNavigation(context.currentUrl, context.normalizedUrl)) {
      return { kind: 'full' };
    }

    return {
      kind: 'state-only',
      scrollToHash: true,
    };
  }
}
