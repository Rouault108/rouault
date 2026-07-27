import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCssText } from './fetch-css-text.js';
import { ensureMainCssLoaded } from './load-main-css.js';

const TEST_STYLE_IDS = ['test-global-tokens-css', 'test-global-main-css'] as const;

afterEach(() => {
  vi.restoreAllMocks();
  for (const id of TEST_STYLE_IDS) {
    document.getElementById(id)?.remove();
  }
});

describe('browser CSS text response contract', () => {
  it('requests and accepts a text/css response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(':root { --contract: ready; }', {
        status: 200,
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      }),
    );

    await expect(fetchCssText('/contract.css')).resolves.toContain('--contract: ready');
    expect(fetchSpy).toHaveBeenCalledWith('/contract.css', {
      headers: { Accept: 'text/css' },
    });
  });

  it('rejects a non-success response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('missing', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/css' },
      }),
    );

    await expect(fetchCssText('/missing.css')).rejects.toThrow('404 Not Found');
  });

  it('rejects a non-CSS response before it can be used as style text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('export default "not css"', {
        status: 200,
        headers: { 'Content-Type': 'text/javascript' },
      }),
    );

    await expect(fetchCssText('/module.css')).rejects.toThrow('CSSとして返されませんでした');
  });

  it('receives raw stylesheet text instead of a Vite JavaScript CSS module', async () => {
    const cssText = await fetchCssText(
      new URL('../../../src/assets/css/tokens.css', import.meta.url),
    );

    expect(cssText).toContain(':root');
    expect(cssText).not.toContain('__vite__updateStyle');
  });

  it('recursively inlines top-level imports and preserves computed styles', async () => {
    await ensureMainCssLoaded();

    const mainStyle = document.getElementById('test-global-main-css');
    expect(mainStyle).toBeInstanceOf(HTMLStyleElement);
    expect(mainStyle?.textContent).not.toContain('__vite__updateStyle');
    expect(mainStyle?.textContent).not.toMatch(/@import\s+(?:url\()?['"]?\.?\//iu);
    expect(getComputedStyle(document.documentElement).getPropertyValue('--chroma-neutral').trim()).toBe(
      '0',
    );
  });
});
