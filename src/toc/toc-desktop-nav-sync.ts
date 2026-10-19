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
  readonly writer?: TocDomWriter;
}

export interface TocDomWriter {
  attribute(element: HTMLElement, name: string, value: string | null): void;
  activeClass(element: HTMLElement, active: boolean): void;
}

const defaultWriter: TocDomWriter = {
  attribute(element, name, value) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  },
  activeClass(element, active) {
    element.classList.toggle('is-active', active);
  },
};

export const syncTocHeadingVisibility = (
  nav: HTMLElement | null,
  visibleHeadingIds: ReadonlySet<string>,
  writer: TocDomWriter = defaultWriter,
): void => {
  if (!(nav instanceof HTMLElement)) {
    return;
  }

  const items = nav.querySelectorAll<HTMLElement>('.layout-toc__item[data-heading-id]');
  for (const item of items) {
    const headingId = item.getAttribute('data-heading-id') ?? '';
    const visible = headingId.length > 0 && visibleHeadingIds.has(headingId);
    writer.attribute(item, 'hidden', visible ? null : '');
    writer.attribute(item, 'aria-hidden', visible ? 'false' : 'true');
  }
};

export const syncTocActiveLinks = (options: SyncTocNavOptions): TocDesktopNavSyncSnapshot => {
  const { nav, ownerId, activeHeadingId, visibleHeadingIds } = options;
  const writer = options.writer ?? defaultWriter;
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
      writer.attribute(link, 'aria-current', 'location');
      writer.attribute(link, 'data-active', 'true');
      writer.activeClass(link, true);
    } else {
      writer.attribute(link, 'aria-current', null);
      writer.attribute(link, 'data-active', null);
      writer.activeClass(link, false);
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
