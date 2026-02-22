import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { EmptyState, type EmptyStateVariant } from './empty-state';
import './empty-state';

const VARIANTS = ['default', 'search', 'error'] as const satisfies EmptyStateVariant[];

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getHost = (canvasElement: Element, id: string): EmptyState => {
  const host = canvasElement.querySelector<EmptyState>(`#${id}`);
  if (!host) throw new Error(`#${id} was not found`);
  return host;
};

const getContainer = (host: EmptyState): HTMLElement => {
  const container = host.shadowRoot?.querySelector<HTMLElement>('.container');
  if (!container) throw new Error('.container was not found');
  return container;
};

const getActions = (host: EmptyState): HTMLElement => {
  const actions = host.shadowRoot?.querySelector<HTMLElement>('.actions');
  if (!actions) throw new Error('.actions was not found');
  return actions;
};

const getDescription = (host: EmptyState): HTMLElement => {
  const description = host.shadowRoot?.querySelector<HTMLElement>('.description');
  if (!description) throw new Error('.description was not found');
  return description;
};

const getIcon = (host: EmptyState): HTMLElement => {
  const icon = host.shadowRoot?.querySelector<HTMLElement>('.icon');
  if (!icon) throw new Error('.icon was not found');
  return icon;
};

const meta: Meta<EmptyState> = {
  title: 'Components/EmptyState',
  component: 'ui-empty-state',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Minimal empty-state component for content areas.
- Host semantics: \`role="status"\` + \`aria-atomic="true"\`
- Slots: \`heading\` (required), \`description\`, \`action\`, \`icon\`, \`illustration\`
- Variants: \`default | search | error\`
- Illustration has higher priority than icon
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      description: 'Visual variant',
      table: {
        type: { summary: "'default' | 'search' | 'error'" },
        defaultValue: { summary: "'default'" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<EmptyState>;

export const Default: Story = {
  render: () => html`
    <ui-empty-state id="default-empty-state">
      <h2 slot="heading">No notes yet</h2>
      <p slot="description">Create your first note to start your archive.</p>
      <button slot="action" type="button">Create note</button>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-empty-state');
    await host.updateComplete;

    const container = getContainer(host);
    if (container.getAttribute('data-variant') !== 'default') {
      throw new Error('Expected default data-variant');
    }

    if (host.getAttribute('role') !== 'status') {
      throw new Error('Expected role="status" on host');
    }
    if (host.getAttribute('aria-atomic') !== 'true') {
      throw new Error('Expected aria-atomic="true" on host');
    }
    if (host.getAttribute('aria-label') !== 'No notes yet') {
      throw new Error('Expected aria-label to mirror heading slot text');
    }

    const fallbackIcon = host.shadowRoot?.querySelector<HTMLElement>('iconify-icon.fallback-icon');
    if (!fallbackIcon) throw new Error('Fallback icon was not rendered');
    if (fallbackIcon.getAttribute('icon') !== 'lucide:inbox') {
      throw new Error('Fallback icon should be lucide:inbox');
    }

    if (getDescription(host).hidden) {
      throw new Error('Description should be visible');
    }
    if (getActions(host).hidden) {
      throw new Error('Actions should be visible');
    }
  },
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
        <p class="label">default x first content</p>
        <ui-empty-state id="matrix-default" variant="default">
          <h2 slot="heading">No notes yet</h2>
          <p slot="description">Start by creating a new note.</p>
          <button slot="action" type="button">Create note</button>
        </ui-empty-state>
      </div>

      <div class="cell">
        <p class="label">search x no results</p>
        <ui-empty-state id="matrix-search" variant="search">
          <iconify-icon slot="icon" icon="lucide:search-x" aria-hidden="true"></iconify-icon>
          <h2 slot="heading">No matches for "design token"</h2>
          <p slot="description">Try fewer words or remove quotes.</p>
        </ui-empty-state>
      </div>

      <div class="cell">
        <p class="label">error x retry</p>
        <ui-empty-state id="matrix-error" variant="error">
          <iconify-icon slot="icon" icon="lucide:triangle-alert" aria-hidden="true"></iconify-icon>
          <h2 slot="heading">Failed to load notes</h2>
          <p slot="description">Check your network and try again.</p>
          <button slot="action" type="button">Retry</button>
        </ui-empty-state>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'matrix-default');
    const searchHost = getHost(canvasElement, 'matrix-search');
    const errorHost = getHost(canvasElement, 'matrix-error');
    await Promise.all([defaultHost.updateComplete, searchHost.updateComplete, errorHost.updateComplete]);

    if (getContainer(defaultHost).getAttribute('data-variant') !== 'default') {
      throw new Error('matrix-default should resolve to default');
    }
    if (getContainer(searchHost).getAttribute('data-variant') !== 'search') {
      throw new Error('matrix-search should resolve to search');
    }
    if (getContainer(errorHost).getAttribute('data-variant') !== 'error') {
      throw new Error('matrix-error should resolve to error');
    }

    if (defaultHost.getAttribute('aria-label') !== 'No notes yet') {
      throw new Error('matrix-default aria-label mismatch');
    }
    if (searchHost.getAttribute('aria-label') !== 'No matches for "design token"') {
      throw new Error('matrix-search aria-label mismatch');
    }
    if (errorHost.getAttribute('aria-label') !== 'Failed to load notes') {
      throw new Error('matrix-error aria-label mismatch');
    }

    if (getActions(defaultHost).hidden) {
      throw new Error('matrix-default should expose action slot');
    }
    if (!getActions(searchHost).hidden) {
      throw new Error('matrix-search should hide empty action slot');
    }
    if (getActions(errorHost).hidden) {
      throw new Error('matrix-error should expose retry action');
    }
  },
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
      <iconify-icon slot="icon" icon="lucide:inbox" aria-hidden="true"></iconify-icon>
      <h2 slot="heading">Use illustration when context needs it</h2>
      <p slot="description">If illustration is provided, icon is suppressed.</p>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'illustration-priority');
    await host.updateComplete;
    await waitFrame();

    const illustrationSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="illustration"]');
    if (!illustrationSlot) throw new Error('Illustration slot was not found');
    if (illustrationSlot.hidden) {
      throw new Error('Illustration slot should be visible when assigned');
    }

    const icon = getIcon(host);
    if (!icon.hidden) {
      throw new Error('Icon should be hidden when illustration exists');
    }

    if (host.getAttribute('aria-label') !== 'Use illustration when context needs it') {
      throw new Error('Heading text should still map to aria-label');
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-empty-state id="boundary-invalid-variant" variant="unknown">
        <h2 slot="heading">Unknown variant fallback</h2>
      </ui-empty-state>

      <ui-empty-state id="boundary-empty-description">
        <h2 slot="heading">Whitespace description should collapse</h2>
        <p slot="description">   </p>
      </ui-empty-state>

      <ui-empty-state id="boundary-heading-removal">
        <h2 slot="heading">Temporary heading</h2>
        <p slot="description">The heading will be removed during play test.</p>
      </ui-empty-state>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidVariant = getHost(canvasElement, 'boundary-invalid-variant');
    const emptyDescription = getHost(canvasElement, 'boundary-empty-description');
    const headingRemoval = getHost(canvasElement, 'boundary-heading-removal');
    await Promise.all([invalidVariant.updateComplete, emptyDescription.updateComplete, headingRemoval.updateComplete]);

    const invalidContainer = getContainer(invalidVariant);
    if (invalidContainer.getAttribute('data-variant') !== 'default') {
      throw new Error('Invalid variant should fallback to default');
    }

    const description = getDescription(emptyDescription);
    if (!description.hidden) {
      throw new Error('Whitespace-only description should be treated as empty');
    }

    const removableHeading = headingRemoval.querySelector<HTMLElement>('[slot="heading"]');
    if (!removableHeading) throw new Error('Removable heading was not found');
    if (headingRemoval.getAttribute('aria-label') !== 'Temporary heading') {
      throw new Error('Initial aria-label should be set from heading');
    }

    const originalWarn = console.warn;
    const warnCalls: unknown[][] = [];
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args);
    };

    try {
      removableHeading.remove();
      await headingRemoval.updateComplete;
      await waitFrame();
    } finally {
      console.warn = originalWarn;
    }

    if (headingRemoval.hasAttribute('aria-label')) {
      throw new Error('aria-label should be removed when heading slot becomes empty');
    }

    if (warnCalls.length === 0) {
      throw new Error('Missing heading should trigger warning at least once');
    }

    const warnedWithHeadingKey = warnCalls.some((args) =>
      args.some((value) => typeof value === 'string' && value.includes('slot="heading"')),
    );
    if (!warnedWithHeadingKey) {
      throw new Error('Warning message should mention slot="heading"');
    }

    const stylesText = String(EmptyState.styles);
    if (!stylesText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('Reduced motion contract is missing');
    }
    if (!stylesText.includes('@media (forced-colors: active)')) {
      throw new Error('Forced colors contract is missing');
    }
    if (!stylesText.includes('@media print')) {
      throw new Error('Print contract is missing');
    }
    if (!stylesText.includes('translateY(var(--space-2, 8px))')) {
      throw new Error('Entrance animation token contract is missing');
    }
  },
};
