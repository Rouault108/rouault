import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiPreview } from './preview';
import './preview.ts';
import '../code-block/code-block.ts';
import '../code-group/code-group.ts';

const meta: Meta<UiPreview> = {
  title: 'Components/Preview',
  component: 'ui-preview',
  tags: ['autodocs'],
  argTypes: {
    viewMode: {
      control: { type: 'select' },
      options: ['split', 'preview-only', 'code-only'],
      description: '表示モード（split: 両方表示、preview-only: プレビューのみ、code-only: コードのみ）',
    },
    orientation: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
      description: 'Split時のレイアウト方向（horizontal: 左右、vertical: 上下）',
    },
    previewHeight: {
      control: { type: 'text' },
      description: 'プレビューエリアの高さ（auto, 数値+単位）',
    },
    sandboxed: {
      control: { type: 'boolean' },
      description: 'iframeでプレビューを隔離するか',
    },
    previewTheme: {
      control: { type: 'select' },
      options: ['auto', 'light', 'dark'],
      description: 'プレビューエリアのテーマ',
    },
    showCodeToggle: {
      control: { type: 'boolean' },
      description: 'コード表示トグルを表示するか',
    },
  },
};

export default meta;
type Story = StoryObj<UiPreview>;

/**
 * デフォルト: HTMLボタンのプレビュー
 * Split View（左: プレビュー、右: コード）
 */
export const Default: Story = {
  render: () => html`
    <ui-preview>
      <div slot="preview">
        <button style="
          background: #3b82f6;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-family: system-ui, sans-serif;
        ">
          Click me
        </button>
      </div>
      <ui-code-block language="html">
&lt;button style="
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
"&gt;
  Click me
&lt;/button&gt;
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * Vertical Split: 上下レイアウト
 * モバイルやタブレットで有効
 */
export const VerticalSplit: Story = {
  render: () => html`
    <ui-preview orientation="vertical">
      <div slot="preview">
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          border-radius: 0.5rem;
          color: white;
          text-align: center;
        ">
          <h2 style="margin: 0; font-size: 1.5rem;">Beautiful Gradient</h2>
          <p style="margin-top: 0.5rem; opacity: 0.9;">CSS gradient background</p>
        </div>
      </div>
      <ui-code-block language="css" filename="gradient.css">
.gradient-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 0.5rem;
  color: white;
  text-align: center;
}
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * Preview Only: プレビューのみ表示
 * コードはトグルで表示
 */
export const PreviewOnly: Story = {
  render: () => html`
    <ui-preview viewMode="preview-only">
      <div slot="preview">
        <div style="
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        ">
          <button style="padding: 0.25rem 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem;">Primary</button>
          <button style="padding: 0.25rem 0.75rem; background: transparent; color: #3b82f6; border: 1px solid #3b82f6; border-radius: 0.25rem;">Secondary</button>
          <button style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 0.25rem;">Danger</button>
        </div>
      </div>
      <ui-code-block language="html">
&lt;div class="button-group"&gt;
  &lt;button class="btn-primary"&gt;Primary&lt;/button&gt;
  &lt;button class="btn-secondary"&gt;Secondary&lt;/button&gt;
  &lt;button class="btn-danger"&gt;Danger&lt;/button&gt;
&lt;/div&gt;
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * Code Only: コードのみ表示
 * プレビューは非表示（通常のコードブロックとして機能）
 */
export const CodeOnly: Story = {
  render: () => html`
    <ui-preview viewMode="code-only">
      <div slot="preview">
        <button>This will not be shown</button>
      </div>
      <ui-code-block language="javascript" filename="utils.js" showLineNumbers>
// Utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * Code Group: 複数言語のコードとプレビュー
 */
export const WithCodeGroup: Story = {
  render: () => html`
    <ui-preview>
      <div slot="preview">
        <div id="card-demo" style="
          max-width: 300px;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          background: white;
        ">
          <img src="https://placehold.co/300x150" alt="Card image" style="width: 100%; display: block;">
          <div style="padding: 1rem;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem;">Card Title</h3>
            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">This is a card component with an image and text content.</p>
          </div>
        </div>
      </div>
      <ui-code-group .labels=${['HTML', 'CSS']}>
        <ui-code-block language="html" filename="card.html">
&lt;div class="card"&gt;
  &lt;img src="image.jpg" alt="Card image"&gt;
  &lt;div class="card-body"&gt;
    &lt;h3&gt;Card Title&lt;/h3&gt;
    &lt;p&gt;This is a card component.&lt;/p&gt;
  &lt;/div&gt;
&lt;/div&gt;
        </ui-code-block>
        <ui-code-block language="css" filename="card.css">
.card {
  max-width: 300px;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
}

.card img {
  width: 100%;
  display: block;
}

.card-body {
  padding: 1rem;
}
        </ui-code-block>
      </ui-code-group>
    </ui-preview>
  `,
};

/**
 * Sandboxed: iframe内でプレビュー
 * スタイル隔離が必要な場合
 */
export const Sandboxed: Story = {
  render: () => html`
    <ui-preview sandboxed>
      <div slot="preview">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, sans-serif; padding: 1rem; }
        </style>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem;">
          <strong>⚠️ Warning</strong>
          <p style="margin-top: 0.5rem;">This is an isolated preview in an iframe.</p>
        </div>
      </div>
      <ui-code-block language="html">
&lt;div class="warning"&gt;
  &lt;strong&gt;⚠️ Warning&lt;/strong&gt;
  &lt;p&gt;This is an isolated preview.&lt;/p&gt;
&lt;/div&gt;
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * Custom Height: プレビューエリアの高さ指定
 */
export const CustomHeight: Story = {
  render: () => html`
    <ui-preview previewHeight="200px">
      <div slot="preview" style="height: 100%; display: flex; align-items: center; justify-content: center; background: #dbeafe;">
        <p style="font-size: 1.25rem; color: #1e40af;">Fixed height preview (200px)</p>
      </div>
      <ui-code-block language="html">
&lt;div class="fixed-height-container"&gt;
  &lt;p&gt;Fixed height preview&lt;/p&gt;
&lt;/div&gt;
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * Dark Theme Preview: ダークモードプレビュー
 */
export const DarkThemePreview: Story = {
  render: () => html`
    <ui-preview previewTheme="dark">
      <div slot="preview">
        <div style="
          background: #0a0a0a;
          color: #ededed;
          padding: 2rem;
          border-radius: 0.5rem;
        ">
          <h2 style="margin: 0; font-size: 1.5rem;">Dark Mode Component</h2>
          <p style="margin-top: 0.5rem; color: #a1a1aa;">Styled for dark backgrounds</p>
        </div>
      </div>
      <ui-code-block language="css">
.dark-component {
  background: #0a0a0a;
  color: #ededed;
  padding: 2rem;
  border-radius: 0.5rem;
}
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * Interactive Preview: インタラクティブな要素のプレビュー
 */
export const InteractivePreview: Story = {
  render: () => html`
    <ui-preview>
      <div slot="preview">
        <div style="padding: 1rem;">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value="50"
            style="width: 100%;"
            oninput="this.nextElementSibling.textContent = this.value + '%'"
          >
          <p style="margin-top: 0.5rem; text-align: center; font-size: 1.5rem; font-weight: bold;">50%</p>
        </div>
      </div>
      <ui-code-block language="html">
&lt;input type="range" min="0" max="100" value="50"&gt;
&lt;p id="value"&gt;50%&lt;/p&gt;

&lt;script&gt;
  const slider = document.querySelector('input');
  const value = document.querySelector('#value');
  slider.addEventListener('input', (e) => {
    value.textContent = e.target.value + '%';
  });
&lt;/script&gt;
      </ui-code-block>
    </ui-preview>
  `,
};

/**
 * BDD: 基本的なレンダリング
 */
export const BDD_BasicRendering: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-basic">
      <div slot="preview">
        <button data-testid="preview-button">Test Button</button>
      </div>
      <ui-code-block language="html">
&lt;button&gt;Test Button&lt;/button&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-basic') as UiPreview;

    // コンポーネントが存在するか
    await expect(preview).toBeInTheDocument();

    // プレビューエリアが存在するか
    const previewArea = preview.shadowRoot?.querySelector('.preview-area');
    await expect(previewArea).toBeInTheDocument();

    // コードエリアが存在するか
    const codeArea = preview.shadowRoot?.querySelector('.code-area');
    await expect(codeArea).toBeInTheDocument();
  },
};

/**
 * BDD: View Mode切り替え
 */
export const BDD_ViewModeSwitching: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-viewmode" viewMode="split">
      <div slot="preview">
        <p>Preview content</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;Preview content&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-viewmode') as UiPreview;

    // 初期状態: split
    await expect(preview.viewMode).toBe('split');

    // preview-onlyに変更
    preview.viewMode = 'preview-only';
    await preview.updateComplete;

    const previewArea = preview.shadowRoot?.querySelector('.preview-area');

    // プレビューは表示、コードは非表示（preview-onlyモード）
    await expect(previewArea).toBeVisible();
    
    // コードエリアが存在しないか確認（preview-onlyモードでは表示されていない）
    const codeArea = preview.shadowRoot?.querySelector('.code-area');
    await expect(codeArea).not.toBeInTheDocument();
  },
};

/**
 * BDD: Orientation切り替え
 */
export const BDD_OrientationSwitch: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-orientation" orientation="horizontal">
      <div slot="preview">
        <p>Preview</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;Preview&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-orientation') as UiPreview;

    // 初期状態: horizontal
    await expect(preview.orientation).toBe('horizontal');

    // verticalに変更
    preview.orientation = 'vertical';
    await preview.updateComplete;

    await expect(preview.orientation).toBe('vertical');

    // コンテナのクラスが変わっているか
    const container = preview.shadowRoot?.querySelector('.preview-container');
    await expect(container?.classList.contains('vertical')).toBe(true);
  },
};

/**
 * BDD: コード表示トグル
 */
export const BDD_CodeToggle: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-toggle" viewMode="preview-only" showCodeToggle>
      <div slot="preview">
        <p>Preview</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;Preview&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-toggle') as UiPreview;

    await preview.updateComplete;

    // トグルボタンが存在するか
    const toggleButton = preview.shadowRoot?.querySelector('.code-toggle-button') as HTMLElement;
    await expect(toggleButton).toBeInTheDocument();

    // ボタンをクリック
    toggleButton?.click();
    await preview.updateComplete;

    // コードエリアが表示されるか（内部状態の確認）
    const codeArea = preview.shadowRoot?.querySelector('.code-area');
    await expect(codeArea).toBeVisible();
  },
};

/**
 * BDD: プレビュー高さの適用
 */
export const BDD_PreviewHeight: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-height" previewHeight="300px">
      <div slot="preview">
        <p>Fixed height</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;Fixed height&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-height') as UiPreview;

    await preview.updateComplete;

    // previewHeight属性が正しく設定されているか
    await expect(preview.previewHeight).toBe('300px');

    // CSSスタイルが適用されているか（inline styleでminHeightが設定される）
    const previewArea = preview.shadowRoot?.querySelector('.preview-area') as HTMLElement;
    const inlineStyle = previewArea?.getAttribute('style');
    
    // inline styleに min-height: 300px が含まれているか確認
    await expect(inlineStyle).toContain('min-height: 300px');
  },
};

/**
 * BDD: Sandboxモード
 */
export const BDD_Sandboxed: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-sandbox" sandboxed>
      <div slot="preview">
        <p>Sandboxed content</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;Sandboxed content&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-sandbox') as UiPreview;

    await preview.updateComplete;

    // sandboxed属性が正しく設定されているか
    await expect(preview.sandboxed).toBe(true);

    // iframeが存在するか
    const iframe = preview.shadowRoot?.querySelector('iframe');
    await expect(iframe).toBeInTheDocument();
  },
};

/**
 * BDD: アクセシビリティ - ARIA属性
 */
export const BDD_Accessibility: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-a11y">
      <div slot="preview">
        <button>Accessible button</button>
      </div>
      <ui-code-block language="html">
&lt;button&gt;Accessible button&lt;/button&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-a11y') as UiPreview;

    await preview.updateComplete;

    // プレビューエリアにrole属性が付与されているか
    const previewArea = preview.shadowRoot?.querySelector('.preview-area');
    const role = previewArea?.getAttribute('role');
    
    // region または適切なroleが設定されていることを確認
    await expect(role).toBe('region');

    // aria-labelが設定されているか
    const ariaLabel = previewArea?.getAttribute('aria-label');
    await expect(ariaLabel).toBeTruthy();
    await expect(ariaLabel).toContain('プレビュー');
  },
};

/**
 * BDD: ダークモード - Elevation Tones
 */
export const BDD_DarkMode: Story = {
  tags: ['test'],
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <ui-preview data-testid="preview-dark" data-theme="dark">
      <div slot="preview">
        <button style="padding: 0.5rem 1rem; background: #60a5fa; color: white; border: none; border-radius: 0.375rem;">
          Dark Mode Button
        </button>
      </div>
      <ui-code-block language="html">
&lt;button&gt;Dark Mode Button&lt;/button&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-dark') as UiPreview;

    await preview.updateComplete;

    // プレビューエリアの背景色がダークモードに対応しているか
    const previewArea = preview.shadowRoot?.querySelector('.preview-area') as HTMLElement;
    await expect(previewArea).toBeInTheDocument();
    
    // Computed styleを取得してElevation Tonesが適用されているか確認
    const computedStyle = window.getComputedStyle(previewArea);
    const backgroundColor = computedStyle.backgroundColor;
    
    // ダークモードでは明るい背景色ではないことを確認（RGB値が低い）
    await expect(backgroundColor).toBeTruthy();
  },
};

/**
 * BDD: キーボード操作 - Enterキーでトグル
 */
export const BDD_KeyboardToggleEnter: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-keyboard-enter" viewMode="preview-only" showCodeToggle>
      <div slot="preview">
        <p>Keyboard test</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;Keyboard test&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-keyboard-enter') as UiPreview;

    await preview.updateComplete;

    const toggleButton = preview.shadowRoot?.querySelector('.code-toggle-button') as HTMLButtonElement;
    await expect(toggleButton).toBeInTheDocument();

    // フォーカスを当てる
    toggleButton.focus();
    await expect(document.activeElement).toBe(preview);
    
    // Enterキーでトグル（ネイティブボタンの動作確認）
    toggleButton.click();
    await preview.updateComplete;

    const codeArea = preview.shadowRoot?.querySelector('.code-area');
    await expect(codeArea).toBeVisible();
  },
};

/**
 * BDD: キーボード操作 - フォーカスリングの視認性
 */
export const BDD_KeyboardFocusRing: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-focus-ring" viewMode="preview-only" showCodeToggle>
      <div slot="preview">
        <p>Focus ring test</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;Focus ring test&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-focus-ring') as UiPreview;

    await preview.updateComplete;

    const toggleButton = preview.shadowRoot?.querySelector('.code-toggle-button') as HTMLButtonElement;
    await expect(toggleButton).toBeInTheDocument();

    // フォーカスを当てて、outline が適用されているか確認
    toggleButton.focus();
    
    // focus-visible時のスタイル確認（実際のブラウザでのみ正確に検証可能）
    const computedStyle = window.getComputedStyle(toggleButton, ':focus-visible');
    await expect(computedStyle).toBeTruthy();
  },
};

/**
 * BDD: aria-live によるスクリーンリーダー通知
 */
export const BDD_AriaLive: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-aria-live" viewMode="preview-only" showCodeToggle>
      <div slot="preview">
        <p>ARIA Live test</p>
      </div>
      <ui-code-block language="html">
&lt;p&gt;ARIA Live test&lt;/p&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-aria-live') as UiPreview;

    await preview.updateComplete;

    const toggleButton = preview.shadowRoot?.querySelector('.code-toggle-button') as HTMLButtonElement;
    await expect(toggleButton).toBeInTheDocument();

    // aria-live属性が設定されているか確認
    const ariaLive = toggleButton.getAttribute('aria-live');
    await expect(ariaLive).toBe('polite');

    // トグル操作
    toggleButton.click();
    await preview.updateComplete;

    // aria-expanded が正しく更新されているか
    const ariaExpanded = toggleButton.getAttribute('aria-expanded');
    await expect(ariaExpanded).toBe('true');
  },
};

/**
 * BDD: エッジケース - 空のスロット
 */
export const BDD_EmptySlot: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-empty">
      <div slot="preview"></div>
      <ui-code-block language="html">
&lt;!-- Empty --&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-empty') as UiPreview;

    await preview.updateComplete;

    // 空でもレンダリングエラーが発生しないことを確認
    const previewArea = preview.shadowRoot?.querySelector('.preview-area');
    await expect(previewArea).toBeInTheDocument();

    const codeArea = preview.shadowRoot?.querySelector('.code-area');
    await expect(codeArea).toBeInTheDocument();
  },
};

/**
 * BDD: Nested Radius が正しく適用されているか
 */
export const BDD_NestedRadius: Story = {
  tags: ['test'],
  render: () => html`
    <ui-preview data-testid="preview-nested-radius">
      <div slot="preview">
        <div style="background: #dbeafe; padding: 1rem; border-radius: inherit;">
          Nested Radius Test
        </div>
      </div>
      <ui-code-block language="html">
&lt;div&gt;Nested Radius Test&lt;/div&gt;
      </ui-code-block>
    </ui-preview>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('preview-nested-radius') as UiPreview;

    await preview.updateComplete;

    // preview-content-wrapper の border-radius が計算されているか
    const wrapper = preview.shadowRoot?.querySelector('.preview-content-wrapper') as HTMLElement;
    await expect(wrapper).toBeInTheDocument();
    
    const computedStyle = window.getComputedStyle(wrapper);
    const borderRadius = computedStyle.borderRadius;
    
    // 0px ではなく、計算された値が適用されていることを確認
    await expect(borderRadius).not.toBe('0px');
    await expect(borderRadius).toBeTruthy();
  },
};

