import { describe, expect, it } from 'vitest';
import { activateVideo } from '../../src/client/post-hydrate/video-enhancer.js';
import { fixtureAbortController, requireFixtureValue } from './harness/browser-fixture.js';
import { element, nativeNoteFixture } from './harness/native-note-fixture.js';

describe('native note controls', () => {
  it('video controlは直接名前を持つnative buttonで、formを送信しない', async () => {
    const root = await nativeNoteFixture(element('ui-video'));
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-label') || button.textContent?.trim()).toBeTruthy();
      expect(button.shadowRoot).toBeNull();
    }
    expect(root.querySelector('ui-button')).toBeNull();
  });

  it('EMPTYのnative disabledがclickを抑止する', async () => {
    const root = await nativeNoteFixture(element('ui-video'));
    activateVideo(root, fixtureAbortController(root).signal);
    const button = requireFixtureValue(root.querySelector<HTMLButtonElement>('[data-video-action="play"]'));
    let clicks = 0;
    button.addEventListener('click', () => {
      clicks += 1;
    });
    expect(button.disabled).toBe(true);
    button.click();
    expect(clicks).toBe(0);
  });

  it('Code Previewのmenu triggerはnative buttonにaria-controls/haspopupを持つ', async () => {
    const root = await nativeNoteFixture(element('ui-code-preview', { controls: 'theme' }));
    const trigger = requireFixtureValue(root.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]'));
    expect(trigger).toBeInstanceOf(HTMLButtonElement);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const panel = root.querySelector('[role="menu"]');
    expect(trigger.getAttribute('aria-controls')).toBe(panel?.id);
    expect(root.querySelector('ui-dropdown, ui-menu-item')).toBeNull();
  });
});
