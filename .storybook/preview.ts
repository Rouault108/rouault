import { setCustomElementsManifest } from '@storybook/web-components-vite';
import customElements from '../custom-elements.json';


// Fontsource - セルフホストフォント（unicode-range分割済み）
// Noto Sans JP: Variable フォント（400-900）
import '@fontsource-variable/noto-sans-jp';
// JetBrains Mono: コードブロック用
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

// スタイルシートの読み込み
import '../src/assets/css/tokens.css';
import '../src/assets/css/main.css';

setCustomElementsManifest(customElements);

import type { Preview } from '@storybook/web-components';

const preview: Preview = {
  parameters: {
    // アクションの自動検知
    actions: { argTypesRegex: "^on[A-Z].*" },

    a11y: {
      element: '#storybook-root',
    },
    
    // コントロールのマッチング設定
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      // Lion/Lit コンポーネント用の展開設定
      expanded: true, 
    },
    
    // オプション: 背景色の設定など
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },

    docs: {
      source: { type: 'dynamic' },
    },

    interactions: {
      debugging: true,
    },
  },
};

export default preview;
