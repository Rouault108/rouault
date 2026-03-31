import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Note Contracts/Static Primitives',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    rouaultContractKind: 'visual',
    docs: {
      description: {
        component:
          'note 本文 static-first 化後の最終 DOM 契約を、そのまま Storybook 上で検証するストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const DefaultContract: Story = {
  render: () => html`
    <article class="prose" data-note-root>
      <aside data-callout="true" data-callout-kind="tip">
        <div data-callout-content="true">
          <h2 data-callout-heading="true">Callout</h2>
          <div data-callout-body="true"><p>callout は static aside を正本にします。</p></div>
        </div>
      </aside>

      <section data-info-box="true" data-variant="filled" data-density="comfortable">
        <div data-info-box-header="true">
          <h2 data-info-box-heading="true">Info Box</h2>
        </div>
        <div data-info-box-body="true"><p>info-box は static section を正本にします。</p></div>
      </section>

      <blockquote>
        <p>blockquote は native 要素を正本にします。</p>
      </blockquote>

      <div data-table-root="true" role="region" tabindex="0" aria-label="静的テーブル">
        <table>
          <caption>静的テーブル</caption>
          <thead>
            <tr><th>column</th><th>value</th></tr>
          </thead>
          <tbody>
            <tr><td>kind</td><td>static</td></tr>
          </tbody>
        </table>
      </div>

      <figure data-image="true" data-image-zoomable="false">
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="static figure placeholder" />
        <figcaption>image 本体は static figure を正本にします。</figcaption>
      </figure>

      <p>
        footnote 参照
        <a
          id="fn-static-1-ref-1"
          href="#fn-static-1"
          data-footnote-ref="true"
          data-footnote-id="fn-static-1"
          data-footnote-ref-instance="1"
          role="doc-noteref"
        >
          <sup>[1]</sup>
        </a>
      </p>

      <section role="doc-endnotes">
        <h2>脚注</h2>
        <ol>
          <li id="fn-static-1">
            static footnote body
            <a href="#fn-static-1-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
  play: ({ canvasElement }) => {
    const requiredSelectors = [
      '[data-callout]',
      '[data-info-box]',
      'blockquote',
      '[data-table-root] > table',
      'figure[data-image]',
      'a[data-footnote-ref][role="doc-noteref"]',
      'section[role="doc-endnotes"]',
    ];

    for (const selector of requiredSelectors) {
      if (!canvasElement.querySelector(selector)) {
        throw new Error(`${selector} が見つかりません`);
      }
    }

    const forbiddenLegacyTags = [
      'ui-callout',
      'ui-info-box',
      'ui-table',
      'ui-image',
      'ui-footnote',
      'ui-blockquote',
    ];

    for (const selector of forbiddenLegacyTags) {
      if (canvasElement.querySelector(selector)) {
        throw new Error(`${selector} は note static contract へ残してはいけません`);
      }
    }
  },
};