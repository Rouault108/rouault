import type { SearchReturnToReadingEventDetail } from '../../shared/search/search-types.js';
import { navigateInternalDocument, type NavigateInternalDocumentOptions } from '../router/navigate-internal-document.js';
import {
  createSearchReturnToReadingEvent,
  searchReturnToReadingEventName,
} from './search-dialog-events.js';

export interface NavigationOptions extends NavigateInternalDocumentOptions {}

export interface ReturnToReadingDispatchOptions {
  target?: EventTarget | null;
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

  await navigateInternalDocument(url, options);
}
