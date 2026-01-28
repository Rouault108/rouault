import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiDivider } from './divider';
import './divider.ts';

const meta: Meta<UiDivider> = {
  title: 'Components/Divider',
  component: 'ui-divider',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['solid', 'dashed', 'dotted', 'gradient'],
      description: 'ディバイダーのスタイルバリアント',
    },
    spacing: {
      control: { type: 'select' },
      options: ['tight', 'normal', 'loose'],
      description: '上下のスペーシング',
    },
    thickness: {
      control: { type: 'select' },
      options: ['thin', 'normal', 'thick'],
      description: '線の太さ',
    },
    label: {
      control: { type: 'text' },
      description: 'テキストラベル（オプション）',
    },
  },
};

export default meta;
type Story = StoryObj<UiDivider>;

/**
 * デフォルト: シンプルな区切り線
 */
export const Default: Story = {
  render: () => html`
    <div>
      <p>Content above the divider</p>
      <ui-divider></ui-divider>
      <p>Content below the divider</p>
    </div>
  `,
};

/**
 * 太さのバリエーション
 */
export const Thickness: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280);">Thin (デフォルト)</p>
        <ui-divider thickness="thin"></ui-divider>
      </div>
      
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280);">Normal</p>
        <ui-divider thickness="normal"></ui-divider>
      </div>
      
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280);">Thick</p>
        <ui-divider thickness="thick"></ui-divider>
      </div>
    </div>
  `,
};

/**
 * スタイルバリアント
 */
export const Variants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280);">Solid (デフォルト)</p>
        <ui-divider variant="solid"></ui-divider>
      </div>
      
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280);">Dashed</p>
        <ui-divider variant="dashed"></ui-divider>
      </div>
      
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280);">Dotted</p>
        <ui-divider variant="dotted"></ui-divider>
      </div>
      
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280);">Gradient</p>
        <ui-divider variant="gradient"></ui-divider>
      </div>
    </div>
  `,
};

/**
 * スペーシング
 */
export const Spacing: Story = {
  render: () => html`
    <div>
      <p>Content before tight spacing</p>
      <ui-divider spacing="tight"></ui-divider>
      <p>Content after tight spacing</p>
      
      <ui-divider spacing="normal"></ui-divider>
      
      <p>Content before loose spacing</p>
      <ui-divider spacing="loose"></ui-divider>
      <p>Content after loose spacing</p>
    </div>
  `,
};

/**
 * テキストラベル付き
 */
export const WithLabel: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div>
        <p>Section 1 content...</p>
        <ui-divider label="OR"></ui-divider>
        <p>Section 2 content...</p>
      </div>
      
      <div>
        <p>Login with email</p>
        <ui-divider label="or continue with"></ui-divider>
        <p>Social login buttons...</p>
      </div>
      
      <div>
        <p>Previous content</p>
        <ui-divider label="2024"></ui-divider>
        <p>Next content</p>
      </div>
    </div>
  `,
};

/**
 * グラデーションとラベルの組み合わせ
 */
export const GradientWithLabel: Story = {
  render: () => html`
    <div>
      <p>Modern design system features</p>
      <ui-divider variant="gradient" label="Features"></ui-divider>
      <p>Interactive components</p>
    </div>
  `,
};

/**
 * 文書内での使用例
 */
export const InDocument: Story = {
  render: () => html`
    <article style="max-width: 600px;">
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Introduction</h2>
      <p style="line-height: 1.7; color: var(--color-foreground, #0a0a0a);">
        This is the introduction section of our documentation. It provides an overview
        of the design system and its core principles.
      </p>
      
      <ui-divider spacing="loose"></ui-divider>
      
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Getting Started</h2>
      <p style="line-height: 1.7; color: var(--color-foreground, #0a0a0a);">
        Learn how to integrate our components into your project with these simple steps.
      </p>
      
      <ui-divider label="Advanced"></ui-divider>
      
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Advanced Usage</h2>
      <p style="line-height: 1.7; color: var(--color-foreground, #0a0a0a);">
        Explore advanced features and customization options.
      </p>
    </article>
  `,
};

/**
 * ダークモード表示確認
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background-color: #0a0a0a; padding: 2rem; border-radius: 8px;">
      <p style="color: #ededed;">Content in dark mode</p>
      <ui-divider></ui-divider>
      <p style="color: #ededed;">More content</p>
      
      <ui-divider variant="gradient" spacing="loose"></ui-divider>
      
      <p style="color: #ededed;">Gradient divider</p>
      <ui-divider label="Section" spacing="loose"></ui-divider>
      <p style="color: #ededed;">Labeled divider</p>
    </div>
  `,
};

/**
 * BDD: バリアント属性テスト
 */
export const BDD_VariantAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-divider data-testid="divider-variant" variant="dashed"></ui-divider>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const divider = canvas.getByTestId('divider-variant') as UiDivider;

    await divider.updateComplete;

    const hr = divider.shadowRoot?.querySelector('hr');
    const styles = getComputedStyle(hr!);
    await expect(styles.borderTopStyle).toBe('dashed');
    await expect(styles.borderTopWidth).toBe('1px');
  },
};

/**
 * BDD: ラベル表示テスト
 */
export const BDD_LabelDisplay: Story = {
  tags: ['test'],
  render: () => html`
    <ui-divider data-testid="divider-label" label="Test Label"></ui-divider>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const divider = canvas.getByTestId('divider-label') as UiDivider;

    await divider.updateComplete;

    // label 属性が正しく反映されているか
    await expect(divider.getAttribute('label')).toBe('Test Label');
    
    // Shadow DOM内にラベルが表示されているか
    const labelElement = divider.shadowRoot?.querySelector('.divider-label');
    await expect(labelElement).toBeTruthy();
    await expect(labelElement?.textContent?.trim()).toBe('Test Label');
  },
};

/**
 * BDD: ARIA属性テスト
 */
export const BDD_AriaAttributes: Story = {
  tags: ['test'],
  render: () => html`
    <ui-divider data-testid="divider-aria"></ui-divider>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const divider = canvas.getByTestId('divider-aria') as UiDivider;

    await divider.updateComplete;

    // Shadow DOM内のhr要素にrole="separator"があるか
    const hrElement = divider.shadowRoot?.querySelector('hr');
    await expect(hrElement).toBeTruthy();
    await expect(hrElement?.getAttribute('role')).toBe('separator');
    await expect(hrElement?.getAttribute('aria-orientation')).toBe('horizontal');
  },
};

/**
 * BDD: Thickness（太さ）計算値テスト
 */
export const BDD_ThicknessValues: Story = {
  tags: ['test'],
  render: () => html`
    <div>
      <ui-divider data-testid="divider-thin" thickness="thin"></ui-divider>
      <ui-divider data-testid="divider-normal" thickness="normal"></ui-divider>
      <ui-divider data-testid="divider-thick" thickness="thick"></ui-divider>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);

    const dividerThin = canvas.getByTestId('divider-thin') as UiDivider;
    const dividerNormal = canvas.getByTestId('divider-normal') as UiDivider;
    const dividerThick = canvas.getByTestId('divider-thick') as UiDivider;

    await Promise.all([
      dividerThin.updateComplete,
      dividerNormal.updateComplete,
      dividerThick.updateComplete,
    ]);

    // Thin (1px)
    const hrThin = dividerThin.shadowRoot?.querySelector('hr');
    const stylesThin = getComputedStyle(hrThin!);
    await expect(stylesThin.height).toBe('1px');

    // Normal (2px)
    const hrNormal = dividerNormal.shadowRoot?.querySelector('hr');
    const stylesNormal = getComputedStyle(hrNormal!);
    await expect(stylesNormal.height).toBe('2px');

    // Thick (3px)
    const hrThick = dividerThick.shadowRoot?.querySelector('hr');
    const stylesThick = getComputedStyle(hrThick!);
    await expect(stylesThick.height).toBe('3px');
  },
};

/**
 * BDD: Spacing（スペーシング）計算値テスト
 */
export const BDD_SpacingValues: Story = {
  tags: ['test'],
  render: () => html`
    <div>
      <ui-divider data-testid="divider-tight" spacing="tight"></ui-divider>
      <ui-divider data-testid="divider-normal" spacing="normal"></ui-divider>
      <ui-divider data-testid="divider-loose" spacing="loose"></ui-divider>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);

    const dividerTight = canvas.getByTestId('divider-tight') as UiDivider;
    const dividerNormal = canvas.getByTestId('divider-normal') as UiDivider;
    const dividerLoose = canvas.getByTestId('divider-loose') as UiDivider;

    await Promise.all([
      dividerTight.updateComplete,
      dividerNormal.updateComplete,
      dividerLoose.updateComplete,
    ]);

    // Tight (0.75rem = 12px)
    const stylesTight = getComputedStyle(dividerTight);
    await expect(stylesTight.marginTop).toBe('12px');
    await expect(stylesTight.marginBottom).toBe('12px');

    // Normal (1.5rem = 24px)
    const stylesNormal = getComputedStyle(dividerNormal);
    await expect(stylesNormal.marginTop).toBe('24px');
    await expect(stylesNormal.marginBottom).toBe('24px');

    // Loose (3rem = 48px)
    const stylesLoose = getComputedStyle(dividerLoose);
    await expect(stylesLoose.marginTop).toBe('48px');
    await expect(stylesLoose.marginBottom).toBe('48px');
  },
};

/**
 * BDD: Gradient Opacity テスト
 */
export const BDD_GradientOpacity: Story = {
  tags: ['test'],
  render: () => html`
    <ui-divider data-testid="divider-gradient" variant="gradient"></ui-divider>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const divider = canvas.getByTestId('divider-gradient') as UiDivider;

    await divider.updateComplete;

    const hr = divider.shadowRoot?.querySelector('hr');
    const styles = getComputedStyle(hr!);
    
    // opacity: var(--opacity-30) = 0.3
    await expect(styles.opacity).toBe('0.3');
  },
};

/**
 * BDD: ラベル付きDividerのARIA構造テスト
 */
export const BDD_LabeledDividerARIA: Story = {
  tags: ['test'],
  render: () => html`
    <ui-divider data-testid="divider-labeled" label="Section"></ui-divider>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const divider = canvas.getByTestId('divider-labeled') as UiDivider;

    await divider.updateComplete;

    // コンテナがrole="separator"を持つ
    const container = divider.shadowRoot?.querySelector('.divider-container');
    await expect(container?.getAttribute('role')).toBe('separator');
    await expect(container?.getAttribute('aria-orientation')).toBe('horizontal');

    // hr要素はaria-hidden="true"
    const hrElements = divider.shadowRoot?.querySelectorAll('hr');
    await expect(hrElements?.length).toBe(2);
    hrElements?.forEach(hr => {
      expect(hr.getAttribute('aria-hidden')).toBe('true');
    });

    // ラベルが表示されている
    const label = divider.shadowRoot?.querySelector('.divider-label');
    await expect(label?.textContent?.trim()).toBe('Section');
  },
};

/**
 * BDD: トランジション設定テスト
 */
export const BDD_TransitionProperties: Story = {
  tags: ['test'],
  render: () => html`
    <ui-divider data-testid="divider-transition"></ui-divider>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const divider = canvas.getByTestId('divider-transition') as UiDivider;

    await divider.updateComplete;

    const hr = divider.shadowRoot?.querySelector('hr');
    const styles = getComputedStyle(hr!);

    // トランジションプロパティが設定されているか
    const transitionProperty = styles.transitionProperty;
    
    // 'background-color', 'border-color', 'opacity' が含まれているか
    await expect(transitionProperty).toContain('background-color');
    await expect(transitionProperty).toContain('border-color');
    await expect(transitionProperty).toContain('opacity');
  },
};
