import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { SHARED_TRANSLATION_EXAMPLE } from '../../../../examples/manifests/testing-examples.js';
import './translation';
import type { UiTranslation } from './translation';

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

この story ファイルは **docs / smoke / 手動確認** に限定します。開閉 orchestration の合否は Storybook ではなく browser テストを正本とします。
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
  tags: ['smoke'],
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
};