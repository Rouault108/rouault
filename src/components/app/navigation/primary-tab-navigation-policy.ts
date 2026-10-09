import { readHistoryEntry } from '../../../navigation/history-entry.js';
import type {
  UrlStateNavigationDecision,
  UrlStateNavigationPolicy,
} from '../../../router/router.js';
import { isPrimaryTabOnlyNavigation, isPrimaryTabStateOnlyScope } from './primary-tab-url-state.js';

export class PrimaryTabNavigationPolicy implements UrlStateNavigationPolicy {
  evaluate(context: {
    cause?: import('../../../navigation/content-navigation-context.js').NavigationCause;
    currentUrl: string;
    requestedUrl: string;
    normalizedUrl: string;
    historyMode: 'none' | 'push' | 'replace';
    outlet: HTMLElement;
  }): UrlStateNavigationDecision {
    if (
      context.cause === 'traverse' &&
      readHistoryEntry() !== null &&
      new URL(context.currentUrl, window.location.origin).pathname ===
        new URL(context.normalizedUrl, window.location.origin).pathname &&
      new URL(context.currentUrl, window.location.origin).search ===
        new URL(context.normalizedUrl, window.location.origin).search
    )
      return { kind: 'state-only' };
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
