import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../../../components/layout/layout-header';
import '../../../components/layout/layout-footer';
import '../../../components/ui/skip-link/skip-link';
import {
  renderFoundationFrame,
  renderFoundationSection,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Layouts/Application/App Shell',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'BaseLayout 相当のアプリケーションシェルを Storybook 上で確認するためのストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () =>
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
                <ui-skip-link id="app-shell-skip-link" href="#app-shell-main" label="メインコンテンツへ移動"></ui-skip-link>
                <layout-header></layout-header>
                <main id="app-shell-main" tabindex="-1" class="container-reading" style="padding-block: var(--space-8);">
                  <div style="display: grid; gap: var(--space-4);">
                    <h2 style="margin: 0;">静かなアプリケーションシェル</h2>
                    <p style="margin: 0;">
                      Header は常に最上部で現在地を示し、本文は reading width に従って落ち着いた幅に収まります。
                    </p>
                    <p style="margin: 0;">
                      Footer は build revision と年を静かに示し、視線の終端を整えます。
                    </p>
                  </div>
                </main>
                <layout-footer app-name="Rouault" revision="abcdef1" year="2026"></layout-footer>
              </div>
            </div>
          `,
          'BaseLayout.11ty.ts の骨格を Storybook で観察できるようにしたものです。',
        )}
      `,
    ),
  play: ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>('#app-shell-root');
    const skipLink = canvasElement.querySelector<HTMLElement>('#app-shell-skip-link');
    const header = canvasElement.querySelector<HTMLElement>('layout-header');
    const main = canvasElement.querySelector<HTMLElement>('#app-shell-main');
    const footer = canvasElement.querySelector<HTMLElement>('footer.ui-footer');

    if (!(root instanceof HTMLElement)) {
      throw new Error('#app-shell-root が見つかりません');
    }
    if (!(skipLink instanceof HTMLElement)) {
      throw new Error('#app-shell-skip-link が見つかりません');
    }
    if (!(header instanceof HTMLElement)) {
      throw new Error('layout-header が見つかりません');
    }
    if (!(main instanceof HTMLElement)) {
      throw new Error('#app-shell-main が見つかりません');
    }
    if (!(footer instanceof HTMLElement)) {
      throw new Error('footer.ui-footer が見つかりません');
    }

    if (!root.classList.contains('app-root')) {
      throw new Error('app shell root には .app-root が必要です');
    }
    if (main.getAttribute('tabindex') !== '-1') {
      throw new Error('main には tabindex="-1" が必要です');
    }
    if (!skipLink.shadowRoot?.querySelector('a[href="#app-shell-main"]')) {
      throw new Error('skip link の href が不正です');
    }
  },
};
