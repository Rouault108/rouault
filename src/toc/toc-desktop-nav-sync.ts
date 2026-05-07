import type { TocControllerSyncDiagnosticPayload } from './toc-controller-sync-diagnostics.js';
import { createMissingActiveHeadingDiagnostic } from './toc-controller-sync-diagnostics.js';

export interface TocDesktopNavSyncSnapshot {
  readonly ownerId: string;
  readonly activeHeadingId: string | null;
  readonly diagnostics: readonly TocControllerSyncDiagnosticPayload[];
}

export interface SyncTocNavOptions {
  readonly nav: HTMLElement | null;
  readonly ownerId: string;
  readonly activeHeadingId: string | null;
  readonly visibleHeadingIds: ReadonlySet<string>;
}

export const syncTocHeadingVisibility = (
  nav: HTMLElement | null,
  visibleHeadingIds: ReadonlySet<string>,
): void => {
  if (!(nav instanceof HTMLElement)) {
    return;
  }

  const items = nav.querySelectorAll<HTMLElement>('.layout-toc__item[data-heading-id]');
  for (const item of items) {
    const headingId = item.getAttribute('data-heading-id') ?? '';
    const visible = headingId.length > 0 && visibleHeadingIds.has(headingId);
    item.hidden = !visible;
    item.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
};

export const syncTocActiveLinks = (options: SyncTocNavOptions): TocDesktopNavSyncSnapshot => {
  const { nav, ownerId, activeHeadingId, visibleHeadingIds } = options;
  const diagnostics: TocControllerSyncDiagnosticPayload[] = [];

  if (!(nav instanceof HTMLElement)) {
    return {
      ownerId,
      activeHeadingId,
      diagnostics,
    };
  }

  let activeLinkFound = activeHeadingId === null;
  const links = nav.querySelectorAll<HTMLAnchorElement>('[data-toc-link][data-heading-id]');
  for (const link of links) {
    const headingId = link.getAttribute('data-heading-id') ?? '';
    const active =
      activeHeadingId !== null &&
      headingId.length > 0 &&
      headingId === activeHeadingId &&
      visibleHeadingIds.has(headingId);

    if (active) {
      activeLinkFound = true;
      link.setAttribute('aria-current', 'location');
      link.setAttribute('data-active', 'true');
      link.classList.add('is-active');
    } else {
      link.removeAttribute('aria-current');
      link.removeAttribute('data-active');
      link.classList.remove('is-active');
    }
  }

  if (!activeLinkFound) {
    diagnostics.push(createMissingActiveHeadingDiagnostic(ownerId));
  }

  return {
    ownerId,
    activeHeadingId,
    diagnostics,
  };
};
