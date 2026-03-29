import type { SidebarScopeRule } from './types.js';

export const resolveSidebarRoot = (rules: readonly SidebarScopeRule[]): string | undefined => {
  let sidebarRoot: string | undefined;

  for (const rule of rules) {
    if (rule.scope === 'global') {
      sidebarRoot = undefined;
      continue;
    }

    if (rule.scope === 'self') {
      sidebarRoot = rule.directoryPath.length > 0 ? rule.directoryPath : undefined;
    }
  }

  return sidebarRoot;
};
