import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiHeading } from './heading';
import './heading.ts';

const meta: Meta<UiHeading> = {
  title: 'Components/Heading',
  component: 'ui-heading',
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: { type: 'select' },
      options: [1, 2, 3, 4, 5, 6],
      description: '見出しレベル (h1-h6)',
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'gradient', 'underlined', 'plain'],
      description: 'スタイルバリアント',
    },
    muted: {
      control: { type: 'boolean' },
      description: '控えめな色にするか',
    },
    noMargin: {
      control: { type: 'boolean' },
      description: 'マージンを削除するか',
    },
  },
};

export default meta;
type Story = StoryObj<UiHeading>;

/**
 * デフォルト: すべての見出しレベル
 */
export const AllLevels: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <ui-heading level="1">Heading 1 - Main Title</ui-heading>
      <ui-heading level="2">Heading 2 - Section Title</ui-heading>
      <ui-heading level="3">Heading 3 - Subsection Title</ui-heading>
      <ui-heading level="4">Heading 4 - Minor Heading</ui-heading>
      <ui-heading level="5">Heading 5 - Small Heading</ui-heading>
      <ui-heading level="6">Heading 6 - Tiny Heading</ui-heading>
    </div>
  `,
};

/**
 * H1 見出し
 */
export const Level1: Story = {
  render: () => html`
    <ui-heading level="1">The Future of Design Systems</ui-heading>
    <p style="color: var(--color-foreground-muted, #6b7280); margin-top: 1rem;">
      Creating beautiful, accessible, and maintainable user interfaces.
    </p>
  `,
};

/**
 * H2 見出し
 */
export const Level2: Story = {
  render: () => html`
    <ui-heading level="2">Getting Started</ui-heading>
    <p style="color: var(--color-foreground-muted, #6b7280); margin-top: 0.75rem;">
      Learn how to integrate our design system into your project.
    </p>
  `,
};

/**
 * グラデーションバリアント
 */
export const Gradient: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <ui-heading level="1" variant="gradient">Modern Design System</ui-heading>
      <ui-heading level="2" variant="gradient">Beautiful Typography</ui-heading>
      <ui-heading level="3" variant="gradient">Accessible Components</ui-heading>
    </div>
  `,
};

/**
 * アンダーラインバリアント
 */
export const Underlined: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <ui-heading level="2" variant="underlined">Introduction</ui-heading>
      <p style="color: var(--color-foreground-muted, #6b7280);">
        This section introduces the core concepts of our design system.
      </p>
      
      <ui-heading level="2" variant="underlined">Core Principles</ui-heading>
      <p style="color: var(--color-foreground-muted, #6b7280);">
        Learn about the fundamental principles that guide our design decisions.
      </p>
    </div>
  `,
};

/**
 * プレーンバリアント（最小限）
 */
export const Plain: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-heading level="3" variant="plain">Simple Heading</ui-heading>
      <ui-heading level="4" variant="plain">Minimal Style</ui-heading>
      <ui-heading level="5" variant="plain">Clean Typography</ui-heading>
    </div>
  `,
};

/**
 * Muted（控えめな色）
 */
export const Muted: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-heading level="2" muted>Secondary Heading</ui-heading>
      <ui-heading level="3" muted>Less Prominent Title</ui-heading>
      <ui-heading level="4" muted>Subtle Heading</ui-heading>
    </div>
  `,
};

/**
 * マージンなし
 */
export const NoMargin: Story = {
  render: () => html`
    <div style="border: 1px dashed #ccc; padding: 1rem;">
      <ui-heading level="2" noMargin>Heading with no margin</ui-heading>
      <p style="margin: 0; color: var(--color-foreground-muted, #6b7280);">
        This heading has no margin, useful for tight layouts.
      </p>
    </div>
  `,
};

/**
 * 文書内での使用例
 */
export const InDocument: Story = {
  render: () => html`
    <article>
      <ui-heading level="1">Design System Documentation</ui-heading>
      
      <p style="color: var(--color-foreground-muted, #6b7280); font-size: 1.125rem; margin-top: 1rem;">
        Welcome to our comprehensive design system documentation. This guide will help you 
        create consistent, accessible, and beautiful user interfaces.
      </p>
      
      <ui-heading level="2">Typography</ui-heading>
      
      <p style="color: var(--color-foreground, #0a0a0a); line-height: 1.7;">
        Typography is the foundation of good design. Our system uses a carefully crafted 
        type scale to ensure hierarchy and readability.
      </p>
      
      <ui-heading level="3">Font Families</ui-heading>
      
      <p style="color: var(--color-foreground, #0a0a0a); line-height: 1.7;">
        We use system fonts for optimal performance and native feel across all platforms.
      </p>
      
      <ui-heading level="4">Headings</ui-heading>
      
      <p style="color: var(--color-foreground, #0a0a0a); line-height: 1.7;">
        Six levels of headings provide clear content hierarchy.
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
      <ui-heading level="1">Dark Mode Heading</ui-heading>
      <ui-heading level="2" style="margin-top: 1.5rem;">Optimized for Dark</ui-heading>
      <ui-heading level="3" variant="gradient" style="margin-top: 1.5rem;">
        Gradient in Dark Mode
      </ui-heading>
      <ui-heading level="4" variant="underlined" style="margin-top: 1.5rem;">
        Underlined in Dark
      </ui-heading>
    </div>
  `,
};

/**
 * BDD: レベル属性テスト
 */
export const BDD_LevelAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-heading data-testid="heading-level" level="3">Test Heading</ui-heading>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const heading = canvas.getByTestId('heading-level') as UiHeading;

    await heading.updateComplete;

    // level 属性が正しく反映されているか
    await expect(heading.getAttribute('level')).toBe('3');
    
    // 正しい h タグがレンダリングされているか
    const h3 = heading.shadowRoot?.querySelector('h3');
    await expect(h3).toBeTruthy();
  },
};

/**
 * BDD: バリアント切り替えテスト
 */
export const BDD_VariantSwitch: Story = {
  tags: ['test'],
  render: () => html`
    <ui-heading data-testid="heading-variant" level="2" variant="gradient">
      Gradient Heading
    </ui-heading>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const heading = canvas.getByTestId('heading-variant') as UiHeading;

    await heading.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(heading.getAttribute('variant')).toBe('gradient');
  },
};

/**
 * BDD: アクセシビリティテスト
 */
export const BDD_Accessibility: Story = {
  tags: ['test'],
  render: () => html`
    <div>
      <ui-heading data-testid="h1" level="1">Main Title</ui-heading>
      <ui-heading data-testid="h2" level="2">Section Title</ui-heading>
      <ui-heading data-testid="h3" level="3">Subsection</ui-heading>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    
    // 各レベルの見出しが正しくレンダリングされているか
    const h1Component = canvas.getByTestId('h1') as UiHeading;
    const h2Component = canvas.getByTestId('h2') as UiHeading;
    const h3Component = canvas.getByTestId('h3') as UiHeading;

    await h1Component.updateComplete;
    await h2Component.updateComplete;
    await h3Component.updateComplete;

    // Shadow DOM内に正しいタグがあるか
    const h1Element = h1Component.shadowRoot?.querySelector('h1');
    const h2Element = h2Component.shadowRoot?.querySelector('h2');
    const h3Element = h3Component.shadowRoot?.querySelector('h3');

    await expect(h1Element).toBeTruthy();
    await expect(h2Element).toBeTruthy();
    await expect(h3Element).toBeTruthy();
  },
};
