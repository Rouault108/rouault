import { describe, expect, it } from 'vitest';
import { activateTranslationOverlay } from '../../src/client/post-hydrate/translation-overlay-enhancer.js';
import { nativeNoteFixture, element } from './harness/native-note-fixture.js';
import { fixtureAbortController } from './harness/browser-fixture.js';
import { dispatchKey, waitForCondition } from './harness/browser-test-utilities.js';

const create = (surface = 'popover') =>
  nativeNoteFixture<HTMLDetailsElement>(
    element('ui-translation', {
      original: 'Bonjour',
      translated: 'こんにちは',
      lang: 'fr',
      'target-lang': 'ja',
      surface,
    }),
  );

describe('native translation overlay', () => {
  it('no-JS disclosureと同じsummary/content実体をenhancement後も維持する', async () => {
    const root = await create();
    const summary = root.querySelector('summary');
    const content = root.querySelector('[data-translation-content]');
    expect(root.open).toBe(false);
    summary?.focus();
    root.open = true;
    activateTranslationOverlay(root, fixtureAbortController(root).signal);
    expect(root.open).toBe(true);
    expect(document.activeElement).toBe(summary);
    expect(root.querySelector('summary')).toBe(summary);
    expect(root.querySelector('[data-translation-content]')).toBe(content);
    expect(root.querySelector('[role="dialog"], [aria-modal], [aria-haspopup]')).toBeNull();
  });
  it.each(['popover', 'drawer'])('%s: Escape時のみ起点summaryへfocusを戻す', async (surface) => {
    const root = await create(surface);
    const summary = root.querySelector('summary');
    activateTranslationOverlay(root, fixtureAbortController(root).signal);
    root.open = true;
    await new Promise((resolve) => setTimeout(resolve, 30));
    dispatchKey(document, 'Escape');
    expect(root.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });
  it('outside pointerで閉じ、クリック先のfocusを奪わない', async () => {
    const root = await create('drawer');
    activateTranslationOverlay(root, fixtureAbortController(root).signal);
    root.open = true;
    await new Promise((resolve) => setTimeout(resolve, 30));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(root.open).toBe(false);
    expect(document.activeElement).not.toBe(root.querySelector('summary'));
  });
  it('初期openを一度通知し、同一状態のtoggleは再通知しない', async () => {
    const root = await create();
    root.open = true;
    const events: CustomEvent[] = [];
    root.addEventListener('translation-toggle', (event) => {
      if (event instanceof CustomEvent) events.push(event);
    });
    activateTranslationOverlay(root, fixtureAbortController(root).signal);
    root.dispatchEvent(new Event('toggle'));
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ open: true, surface: 'popover' });
    expect(events[0]?.bubbles).toBe(true);
    expect(events[0]?.composed).toBe(true);
  });
  it('複数openの初期reconciliationはfocusを含むrootを保持する', async () => {
    const first = await create();
    const second = await create();
    first.open = true;
    second.open = true;
    second.querySelector('summary')?.focus();
    activateTranslationOverlay(first, fixtureAbortController(first).signal);
    expect(first.open).toBe(false);
    expect(second.open).toBe(true);
    expect(document.activeElement).toBe(second.querySelector('summary'));
  });
  it('focusがない複数openではDOM順最初を保持し、以後は未enhance rootの操作も優先する', async () => {
    const first = await create();
    const second = await create();
    first.open = true;
    second.open = true;
    activateTranslationOverlay(first, fixtureAbortController(first).signal);
    expect(first.open).toBe(true);
    expect(second.open).toBe(false);
    second.open = true;
    await waitForCondition(() => !first.open, 'one open');
    expect(second.open).toBe(true);
  });
  it('abort後は旧rootへのdismiss/focus returnを行わない', async () => {
    const root = await create();
    const controller = fixtureAbortController(root);
    activateTranslationOverlay(root, controller.signal);
    root.open = true;
    await new Promise((resolve) => setTimeout(resolve, 30));
    controller.abort();
    dispatchKey(document, 'Escape');
    expect(root.open).toBe(true);
    expect(root.hasAttribute('data-translation-enhanced')).toBe(false);
  });
  it('空訳文は操作可能disclosureを生成しない', async () => {
    const root = await nativeNoteFixture(
      element('ui-translation', { original: 'Bonjour', translated: '' }),
    );
    expect(root.tagName).toBe('SPAN');
    expect(root.textContent).toBe('Bonjour');
  });
});
