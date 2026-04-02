import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './image';
import type { UiImage } from './image';

const SAMPLE_IMAGE_SRC = new URL('../../../assets/images/sample.jpg', import.meta.url).href;
const SECOND_IMAGE_SRC = new URL('../../../assets/images/sample-2.jpeg', import.meta.url).href;
const BROKEN_IMAGE_SRC = 'data:image/png;base64,invalid-base64';

const meta: Meta<UiImage> = {
  title: 'Components/Image',
  component: 'ui-image',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
image の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
thumbnail load / error fallback / lightbox open-close / focus return / Escape / backdrop / scroll lock の合否は Storybook で判定しません。

browser contract は別途 \
\`test/browser/image.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiImage>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: 'thumbnail + caption の代表表示用 smoke story です。',
      },
    },
  },
  render: () => html`
    <ui-image
      src="${SAMPLE_IMAGE_SRC}"
      alt="サンプル画像"
      caption="サンプルキャプション"
    ></ui-image>
  `,
};

export const VariantStateMatrix: Story = {
  parameters: {
    docs: {
      description: {
        story: 'caption / zoomable / prose context の視覚差を見る docs story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-image src="${SAMPLE_IMAGE_SRC}" alt="標準画像" caption="通常表示"></ui-image>
      <ui-image
        src="${SECOND_IMAGE_SRC}"
        alt="拡大可能画像"
        caption="zoomable 表示"
        zoomable
      ></ui-image>
      <div class="prose">
        <ui-image src="${SAMPLE_IMAGE_SRC}" alt="本文内画像" caption="prose 内の表示例"></ui-image>
      </div>
    </div>
  `,
};

export const LoadingAndErrorStates: Story = {
  parameters: {
    docs: {
      description: {
        story: 'loading / broken source の代表表示用 smoke story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-image
        src="${SAMPLE_IMAGE_SRC}"
        alt="eager image"
        caption="eager"
        loading="eager"
      ></ui-image>
      <ui-image src="${BROKEN_IMAGE_SRC}" alt="broken image" caption="broken source"></ui-image>
    </div>
  `,
};

export const ManualLightboxReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- zoomable thumbnail の surface
- lightbox overlay の見え方
- caption / backdrop / close affordance の印象

keyboard / focus return / scroll lock / error fallback の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => html`
    <ui-image
      src="${SECOND_IMAGE_SRC}"
      alt="manual lightbox image"
      caption="manual review"
      zoomable
    ></ui-image>
  `,
};
