import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './code-preview';
import type { CodePreviewStateChangeDetail } from './code-preview';
import { CodePreview } from './code-preview';
import '../codeblock/codeblock';
import '../code-group/code-group';
import '../button/button';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getPreview = (canvasElement: Element, id: string): CodePreview => {
  const preview = canvasElement.querySelector<CodePreview>(`#${id}`);
  if (!preview) throw new Error(`ui-code-preview#${id} が見つかりません`);
  return preview;
};

const getRoot = (preview: CodePreview): HTMLElement => {
  const root = preview.shadowRoot?.querySelector<HTMLElement>('.root');
  if (!root) throw new Error('.root が見つかりません');
  return root;
};

const getHeader = (preview: CodePreview): HTMLElement => {
  const header = preview.shadowRoot?.querySelector<HTMLElement>('.header');
  if (!header) throw new Error('.header が見つかりません');
  return header;
};

const getPreviewArea = (preview: CodePreview): HTMLElement => {
  const area = preview.shadowRoot?.querySelector<HTMLElement>('.preview-area');
  if (!area) throw new Error('.preview-area が見つかりません');
  return area;
};

const getPreviewFrame = (preview: CodePreview): HTMLElement => {
  const frame = preview.shadowRoot?.querySelector<HTMLElement>('.preview-frame');
  if (!frame) throw new Error('.preview-frame が見つかりません');
  return frame;
};

const getHeaderHeading = (preview: CodePreview): HTMLElement => {
  const heading = preview.shadowRoot?.querySelector<HTMLElement>('.header-heading');
  if (!heading) throw new Error('.header-heading が見つかりません');
  return heading;
};

const getToolbarSlot = (preview: CodePreview): HTMLSlotElement => {
  const toolbarSlot = preview.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="toolbar"]');
  if (!toolbarSlot) throw new Error('toolbar slot が見つかりません');
  return toolbarSlot;
};

const getBuiltInDropdown = (
  preview: CodePreview,
  control: 'theme' | 'surface' | 'viewport',
): HTMLElement => {
  const dropdown = preview.shadowRoot?.querySelector<HTMLElement>(
    `ui-dropdown[data-control="${control}"]`,
  );
  if (!dropdown) throw new Error(`ui-dropdown[data-control="${control}"] が見つかりません`);
  return dropdown;
};

const clickDropdownTrigger = async (dropdown: HTMLElement): Promise<void> => {
  const trigger = dropdown.querySelector<HTMLElement>('ui-button[slot="trigger"]');
  if (!trigger) throw new Error('dropdown trigger が見つかりません');
  const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
  if (!button) throw new Error('dropdown trigger 内の button が見つかりません');
  button.click();
  await waitFrame();
};

const clickDropdownItem = async (dropdown: HTMLElement, value: string): Promise<void> => {
  const item = dropdown.querySelector<HTMLElement>(`ui-menu-item[value="${value}"]`);
  if (!item) throw new Error(`ui-menu-item[value="${value}"] が見つかりません`);
  const button = item.shadowRoot?.querySelector<HTMLButtonElement>('button');
  if (!button) throw new Error('ui-menu-item 内の button が見つかりません');
  button.click();
  await waitFrame();
};

const readCssText = (styles: unknown): string => {
  if (Array.isArray(styles)) {
    return styles.map((style) => readCssText(style)).join('\n');
  }
  if (styles && typeof styles === 'object' && 'cssText' in styles) {
    const cssText = styles.cssText;
    if (typeof cssText === 'string') return cssText;
  }
  return '';
};

const meta: Meta<CodePreview> = {
  title: 'Components/Code Preview',
  component: 'ui-code-preview',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コードプレビューコンポーネントです。UIのレンダリング結果（プレビュー）とソースコードを一体化して提示します。

## このストーリーで検証する観点
- ビジュアル階層（Sunken Method）：プレビュー領域 Surface vs コード領域 Valley
- Breakout パターンが \`ui-syntax-card\` / \`ui-code-block\` と同一であること
- 子コンポーネントの breakout 無効化（CSS 変数伝播）
- ヘッダー表示条件：\`heading\` 非空 OR built-in controls 有効 OR \`toolbar\` スロットに有効ノードが存在
- built-in showcase controls（theme / surface / viewport）
- \`preview-padding\` の3値（normal/compact/none）の余白制御
- \`preview-align\` の3値（center/start/stretch）の配置制御
- A11y：ルートに \`role="group"\` と日本語 \`aria-label\`（フォールバック含む）
- Forced Colors フォールバック定義
- 印刷スタイル契約
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<CodePreview>;

/**
 * 基本構成。プレビュー（ボタン）と Code Block が縦積みで表示されます。
 * 見出し・ツールバーともに未設定のためヘッダーは非表示です。
 */
export const BasicWithCodeBlock: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="basic-block-preview"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview">
          <ui-button>クリックしてください</ui-button>
        </div>
        <ui-code-block layout="inline" filename="example.ts" lang="ts">
          <pre><code>import './button';
// &lt;ui-button&gt;クリックしてください&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'basic-block-preview');
    await preview.updateComplete;
    await waitFrame();

    // ヘッダーは data-show-header がないため非表示
    if (preview.hasAttribute('data-show-header')) {
      throw new Error('見出し・ツールバー未設定時に data-show-header が付与されています');
    }

    // ルートに role="group" と aria-label が設定されている
    const root = getRoot(preview);
    if (root.getAttribute('role') !== 'group') {
      throw new Error('ルートに role="group" が設定されていません');
    }
    if (root.getAttribute('aria-label') !== 'コード プレビュー') {
      throw new Error(
        `フォールバック aria-label が不正です: "${root.getAttribute('aria-label') ?? ''}"`,
      );
    }

    // プレビュー領域が存在することをスローで保証（getPreviewArea は見つからなければ throw）
    getPreviewArea(preview);

    // preview スロットに内容がスロットされている
    const previewSlot = preview.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="preview"]');
    if (!previewSlot) throw new Error('preview slot が見つかりません');
    const previewSlotted = previewSlot.assignedElements({ flatten: true });
    if (previewSlotted.length === 0) {
      throw new Error('preview スロットに要素がスロットされていません');
    }

    // デフォルトスロット（コードエリア）に内容がスロットされている
    const defaultSlot = preview.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    if (!defaultSlot) throw new Error('default slot が見つかりません');
    const defaultSlotted = defaultSlot.assignedElements({ flatten: true });
    if (defaultSlotted.length === 0) {
      throw new Error('code-area スロットに要素がスロットされていません');
    }
  },
};

/**
 * Code Group を子コンポーネントとして持つ構成。
 * 複数タブの比較コードをプレビューと一体化して表示します。
 */
export const BasicWithCodeGroup: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="basic-group-preview"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview" style="display: flex; gap: 1rem;">
          <ui-button>Primary</ui-button>
          <ui-button>Secondary</ui-button>
        </div>
        <ui-code-group aria-label="ボタンのコード例">
          <ui-code-block group-key="primary" tab-label="Primary" filename="primary.ts" lang="ts">
            <pre><code>// &lt;ui-button&gt;Primary&lt;/ui-button&gt;</code></pre>
          </ui-code-block>
          <ui-code-block
            group-key="secondary"
            tab-label="Secondary"
            filename="secondary.ts"
            lang="ts"
          >
            <pre><code>// &lt;ui-button variant="secondary"&gt;Secondary&lt;/ui-button&gt;</code></pre>
          </ui-code-block>
        </ui-code-group>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'basic-group-preview');
    await preview.updateComplete;
    await waitFrame();

    // Code Group がスロットされている
    const defaultSlot = preview.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    if (!defaultSlot) throw new Error('default slot が見つかりません');
    const slotted = defaultSlot.assignedElements({ flatten: true });
    const hasGroup = slotted.some((el) => el.tagName.toLowerCase() === 'ui-code-group');
    if (!hasGroup) {
      throw new Error('ui-code-group がスロットされていません');
    }
  },
};

/**
 * `heading` のみ設定。ヘッダー領域が表示され見出しテキストが描画されます。
 * ツールバーなしの場合のヘッダー表示境界を検証します。
 */
export const HeaderWithHeadingOnly: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="heading-only-preview"
        heading="ボタンの使用例"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview">
          <ui-button>クリック</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// &lt;ui-button&gt;クリック&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'heading-only-preview');
    await preview.updateComplete;
    await waitFrame();

    if (!preview.hasAttribute('data-show-header')) {
      throw new Error('heading 設定時に data-show-header が付与されていません');
    }
    if (!preview.hasAttribute('data-has-heading')) {
      throw new Error('heading 設定時に data-has-heading が付与されていません');
    }

    const header = getHeader(preview);
    const headerStyle = getComputedStyle(header);
    if (headerStyle.display === 'none') {
      throw new Error('ヘッダーが表示されていません（display: none）');
    }

    const headingEl = getHeaderHeading(preview);
    if (headingEl.textContent.trim() !== 'ボタンの使用例') {
      throw new Error(`ヘッダー見出しのテキストが不正です: "${headingEl.textContent.trim()}"`);
    }

    // aria-label は見出し値を使用
    const root = getRoot(preview);
    if (root.getAttribute('aria-label') !== 'ボタンの使用例') {
      throw new Error(
        `heading 設定時の aria-label が不正です: "${root.getAttribute('aria-label') ?? ''}"`,
      );
    }
  },
};

/**
 * `toolbar` スロットのみ設定。見出しなしでもヘッダーが表示されます。
 * toolbar スロット検出による動的ヘッダー表示境界を検証します。
 */
export const HeaderWithToolbarOnly: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="toolbar-only-preview"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <ui-button slot="toolbar" variant="ghost" size="sm" icon-only aria-label="テーマ切替">
          <iconify-icon icon="lucide:sun-moon"></iconify-icon>
        </ui-button>
        <div slot="preview">
          <ui-button>クリック</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// &lt;ui-button&gt;クリック&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'toolbar-only-preview');
    await preview.updateComplete;
    await waitFrame();

    // toolbar スロットにコンテンツがあるため data-show-header が付与される
    if (!preview.hasAttribute('data-show-header')) {
      throw new Error('toolbar スロット設定時に data-show-header が付与されていません');
    }

    // 見出しはないため data-has-heading は付与されない
    if (preview.hasAttribute('data-has-heading')) {
      throw new Error('heading 未設定時に data-has-heading が付与されています');
    }

    // ヘッダー見出し要素は非表示のはず
    const headingEl = getHeaderHeading(preview);
    const headingStyle = getComputedStyle(headingEl);
    if (headingStyle.display !== 'none') {
      throw new Error('heading 未設定時に見出し要素が表示されています');
    }

    // ツールバーは CSS 契約として右寄せ指定されている
    const headerToolbar = preview.shadowRoot?.querySelector<HTMLElement>('.header-toolbar');
    if (!headerToolbar) throw new Error('.header-toolbar が見つかりません');
    const cssText = readCssText(CodePreview.styles);
    if (!cssText.includes('margin-inline-start: auto')) {
      throw new Error('toolbar-only 時の右寄せ契約が CSS に定義されていません');
    }

    // toolbar 内操作要素の最小ターゲットサイズ（24x24）を満たす
    const toolbarSlot = getToolbarSlot(preview);
    const toolbarControl = toolbarSlot.assignedElements({ flatten: true })[0];
    if (!toolbarControl) {
      throw new Error('toolbar スロットに操作要素がありません');
    }
    const toolbarControlStyle = getComputedStyle(toolbarControl);
    const minInline = Number.parseFloat(toolbarControlStyle.minInlineSize);
    const minBlock = Number.parseFloat(toolbarControlStyle.minBlockSize);
    if (minInline < 24 || minBlock < 24) {
      throw new Error(
        `toolbar 操作要素の最小サイズが不足しています: ${String(minInline)}x${String(minBlock)}`,
      );
    }

    // フォールバック aria-label が使用されている
    const root = getRoot(preview);
    if (root.getAttribute('aria-label') !== 'コード プレビュー') {
      throw new Error(
        `toolbar のみの場合の aria-label が不正です: "${root.getAttribute('aria-label') ?? ''}"`,
      );
    }
  },
};

/**
 * `heading` と `toolbar` の両方を設定。
 * 見出しが左、ツールバーが右に配置されます。
 */
export const HeaderWithHeadingAndToolbar: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="full-header-preview"
        heading="インタラクティブな例"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <ui-button slot="toolbar" variant="ghost" size="sm" icon-only aria-label="ダークモード切替">
          <iconify-icon icon="lucide:sun-moon"></iconify-icon>
        </ui-button>
        <div slot="preview">
          <ui-button>クリック</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// &lt;ui-button&gt;クリック&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'full-header-preview');
    await preview.updateComplete;
    await waitFrame();

    if (!preview.hasAttribute('data-show-header')) {
      throw new Error('data-show-header が付与されていません');
    }
    if (!preview.hasAttribute('data-has-heading')) {
      throw new Error('data-has-heading が付与されていません');
    }

    const headingEl = getHeaderHeading(preview);
    if (headingEl.textContent.trim() !== 'インタラクティブな例') {
      throw new Error('見出しテキストが不正です');
    }

    // toolbar スロットに要素がある
    const toolbarSlot = preview.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="toolbar"]');
    if (!toolbarSlot) throw new Error('toolbar slot が見つかりません');
    if (toolbarSlot.assignedElements({ flatten: true }).length === 0) {
      throw new Error('toolbar スロットに要素がスロットされていません');
    }
  },
};

/**
 * built-in controls のみ設定。見出しなしでもヘッダーが表示されます。
 * Markdown 公開文法向けの opt-in controls 境界を検証します。
 */
export const HeaderWithBuiltInControlsOnly: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 900px;">
      <ui-code-preview
        id="builtins-only-preview"
        controls="theme surface viewport"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview">
          <ui-button>クリック</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// &lt;ui-button&gt;クリック&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'builtins-only-preview');
    await preview.updateComplete;
    await waitFrame();

    if (!preview.hasAttribute('data-show-header')) {
      throw new Error('built-in controls 設定時に data-show-header が付与されていません');
    }
    if (preview.hasAttribute('data-has-heading')) {
      throw new Error('heading 未設定時に data-has-heading が付与されています');
    }

    getBuiltInDropdown(preview, 'theme');
    getBuiltInDropdown(preview, 'surface');
    getBuiltInDropdown(preview, 'viewport');

    const root = getRoot(preview);
    if (root.getAttribute('aria-label') !== 'コード プレビュー') {
      throw new Error('built-in controls のみの場合の aria-label が不正です');
    }
  },
};

/**
 * built-in showcase controls の契約。
 * theme / surface / viewport の切替が preview 側だけに反映されることを検証します。
 */
export const BuiltInShowcaseControlsContract: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 960px;">
      <ui-code-preview
        id="showcase-controls-preview"
        controls="theme surface viewport"
        preview-theme="page"
        preview-surface="surface"
        preview-viewport="full"
        heading="Showcase Controls"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div id="showcase-preview-host" slot="preview" style="padding: 1rem; border-radius: 8px;">
          <ui-button>Preview Button</ui-button>
        </div>
        <ui-code-block id="showcase-code-block" layout="inline" filename="button.ts" lang="ts">
          <pre><code>// &lt;ui-button&gt;Preview Button&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'showcase-controls-preview');
    const previewHost = canvasElement.querySelector<HTMLElement>('#showcase-preview-host');
    const codeBlock = canvasElement.querySelector<HTMLElement>('#showcase-code-block');
    if (!previewHost || !codeBlock) {
      throw new Error('showcase controls の検証対象が見つかりません');
    }

    await preview.updateComplete;
    await waitFrame();

    const stateChangeEvents: CodePreviewStateChangeDetail[] = [];
    preview.addEventListener('ui-code-preview-state-change', (event) => {
      stateChangeEvents.push((event as CustomEvent<CodePreviewStateChangeDetail>).detail);
    });

    const previewArea = getPreviewArea(preview);
    const previewFrame = getPreviewFrame(preview);
    const initialPreviewToken = getComputedStyle(previewHost)
      .getPropertyValue('--bg-default')
      .trim();
    const initialCodeToken = getComputedStyle(codeBlock).getPropertyValue('--bg-default').trim();
    const initialPreviewAreaBg = getComputedStyle(previewArea).backgroundColor;
    const initialFrameWidth = Number.parseFloat(getComputedStyle(previewFrame).width);

    const themeDropdown = getBuiltInDropdown(preview, 'theme');
    await clickDropdownTrigger(themeDropdown);
    await clickDropdownItem(themeDropdown, 'dark');
    await preview.updateComplete;
    await waitFrame();

    if (preview.getAttribute('preview-theme') !== 'dark') {
      throw new Error('theme control の選択が preview-theme 属性へ反映されていません');
    }
    const themeEvent = stateChangeEvents.shift();
    if (!themeEvent) {
      throw new Error('theme control 変更時に state-change が送出されていません');
    }
    if (!themeEvent.userInitiated || themeEvent.keys[0] !== 'previewTheme') {
      throw new Error('theme control の state-change detail が不正です');
    }

    const darkPreviewToken = getComputedStyle(previewHost).getPropertyValue('--bg-default').trim();
    const darkCodeToken = getComputedStyle(codeBlock).getPropertyValue('--bg-default').trim();
    if (darkPreviewToken === initialPreviewToken) {
      throw new Error('theme control 切替後も preview slot のトークンが変化していません');
    }
    if (darkCodeToken !== initialCodeToken) {
      throw new Error('theme control が code area のトークンまで変更しています');
    }

    const surfaceDropdown = getBuiltInDropdown(preview, 'surface');
    await clickDropdownTrigger(surfaceDropdown);
    await clickDropdownItem(surfaceDropdown, 'muted');
    await preview.updateComplete;
    await waitFrame();

    if (preview.getAttribute('preview-surface') !== 'muted') {
      throw new Error('surface control の選択が preview-surface 属性へ反映されていません');
    }
    const surfaceEvent = stateChangeEvents.shift();
    if (!surfaceEvent) {
      throw new Error('surface control 変更時に state-change が送出されていません');
    }
    if (!surfaceEvent.userInitiated || surfaceEvent.keys[0] !== 'previewSurface') {
      throw new Error('surface control の state-change detail が不正です');
    }

    const mutedPreviewAreaBg = getComputedStyle(previewArea).backgroundColor;
    const mutedPreviewToken = getComputedStyle(previewHost).getPropertyValue('--bg-default').trim();
    if (mutedPreviewAreaBg === initialPreviewAreaBg) {
      throw new Error('surface control 切替後も preview-area 背景色が変化していません');
    }
    if (mutedPreviewToken === darkPreviewToken) {
      throw new Error('surface control 切替後も preview slot の背景コンテキストが変化していません');
    }

    const viewportDropdown = getBuiltInDropdown(preview, 'viewport');
    await clickDropdownTrigger(viewportDropdown);
    await clickDropdownItem(viewportDropdown, 'mobile');
    await preview.updateComplete;
    await waitFrame();

    if (preview.getAttribute('preview-viewport') !== 'mobile') {
      throw new Error('viewport control の選択が preview-viewport 属性へ反映されていません');
    }
    const viewportEvent = stateChangeEvents.shift();
    if (!viewportEvent) {
      throw new Error('viewport control 変更時に state-change が送出されていません');
    }
    if (!viewportEvent.userInitiated || viewportEvent.keys[0] !== 'previewViewport') {
      throw new Error('viewport control の state-change detail が不正です');
    }

    const resolvedFrameWidth = getComputedStyle(preview)
      .getPropertyValue('--_ui-code-preview-frame-width')
      .trim();
    if (resolvedFrameWidth !== '375px') {
      throw new Error(`mobile viewport の frame 幅変数が不正です: ${resolvedFrameWidth}`);
    }

    const mobileWidth = Number.parseFloat(getComputedStyle(previewFrame).width);
    if (mobileWidth >= initialFrameWidth) {
      throw new Error(
        `mobile viewport の preview-frame 幅が縮小していません: ${String(mobileWidth)}px`,
      );
    }

    preview.previewTheme = 'light';
    await preview.updateComplete;
    await waitFrame();

    const externalThemeEvent = stateChangeEvents.shift();
    if (!externalThemeEvent) {
      throw new Error('外部 property 更新時に state-change が送出されていません');
    }
    if (externalThemeEvent.userInitiated) {
      throw new Error('外部 property 更新の state-change が userInitiated=true になっています');
    }
  },
};

/**
 * built-in controls と internal toolbar slot の共存契約。
 * built-in controls を先、slot 内容を後に表示できることを検証します。
 */
export const BuiltInControlsWithToolbarSlot: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 900px;">
      <ui-code-preview
        id="controls-with-toolbar-preview"
        controls="theme surface"
        heading="Toolbar Coexist"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <ui-button slot="toolbar" variant="ghost" size="sm" icon-only aria-label="外部アクション">
          <iconify-icon icon="lucide:settings-2"></iconify-icon>
        </ui-button>
        <div slot="preview">
          <ui-button>プレビュー</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// toolbar coexist</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'controls-with-toolbar-preview');
    await preview.updateComplete;
    await waitFrame();

    const headerTools = preview.shadowRoot?.querySelector<HTMLElement>('.header-tools');
    if (!headerTools) throw new Error('.header-tools が見つかりません');

    const themeDropdown = getBuiltInDropdown(preview, 'theme');
    const surfaceDropdown = getBuiltInDropdown(preview, 'surface');
    const toolbarSlot = getToolbarSlot(preview);
    if (toolbarSlot.assignedElements({ flatten: true }).length !== 1) {
      throw new Error('toolbar slot の要素数が不正です');
    }

    const controlNodes = Array.from(headerTools.children);
    if (controlNodes[0] !== themeDropdown || controlNodes[1] !== surfaceDropdown) {
      throw new Error('built-in controls が toolbar slot より前に配置されていません');
    }

    const toolbarIndex = controlNodes.findIndex((node) =>
      node.classList.contains('header-toolbar'),
    );
    if (toolbarIndex < 0 || toolbarIndex < 2) {
      throw new Error('header-toolbar が built-in controls の後ろに配置されていません');
    }
  },
};

/**
 * ヘッダー非表示の境界。
 * heading が空かつ toolbar スロットが空の場合、ヘッダーが描画されないことを検証します。
 */
export const HeaderHiddenBoundary: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="no-header-preview"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview">
          <ui-button>コンテンツ</ui-button>
        </div>
        <ui-code-block layout="inline" filename="example.ts" lang="ts">
          <pre><code>const value = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'no-header-preview');
    await preview.updateComplete;
    await waitFrame();

    // data-show-header が付与されていない
    if (preview.hasAttribute('data-show-header')) {
      throw new Error('heading・toolbar ともに空の場合に data-show-header が付与されています');
    }
    if (preview.hasAttribute('data-has-heading')) {
      throw new Error('heading が空の場合に data-has-heading が付与されています');
    }

    // ヘッダー要素は DOM に存在するが display: none で非表示
    const header = getHeader(preview);
    const headerStyle = getComputedStyle(header);
    if (headerStyle.display !== 'none') {
      throw new Error(`ヘッダーが非表示になっていません: display="${headerStyle.display}"`);
    }

    // プレビュー領域は正常に描画されている
    const previewArea = getPreviewArea(preview);
    const areaStyle = getComputedStyle(previewArea);
    if (areaStyle.display === 'none') {
      throw new Error('preview-area が非表示になっています');
    }
  },
};

/**
 * `preview-padding` の3値バリアント。
 * normal / compact / none それぞれの余白が正しく適用されることを検証します。
 */
export const PreviewPaddingVariants: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 2rem; max-width: 720px;">
      <div>
        <p style="font-size: 12px; margin-bottom: 8px;">normal（既定値）</p>
        <ui-code-preview
          id="padding-normal"
          heading="padding: normal"
          preview-padding="normal"
          style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
        >
          <div slot="preview"><ui-button>ボタン</ui-button></div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const a = 1;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>

      <div>
        <p style="font-size: 12px; margin-bottom: 8px;">compact</p>
        <ui-code-preview
          id="padding-compact"
          heading="padding: compact"
          preview-padding="compact"
          style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
        >
          <div slot="preview"><ui-button>ボタン</ui-button></div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const a = 1;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>

      <div>
        <p style="font-size: 12px; margin-bottom: 8px;">none（エッジツーエッジ）</p>
        <ui-code-preview
          id="padding-none"
          heading="padding: none"
          preview-padding="none"
          style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
        >
          <div slot="preview" style="width: 100%; background: oklch(90% 0.03 250); padding: 1rem;">
            エッジツーエッジのコンテンツ
          </div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const a = 1;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await waitFrame();

    const normalPreview = getPreview(canvasElement, 'padding-normal');
    const compactPreview = getPreview(canvasElement, 'padding-compact');
    const nonePreview = getPreview(canvasElement, 'padding-none');

    await Promise.all([
      normalPreview.updateComplete,
      compactPreview.updateComplete,
      nonePreview.updateComplete,
    ]);
    await waitFrame();

    // normal: preview-padding 属性が "normal" で反映されている
    if (normalPreview.getAttribute('preview-padding') !== 'normal') {
      throw new Error('normal の preview-padding 属性が正しく反映されていません');
    }

    // compact: preview-padding 属性が "compact" で反映されている
    if (compactPreview.getAttribute('preview-padding') !== 'compact') {
      throw new Error('compact の preview-padding 属性が正しく反映されていません');
    }

    // none: preview-padding 属性が "none" で反映されている
    if (nonePreview.getAttribute('preview-padding') !== 'none') {
      throw new Error('none の preview-padding 属性が正しく反映されていません');
    }

    // compact の padding は normal より小さいこと
    const normalArea = getPreviewArea(normalPreview);
    const compactArea = getPreviewArea(compactPreview);
    const normalPadding = Number.parseFloat(getComputedStyle(normalArea).paddingBottom);
    const compactPadding = Number.parseFloat(getComputedStyle(compactArea).paddingBottom);
    if (normalPadding <= compactPadding) {
      throw new Error(
        `compact padding (${String(compactPadding)}px) が normal padding (${String(normalPadding)}px) 以上になっています`,
      );
    }

    // none の padding は 0 であること
    const noneArea = getPreviewArea(nonePreview);
    const nonePadding = Number.parseFloat(getComputedStyle(noneArea).paddingBottom);
    if (nonePadding !== 0) {
      throw new Error(`none の padding が 0 ではありません: ${String(nonePadding)}px`);
    }
  },
};

/**
 * 不正な `preview-padding` 値はデフォルト（normal）にフォールバックします。
 * バリデーション境界を検証します。
 */
export const InvalidPaddingFallback: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="invalid-padding-preview"
        heading="不正値フォールバック"
        preview-padding="invalid-value"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'invalid-padding-preview');
    await preview.updateComplete;
    await waitFrame();

    // 不正値は "normal" にリセットされる
    if (preview.getAttribute('preview-padding') !== 'normal') {
      throw new Error(
        `不正な preview-padding 値が normal にフォールバックしていません: "${preview.getAttribute('preview-padding') ?? ''}"`,
      );
    }
  },
};

/**
 * 不正な `preview-align` 値はデフォルト（center）にフォールバックします。
 * バリデーション境界を検証します。
 */
export const InvalidAlignFallback: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="invalid-align-preview"
        heading="不正 align 値フォールバック"
        preview-align="invalid-value"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'invalid-align-preview');
    await preview.updateComplete;
    await waitFrame();

    if (preview.getAttribute('preview-align') !== 'center') {
      throw new Error(
        `不正な preview-align 値が center にフォールバックしていません: "${preview.getAttribute('preview-align') ?? ''}"`,
      );
    }
  },
};

/**
 * toolbar 操作要素のターゲットサイズ契約。
 * 最低 24x24px、coarse pointer では 44x44px 指定が CSS に定義されていることを検証します。
 */
export const ToolbarTargetSizeContract: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="toolbar-target-size-preview"
        heading="Toolbar Target Size 検証"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <ui-button slot="toolbar" variant="ghost" size="sm" icon-only aria-label="テーマ切替">
          <iconify-icon icon="lucide:sun-moon"></iconify-icon>
        </ui-button>
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'toolbar-target-size-preview');
    await preview.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodePreview.styles);
    const requiredTokens = [
      "::slotted(button[slot='toolbar'])",
      "::slotted(a[slot='toolbar'])",
      "::slotted([role='button'][slot='toolbar'])",
      'min-inline-size: 24px',
      'min-block-size: 24px',
      '@media (pointer: coarse)',
      'min-inline-size: var(--control-min-touch, 24px)',
      'min-block-size: var(--control-min-touch, 24px)',
    ];

    for (const token of requiredTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`toolbar ターゲットサイズ契約の定義が不足しています: ${token}`);
      }
    }
  },
};

/**
 * `preview-align` の3値バリアント。
 * center / start / stretch それぞれの配置が正しく適用されることを検証します。
 */
export const PreviewAlignVariants: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 2rem; max-width: 720px;">
      <div>
        <p style="font-size: 12px; margin-bottom: 8px;">center（既定値）</p>
        <ui-code-preview
          id="align-center"
          heading="align: center"
          preview-align="center"
          style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
        >
          <ui-button slot="preview">中央揃え</ui-button>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const a = 1;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>

      <div>
        <p style="font-size: 12px; margin-bottom: 8px;">start</p>
        <ui-code-preview
          id="align-start"
          heading="align: start"
          preview-align="start"
          style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
        >
          <ui-button slot="preview">左上揃え</ui-button>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const a = 1;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>

      <div>
        <p style="font-size: 12px; margin-bottom: 8px;">stretch</p>
        <ui-code-preview
          id="align-stretch"
          heading="align: stretch"
          preview-align="stretch"
          preview-padding="none"
          style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
        >
          <div
            id="align-stretch-content"
            slot="preview"
            style="background: oklch(92% 0.02 250); padding: 1rem; text-align: center;"
          >
            stretch コンテンツ
          </div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const a = 1;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await waitFrame();

    const centerPreview = getPreview(canvasElement, 'align-center');
    const startPreview = getPreview(canvasElement, 'align-start');
    const stretchPreview = getPreview(canvasElement, 'align-stretch');

    await Promise.all([
      centerPreview.updateComplete,
      startPreview.updateComplete,
      stretchPreview.updateComplete,
    ]);
    await waitFrame();

    // preview-align 属性が正しく反映されている
    if (centerPreview.getAttribute('preview-align') !== 'center') {
      throw new Error('center の preview-align 属性が正しく反映されていません');
    }
    if (startPreview.getAttribute('preview-align') !== 'start') {
      throw new Error('start の preview-align 属性が正しく反映されていません');
    }
    if (stretchPreview.getAttribute('preview-align') !== 'stretch') {
      throw new Error('stretch の preview-align 属性が正しく反映されていません');
    }

    // center の場合: align-items: center
    const centerArea = getPreviewArea(centerPreview);
    const centerAreaStyle = getComputedStyle(centerArea);
    if (centerAreaStyle.alignItems !== 'center') {
      throw new Error(`center 時の align-items が不正です: "${centerAreaStyle.alignItems}"`);
    }
    if (centerAreaStyle.justifyContent !== 'center') {
      throw new Error(
        `center 時の justify-content が不正です: "${centerAreaStyle.justifyContent}"`,
      );
    }

    // start の場合: align-items: flex-start
    const startArea = getPreviewArea(startPreview);
    const startAreaStyle = getComputedStyle(startArea);
    if (startAreaStyle.alignItems !== 'flex-start') {
      throw new Error(`start 時の align-items が不正です: "${startAreaStyle.alignItems}"`);
    }
    if (startAreaStyle.justifyContent !== 'flex-start') {
      throw new Error(`start 時の justify-content が不正です: "${startAreaStyle.justifyContent}"`);
    }

    // stretch の場合: align-items: stretch
    const stretchArea = getPreviewArea(stretchPreview);
    const stretchAreaStyle = getComputedStyle(stretchArea);
    if (stretchAreaStyle.alignItems !== 'stretch') {
      throw new Error(`stretch 時の align-items が不正です: "${stretchAreaStyle.alignItems}"`);
    }

    // stretch 時は preview コンテンツが親幅いっぱいになる
    const stretchContent = canvasElement.querySelector<HTMLElement>('#align-stretch-content');
    if (!stretchContent) throw new Error('#align-stretch-content が見つかりません');
    const widthDiff = Math.abs(
      stretchArea.getBoundingClientRect().width - stretchContent.getBoundingClientRect().width,
    );
    if (widthDiff > 1) {
      throw new Error(`stretch 時に幅いっぱいになっていません: 差分=${String(widthDiff)}px`);
    }
  },
};

/**
 * 子コンポーネントの breakout 無効化契約。
 * CSS Custom Property 経由で子の breakout が 100%/0 に強制リセットされることを検証します。
 */
export const ChildBreakoutNeutralization: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="breakout-neutralize-preview"
        heading="breakout 無効化検証"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block id="neutralize-block" layout="inline" filename="test.ts" lang="ts">
          <pre><code>const x = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'breakout-neutralize-preview');
    await preview.updateComplete;
    await waitFrame();

    // ui-code-preview の host に CSS 変数が設定されていることを確認
    const previewStyle = getComputedStyle(preview);

    const blockWidth = previewStyle.getPropertyValue('--ui-code-surface-breakout-width').trim();
    if (blockWidth !== '100%') {
      throw new Error(`--ui-code-surface-breakout-width が 100% ではありません: "${blockWidth}"`);
    }

    const blockMargin = previewStyle.getPropertyValue('--ui-code-surface-breakout-margin').trim();
    if (blockMargin !== '0') {
      throw new Error(`--ui-code-surface-breakout-margin が 0 ではありません: "${blockMargin}"`);
    }

    const blockRadiusTop = previewStyle.getPropertyValue('--ui-code-surface-radius-top').trim();
    if (blockRadiusTop !== '0') {
      throw new Error(`--ui-code-surface-radius-top が 0 ではありません: "${blockRadiusTop}"`);
    }

    const groupWidth = previewStyle.getPropertyValue('--ui-code-group-width').trim();
    if (groupWidth !== '100%') {
      throw new Error(`--ui-code-group-width が 100% ではありません: "${groupWidth}"`);
    }

    const groupMargin = previewStyle.getPropertyValue('--ui-code-group-margin-inline').trim();
    if (groupMargin !== '0') {
      throw new Error(`--ui-code-group-margin-inline が 0 ではありません: "${groupMargin}"`);
    }

    // 子 ui-code-block が変数を継承している（CSS継承により）
    const codeBlock = canvasElement.querySelector<HTMLElement>('#neutralize-block');
    if (!codeBlock) throw new Error('ui-code-block#neutralize-block が見つかりません');

    const blockComputedStyle = getComputedStyle(codeBlock);
    const inheritedWidth = blockComputedStyle
      .getPropertyValue('--ui-code-surface-breakout-width')
      .trim();
    if (inheritedWidth !== '100%') {
      throw new Error(
        `子 ui-code-block が --ui-code-surface-breakout-width: 100% を継承していません: "${inheritedWidth}"`,
      );
    }
  },
};

/**
 * A11y グループロール契約。
 * `role="group"` + `aria-label` が正しく設定されていることを検証します。
 * `heading` が非空の場合はその値が、空の場合は "コード プレビュー" が使用されます。
 */
export const A11yGroupRoleContract: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 2rem; max-width: 720px;">
      <ui-code-preview
        id="a11y-with-heading"
        heading="ボタンコンポーネント"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>

      <ui-code-preview
        id="a11y-without-heading"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const b = 2;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const withHeading = getPreview(canvasElement, 'a11y-with-heading');
    const withoutHeading = getPreview(canvasElement, 'a11y-without-heading');
    await Promise.all([withHeading.updateComplete, withoutHeading.updateComplete]);
    await waitFrame();

    // heading あり: aria-label に見出し値が使用される
    const rootWithHeading = getRoot(withHeading);
    if (rootWithHeading.getAttribute('role') !== 'group') {
      throw new Error('role="group" が設定されていません（heading あり）');
    }
    if (rootWithHeading.getAttribute('aria-label') !== 'ボタンコンポーネント') {
      throw new Error(
        `heading あり時の aria-label が不正です: "${rootWithHeading.getAttribute('aria-label') ?? ''}"`,
      );
    }

    // heading なし: フォールバック "コード プレビュー" が使用される
    const rootWithoutHeading = getRoot(withoutHeading);
    if (rootWithoutHeading.getAttribute('role') !== 'group') {
      throw new Error('role="group" が設定されていません（heading なし）');
    }
    if (rootWithoutHeading.getAttribute('aria-label') !== 'コード プレビュー') {
      throw new Error(
        `heading なし時の aria-label フォールバックが不正です: "${rootWithoutHeading.getAttribute('aria-label') ?? ''}"`,
      );
    }
  },
};

/**
 * heading 属性の動的変更。
 * 変更後に aria-label とヘッダー表示が追従することを検証します。
 */
export const HeadingDynamicUpdate: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="dynamic-heading-preview"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'dynamic-heading-preview');
    await preview.updateComplete;
    await waitFrame();

    // 初期状態: heading なし
    if (preview.hasAttribute('data-show-header')) {
      throw new Error('初期状態（heading なし）で data-show-header が付与されています');
    }

    // heading を動的に設定
    preview.heading = '動的に追加された見出し';
    await preview.updateComplete;
    await waitFrame();

    if (!preview.hasAttribute('data-show-header')) {
      throw new Error('heading 設定後に data-show-header が付与されていません');
    }
    if (!preview.hasAttribute('data-has-heading')) {
      throw new Error('heading 設定後に data-has-heading が付与されていません');
    }

    const root = getRoot(preview);
    if (root.getAttribute('aria-label') !== '動的に追加された見出し') {
      throw new Error(
        `動的設定後の aria-label が不正です: "${root.getAttribute('aria-label') ?? ''}"`,
      );
    }

    // heading を空文字に戻す
    preview.heading = '';
    await preview.updateComplete;
    await waitFrame();

    if (preview.hasAttribute('data-show-header')) {
      throw new Error('heading 削除後に data-show-header が残存しています');
    }
    if (root.getAttribute('aria-label') !== 'コード プレビュー') {
      throw new Error('heading 削除後にフォールバック aria-label が復帰していません');
    }
  },
};

/**
 * 強制カラーモード契約。
 * フォールバック定義が CSS に存在することを検証します。
 */
export const ForcedColorsContract: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="forced-colors-preview"
        heading="Forced Colors 検証"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'forced-colors-preview');
    await preview.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodePreview.styles);
    const requiredTokens = [
      '@media (forced-colors: active)',
      'border-color: CanvasText',
      'background: Canvas',
      'border-bottom-color: CanvasText',
      'border-bottom-width: var(--border-width-thick, 2px)',
    ];

    for (const token of requiredTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`forced-colors 契約の定義が不足しています: ${token}`);
      }
    }
  },
};

/**
 * 印刷スタイル契約。
 * `@media print` での基本ルールが CSS に定義されていることを検証します。
 */
export const PrintStyleContract: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="print-style-preview"
        heading="印刷スタイル検証"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'print-style-preview');
    await preview.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodePreview.styles);
    const requiredTokens = [
      '@media print',
      'width: 100% !important',
      'margin-inline: 0 !important',
      'border-color: #000 !important',
      'background: transparent !important',
      '.header-tools',
      '.header-toolbar',
      'display: none !important',
      'page-break-inside: avoid',
      'break-inside: avoid',
    ];

    for (const token of requiredTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`印刷スタイル契約の定義が不足しています: ${token}`);
      }
    }
  },
};

/**
 * Breakout パターン契約。
 * CSS に mobile/desktop 両方の breakout デフォルト値が定義されていることを検証します。
 */
export const BreakoutPatternContract: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="breakout-pattern-preview"
        heading="Breakout パターン検証"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'breakout-pattern-preview');
    await preview.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodePreview.styles);

    // mobile breakout（space-8 / space-n4）
    const mobileTokens = ['calc(100% + var(--space-8, 2rem))', 'var(--space-n4, -1rem)'];
    for (const token of mobileTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`Mobile breakout 定義が不足しています: ${token}`);
      }
    }

    // desktop breakout（space-16 / space-n8）
    const desktopTokens = [
      'calc(100% + var(--space-16, 4rem))',
      'var(--space-n8, -2rem)',
      '@media (min-width: 768px)',
    ];
    for (const token of desktopTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`Desktop breakout 定義が不足しています: ${token}`);
      }
    }

    // 子コンポーネント無効化変数
    const neutralizeTokens = [
      '--ui-code-surface-breakout-width: 100%',
      '--ui-code-surface-breakout-margin: 0',
      '--ui-code-surface-radius-top: 0',
      '--ui-code-block-breakout-width: 100%',
      '--ui-code-block-breakout-margin: 0',
      '--ui-code-block-radius-top: 0',
      '--ui-code-group-width: 100%',
      '--ui-code-group-margin-inline: 0',
    ];
    for (const token of neutralizeTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`子コンポーネント breakout 無効化定義が不足しています: ${token}`);
      }
    }
  },
};

/**
 * ビジュアル階層（Sunken Method）契約。
 * プレビュー領域が --bg-surface-2、ルートが --bg-fill-muted を参照していることを CSS 定義で検証します。
 */
export const VisualHierarchyContract: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="hierarchy-preview"
        heading="Visual Hierarchy 検証"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'hierarchy-preview');
    await preview.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodePreview.styles);

    // ヘッダー領域が preview-bg 拡張ポイントを経由して preview surface を参照
    if (
      !cssText.includes('--_ui-code-preview-surface-bg') ||
      !cssText.includes('--ui-code-preview-preview-bg')
    ) {
      throw new Error('header が preview surface トークンを参照していません');
    }

    // ルートおよびプレビュー領域が --bg-fill-muted を使用
    if (!cssText.includes('var(--bg-fill-muted')) {
      throw new Error('.root が --bg-fill-muted を参照していません');
    }

    // 外枠ボーダーが --border-style-subtle
    if (!cssText.includes('var(--border-style-subtle')) {
      throw new Error('外枠ボーダーが --border-style-subtle を参照していません');
    }

    // ヘッダー（Surface = 白）とルート（Muted = 薄グレー）の階層差を検証
    // ヘッダーは data-show-header 時のみ表示されるため、heading を持つこのストーリーで確認
    const header = getHeader(preview);
    const root = preview.shadowRoot?.querySelector<HTMLElement>('.root');
    if (!root) throw new Error('.root が見つかりません');

    const headerBg = getComputedStyle(header).backgroundColor;
    const rootBg = getComputedStyle(root).backgroundColor;

    // ヘッダー背景 ≠ ルート背景（Surface vs Muted の差がある）
    if (headerBg === rootBg) {
      throw new Error(
        `ヘッダー背景 (${headerBg}) とルート背景 (${rootBg}) が同一です（階層差が表現されていません）`,
      );
    }
  },
};

/**
 * ダーク背景拡張ポイント。
 * `--ui-code-preview-preview-bg` でヘッダー背景を上書きできることを検証します。
 * このトークンは `.header` に適用されます。
 */
export const DarkThemePreviewBackground: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="dark-preview-bg"
        heading="Dark Preview Background"
        style="
          --ui-code-preview-breakout-width: 100%;
          --ui-code-preview-breakout-margin: 0;
          --ui-code-preview-preview-bg: rgb(22 24 28);
          margin-block: 0;
        "
      >
        <div slot="preview" style="color: rgb(242 244 248);">ダーク背景上のプレビュー</div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'dark-preview-bg');
    await preview.updateComplete;
    await waitFrame();

    // --ui-code-preview-preview-bg はヘッダー背景に適用される
    const header = getHeader(preview);
    const headerBg = getComputedStyle(header).backgroundColor;
    if (headerBg !== 'rgb(22, 24, 28)') {
      throw new Error(`ヘッダー背景トークン上書きが反映されていません: "${headerBg}"`);
    }
  },
};

/**
 * 動的ツールバースロット検出。
 * toolbar スロットへの後付き追加でヘッダーが表示されることを検証します。
 */
export const ToolbarDynamicSlotDetection: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="dynamic-toolbar-preview"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview"><ui-button>ボタン</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'dynamic-toolbar-preview');
    await preview.updateComplete;
    await waitFrame();

    // 初期状態: ツールバーなし
    if (preview.hasAttribute('data-show-header')) {
      throw new Error('初期状態（toolbar なし）で data-show-header が付与されています');
    }

    // toolbar スロットにボタンを動的追加
    const button = document.createElement('button');
    button.setAttribute('slot', 'toolbar');
    button.textContent = '追加ボタン';
    preview.append(button);

    // slotchange → 再レンダリング → updated() の流れを待つ
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 50);
    });
    await preview.updateComplete;
    await waitFrame();

    if (!preview.hasAttribute('data-show-header')) {
      throw new Error('toolbar 動的追加後に data-show-header が付与されていません');
    }

    // ボタンを削除するとヘッダーが非表示に戻る
    button.remove();

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 50);
    });
    await preview.updateComplete;
    await waitFrame();

    if (preview.hasAttribute('data-show-header')) {
      throw new Error('toolbar 削除後に data-show-header が残存しています');
    }
  },
};

/**
 * Copy 機能保持契約。
 * スロットされた ui-code-block / ui-code-group の copy 値が保持されることを検証します。
 */
export const CopyFunctionalityPreservation: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 2rem; max-width: 720px;">
      <ui-code-preview
        id="copy-preserve-block-preview"
        heading="Copy Block"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview">Code Block Copy</div>
        <ui-code-block id="copy-preserve-block" layout="inline" lang="ts">
          <pre><code>const blockValue = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>

      <ui-code-preview
        id="copy-preserve-group-preview"
        heading="Copy Group"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview">Code Group Copy</div>
        <ui-code-group id="copy-preserve-group" aria-label="copy group">
          <ui-code-block group-key="a" tab-label="A" lang="ts">
            <pre><code>const groupValueA = 1;</code></pre>
          </ui-code-block>
          <ui-code-block group-key="b" tab-label="B" lang="ts">
            <pre><code>const groupValueB = 2;</code></pre>
          </ui-code-block>
        </ui-code-group>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const blockPreview = getPreview(canvasElement, 'copy-preserve-block-preview');
    const groupPreview = getPreview(canvasElement, 'copy-preserve-group-preview');
    await Promise.all([blockPreview.updateComplete, groupPreview.updateComplete]);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 60);
    });
    await waitFrame();

    const block = canvasElement.querySelector<HTMLElement>('#copy-preserve-block');
    if (!block) throw new Error('#copy-preserve-block が見つかりません');
    const blockHost = block as HTMLElement & { getCodeContent?: () => string };
    if (typeof blockHost.getCodeContent !== 'function') {
      throw new Error('ui-code-block#getCodeContent が見つかりません');
    }
    const blockExpected = blockHost.getCodeContent();
    const blockCopy = block.shadowRoot?.querySelector<HTMLElement & { value?: string }>(
      'ui-copy-button',
    );
    if (!blockCopy) throw new Error('ui-code-block の ui-copy-button が見つかりません');
    const blockCopyValue = blockCopy.value ?? blockCopy.getAttribute('value') ?? '';
    if (blockCopyValue !== blockExpected) {
      throw new Error('ui-code-block の copy 値が getCodeContent() と一致しません');
    }

    const group = canvasElement.querySelector<HTMLElement>('#copy-preserve-group');
    if (!group) throw new Error('#copy-preserve-group が見つかりません');
    const groupCopy = group.shadowRoot?.querySelector<HTMLElement & { value?: string }>(
      '.header-tools ui-copy-button',
    );
    if (!groupCopy) throw new Error('ui-code-group の ui-copy-button が見つかりません');
    const groupCopyValue = groupCopy.value ?? groupCopy.getAttribute('value') ?? '';
    if (groupCopyValue.trim() === '') {
      throw new Error('ui-code-group の copy 値が空です');
    }
  },
};

/**
 * No-JS 安全性の参照確認。
 * JavaScript 未実行時でも preview・code のコンテンツが DOM に存在することを確認します。
 *
 * 注: Storybook 環境では JS が必ず実行されるため、この Story は
 * ライトDOM にコンテンツが配置されているという構造的事実を参照ストーリーとして保持します。
 */
export const NoJsContentIntegrity: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="nojs-preview"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <div slot="preview" id="nojs-preview-content">
          <ui-button>プレビューコンテンツ</ui-button>
        </div>
        <ui-code-block id="nojs-code-content" layout="inline" lang="ts">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'nojs-preview');
    await preview.updateComplete;
    await waitFrame();

    // ライトDOM にプレビューコンテンツが存在する
    const previewContent = preview.querySelector('#nojs-preview-content');
    if (!previewContent) {
      throw new Error('preview スロットコンテンツがライトDOM に存在しません');
    }

    // ライトDOM にコードコンテンツが存在する
    const codeContent = preview.querySelector('#nojs-code-content');
    if (!codeContent) {
      throw new Error('code スロットコンテンツがライトDOM に存在しません');
    }

    // preview スロットに正しくスロットされている
    const previewSlot = preview.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="preview"]');
    if (!previewSlot) throw new Error('preview slot が見つかりません');
    const slotted = previewSlot.assignedElements({ flatten: true });
    if (!slotted.includes(previewContent)) {
      throw new Error('preview コンテンツが preview slot に割り当てられていません');
    }
  },
};
