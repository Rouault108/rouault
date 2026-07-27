import { html } from 'lit/static-html.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import type { UiTranslation } from '../../src/components/ui/translation/translation.js';
import {
  getTranslationOverlayOrchestrator,
  initTranslationOverlayOrchestrator,
} from '../../src/components/ui/translation/translation-orchestrator.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './harness/browser-test-utilities.js';

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

const ensureTranslationElementDefined = async (): Promise<void> => {
  await import('../../src/components/ui/translation/translation.js');
};

describe('ui-translation fallback focus handoff', () => {
  it('fallback summary focus は hydrated trigger へ引き継ぐこと', async () => {
    const tagName = 'ui-translation';
    expect(customElements.get(tagName), 'focus handoff test must run before definition').to.equal(
      undefined,
    );

    const element = document.createElement(tagName) as UiTranslation;
    element.setAttribute('lang', 'fr');
    element.setAttribute('target-lang', 'ja');
    element.setAttribute('original', 'Je pense, donc je suis.');
    element.setAttribute('translated', '我思う、ゆえに我あり。');
    element.innerHTML = [
      '<details data-translation-fallback>',
      '<summary data-translation-fallback-trigger lang="fr" tabindex="0">Je pense, donc je suis.</summary>',
      '<p data-translation-fallback-content lang="ja">我思う、ゆえに我あり。</p>',
      '</details>',
    ].join('');
    document.body.append(element);

    const summary = expectPresent(
      element.querySelector<HTMLElement>('[data-translation-fallback-trigger]'),
      'fallback summary',
    );
    summary.focus();

    await ensureTranslationElementDefined();
    element.activateHydration();
    await flush(element);

    expect(document.activeElement).to.equal(element.getTriggerElement());
    element.remove();
  });
});

describe('ui-translation browser contract', () => {
  beforeEach(async () => {
    await ensureTranslationElementDefined();
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

  it('closed fallback は hydration 後も closed のまま hydrated UI に置き換わること', async () => {
    await ensureTranslationElementDefined();

    const translation = document.createElement('ui-translation') as UiTranslation;
    translation.setAttribute('lang', 'fr');
    translation.setAttribute('target-lang', 'ja');
    translation.setAttribute('original', 'Je pense, donc je suis.');
    translation.setAttribute('translated', '我思う、ゆえに我あり。');
    translation.setAttribute('surface', 'drawer');
    translation.setAttribute('data-hydration-trigger', 'visible');
    translation.innerHTML = `
      <details class="translation-overlay-fallback" data-translation-fallback>
        <summary data-translation-fallback-trigger lang="fr">Je pense, donc je suis.</summary>
        <p data-translation-fallback-content lang="ja">我思う、ゆえに我あり。</p>
      </details>
    `;

    document.body.append(translation);

    try {
      translation.activateHydration();
      await flush(translation);

      expect(translation.open).to.equal(false);
      expect(translation.querySelector('[data-translation-fallback]')).to.equal(null);
      expect(translation.getTriggerElement()?.dataset['part']).to.equal('trigger');
      expect(translation.getContentElement()?.dataset['part']).to.equal('content');
      expect(translation.getContentElement()?.hidden).to.equal(true);
    } finally {
      translation.remove();
    }
  });

  it('open fallback は hydration 後に open と content visibility を引き継ぐこと', async () => {
    const events: CustomEvent<{ open: boolean; surface: string }>[] = [];
    const translation = await fixture<UiTranslation>(html`
      <ui-translation
        lang="fr"
        target-lang="ja"
        original="Je pense, donc je suis."
        translated="我思う、ゆえに我あり。"
        surface="drawer"
        data-hydration-trigger="visible"
      >
        <details class="translation-overlay-fallback" data-translation-fallback open>
          <summary data-translation-fallback-trigger lang="fr">Je pense, donc je suis.</summary>
          <p data-translation-fallback-content lang="ja">我思う、ゆえに我あり。</p>
        </details>
      </ui-translation>
    `);

    translation.addEventListener('translation-toggle', (event) => {
      events.push(event as CustomEvent<{ open: boolean; surface: string }>);
    });
    translation.activateHydration();
    await flush(translation);

    const content = expectPresent(translation.getContentElement(), 'content');
    expect(translation.open).to.equal(true);
    expect(content.hidden).to.equal(false);
    expect(events.filter((event) => event.detail.open)).to.have.length(1);
    expect(events[0]?.detail).to.deep.equal({ open: true, surface: 'drawer' });
  });

  it('host open 属性は fallback open より優先され、初期 open 通知を dispatch すること', async () => {
    const events: CustomEvent<{ open: boolean; surface: string }>[] = [];
    const translation = await fixture<UiTranslation>(html`
      <ui-translation
        open
        lang="fr"
        target-lang="ja"
        original="Je pense, donc je suis."
        translated="我思う、ゆえに我あり。"
        surface="popover"
        data-hydration-trigger="visible"
      >
        <details class="translation-overlay-fallback" data-translation-fallback>
          <summary data-translation-fallback-trigger lang="fr">Je pense, donc je suis.</summary>
          <p data-translation-fallback-content lang="ja">我思う、ゆえに我あり。</p>
        </details>
      </ui-translation>
    `);

    translation.addEventListener('translation-toggle', (event) => {
      events.push(event as CustomEvent<{ open: boolean; surface: string }>);
    });
    translation.activateHydration();
    await flush(translation);

    expect(translation.open).to.equal(true);
    expect(translation.getContentElement()?.hidden).to.equal(false);
    expect(events.map((event) => event.detail)).to.deep.equal([{ open: true, surface: 'popover' }]);
  });

  it('複数の fallback open は hydration reconciliation 後に最大1件だけ open にすること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-translation
          id="first"
          lang="fr"
          target-lang="ja"
          original="Bonjour"
          translated="こんにちは"
          surface="popover"
          data-hydration-trigger="visible"
        >
          <details data-translation-fallback open>
            <summary data-translation-fallback-trigger lang="fr">Bonjour</summary>
            <p data-translation-fallback-content lang="ja">こんにちは</p>
          </details>
        </ui-translation>
        <ui-translation
          id="second"
          lang="de"
          target-lang="ja"
          original="Guten Tag"
          translated="こんにちは"
          surface="drawer"
          data-hydration-trigger="visible"
        >
          <details data-translation-fallback open>
            <summary data-translation-fallback-trigger lang="de">Guten Tag</summary>
            <p data-translation-fallback-content lang="ja">こんにちは</p>
          </details>
        </ui-translation>
      </div>
    `);

    const translations = Array.from(wrapper.querySelectorAll<UiTranslation>('ui-translation'));
    for (const translation of translations) {
      translation.activateHydration();
      await flush(translation);
    }

    expect(translations.filter((translation) => translation.open)).to.have.length.lessThanOrEqual(
      1,
    );
  });
});
