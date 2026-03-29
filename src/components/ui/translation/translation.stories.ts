import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { SHARED_TRANSLATION_EXAMPLE } from '../../../../examples/manifests/testing-examples.js';
import './translation';
import type { TranslationOverlaySurface, UiTranslation } from './translation';

const getHost = (canvasElement: Element, id: string): UiTranslation => {
  const host = canvasElement.querySelector<UiTranslation>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getTrigger = (host: UiTranslation): HTMLButtonElement => {
  const trigger = host.querySelector<HTMLButtonElement>('[data-part="trigger"]');
  if (!trigger) {
    throw new Error(`ui-translation#${host.id} の trigger が見つかりません`);
  }
  return trigger;
};

const getContent = (host: UiTranslation): HTMLElement => {
  const content = host.querySelector<HTMLElement>('[data-part="content"]');
  if (!content) {
    throw new Error(`ui-translation#${host.id} の content が見つかりません`);
  }
  return content;
};

const meta: Meta<UiTranslation> = {
  title: 'Components/Translation',
  component: 'ui-translation',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
overlay 専用の translation コンポーネントです。

- \`surface\` は \`popover | drawer\`
- 開閉は click と API のみ
- \`translation-toggle\` は \`{ open, surface }\` を通知
- static translation は別途 Markdown 出力の \`.translation-static\` で扱います
        `,
      },
    },
  },
  args: {
    original: SHARED_TRANSLATION_EXAMPLE.original,
    translated: SHARED_TRANSLATION_EXAMPLE.translated,
    lang: SHARED_TRANSLATION_EXAMPLE.lang,
    targetLang: SHARED_TRANSLATION_EXAMPLE.targetLang,
    surface: 'popover',
    open: false,
  },
  argTypes: {
    surface: {
      control: 'inline-radio',
      options: ['popover', 'drawer'],
      table: { type: { summary: "'popover' | 'drawer'" } },
    },
  },
};

export default meta;
type Story = StoryObj<UiTranslation>;

export const Default: Story = {
  render: (args) => html`
    <p>
      <ui-translation
        id="translation-default"
        .original=${args.original}
        .translated=${args.translated}
        .lang=${args.lang}
        .targetLang=${args.targetLang}
        .surface=${args.surface}
        .open=${args.open}
      ></ui-translation>
    </p>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'translation-default');
    await host.updateComplete;

    const trigger = getTrigger(host);
    const content = getContent(host);

    if (trigger.getAttribute('aria-haspopup') !== 'dialog') {
      throw new Error(
        'overlay translation の trigger は aria-haspopup="dialog" を持つ必要があります',
      );
    }
    if (!content.hidden) {
      throw new Error('初期状態では content が hidden である必要があります');
    }

    const observed: { open: boolean; surface: TranslationOverlaySurface }[] = [];
    host.addEventListener('translation-toggle', (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      observed.push(event.detail as { open: boolean; surface: TranslationOverlaySurface });
    });

    trigger.click();
    await host.updateComplete;
    const openedContent = getContent(host);
    if (!host.hasAttribute('open') || openedContent.hidden) {
      throw new Error('click 後に translation が open しませんでした');
    }

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await host.updateComplete;
    const closedContent = getContent(host);
    if (host.hasAttribute('open') || !closedContent.hidden) {
      throw new Error('Escape 後に translation が close しませんでした');
    }

    if (observed.length !== 2) {
      throw new Error('translation-toggle は open/close の 2 回発火する必要があります');
    }
    if (!observed[0].open || observed[1].open) {
      throw new Error('translation-toggle の open シーケンスが不正です');
    }
    if (observed[0].surface !== 'popover') {
      throw new Error('translation-toggle.detail.surface が反映されていません');
    }
  },
};

export const Drawer: Story = {
  render: () => html`
    <p>
      <ui-translation
        id="translation-drawer"
        original="${SHARED_TRANSLATION_EXAMPLE.original}"
        translated="${SHARED_TRANSLATION_EXAMPLE.translated}"
        lang="${SHARED_TRANSLATION_EXAMPLE.lang}"
        target-lang="${SHARED_TRANSLATION_EXAMPLE.targetLang}"
        surface="${SHARED_TRANSLATION_EXAMPLE.surface}"
        open
      ></ui-translation>
    </p>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'translation-drawer');
    await host.updateComplete;

    const content = getContent(host);
    if (content.getAttribute('data-surface') !== 'drawer') {
      throw new Error('drawer surface が content に反映されていません');
    }
    if (content.hidden) {
      throw new Error('open 指定時の drawer content は表示されている必要があります');
    }
  },
};

export const SingleOpenOrchestration: Story = {
  render: () => html`
    <div style="display: grid; gap: 12px;">
      <ui-translation
        id="translation-first"
        original="${SHARED_TRANSLATION_EXAMPLE.original}"
        translated="${SHARED_TRANSLATION_EXAMPLE.translated}"
        lang="${SHARED_TRANSLATION_EXAMPLE.lang}"
        target-lang="${SHARED_TRANSLATION_EXAMPLE.targetLang}"
      ></ui-translation>
      <ui-translation
        id="translation-second"
        original="Les extrêmes se touchent."
        translated="両極端は相通ずる。"
        lang="${SHARED_TRANSLATION_EXAMPLE.lang}"
        target-lang="${SHARED_TRANSLATION_EXAMPLE.targetLang}"
      ></ui-translation>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const first = getHost(canvasElement, 'translation-first');
    const second = getHost(canvasElement, 'translation-second');
    await Promise.all([first.updateComplete, second.updateComplete]);

    getTrigger(first).click();
    await first.updateComplete;
    if (!first.hasAttribute('open')) {
      throw new Error('最初の translation が open しませんでした');
    }

    getTrigger(second).click();
    await Promise.all([first.updateComplete, second.updateComplete]);
    if (!second.hasAttribute('open')) {
      throw new Error('2つ目の translation が open しませんでした');
    }
    if (first.hasAttribute('open')) {
      throw new Error('overlay orchestrator は既存の open translation を閉じる必要があります');
    }
  },
};
