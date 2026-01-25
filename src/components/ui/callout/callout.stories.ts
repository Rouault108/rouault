import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiCallout } from './callout';
import './callout.ts';

const meta: Meta<UiCallout> = {
  title: 'Components/Callout',
  component: 'ui-callout',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['note', 'tip', 'important', 'warning', 'caution'],
      description: 'コールアウトの種類',
    },
    title: {
      control: { type: 'text' },
      description: 'コールアウトのタイトル（任意）',
    },
    collapsible: {
      control: { type: 'boolean' },
      description: '折りたたみ可能かどうか',
    },
    collapsed: {
      control: { type: 'boolean' },
      description: '初期状態で折りたためているか（collapsibleがtrueの時のみ有効）',
    },
    showIcon: {
      control: { type: 'boolean' },
      description: 'アイコンを表示するか',
    },
  },
};

export default meta;
type Story = StoryObj<UiCallout>;

/**
 * デフォルト: 注意書き (Note)
 */
export const Default: Story = {
  args: {
    variant: 'note',
    title: '参考情報',
  },
  render: (args) => html`
    <ui-callout variant="${args.variant}" title="${args.title}">
      この機能は実験的なものであり、将来的に変更される可能性があります。本番環境での使用には注意してください。
    </ui-callout>
  `,
};

/**
 * バリアント: Note（情報）
 */
export const Note: Story = {
  render: () => html`
    <ui-callout variant="note" title="補足説明">
      デフォルトのバリアントです。一般的な補足情報や参考資料へのリンクを示すために使用します。
    </ui-callout>
  `,
};

/**
 * バリアント: Tip（ヒント）
 */
export const Tip: Story = {
  render: () => html`
    <ui-callout variant="tip" title="プロのヒント">
      <code>prefers-reduced-motion</code> を尊重することで、モーション過敏症のユーザーにも優しいアプリケーションを構築できます。
    </ui-callout>
  `,
};

/**
 * バリアント: Important（重要）
 */
export const Important: Story = {
  render: () => html`
    <ui-callout variant="important" title="重要な変更">
      次のメジャーバージョン（v2.0）で、この API は廃止予定です。代わりに <code>newAPI()</code> を使用してください。
    </ui-callout>
  `,
};

/**
 * バリアント: Warning（警告）
 */
export const Warning: Story = {
  render: () => html`
    <ui-callout variant="warning" title="警告">
      この操作を実行すると、既存のデータが上書きされます。事前にバックアップを取ることを強く推奨します。
    </ui-callout>
  `,
};

/**
 * バリアント: Caution（注意）
 */
export const Caution: Story = {
  render: () => html`
    <ui-callout variant="caution" title="注意">
      <strong>セキュリティに関する注意:</strong> ユーザー入力をサニタイズせずにレンダリングすると、XSS攻撃のリスクがあります。
    </ui-callout>
  `,
};

/**
 * タイトルなし
 */
export const NoTitle: Story = {
  render: () => html`
    <ui-callout variant="tip">
      タイトルを省略することもできます。短い補足情報の場合に有効です。
    </ui-callout>
  `,
};

/**
 * アイコンなし
 */
export const NoIcon: Story = {
  render: () => html`
    <ui-callout variant="note" title="シンプルなコールアウト" .showIcon=${false}>
      アイコンを非表示にすることで、よりミニマルな見た目になります。
    </ui-callout>
  `,
};

/**
 * 折りたたみ可能
 */
export const Collapsible: Story = {
  render: () => html`
    <ui-callout variant="note" title="詳細情報（クリックして展開）" collapsible>
      <p>この内容は任意で確認できます。</p>
      <ul>
        <li>折りたたみ可能なコールアウトは、補足情報が長い場合に有効です。</li>
        <li>ユーザーは必要に応じて展開できます。</li>
        <li>アクセシビリティにも配慮されています（ARIA属性、キーボード操作）。</li>
      </ul>
    </ui-callout>
  `,
};

/**
 * デフォルトで折りたたみ
 */
export const CollapsedByDefault: Story = {
  render: () => html`
    <ui-callout variant="tip" title="上級者向けのヒント" collapsible collapsed>
      <p>この内容はデフォルトで折りたたまれています。</p>
      <p>興味のあるユーザーだけが展開して読むことができます。</p>
    </ui-callout>
  `,
};

/**
 * リッチコンテンツ
 */
export const RichContent: Story = {
  render: () => html`
    <ui-callout variant="important" title="TypeScript 型定義">
      <p>インターフェースを定義する際は、以下のベストプラクティスに従ってください：</p>
      <pre><code>interface User {
  id: string;
  name: string;
  email?: string; // オプショナル
}</code></pre>
      <p>詳細は <a href="#">公式ドキュメント</a> を参照してください。</p>
    </ui-callout>
  `,
};

/**
 * ダークモード
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem; min-height: 200px;">
      <ui-callout variant="note" title="ダークモードでの表示">
        <p>ダークモードでは、タイトルボタンのホバー効果が適切に表示されます。</p>
      </ui-callout>
    </div>
  `,
};

/**
 * ネストされたコールアウト
 */
export const Nested: Story = {
  render: () => html`
    <ui-callout variant="note" title="外側のコールアウト">
      <p>コールアウトの中に別のコールアウトをネストすることも可能です。</p>
      
      <ui-callout variant="warning" title="内側の警告">
        ただし、ネストしすぎると可読性が低下するため、適度に使用してください。
      </ui-callout>
    </ui-callout>
  `,
};

/**
 * BDD: バリアント切り替えテスト
 */
export const BDD_VariantSwitch: Story = {
  tags: ['test'],
  render: () => html`
    <ui-callout data-testid="callout-variant" variant="warning" title="Test Callout">
      Test content
    </ui-callout>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const callout = canvas.getByTestId('callout-variant') as UiCallout;

    await callout.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(callout.getAttribute('variant')).toBe('warning');
    
    // role 属性が設定されているか
    const role = callout.getAttribute('role');
    await expect(role).toBeTruthy();
    
    // アイコンが表示されているか
    const icon = callout.shadowRoot?.querySelector('.icon');
    await expect(icon).toBeTruthy();
  },
};

/**
 * BDD: 折りたたみ機能テスト
 */
export const BDD_CollapsibleToggle: Story = {
  tags: ['test'],
  render: () => html`
    <ui-callout 
      data-testid="callout-collapsible" 
      variant="note" 
      title="Collapsible Test"
      collapsible
    >
      This is collapsible content.
    </ui-callout>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const callout = canvas.getByTestId('callout-collapsible') as UiCallout;

    await callout.updateComplete;

    // 初期状態: 展開されている
    await expect(callout.hasAttribute('collapsed')).toBe(false);
    
    // コンテンツが表示されているか
    let content = callout.shadowRoot?.querySelector('.content');
    let isHidden = content?.getAttribute('aria-hidden') === 'true';
    await expect(isHidden).toBe(false);

    // タイトルボタンをクリック
    const titleButton = callout.shadowRoot?.querySelector('.title-button') as HTMLElement;
    await expect(titleButton).toBeTruthy();
    
    titleButton?.click();
    await callout.updateComplete;

    // 折りたたまれたか
    await expect(callout.hasAttribute('collapsed')).toBe(true);
    
    // コンテンツが非表示になったか
    content = callout.shadowRoot?.querySelector('.content');
    isHidden = content?.getAttribute('aria-hidden') === 'true';
    await expect(isHidden).toBe(true);
  },
};

/**
 * BDD: アクセシビリティ検証
 */
export const BDD_Accessibility: Story = {
  tags: ['test'],
  render: () => html`
    <ui-callout 
      data-testid="callout-a11y" 
      variant="important" 
      title="Accessibility Test"
      collapsible
    >
      Content for accessibility testing.
    </ui-callout>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const callout = canvas.getByTestId('callout-a11y') as UiCallout;

    await callout.updateComplete;

    // role 属性が設定されているか
    const role = callout.getAttribute('role');
    await expect(role).toBe('note');
    
    // 折りたたみ可能な場合、タイトルボタンに適切なARIA属性があるか
    const titleButton = callout.shadowRoot?.querySelector('.title-button') as HTMLElement;
    await expect(titleButton).toBeTruthy();
    
    // aria-expanded が設定されているか
    const ariaExpanded = titleButton?.getAttribute('aria-expanded');
    await expect(ariaExpanded).toBe('true');
    
    // aria-controls が設定されているか
    const ariaControls = titleButton?.getAttribute('aria-controls');
    await expect(ariaControls).toBeTruthy();
    
    // コンテンツに id が設定されているか
    const content = callout.shadowRoot?.querySelector('.content') as HTMLElement;
    const contentId = content?.getAttribute('id');
    await expect(contentId).toBe(ariaControls);
  },
};
