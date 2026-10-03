import { describe, expect, it } from 'vitest';
import { activateCodePreview } from '../../../src/client/post-hydrate/code-preview-enhancer.js';
import { nativeNoteFixture, element } from '../harness/native-note-fixture.js';
import { fixtureAbortController } from '../harness/browser-fixture.js';
import { dispatchKey, waitForCondition } from '../harness/browser-test-utilities.js';
import '../../../src/assets/css/note-controls.css';

describe('native command menu', () => {
  it.each(['Enter', ' '])('%sで一度選択してtriggerにfocusを戻す', async (key) => {
    const root = await nativeNoteFixture(element('ui-code-preview', { controls: 'theme' }));
    activateCodePreview(root, fixtureAbortController(root).signal);
    const trigger = root.querySelector<HTMLButtonElement>('[data-command-menu-trigger]');
    if (!trigger) throw new Error('trigger missing');
    let changes = 0;
    root.addEventListener('ui-code-preview-state-change', () => {
      changes += 1;
    });
    trigger.focus();
    dispatchKey(trigger, 'ArrowDown');
    await waitForCondition(() => trigger.getAttribute('aria-expanded') === 'true', 'menu ready');
    const first = document.activeElement;
    if (!(first instanceof HTMLElement)) throw new Error('item missing');
    dispatchKey(first, 'End');
    const last = document.activeElement;
    if (!(last instanceof HTMLElement)) throw new Error('item missing');
    dispatchKey(last, key);
    expect(root.dataset['previewTheme']).toBe('dark');
    expect(changes).toBe(1);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
  it('Home/End/矢印/typeahead/Escapeのfocusとcloseを維持する', async () => {
    const root = await nativeNoteFixture(element('ui-code-preview', { controls: 'theme' }));
    activateCodePreview(root, fixtureAbortController(root).signal);
    const trigger = root.querySelector<HTMLButtonElement>('[data-command-menu-trigger]');
    if (!trigger) throw new Error('trigger missing');
    dispatchKey(trigger, 'ArrowUp');
    await waitForCondition(() => trigger.getAttribute('aria-expanded') === 'true', 'menu ready');
    const send = (key: string): void => {
      const target = document.activeElement;
      if (!(target instanceof HTMLElement)) throw new Error('item missing');
      dispatchKey(target, key);
    };
    expect(document.activeElement?.getAttribute('data-command-menu-value')).toBe('dark');
    send('ArrowDown');
    expect(document.activeElement?.getAttribute('data-command-menu-value')).toBe('page');
    send('End');
    send('Home');
    expect(document.activeElement?.getAttribute('data-command-menu-value')).toBe('page');
    send('l');
    expect(document.activeElement?.getAttribute('data-command-menu-value')).toBe('light');
    send('Escape');
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
