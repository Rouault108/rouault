import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { enhanceFootnotePopovers } from '../../client/post-hydrate/footnote-popover-enhancer.js';
import { enhanceImageLightboxes } from '../../client/post-hydrate/image-lightbox-enhancer.js';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const meta: Meta = {
  title: 'Note Contracts/Enhancers',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    rouaultContractKind: 'interaction-contract',
    docs: {
      description: {
        component:
          'image-lightbox-enhancer / footnote-popover-enhancer が static DOM の上にだけ補助 UI を載せることを確認するストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const ProgressiveEnhancers: Story = {
  render: () => html`
    <article class="prose" data-note-root data-footnote-scope>
      <figure
        data-image="true"
        data-image-zoomable="true"
        data-hydration-key="image-lightbox-enhancer"
        data-image-lightbox-src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
      >
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="zoom target" />
        <figcaption>lightbox caption</figcaption>
        <button type="button" data-image-zoom-trigger="true" aria-label="画像を拡大表示">
          拡大
        </button>
      </figure>

      <p>
        enhancer footnote
        <a
          id="fn-enhancer-1-ref-1"
          href="#fn-enhancer-1"
          data-footnote-ref="true"
          data-footnote-id="fn-enhancer-1"
          data-footnote-ref-instance="1"
          data-hydration-key="footnote-popover-enhancer"
          role="doc-noteref"
        >
          <sup>[1]</sup>
        </a>
      </p>

      <section role="doc-endnotes">
        <h2>脚注</h2>
        <ol>
          <li id="fn-enhancer-1">
            enhancer footnote body
            <a href="#fn-enhancer-1-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    enhanceImageLightboxes(canvasElement);
    enhanceFootnotePopovers(canvasElement);
    await waitFrame();

    const trigger = canvasElement.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]');
    if (!trigger) {
      throw new Error('image zoom trigger が見つかりません');
    }

    trigger.click();
    await waitFrame();

    const dialog = canvasElement.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]');
    if (!dialog) {
      throw new Error('image lightbox dialog が生成されていません');
    }
    if (dialog.getAttribute('aria-modal') !== 'true') {
      throw new Error('image lightbox dialog には aria-modal="true" が必要です');
    }

    const footnoteAnchor = canvasElement.querySelector<HTMLElement>('a[data-footnote-ref]');
    if (!footnoteAnchor) {
      throw new Error('footnote trigger が見つかりません');
    }

    footnoteAnchor.click();
    await waitFrame();

    const popover = canvasElement.querySelector<HTMLElement>('[data-footnote-popover]');
    if (!popover) {
      throw new Error('footnote popover が生成されていません');
    }
    if (footnoteAnchor.getAttribute('aria-expanded') !== 'true') {
      throw new Error('active footnote trigger は aria-expanded="true" を持つ必要があります');
    }
    if (!popover.textContent.includes('enhancer footnote body')) {
      throw new Error('footnote popover に endnotes 由来の本文が複製されていません');
    }
  },
};