import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './button';
import type { Button } from './button';

/**
 * ## ボタン (Button)
 * 
 * アクションの優先度を視覚的な「重さ（Weight）」で制御します。
 * 「静謐さ」を保つため、画面内に **Primary（塗りつぶし）ボタンは原則1つのみ** とし、
 * 残りは Secondary または Ghost を使用することで視覚的ノイズを極限まで抑制します。
 * 
 * ### デザイン哲学
 * 
 * - **役割**: アクションの優先度を視覚的な「重さ（Weight）」で制御
 * - **触感 (Tactility)**: マイクロインタラクションにより、入力がシステムに受容されたことをデジタルに伝える
 * - **最小化設計 (Minimality)**: UIの透明化を追求し、コンテンツを圧迫しないよう黒子として機能
 * 
 * ### バリアント選択のガイドライン
 * 
 * 1. **Primary**: 画面内で最も重要なアクション（画面内に1つのみ推奨）
 * 2. **Secondary**: 標準アクション。構造を明示すべき場合（ダイアログの選択肢等）
 * 3. **Outline**: 軽量アクション。カード内/モーダル内で視覚的ノイズを抑制
 * 4. **Ghost**: 最小限の主張。高密度UI（ツールバー等）で使用
 * 5. **Danger**: 破壊的アクション（削除、リセット等）
 * 
 * ### 使用上の注意
 * 
 * - **フォーム送信**: type="submit" を明示してください（デフォルトは button）
 * - **アイコンのみ**: icon-only 使用時は aria-label が必須です
 * - **大サイズは非推奨**: lg サイズはデザインレビューなしで使用禁止
 */
const meta: Meta<Button> = {
  title: 'Components/Button',
  component: 'ui-button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
ボタンコンポーネントは、アクションの優先度を視覚的な「重さ」で制御し、UIの透明化を追求します。

## 使用方法

\`\`\`html
<!-- デフォルト（Secondary） -->
<ui-button>保存</ui-button>

<!-- プライマリ -->
<ui-button variant="primary">送信</ui-button>

<!-- フォーム送信 -->
<ui-button type="submit" variant="primary">保存</ui-button>

<!-- アイコンのみ -->
<ui-button icon-only aria-label="設定を開く">
  <iconify-icon icon="lucide:settings"></iconify-icon>
</ui-button>

<!-- ローディング状態 -->
<ui-button loading>保存中...</ui-button>
\`\`\`

## バリアント選択のDecision Tree

\`\`\`
画面内で最も重要なアクションか？
├─ Yes → Primary
└─ No
   └─ 構造を明示すべきか？（独立したアクション、ダイアログの選択肢等）
      ├─ Yes → Secondary
      └─ No
         └─ カード内/モーダル内で視覚的ノイズを抑えたいか？
            ├─ Yes → Outline
            └─ No
               └─ 高密度UI（ツールバー等）で最小限の主張にしたいか？
                  ├─ Yes → Ghost
                  └─ 破壊的アクション（削除、リセット等）か？
                     └─ Yes → Danger
\`\`\`

## 注意事項

- **フォーム送信**: ネイティブ \`<button>\` と異なり、デフォルトは \`type="button"\` です。フォーム送信に使用する場合は \`type="submit"\` を明示してください。
- **アイコンのみ**: \`icon-only\` を使用する場合は、\`aria-label\` による代替テキスト提供が必須です。
- **大サイズは非推奨**: \`lg\` サイズはデザインレビューなしでの使用を禁止します。強調が必要な場合は \`md\` サイズに \`variant="primary"\` を組み合わせてください。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: '視覚的強度を決定するバリアント',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'secondary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'ボタンのサイズ（lg は非推奨）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    iconOnly: {
      control: 'boolean',
      description: 'アイコンのみのボタン（aria-label 必須）',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    loading: {
      control: 'boolean',
      description: '処理中状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: '不活性状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      description: 'フォーム内での挙動制御',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'button' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Button>;

/**
 * デフォルトのボタン（Secondary バリアント）。
 * 
 * 標準的なアクションに使用します。背景色と境界線で構造を明示します。
 */
export const Default: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
  },
  render: (args) => html`
    <ui-button
      variant="${args.variant}"
      size="${args.size}"
      ?disabled="${args.disabled}"
      ?loading="${args.loading}"
    >
      保存
    </ui-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    const buttonElement = button.shadowRoot?.querySelector('button');
    if (!buttonElement) {
      throw new Error('Button element not found in shadow root');
    }

    // テスト: デフォルトのtype属性が"button"であること
    if (buttonElement.getAttribute('type') !== 'button') {
      throw new Error(`Expected type to be 'button', got '${buttonElement.getAttribute('type') ?? 'null'}'`);
    }

    // テスト: デフォルトのvariantが"secondary"であること
    if (button.variant !== 'secondary') {
      throw new Error(`Expected variant to be 'secondary', got '${button.variant}'`);
    }

    console.log('✅ All tests passed for Default story');
  },
};

/**
 * 全バリアントの一覧。
 * 
 * Primary、Secondary、Outline、Ghost、Danger の5つのバリアントを比較できます。
 */
export const AllVariants: Story = {
  render: () => html`
    <style>
      .variant-showcase {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .variant-group {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .variant-label {
        min-width: 100px;
        font-weight: var(--font-medium, 500);
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, #666);
      }
    </style>

    <div class="variant-showcase">
      <div class="variant-group">
        <span class="variant-label">Primary</span>
        <ui-button variant="primary">主要アクション</ui-button>
      </div>

      <div class="variant-group">
        <span class="variant-label">Secondary</span>
        <ui-button variant="secondary">標準アクション</ui-button>
      </div>

      <div class="variant-group">
        <span class="variant-label">Outline</span>
        <ui-button variant="outline">軽量アクション</ui-button>
      </div>

      <div class="variant-group">
        <span class="variant-label">Ghost</span>
        <ui-button variant="ghost">最小限の主張</ui-button>
      </div>

      <div class="variant-group">
        <span class="variant-label">Danger</span>
        <ui-button variant="danger">削除</ui-button>
      </div>
    </div>
  `,
};

/**
 * 全サイズの一覧。
 * 
 * Small、Medium、Large の3つのサイズを比較できます。
 * 
 * **注意**: Large サイズは非推奨です。
 */
export const AllSizes: Story = {
  render: () => html`
    <style>
      .size-showcase {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
    </style>

    <div class="size-showcase">
      <ui-button size="sm" variant="primary">Small</ui-button>
      <ui-button size="md" variant="primary">Medium</ui-button>
      <ui-button size="lg" variant="primary">Large (非推奨)</ui-button>
    </div>
  `,
};

/**
 * プライマリボタン。
 * 
 * 画面内で最も重要なアクションに使用します。
 * **画面内に1つのみ配置することを原則**とします。
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
  },
  render: (args) => html`
    <ui-button variant="${args.variant}" size="${args.size}">
      送信
    </ui-button>
  `,
};

/**
 * アウトラインボタン。
 * 
 * Secondaryより控えめで、カード内やモーダル内で使用すると視覚的ノイズを抑制できます。
 * 
 * **迷った場合**: Secondary と Outline で迷う場合は、Secondary を優先してください。
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    size: 'md',
  },
  render: (args) => html`
    <ui-button variant="${args.variant}" size="${args.size}">
      詳細を見る
    </ui-button>
  `,
};

/**
 * ゴーストボタン。
 * 
 * 最小限の主張。アイコンボタンやツールバーなど、高密度なUIで使用します。
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
  },
  render: (args) => html`
    <ui-button variant="${args.variant}" size="${args.size}">
      キャンセル
    </ui-button>
  `,
};

/**
 * Dangerボタン。
 * 
 * 破壊的アクション（削除、リセット等）に使用します。
 * ホバー時に背景が赤く反転し、無意識に警告します。
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'md',
  },
  render: (args) => html`
    <ui-button variant="${args.variant}" size="${args.size}">
      削除
    </ui-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    // テスト: variant が danger であること
    if (button.variant !== 'danger') {
      throw new Error(`Expected variant to be 'danger', got '${button.variant}'`);
    }

    console.log('✅ All tests passed for Danger story');
  },
};

/**
 * ローディング状態。
 * 
 * 処理中であることを示します。
 * ラベルテキストは維持され、スピナーが並列表示されることで、
 * ユーザーが「何を実行したか」を見失わないよう配慮しています。
 */
export const Loading: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    loading: true,
  },
  render: (args) => html`
    <ui-button
      variant="${args.variant}"
      size="${args.size}"
      ?loading="${args.loading}"
    >
      保存中...
    </ui-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    const buttonElement = button.shadowRoot?.querySelector('button');
    if (!buttonElement) {
      throw new Error('Button element not found in shadow root');
    }

    // テスト: aria-busy="true" が設定されていること
    if (buttonElement.getAttribute('aria-busy') !== 'true') {
      throw new Error('Expected aria-busy to be "true"');
    }

    // テスト: disabled状態であること
    if (!buttonElement.disabled) {
      throw new Error('Button should be disabled when loading');
    }

    // テスト: スピナーが表示されていること
    const spinner = buttonElement.querySelector('.spinner');
    if (!spinner) {
      throw new Error('Spinner should be visible when loading');
    }

    console.log('✅ All tests passed for Loading story');
  },
};

/**
 * 無効状態。
 * 
 * 操作不可能な状態を示します。
 * スタイルは薄くなり、ポインターイベントが除去されます。
 */
export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
  render: (args) => html`
    <ui-button
      variant="${args.variant}"
      size="${args.size}"
      ?disabled="${args.disabled}"
    >
      無効なボタン
    </ui-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    const buttonElement = button.shadowRoot?.querySelector('button');
    if (!buttonElement) {
      throw new Error('Button element not found in shadow root');
    }

    // テスト: disabled属性が設定されていること
    if (!buttonElement.disabled) {
      throw new Error('Button should be disabled');
    }

    console.log('✅ All tests passed for Disabled story');
  },
};

/**
 * アイコン付きボタン。
 * 
 * テキストとアイコンを組み合わせたボタンです。
 */
export const WithIcon: Story = {
  args: {
    variant: 'primary',
    size: 'md',
  },
  render: (args) => html`
    <style>
      iconify-icon {
        font-size: var(--icon-base, 16px);
      }
    </style>

    <ui-button variant="${args.variant}" size="${args.size}">
      <iconify-icon icon="lucide:save"></iconify-icon>
      保存
    </ui-button>
  `,
};

/**
 * アイコンのみのボタン。
 * 
 * aria-label を必ず設定してください。
 * 正方形（1:1）を強制し、Universal Clarity を担保します。
 */
export const IconOnly: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    iconOnly: true,
  },
  render: (args) => html`
    <style>
      iconify-icon {
        font-size: var(--icon-base, 16px);
      }
    </style>

    <ui-button
      variant="${args.variant}"
      size="${args.size}"
      ?icon-only="${args.iconOnly}"
      aria-label="設定を開く"
    >
      <iconify-icon icon="lucide:settings"></iconify-icon>
    </ui-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    // テスト: aria-label が設定されていること
    if (!button.getAttribute('aria-label')) {
      throw new Error('icon-only button must have aria-label');
    }

    // テスト: icon-only 属性が設定されていること
    if (!button.iconOnly) {
      throw new Error('Expected iconOnly to be true');
    }

    console.log('✅ All tests passed for IconOnly story');
  },
};

/**
 * フォーム送信ボタン。
 * 
 * type="submit" を明示することで、フォーム送信に使用できます。
 * 
 * **重要**: ネイティブ <button> と異なり、デフォルトは type="button" です。
 */
export const FormSubmit: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    type: 'submit',
  },
  render: (args) => html`
    <form
      @submit="${(e: Event) => {
      e.preventDefault();
      alert('フォームが送信されました！');
    }}"
    >
      <ui-button
        variant="${args.variant}"
        size="${args.size}"
        type="${args.type}"
      >
        送信
      </ui-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    const buttonElement = button.shadowRoot?.querySelector('button');
    if (!buttonElement) {
      throw new Error('Button element not found in shadow root');
    }

    // テスト: type属性が"submit"であること
    if (buttonElement.getAttribute('type') !== 'submit') {
      throw new Error(`Expected type to be 'submit', got '${buttonElement.getAttribute('type') ?? 'null'}'`);
    }

    console.log('✅ All tests passed for FormSubmit story');
  },
};

/**
 * ダイアログでの使用例。
 * 
 * Primary は1つのみ、その他は Secondary を使用する原則を示します。
 */
export const DialogExample: Story = {
  render: () => html`
    <style>
      .dialog-demo {
        background: var(--bg-surface-2, #f5f5f5);
        padding: 1.5rem;
        border-radius: var(--radius-md, 6px);
        max-width: 400px;
      }

      .dialog-content {
        margin-bottom: 1.5rem;
      }

      .dialog-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }
    </style>

    <div class="dialog-demo">
      <div class="dialog-content">
        <h3 style="margin: 0 0 0.5rem 0;">確認</h3>
        <p style="margin: 0; color: var(--fg-muted, #666);">
          この操作を実行してもよろしいですか？
        </p>
      </div>

      <div class="dialog-actions">
        <ui-button variant="secondary">キャンセル</ui-button>
        <ui-button variant="primary">実行</ui-button>
      </div>
    </div>
  `,
};

/**
 * ツールバーでの使用例。
 * 
 * Ghost バリアントを使用して高密度なUIを実現します。
 */
export const ToolbarExample: Story = {
  render: () => html`
    <style>
      .toolbar-demo {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        width: fit-content;
      }

      iconify-icon {
        font-size: var(--icon-base, 16px);
      }
    </style>

    <div class="toolbar-demo">
      <ui-button variant="ghost" icon-only aria-label="太字">
        <iconify-icon icon="lucide:bold"></iconify-icon>
      </ui-button>
      <ui-button variant="ghost" icon-only aria-label="イタリック">
        <iconify-icon icon="lucide:italic"></iconify-icon>
      </ui-button>
      <ui-button variant="ghost" icon-only aria-label="下線">
        <iconify-icon icon="lucide:underline"></iconify-icon>
      </ui-button>
      <ui-button variant="ghost" icon-only aria-label="リンク">
        <iconify-icon icon="lucide:link"></iconify-icon>
      </ui-button>
    </div>
  `,
};

/**
 * カード内での使用例。
 * 
 * Outline バリアントを使用して視覚的ノイズを抑制します。
 */
export const CardExample: Story = {
  render: () => html`
    <style>
      .card-demo {
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        padding: 1.5rem;
        max-width: 320px;
      }

      .card-title {
        margin: 0 0 0.5rem 0;
        font-size: var(--text-lg, 16px);
        font-weight: var(--font-semibold, 600);
      }

      .card-description {
        margin: 0 0 1rem 0;
        color: var(--fg-muted, #666);
        font-size: var(--text-sm, 13px);
      }

      .card-actions {
        display: flex;
        gap: 0.5rem;
      }
    </style>

    <div class="card-demo">
      <h3 class="card-title">記事タイトル</h3>
      <p class="card-description">
        記事の概要がここに表示されます。カード内のボタンには Outline バリアントを使用することで、
        視覚的ノイズを抑制します。
      </p>
      <div class="card-actions">
        <ui-button variant="outline" size="sm">詳細を見る</ui-button>
        <ui-button variant="ghost" size="sm">共有</ui-button>
      </div>
    </div>
  `,
};

/**
 * フォーカス状態のデモ。
 * 
 * Adaptive Focus により、移動中のノイズを低減し、停止時に明確化します。
 */
export const FocusState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
  },
  render: (args) => html`
    <style>
      .focus-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .focus-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
      }
    </style>

    <div class="focus-demo">
      <div class="focus-info">
        <strong>操作方法</strong>: Tab キーを押してボタンにフォーカスを当ててください。
        Adaptive Focus により、フォーカスリングが適切に表示されます。
      </div>

      <div>
        <ui-button variant="${args.variant}" size="${args.size}" id="focus-button">
          フォーカスを試す
        </ui-button>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>('#focus-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    // フォーカスを当てる
    button.focus();
    await new Promise(resolve => setTimeout(resolve, 100));

    const buttonElement = button.shadowRoot?.querySelector('button');
    if (!buttonElement) {
      throw new Error('Button element not found in shadow root');
    }

    // テスト: フォーカスが当たっていること
    if (button.shadowRoot?.activeElement !== buttonElement) {
      throw new Error('Button should be focused');
    }

    console.log('✅ All tests passed for FocusState story');
  },
};

/**
 * ❌ アクセシビリティエラーの例。
 * 
 * icon-only 使用時に aria-label がない場合、開発モードでエラーが出力されます。
 * このストーリーは意図的にアクセシビリティ違反を示すためのものです。
 */
export const IconOnlyWithoutAriaLabel: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    iconOnly: true,
  },
  render: (args) => html`
    <style>
      .error-demo {
        padding: 1rem;
        background: var(--bg-danger-subtle, #fee);
        border: 1px solid var(--border-danger, #fcc);
        border-radius: var(--radius-md, 6px);
        margin-bottom: 1rem;
      }

      .error-demo strong {
        color: var(--danger, #c00);
      }

      iconify-icon {
        font-size: var(--icon-base, 16px);
      }
    </style>

    <div class="error-demo">
      <strong>⚠️ 意図的なエラーケース</strong>: 
      このボタンには aria-label がないため、コンソールにエラーが出力されます。
      開発者ツールのコンソールを確認してください。
    </div>

    <ui-button
      variant="${args.variant}"
      size="${args.size}"
      ?icon-only="${args.iconOnly}"
    >
      <iconify-icon icon="lucide:settings"></iconify-icon>
    </ui-button>
  `,
  parameters: {
    docs: {
      description: {
        story: '⚠️ **意図的なエラーケース**: aria-label がないため、コンソールにエラーが出力されます。アクセシビリティのため、icon-only 使用時は必ず aria-label を設定してください。',
      },
    },
    // a11y アドオンのテストで警告が出ることを期待
    a11y: {
      config: {
        rules: [{ id: 'button-name', enabled: true }],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    // テスト: aria-label が設定されていないこと
    if (button.getAttribute('aria-label')) {
      throw new Error('This test expects aria-label to be missing');
    }

    // テスト: icon-only 属性が設定されていること
    if (!button.iconOnly) {
      throw new Error('Expected iconOnly to be true');
    }

    // Note: console.error のモック検証は Storybook の制約上困難なため、
    // 実際のコンソール出力を手動で確認することを推奨

    console.log('✅ All tests passed for IconOnlyWithoutAriaLabel story');
    console.log('📝 開発者ツールのコンソールでエラーメッセージを確認してください');
  },
};

/**
 * ⚠️ 非推奨サイズの警告例。
 * 
 * lg サイズは非推奨です。使用時にコンソールに警告が出力されます。
 */
export const DeprecatedLargeSize: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
  },
  render: (args) => html`
    <style>
      .warning-demo {
        padding: 1rem;
        background: var(--bg-warning-subtle, oklch(from var(--warning, oklch(70% 0.15 85)) l c h / 0.1));
        border: 1px solid var(--border-warning, oklch(from var(--warning, oklch(70% 0.15 85)) l c h / 0.3));
        border-radius: var(--radius-md, 6px);
        margin-bottom: 1rem;
      }

      .warning-demo strong {
        color: var(--warning, oklch(70% 0.15 85));
      }
    </style>

    <div class="warning-demo">
      <strong>⚠️ 非推奨サイズ</strong>: 
      lg サイズはデザインレビューなしでの使用を禁止します。
      コンソールに警告が出力されます。
    </div>

    <ui-button variant="${args.variant}" size="${args.size}">
      Large サイズ（非推奨）
    </ui-button>
  `,
  parameters: {
    docs: {
      description: {
        story: '⚠️ **非推奨**: lg サイズはデザインレビューなしでの使用を禁止します。強調が必要な場合は md サイズに variant="primary" を組み合わせてください。',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-button');
    if (!button) {
      throw new Error('Button component not found');
    }

    await button.updateComplete;

    // テスト: size が lg であること
    if (button.size !== 'lg') {
      throw new Error(`Expected size to be 'lg', got '${button.size}'`);
    }

    console.log('✅ All tests passed for DeprecatedLargeSize story');
    console.log('📝 開発者ツールのコンソールで警告メッセージを確認してください');
  },
};

/**
 * Forced Colors Mode での表示確認。
 * 
 * Windows の高コントラストモードなど、強制カラーモード環境での表示を確認します。
 * システムカラー（Highlight, HighlightText, CanvasText）へのフォールバックを検証できます。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <style>
      .forced-colors-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      .forced-colors-showcase {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .forced-colors-group {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
    </style>
    
    <div class="forced-colors-info">
      <strong>確認方法</strong>: 
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li><strong>Windows</strong>: 設定 > アクセシビリティ > コントラストテーマ で高コントラストモードを有効化</li>
        <li><strong>macOS</strong>: システム設定 > アクセシビリティ > ディスプレイ > コントラストを上げる</li>
        <li><strong>開発者ツール</strong>: Chrome DevTools > Rendering > Emulate CSS media feature forced-colors: active</li>
      </ul>
    </div>

    <div class="forced-colors-showcase">
      <div class="forced-colors-group">
        <ui-button variant="primary">Primary</ui-button>
        <ui-button variant="secondary">Secondary</ui-button>
        <ui-button variant="outline">Outline</ui-button>
        <ui-button variant="ghost">Ghost</ui-button>
        <ui-button variant="danger">Danger</ui-button>
      </div>

      <div class="forced-colors-group">
        <ui-button variant="primary" disabled>Disabled</ui-button>
        <ui-button variant="secondary" loading>Loading</ui-button>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'Forced Colors Mode（高コントラストモード）での表示を確認します。境界線とシステムカラーにより構造が明確化されます。',
      },
    },
  },
};

/**
 * Reduced Motion での表示確認。
 * 
 * prefers-reduced-motion 環境下でのアニメーション抑制を確認します。
 * トランジションが即座に適用され、スピナーアニメーションが停止します。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <style>
      .reduced-motion-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      .reduced-motion-showcase {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      /* このストーリー内で reduced-motion を強制 */
      @media (prefers-reduced-motion: no-preference) {
        .reduced-motion-showcase ui-button {
          /* グローバルトークンの上書きをシミュレート */
          --duration-fast: 0.01ms;
        }
      }
    </style>
    
    <div class="reduced-motion-info">
      <strong>確認方法</strong>: 
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li><strong>Windows</strong>: 設定 > アクセシビリティ > 視覚効果 > アニメーション効果をオフ</li>
        <li><strong>macOS</strong>: システム設定 > アクセシビリティ > ディスプレイ > 視差効果を減らす</li>
        <li><strong>このストーリー</strong>: reduced-motion を強制的にシミュレートしています</li>
      </ul>
      <p style="margin: 0.5rem 0 0 0;">
        ローディングスピナーのアニメーションが停止し、トランジションが即座に適用されることを確認してください。
      </p>
    </div>

    <div class="reduced-motion-showcase">
      <ui-button variant="primary">通常ボタン</ui-button>
      <ui-button variant="secondary" loading>ローディング中</ui-button>
      <ui-button variant="outline">ホバーしてみる</ui-button>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'prefers-reduced-motion 環境下でのアニメーション抑制を確認します。スピナーは静的になり、トランジションは即座に適用されます。',
      },
    },
  },
};

/**
 * 印刷スタイルの確認。
 * 
 * @media print 時のスタイルを確認します。
 * Shadow を除去し、Primary/Danger は Outline スタイルにフォールバックします。
 */
export const PrintStyles: Story = {
  render: () => html`
    <style>
      .print-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      .print-showcase {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .print-group {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .print-label {
        min-width: 120px;
        font-weight: var(--font-medium, 500);
        font-size: var(--text-sm, 13px);
      }
    </style>
    
    <div class="print-info">
      <strong>確認方法</strong>: 
      ブラウザの印刷プレビュー（Ctrl+P / Cmd+P）を開いて、以下の挙動を確認してください：
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li>Shadow が除去される</li>
        <li>Primary/Danger が Outline スタイルにフォールバック</li>
        <li>Secondary は境界線のみで表示</li>
        <li>Ghost は非表示</li>
        <li>Loading 状態のボタンは非表示</li>
      </ul>
    </div>

    <div class="print-showcase">
      <div class="print-group">
        <span class="print-label">Primary:</span>
        <ui-button variant="primary">保存</ui-button>
      </div>

      <div class="print-group">
        <span class="print-label">Secondary:</span>
        <ui-button variant="secondary">キャンセル</ui-button>
      </div>

      <div class="print-group">
        <span class="print-label">Outline:</span>
        <ui-button variant="outline">詳細</ui-button>
      </div>

      <div class="print-group">
        <span class="print-label">Ghost (非表示):</span>
        <ui-button variant="ghost">Ghost</ui-button>
      </div>

      <div class="print-group">
        <span class="print-label">Danger:</span>
        <ui-button variant="danger">削除</ui-button>
      </div>

      <div class="print-group">
        <span class="print-label">Loading (非表示):</span>
        <ui-button variant="primary" loading>処理中</ui-button>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: '印刷時のスタイルを確認します。インク節約と可読性を両立させるため、装飾を最小化します。',
      },
    },
  },
};
