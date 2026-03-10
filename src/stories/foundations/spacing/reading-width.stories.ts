import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Spacing/Reading Width',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'ページコンテナと読書コンテナの幅設計を比較し、どこで読書幅を絞るかを明示するストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () =>
    renderFoundationFrame(
      {
        title: 'Reading Width',
        description:
          '一覧やシェルは広く、本文だけが `--width-reading` に従って静かに絞られます。',
      },
      html`
        ${renderFoundationSection(
          'Container Comparison',
          renderTokenSampleGrid([
            {
              label: '.container',
              note: 'アプリケーションシェルや幅広い UI に使用。',
              containerStyle: {
                background: 'var(--bg-surface-1)',
              },
              content: html`
                <div class="container" style="margin-inline: 0; background: var(--bg-fill-muted);">
                  <div style="padding: var(--space-3); border: var(--border-style-subtle);">Wide container</div>
                </div>
              `,
            },
            {
              label: '.container-reading',
              note: '本文と記事メタデータの主舞台。',
              containerStyle: {
                background: 'var(--bg-surface-1)',
              },
              content: html`
                <div class="container-reading" style="margin-inline: 0; background: var(--bg-fill-muted);">
                  <div style="padding: var(--space-3); border: var(--border-style-subtle);">Reading width</div>
                </div>
              `,
            },
          ]),
        )}

        ${renderFoundationSection(
          'Prose Measure',
          html`
            <div class="foundation-stage">
              <div class="container-reading" style="margin-inline: 0;">
                <div class="prose" style="margin-inline: 0;">
                  <p>
                    1 行あたりの情報量を抑え、視線の往復コストを下げるために読み幅を制御します。
                  </p>
                </div>
              </div>
            </div>
          `,
        )}

        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Reading width', token: '--width-reading' },
            { label: 'Reading fallback', token: '--width-reading-fallback' },
            { label: 'Breakpoint md', token: '--bp-md' },
            { label: 'Breakpoint xl', token: '--bp-xl' },
          ]),
        )}
      `,
    ),
};
