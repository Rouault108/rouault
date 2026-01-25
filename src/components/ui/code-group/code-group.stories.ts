import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within, userEvent } from 'storybook/test';
import type { UiCodeGroup } from './code-group';
import './code-group.ts';
import '../code-block/code-block.ts';

const meta: Meta<UiCodeGroup> = {
  title: 'Components/CodeGroup',
  component: 'ui-code-group',
  tags: ['autodocs'],
  argTypes: {
    labels: {
      control: { type: 'object' },
      description: 'タブのラベル配列',
    },
    activeTab: {
      control: { type: 'number' },
      description: 'アクティブなタブのインデックス（0始まり）',
    },
    ariaLabel: {
      control: { type: 'text' },
      description: 'タブリストのARIAラベル（多言語対応可）',
    },
  },
};

export default meta;
type Story = StoryObj<UiCodeGroup>;

/**
 * デフォルト: パッケージマネージャーの切り替え
 * 最も一般的な使用例
 */
export const Default: Story = {
  render: () => html`
    <ui-code-group .labels=${['npm', 'yarn', 'pnpm', 'bun']}>
      <ui-code-block language="bash">npm install @lion/ui</ui-code-block>
      <ui-code-block language="bash">yarn add @lion/ui</ui-code-block>
      <ui-code-block language="bash">pnpm add @lion/ui</ui-code-block>
      <ui-code-block language="bash">bun add @lion/ui</ui-code-block>
    </ui-code-group>
  `,
};

/**
 * フレームワーク設定: ファイル名と行番号付き
 */
export const FrameworkConfig: Story = {
  render: () => html`
    <ui-code-group .labels=${['Next.js', 'Vite', 'Remix']}>
      <ui-code-block language="javascript" filename="next.config.js" showLineNumbers>
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['example.com'],
  },
}

module.exports = nextConfig
      </ui-code-block>
      
      <ui-code-block language="javascript" filename="vite.config.js" showLineNumbers>
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})
      </ui-code-block>

      <ui-code-block language="javascript" filename="remix.config.js" showLineNumbers>
/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  serverDependenciesToBundle: ["axios"],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
};
      </ui-code-block>
    </ui-code-group>
  `,
};

/**
 * スタイル比較: 言語の違い
 */
export const StylingComparison: Story = {
  render: () => html`
    <ui-code-group .labels=${['CSS', 'Tailwind', 'Sass']}>
      <ui-code-block language="css" filename="styles.css">
.button {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}
.button:hover {
  background-color: #2563eb;
}
      </ui-code-block>

      <ui-code-block language="html" filename="component.html">
<button class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
  Click me
</button>
      </ui-code-block>

      <ui-code-block language="scss" filename="styles.scss">
$primary: #3b82f6;

.button {
  background-color: $primary;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  
  &:hover {
    background-color: darken($primary, 10%);
  }
}
      </ui-code-block>
    </ui-code-group>
  `,
};

/**
 * 長いコード: スクロール確認用
 * タブ切り替え時に高さが変わる挙動を確認
 */
export const LongContent: Story = {
  render: () => html`
    <ui-code-group .labels=${['Short', 'Long']}>
      <ui-code-block language="javascript" filename="short.js" showLineNumbers>
function add(a, b) {
  return a + b;
}
      </ui-code-block>

      <ui-code-block language="javascript" filename="long.js" showLineNumbers>
// ユーザーデータを取得して整形する関数
async function fetchAndFormatUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    
    // データを整形
    const formattedUser = {
      id: data.id,
      fullName: \`\${data.firstName} \${data.lastName}\`,
      email: data.email,
      role: data.role,
      lastLogin: new Date(data.lastLogin).toLocaleDateString(),
      preferences: {
        theme: data.settings?.theme || 'light',
        notifications: data.settings?.notifications ?? true
      }
    };

    return formattedUser;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
      </ui-code-block>
    </ui-code-group>
  `,
};

/**
 * 多言語対応: aria-label カスタマイズ
 */
export const I18nAriaLabel: Story = {
  render: () => html`
    <ui-code-group .labels=${['English', '日本語']} aria-label="Code samples">
      <ui-code-block language="text">Hello, World!</ui-code-block>
      <ui-code-block language="text">こんにちは、世界！</ui-code-block>
    </ui-code-group>
  `,
};

/**
 * BDD: タブ切り替え機能
 */
export const BDD_TabSwitch: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-group data-testid="code-group-tabs" .labels=${['npm', 'yarn', 'pnpm']}>
      <ui-code-block language="bash">npm install</ui-code-block>
      <ui-code-block language="bash">yarn add</ui-code-block>
      <ui-code-block language="bash">pnpm add</ui-code-block>
    </ui-code-group>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeGroup = canvas.getByTestId('code-group-tabs') as UiCodeGroup;

    // タブが存在するか
    const tabs = codeGroup.shadowRoot?.querySelectorAll('[role="tab"]');
    await expect(tabs?.length).toBe(3);

    // 初期状態: 最初のタブがアクティブ
    const firstTab = tabs?.[0] as HTMLElement;
    await expect(firstTab.getAttribute('aria-selected')).toBe('true');

    // 2番目のタブをクリック
    const secondTab = tabs?.[1] as HTMLElement;
    secondTab?.click();

    // updateComplete を待機
    await codeGroup.updateComplete;

    // 2番目のタブがアクティブになっているか
    await expect(secondTab.getAttribute('aria-selected')).toBe('true');
    await expect(firstTab.getAttribute('aria-selected')).toBe('false');
  },
};

/**
 * BDD: キーボードナビゲーション
 */
export const BDD_KeyboardNavigation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-group data-testid="code-group-keyboard" .labels=${['npm', 'yarn', 'pnpm']}>
      <ui-code-block language="bash">npm install</ui-code-block>
      <ui-code-block language="bash">yarn add</ui-code-block>
      <ui-code-block language="bash">pnpm add</ui-code-block>
    </ui-code-group>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeGroup = canvas.getByTestId('code-group-keyboard') as UiCodeGroup;

    const tabs = codeGroup.shadowRoot?.querySelectorAll('[role="tab"]');
    const firstTab = tabs?.[0] as HTMLElement;
    const secondTab = tabs?.[1] as HTMLElement;

    // 最初のタブにフォーカス
    firstTab?.focus();

    // ArrowRightキーで次のタブへ
    await userEvent.keyboard('{ArrowRight}');
    
    // updateComplete を待機（安定性向上）
    await codeGroup.updateComplete;

    // 2番目のタブがアクティブになっているか
    await expect(secondTab.getAttribute('aria-selected')).toBe('true');
  },
};

/**
 * BDD: tab-changeイベント
 */
export const BDD_TabChangeEvent: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-group data-testid="code-group-event" .labels=${['npm', 'yarn']}>
      <ui-code-block language="bash">npm install</ui-code-block>
      <ui-code-block language="bash">yarn add</ui-code-block>
    </ui-code-group>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeGroup = canvas.getByTestId('code-group-event') as UiCodeGroup;

    let eventFired = false;
    let eventDetail: any = null;

    codeGroup.addEventListener('tab-change', (e: Event) => {
      eventFired = true;
      eventDetail = (e as CustomEvent).detail;
    });

    const tabs = codeGroup.shadowRoot?.querySelectorAll('[role="tab"]');
    const secondTab = tabs?.[1] as HTMLElement;

    // 2番目のタブをクリック
    secondTab?.click();
    
    // updateComplete を待機
    await codeGroup.updateComplete;

    // イベントが発火したか
    await expect(eventFired).toBe(true);
    await expect(eventDetail.activeTab).toBe(1);
  },
};

/**
 * BDD: aria-labelledby アクセシビリティ検証
 */
export const BDD_AccessibilityAria: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-group data-testid="code-group-aria" .labels=${['Tab 1', 'Tab 2']}>
      <ui-code-block language="text">Content 1</ui-code-block>
      <ui-code-block language="text">Content 2</ui-code-block>
    </ui-code-group>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeGroup = canvas.getByTestId('code-group-aria') as UiCodeGroup;

    await codeGroup.updateComplete;

    // タブに id が付与されているか
    const tabs = codeGroup.shadowRoot?.querySelectorAll('[role="tab"]');
    const firstTab = tabs?.[0] as HTMLElement;
    await expect(firstTab.getAttribute('id')).toBe('tab-0');

    // タブパネルに aria-labelledby が付与されているか
    const panels = codeGroup.shadowRoot?.querySelectorAll('[role="tabpanel"]');
    const firstPanel = panels?.[0] as HTMLElement;
    await expect(firstPanel.getAttribute('aria-labelledby')).toBe('tab-0');
    await expect(firstPanel.getAttribute('id')).toBe('panel-0');

    // タブの aria-controls がパネルを参照しているか
    await expect(firstTab.getAttribute('aria-controls')).toBe('panel-0');
  },
};
