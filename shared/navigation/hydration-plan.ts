export interface HydrationPlanScope {
  scope: string;
  capability?: 'static' | 'progressive' | 'interactive' | undefined;
  trigger?: 'initial' | 'post-commit' | 'visible' | 'interaction' | undefined;
}

export interface HydrationPlan {
  scopes: HydrationPlanScope[];
}
