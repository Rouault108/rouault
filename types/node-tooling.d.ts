declare module '@11ty/eleventy' {
  export interface UserConfig {
    addExtension(fileExtension: string, options: { key: string }): void;
    addGlobalData(name: string, data: () => unknown): void;
    addPassthroughCopy(copy: Record<string, string>): void;
    addLayoutAlias(alias: string, layoutPath: string): void;
    addWatchTarget(
      additionalWatchTargets: string | string[],
      options?: { resetConfig?: boolean },
    ): void;
    on(eventName: string, callback: () => Promise<void> | void): void;
    addPlugin(plugin: unknown, options?: unknown): void;
  }
}

declare module '@11ty/eleventy-plugin-vite' {
  const plugin: unknown;
  export default plugin;
}

declare module 'eslint-plugin-lit-a11y' {
  import type { ESLint } from 'eslint';

  const plugin: ESLint.Plugin;
  export default plugin;
}