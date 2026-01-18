declare module '@11ty/eleventy' {
  export interface UserConfig {
    addExtension(extension: string, options: { key: string }): void;
    addPassthroughCopy(map: Record<string, string> | string): void;
    addLayoutAlias(alias: string, layoutPath: string): void;
    on(event: string, callback: (...args: any[]) => void | Promise<void>): void;
    addPlugin(plugin: any, options?: any): void;
  }

  export interface EleventyConfig {
    dir: {
      input: string;
      output: string;
      includes: string;
      layouts: string;
      data: string;
    };
    templateFormats: string[];
  }

  export default function (config: UserConfig): EleventyConfig;
}

declare module '@11ty/eleventy-plugin-vite' {
  const EleventyVitePlugin: any;
  export default EleventyVitePlugin;
}
