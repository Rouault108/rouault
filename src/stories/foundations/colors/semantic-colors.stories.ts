import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSwatchGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Colors/Semantic Colors',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '意味論トークンとして使うブランド色・本文色・状態色を俯瞰するためのストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  parameters: { rouaultContractKind: 'visual' },
  render: () =>
    renderFoundationFrame(
      {
        title: 'Semantic Colors',
        description:
          'Rouault の色は飾りではなく意味を持ちます。本文・状態・強調の役割単位で確認します。',
      },
      html`
        ${renderFoundationSection(
          'Brand / Foreground',
          renderTokenSwatchGrid([
            {
              label: 'Primary',
              token: '--primary',
              previewText: 'Primary Action',
              previewStyle: {
                background: 'var(--primary)',
                color: 'var(--on-primary)',
              },
              note: '主要アクションとリンク強調の基準色。',
            },
            {
              label: 'Foreground Default',
              token: '--fg-default',
              previewText: '本文の基準色',
              previewStyle: {
                background: 'var(--bg-surface-2)',
                color: 'var(--fg-default)',
                border: 'var(--border-width) solid var(--border-default)',
              },
            },
            {
              label: 'Foreground Muted',
              token: '--fg-muted',
              previewText: '補助情報',
              previewStyle: {
                background: 'var(--bg-surface-2)',
                color: 'var(--fg-muted)',
                border: 'var(--border-width) solid var(--border-muted)',
              },
            },
          ]),
        )}
        ${renderFoundationSection(
          'Status Colors',
          renderTokenSwatchGrid([
            {
              label: 'Danger',
              token: '--danger / --on-danger',
              previewText: 'Danger',
              previewStyle: {
                background: 'var(--danger)',
                color: 'var(--on-danger)',
              },
            },
            {
              label: 'Success',
              token: '--success / --on-success',
              previewText: 'Success',
              previewStyle: {
                background: 'var(--success)',
                color: 'var(--on-success)',
              },
            },
            {
              label: 'Warning',
              token: '--warning / --on-warning',
              previewText: 'Warning',
              previewStyle: {
                background: 'var(--warning)',
                color: 'var(--on-warning)',
              },
            },
          ]),
          '状態色は banner, toast, callout などの意味論 UI に接続されます。',
        )}
        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Primary', token: '--primary' },
            { label: 'Primary hover', token: '--primary-hover' },
            { label: 'On primary', token: '--on-primary' },
            { label: 'FG default', token: '--fg-default' },
            { label: 'FG muted', token: '--fg-muted' },
            { label: 'FG subtle', token: '--fg-subtle' },
          ]),
        )}
      `,
    ),
  play: ({ canvasElement }) => {
    const storyRoot = canvasElement.querySelector<HTMLElement>('.foundation-story');
    const swatches = canvasElement.querySelectorAll<HTMLElement>('.foundation-card-preview');

    if (!(storyRoot instanceof HTMLElement)) {
      throw new Error('.foundation-story が見つかりません');
    }
    if (swatches.length < 6) {
      throw new Error(
        `6件以上の色サンプルを期待していましたが、実際には ${String(swatches.length)} 件でした`,
      );
    }

    const primaryValue = getComputedStyle(storyRoot).getPropertyValue('--primary').trim();
    const onPrimaryValue = getComputedStyle(storyRoot).getPropertyValue('--on-primary').trim();
    const fgDefaultValue = getComputedStyle(storyRoot).getPropertyValue('--fg-default').trim();

    if (primaryValue.length === 0) {
      throw new Error('--primary が解決できていません');
    }
    if (onPrimaryValue.length === 0) {
      throw new Error('--on-primary が解決できていません');
    }
    if (fgDefaultValue.length === 0) {
      throw new Error('--fg-default が解決できていません');
    }

    const firstSwatch = swatches[0];
    if (!firstSwatch) {
      throw new Error('Primary スウォッチが見つかりません');
    }
    const firstSwatchStyle = getComputedStyle(firstSwatch);
    if (firstSwatchStyle.backgroundColor === 'rgba(0, 0, 0, 0)') {
      throw new Error('Primary スウォッチの背景色が透明です');
    }
  },
};
