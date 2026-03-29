export interface TabsUrlSyncStrategy {
  readonly changeEventName: string;
  readValue(url: string): string | null;
  writeValue(url: string, value: string | null): string;
  readHash(url: string): string;
  dispatchChange(previousUrl: string, nextUrl: string): void;
}

let activeTabsUrlSyncStrategy: TabsUrlSyncStrategy | null = null;

export const registerTabsUrlSyncStrategy = (strategy: TabsUrlSyncStrategy): void => {
  activeTabsUrlSyncStrategy = strategy;
};

export const getTabsUrlSyncStrategy = (): TabsUrlSyncStrategy | null => activeTabsUrlSyncStrategy;

export const clearTabsUrlSyncStrategy = (): void => {
  activeTabsUrlSyncStrategy = null;
};
