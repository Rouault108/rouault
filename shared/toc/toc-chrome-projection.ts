export interface TocScopeSelection {
  readonly scopeId: string;
  readonly value: string;
}

export interface TocHeading {
  readonly id: string;
  readonly text: string;
  readonly level: number;
  readonly scopeSelections?: readonly TocScopeSelection[];
}

export interface TocCapabilities {
  readonly activeTracking: boolean;
  readonly dynamicScopes: boolean;
  readonly mobilePanel: boolean;
}

export interface TocChromeProjection {
  readonly sourceId: string;
  readonly runtimeId: string;
  readonly ownerId: string;
  readonly scopeId: string;
  readonly headings: readonly TocHeading[];
  readonly capabilities: TocCapabilities;
  readonly contentRootId: string;
  readonly homeHref: string;
  readonly shouldHydrate: boolean;
}
