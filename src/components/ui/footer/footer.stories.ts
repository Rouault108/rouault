import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  FOOTER_DEFAULT_APP_NAME,
  FOOTER_DEFAULT_REVISION,
  FOOTER_DOCUMENT_STYLE_ID,
  FOOTER_SCOPE_SELECTOR,
  ensureFooterDocumentStyles,
  renderFooter,
  resolveFooterYear,
  type UiFooterRenderOptions,
} from './footer';

interface FooterStoryArgs {
  appName?: string;
  revision?: string;
  year?: number;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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

const getFooterParts = (footer: HTMLElement) => {
  const content = footer.querySelector<HTMLElement>(':scope > .footer-content');
  const copyright =
    footer.querySelector<HTMLElement>(':scope > .footer-content > .copyright');
  const separator =
    footer.querySelector<HTMLElement>(':scope > .footer-content > .separator');
  const revision =
    footer.querySelector<HTMLElement>(':scope > .footer-content > .revision');

  assert(!!content, '.footer-content が見つかりません');
  assert(!!copyright, '.copyright が見つかりません');
  assert(!!separator, '.separator が見つかりません');
  assert(!!revision, '.revision が見つかりません');

  return { content, copyright, separator, revision };
};

const parseYear = (copyright: string): number | null => {
  const matched = /^©\s+(\d{1,4})\s+/u.exec(copyright);
  if (!matched?.[1]) return null;
  const parsed = Number.parseInt(matched[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildRenderOptions = (args: FooterStoryArgs): UiFooterRenderOptions => ({
  id: 'footer-default',
  ...(typeof args.appName === 'string' ? { appName: args.appName } : {}),
  ...(typeof args.revision === 'string' ? { revision: args.revision } : {}),
  ...(typeof args.year === 'number' ? { year: args.year } : {}),
});

const meta: Meta<FooterStoryArgs> = {
  title: 'Components/Footer',
  component: 'footer',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
フッターは Web Component ではなく、ネイティブ \`<footer>\` を使用します。

- DOM: \`.footer-content > .copyright / .separator / .revision\`
- Separator: \`aria-hidden="true"\`
- トークン: \`--bg-default\` / \`--border-ghost\` / \`--font-mono\` / \`--text-xs\`
- Revision: \`#<short-hash>\`（未定義時は \`#dev\`）
        `,
      },
    },
  },
  argTypes: {
    appName: {
      control: 'text',
      description: '表示するアプリ名（未指定時は Rouault）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "'Rouault'" } },
    },
    revision: {
      control: 'text',
      description: 'Git short hash。無効値は #dev にフォールバック',
      table: { type: { summary: 'string | undefined' } },
    },
    year: {
      control: 'number',
      description: '著作権年。無効値は現在年へフォールバック',
      table: { type: { summary: 'number | undefined' } },
    },
  },
  render: (args) =>
    html`
      ${renderFooter(buildRenderOptions(args))}
    `,
};

export default meta;
type Story = StoryObj<FooterStoryArgs>;

/**
 * 基本契約:
 * - ネイティブ footer ランドマークを使用
 * - DOM 構造が仕様どおり
 * - aria-hidden 付きセパレータ
 */
export const DefaultContract: Story = {
  args: {
    appName: FOOTER_DEFAULT_APP_NAME,
  },
  play: ({ canvasElement }) => {
    const footer = getFooter(canvasElement, 'footer-default');
    const { content, copyright, separator, revision } = getFooterParts(footer);

    assert(
      canvasElement.querySelectorAll('footer').length === 1,
      'Default ストーリーでは footer が 1 つのみ存在する必要があります',
    );
    assert(
      footer.getAttribute('role') === null,
      'role 属性を手動で付与せず暗黙 role="contentinfo" を利用する必要があります',
    );
    assert(footer.classList.contains('ui-footer'), '.ui-footer クラスが必要です');
    assert(
      separator.getAttribute('aria-hidden') === 'true',
      'separator には aria-hidden="true" が必要です',
    );
    assert(
      content.children.length === 3,
      '.footer-content 直下は copyright / separator / revision の 3 要素である必要があります',
    );
    assert(
      revision.textContent.startsWith('#'),
      'revision は # プレフィックス付きである必要があります',
    );

    const expectedYear = resolveFooterYear();
    const actualYear = parseYear(copyright.textContent);
    assert(
      actualYear === expectedYear,
      `copyright 年が不正です (期待: ${expectedYear.toString()}, 実際: ${
        actualYear?.toString() ?? 'null'
      })`,
    );
    assert(
      copyright.textContent.includes(FOOTER_DEFAULT_APP_NAME),
      'copyright にアプリ名が含まれていません',
    );
    assert(
      footer.querySelector('[part]') === null,
      'footer には part 属性を使用しないでください',
    );
  },
};

/**
 * 状態マトリクス:
 * - revision: 正常値 / #付き / 無効値フォールバック
 * - year: 明示値 / 無効値フォールバック
 */
export const RevisionYearStateMatrix: Story = {
  render: () => html`
    <div style="display: grid; gap: var(--space-4);">
      <section>
        <h3 style="margin: 0 0 var(--space-2); font-size: var(--text-sm);">
          明示 year + 正常 revision
        </h3>
        ${renderFooter({
          id: 'footer-state-valid',
          year: 2031,
          revision: '4a2b9f1',
        })}
      </section>

      <section>
        <h3 style="margin: 0 0 var(--space-2); font-size: var(--text-sm);">
          # 付き revision
        </h3>
        ${renderFooter({
          id: 'footer-state-prefixed',
          year: 2032,
          revision: '#abc1234',
        })}
      </section>

      <section>
        <h3 style="margin: 0 0 var(--space-2); font-size: var(--text-sm);">
          無効 revision のフォールバック
        </h3>
        ${renderFooter({
          id: 'footer-state-invalid-revision',
          year: 2033,
          revision: 'release-1',
        })}
      </section>

      <section>
        <h3 style="margin: 0 0 var(--space-2); font-size: var(--text-sm);">
          無効 year のフォールバック
        </h3>
        ${renderFooter({
          id: 'footer-state-invalid-year',
          year: Number.NaN,
          revision: 'f0e1d2c',
        })}
      </section>
    </div>
  `,
  play: ({ canvasElement }) => {
    const currentYear = resolveFooterYear();
    const cases = [
      { id: 'footer-state-valid', expectedYear: 2031, expectedRevision: '#4a2b9f1' },
      { id: 'footer-state-prefixed', expectedYear: 2032, expectedRevision: '#abc1234' },
      {
        id: 'footer-state-invalid-revision',
        expectedYear: 2033,
        expectedRevision: `#${FOOTER_DEFAULT_REVISION}`,
      },
      { id: 'footer-state-invalid-year', expectedYear: currentYear, expectedRevision: '#f0e1d2c' },
    ] as const;

    for (const testCase of cases) {
      const footer = getFooter(canvasElement, testCase.id);
      const parts = getFooterParts(footer);
      const actualYear = parseYear(parts.copyright.textContent);
      const actualRevision = parts.revision.textContent.trim();

      assert(
        actualYear === testCase.expectedYear,
        `${testCase.id}: year が不正です (期待: ${testCase.expectedYear.toString()}, 実際: ${
          actualYear?.toString() ?? 'null'
        })`,
      );
      assert(
        actualRevision === testCase.expectedRevision,
        `${testCase.id}: revision が不正です (期待: ${testCase.expectedRevision}, 実際: ${
          actualRevision
        })`,
      );
      assert(
        parts.separator.getAttribute('aria-hidden') === 'true',
        `${testCase.id}: separator の aria-hidden が失われています`,
      );
    }
  },
};

/**
 * 事故が多い境界条件:
 * - separator opacity の外部上書き
 * - 不正 year/revision のフォールバック
 * - インタラクティブ要素非搭載の維持
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="--separator-opacity: 0.62;">
      ${renderFooter({
        id: 'footer-boundary',
        appName: 'Rouault <script>alert(1)</script>',
        revision: '',
        year: -10,
      })}
    </div>
  `,
  play: ({ canvasElement }) => {
    const footer = getFooter(canvasElement, 'footer-boundary');
    const { copyright, separator, revision } = getFooterParts(footer);

    const separatorOpacity = toNumber(getComputedStyle(separator).opacity);
    assert(
      Math.abs(separatorOpacity - 0.62) < 0.01,
      `separator opacity のトークン上書きが反映されていません (実際: ${separatorOpacity.toString()})`,
    );

    assert(
      parseYear(copyright.textContent) === resolveFooterYear(),
      '無効 year は現在年へフォールバックする必要があります',
    );
    assert(
      revision.textContent.trim() === `#${FOOTER_DEFAULT_REVISION}`,
      '無効 revision は #dev へフォールバックする必要があります',
    );
    assert(
      footer.querySelector('script') === null,
      'アプリ名文字列が HTML として解釈されてはいけません',
    );

    const interactive = footer.querySelectorAll(
      'a, button, input, select, textarea, [role="button"], [tabindex]',
    );
    assert(
      interactive.length === 0,
      'フッターにはインタラクティブ要素を含めない現在仕様を維持する必要があります',
    );
  },
};

/**
 * トークン/媒体契約:
 * - スタイル注入は 1 回のみ
 * - 必須トークンと媒体クエリを保持
 * - 禁止されたハードコードを含まない
 */
export const MediaAndTokenContracts: Story = {
  render: () => html`
    <div style="display: grid; gap: var(--space-4);">
      ${renderFooter({ id: 'footer-contract-a' })}
      ${renderFooter({ id: 'footer-contract-b', revision: '4a2b9f1' })}
    </div>
  `,
  play: () => {
    document
      .querySelectorAll(`#${FOOTER_DOCUMENT_STYLE_ID}`)
      .forEach((node) => {
        node.remove();
      });

    ensureFooterDocumentStyles();
    ensureFooterDocumentStyles();

    const styleTags = document.querySelectorAll(`#${FOOTER_DOCUMENT_STYLE_ID}`);
    assert(
      styleTags.length === 1,
      `フッタースタイル注入は 1 回である必要があります (実際: ${styleTags.length.toString()} 回)`,
    );

    const cssText = getCssText();
    const requiredTokens = [
      FOOTER_SCOPE_SELECTOR,
      'var(--bg-default)',
      'var(--border-width)',
      'var(--border-ghost)',
      'var(--font-mono)',
      'var(--text-xs)',
      'var(--font-medium)',
      'var(--fg-muted)',
      'var(--tracking-wide)',
      'var(--header-height)',
      'var(--bp-xl)',
      'var(--space-2)',
      'var(--space-3)',
      'var(--space-4)',
      'var(--space-8)',
      'var(--separator-opacity)',
      '@media (forced-colors: active)',
      '@media print',
      'CanvasText',
      'display: none !important',
    ] as const;

    for (const token of requiredTokens) {
      assert(cssText.includes(token), `必須契約が不足しています: ${token}`);
    }

    const forbidden = ['#000', '12px', '48px', 'opacity: 0.3', 'padding-inline: 16px'] as const;
    for (const snippet of forbidden) {
      assert(
        !cssText.includes(snippet),
        `ハードコード値が混入しています: ${snippet}`,
      );
    }
  },
};

/**
 * Dark Mode 契約:
 * - prefers-color-scheme 分岐ではなくトークン参照で追従
 * - light / dark 両面で境界線が維持される
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <div style="display: grid; gap: var(--space-4);">
      <div style="background: var(--bg-default); color: var(--fg-default);">
        ${renderFooter({ id: 'footer-dark-light', revision: 'a1b2c3d' })}
      </div>
      <div
        style="
          color-scheme: dark;
          background: oklch(12% 0.02 250);
          color: oklch(92% 0.01 250);
        "
      >
        ${renderFooter({ id: 'footer-dark-dark', revision: 'e4f5a6b' })}
      </div>
    </div>
  `,
  parameters: {
    backgrounds: { default: 'dark' },
  },
  play: ({ canvasElement }) => {
    const lightFooter = getFooter(canvasElement, 'footer-dark-light');
    const darkFooter = getFooter(canvasElement, 'footer-dark-dark');

    const lightStyle = getComputedStyle(lightFooter);
    const darkStyle = getComputedStyle(darkFooter);

    assert(
      lightStyle.borderTopStyle === 'solid' && darkStyle.borderTopStyle === 'solid',
      'Light/Dark の両方で border-top: solid を維持する必要があります',
    );
    assert(
      lightStyle.backgroundColor !== 'transparent' &&
        darkStyle.backgroundColor !== 'transparent',
      '背景色はトークン解決された実色である必要があります',
    );
    assert(
      lightStyle.color !== 'transparent' && darkStyle.color !== 'transparent',
      '文字色はトークン解決された実色である必要があります',
    );

    const cssText = getCssText();
    assert(
      !cssText.includes('prefers-color-scheme'),
      'footer は prefers-color-scheme 分岐ではなくトークン参照で追従する必要があります',
    );
  },
};

/**
 * Forced Colors 契約:
 * - CanvasText ボーダー定義を保持
 */
export const ForcedColorsContract: Story = {
  render: () => html`${renderFooter({ id: 'footer-forced-colors' })}`,
  play: ({ canvasElement }) => {
    const footer = getFooter(canvasElement, 'footer-forced-colors');
    const cssText = getCssText();

    assert(
      cssText.includes('@media (forced-colors: active)'),
      'forced-colors メディアクエリが必要です',
    );
    assert(
      cssText.includes('CanvasText'),
      'forced-colors 時の CanvasText ボーダー定義が必要です',
    );

    if (window.matchMedia('(forced-colors: active)').matches) {
      const style = getComputedStyle(footer);
      assert(
        style.borderTopStyle === 'solid',
        'forced-colors 有効時も border-top の構造が維持される必要があります',
      );
    }
  },
};

/**
 * Print 契約:
 * - 印刷時に footer 非表示
 */
export const PrintContract: Story = {
  render: () => html`${renderFooter({ id: 'footer-print-contract' })}`,
  play: () => {
    const cssText = getCssText();
    assert(cssText.includes('@media print'), 'print メディアクエリが必要です');
    assert(
      cssText.includes('display: none !important'),
      'print 時の display: none が必要です',
    );
  },
};
