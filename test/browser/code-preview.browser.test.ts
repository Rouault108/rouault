import { describe, expect, it } from 'vitest';
import {
  activateCodePreview,
  type CodePreviewStateChangeDetail,
} from '../../src/client/post-hydrate/code-preview-enhancer.js';
import { fixtureAbortController } from './harness/browser-fixture.js';
import { nativeNoteFixture, element, text } from './harness/native-note-fixture.js';
import { waitForCondition } from './harness/browser-test-utilities.js';
import '../../src/assets/css/code-preview.css';
import '../../src/assets/css/note-controls.css';

const create = (properties: Record<string, unknown> = {}) =>
  nativeNoteFixture(
    element('ui-code-preview', properties, [
      element('div', { slot: 'preview' }, [element('strong', {}, [text('Preview content')])]),
      element('figure', { 'data-code-block-root': '' }, [
        element('pre', {}, [text('source code')]),
      ]),
    ]),
  );

describe('native Code Preview', () => {
  it('heading/controlがないbaselineはheaderもhydrationもなくpreview/codeが読める', async () => {
    const root = await create();
    expect(root.querySelector('[data-code-preview-header]')).toBeNull();
    expect(root.hasAttribute('data-hydration-key')).toBe(false);
    expect(root.querySelector('[data-code-preview-surface]')?.textContent).toContain(
      'Preview content',
    );
    expect(root.querySelector('[data-code-preview-code]')?.textContent).toContain('source code');
  });
  it('static metadataとheaderを構築し未知layout値をbuildで既定値へ正規化する', async () => {
    const root = await create({
      heading: ' Heading ',
      controls: 'theme',
      'preview-padding': 'invalid',
      'preview-align': 'invalid',
    });
    expect(root.getAttribute('aria-label')).toBe('Heading');
    expect(root.dataset['previewPadding']).toBe('normal');
    expect(root.dataset['previewAlign']).toBe('center');
    expect(root.querySelector<HTMLElement>('[data-code-preview-control]')?.hidden).toBe(true);
    expect(root.hasAttribute('heading')).toBe(false);
    expect(root.hasAttribute('controls')).toBe(false);
  });
  it('native menuでstateを更新し反映後eventを送るが初期値/同じ値は通知しない', async () => {
    const root = await create({ controls: 'theme surface viewport' });
    const preview = root.querySelector('[data-code-preview-surface]');
    const code = root.querySelector('[data-code-preview-code]');
    const events: CodePreviewStateChangeDetail[] = [];
    root.addEventListener('ui-code-preview-state-change', (event) => {
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      if (event instanceof CustomEvent) events.push(event.detail as CodePreviewStateChangeDetail);
    });
    activateCodePreview(root, fixtureAbortController(root).signal);
    expect(events).toHaveLength(0);
    for (const [control, value, key] of [
      ['theme', 'dark', 'previewTheme'],
      ['surface', 'canvas', 'previewSurface'],
      ['viewport', 'mobile', 'previewViewport'],
    ] as const) {
      const menu = root.querySelector<HTMLElement>(`[data-code-preview-control="${control}"]`);
      const trigger = menu?.querySelector<HTMLButtonElement>('[data-command-menu-trigger]');
      const item = menu?.querySelector<HTMLButtonElement>(`[data-command-menu-value="${value}"]`);
      trigger?.click();
      await waitForCondition(() => trigger?.getAttribute('aria-expanded') === 'true', 'menu ready');
      item?.click();
      expect(root.dataset[key]).toBe(value);
      expect(events.at(-1)?.keys).toEqual([key]);
      expect(events.at(-1)?.state[key]).toBe(value);
      expect(events.at(-1)?.userInitiated).toBe(true);
    }
    expect(events).toHaveLength(3);
    expect(root.querySelector('[data-code-preview-surface]')).toBe(preview);
    expect(root.querySelector('[data-code-preview-code]')).toBe(code);
    const trigger = root.querySelector<HTMLButtonElement>(
      '[data-code-preview-control="theme"] [data-command-menu-trigger]',
    );
    trigger?.click();
    await waitForCondition(() => trigger?.getAttribute('aria-expanded') === 'true', 'menu ready');
    root
      .querySelector<HTMLButtonElement>(
        '[data-code-preview-control="theme"] [data-command-menu-value="dark"]',
      )
      ?.click();
    expect(events).toHaveLength(3);
  });
  it('external metadata mutationをcurrent state入力として受理しない', async () => {
    const root = await create({ controls: 'theme surface' });
    activateCodePreview(root, fixtureAbortController(root).signal);
    root.dataset['previewTheme'] = 'dark';
    const trigger = root.querySelector<HTMLButtonElement>(
      '[data-code-preview-control="surface"] [data-command-menu-trigger]',
    );
    trigger?.click();
    await waitForCondition(() => trigger?.getAttribute('aria-expanded') === 'true', 'menu ready');
    root.querySelector<HTMLButtonElement>('[data-command-menu-value="canvas"]')?.click();
    expect(root.dataset['previewTheme']).toBe('page');
  });
  it('abortでmenuを閉じ再度操作できないbaselineへ戻す', async () => {
    const root = await create({ controls: 'theme' });
    const controller = fixtureAbortController(root);
    activateCodePreview(root, controller.signal);
    const trigger = root.querySelector<HTMLButtonElement>('[data-command-menu-trigger]');
    trigger?.click();
    await waitForCondition(() => trigger?.getAttribute('aria-expanded') === 'true', 'menu ready');
    controller.abort();
    trigger?.click();
    expect(root.querySelector<HTMLElement>('[data-command-menu]')?.hidden).toBe(true);
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  });
});
