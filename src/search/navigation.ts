import type { SearchReturnToReadingEventDetail } from '../../shared/search/search-types.js';
import {
  createSearchReturnToReadingEvent,
  searchReturnToReadingEventName,
} from './search-dialog-events.js';

export interface NavigationOptions {
  assign?: (url: string) => void;
  resolveRouter?: () => (HTMLElement & { navigate?: (path: string) => Promise<unknown> }) | null;
}

export interface ReturnToReadingDispatchOptions {
  target?: EventTarget | null;
}

export async function navigateToUrl(url: string, options: NavigationOptions = {}): Promise<void> {
  const routerElement =
    options.resolveRouter?.() ??
    document.querySelector<HTMLElement & { navigate?: (path: string) => Promise<unknown> }>(
      'app-router',
    );

  if (typeof routerElement?.navigate === 'function') {
    await routerElement.navigate(url);
    return;
  }

  const assign =
    options.assign ??
    ((target: string) => {
      window.location.assign(target);
    });
  assign(url);
}

export function dispatchSearchReturnToReading(
  detail: SearchReturnToReadingEventDetail,
  options: ReturnToReadingDispatchOptions = {},
): boolean {
  const target = options.target ?? document;
  return target.dispatchEvent(createSearchReturnToReadingEvent(detail));
}

export async function handleSearchReturnToReadingEvent(
  event: Event,
  options: NavigationOptions = {},
): Promise<void> {
  if (event.type !== searchReturnToReadingEventName) {
    return;
  }

  const customEvent = event as CustomEvent<SearchReturnToReadingEventDetail>;
  if (customEvent.defaultPrevented) {
    return;
  }

  const { url } = customEvent.detail;
  if (typeof url !== 'string' || url.length === 0) {
    return;
  }

  await navigateToUrl(url, options);
}
