import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './video';
import type { Track, UiVideo } from './video';

const SAMPLE_VIDEO_SRC = new URL('../../../assets/videos/sample-video.mp4', import.meta.url).href;
const SAMPLE_POSTER_SRC = new URL('../../../assets/images/sample-video-poster.jpg', import.meta.url)
  .href;
const SAMPLE_VTT_SRC = new URL('../../../assets/other/sample-vtt.vtt', import.meta.url).href;

const DEFAULT_TRACKS: Track[] = [
  {
    src: SAMPLE_VTT_SRC,
    srclang: 'ja',
    label: '日本語',
    kind: 'captions',
    default: true,
  },
];

const meta: Meta<UiVideo> = {
  title: 'Components/Video',
  component: 'ui-video',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
video の **表示見本** です。

- Storybook には representative display / caption surface / empty surface / manual review を残します。
- play/pause/retry の public API、keyboard shortcut、seek、mute、captions、empty/error recovery、ended restart は \`test/browser/video.browser.test.ts\` を正本にします。
- figcaption / aria-describedby、track 正規化、media state の合否は Storybook で判定しません。
- forced-colors / reduced-motion / print / prose breakout の CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本にします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiVideo>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: '代表表示用の smoke story です。poster と video surface の基本見え方だけを残します。',
      },
    },
  },
  render: () => html`
    <div style="padding: 2rem; max-width: 760px;">
      <ui-video
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="サンプル動画の代表表示です。"
      ></ui-video>
    </div>
  `,
};

export const PosterAndCaption: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'poster と figcaption の代表表示用 smoke story です。aria-describedby の合否は browser test を正本とします。',
      },
    },
  },
  render: () => html`
    <div style="padding: 2rem; max-width: 760px;">
      <ui-video
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="poster と caption を伴う表示見本です。"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
};

export const WithCaptions: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 760px;">
      <ui-video
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="字幕付き動画の表示見本です。"
        .tracks=${DEFAULT_TRACKS}
      ></ui-video>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'caption button と track 要素の surface を観察する docs story です。字幕切替と track 正規化の合否は browser test を正本とします。',
      },
    },
  },
};

export const EmptySource: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 760px;">
      <ui-video caption="ソース未設定時の空状態です。"></ui-video>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'src 未設定時の empty surface です。EMPTY state の合否は Storybook ではなく browser test を正本とします。',
      },
    },
  },
};

export const AutoplayMutedLoop: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 760px;">
      <ui-video
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        autoplay
        muted
        loop
        playsinline
        caption="autoplay / muted / loop surface"
      ></ui-video>
    </div>
  `,
};

export const LayoutReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 1.5rem; padding: 2rem;">
      <div style="max-width: 760px;">
        <ui-video
          src="${SAMPLE_VIDEO_SRC}"
          poster="${SAMPLE_POSTER_SRC}"
          caption="標準幅の参照例です。"
        ></ui-video>
      </div>

      <div class="prose" style="max-width: 720px;">
        <ui-video
          src="${SAMPLE_VIDEO_SRC}"
          poster="${SAMPLE_POSTER_SRC}"
          caption="prose 文脈での breakout surface 参照です。"
        ></ui-video>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '通常文脈と prose 文脈のレイアウト参照用 story です。breakout の構造契約は SSR 側を正本とします。',
      },
    },
  },
};

export const ManualPlaybackReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="padding: 2rem; max-width: 760px;">
      <ui-video
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="再生・一時停止・字幕・全画面・キーボード操作の手動確認用 story"
        .tracks=${DEFAULT_TRACKS}
      ></ui-video>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- play / pause の体感
- seek / mute / captions / fullscreen の操作感
- buffering / loading surface の見え方
- 全画面時の caption surface

合否は Storybook ではなく \`test/browser/video.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};