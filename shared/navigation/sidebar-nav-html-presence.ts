export class SidebarNavHtmlPresenceError extends Error {
  override name = 'SidebarNavHtmlPresenceError' as const;
}

export interface RuntimeSidebarNavHtmlPresenceInput {
  readonly sidebarPresent: boolean;
  readonly navHtml: unknown;
  readonly sourceLabel?: string;
}

const fail = (message: string): never => {
  throw new SidebarNavHtmlPresenceError(message);
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
    fail(`[${sourceLabel}] present sidebar projection navHtml is missing.`);
  }
  if (navHtml === null) {
    fail(`[${sourceLabel}] present sidebar projection navHtml must not be null.`);
  }
  if (typeof navHtml !== 'string') {
    fail(`[${sourceLabel}] present sidebar projection navHtml must be a string.`);
  }

  const normalized = navHtml.trim();
  if (normalized.length === 0) {
    fail(`[${sourceLabel}] present sidebar projection must contain non-empty navHtml.`);
  }

  const navCount = countNavFragments(normalized);
  if (navCount !== 1) {
    fail(`[${sourceLabel}] present sidebar projection must contain exactly one nav[data-sidebar-nav].`);
  }

  return navHtml;
};
