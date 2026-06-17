export type SidebarNavHtmlPresenceErrorReason = 'missing' | 'empty' | 'invalid-type';
export type SidebarNavHtmlPresenceReason = SidebarNavHtmlPresenceErrorReason;

export class SidebarNavHtmlPresenceError extends Error {
  override name = 'SidebarNavHtmlPresenceError' as const;
  readonly sourceLabel: string;
  readonly reason: SidebarNavHtmlPresenceErrorReason;

  constructor({
    sourceLabel,
    reason,
  }: {
    sourceLabel: string;
    reason: SidebarNavHtmlPresenceErrorReason;
  }) {
    super(`[sidebar-nav-html-presence] ${sourceLabel}: ${reason}`);
    this.sourceLabel = sourceLabel;
    this.reason = reason;
  }
}

export interface RuntimeSidebarNavHtmlPresenceInput {
  readonly sidebarPresent: boolean;
  readonly navHtml: unknown;
  readonly sourceLabel?: string;
}

function fail(sourceLabel: string, reason: SidebarNavHtmlPresenceErrorReason): never {
  throw new SidebarNavHtmlPresenceError({ sourceLabel, reason });
}

export const assertRuntimeSidebarNavHtmlPresence = ({
  sidebarPresent,
  navHtml,
  sourceLabel = 'navigation-envelope',
}: RuntimeSidebarNavHtmlPresenceInput): void => {
  if (!sidebarPresent) {
    return;
  }

  if (navHtml === undefined || navHtml === null) {
    fail(sourceLabel, 'missing');
  }
  const navHtmlText = navHtml;
  if (typeof navHtmlText !== 'string') {
    fail(sourceLabel, 'invalid-type');
  }

  if (navHtmlText.trim().length === 0) {
    fail(sourceLabel, 'empty');
  }
};
