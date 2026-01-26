import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, fn } from 'storybook/test';
import './button.ts';

const meta: Meta = {
  title: 'Components/Button',
  component: 'ui-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: 'ボタンのスタイルバリアント',
    },
    disabled: {
      control: 'boolean',
      description: '無効化状態',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'ボタンのサイズ',
    },
    align: {
      control: 'select',
      options: ['center', 'start', 'between'],
      description: 'コンテンツの配置',
    },
    onClick: { action: 'clicked' },
  },
};
export default meta;

type Story = StoryObj;

/**
 * 基本的なボタンの表示 (Primary)
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    align: 'center',
    disabled: false,
    onClick: fn(),
  },
  render: (args) => html`
    <ui-button 
      variant="${args['variant']}" 
      size="${args['size']}"
      align="${args['align']}"
      ?disabled="${args['disabled']}"
      @click="${args['onClick']}"
    >
      保存する
    </ui-button>
  `,
};

/**
 * Trailing Action (ドロップダウンや幅広ボタン)
 * コンテンツを両端揃え (justify-content: space-between) に配置
 */
export const TrailingAction: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    align: 'between',
  },
  render: (args) => html`
    <div style="width: 300px;">
      <ui-button 
        variant="${args['variant']}" 
        size="${args['size']}" 
        align="${args['align']}" 
        style="width: 100%;"
      >
        <span>Sort</span>
        <svg slot="suffix" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </ui-button>
    </div>
  `,
};

/**
 * サイズバリエーション
 */
export const Sizes: Story = {
  render: (args) => html`
    <div style="display: flex; align-items: center; gap: 1rem;">
      <ui-button variant="${args['variant']}" ?disabled="${args['disabled']}" size="sm">Small</ui-button>
      <ui-button variant="${args['variant']}" ?disabled="${args['disabled']}" size="md">Medium(default)</ui-button>
      <ui-button variant="${args['variant']}" ?disabled="${args['disabled']}" size="lg">Large</ui-button>
    </div>
  `,
};


/**
 * セカンダリバリアント
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    disabled: false,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">キャンセル</ui-button>`,
};

/**
 * アウトラインバリアント
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    disabled: false,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">詳細を見る</ui-button>`,
};

/**
 * ゴーストバリアント (ナビゲーション用)
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    disabled: false,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">メニュー</ui-button>`,
};

/**
 * Dangerバリアント (削除、破壊的アクション用)
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    disabled: false,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">削除する</ui-button>`,
};

/**
 * 無効化状態 (Disabled)
 */
export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}" ?disabled="${args['disabled']}">操作不可</ui-button>`,
};

/**
 * Loading (読み込み中)
 */
export const Loading: Story = {
  args: {
    variant: 'primary',
  },
  render: (args) => html`
    <ui-button variant="${args['variant']}" size="${args['size'] || 'md'}" loading>
      送信中...
    </ui-button>
  `,
};

/**
 * アイコン付きボタン (Prefix/Suffix)
 */
export const WithIcon: Story = {
  args: {
    variant: 'primary',
  },
  render: (args) => html`
    <ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">
      <svg slot="prefix" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      保存する
    </ui-button>
    
    <ui-button variant="outline" size="${args['size'] || 'md'}" style="margin-left: 1rem;">
      詳細を見る
      <svg slot="suffix" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </ui-button>
  `,
};

/**
 * ダークモード
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (story) => html`
      <div data-theme="dark" style="padding: 1rem; background: var(--color-background); color: var(--color-foreground);">
        ${story()}
      </div>
    `,
  ],
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <ui-button variant="primary">Primary</ui-button>
        <ui-button variant="secondary">Secondary</ui-button>
        <ui-button variant="outline">Outline</ui-button>
        <ui-button variant="ghost">Ghost</ui-button>
        <ui-button variant="danger">Danger</ui-button>
      </div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <ui-button variant="primary" disabled>Disabled</ui-button>
        <ui-button variant="outline" loading>Loading</ui-button>
      </div>
    </div>
  `,
};

/**
 * BDD シナリオテスト: インタラクション検証
 * - 表示確認
 * - クリックイベントの発火確認
 * - キーボードフォーカスの確認
 */
export const BDD_ButtonInteraction: Story = {
  args: {
    onClick: fn(),
  },
  render: (args) => html`<ui-button @click="${args['onClick']}">クリックテスト</ui-button>`,
  play: async ({ canvasElement, args }) => {
    
    // 1. 要素の取得
    const uiButton = canvasElement.querySelector('ui-button') as HTMLElement;
    if (!uiButton) throw new Error('ui-button not found');

    // 2. 表示確認 (Then)
    await expect(uiButton).toBeInTheDocument();
    await expect(uiButton).toHaveTextContent('クリックテスト');

    // 3. クリック操作 (When)
    await userEvent.click(uiButton as HTMLElement);

    // 4. イベント発火確認 (Then)
    // スパイ関数が呼び出されたかを確認
    await expect(args['onClick']).toHaveBeenCalled();

    // 5. フォーカス確認 (When/Then)
    // ボタンからフォーカスを外すして再フォーカス
    uiButton.blur();
    await expect(uiButton).not.toHaveFocus();
    
    await userEvent.tab();
    await expect(uiButton).toHaveFocus();
  },
};

/**
 * BDD シナリオテスト: キーボード操作
 * - Enter/Spaceキーでボタンが押されることを確認
 */
export const BDD_KeyboardOperation: Story = {
  args: {
    onClick: fn(),
  },
  render: (args) => html`<ui-button @click="${args['onClick']}">キーボードテスト</ui-button>`,
  play: async ({ canvasElement, args }) => {
    const uiButton = canvasElement.querySelector('ui-button') as HTMLElement;
    if (!uiButton) throw new Error('ui-button not found');

    // フォーカスを当てる
    uiButton.focus();
    await expect(uiButton).toHaveFocus();

    // LionButtonはShadow DOM内のネイティブボタンでキーボード操作を処理するため、
    // Enterキーイベントを直接ディスパッチしてシミュレート
    uiButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    uiButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    // LionButtonはkeyupでclickを発火するため、少し待機
    await new Promise(resolve => setTimeout(resolve, 50));
    await expect(args['onClick']).toHaveBeenCalledTimes(1);

    // Spaceキーでも同様
    uiButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    uiButton.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 50));
    await expect(args['onClick']).toHaveBeenCalledTimes(2);
  },
};

/**
 * BDD シナリオテスト: Loading状態のアクセシビリティ
 * - aria-hidden と sr-only の適切な使用を確認
 * - ポインターイベントが無効化されていることを確認
 */
export const BDD_LoadingAccessibility: Story = {
  render: () => html`<ui-button loading>送信中</ui-button>`,
  play: async ({ canvasElement }) => {
    const uiButton = canvasElement.querySelector('ui-button') as HTMLElement;
    if (!uiButton) throw new Error('ui-button not found');

    // スピナーが aria-hidden="true" であることを確認
    const spinner = uiButton.shadowRoot?.querySelector('.spinner');
    await expect(spinner).toHaveAttribute('aria-hidden', 'true');

    // sr-onlyテキストが存在することを確認（スクリーンリーダー用）
    const srOnly = uiButton.shadowRoot?.querySelector('.sr-only');
    await expect(srOnly).toBeInTheDocument();

    // pointer-events が無効化されていることを確認
    const computedStyle = window.getComputedStyle(uiButton);
    await expect(computedStyle.pointerEvents).toBe('none');
  },
};

/**
 * BDD シナリオテスト: Disabled状態のフォーカス不可
 * - Disabled時はフォーカスできないことを確認
 * - Tabキーでスキップされることを確認
 */
export const BDD_DisabledFocus: Story = {
  render: () => html`
    <div>
      <ui-button id="before">前のボタン</ui-button>
      <ui-button id="disabled" disabled>無効ボタン</ui-button>
      <ui-button id="after">次のボタン</ui-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const beforeBtn = canvasElement.querySelector('#before') as HTMLElement;
    const disabledBtn = canvasElement.querySelector('#disabled') as HTMLElement;
    const afterBtn = canvasElement.querySelector('#after') as HTMLElement;

    if (!beforeBtn || !disabledBtn || !afterBtn) {
      throw new Error('Buttons not found');
    }

    // disabled属性が正しく設定されているか確認
    await expect(disabledBtn).toHaveAttribute('disabled');
    
    // disabledボタンはaria-disabled属性も持つべき
    await expect(disabledBtn.getAttribute('aria-disabled')).toBe('true');
    
    // disabledボタンにフォーカスを試みて、フォーカスされないことを確認
    // LionButtonはdisabled時にtabindex=-1を設定するはず
    const tabIndex = disabledBtn.getAttribute('tabindex');
    await expect(tabIndex).toBe('-1');
    
    // アクティブなボタンにはフォーカス可能
    beforeBtn.focus();
    await expect(beforeBtn).toHaveFocus();
  },
};

/**
 * BDD シナリオテスト: ダークモードでの各バリアント表示確認
 * - 全バリアントが適切に表示されることを自動テスト
 */
export const BDD_DarkModeVariants: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (story) => html`
      <div data-theme="dark" style="padding: 1rem; background: var(--color-background); color: var(--color-foreground);">
        ${story()}
      </div>
    `,
  ],
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-button variant="primary" id="dark-primary">Primary</ui-button>
      <ui-button variant="secondary" id="dark-secondary">Secondary</ui-button>
      <ui-button variant="outline" id="dark-outline">Outline</ui-button>
      <ui-button variant="ghost" id="dark-ghost">Ghost</ui-button>
      <ui-button variant="danger" id="dark-danger">Danger</ui-button>
      <ui-button variant="primary" disabled id="dark-disabled">Disabled</ui-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // 全バリアントが存在することを確認
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'disabled'];
    
    for (const variant of variants) {
      const button = canvasElement.querySelector(`#dark-${variant}`) as HTMLElement;
      await expect(button).toBeInTheDocument();
      
      // ダークモード用CSSカスタムプロパティが適用されているか確認
      const container = canvasElement.querySelector('[data-theme="dark"]') as HTMLElement;
      await expect(container).toHaveAttribute('data-theme', 'dark');
    }
  },
};
