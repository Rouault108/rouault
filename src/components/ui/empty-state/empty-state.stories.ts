import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { type EmptyState, type EmptyStateAnnounce, type EmptyStateVariant } from './empty-state';
import './empty-state';

const VARIANTS = ['default', 'search', 'error'] as const satisfies EmptyStateVariant[];
const ANNOUNCE_VALUES = ['off', 'polite'] as const satisfies EmptyStateAnnounce[];

const meta: Meta<EmptyState> = {
  title: 'Components/EmptyState',
  component: 'ui-empty-state',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
仕様書準拠の state presenter です。
- 公開入力は \`variant\` と \`announce\`
- スロットは \`heading\`（必須）, \`description\`, \`action\`, \`icon\`, \`illustration\`
- live announcement は \`announce="polite"\` のときだけ \`.message\` に限定して有効化
- \`illustration\` は \`icon\` より優先
- \`icon\` / \`illustration\` 未指定でも text-first 構成を正規入力として扱う
- 内部派生状態は公開 API に含めない

この story ファイルは **docs / smoke / 手動確認** に限定します。公開 DOM / aria / fallback / slot priority の合否は browser test を正本とし、Storybook は表示見本に縮退します。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      description: '状態種別',
      table: {
        type: { summary: "'default' | 'search' | 'error'" },
        defaultValue: { summary: "'default'" },
      },
    },
    announce: {
      control: 'inline-radio',
      options: ANNOUNCE_VALUES,
      description: '通知モード',
      table: {
        type: { summary: "'off' | 'polite'" },
        defaultValue: { summary: "'off'" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<EmptyState>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`
    <ui-empty-state id="default-empty-state">
      <h2 slot="heading">No notes yet</h2>
      <p slot="description">Create your first note to start your archive.</p>
      <button slot="action" type="button">Create note</button>
    </ui-empty-state>
  `,
};

export const PoliteAnnouncement: Story = {
  render: () => html`
    <ui-empty-state id="polite-announcement" announce="polite" variant="error">
      <h2 slot="heading">Failed to load notes</h2>
      <p slot="description">Check your network and try again.</p>
      <button slot="action" type="button">Retry</button>
    </ui-empty-state>
  `,
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.875rem;
      }
      .cell {
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: 6px;
        padding: 0.875rem;
      }
      .label {
        margin: 0 0 0.625rem;
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, #6e7781);
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <p class="label">default</p>
        <ui-empty-state id="matrix-default" variant="default">
          <h2 slot="heading">No notes yet</h2>
          <p slot="description">Start by creating a new note.</p>
        </ui-empty-state>
      </div>

      <div class="cell">
        <p class="label">search</p>
        <ui-empty-state id="matrix-search" variant="search">
          <ui-icon slot="icon" name="search-x" aria-hidden="true"></ui-icon>
          <h2 slot="heading">No matches for "design token"</h2>
          <p slot="description">Try fewer words or remove quotes.</p>
        </ui-empty-state>
      </div>

      <div class="cell">
        <p class="label">error</p>
        <ui-empty-state id="matrix-error" variant="error">
          <ui-icon slot="icon" name="triangle-alert" aria-hidden="true"></ui-icon>
          <h2 slot="heading">Failed to load notes</h2>
          <p slot="description">Check your network and try again.</p>
          <button slot="action" type="button">Retry</button>
        </ui-empty-state>
      </div>
    </div>
  `,
};

export const InvalidVariantCanonicalization: Story = {
  render: () => html`
    <ui-empty-state id="invalid-variant" variant="unknown">
      <h2 slot="heading">Unknown variant fallback</h2>
    </ui-empty-state>
  `,
};

export const InvalidAnnounceCanonicalization: Story = {
  render: () => html`
    <ui-empty-state id="invalid-announce" announce="assertive">
      <h2 slot="heading">Announcement fallback</h2>
      <p slot="description">Invalid announce values must normalize to off.</p>
    </ui-empty-state>
  `,
};

export const IllustrationPriority: Story = {
  render: () => html`
    <ui-empty-state id="illustration-priority">
      <svg slot="illustration" viewBox="0 0 200 120" aria-hidden="true">
        <rect x="0" y="0" width="200" height="120" fill="currentColor" opacity="0.08"></rect>
        <circle cx="48" cy="60" r="22" fill="currentColor" opacity="0.24"></circle>
        <circle cx="102" cy="60" r="22" fill="currentColor" opacity="0.18"></circle>
        <circle cx="156" cy="60" r="22" fill="currentColor" opacity="0.12"></circle>
      </svg>
      <ui-icon slot="icon" name="inbox" aria-hidden="true"></ui-icon>
      <h2 slot="heading">Use illustration when context needs it</h2>
      <p slot="description">If illustration is provided, icon is suppressed.</p>
    </ui-empty-state>
  `,
};

export const TextOnlyState: Story = {
  render: () => html`
    <ui-empty-state id="text-only-state">
      <h2 slot="heading">Nothing to show here yet</h2>
      <p slot="description">
        Meaning must stand on text alone when no symbolic element is provided.
      </p>
    </ui-empty-state>
  `,
};

export const HeadingLevelFreedom: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-empty-state id="heading-level-h2">
        <h2 slot="heading">Top-level section empty</h2>
      </ui-empty-state>
      <ui-empty-state id="heading-level-h3">
        <h3 slot="heading">Subsection empty</h3>
      </ui-empty-state>
      <ui-empty-state id="heading-level-h4">
        <h4 slot="heading">Nested subsection empty</h4>
      </ui-empty-state>
    </div>
  `,
};

export const DynamicSlotStateSync: Story = {
  render: () => html`
    <ui-empty-state id="dynamic-slot-sync">
      <h2 slot="heading">Slot sync check</h2>
      <p slot="description">Description exists at first render.</p>
      <button slot="action" type="button">Primary action</button>
    </ui-empty-state>
  `,
};

export const ActionOrderExample: Story = {
  render: () => html`
    <ui-empty-state id="action-order-contract" style="max-inline-size: 220px;">
      <h2 slot="heading">Choose the first recovery path</h2>
      <button slot="action" type="button">Retry</button>
      <button slot="action" type="button">Open settings</button>
    </ui-empty-state>
  `,
};

export const DescriptionLinkGuidance: Story = {
  render: () => html`
    <ui-empty-state id="description-link-guidance">
      <h2 slot="heading">No synced sources are connected</h2>
      <p slot="description">
        Read the <a href="/help/sources">setup guide</a> for supported providers.
      </p>
      <button slot="action" type="button">Connect source</button>
    </ui-empty-state>
  `,
};

export const NoPublicDerivedState: Story = {
  render: () => html`
    <ui-empty-state id="no-public-derived-state">
      <ui-icon slot="icon" name="search-x" aria-hidden="true"></ui-icon>
      <h2 slot="heading">No matches</h2>
      <p slot="description">Derived slot state must stay internal.</p>
      <button slot="action" type="button">Reset filters</button>
    </ui-empty-state>
  `,
};

export const VisualDensityReference: Story = {
  render: () => html`
    <ui-empty-state id="visual-density-contract">
      <ui-icon slot="icon" name="inbox" aria-hidden="true"></ui-icon>
      <h2 slot="heading">Keep the message compact</h2>
      <p slot="description">
        The message block should stay narrow enough to preserve reading rhythm.
      </p>
      <button slot="action" type="button">Create note</button>
    </ui-empty-state>
  `,
};

export const PrintReference: Story = {
  render: () => html`
    <ui-empty-state id="print-contract">
      <svg slot="illustration" viewBox="0 0 120 80" aria-hidden="true">
        <rect x="0" y="0" width="120" height="80" fill="currentColor" opacity="0.12"></rect>
      </svg>
      <h2 slot="heading">The heading must remain meaningful on paper</h2>
      <p slot="description">
        Supplementary context should remain even when decorative elements disappear.
      </p>
      <a slot="action" href="/docs/guide">Read guide</a>
      <button slot="action" type="button">Retry</button>
    </ui-empty-state>
  `,
};

export const DarkModePreview: Story = {
  render: () => html`
    <style>
      .dark-surface {
        --fg-default: #f8fafc;
        --fg-muted: #cbd5e1;
        --fg-subtle: #94a3b8;
        --fg-danger: #fda4af;
        --border-default: #334155;

        background: #0b1220;
        color: #f8fafc;
        border-radius: 10px;
        padding: 1rem;
      }
    </style>

    <div id="dark-surface" class="dark-surface">
      <ui-empty-state id="dark-mode-error" variant="error">
        <ui-icon slot="icon" name="triangle-alert" aria-hidden="true"></ui-icon>
        <h2 slot="heading">Could not load recent notes</h2>
        <p slot="description">Try again in a moment, or refresh this page.</p>
        <button slot="action" type="button">Retry</button>
      </ui-empty-state>
    </div>
  `,
};

export const EdgeCases: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-empty-state id="boundary-empty-description">
        <h2 slot="heading">Whitespace description should collapse</h2>
        <p slot="description"></p>
      </ui-empty-state>

      <ui-empty-state id="boundary-heading-removal">
        <h2 slot="heading">Temporary heading</h2>
        <p slot="description">The heading will be removed during play test.</p>
      </ui-empty-state>
    </div>
  `,
};
