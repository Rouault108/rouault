import type { UserConfig } from '@11ty/eleventy';
import { describe, expect, it } from 'vitest';

type GlobalData = () => unknown;
interface EleventyConfigModule {
  default: (config: UserConfig) => unknown;
}

const noop = (): void => {
  return;
};

describe('eleventy config', () => {
  it('tagPages グローバルデータを遅延 import で登録できること', async () => {
    const globalData = new Map<string, GlobalData>();

    const config = {
      addExtension() {
        return;
      },
      addGlobalData(name: string, callback: GlobalData) {
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
    const loadHome = globalData.get('home');

    expect(typeof loadTagPages).toBe('function');
    expect(loadTagPages).toBeDefined();
    if (!loadTagPages) {
      throw new Error('tagPages が登録されていません');
    }
    await expect(loadTagPages()).resolves.toEqual(expect.any(Array));

    expect(typeof loadHome).toBe('function');
    expect(loadHome).toBeDefined();
    if (!loadHome) {
      throw new Error('home が登録されていません');
    }
    const homeResult = loadHome();
    expect(typeof homeResult).toBe('object');
    if (typeof homeResult !== 'object' || homeResult === null) {
      throw new Error('home の戻り値がオブジェクトではありません');
    }

    const home = homeResult as {
      publicNoteCount: number;
      latestUpdatedDate: string | null;
      notes: unknown[];
    };

    expect(typeof home.publicNoteCount).toBe('number');
    expect(Array.isArray(home.notes)).toBe(true);
    expect(home.latestUpdatedDate === null || typeof home.latestUpdatedDate === 'string').toBe(
      true,
    );
  });
});
