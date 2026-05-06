export interface HydrationPlanScope {
  scope: string;
  capability?: 'static' | 'progressive' | 'interactive' | undefined;
  trigger?: 'initial' | 'post-commit' | 'visible' | 'interaction' | undefined;
  marker?: 'toc-owner' | 'toc-source' | 'toc-trigger' | 'reading-shell' | undefined;
  ownerId?: string | undefined;
}

export interface HydrationPlan {
  scopes: HydrationPlanScope[];
}
