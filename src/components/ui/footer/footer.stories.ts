import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  FOOTER_DEFAULT_NAV_LABEL,
  FOOTER_DOCUMENT_CSS,
  FOOTER_DOCUMENT_STYLE_ID,
  ensureFooterDocumentStyles,
  renderFooter,
  type FooterRenderOptions,
} from './footer';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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

const getFooter = (canvasElement: Element, id: string): HTMLElement => {
  const footer = canvasElement.querySelector<HTMLElement>(`#${id}`);
  if (!(footer instanceof HTMLElement)) {
    throw new Error(`#${id} が見つかりません`);
  }
  if (footer.tagName !== 'FOOTER') {
    throw new Error(`#${id} は <footer> 要素である必要があります`);
  }
  return footer;
};

const getCssText = (): string => {
  const styleTag = document.getElementById(FOOTER_DOCUMENT_STYLE_ID);
  if (!(styleTag instanceof HTMLStyleElement)) {
    throw new Error(`#${FOOTER_DOCUMENT_STYLE_ID} が見つかりません`);
  }
  return styleTag.textContent;
};

const getInner = (footer: HTMLElement): HTMLElement => {
  const inner = footer.querySelector<HTMLElement>(':scope > .ui-footer__inner');
  if (!(inner instanceof HTMLElement)) {
    throw new Error('.ui-footer__inner が見つかりません');
  }
  return inner;
};

const getMeta = (footer: HTMLElement): HTMLElement => {
  const metaElement = footer.querySelector<HTMLElement>('.ui-footer__meta');
  if (!(metaElement instanceof HTMLElement)) {
    throw new Error('.ui-footer__meta が見つかりません');
  }
  return metaElement;
};

const getSubline = (footer: HTMLElement): HTMLElement => {
  const subline = footer.querySelector<HTMLElement>('.ui-footer__subline');
  if (!(subline instanceof HTMLElement)) {
    throw new Error('.ui-footer__subline が見つかりません');
  }
  return subline;
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
フッターは純粋描画の \`renderFooter(options)\` として提供されます。

- 必須入力: \`meta.siteName\` / \`meta.copyrightText\`
- 任意入力: \`meta.siteUrl\` / \`meta.buildLabel\` / \`links\` / \`a11y.navLabel\`
- 最小状態では build 領域と nav を描画しません
- 文書スタイル注入は \`ensureFooterDocumentStyles()\` に分離されています
- 公開トークン: \`--footer-bg\` / \`--footer-fg\` / \`--footer-border\` など
- 完全状態では brand の下に \`subline\` を置き、その中に legal と nav を並べます
        `,
      },
    },
  },
  render: () => html`${renderStoryFooter(DEFAULT_OPTIONS)}`,
};

export default meta;
type Story = StoryObj;

export const DefaultContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  play: ({ canvasElement }) => {
    const footer = getFooter(canvasElement, 'footer-default');
    const inner = getInner(footer);
    const metaElement = getMeta(footer);
    const subline = getSubline(footer);
    const nav = footer.querySelector<HTMLElement>('nav');
    const legal = footer.querySelector<HTMLElement>('.ui-footer__legal');
    const site = footer.querySelector<HTMLElement>('.ui-footer__site');
    const siteLink = footer.querySelector<HTMLAnchorElement>('.ui-footer__site a');
    const description = footer.querySelector('.ui-footer__description');
    const copyright = footer.querySelector<HTMLElement>('.ui-footer__copyright');
    const build = footer.querySelector<HTMLElement>('.ui-footer__build');
    const navList = footer.querySelector<HTMLElement>('.ui-footer__nav-list');
    const navItems = footer.querySelectorAll<HTMLElement>('.ui-footer__nav-item');
    const links = footer.querySelectorAll<HTMLAnchorElement>('nav a');

    assert(
      canvasElement.querySelectorAll('footer').length === 1,
      'Default ストーリーでは footer が 1 つのみ存在する必要があります',
    );
    assert(footer.getAttribute('role') === null, 'role 属性は手動付与しません');
    assert(footer.classList.contains('ui-footer'), '.ui-footer クラスが必要です');
    assert(inner.children.length === 1, '完全状態でも .ui-footer__inner 直下は meta の 1 領域です');
    assert(inner.firstElementChild === metaElement, 'inner 直下は meta のみである必要があります');
    assert(metaElement instanceof HTMLElement, '主要メタ領域が必要です');
    assert(subline instanceof HTMLElement, '完全状態では subline 領域が必要です');
    assert(legal instanceof HTMLElement, 'subline 内に legal 領域が必要です');
    assert(nav instanceof HTMLElement, 'links がある場合は nav が必要です');
    assert(subline.firstElementChild === legal, 'subline の先頭は legal である必要があります');
    assert(subline.lastElementChild === nav, 'subline の末尾は nav である必要があります');
    assert(site instanceof HTMLElement, 'siteName 領域が必要です');
    assert(siteLink instanceof HTMLAnchorElement, 'siteUrl がある場合は siteName をリンク化します');
    assert(description === null, '既定状態では description を描画しません');
    assert(copyright instanceof HTMLElement, 'copyright 領域が必要です');
    assert(build instanceof HTMLElement, 'build 領域が必要です');
    assert(navList instanceof HTMLElement, 'nav-list 領域が必要です');
    assert(navItems.length === 2, '各リンクは nav-item ラッパーに包まれる必要があります');
    assert(siteLink.getAttribute('href') === '/', 'siteName の href が不正です');
    assert(
      copyright.textContent.trim() === DEFAULT_OPTIONS.meta.copyrightText,
      'copyrightText が不正です',
    );
    assert(build.textContent.trim() === DEFAULT_OPTIONS.meta.buildLabel, 'buildLabel が不正です');
    assert(
      nav.getAttribute('aria-label') === FOOTER_DEFAULT_NAV_LABEL,
      '既定の navLabel が必要です',
    );
    assert(links.length === 2, '有効な links が 2 件描画される必要があります');
    assert(
      Array.from(links).every((link) => link.getAttribute('target') === null),
      'target は自動付与しません',
    );
  },
};

export const MinimalState: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () =>
    html`${renderStoryFooter({
      id: 'footer-minimal',
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
    })}`,
  play: ({ canvasElement }) => {
    const footer = getFooter(canvasElement, 'footer-minimal');
    const metaElement = getMeta(footer);
    const subline = footer.querySelector('.ui-footer__subline');
    const nav = footer.querySelector('nav');
    const siteLink = footer.querySelector('.ui-footer__site a');
    const build = footer.querySelector('.ui-footer__build');

    assert(metaElement instanceof HTMLElement, '最小状態でも主要メタ領域は必要です');
    assert(subline === null, 'links と buildLabel が無い場合は subline を描画しません');
    assert(nav === null, 'links が無い場合は nav を描画しません');
    assert(siteLink === null, 'siteUrl が無い場合は siteName をリンク化しません');
    assert(build === null, 'buildLabel が無い場合は build 領域を描画しません');
  },
};

export const LinkAndBuildVariants: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
  play: ({ canvasElement }) => {
    const full = getFooter(canvasElement, 'footer-variant-full');
    const minimal = getFooter(canvasElement, 'footer-variant-minimal');
    const fullLinks = full.querySelectorAll<HTMLAnchorElement>('nav a');
    const fullNav = full.querySelector<HTMLElement>('nav');
    const fullSubline = full.querySelector<HTMLElement>('.ui-footer__subline');
    const fullSiteLink = full.querySelector<HTMLAnchorElement>('.ui-footer__site a');
    const fullBuild = full.querySelector<HTMLElement>('.ui-footer__build');
    const minimalSiteLink = minimal.querySelector('.ui-footer__site a');
    const minimalSubline = minimal.querySelector('.ui-footer__subline');

    assert(
      fullSiteLink instanceof HTMLAnchorElement,
      '有効な siteUrl はリンク化される必要があります',
    );
    assert(fullSiteLink.href.includes('https://rouault.example/'), 'siteUrl の href が不正です');
    assert(fullSubline instanceof HTMLElement, '完全状態では subline が必要です');
    assert(fullBuild instanceof HTMLElement, 'buildLabel が描画されていません');
    assert(
      fullBuild.textContent.trim() === 'release 2026.03.24',
      'buildLabel が描画されていません',
    );
    assert(
      fullNav?.getAttribute('aria-label') === 'フッター補助導線',
      'カスタム navLabel が反映されていません',
    );
    assert(fullLinks.length === 2, '無効な links は個別に除外される必要があります');
    assert(fullLinks[1]?.dataset['external'] === 'true', 'external ヒントが反映されていません');
    assert(minimalSiteLink === null, '無効な siteUrl ではリンク化しません');
    assert(minimal.querySelector('nav') === null, 'links が 0 件なら nav を描画しません');
    assert(minimalSubline === null, 'links と buildLabel が無ければ subline を描画しません');
    assert(
      minimal.querySelector('.ui-footer__build') === null,
      'buildLabel が無ければ build 領域を描画しません',
    );
  },
};

export const AccessibilityContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
  play: ({ canvasElement }) => {
    const footer = getFooter(canvasElement, 'footer-accessibility');
    const inner = getInner(footer);
    const metaElement = getMeta(footer);
    const subline = getSubline(footer);
    const legal = footer.querySelector<HTMLElement>('.ui-footer__legal');
    const nav = footer.querySelector<HTMLElement>('nav');

    assert(nav instanceof HTMLElement, 'nav が必要です');
    assert(
      nav.getAttribute('aria-label') === 'フッター内の補助ナビゲーション',
      'aria-label が不正です',
    );
    assert(metaElement instanceof HTMLElement, '主要メタ領域が必要です');
    assert(inner.firstElementChild === metaElement, 'DOM 順序は meta が先である必要があります');
    assert(inner.childElementCount === 1, 'inner 直下は meta のみである必要があります');
    assert(subline instanceof HTMLElement, '完全状態では subline が必要です');
    assert(legal instanceof HTMLElement, 'subline 内に legal 領域が必要です');
    assert(subline.firstElementChild === legal, 'subline では legal が先である必要があります');
    assert(subline.lastElementChild === nav, 'subline では nav が後である必要があります');
    assert(
      footer.querySelector('[aria-hidden="true"]') === null,
      '現行契約では装飾要素を持ち込みません',
    );
  },
};

export const TokenContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="--footer-build-opacity: 0.55;">
      ${renderStoryFooter({
        id: 'footer-token-contract',
        meta: {
          siteName: 'Rouault',
          siteUrl: '/',
          copyrightText: '© 2026 Ruo Miyata.',
          buildLabel: 'build token-check',
        },
        links: [{ href: '/about', label: 'About' }],
      })}
    </div>
  `,
  play: ({ canvasElement }) => {
    document.querySelectorAll(`#${FOOTER_DOCUMENT_STYLE_ID}`).forEach((node) => {
      node.remove();
    });

    const renderResult = renderFooter(DEFAULT_OPTIONS);
    assert(
      typeof renderResult.strings.length === 'number',
      'renderFooter は TemplateResult を返す必要があります',
    );
    assert(
      document.querySelectorAll(`#${FOOTER_DOCUMENT_STYLE_ID}`).length === 0,
      'renderFooter は文書副作用を持ってはいけません',
    );

    ensureFooterDocumentStyles();
    ensureFooterDocumentStyles();

    const styleTags = document.querySelectorAll(`#${FOOTER_DOCUMENT_STYLE_ID}`);
    assert(styleTags.length === 1, 'スタイル注入は明示的かつ 1 回である必要があります');

    const cssText = getCssText();
    const requiredTokens = [
      '--footer-bg',
      '--footer-fg',
      '--footer-fg-muted',
      '--footer-border',
      '--footer-border-width',
      '--footer-max-inline-size',
      '--footer-padding-block',
      '--footer-padding-inline',
      '--footer-gap',
      '--footer-build-opacity',
      '@media (forced-colors: active)',
      '@media print',
      'CanvasText',
      'display: none !important',
    ] as const;

    for (const token of requiredTokens) {
      assert(cssText.includes(token), `必須契約が不足しています: ${token}`);
    }

    assert(!cssText.includes('prefers-color-scheme'), 'ダークモード分岐はトークン解決へ委譲します');
    assert(FOOTER_DOCUMENT_CSS.includes('.ui-footer__build'), 'build 領域のトークン契約が必要です');
    assert(FOOTER_DOCUMENT_CSS.includes('.ui-footer__subline'), 'subline 領域の契約が必要です');
    assert(FOOTER_DOCUMENT_CSS.includes('.ui-footer__nav-item'), 'nav-item 領域の契約が必要です');

    const footer = getFooter(canvasElement, 'footer-token-contract');
    const build = footer.querySelector<HTMLElement>('.ui-footer__build');
    assert(build instanceof HTMLElement, 'build 領域が必要です');
    const buildOpacity = Number.parseFloat(getComputedStyle(build).opacity);
    assert(
      Math.abs(buildOpacity - 0.55) < 0.01,
      '公開トークンで build opacity を上書きできる必要があります',
    );
  },
};

export const ForcedColorsContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () =>
    html`${renderStoryFooter({
      id: 'footer-forced-colors',
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
    })}`,
  play: ({ canvasElement }) => {
    const footer = getFooter(canvasElement, 'footer-forced-colors');
    const cssText = getCssText();

    assert(
      cssText.includes('@media (forced-colors: active)'),
      'forced-colors メディアクエリが必要です',
    );
    assert(cssText.includes('CanvasText'), 'forced-colors 時の system color が必要です');

    if (window.matchMedia('(forced-colors: active)').matches) {
      const style = getComputedStyle(footer);
      assert(
        style.borderTopStyle === 'solid',
        'forced-colors でも border-top の構造を維持する必要があります',
      );
      assert(
        style.color !== 'transparent',
        'forced-colors でも主要文字が判読可能である必要があります',
      );
    }
  },
};

export const PrintPolicyContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () =>
    html`${renderStoryFooter({
      id: 'footer-print-policy',
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
    })}`,
  play: () => {
    const cssText = getCssText();
    assert(cssText.includes('@media print'), 'print メディアクエリが必要です');
    assert(
      cssText.includes('display: none !important'),
      '画面用 footer は印刷時に非表示である必要があります',
    );
  },
};
