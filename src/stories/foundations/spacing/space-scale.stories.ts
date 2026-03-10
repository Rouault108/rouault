import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Spacing/Space Scale',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Spacing トークンの増分と、UI リズムの基準を確認するためのストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const scaleRows = [
  { label: 'Space 1', token: '--space-1', width: 'var(--space-1)' },
  { label: 'Space 2', token: '--space-2', width: 'var(--space-2)' },
  { label: 'Space 3', token: '--space-3', width: 'var(--space-3)' },
  { label: 'Space 4', token: '--space-4', width: 'var(--space-4)' },
  { label: 'Space 6', token: '--space-6', width: 'var(--space-6)' },
  { label: 'Space 8', token: '--space-8', width: 'var(--space-8)' },
  { label: 'Space 12', token: '--space-12', width: 'var(--space-12)' },
  { label: 'Space 16', token: '--space-16', width: 'var(--space-16)' },
  { label: 'Space 20', token: '--space-20', width: 'var(--space-20)' },
] as const;

export const Default: Story = {
  render: () =>
    renderFoundationFrame(
      {
        title: 'Space Scale',
        description:
          'Rouault の間隔は 4px 系列を基準にしつつ、読書体験のリズムに合わせて跳び幅を作っています。',
      },
      html`
        ${renderFoundationSection(
          'Scale Preview',
          renderTokenSampleGrid(
            scaleRows.map((row) => ({
              label: row.label,
              note: row.token,
              containerStyle: {
                alignItems: 'center',
              },
              content: html`
                <div
                  data-space-token=${row.token}
                  style="
                    inline-size: ${row.width};
                    block-size: 0.75rem;
                    border-radius: var(--radius-full);
                    background: var(--primary);
                  "
                ></div>
              `,
            })),
          ),
          '長さそのものと、並べたときの伸び方を同時に確認します。',
        )}

        ${renderFoundationSection(
          'Layout Rhythm Example',
          html`
            <div class="foundation-stage">
              <div style="display: grid; gap: var(--space-4);">
                <div style="padding: var(--space-4); border: var(--border-style-subtle); border-radius: var(--radius-md);">
                  Card padding uses <code>--space-4</code>.
                </div>
                <div style="padding: var(--space-6); border: var(--border-style-subtle); border-radius: var(--radius-md);">
                  Larger callout padding uses <code>--space-6</code>.
                </div>
                <div style="padding-block: var(--space-8); border-top: var(--border-style-subtle);">
                  Section rhythm uses <code>--space-8</code>.
                </div>
              </div>
            </div>
          `,
        )}

        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList(scaleRows.map(({ label, token }) => ({ label, token }))),
        )}
      `,
    ),
  play: ({ canvasElement }) => {
    const first = canvasElement.querySelector<HTMLElement>('[data-space-token="--space-1"]');
    const last = canvasElement.querySelector<HTMLElement>('[data-space-token="--space-20"]');
    const storyRoot = canvasElement.querySelector<HTMLElement>('.foundation-story');

    if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) {
      throw new Error('spacing preview 要素が見つかりません');
    }
    if (!(storyRoot instanceof HTMLElement)) {
      throw new Error('.foundation-story が見つかりません');
    }

    const rootStyle = getComputedStyle(storyRoot);
    const space4 = rootStyle.getPropertyValue('--space-4').trim();
    const space20 = rootStyle.getPropertyValue('--space-20').trim();
    if (space4.length === 0 || space20.length === 0) {
      throw new Error('代表 spacing token が解決できていません');
    }

    const firstWidth = first.getBoundingClientRect().width;
    const lastWidth = last.getBoundingClientRect().width;
    if (firstWidth <= 0) {
      throw new Error(`--space-1 の可視幅が不正です: ${String(firstWidth)}`);
    }
    if (lastWidth <= firstWidth) {
      throw new Error('space scale が増加していません');
    }
  },
};
