import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ensureFooterDocumentStyles, renderFooter, type FooterRenderOptions } from './footer';

const DEFAULT_OPTIONS: FooterRenderOptions = {
  id: 'footer-default',
  meta: {
    siteName: 'Rouault',
    siteUrl: '/',
    copyrightText: '© 2026 Ruo Miyata. CC BY 4.0.',
    buildLabel: 'build 4a2b9f1',
  },
  links: [
    { href: '/search', label: '検索' },
    { href: '/about/', label: 'このサイトについて' },
  ],
};

const renderStoryFooter = (options: FooterRenderOptions) => {
  ensureFooterDocumentStyles();
  return renderFooter(options);
};

const meta: Meta = {
  title: 'Components/Footer',
  component: 'footer',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
footer は純粋描画の \`renderFooter(options)\` と document style 注入の
\`ensureFooterDocumentStyles()\` に分離されています。

render 構造の合否は \`test/ssr/footer-render.test.ts\`、  
token / forced-colors / print の CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。

この story ファイルは **docs / smoke / 手動確認** に限定します。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`${renderStoryFooter(DEFAULT_OPTIONS)}`,
};

export const MinimalState: Story = {
  render: () =>
    html`${renderStoryFooter({
      id: 'footer-minimal',
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
    })}`,
  parameters: {
    docs: {
      description: {
        story: `
最小状態の docs story です。

- siteName は文字列として表示
- legal row は残る
- nav / build / description / eyebrow は省略

構造の合否は \`test/ssr/footer-render.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const LinkAndBuildVariants: Story = {
  render: () => html`
    <div style="display: grid; gap: var(--space-6);">
      <section>
        <h3 style="margin: 0 0 var(--space-2); font-size: var(--text-sm);">
          siteUrl / buildLabel / links あり
        </h3>
        ${renderStoryFooter({
          id: 'footer-variant-full',
          meta: {
            siteName: 'Rouault',
            siteUrl: 'https://rouault.example',
            copyrightText: '© 2026 Ruo Miyata. CC BY 4.0.',
            buildLabel: 'release 2026.03.24',
          },
          links: [
            { href: '/license', label: 'ライセンス' },
            { href: 'mailto:hello@example.com', label: '連絡', external: true },
            { href: 'javascript:alert(1)', label: 'invalid' },
            { href: '/ignored', label: '   ' },
          ],
          a11y: {
            navLabel: 'フッター補助導線',
          },
        })}
      </section>

      <section>
        <h3 style="margin: 0 0 var(--space-2); font-size: var(--text-sm);">
          siteUrl 無効 / buildLabel なし / links なし
        </h3>
        ${renderStoryFooter({
          id: 'footer-variant-minimal',
          meta: {
            siteName: 'Rouault',
            siteUrl: 'javascript:alert(1)',
            copyrightText: '© 2026 Ruo Miyata.',
          },
          links: [],
        })}
      </section>
    </div>
  `,
};

export const AccessibilityReference: Story = {
  render: () =>
    html`${renderStoryFooter({
      id: 'footer-accessibility',
      meta: {
        siteName: 'Rouault',
        siteUrl: '/',
        copyrightText: '© 2026 Ruo Miyata. CC BY 4.0.',
      },
      links: [
        { href: '/about', label: 'このサイトについて' },
        { href: '/help', label: 'ヘルプ' },
      ],
      a11y: {
        navLabel: 'フッター内の補助ナビゲーション',
      },
    })}`,
  parameters: {
    docs: {
      description: {
        story:
          'custom navLabel と legal/nav の見え方を参照する docs story です。DOM 順序の合否は SSR test を正本とします。',
      },
    },
  },
};

export const TokenContractManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    ${renderStoryFooter({
      id: 'footer-token-contract',
      meta: {
        eyebrow: 'Notes',
        siteName: 'Rouault',
        siteUrl: '/',
        description: '静的 HTML と Lit enhancer を分離した personal notes application',
        copyrightText: '© 2026 Ruo Miyata.',
        buildLabel: 'build-2026-04-01',
      },
      links: [
        { href: '/about/', label: 'About' },
        { href: '/search/', label: 'Search' },
      ],
    })}
  `,
  parameters: {
    docs: {
      description: {
        story:
          'token / spacing / description / build の視覚確認用 story です。CSS 構造契約の合否は test/ssr/css-structure-contracts.test.ts を正本とします。',
      },
    },
  },
};

export const ForcedColorsManual: Story = {
  tags: ['manual-only'],
  render: () =>
    html`${renderStoryFooter({
      id: 'footer-forced-colors',
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
    })}`,
  parameters: {
    docs: {
      description: {
        story:
          'forced-colors の手動確認用 story です。rule existence の合否は test/ssr/css-structure-contracts.test.ts を正本とします。',
      },
    },
  },
};

export const PrintPolicyManual: Story = {
  tags: ['manual-only'],
  render: () =>
    html`${renderStoryFooter({
      id: 'footer-print-policy',
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
    })}`,
  parameters: {
    docs: {
      description: {
        story:
          'print 時の扱いを説明する手動確認用 story です。print rule の存在は test/ssr/css-structure-contracts.test.ts を正本とします。',
      },
    },
  },
};
