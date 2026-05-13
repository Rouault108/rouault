export type SidebarNavHtmlPresenceReason =
  | 'missing'
  | 'null'
  | 'invalid-type'
  | 'empty'
  | 'missing-nav'
  | 'multiple-nav';

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

const countNavFragments = (navHtml: string): number => {
  if (typeof document !== 'undefined') {
    const template = document.createElement('template');
    template.innerHTML = navHtml;
    return template.content.querySelectorAll('nav[data-sidebar-nav]').length;
  }

  return navHtml.match(/<nav\b(?=[^>]*\bdata-sidebar-nav(?:\s|=|>|$))/giu)?.length ?? 0;
};

export const assertRuntimeSidebarNavHtmlPresence = ({
  sidebarPresent,
  navHtml,
  sourceLabel = 'navigation-envelope',
}: RuntimeSidebarNavHtmlPresenceInput): string | null => {
  if (!sidebarPresent) {
    return null;
  }

  if (navHtml === undefined) {
    fail(sourceLabel, 'missing', 'present sidebar projection navHtml is missing.');
  }
  if (navHtml === null) {
    fail(sourceLabel, 'null', 'present sidebar projection navHtml must not be null.');
  }
  if (typeof navHtml !== 'string') {
    fail(sourceLabel, 'invalid-type', 'present sidebar projection navHtml must be a string.');
  }

  const navHtmlString = navHtml as string;
  const normalized = navHtmlString.trim();
  if (normalized.length === 0) {
    fail(sourceLabel, 'empty', 'present sidebar projection must contain non-empty navHtml.');
  }

  const navCount = countNavFragments(normalized);
  if (navCount === 0) {
    fail(sourceLabel, 'missing-nav', 'present sidebar projection must contain one nav[data-sidebar-nav].');
  }
  if (navCount > 1) {
    fail(sourceLabel, 'multiple-nav', 'present sidebar projection must contain exactly one nav[data-sidebar-nav].');
  }

  return navHtmlString;
};
