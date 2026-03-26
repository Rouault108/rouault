import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { EmptyState, type EmptyStateAnnounce, type EmptyStateVariant } from './empty-state';
import './empty-state';

const VARIANTS = ['default', 'search', 'error'] as const satisfies EmptyStateVariant[];
const ANNOUNCE_VALUES = ['off', 'polite'] as const satisfies EmptyStateAnnounce[];

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getHost = (canvasElement: Element, id: string): EmptyState => {
  const host = canvasElement.querySelector<EmptyState>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getContainer = (host: EmptyState): HTMLElement => {
  const container = host.shadowRoot?.querySelector<HTMLElement>('.container');
  if (!container) {
    throw new Error('.container が見つかりません');
  }
  return container;
};

const getMessage = (host: EmptyState): HTMLElement => {
  const message = host.shadowRoot?.querySelector<HTMLElement>('.message');
  if (!message) {
    throw new Error('.message が見つかりません');
  }
  return message;
};

const getHeading = (host: EmptyState): HTMLElement => {
  const heading = host.shadowRoot?.querySelector<HTMLElement>('.heading');
  if (!heading) {
    throw new Error('.heading が見つかりません');
  }
  return heading;
};

const getDescription = (host: EmptyState): HTMLElement => {
  const description = host.shadowRoot?.querySelector<HTMLElement>('.description');
  if (!description) {
    throw new Error('.description が見つかりません');
  }
  return description;
};

const getActions = (host: EmptyState): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.actions') ?? null;

const getIcon = (host: EmptyState): HTMLElement => {
  const icon = host.shadowRoot?.querySelector<HTMLElement>('.icon');
  if (!icon) {
    throw new Error('.icon が見つかりません');
  }
  return icon;
};

const getIllustration = (host: EmptyState): HTMLElement => {
  const illustration = host.shadowRoot?.querySelector<HTMLElement>('.illustration');
  if (!illustration) {
    throw new Error('.illustration が見つかりません');
  }
  return illustration;
};

const isDisplayNone = (element: HTMLElement): boolean =>
  getComputedStyle(element).display === 'none';

const parseRgb = (value: string): [number, number, number] => {
  const normalized = value.trim();
  const match = /^rgba?\((.*)\)$/.exec(normalized);
  if (!match) {
    throw new Error(`サポートされていないカラーフォーマットです: "${value}"`);
  }

  const rawBody = match[1] ?? '';
  const body = rawBody.split('/')[0]?.trim() ?? '';
  const channels = body.includes(',') ? body.split(',') : body.split(/\s+/);
  if (channels.length < 3) {
    throw new Error(`無効な RGB チャネルです: "${value}"`);
  }

  const rgb = channels.slice(0, 3).map((ch) => Number.parseFloat(ch.trim()));
  if (rgb.some((n) => Number.isNaN(n))) {
    throw new Error(`無効な RGB 値です: "${value}"`);
  }
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
仕様書準拠の state presenter です。
- 公開入力は \`variant\` と \`announce\`
- スロットは \`heading\`（必須）, \`description\`, \`action\`, \`icon\`, \`illustration\`
- live announcement は \`announce="polite"\` のときだけ \`.message\` に限定して有効化
- \`illustration\` は \`icon\` より優先
- \`icon\` / \`illustration\` 未指定でも text-first 構成を正規入力として扱う
- 内部派生状態は公開 API に含めない
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
    const message = getMessage(host);

    if (host.variant !== 'default' || host.getAttribute('variant') !== 'default') {
      throw new Error('既定 variant は default である必要があります');
    }
    if (host.announce !== 'off' || host.getAttribute('announce') !== 'off') {
      throw new Error('既定 announce は off である必要があります');
    }
    if (container.getAttribute('data-variant') !== 'default') {
      throw new Error('描画結果の variant は default である必要があります');
    }
    if (message.getAttribute('data-announce') !== 'off') {
      throw new Error('メッセージ領域の data-announce は off である必要があります');
    }
    if (message.hasAttribute('role') || message.hasAttribute('aria-live')) {
      throw new Error('announce=off では自動ライブリージョン化してはいけません');
    }
    if (host.hasAttribute('role') || host.hasAttribute('aria-live') || host.hasAttribute('aria-atomic')) {
      throw new Error('ホストにライブリージョン属性を持たせてはいけません');
    }
    if (host.hasAttribute('aria-label')) {
      throw new Error('aria-label は自動生成してはいけません');
    }
    if (isDisplayNone(getDescription(host))) {
      throw new Error('description は表示されている必要があります');
    }

    const actions = getActions(host);
    if (!(actions instanceof HTMLElement)) {
      throw new Error('action がある場合、actions ラッパーが必要です');
    }
    if (actions.getAttribute('aria-labelledby') !== getHeading(host).id) {
      throw new Error('actions は heading を参照している必要があります');
    }
    if (!isDisplayNone(getIcon(host))) {
      throw new Error('icon 未指定時は text-first 構成として icon を表示してはいけません');
    }
  },
};

export const PoliteAnnouncement: Story = {
  render: () => html`
    <ui-empty-state id="polite-announcement" announce="polite" variant="error">
      <h2 slot="heading">Failed to load notes</h2>
      <p slot="description">Check your network and try again.</p>
      <button slot="action" type="button">Retry</button>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'polite-announcement');
    await host.updateComplete;

    const message = getMessage(host);
    if (message.getAttribute('role') !== 'status') {
      throw new Error('announce=polite では message に role="status" が必要です');
    }
    if (message.getAttribute('aria-live') !== 'polite') {
      throw new Error('announce=polite では message に aria-live="polite" が必要です');
    }
    if (message.getAttribute('aria-atomic') !== 'true') {
      throw new Error('announce=polite では message に aria-atomic="true" が必要です');
    }
    if (host.hasAttribute('role') || host.hasAttribute('aria-live')) {
      throw new Error('ライブリージョン属性はホストではなく message にだけ存在すべきです');
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
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'matrix-default');
    const searchHost = getHost(canvasElement, 'matrix-search');
    const errorHost = getHost(canvasElement, 'matrix-error');
    await Promise.all([
      defaultHost.updateComplete,
      searchHost.updateComplete,
      errorHost.updateComplete,
    ]);

    if (getContainer(defaultHost).getAttribute('data-variant') !== 'default') {
      throw new Error('default の意味差が失われています');
    }
    if (getContainer(searchHost).getAttribute('data-variant') !== 'search') {
      throw new Error('search の意味差が失われています');
    }
    if (getContainer(errorHost).getAttribute('data-variant') !== 'error') {
      throw new Error('error の意味差が失われています');
    }
  },
};

export const InvalidVariantCanonicalization: Story = {
  render: () => html`
    <ui-empty-state id="invalid-variant" variant="unknown">
      <h2 slot="heading">Unknown variant fallback</h2>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'invalid-variant');
    await host.updateComplete;

    if (host.variant !== 'default') {
      throw new Error('無効な variant は property 上で default に正規化される必要があります');
    }
    if (host.getAttribute('variant') !== 'default') {
      throw new Error('無効な variant は attribute 上でも default に正規化される必要があります');
    }
    if (getContainer(host).getAttribute('data-variant') !== 'default') {
      throw new Error('描画結果の variant も default に正規化される必要があります');
    }
  },
};

export const InvalidAnnounceCanonicalization: Story = {
  render: () => html`
    <ui-empty-state id="invalid-announce" announce="assertive">
      <h2 slot="heading">Announcement fallback</h2>
      <p slot="description">Invalid announce values must normalize to off.</p>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'invalid-announce');
    await host.updateComplete;

    const message = getMessage(host);
    if (host.announce !== 'off') {
      throw new Error('無効な announce は property 上で off に正規化される必要があります');
    }
    if (host.getAttribute('announce') !== 'off') {
      throw new Error('無効な announce は attribute 上でも off に正規化される必要があります');
    }
    if (message.getAttribute('data-announce') !== 'off') {
      throw new Error('描画結果の announce も off に正規化される必要があります');
    }
    if (message.hasAttribute('role') || message.hasAttribute('aria-live')) {
      throw new Error('announce=off に正規化された場合、ライブリージョン属性は除去される必要があります');
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
      <ui-icon slot="icon" name="inbox" aria-hidden="true"></ui-icon>
      <h2 slot="heading">Use illustration when context needs it</h2>
      <p slot="description">If illustration is provided, icon is suppressed.</p>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'illustration-priority');
    await host.updateComplete;
    await waitFrame();

    if (isDisplayNone(getIllustration(host))) {
      throw new Error('illustration は表示されている必要があります');
    }
    if (!isDisplayNone(getIcon(host))) {
      throw new Error('illustration がある場合、icon は非表示である必要があります');
    }
  },
};

export const TextOnlyState: Story = {
  render: () => html`
    <ui-empty-state id="text-only-state">
      <h2 slot="heading">Nothing to show here yet</h2>
      <p slot="description">Meaning must stand on text alone when no symbolic element is provided.</p>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'text-only-state');
    await host.updateComplete;

    if (!isDisplayNone(getIcon(host))) {
      throw new Error('text-only 構成では icon が表示されてはいけません');
    }
    if (!isDisplayNone(getIllustration(host))) {
      throw new Error('text-only 構成では illustration が表示されてはいけません');
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
    if (!(h2 instanceof HTMLHeadingElement)) {
      throw new Error('h2 見出しが見つかりません');
    }
    if (!(h3 instanceof HTMLHeadingElement)) {
      throw new Error('h3 見出しが見つかりません');
    }
    if (!(h4 instanceof HTMLHeadingElement)) {
      throw new Error('h4 見出しが見つかりません');
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

    if (isDisplayNone(getDescription(host))) {
      throw new Error('初期状態では description が表示されている必要があります');
    }
    if (!(getActions(host) instanceof HTMLElement)) {
      throw new Error('初期状態では actions が存在する必要があります');
    }

    const descriptionNode = host.querySelector<HTMLElement>('[slot="description"]');
    const actionNode = host.querySelector<HTMLElement>('[slot="action"]');
    if (!descriptionNode || !actionNode) {
      throw new Error('初期スロットノードが見つかりません');
    }

    descriptionNode.remove();
    actionNode.remove();
    await host.updateComplete;
    await waitFrame();

    if (!isDisplayNone(getDescription(host))) {
      throw new Error('description 削除後は説明領域が折り畳まれる必要があります');
    }
    if (getActions(host) !== null) {
      throw new Error('action 削除後は actions ラッパーが消える必要があります');
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

    if (isDisplayNone(getIllustration(host))) {
      throw new Error('illustration 追加後は表示される必要があります');
    }
  },
};

export const ActionOrderContract: Story = {
  render: () => html`
    <ui-empty-state id="action-order-contract" style="max-inline-size: 220px;">
      <h2 slot="heading">Choose the first recovery path</h2>
      <button slot="action" type="button">Retry</button>
      <button slot="action" type="button">Open settings</button>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'action-order-contract');
    await host.updateComplete;

    const buttons = host.querySelectorAll<HTMLButtonElement>('button[slot="action"]');
    if (buttons.length !== 2) {
      throw new Error('2 個の action が必要です');
    }
    if (buttons[0]?.textContent.trim() !== 'Retry') {
      throw new Error('先頭 action が第一候補として扱われる必要があります');
    }

    const actions = getActions(host);
    if (!(actions instanceof HTMLElement)) {
      throw new Error('actions ラッパーが見つかりません');
    }
    if (getComputedStyle(actions).flexWrap !== 'wrap') {
      throw new Error('複数 action は折り返し可能である必要があります');
    }
  },
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'description-link-guidance');
    await host.updateComplete;

    const link = host.querySelector<HTMLAnchorElement>('p[slot="description"] a');
    const action = host.querySelector<HTMLButtonElement>('button[slot="action"]');
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('description 内リンクが見つかりません');
    }
    if (!(action instanceof HTMLButtonElement)) {
      throw new Error('主要導線は action に配置されている必要があります');
    }
  },
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'no-public-derived-state');
    await host.updateComplete;

    const forbiddenAttributes = ['has-description', 'has-action', 'has-illustration', 'has-icon'];
    for (const attribute of forbiddenAttributes) {
      if (host.hasAttribute(attribute)) {
        throw new Error(`内部派生状態 ${attribute} をホスト属性として公開してはいけません`);
      }
    }
  },
};

export const VisualDensityContract: Story = {
  render: () => html`
    <ui-empty-state id="visual-density-contract">
      <ui-icon slot="icon" name="inbox" aria-hidden="true"></ui-icon>
      <h2 slot="heading">Keep the message compact</h2>
      <p slot="description">The message block should stay narrow enough to preserve reading rhythm.</p>
      <button slot="action" type="button">Create note</button>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'visual-density-contract');
    await host.updateComplete;

    const message = getMessage(host);
    const description = getDescription(host);
    const actions = getActions(host);
    if (!(actions instanceof HTMLElement)) {
      throw new Error('actions が見つかりません');
    }

    const messageWidth = message.getBoundingClientRect().width;
    const headingBottom = getHeading(host).getBoundingClientRect().bottom;
    const descriptionTop = description.getBoundingClientRect().top;
    const messageBottom = message.getBoundingClientRect().bottom;
    const actionsTop = actions.getBoundingClientRect().top;
    const iconWidth = getIcon(host).getBoundingClientRect().width;

    if (messageWidth > 500) {
      throw new Error(`message 幅が広すぎます: ${String(messageWidth)}`);
    }
    if (descriptionTop - headingBottom < 8) {
      throw new Error('heading と description の間隔は --space-2 以上である必要があります');
    }
    if (actionsTop - messageBottom < 16) {
      throw new Error('message と actions の間隔は --space-4 以上である必要があります');
    }
    if (iconWidth > 32) {
      throw new Error('icon の最大寸法は --icon-xl 以下である必要があります');
    }
  },
};

export const PrintContract: Story = {
  render: () => html`
    <ui-empty-state id="print-contract">
      <svg slot="illustration" viewBox="0 0 120 80" aria-hidden="true">
        <rect x="0" y="0" width="120" height="80" fill="currentColor" opacity="0.12"></rect>
      </svg>
      <h2 slot="heading">The heading must remain meaningful on paper</h2>
      <p slot="description">Supplementary context should remain even when decorative elements disappear.</p>
      <a slot="action" href="/docs/guide">Read guide</a>
      <button slot="action" type="button">Retry</button>
    </ui-empty-state>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'print-contract');
    await host.updateComplete;

    const stylesText = String(EmptyState.styles);
    if (!stylesText.includes('@media print')) {
      throw new Error('print 契約がスタイルに定義されている必要があります');
    }
    if (!stylesText.includes('.icon') || !stylesText.includes('.illustration')) {
      throw new Error('print では象徴要素を落とせる定義が必要です');
    }
    if (!stylesText.includes("::slotted(ui-button)") || !stylesText.includes("::slotted(button)")) {
      throw new Error('print では画面内操作を落とす定義が必要です');
    }

    const actionLink = host.querySelector<HTMLAnchorElement>('a[slot="action"]');
    if (!(actionLink instanceof HTMLAnchorElement)) {
      throw new Error('print でも残せるリンク導線の例が必要です');
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
        <ui-icon slot="icon" name="triangle-alert" aria-hidden="true"></ui-icon>
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
      throw new Error(
        `見出しのコントラスト比が WCAG AA を満たしていません: ${String(headingContrast)}`,
      );
    }
    if (descriptionContrast < 4.5) {
      throw new Error(
        `説明文のコントラスト比が WCAG AA を満たしていません: ${String(descriptionContrast)}`,
      );
    }
  },
};

export const BoundaryConditions: Story = {
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
  play: async ({ canvasElement }) => {
    const emptyDescription = getHost(canvasElement, 'boundary-empty-description');
    const headingRemoval = getHost(canvasElement, 'boundary-heading-removal');
    await Promise.all([emptyDescription.updateComplete, headingRemoval.updateComplete]);

    if (!isDisplayNone(getDescription(emptyDescription))) {
      throw new Error('空白文字のみの description は折り畳まれる必要があります');
    }

    const removableHeading = headingRemoval.querySelector<HTMLElement>('[slot="heading"]');
    if (!removableHeading) {
      throw new Error('削除可能な heading が見つかりません');
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

    if (warnCalls.length === 0) {
      throw new Error('heading 欠落時は少なくとも一度警告される必要があります');
    }

    const warnedWithHeadingKey = warnCalls.some((args) =>
      args.some((value) => typeof value === 'string' && value.includes('slot="heading"')),
    );
    if (!warnedWithHeadingKey) {
      throw new Error('警告メッセージには slot="heading" が含まれている必要があります');
    }

    const stylesText = String(EmptyState.styles);
    if (!stylesText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('reduced motion の定義が見つかりません');
    }
    if (!stylesText.includes('animation-duration: 0.01ms')) {
      throw new Error('reduced motion の所要時間定義が見つかりません');
    }
    if (!stylesText.includes('@media (forced-colors: active)')) {
      throw new Error('forced colors の定義が見つかりません');
    }
    if (!stylesText.includes('CanvasText')) {
      throw new Error('forced colors の error マッピングには CanvasText を使用する必要があります');
    }
    if (!stylesText.includes('translateY(var(--space-2, 8px))')) {
      throw new Error('登場アニメーションの定義が見つかりません');
    }
  },
};
