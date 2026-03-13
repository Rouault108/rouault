import type { UserConfig } from '@11ty/eleventy';
import { describe, expect, it } from 'vitest';

type AsyncGlobalData = () => Promise<unknown>;
interface EleventyConfigModule {
  default: (config: UserConfig) => unknown;
}

const noop = (): void => {
  return;
};

describe('eleventy config', () => {
  it('tagPages グローバルデータを遅延 import で登録できること', async () => {
    const globalData = new Map<string, AsyncGlobalData>();

    const config = {
      addExtension() {
        return;
      },
      addGlobalData(name: string, callback: AsyncGlobalData) {
        globalData.set(name, callback);
      },
      addPassthroughCopy: noop,
      addLayoutAlias: noop,
      on: noop,
      addPlugin: noop,
    } satisfies Partial<UserConfig>;

    const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
    const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
    configureEleventy(config as UserConfig);

    const loadTagPages = globalData.get('tagPages');

    expect(typeof loadTagPages).toBe('function');
    expect(loadTagPages).toBeDefined();
    if (!loadTagPages) {
      throw new Error('tagPages が登録されていません');
    }
    await expect(loadTagPages()).resolves.toEqual(expect.any(Array));
  });
});
