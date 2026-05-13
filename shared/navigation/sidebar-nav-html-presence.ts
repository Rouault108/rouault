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
    super(`[${sourceLabel}] present sidebar projection navHtml is invalid: ${reason}`);
    this.sourceLabel = sourceLabel;
    this.reason = reason;
  }
}

export interface RuntimeSidebarNavHtmlPresenceInput {
  readonly sidebarPresent: boolean;
  readonly navHtml: unknown;
  readonly sourceLabel?: string;
}

const fail = (
  sourceLabel: string,
  reason: SidebarNavHtmlPresenceErrorReason,
): never => {
  throw new SidebarNavHtmlPresenceError({ sourceLabel, reason });
};

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
  if (typeof navHtml !== 'string') {
    fail(sourceLabel, 'invalid-type');
  }

  if (navHtml.trim().length === 0) {
    fail(sourceLabel, 'empty');
  }
};
