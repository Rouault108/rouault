import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import type { UiTabs } from './tabs.ts';
import './tabs';

const meta: Meta = {
  title: 'Components/Tabs',
  component: 'ui-tabs',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['underline', 'segmented'],
      description: 'タブのバリエーション',
    },
    ariaLabel: {
      control: 'text',
      description: 'タブリスト全体のaria-label',
    },
  },
};
export default meta;

type Story = StoryObj;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なタブ（Underline型）
 */
export const Default: Story = {
  args: {
    variant: 'underline',
    ariaLabel: 'メインナビゲーション',
  },
  render: (args) => html`
    <ui-tabs variant="${args['variant']}" aria-label="${args['ariaLabel']}">
      <ui-tab slot="tab" tab-id="overview">概要</ui-tab>
      <ui-tab slot="tab" tab-id="details">詳細</ui-tab>
      <ui-tab slot="tab" tab-id="settings">設定</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="overview">
        <div style="padding: 1rem; background: var(--bg-surface-1, #f9fafb); border-radius: var(--radius-md, 0.375rem);">
          <h3 style="margin: 0 0 0.5rem 0;">概要</h3>
          <p style="margin: 0; color: var(--color-foreground-muted, #6b7280);">
            これは概要パネルのコンテンツです。
          </p>
        </div>
      </ui-tab-panel>
      
      <ui-tab-panel slot="panel" tab-id="details">
        <div style="padding: 1rem; background: var(--bg-surface-1, #f9fafb); border-radius: var(--radius-md, 0.375rem);">
          <h3 style="margin: 0 0 0.5rem 0;">詳細</h3>
          <p style="margin: 0; color: var(--color-foreground-muted, #6b7280);">
            これは詳細パネルのコンテンツです。
          </p>
        </div>
      </ui-tab-panel>
      
      <ui-tab-panel slot="panel" tab-id="settings">
        <div style="padding: 1rem; background: var(--bg-surface-1, #f9fafb); border-radius: var(--radius-md, 0.375rem);">
          <h3 style="margin: 0 0 0.5rem 0;">設定</h3>
          <p style="margin: 0; color: var(--color-foreground-muted, #6b7280);">
            これは設定パネルのコンテンツです。
          </p>
        </div>
      </ui-tab-panel>
    </ui-tabs>
  `,
};

/**
 * Segmented Control 型
 */
export const SegmentedControl: Story = {
  args: {
    variant: 'segmented',
    ariaLabel: 'ビュー切り替え',
  },
  render: (args) => html`
    <ui-tabs variant="${args['variant']}" aria-label="${args['ariaLabel']}">
      <ui-tab slot="tab" tab-id="list">リスト</ui-tab>
      <ui-tab slot="tab" tab-id="grid">グリッド</ui-tab>
      <ui-tab slot="tab" tab-id="chart">チャート</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="list">
        <div style="padding: 1rem;">リスト表示</div>
      </ui-tab-panel>
      
      <ui-tab-panel slot="panel" tab-id="grid">
        <div style="padding: 1rem;">グリッド表示</div>
      </ui-tab-panel>
      
      <ui-tab-panel slot="panel" tab-id="chart">
        <div style="padding: 1rem;">チャート表示</div>
      </ui-tab-panel>
    </ui-tabs>
  `,
};

/**
 * 無効化されたタブ
 */
export const WithDisabledTab: Story = {
  render: () => html`
    <ui-tabs variant="underline">
      <ui-tab slot="tab" tab-id="active">有効</ui-tab>
      <ui-tab slot="tab" tab-id="disabled" disabled>無効</ui-tab>
      <ui-tab slot="tab" tab-id="another">別のタブ</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="active">
        <div style="padding: 1rem;">有効なタブのコンテンツ</div>
      </ui-tab-panel>
      
      <ui-tab-panel slot="panel" tab-id="disabled">
        <div style="padding: 1rem;">このコンテンツは表示されません</div>
      </ui-tab-panel>
      
      <ui-tab-panel slot="panel" tab-id="another">
        <div style="padding: 1rem;">別のタブのコンテンツ</div>
      </ui-tab-panel>
    </ui-tabs>
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
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <ui-tabs variant="underline">
        <ui-tab slot="tab" tab-id="overview">概要</ui-tab>
        <ui-tab slot="tab" tab-id="details">詳細</ui-tab>
        <ui-tab slot="tab" tab-id="settings">設定</ui-tab>
        
        <ui-tab-panel slot="panel" tab-id="overview">
          <div style="padding: 1rem;">Underline型のダークモード</div>
        </ui-tab-panel>
        <ui-tab-panel slot="panel" tab-id="details">
          <div style="padding: 1rem;">詳細パネル</div>
        </ui-tab-panel>
        <ui-tab-panel slot="panel" tab-id="settings">
          <div style="padding: 1rem;">設定パネル</div>
        </ui-tab-panel>
      </ui-tabs>
      
      <ui-tabs variant="segmented">
        <ui-tab slot="tab" tab-id="list">リスト</ui-tab>
        <ui-tab slot="tab" tab-id="grid">グリッド</ui-tab>
        <ui-tab slot="tab" tab-id="chart">チャート</ui-tab>
        
        <ui-tab-panel slot="panel" tab-id="list">
          <div style="padding: 1rem;">Segmented型のダークモード</div>
        </ui-tab-panel>
        <ui-tab-panel slot="panel" tab-id="grid">
          <div style="padding: 1rem;">グリッド表示</div>
        </ui-tab-panel>
        <ui-tab-panel slot="panel" tab-id="chart">
          <div style="padding: 1rem;">チャート表示</div>
        </ui-tab-panel>
      </ui-tabs>
    </div>
  `,
};

// ========================================
// BDD テストストーリー
// ========================================

/**
 * BDD: 基本的なレンダリング
 */
export const BDD_BasicRendering: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tabs data-testid="tabs" variant="underline">
      <ui-tab slot="tab" tab-id="tab1" data-testid="tab-1">タブ1</ui-tab>
      <ui-tab slot="tab" tab-id="tab2" data-testid="tab-2">タブ2</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="tab1" data-testid="panel-1">パネル1</ui-tab-panel>
      <ui-tab-panel slot="panel" tab-id="tab2" data-testid="panel-2">パネル2</ui-tab-panel>
    </ui-tabs>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tabs = canvas.getByTestId('tabs') as HTMLElement;

    // タブコンポーネントが正しくレンダリングされている
    await expect(tabs).toBeInTheDocument();
    
    // タブリストが存在する
    const tablist = tabs.shadowRoot?.querySelector('[role="tablist"]');
    await expect(tablist).toBeTruthy();
  },
};

/**
 * BDD: タブ切り替え
 */
export const BDD_TabSwitch: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tabs data-testid="tabs">
      <ui-tab slot="tab" tab-id="tab1" data-testid="tab-1">タブ1</ui-tab>
      <ui-tab slot="tab" tab-id="tab2" data-testid="tab-2">タブ2</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="tab1" data-testid="panel-1">パネル1</ui-tab-panel>
      <ui-tab-panel slot="panel" tab-id="tab2" data-testid="panel-2">パネル2</ui-tab-panel>
    </ui-tabs>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tabs = canvas.getByTestId('tabs') as UiTabs;
    await tabs.updateComplete;
    
    // 最初のタブが選択されている
    const tab1 = canvas.getByTestId('tab-1') as HTMLElement;
    await expect(tab1.shadowRoot?.querySelector('[role="tab"]')?.getAttribute('aria-selected')).toBe('true');
    
    // 2番目のタブをクリック
    const tab2 = canvas.getByTestId('tab-2') as HTMLElement;
    const tab2Button = tab2.shadowRoot?.querySelector('[role="tab"]') as HTMLElement;
    await userEvent.click(tab2Button);
    
    await tabs.updateComplete;
    
    // 2番目のタブが選択されている
    await expect(tab2.shadowRoot?.querySelector('[role="tab"]')?.getAttribute('aria-selected')).toBe('true');
  },
};

/**
 * BDD: キーボード操作（矢印キー）
 */
export const BDD_KeyboardNavigation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tabs data-testid="tabs">
      <ui-tab slot="tab" tab-id="tab1" data-testid="tab-1">タブ1</ui-tab>
      <ui-tab slot="tab" tab-id="tab2" data-testid="tab-2">タブ2</ui-tab>
      <ui-tab slot="tab" tab-id="tab3" data-testid="tab-3">タブ3</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="tab1">パネル1</ui-tab-panel>
      <ui-tab-panel slot="panel" tab-id="tab2">パネル2</ui-tab-panel>
      <ui-tab-panel slot="panel" tab-id="tab3">パネル3</ui-tab-panel>
    </ui-tabs>
  `,
  async play({ canvasElement, step }) {
    const canvas = within(canvasElement);
    const tabs = canvas.getByTestId('tabs') as UiTabs;
    await tabs.updateComplete;
    

    
    await step('右矢印キーで次のタブへ移動', async () => {
      const tab1 = canvas.getByTestId('tab-1') as HTMLElement;
      const tab1Button = tab1.shadowRoot?.querySelector('button') as HTMLElement;
      tab1Button.focus();
      tab1Button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
      
      await new Promise(resolve => setTimeout(resolve, 50));
      await tabs.updateComplete;
      
      const tab2 = canvas.getByTestId('tab-2') as HTMLElement;
      await expect(tab2.shadowRoot?.querySelector('[role="tab"]')?.getAttribute('aria-selected')).toBe('true');
    });
    
    await step('左矢印キーで前のタブへ移動', async () => {
      const tab2 = canvas.getByTestId('tab-2') as HTMLElement;
      const tab2Button = tab2.shadowRoot?.querySelector('button') as HTMLElement;
      tab2Button.focus(); // 念のため
      tab2Button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
      
      await new Promise(resolve => setTimeout(resolve, 50));
      await tabs.updateComplete;
      
      const tab1 = canvas.getByTestId('tab-1') as HTMLElement;
      await expect(tab1.shadowRoot?.querySelector('[role="tab"]')?.getAttribute('aria-selected')).toBe('true');
    });
  },
};

/**
 * BDD: 無効化されたタブ
 */
export const BDD_DisabledTab: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tabs data-testid="tabs">
      <ui-tab slot="tab" tab-id="tab1" data-testid="tab-1">タブ1</ui-tab>
      <ui-tab slot="tab" tab-id="tab2" data-testid="tab-2" disabled>タブ2（無効）</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="tab1">パネル1</ui-tab-panel>
      <ui-tab-panel slot="panel" tab-id="tab2">パネル2</ui-tab-panel>
    </ui-tabs>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tabs = canvas.getByTestId('tabs') as UiTabs;
    await tabs.updateComplete;
    
    // 無効化されたタブボタンにdisabled属性がある
    const tab2 = canvas.getByTestId('tab-2') as HTMLElement;
    const tab2Button = tab2.shadowRoot?.querySelector('[role="tab"]');
    await expect(tab2Button).toHaveAttribute('aria-disabled', 'true');
  },
};

/**
 * BDD: イベント発火
 */
export const BDD_TabChangeEvent: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tabs data-testid="tabs">
      <ui-tab slot="tab" tab-id="tab1" data-testid="tab-1">タブ1</ui-tab>
      <ui-tab slot="tab" tab-id="tab2" data-testid="tab-2">タブ2</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="tab1">パネル1</ui-tab-panel>
      <ui-tab-panel slot="panel" tab-id="tab2">パネル2</ui-tab-panel>
    </ui-tabs>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tabs = canvas.getByTestId('tabs') as HTMLElement;
    
    let eventFired = false;
    let selectedTabId = '';
    
    tabs.addEventListener('tab-change', ((e: CustomEvent) => {
      eventFired = true;
      selectedTabId = e.detail.tabId;
    }) as EventListener);
    
    // 2番目のタブをクリック
    const tab2 = canvas.getByTestId('tab-2') as HTMLElement;
    const tab2Button = tab2.shadowRoot?.querySelector('[role="tab"]') as HTMLElement;
    await userEvent.click(tab2Button);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // イベントが発火し、正しいタブIDが渡されている
    await expect(eventFired).toBe(true);
    await expect(selectedTabId).toBe('tab2');
  },
};

/**
 * BDD: 国際化対応
 */
export const BDD_Internationalization: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tabs data-testid="tabs" aria-label="Navigation tabs">
      <ui-tab slot="tab" tab-id="home">Home</ui-tab>
      <ui-tab slot="tab" tab-id="about">About</ui-tab>
      
      <ui-tab-panel slot="panel" tab-id="home">Home panel</ui-tab-panel>
      <ui-tab-panel slot="panel" tab-id="about">About panel</ui-tab-panel>
    </ui-tabs>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tabs = canvas.getByTestId('tabs') as HTMLElement;
    const tablist = tabs.shadowRoot?.querySelector('[role="tablist"]');
    
    // カスタム aria-label が適用されている
    await expect(tablist?.getAttribute('aria-label')).toBe('Navigation tabs');
  },
};
