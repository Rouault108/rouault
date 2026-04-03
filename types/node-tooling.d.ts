declare module '@11ty/eleventy' {
  export interface EleventyWatchTargetOptions {
    resetConfig?: boolean;
  }

  export type EleventySyncOrAsync = void | Promise<void>;
  export type EleventyEventCallback = (...args: unknown[]) => EleventySyncOrAsync;
  export type EleventyDataFactory = () => unknown;

  export interface UserConfig {
    addExtension(fileExtension: string, options: { key: string }): void;
    addGlobalData(name: string, data: EleventyDataFactory): void;
    addPassthroughCopy(copy: Record<string, string>): void;
    addLayoutAlias(alias: string, layoutPath: string): void;
    addWatchTarget(
      additionalWatchTargets: string | readonly string[],
      options?: EleventyWatchTargetOptions,
    ): void;
    on(eventName: string, callback: EleventyEventCallback): void;
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
