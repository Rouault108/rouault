import type {
  UrlStateNavigationDecision,
  UrlStateNavigationPolicy,
} from '../../../router/router.js';
import { isPrimaryTabOnlyNavigation, isPrimaryTabStateOnlyScope } from './primary-tab-url-state.js';

export class PrimaryTabNavigationPolicy implements UrlStateNavigationPolicy {
  evaluate(context: {
    currentUrl: string;
    requestedUrl: string;
    normalizedUrl: string;
    historyMode: 'none' | 'push' | 'replace';
    outlet: HTMLElement;
  }): UrlStateNavigationDecision {
    if (
      !isPrimaryTabStateOnlyScope(context.currentUrl) ||
      !isPrimaryTabStateOnlyScope(context.normalizedUrl)
    ) {
      return { kind: 'full' };
    }

    if (!isPrimaryTabOnlyNavigation(context.currentUrl, context.normalizedUrl)) {
      return { kind: 'full' };
    }

    return {
      kind: 'state-only',
      scrollToHash: true,
    };
  }
}
