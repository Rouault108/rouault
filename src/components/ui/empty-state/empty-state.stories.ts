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
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getContainer = (host: EmptyState): HTMLElement => {
  const container = host.shadowRoot?.querySelector<HTMLElement>('.container');
  if (!container) throw new Error('.container が見つかりません');
  return container;
};

const getActions = (host: EmptyState): HTMLElement => {
  const actions = host.shadowRoot?.querySelector<HTMLElement>('.actions');
  if (!actions) throw new Error('.actions が見つかりません');
  return actions;
};

const getDescription = (host: EmptyState): HTMLElement => {
  const description = host.shadowRoot?.querySelector<HTMLElement>('.description');
  if (!description) throw new Error('.description が見つかりません');
  return description;
};

const getHeading = (host: EmptyState): HTMLElement => {
  const heading = host.shadowRoot?.querySelector<HTMLElement>('.heading');
  if (!heading) throw new Error('.heading が見つかりません');
  return heading;
};

const getIcon = (host: EmptyState): HTMLElement => {
  const icon = host.shadowRoot?.querySelector<HTMLElement>('.icon');
  if (!icon) throw new Error('.icon が見つかりません');
  return icon;
};

const getIllustration = (host: EmptyState): HTMLElement => {
  const illustration = host.shadowRoot?.querySelector<HTMLElement>('.illustration');
  if (!illustration) throw new Error('.illustration が見つかりません');
  return illustration;
};

const isDisplayNone = (element: HTMLElement): boolean => getComputedStyle(element).display === 'none';

const parseRgb = (value: string): [number, number, number] => {
  const normalized = value.trim();
  const match = /^rgba?\((.*)\)$/.exec(normalized);
  if (!match) throw new Error(`サポートされていないカラーフォーマットです: "${value}"`);

  const rawBody = match[1] ?? '';
  const body = rawBody.split('/')[0]?.trim() ?? '';
  const channels = body.includes(',') ? body.split(',') : body.split(/\s+/);
  if (channels.length < 3) throw new Error(`無効な RGB チャネルです: "${value}"`);

  const rgb = channels.slice(0, 3).map((ch) => Number.parseFloat(ch.trim()));
  if (rgb.some((n) => Number.isNaN(n))) throw new Error(`無効な RGB 値です: "${value}"`);
  return [rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0];
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const linearize = (channel: number): number => {
    const sRgb = channel / 255;
    return sRgb <= 0.03928 ? sRgb / 12.92 : ((sRgb + 0.055) / 1.055) ** 2.4;
  };

  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const contrastRatio = (fg: string, bg: string): number => {
  const l1 = relativeLuminance(parseRgb(fg));
  const l2 = relativeLuminance(parseRgb(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
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
- No auto \`aria-label\`; readout comes from visible heading/description text
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
      throw new Error(`data-variant="default" を期待していましたが、実際には "${container.getAttribute('data-variant') ?? 'null'}" でした`);
    }

    if (host.getAttribute('role') !== 'status') {
      throw new Error(`role="status" を期待していましたが、実際には "${host.getAttribute('role') ?? 'null'}" でした`);
    }
    if (host.getAttribute('aria-atomic') !== 'true') {
      throw new Error(`aria-atomic="true" を期待していましたが、実際には "${host.getAttribute('aria-atomic') ?? 'null'}" でした`);
    }
    if (host.hasAttribute('aria-label')) {
      throw new Error('aria-label は自動生成されてはいけません');
    }

    const fallbackIcon = host.shadowRoot?.querySelector<HTMLElement>('iconify-icon.fallback-icon');
    if (!fallbackIcon) throw new Error('フォールバックアイコンがレンダリングされていません');
    if (fallbackIcon.getAttribute('icon') !== 'lucide:inbox') {
      throw new Error(`icon="lucide:inbox" を期待していましたが、実際には "${fallbackIcon.getAttribute('icon') ?? 'null'}" でした`);
    }

    if (!host.hasAttribute('has-description')) {
      throw new Error('説明スロットが指定されている場合、has-description 属性が必要です');
    }
    if (!host.hasAttribute('has-action')) {
      throw new Error('アクションスロットが指定されている場合、has-action 属性が必要です');
    }

    if (isDisplayNone(getDescription(host))) {
      throw new Error('説明文が表示されている必要があります');
    }
    if (isDisplayNone(getActions(host))) {
      throw new Error('アクションが表示されている必要があります');
    }

    const actionButton = host.querySelector<HTMLButtonElement>('button[slot="action"]');
    if (!(actionButton instanceof HTMLButtonElement)) {
      throw new Error('アクションボタンが見つかりません');
    }
    if (actionButton.disabled) {
      throw new Error('アクションボタンが有効である必要があります');
    }
    if (actionButton.tabIndex !== 0) {
      throw new Error('アクションボタンはキーボードでフォーカス可能である必要があります');
    }

    actionButton.focus();
    if (document.activeElement !== actionButton) {
      throw new Error('アクションボタンがフォーカス可能である必要があります');
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
      throw new Error('matrix-default は "default" である必要があります');
    }
    if (getContainer(searchHost).getAttribute('data-variant') !== 'search') {
      throw new Error('matrix-search は "search" である必要があります');
    }
    if (getContainer(errorHost).getAttribute('data-variant') !== 'error') {
      throw new Error('matrix-error は "error" である必要があります');
    }

    if (defaultHost.hasAttribute('aria-label') || searchHost.hasAttribute('aria-label') || errorHost.hasAttribute('aria-label')) {
      throw new Error('どのバリアントでも aria-label は自動生成されてはいけません');
    }

    if (isDisplayNone(getActions(defaultHost))) {
      throw new Error('matrix-default はアクションスロットが表示されている必要があります');
    }
    if (!isDisplayNone(getActions(searchHost))) {
      throw new Error('matrix-search は空のアクションスロットを非表示にする必要があります');
    }
    if (isDisplayNone(getActions(errorHost))) {
      throw new Error('matrix-error はリトライアクションが表示されている必要があります');
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

    if (!host.hasAttribute('has-illustration')) {
      throw new Error('host に has-illustration 属性が設定されている必要があります');
    }

    const illustration = getIllustration(host);
    if (isDisplayNone(illustration)) {
      throw new Error('イラストレーションが割り当てられている場合、ラッパーが表示されている必要があります');
    }

    const icon = getIcon(host);
    if (!isDisplayNone(icon)) {
      throw new Error('イラストレーションが存在する場合、アイコンは非表示である必要があります');
    }

    if (host.hasAttribute('aria-label')) {
      throw new Error('aria-label は自動生成されてはいけません');
    }
  },
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
  play: async ({ canvasElement }) => {
    const h2Host = getHost(canvasElement, 'heading-level-h2');
    const h3Host = getHost(canvasElement, 'heading-level-h3');
    const h4Host = getHost(canvasElement, 'heading-level-h4');
    await Promise.all([h2Host.updateComplete, h3Host.updateComplete, h4Host.updateComplete]);

    const h2 = h2Host.querySelector<HTMLHeadingElement>('h2[slot="heading"]');
    const h3 = h3Host.querySelector<HTMLHeadingElement>('h3[slot="heading"]');
    const h4 = h4Host.querySelector<HTMLHeadingElement>('h4[slot="heading"]');
    if (!(h2 instanceof HTMLHeadingElement)) throw new Error('h2 見出しが見つかりません');
    if (!(h3 instanceof HTMLHeadingElement)) throw new Error('h3 見出しが見つかりません');
    if (!(h4 instanceof HTMLHeadingElement)) throw new Error('h4 見出しが見つかりません');

    if (getHeading(h2Host).getBoundingClientRect().height <= 0) {
      throw new Error('h2 のレイアウトが安定している必要があります');
    }
    if (getHeading(h3Host).getBoundingClientRect().height <= 0) {
      throw new Error('h3 のレイアウトが安定している必要があります');
    }
    if (getHeading(h4Host).getBoundingClientRect().height <= 0) {
      throw new Error('h4 のレイアウトが安定している必要があります');
    }

    if (h2Host.hasAttribute('aria-label') || h3Host.hasAttribute('aria-label') || h4Host.hasAttribute('aria-label')) {
      throw new Error('どの見出しレベルでも aria-label は自動生成されてはいけません');
    }
  },
};

export const DynamicSlotStateSync: Story = {
  render: () => html`
    <ui-empty-state id="dynamic-slot-sync">
      <h2 slot="heading">Slot sync check</h2>
      <p slot="description">Description exists at first render.</p>
      <button slot="action" type="button">Primary action</button>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dynamic-slot-sync');
    await host.updateComplete;

    if (!host.hasAttribute('has-description')) {
      throw new Error('初期状態で has-description が設定されている必要があります');
    }
    if (!host.hasAttribute('has-action')) {
      throw new Error('初期状態で has-action が設定されている必要があります');
    }
    if (host.hasAttribute('has-illustration')) {
      throw new Error('初期状態で has-illustration が設定されていない必要があります');
    }

    const descriptionNode = host.querySelector<HTMLElement>('[slot="description"]');
    const actionNode = host.querySelector<HTMLElement>('[slot="action"]');
    if (!descriptionNode || !actionNode) {
      throw new Error('初期のスロットノードが見つかりません');
    }

    descriptionNode.remove();
    actionNode.remove();
    await host.updateComplete;
    await waitFrame();

    if (host.hasAttribute('has-description')) {
      throw new Error('説明文の削除後、has-description 属性が削除されている必要があります');
    }
    if (host.hasAttribute('has-action')) {
      throw new Error('アクションの削除後、has-action 属性が削除されている必要があります');
    }
    if (!isDisplayNone(getDescription(host))) {
      throw new Error('コンテンツがない場合、説明文ラッパーは非表示である必要があります');
    }
    if (!isDisplayNone(getActions(host))) {
      throw new Error('コンテンツがない場合、アクションラッパーは非表示である必要があります');
    }

    const illustration = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    illustration.setAttribute('slot', 'illustration');
    illustration.setAttribute('viewBox', '0 0 16 16');
    illustration.setAttribute('aria-hidden', 'true');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '8');
    circle.setAttribute('cy', '8');
    circle.setAttribute('r', '7');
    illustration.append(circle);

    host.append(illustration);
    await host.updateComplete;
    await waitFrame();

    if (!host.hasAttribute('has-illustration')) {
      throw new Error('イラストレーションが存在する場合、has-illustration 属性が追加されている必要があります');
    }
    if (!isDisplayNone(getIcon(host))) {
      throw new Error('イラストレーションが存在する場合、アイコンラッパーは非表示である必要があります');
    }

    illustration.remove();
    await host.updateComplete;
    await waitFrame();

    if (host.hasAttribute('has-illustration')) {
      throw new Error('イラストレーションが削除された場合、has-illustration 属性も削除されている必要があります');
    }
  },
};

export const DarkModeContract: Story = {
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
        <iconify-icon slot="icon" icon="lucide:triangle-alert" aria-hidden="true"></iconify-icon>
        <h2 slot="heading">Could not load recent notes</h2>
        <p slot="description">Try again in a moment, or refresh this page.</p>
        <button slot="action" type="button">Retry</button>
      </ui-empty-state>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dark-mode-error');
    await host.updateComplete;

    const surface = canvasElement.querySelector<HTMLElement>('#dark-surface');
    if (!(surface instanceof HTMLElement)) {
      throw new Error('ダークサーフェスコンテナが見つかりません');
    }

    const headingColor = getComputedStyle(getHeading(host)).color;
    const descriptionColor = getComputedStyle(getDescription(host)).color;
    const backgroundColor = getComputedStyle(surface).backgroundColor;

    const headingContrast = contrastRatio(headingColor, backgroundColor);
    const descriptionContrast = contrastRatio(descriptionColor, backgroundColor);

    if (headingContrast < 4.5) {
      throw new Error(`見出しのコントラスト比が WCAG AA を満たしていません: ${String(headingContrast)}`);
    }
    if (descriptionContrast < 4.5) {
      throw new Error(`説明文のコントラスト比が WCAG AA を満たしていません: ${String(descriptionContrast)}`);
    }

    if (host.hasAttribute('aria-label')) {
      throw new Error('ダークモードでも aria-label は自動生成されてはいけません');
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

      <ui-empty-state id="boundary-multi-action" style="max-inline-size: 220px;">
        <h2 slot="heading">Multiple actions should wrap</h2>
        <button slot="action" type="button">Create</button>
        <button slot="action" type="button">Import</button>
        <button slot="action" type="button">Template</button>
      </ui-empty-state>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidVariant = getHost(canvasElement, 'boundary-invalid-variant');
    const emptyDescription = getHost(canvasElement, 'boundary-empty-description');
    const headingRemoval = getHost(canvasElement, 'boundary-heading-removal');
    const multiAction = getHost(canvasElement, 'boundary-multi-action');
    await Promise.all([
      invalidVariant.updateComplete,
      emptyDescription.updateComplete,
      headingRemoval.updateComplete,
      multiAction.updateComplete,
    ]);

    const invalidContainer = getContainer(invalidVariant);
    if (invalidContainer.getAttribute('data-variant') !== 'default') {
      throw new Error('無効なバリアントは default にフォールバックする必要があります');
    }

    const description = getDescription(emptyDescription);
    if (!isDisplayNone(description)) {
      throw new Error('空白文字のみの説明文は空として扱われる必要があります');
    }
    if (emptyDescription.hasAttribute('has-description')) {
      throw new Error('空白文字のみのコンテンツに対して has-description が存在してはいけません');
    }

    const removableHeading = headingRemoval.querySelector<HTMLElement>('[slot="heading"]');
    if (!removableHeading) throw new Error('削除可能な見出しが見つかりません');

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

    if (warnCalls.length === 0) {
      throw new Error('見出しがない場合、少なくとも一度は警告が発生する必要があります');
    }

    const warnedWithHeadingKey = warnCalls.some((args) =>
      args.some((value) => typeof value === 'string' && value.includes('slot="heading"')),
    );
    if (!warnedWithHeadingKey) {
      throw new Error('警告メッセージには slot="heading" が含まれている必要があります');
    }

    const actions = getActions(multiAction);
    if (isDisplayNone(actions)) {
      throw new Error('複数のボタンがある場合もアクションが表示されている必要があります');
    }
    if (getComputedStyle(actions).flexWrap !== 'wrap') {
      throw new Error('アクションコンテナに flex-wrap: wrap が設定されている必要があります');
    }

    const stylesText = String(EmptyState.styles);
    if (!stylesText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('Reduced motion の定義が見つかりません');
    }
    if (!stylesText.includes('animation-duration: 0.01ms')) {
      throw new Error('Reduced motion の所要時間定義が見つかりません');
    }
    if (!stylesText.includes('@media (forced-colors: active)')) {
      throw new Error('Forced colors の定義が見つかりません');
    }
    if (!stylesText.includes('CanvasText')) {
      throw new Error('Forced colors のエラーマッピングには CanvasText を使用する必要があります');
    }
    if (!stylesText.includes('@media print')) {
      throw new Error('Print 用の定義が見つかりません');
    }
    if (!stylesText.includes('translateY(var(--space-2, 8px))')) {
      throw new Error('登場アニメーションのトークン定義が見つかりません');
    }
  },
};
