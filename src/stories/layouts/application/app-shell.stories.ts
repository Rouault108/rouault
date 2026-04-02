import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../../../components/layout/layout-header';
import '../../../components/layout/layout-footer';
import '../../../components/ui/skip-link/skip-link';
import {
  renderFoundationFrame,
  renderFoundationSection,
} from '../../shared/foundation-story-helpers';

const renderAppShell = () =>
  renderFoundationFrame(
    {
      title: 'Application Shell',
      description:
        'skip link、header、main、footer が一体で機能する最小シェルを Storybook 上で再現します。',
    },
    html`
      ${renderFoundationSection(
        'BaseLayout Preview',
        html`
          <div class="foundation-stage" style="padding: 0; overflow: clip;">
            <div class="app-root" id="app-shell-root">
              <ui-skip-link
                id="app-shell-skip-link"
                href="#app-shell-main"
                label="メインコンテンツへ移動"
              ></ui-skip-link>
              <layout-header></layout-header>
              <main
                id="app-shell-main"
                tabindex="-1"
                class="container-reading"
                style="padding-block: var(--space-8);"
              >
                <div style="display: grid; gap: var(--space-4);">
                  <h2 style="margin: 0;">静かなアプリケーションシェル</h2>
                  <p style="margin: 0;">
                    Header は常に最上部で現在地を示し、本文は reading width
                    に従って落ち着いた幅に収まります。
                  </p>
                  <p style="margin: 0;">
                    Footer は本文の終端でメタ情報と補助導線を静かに整列させます。
                  </p>
                </div>
              </main>
              <layout-footer build-label="build abcdef1"></layout-footer>
            </div>
          </div>
        `,
        'BaseLayout.11ty.ts の骨格を Storybook で観察できるようにしたものです。',
      )}
    `,
  );

const meta: Meta = {
  title: 'Layouts/Application/App Shell',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
BaseLayout 相当のアプリケーションシェルを Storybook 上で確認するための story です。

このファイルは **docs / smoke / 手動確認** に限定します。  
app shell の静的構造は \`test/ssr/base-layout.test.ts\`、  
最初の Tab 停留点と skip link の実ページ挙動は \`test/e2e/app-shell.spec.ts\`、  
skip link 自体の browser contract は \`test/browser/helpers/skip-link.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  tags: ['smoke'],
  render: () => renderAppShell(),
};

export const KeyboardFlowManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 最初の Tab で skip link に到達すること
- Enter で main へ移動すること
- header / main / footer の視覚的な骨格が崩れていないこと

合否判定は Storybook ではなく、\`test/e2e/app-shell.spec.ts\` を正本とします。
        `,
      },
    },
  },
  render: () => renderAppShell(),
};
