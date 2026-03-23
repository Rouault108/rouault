import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './badge';
import type { Badge } from './badge';

const normalizeText = (value: string | null | undefined): string =>
  value?.replace(/\s+/g, ' ').trim() ?? '';

const getBadge = (canvasElement: HTMLElement, selector: string): Badge => {
  const badge = canvasElement.querySelector<Badge>(selector);
  if (!badge) throw new Error(`${selector} が見つかりません`);
  return badge;
};

const getShadowSpan = (badge: Badge): HTMLSpanElement => {
  const span = badge.shadowRoot?.querySelector<HTMLSpanElement>('span');
  if (!span) throw new Error(`${badge.id || 'ui-badge'} の shadow 内に span が見つかりません`);
  return span;
};

const getRoleElement = (badge: Badge, role: string): HTMLElement | null =>
  badge.shadowRoot?.querySelector<HTMLElement>(`[role="${role}"]`) ?? null;

const assertText = (actual: string, expected: string, label: string): void => {
  if (actual !== expected) {
    throw new Error(`${label}: "${expected}" を期待していましたが、実際には "${actual}" でした`);
  }
};

const assertDisplayText = (badge: Badge, expected: string): void => {
  assertText(normalizeText(getShadowSpan(badge).textContent), expected, `${badge.id} の表示文字列`);
};

const assertSpanAriaLabel = (badge: Badge, expected: string): void => {
  const actual = getShadowSpan(badge).getAttribute('aria-label') ?? 'null';
  assertText(actual, expected, `${badge.id} の aria-label`);
};

const assertNoStatus = (badge: Badge): void => {
  if (getRoleElement(badge, 'status')) {
    throw new Error(`${badge.id} に role="status" が存在してはいけません`);
  }
};

const assertStatus = (badge: Badge, expectedText: string, expectedAriaLabel: string): void => {
  const status = getRoleElement(badge, 'status');
  if (!status) throw new Error(`${badge.id} の role="status" が見つかりません`);
  assertText(normalizeText(status.textContent), expectedText, `${badge.id} の status 表示`);
  assertText(
    status.getAttribute('aria-label') ?? 'null',
    expectedAriaLabel,
    `${badge.id} の status aria-label`,
  );
};

const assertSlotExists = (badge: Badge): void => {
  if (!badge.shadowRoot?.querySelector('slot')) {
    throw new Error(`${badge.id} に slot が必要です`);
  }
};

const assertNoSlot = (badge: Badge): void => {
  if (badge.shadowRoot?.querySelector('slot')) {
    throw new Error(`${badge.id} に slot が存在してはいけません`);
  }
};

const assertDisplayNone = (badge: Badge): void => {
  if (getComputedStyle(badge).display !== 'none') {
    throw new Error(`${badge.id} は不成立状態のため display:none である必要があります`);
  }
};

const parseRgb = (value: string): [number, number, number] => {
  const normalized = value.trim();
  const match = /^rgba?\((.*)\)$/.exec(normalized);
  if (!match) throw new Error(`サポートされていないカラー形式です: "${value}"`);

  const rawBody = match[1] ?? '';
  const body = rawBody.split('/')[0]?.trim() ?? '';
  const channels = body.includes(',') ? body.split(',') : body.split(/\s+/);
  if (channels.length < 3) throw new Error(`無効な RGB チャンネルです: "${value}"`);

  const rgb = channels.slice(0, 3).map((channel) => Number.parseFloat(channel.trim()));
  if (rgb.some((channel) => Number.isNaN(channel))) {
    throw new Error(`無効な RGB 値です: "${value}"`);
  }

  return [rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0];
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const linearize = (channel: number): number => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const contrastRatio = (foreground: string, background: string): number => {
  const l1 = relativeLuminance(parseRgb(foreground));
  const l2 = relativeLuminance(parseRgb(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const collectCssText = (styles: unknown): string => {
  if (Array.isArray(styles)) return styles.map((item) => collectCssText(item)).join('\n');

  if (typeof styles === 'object' && styles !== null && 'cssText' in styles) {
    const cssText = (styles as { cssText: unknown }).cssText;
    return typeof cssText === 'string' ? cssText : '';
  }

  return '';
};

/**
 * ## バッジ (Badge) `<ui-badge>`
 *
 * `ui-badge` は、件数、状態、更新有無などの小さなシステム状態を提示する非インタラクティブな表示要素です。
 * 表示優先順位は `dot > count > slot` で固定され、数値状態は既定で静的表示、`announce="auto"` の場合のみ通知可能状態として扱います。
 */
const meta = {
  title: 'Components/Badge',
  component: 'ui-badge',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
仕様書 \`docs/design-system/components/badge.md\` を正本とした Story 群です。

## 主要契約

- 表示優先順位は \`dot > count > slot\`
- \`variant="dot"\` は \`aria-label\` がある場合に限って成立
- 数値状態は既定で \`announce="off"\` の静的表示
- \`announce="auto"\` の場合のみ \`role="status"\` を付与
- \`countAriaLabel\` / \`count-aria-label\` で数値状態のアクセシブルネームを上書き可能

## 使用例

\`\`\`html
<ui-badge count="128" max="99"></ui-badge>
<ui-badge count="128" announce="auto" count-aria-label="未読 128 件"></ui-badge>
<ui-badge variant="subtle" color="success">Stable</ui-badge>
<ui-badge variant="dot" color="danger" aria-label="未読の更新があります"></ui-badge>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'subtle', 'dot'],
      description: '視覚バリアント',
      table: {
        type: { summary: "'solid' | 'subtle' | 'dot'" },
        defaultValue: { summary: "'solid'" },
      },
    },
    count: {
      control: 'number',
      description: '件数。数値状態が成立すると slot は無視されます',
      table: {
        type: { summary: 'number | null | undefined' },
        defaultValue: { summary: 'null' },
      },
    },
    max: {
      control: 'number',
      description: '表示上限。既定値は 99',
      table: {
        type: { summary: 'number | null | undefined' },
        defaultValue: { summary: '99' },
      },
    },
    color: {
      control: 'select',
      options: ['danger', 'primary', 'neutral', 'success', 'warning'],
      description: '意味色',
      table: {
        type: { summary: "'danger' | 'primary' | 'neutral' | 'success' | 'warning'" },
        defaultValue: { summary: "'primary'" },
      },
    },
    announce: {
      control: 'select',
      options: ['off', 'auto'],
      description: '数値状態の通知モード。既定は off',
      table: {
        type: { summary: "'off' | 'auto'" },
        defaultValue: { summary: "'off'" },
      },
    },
    countAriaLabel: {
      control: 'text',
      description: '数値状態のアクセシブルネーム上書き',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
    },
    ariaLabelText: {
      control: 'text',
      description: 'dot 状態の代替テキスト。属性名は aria-label',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
    },
  },
} satisfies Meta<Badge>;

export default meta;
type Story = StoryObj<Badge>;

export const Default: Story = {
  args: {
    variant: 'solid',
    color: 'primary',
    count: null,
    max: 99,
    announce: 'off',
  },
  render: (args) => html`
    <ui-badge
      id="default-badge"
      variant="${args.variant}"
      color="${args.color}"
      announce="${args.announce}"
      max="${args.max ?? 99}"
      >New</ui-badge
    >
  `,
  play: async ({ canvasElement }) => {
    const badge = getBadge(canvasElement, '#default-badge');
    await badge.updateComplete;

    if (badge.variant !== 'solid') {
      throw new Error(`variant="solid" を期待していましたが、実際には "${badge.variant}" でした`);
    }
    if (badge.color !== 'primary') {
      throw new Error(`color="primary" を期待していましたが、実際には "${badge.color}" でした`);
    }
    if (badge.announce !== 'off') {
      throw new Error(`announce="off" を期待していましたが、実際には "${badge.announce}" でした`);
    }

    assertSlotExists(badge);
    assertNoStatus(badge);
    assertText(badge.getAttribute('data-variant') ?? 'null', 'solid', 'data-variant');
  },
};

export const VariantColorMatrix: Story = {
  render: () => {
    const variants = ['solid', 'subtle', 'dot'] as const;
    const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;

    return html`
      <style>
        .matrix {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .matrix-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .matrix-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: oklch(48% 0.01 250);
        }
        .matrix-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }
      </style>
      <div class="matrix">
        ${variants.map(
          (variant) => html`
            <div class="matrix-row">
              <div class="matrix-label">${variant}</div>
              <div class="matrix-badges">
                ${colors.map((color) =>
                  variant === 'dot'
                    ? html`
                        <ui-badge
                          id="matrix-${variant}-${color}"
                          variant="dot"
                          color="${color}"
                          aria-label="${color} の更新があります"
                        ></ui-badge>
                      `
                    : html`
                        <ui-badge
                          id="matrix-${variant}-${color}"
                          variant="${variant}"
                          color="${color}"
                          >${color}</ui-badge
                        >
                      `,
                )}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const badges = [...canvasElement.querySelectorAll<Badge>('ui-badge')];
    if (badges.length !== 15) {
      throw new Error(
        `15 個の badge を期待していましたが、実際には ${String(badges.length)} 個でした`,
      );
    }

    await Promise.all(badges.map((badge) => badge.updateComplete));

    const subtleWarning = getBadge(canvasElement, '#matrix-subtle-warning');
    const dotDanger = getBadge(canvasElement, '#matrix-dot-danger');

    assertSlotExists(subtleWarning);
    assertNoStatus(subtleWarning);

    if (!getRoleElement(dotDanger, 'img')) {
      throw new Error('dot バリアントに role="img" が必要です');
    }
    assertNoSlot(dotDanger);
    assertNoStatus(dotDanger);
  },
};

export const CountBadge: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
      <ui-badge id="count-1" count="1"></ui-badge>
      <ui-badge id="count-99" count="99"></ui-badge>
      <ui-badge id="count-100" count="100"></ui-badge>
      <ui-badge id="count-128" color="danger" count="128"></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const badges = ['#count-1', '#count-99', '#count-100', '#count-128'].map((selector) =>
      getBadge(canvasElement, selector),
    );
    await Promise.all(badges.map((badge) => badge.updateComplete));

    const [count1, count99, count100, count128] = badges;
    if (!count1 || !count99 || !count100 || !count128) {
      throw new Error('CountBadge のテスト対象が不足しています');
    }

    assertDisplayText(count1, '1');
    assertDisplayText(count99, '99');
    assertDisplayText(count100, '99+');
    assertDisplayText(count128, '99+');
    assertSpanAriaLabel(count128, '128 件');

    for (const badge of badges) {
      assertNoStatus(badge);
      assertNoSlot(badge);
    }
  },
};

export const TextBadge: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="text-solid" color="primary">New</ui-badge>
        <ui-badge id="text-subtle" variant="subtle" color="success">Stable</ui-badge>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const solid = getBadge(canvasElement, '#text-solid');
    const subtle = getBadge(canvasElement, '#text-subtle');
    await Promise.all([solid.updateComplete, subtle.updateComplete]);

    assertSlotExists(solid);
    assertSlotExists(subtle);
    assertNoStatus(solid);
    assertNoStatus(subtle);
  },
};

export const CountAriaLabelOverride: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
      <ui-badge id="count-override" count="128" count-aria-label="未読 128 件"></ui-badge>
      <ui-badge id="count-override-empty" count="7" count-aria-label="   "></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const override = getBadge(canvasElement, '#count-override');
    const fallback = getBadge(canvasElement, '#count-override-empty');
    await Promise.all([override.updateComplete, fallback.updateComplete]);

    assertSpanAriaLabel(override, '未読 128 件');
    assertSpanAriaLabel(fallback, '7 件');
    assertNoStatus(override);
    assertNoStatus(fallback);
  },
};

export const AnnounceModes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="announce-off" count="12"></ui-badge>
        <ui-badge id="announce-auto" count="12" announce="auto"></ui-badge>
        <ui-badge id="announce-slot" announce="auto">Static</ui-badge>
        <ui-badge
          id="announce-dot"
          variant="dot"
          announce="auto"
          aria-label="更新があります"
        ></ui-badge>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const off = getBadge(canvasElement, '#announce-off');
    const auto = getBadge(canvasElement, '#announce-auto');
    const slot = getBadge(canvasElement, '#announce-slot');
    const dot = getBadge(canvasElement, '#announce-dot');
    await Promise.all([
      off.updateComplete,
      auto.updateComplete,
      slot.updateComplete,
      dot.updateComplete,
    ]);

    assertDisplayText(off, '12');
    assertSpanAriaLabel(off, '12 件');
    assertNoStatus(off);

    assertStatus(auto, '12', '12 件');
    assertSlotExists(slot);
    assertNoStatus(slot);

    if (!getRoleElement(dot, 'img')) {
      throw new Error('announce-dot に role="img" が必要です');
    }
    assertNoStatus(dot);
  },
};

export const CountMaxCombinations: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge id="cm-0" count="0" max="99"></ui-badge>
      <ui-badge id="cm-99" count="99" max="99"></ui-badge>
      <ui-badge id="cm-100" count="100" max="99"></ui-badge>
      <ui-badge id="cm-custom-9" color="warning" count="10" max="9"></ui-badge>
      <ui-badge id="cm-custom-999" color="warning" count="1000" max="999"></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const expectations = [
      ['#cm-0', '0'],
      ['#cm-99', '99'],
      ['#cm-100', '99+'],
      ['#cm-custom-9', '9+'],
      ['#cm-custom-999', '999+'],
    ] as const;

    const badges = expectations.map(([selector]) => getBadge(canvasElement, selector));
    await Promise.all(badges.map((badge) => badge.updateComplete));

    expectations.forEach(([selector, expected]) => {
      assertDisplayText(getBadge(canvasElement, selector), expected);
    });
  },
};

export const ContentPriorityLogic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`dot > count > slot` の優先順位と、`aria-label` を欠く dot が count / slot へフォールバックする契約を確認します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge id="priority-dot-valid" variant="dot" count="5" aria-label="未読があります"
        >New</ui-badge
      >
      <ui-badge id="priority-dot-count-fallback" variant="dot" count="5">New</ui-badge>
      <ui-badge id="priority-dot-slot-fallback" variant="dot">New</ui-badge>
      <ui-badge id="priority-count" variant="subtle" count="5">New</ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const validDot = getBadge(canvasElement, '#priority-dot-valid');
    const dotCountFallback = getBadge(canvasElement, '#priority-dot-count-fallback');
    const dotSlotFallback = getBadge(canvasElement, '#priority-dot-slot-fallback');
    const count = getBadge(canvasElement, '#priority-count');
    await Promise.all([
      validDot.updateComplete,
      dotCountFallback.updateComplete,
      dotSlotFallback.updateComplete,
      count.updateComplete,
    ]);

    if (!getRoleElement(validDot, 'img')) {
      throw new Error('aria-label を持つ dot は role="img" で成立する必要があります');
    }
    assertNoSlot(validDot);

    assertDisplayText(dotCountFallback, '5');
    assertText(
      dotCountFallback.getAttribute('data-variant') ?? 'null',
      'solid',
      'dot 不成立時の data-variant',
    );

    assertSlotExists(dotSlotFallback);
    assertText(
      dotSlotFallback.getAttribute('data-variant') ?? 'null',
      'solid',
      'slot フォールバック時の data-variant',
    );

    assertDisplayText(count, '5');
    assertText(
      count.getAttribute('data-variant') ?? 'null',
      'subtle',
      'subtle count の data-variant',
    );
    assertNoSlot(count);
  },
};

export const CountNormalization: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`count` の正規化では、`NaN` / `Infinity` / `-Infinity` / 非数値文字列 / 空文字列は不在扱い、負数は `0`、小数は `Math.floor()` です。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge id="norm-nan" .count=${Number.NaN}>Fallback</ui-badge>
      <ui-badge id="norm-inf" .count=${Number.POSITIVE_INFINITY}>Fallback</ui-badge>
      <ui-badge id="norm-neg-inf" .count=${Number.NEGATIVE_INFINITY}>Fallback</ui-badge>
      <ui-badge id="norm-string" count="abc">Fallback</ui-badge>
      <ui-badge id="norm-empty-string" count="">Fallback</ui-badge>
      <ui-badge id="norm-negative" .count=${-5}></ui-badge>
      <ui-badge id="norm-float" .count=${3.9}></ui-badge>
      <ui-badge id="norm-zero" .count=${0}></ui-badge>
      <ui-badge id="norm-empty" .count=${Number.NaN}></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fallbackIds = [
      '#norm-nan',
      '#norm-inf',
      '#norm-neg-inf',
      '#norm-string',
      '#norm-empty-string',
    ];
    const fallbackBadges = fallbackIds.map((selector) => getBadge(canvasElement, selector));
    const negative = getBadge(canvasElement, '#norm-negative');
    const float = getBadge(canvasElement, '#norm-float');
    const zero = getBadge(canvasElement, '#norm-zero');
    const empty = getBadge(canvasElement, '#norm-empty');

    await Promise.all(
      [...fallbackBadges, negative, float, zero, empty].map((badge) => badge.updateComplete),
    );

    for (const badge of fallbackBadges) {
      assertSlotExists(badge);
      assertNoStatus(badge);
    }

    assertDisplayText(negative, '0');
    assertDisplayText(float, '3');
    assertDisplayText(zero, '0');
    assertDisplayNone(empty);
  },
};

export const MaxNormalization: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`max` の不正値は既定値 `99` に収束し、有限値は `Math.floor()` のうえで `1` 未満を `1` に補正します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge id="max-zero" .count=${5} .max=${0}></ui-badge>
      <ui-badge id="max-negative" .count=${5} .max=${-1}></ui-badge>
      <ui-badge id="max-float" .count=${11} .max=${10.9}></ui-badge>
      <ui-badge id="max-nan" .count=${100} .max=${Number.NaN}></ui-badge>
      <ui-badge id="max-inf" .count=${100} .max=${Number.POSITIVE_INFINITY}></ui-badge>
      <ui-badge id="max-empty" count="100" max=""></ui-badge>
      <ui-badge id="max-one" count="1" max="1"></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const expectations = [
      ['#max-zero', '1+'],
      ['#max-negative', '1+'],
      ['#max-float', '10+'],
      ['#max-nan', '99+'],
      ['#max-inf', '99+'],
      ['#max-empty', '99+'],
      ['#max-one', '1'],
    ] as const;

    const badges = expectations.map(([selector]) => getBadge(canvasElement, selector));
    await Promise.all(badges.map((badge) => badge.updateComplete));

    expectations.forEach(([selector, expected]) => {
      assertDisplayText(getBadge(canvasElement, selector), expected);
    });
  },
};

export const CountZero: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge id="zero-count" count="0">無視される slot</ui-badge>
      <ui-badge id="null-count">表示される slot</ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const zero = getBadge(canvasElement, '#zero-count');
    const nullable = getBadge(canvasElement, '#null-count');
    await Promise.all([zero.updateComplete, nullable.updateComplete]);

    assertDisplayText(zero, '0');
    assertNoSlot(zero);

    assertSlotExists(nullable);
    assertNoStatus(nullable);
  },
};

export const CountUndefined: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge id="undefined-count">New</ui-badge>
      <ui-badge id="undefined-empty"></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const withSlot = getBadge(canvasElement, '#undefined-count');
    const empty = getBadge(canvasElement, '#undefined-empty');
    await Promise.all([withSlot.updateComplete, empty.updateComplete]);

    withSlot.count = undefined;
    empty.count = undefined;
    await Promise.all([withSlot.updateComplete, empty.updateComplete]);

    assertSlotExists(withSlot);
    assertNoStatus(withSlot);
    assertDisplayNone(empty);
  },
};

export const DotIgnoresCount: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge
        id="dot-with-count"
        variant="dot"
        color="danger"
        count="99"
        announce="auto"
        count-aria-label="未読 99 件"
        aria-label="未読があります"
        >Ignored</ui-badge
      >
    </div>
  `,
  play: async ({ canvasElement }) => {
    const badge = getBadge(canvasElement, '#dot-with-count');
    await badge.updateComplete;

    const img = getRoleElement(badge, 'img');
    if (!img) throw new Error('dot 状態では role="img" が必要です');
    assertText(img.getAttribute('aria-label') ?? 'null', '未読があります', 'dot aria-label');
    assertNoSlot(badge);
    assertNoStatus(badge);
    assertText(badge.getAttribute('data-variant') ?? 'null', 'dot', 'dot の data-variant');
  },
};

export const NonInteractive: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge id="non-interactive-solid" count="5"></ui-badge>
      <ui-badge id="non-interactive-subtle" variant="subtle">Beta</ui-badge>
      <ui-badge id="non-interactive-dot" variant="dot" aria-label="更新があります"></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const badges = [...canvasElement.querySelectorAll<Badge>('ui-badge')];
    await Promise.all(badges.map((badge) => badge.updateComplete));

    for (const badge of badges) {
      if (badge.getAttribute('tabindex') !== null) {
        throw new Error(`${badge.id} に tabindex が存在してはいけません`);
      }
      if (badge.hasAttribute('disabled')) {
        throw new Error(`${badge.id} に disabled が存在してはいけません`);
      }
      if (badge.hasAttribute('error')) {
        throw new Error(`${badge.id} に error が存在してはいけません`);
      }
      if (badge.hasAttribute('aria-disabled')) {
        throw new Error(`${badge.id} に aria-disabled が存在してはいけません`);
      }
      if (badge.hasAttribute('role')) {
        throw new Error(`${badge.id} のホストに role が存在してはいけません`);
      }

      badge.focus();
      if (badge.ownerDocument.activeElement === badge) {
        throw new Error(`${badge.id} が activeElement になってはいけません`);
      }
    }
  },
};

export const ThemeContrastAudit: Story = {
  render: () => {
    const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;

    return html`
      <style>
        .theme-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        .theme-block {
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid oklch(76% 0.02 250 / 0.4);
        }
        .theme-title {
          margin-bottom: 0.75rem;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: oklch(48% 0.01 250);
        }
        .row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .surface {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          padding: 0.5rem;
          border-radius: 8px;
        }
      </style>

      <div class="theme-grid">
        <section
          id="contrast-light"
          class="theme-block"
          style="
            --primary: #1f5eff;
            --on-primary: #ffffff;
            --success: #007a4d;
            --on-success: #ffffff;
            --danger: #b42318;
            --on-danger: #ffffff;
            --warning: #9a4a00;
            --on-warning: #ffffff;
            --fg-default: #111827;
            --bg-default: #ffffff;
            --bg-surface-2: #f3f4f6;
            background: var(--bg-default);
            color: var(--fg-default);
          "
        >
          <div class="theme-title">Light Token Set</div>
          <div class="row">
            ${colors.map(
              (color) =>
                html`<ui-badge id="contrast-light-solid-${color}" color="${color}">text</ui-badge>`,
            )}
          </div>
          <div class="row">
            ${colors.map(
              (color) => html`
                <ui-badge id="contrast-light-subtle-${color}" variant="subtle" color="${color}"
                  >text</ui-badge
                >
              `,
            )}
          </div>
          <div
            id="contrast-light-dot-default-surface"
            class="surface"
            style="background: var(--bg-default);"
          >
            ${colors.map(
              (color) => html`
                <ui-badge
                  id="contrast-light-dot-${color}-default"
                  variant="dot"
                  color="${color}"
                  aria-label="${color}"
                ></ui-badge>
              `,
            )}
          </div>
          <div
            id="contrast-light-dot-surface2-surface"
            class="surface"
            style="background: var(--bg-surface-2); margin-top: 0.5rem;"
          >
            ${colors.map(
              (color) => html`
                <ui-badge
                  id="contrast-light-dot-${color}-surface2"
                  variant="dot"
                  color="${color}"
                  aria-label="${color}"
                ></ui-badge>
              `,
            )}
          </div>
        </section>

        <section
          id="contrast-dark"
          class="theme-block"
          style="
            --primary: #8ab4ff;
            --on-primary: #06132d;
            --success: #5fd0a5;
            --on-success: #042417;
            --danger: #ff9f9f;
            --on-danger: #2a0d0d;
            --warning: #ffd08a;
            --on-warning: #2e1b00;
            --fg-default: #f3f4f6;
            --bg-default: #101317;
            --bg-surface-2: #1b222c;
            background: var(--bg-default);
            color: var(--fg-default);
          "
        >
          <div class="theme-title">Dark Token Set</div>
          <div class="row">
            ${colors.map(
              (color) =>
                html`<ui-badge id="contrast-dark-solid-${color}" color="${color}">text</ui-badge>`,
            )}
          </div>
          <div class="row">
            ${colors.map(
              (color) => html`
                <ui-badge id="contrast-dark-subtle-${color}" variant="subtle" color="${color}"
                  >text</ui-badge
                >
              `,
            )}
          </div>
          <div
            id="contrast-dark-dot-default-surface"
            class="surface"
            style="background: var(--bg-default);"
          >
            ${colors.map(
              (color) => html`
                <ui-badge
                  id="contrast-dark-dot-${color}-default"
                  variant="dot"
                  color="${color}"
                  aria-label="${color}"
                ></ui-badge>
              `,
            )}
          </div>
          <div
            id="contrast-dark-dot-surface2-surface"
            class="surface"
            style="background: var(--bg-surface-2); margin-top: 0.5rem;"
          >
            ${colors.map(
              (color) => html`
                <ui-badge
                  id="contrast-dark-dot-${color}-surface2"
                  variant="dot"
                  color="${color}"
                  aria-label="${color}"
                ></ui-badge>
              `,
            )}
          </div>
        </section>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;
    const themes = ['light', 'dark'] as const;

    const assertTextContrast = (selector: string, min: number): void => {
      const badge = getBadge(canvasElement, selector);
      const style = getComputedStyle(badge);
      const ratio = contrastRatio(style.color, style.backgroundColor);
      if (ratio < min) {
        throw new Error(
          `${selector}: コントラスト比 ${ratio.toFixed(2)} が ${String(min)} 未満です`,
        );
      }
    };

    const assertDotContrast = (
      badgeSelector: string,
      surfaceSelector: string,
      min: number,
    ): void => {
      const badge = getBadge(canvasElement, badgeSelector);
      const surface = canvasElement.querySelector<HTMLElement>(surfaceSelector);
      if (!surface) {
        throw new Error(`${surfaceSelector} が見つかりません`);
      }

      const badgeStyle = getComputedStyle(badge);
      const surfaceStyle = getComputedStyle(surface);
      const ratio = contrastRatio(badgeStyle.backgroundColor, surfaceStyle.backgroundColor);
      if (ratio < min) {
        throw new Error(
          `${badgeSelector}: 非テキストのコントラスト比 ${ratio.toFixed(2)} が ${String(min)} 未満です`,
        );
      }
    };

    await Promise.all(
      [...canvasElement.querySelectorAll<Badge>('ui-badge')].map((badge) => badge.updateComplete),
    );

    for (const theme of themes) {
      for (const color of colors) {
        assertTextContrast(`#contrast-${theme}-solid-${color}`, 4.5);
        assertTextContrast(`#contrast-${theme}-subtle-${color}`, 4.5);
        assertDotContrast(
          `#contrast-${theme}-dot-${color}-default`,
          `#contrast-${theme}-dot-default-surface`,
          3,
        );
        assertDotContrast(
          `#contrast-${theme}-dot-${color}-surface2`,
          `#contrast-${theme}-dot-surface2-surface`,
          3,
        );
      }
    }
  },
};

export const ForcedColorsContract: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.75rem; align-items: center;">
      <ui-badge id="forced-solid">New</ui-badge>
      <ui-badge id="forced-subtle" variant="subtle" color="warning">Draft</ui-badge>
      <ui-badge id="forced-dot" variant="dot" color="danger" aria-label="更新があります"></ui-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const badge = getBadge(canvasElement, '#forced-solid');
    await badge.updateComplete;

    const cssText = collectCssText((badge.constructor as typeof Badge).styles);
    if (!cssText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors メディアクエリが必要です');
    }
    if (!cssText.includes("data-variant='subtle'")) {
      throw new Error('subtle の forced-colors ルールが必要です');
    }
    if (!cssText.includes('ButtonText')) {
      throw new Error('forced-colors ルールに ButtonText が必要です');
    }
    if (!cssText.includes('ButtonFace')) {
      throw new Error('forced-colors ルールに ButtonFace が必要です');
    }
    if (!cssText.includes('width: 10px')) {
      throw new Error('dot の forced-colors サイズ拡張が必要です');
    }
  },
};

export const AllStates: Story = {
  render: () => html`
    <style>
      .states {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: oklch(48% 0.01 250);
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
    </style>
    <div class="states">
      <div class="group">
        <div class="label">Count / Static</div>
        <div class="badges">
          <ui-badge id="all-count-static" count="5"></ui-badge>
          <ui-badge id="all-count-max" color="danger" count="128"></ui-badge>
        </div>
      </div>
      <div class="group">
        <div class="label">Count / Announce Auto</div>
        <div class="badges">
          <ui-badge
            id="all-count-auto"
            count="12"
            announce="auto"
            count-aria-label="未読 12 件"
          ></ui-badge>
        </div>
      </div>
      <div class="group">
        <div class="label">Text</div>
        <div class="badges">
          <ui-badge id="all-text-solid">New</ui-badge>
          <ui-badge id="all-text-subtle" variant="subtle" color="success">Stable</ui-badge>
        </div>
      </div>
      <div class="group">
        <div class="label">Dot</div>
        <div class="badges">
          <ui-badge
            id="all-dot"
            variant="dot"
            color="warning"
            aria-label="更新があります"
          ></ui-badge>
        </div>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const staticCount = getBadge(canvasElement, '#all-count-static');
    const maxCount = getBadge(canvasElement, '#all-count-max');
    const autoCount = getBadge(canvasElement, '#all-count-auto');
    const text = getBadge(canvasElement, '#all-text-subtle');
    const dot = getBadge(canvasElement, '#all-dot');

    await Promise.all([
      staticCount.updateComplete,
      maxCount.updateComplete,
      autoCount.updateComplete,
      text.updateComplete,
      dot.updateComplete,
    ]);

    assertDisplayText(staticCount, '5');
    assertNoStatus(staticCount);
    assertDisplayText(maxCount, '99+');
    assertSpanAriaLabel(maxCount, '128 件');
    assertStatus(autoCount, '12', '未読 12 件');
    assertSlotExists(text);
    if (!getRoleElement(dot, 'img')) {
      throw new Error('dot 状態が一覧に含まれていません');
    }
  },
};
