import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { Banner, type BannerVariant } from './banner';
import './banner';

const VARIANTS = ['info', 'warning', 'error', 'success'] as const satisfies BannerVariant[];

const ROLE_BY_VARIANT: Record<BannerVariant, 'status' | 'alert'> = {
  info: 'status',
  warning: 'alert',
  error: 'alert',
  success: 'status',
};

const ICON_BY_VARIANT: Record<BannerVariant, string> = {
  info: 'lucide:info',
  warning: 'lucide:triangle-alert',
  error: 'lucide:circle-x',
  success: 'lucide:circle-check',
};

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const withMockedMatchMedia = async (
  matcher: (query: string) => boolean,
  callback: () => Promise<void>,
): Promise<void> => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string): MediaQueryList => {
    const matches = matcher(query);
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList;
  }) as typeof window.matchMedia;

  try {
    await callback();
  } finally {
    window.matchMedia = original;
  }
};

const flush = async (banner: Banner): Promise<void> => {
  await banner.updateComplete;
  await waitFrame();
  await banner.updateComplete;
};

const getHost = (canvasElement: Element, id: string): Banner => {
  const host = canvasElement.querySelector<Banner>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getActions = (host: Banner): HTMLElement => {
  const actions = host.shadowRoot?.querySelector<HTMLElement>('.actions');
  if (!actions) throw new Error('.actions が見つかりません');
  return actions;
};

const getActionLink = (host: Banner): HTMLAnchorElement => {
  const actionLink = host.querySelector<HTMLAnchorElement>('a[slot="action"][href]');
  if (!actionLink) throw new Error('slot="action" のリンクが見つかりません');
  return actionLink;
};

const getIconSlot = (host: Banner): HTMLSlotElement => {
  const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="icon"]');
  if (!slot) throw new Error('slot[name="icon"] が見つかりません');
  return slot;
};

const getFallbackIcon = (host: Banner): HTMLElement => {
  const fallback = host.shadowRoot?.querySelector<HTMLElement>('iconify-icon.fallback-icon');
  if (!fallback) throw new Error('iconify-icon.fallback-icon が見つかりません');
  return fallback;
};

const queryDismissButton = (host: Banner): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('ui-button[aria-label="通知を閉じる"]') ?? null;

const getDismissButton = (host: Banner): HTMLElement => {
  const dismissButton = queryDismissButton(host);
  if (!dismissButton) throw new Error('閉じる ui-button が見つかりません');
  return dismissButton;
};

const assertRole = (host: Banner, expected: 'status' | 'alert'): void => {
  const actual = host.getAttribute('role');
  if (actual !== expected) {
    throw new Error(
      `role="${expected}" を期待していましたが、実際には "${actual ?? 'null'}" でした`,
    );
  }
};

const assertResolvedVariant = (host: Banner, expected: BannerVariant): void => {
  const actual = host.getAttribute('data-resolved-variant');
  if (actual !== expected) {
    throw new Error(
      `data-resolved-variant="${expected}" を期待していましたが、実際には "${actual ?? 'null'}" でした`,
    );
  }
};

const assertAtomic = (host: Banner, expected: 'true' | 'false'): void => {
  const actual = host.getAttribute('aria-atomic');
  if (actual !== expected) {
    throw new Error(
      `aria-atomic="${expected}" を期待していましたが、実際には "${actual ?? 'null'}" でした`,
    );
  }
};

const assertActionLinkUnderline = (host: Banner): void => {
  const actionLinkStyle = getComputedStyle(getActionLink(host));
  if (actionLinkStyle.textDecorationLine !== 'underline') {
    throw new Error('バナーのアクションリンクは常時下線である必要があります');
  }
};

const meta: Meta<Banner> = {
  title: 'Components/Banner',
  component: 'ui-banner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
アプリ全体に関わる持続的な状態通知バナーです。

- \`variant\` に応じた \`role\` 自動マッピング（warning / error は alert）
- \`role\` 明示指定時は自動マッピングを上書き
- \`slot="icon"\` のデフォルトフォールバック
- \`dismissible\` 時のみ閉じるボタンを表示し、dismiss 後に次要素へフォーカス移動
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      description: '意味的バリアント',
      table: {
        type: { summary: "'info' | 'warning' | 'error' | 'success'" },
        defaultValue: { summary: "'info'" },
      },
    },
    dismissible: {
      control: 'boolean',
      description: '閉じるボタン表示',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Banner>;

/**
 * 基本ケース:
 * warning + action の構成。
 */
export const Default: Story = {
  args: {
    variant: 'warning',
    dismissible: false,
  },
  render: (args) => html`
    <ui-banner id="banner-default" variant="${args.variant}" ?dismissible="${args.dismissible}">
      お使いのセッションは30分後に期限切れになります。
      <a slot="action" href="/session">セッションを延長</a>
    </ui-banner>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'banner-default');
    await flush(banner);

    assertResolvedVariant(banner, 'warning');
    assertRole(banner, 'alert');

    assertAtomic(banner, 'true');

    const actions = getActions(banner);
    if (actions.hidden) {
      throw new Error('アクション指定時は .actions が表示される必要があります');
    }

    if (queryDismissButton(banner)) {
      throw new Error('dismissible=false のとき閉じる ui-button は非表示である必要があります');
    }
  },
};

/**
 * 意味のある組み合わせ:
 * variant × state（action / dismissible）を検証。
 */
export const VariantStateCombinations: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.875rem;
      }
      .cell {
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: 6px;
        overflow: hidden;
      }
      .label {
        margin: 0;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px dashed var(--border-default, #d7d7d7);
        font-size: 11px;
        color: var(--fg-muted, #6e7781);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <p class="label">info x action</p>
        <ui-banner id="combo-info" variant="info">
          メンテナンスの詳細を公開しました。
          <a slot="action" href="/maintenance">詳細を見る</a>
        </ui-banner>
      </div>

      <div class="cell">
        <p class="label">warning x action</p>
        <ui-banner id="combo-warning" variant="warning">
          お使いのセッションは30分後に期限切れになります。
          <button slot="action" type="button">セッションを延長</button>
        </ui-banner>
      </div>

      <div class="cell">
        <p class="label">error x action + dismissible</p>
        <ui-banner id="combo-error" variant="error" dismissible>
          サービスへの接続に問題が発生しています。
          <button slot="action" type="button">再試行</button>
        </ui-banner>
      </div>

      <div class="cell">
        <p class="label">success x dismissible</p>
        <ui-banner id="combo-success" variant="success" dismissible>
          データのバックアップが完了しました。
        </ui-banner>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const info = getHost(canvasElement, 'combo-info');
    const warning = getHost(canvasElement, 'combo-warning');
    const error = getHost(canvasElement, 'combo-error');
    const success = getHost(canvasElement, 'combo-success');
    await Promise.all([flush(info), flush(warning), flush(error), flush(success)]);

    const cases: { host: Banner; variant: BannerVariant }[] = [
      { host: info, variant: 'info' },
      { host: warning, variant: 'warning' },
      { host: error, variant: 'error' },
      { host: success, variant: 'success' },
    ];

    for (const item of cases) {
      assertResolvedVariant(item.host, item.variant);
      assertRole(item.host, ROLE_BY_VARIANT[item.variant]);
      const fallback = getFallbackIcon(item.host);
      if (fallback.getAttribute('icon') !== ICON_BY_VARIANT[item.variant]) {
        throw new Error(
          `${item.variant} のアイコンとして "${ICON_BY_VARIANT[item.variant]}" を期待していましたが、実際には "${fallback.getAttribute('icon') ?? 'null'}" でした`,
        );
      }
    }

    if (getActions(info).hidden)
      throw new Error('info + アクションの組み合わせでは .actions の表示が必要です');
    if (getActions(warning).hidden)
      throw new Error('warning + アクションの組み合わせでは .actions の表示が必要です');
    if (getActions(error).hidden)
      throw new Error('error + アクションの組み合わせでは .actions の表示が必要です');
    if (!getActions(success).hidden)
      throw new Error('success（アクションなし）では .actions の非表示が必要です');

    getDismissButton(error);
    getDismissButton(success);

    if (queryDismissButton(info)) {
      throw new Error('info は dismissible ではないため閉じる ui-button を持つべきではありません');
    }
    if (queryDismissButton(warning)) {
      throw new Error(
        'warning は dismissible ではないため閉じる ui-button を持つべきではありません',
      );
    }

    assertActionLinkUnderline(info);
  },
};

/**
 * 境界条件:
 * role 明示指定の上書き保持と、契約外 role の自動復帰。
 */
export const RoleOverridePersistence: Story = {
  render: () => html`
    <ui-banner id="role-override" variant="warning" role="alert">
      セキュリティ設定に問題が見つかりました。
    </ui-banner>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'role-override');
    await flush(banner);

    assertRole(banner, 'alert');
    assertResolvedVariant(banner, 'warning');

    banner.variant = 'success';
    await flush(banner);
    assertResolvedVariant(banner, 'success');
    assertRole(banner, 'alert');

    banner.removeAttribute('role');
    await flush(banner);
    assertRole(banner, 'status');

    banner.setAttribute('role', 'status');
    await flush(banner);

    banner.variant = 'error';
    await flush(banner);
    assertResolvedVariant(banner, 'error');
    assertRole(banner, 'status');

    banner.setAttribute('role', 'log');
    await flush(banner);
    assertRole(banner, 'alert');

    banner.variant = 'info';
    await flush(banner);
    assertResolvedVariant(banner, 'info');
    assertRole(banner, 'status');
  },
};

/**
 * 境界条件:
 * icon/action slot のフォールバックと複数 action。
 */
export const SlotBoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-banner id="slot-custom-icon" variant="info">
        <iconify-icon slot="icon" icon="lucide:calendar-clock" aria-hidden="true"></iconify-icon>
        計画メンテナンスは明日0時に開始します。
      </ui-banner>

      <ui-banner id="slot-no-action" variant="success"> バックアップに成功しました。 </ui-banner>

      <ui-banner id="slot-multi-action" variant="warning">
        お使いのセッションはまもなく期限切れになります。
        <button slot="action" type="button">延長する</button>
        <a slot="action" href="/security">設定を確認</a>
      </ui-banner>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const customIcon = getHost(canvasElement, 'slot-custom-icon');
    const noAction = getHost(canvasElement, 'slot-no-action');
    const multiAction = getHost(canvasElement, 'slot-multi-action');
    await Promise.all([flush(customIcon), flush(noAction), flush(multiAction)]);

    const customSlot = getIconSlot(customIcon);
    const customAssigned = customSlot.assignedElements({ flatten: true });
    if (customAssigned.length !== 1) {
      throw new Error('カスタムアイコンは1要素のみ割り当てられる必要があります');
    }

    const customIconElement = customAssigned[0];
    if (!(customIconElement instanceof HTMLElement)) {
      throw new Error('カスタムアイコンが HTMLElement ではありません');
    }
    if (customIconElement.getAttribute('icon') !== 'lucide:calendar-clock') {
      throw new Error('カスタムアイコンの icon 属性が不正です');
    }

    if (!getActions(noAction).hidden) {
      throw new Error('アクション未指定時は .actions が非表示である必要があります');
    }

    const noActionFallback = getFallbackIcon(noAction);
    if (noActionFallback.getAttribute('icon') !== ICON_BY_VARIANT.success) {
      throw new Error('success のフォールバックアイコンが不正です');
    }

    const multiActionSlot =
      multiAction.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="action"]');
    if (!multiActionSlot) throw new Error('slot[name="action"] が見つかりません');
    const actionElements = multiActionSlot.assignedElements({ flatten: true });
    if (actionElements.length !== 2) {
      throw new Error(
        `複数アクションは2要素を期待していましたが、実際には ${String(actionElements.length)}個でした`,
      );
    }
    if (getActions(multiAction).hidden) {
      throw new Error('複数アクション指定時は .actions の表示が必要です');
    }

    assertActionLinkUnderline(multiAction);
  },
};

/**
 * 境界条件:
 * dismiss 後に DOM から削除され、次フォーカス可能要素へ移動。
 */
export const DismissFocusManagement: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-banner id="dismiss-focus" variant="error" dismissible>
        通信エラーが発生しました。
      </ui-banner>
      <div>
        <button id="dismiss-next-focus" type="button">次の操作へ進む</button>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'dismiss-focus');
    await flush(banner);

    const nextFocus = canvasElement.querySelector<HTMLButtonElement>('#dismiss-next-focus');
    if (!nextFocus) throw new Error('#dismiss-next-focus が見つかりません');
    const dismissButton = getDismissButton(banner);

    dismissButton.click();
    await banner.updateComplete;

    if (!banner.hasAttribute('data-dismissing')) {
      throw new Error('dismiss 開始後は data-dismissing が必要です');
    }

    banner.dispatchEvent(new AnimationEvent('animationend', { bubbles: true }));
    await waitFrame();

    if (canvasElement.contains(banner)) {
      throw new Error('dismiss 後に banner が DOM へ残っています');
    }

    if (document.activeElement !== nextFocus) {
      throw new Error('dismiss 後のフォーカス移動先が不正です');
    }
  },
};

/**
 * 境界条件:
 * 不正 variant 値のフォールバック。
 */
export const InvalidVariantFallback: Story = {
  render: () => html`
    <ui-banner id="invalid-variant" variant="unknown">
      不正な variant 値を与えた場合のフォールバック確認
    </ui-banner>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'invalid-variant');
    await flush(banner);

    assertResolvedVariant(banner, 'info');
    assertRole(banner, 'status');
    const fallback = getFallbackIcon(banner);
    if (fallback.getAttribute('icon') !== ICON_BY_VARIANT.info) {
      throw new Error('不正なバリアント指定時のフォールバックアイコンが不正です');
    }
  },
};

/**
 * 境界条件:
 * aria-atomic 明示指定(false)が保持されること。
 */
export const AtomicOverridePersistence: Story = {
  render: () => html`
    <ui-banner id="atomic-override" variant="info" aria-atomic="false"> 残り時間 29:59 </ui-banner>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'atomic-override');
    await flush(banner);

    assertAtomic(banner, 'false');

    banner.variant = 'error';
    await flush(banner);

    assertRole(banner, 'alert');
    assertAtomic(banner, 'false');
  },
};

/**
 * 境界条件:
 * prefers-reduced-motion では dismiss が即時完了すること。
 */
export const ReducedMotionDismissImmediate: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-banner id="dismiss-reduced" variant="warning" dismissible>
        セッション期限が近づいています。
      </ui-banner>
      <button id="dismiss-reduced-next" type="button">次へ進む</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await withMockedMatchMedia(
      (query) => query === '(prefers-reduced-motion: reduce)',
      async () => {
        const banner = getHost(canvasElement, 'dismiss-reduced');
        await flush(banner);

        const nextFocus = canvasElement.querySelector<HTMLButtonElement>('#dismiss-reduced-next');
        if (!nextFocus) throw new Error('#dismiss-reduced-next が見つかりません');
        const dismissButton = getDismissButton(banner);

        dismissButton.click();

        await waitFrame();

        if (canvasElement.contains(banner)) {
          throw new Error(
            'reduced-motion では dismiss 後に即時で DOM から削除される必要があります',
          );
        }
        if (document.activeElement !== nextFocus) {
          throw new Error('reduced-motion dismiss 後のフォーカス移動先が不正です');
        }
      },
    );
  },
};

/**
 * ダークモード:
 * UI outcome として可読性が維持されることを確認。
 */
export const DarkModeVisualOutcome: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div
      style="color-scheme: dark; background: oklch(14% 0.01 250); color: oklch(92% 0.01 250); padding: 1rem; border-radius: 10px;"
    >
      <ui-banner id="dark-mode-warning" variant="warning" dismissible>
        お使いのセッションは30分後に期限切れになります。
        <button slot="action" type="button">延長する</button>
      </ui-banner>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'dark-mode-warning');
    await flush(banner);

    assertResolvedVariant(banner, 'warning');
    assertRole(banner, 'alert');
    getDismissButton(banner);

    const message = banner.shadowRoot?.querySelector<HTMLElement>('.message');
    if (!message) throw new Error('.message が見つかりません');
    const style = getComputedStyle(message);
    if (style.color === '' || style.color === 'transparent') {
      throw new Error('dark mode でもメッセージ色が解決される必要があります');
    }
  },
};

/**
 * 高コントラスト:
 * forced-colors 環境で主要導線が視認可能であることを確認。
 */
export const ForcedColorsVisualOutcome: Story = {
  render: () => html`
    <ui-banner id="forced-colors-banner" variant="error" dismissible>
      接続エラーが発生しました。状況を確認してから再試行してください。
      <a slot="action" href="/status">状況を確認</a>
    </ui-banner>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'forced-colors-banner');
    await flush(banner);

    assertResolvedVariant(banner, 'error');
    assertRole(banner, 'alert');
    assertActionLinkUnderline(banner);

    const dismissButton = getDismissButton(banner);
    if (!window.matchMedia('(forced-colors: active)').matches) return;

    const hostStyle = getComputedStyle(banner);
    if (hostStyle.borderBottomStyle === 'none' || hostStyle.borderBottomWidth === '0px') {
      throw new Error('forced-colors では境界線が視認可能である必要があります');
    }

    const dismissStyle = getComputedStyle(dismissButton);
    if (dismissStyle.display === 'none' || dismissStyle.visibility === 'hidden') {
      throw new Error('forced-colors でも dismiss 操作は視認可能である必要があります');
    }

    const actionStyle = getComputedStyle(getActionLink(banner));
    if (actionStyle.color === '' || actionStyle.color === 'transparent') {
      throw new Error('forced-colors でも action 導線の可視性が必要です');
    }
  },
};

/**
 * 印刷:
 * print で本文以外を落とすルールが定義されていることを確認。
 */
export const PrintVisualOutcome: Story = {
  render: () => html`
    <ui-banner id="print-banner" variant="success" dismissible>
      バックアップが完了しました。
      <a slot="action" href="/backup">詳細を見る</a>
    </ui-banner>
  `,
  play: async ({ canvasElement }) => {
    const banner = getHost(canvasElement, 'print-banner');
    await flush(banner);

    assertResolvedVariant(banner, 'success');
    assertRole(banner, 'status');
    getDismissButton(banner);
    assertActionLinkUnderline(banner);

    const cssText = String(Banner.styles);
    const requiredSnippets = [
      '@media print',
      'background: none;',
      '.icon,',
      '.actions,',
      '.dismiss {',
      'display: none !important;',
    ];

    for (const snippet of requiredSnippets) {
      if (!cssText.includes(snippet)) {
        throw new Error(`print 契約の定義が不足しています: ${snippet}`);
      }
    }

    if (!window.matchMedia('print').matches) {
      return;
    }

    const icon = banner.shadowRoot?.querySelector<HTMLElement>('.icon');
    const actions = getActions(banner);
    const dismissButton = getDismissButton(banner);
    if (!icon) throw new Error('.icon が見つかりません');

    if (getComputedStyle(icon).display !== 'none') {
      throw new Error('print では icon が非表示である必要があります');
    }
    if (getComputedStyle(actions).display !== 'none') {
      throw new Error('print では actions が非表示である必要があります');
    }
    if (getComputedStyle(dismissButton).display !== 'none') {
      throw new Error('print では dismiss が非表示である必要があります');
    }
  },
};
