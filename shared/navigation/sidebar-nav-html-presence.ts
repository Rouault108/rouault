export type SidebarNavHtmlPresenceReason = 'missing' | 'invalid-type' | 'empty';

export class SidebarNavHtmlPresenceError extends Error {
  override name = 'SidebarNavHtmlPresenceError' as const;

  constructor(
    message: string,
    readonly reason: SidebarNavHtmlPresenceReason,
    readonly sourceLabel: string,
  ) {
    super(message);
  }
}

export interface RuntimeSidebarNavHtmlPresenceInput {
  readonly sidebarPresent: boolean;
  readonly navHtml: unknown;
  readonly sourceLabel?: string;
}

const fail = (
  sourceLabel: string,
  reason: SidebarNavHtmlPresenceReason,
  message: string,
): never => {
  throw new SidebarNavHtmlPresenceError(`[${sourceLabel}] ${message}`, reason, sourceLabel);
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
    fail(sourceLabel, 'missing', 'present sidebar projection navHtml is missing.');
  }
  if (typeof navHtml !== 'string') {
    fail(sourceLabel, 'invalid-type', 'present sidebar projection navHtml must be a string.');
  }

  if (navHtml.trim().length === 0) {
    fail(sourceLabel, 'empty', 'present sidebar projection must contain non-empty navHtml.');
  }
};
