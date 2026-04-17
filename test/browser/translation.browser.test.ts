import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/translation/translation.js';
import type { UiTranslation } from '../../src/components/ui/translation/translation.js';
import {
  getTranslationOverlayOrchestrator,
  initTranslationOverlayOrchestrator,
} from '../../src/components/ui/translation/translation-orchestrator.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (translation: UiTranslation): Promise<void> => {
  await waitForLitUpdate(translation);
  await nextAnimationFrame();
  await nextAnimationFrame();
  await waitForLitUpdate(translation);
};

describe('ui-translation browser contract', () => {
  beforeEach(() => {
    initTranslationOverlayOrchestrator();
  });

  afterEach(() => {
    getTranslationOverlayOrchestrator()?.refresh();
  });

  it('popover surface は trigger / content 公開 accessor を維持し、Escape で閉じること', async () => {
    const translation = await fixture<UiTranslation>(html`
      <ui-translation
        lang="fr"
        target-lang="ja"
        original="Je pense, donc je suis."
        translated="我思う、ゆえに我あり。"
        surface="popover"
      ></ui-translation>
    `);

    await flush(translation);

    const trigger = expectPresent(translation.getTriggerElement(), 'trigger');
    const content = expectPresent(translation.getContentElement(), 'content');

    trigger.click();
    await flush(translation);

    expect(translation.open).to.equal(true);
    expect(content.hidden).to.equal(false);
    expect(content.getAttribute('data-ui-overlay-surface')).to.equal('translation-popover');

    dispatchKey(trigger, 'Escape');
    await flush(translation);

    expect(translation.open).to.equal(false);
    expect(content.hidden).to.equal(true);
  });

  it('drawer surface は non-modal panel として開き、outside pointer で閉じること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="outside" type="button">outside</button>
        <ui-translation
          id="translation"
          lang="la"
          target-lang="ja"
          original="Cogito, ergo sum."
          translated="我思う、ゆえに我あり。"
          surface="drawer"
        ></ui-translation>
      </div>
    `);

    const translation = expectPresent(
      wrapper.querySelector<UiTranslation>('#translation'),
      'translation',
    );
    await flush(translation);

    const trigger = expectPresent(translation.getTriggerElement(), 'trigger');
    const content = expectPresent(translation.getContentElement(), 'content');

    trigger.click();
    await flush(translation);

    expect(translation.open).to.equal(true);
    expect(content.hidden).to.equal(false);
    expect(content.getAttribute('data-ui-overlay-surface')).to.equal('translation-drawer');

    const outside = expectPresent(wrapper.querySelector<HTMLButtonElement>('#outside'), 'outside');
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await flush(translation);

    expect(translation.open).to.equal(false);
    expect(content.hidden).to.equal(true);
  });

  it('orchestrator が open 中の translation を 1 つへ保つこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-translation
          id="first"
          lang="fr"
          target-lang="ja"
          original="Bonjour"
          translated="こんにちは"
          surface="popover"
        ></ui-translation>
        <ui-translation
          id="second"
          lang="de"
          target-lang="ja"
          original="Guten Tag"
          translated="こんにちは"
          surface="drawer"
        ></ui-translation>
      </div>
    `);

    const first = expectPresent(wrapper.querySelector<UiTranslation>('#first'), 'first');
    const second = expectPresent(wrapper.querySelector<UiTranslation>('#second'), 'second');

    await flush(first);
    await flush(second);

    expectPresent(first.getTriggerElement(), 'first trigger').click();
    await flush(first);
    await flush(second);
    expect(first.open).to.equal(true);
    expect(second.open).to.equal(false);

    expectPresent(second.getTriggerElement(), 'second trigger').click();
    await flush(first);
    await flush(second);
    expect(first.open).to.equal(false);
    expect(second.open).to.equal(true);
  });
});