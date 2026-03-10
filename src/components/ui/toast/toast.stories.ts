import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './toast';
import {
  DANGER_TOAST_DURATION_MS,
  MAX_TOAST_STACK,
  TOAST_EXIT_DURATION_MS,
  ToastManager,
  type ToastItem,
  type ToastVariant,
  type UiToast,
} from './toast';

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const flush = async (host: UiToast): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

const getHost = (canvasElement: Element, id: string): UiToast => {
  const host = canvasElement.querySelector<UiToast>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getOutputs = (host: UiToast): HTMLOutputElement[] => {
  const root = host.shadowRoot;
  if (!root) throw new Error('shadowRoot が見つかりません');
  return [...root.querySelectorAll<HTMLOutputElement>('output.toast')];
};

const getMessage = (toast: HTMLOutputElement): string => {
  const message = toast.querySelector<HTMLElement>('.toast-message');
  if (!message) throw new Error('.toast-message が見つかりません');
  return message.textContent.trim();
};

const getCloseButton = (toast: HTMLOutputElement): HTMLButtonElement => {
  const button = toast.querySelector<HTMLButtonElement>('button.toast-close');
  if (!button) throw new Error('button.toast-close が見つかりません');
  return button;
};

const findToastByMessage = (host: UiToast, message: string): HTMLOutputElement => {
  const target = getOutputs(host).find((toast) => getMessage(toast) === message);
  if (!target) throw new Error(`"${message}" のトーストが見つかりません`);
  return target;
};

const assertRole = (toast: HTMLOutputElement, expected: 'status' | 'alert'): void => {
  const actual = toast.getAttribute('role');
  if (actual !== expected) {
    throw new Error(`role="${expected}" を期待していましたが、実際には "${actual ?? 'null'}" でした`);
  }
};

const assertVariant = (toast: HTMLOutputElement, expected: ToastVariant): void => {
  const actual = toast.getAttribute('data-variant');
  if (actual !== expected) {
    throw new Error(`data-variant="${expected}" を期待していましたが、実際には "${actual ?? 'null'}" でした`);
  }
};

const getSnapshotByMessage = (message: string): ToastItem | undefined =>
  ToastManager.getSnapshot().find((item) => item.message === message);

const waitForSnapshotCount = async (expected: number, timeoutMs = 1200): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (ToastManager.getSnapshot().length === expected) return;
    await wait(16);
  }
  throw new Error(`スナップショットの件数が ${String(expected)} であることを期待していましたが、実際には ${String(ToastManager.getSnapshot().length)} でした`);
};

const meta: Meta<UiToast> = {
  title: 'Components/Toast',
  component: 'ui-toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
一時通知（Non-blocking）を管理するトーストです。

- 新着を上部に積む（DOM順と視覚順を一致）
- 最大3件を保持し、4件目は最古を削除
- 重複キーは \`variant + normalizedMessage\`
- \`duration > 0\` は hover/focus 中にタイマー停止
- \`duration: 0\` は自動消滅しないが、閉じるボタンは常に表示
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiToast>;

/**
 * 基本ケース:
 * - success 通知の描画
 * - role="status"
 * - 閉じるボタンのアクセシブル名
 */
export const Default: Story = {
  render: () => html`<ui-toast id="toast-default"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-default');
    await flush(host);

    ToastManager.show({
      variant: 'success',
      message: '保存が完了しました',
      duration: 0,
    });
    await flush(host);

    const toasts = getOutputs(host);
    if (toasts.length !== 1) {
      throw new Error(`1つのトーストを期待していましたが、実際には ${String(toasts.length)}個でした`);
    }

    const toast = toasts[0];
    if (!toast) throw new Error('toast が見つかりません');
    assertVariant(toast, 'success');
    assertRole(toast, 'status');

    const closeButton = getCloseButton(toast);
    if (closeButton.getAttribute('aria-label') !== '通知を閉じる') {
      throw new Error('閉じるボタンの aria-label が不正です');
    }

  },
};

/**
 * 意味のある組み合わせ:
 * - success（通常完了, polite）
 * - info + duration:0（手動クローズ維持）
 * - warning / danger（要対処, assertive）
 */
export const VariantStateCombinations: Story = {
  render: () => html`<ui-toast id="toast-combinations"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-combinations');
    await flush(host);

    ToastManager.show({
      variant: 'success',
      message: '同期が完了しました',
      duration: 2000,
    });
    await flush(host);

    const successToast = findToastByMessage(host, '同期が完了しました');
    assertVariant(successToast, 'success');
    assertRole(successToast, 'status');

    ToastManager.clear();
    await flush(host);

    ToastManager.show({
      variant: 'info',
      message: '新しいバージョンが利用可能です',
      duration: 0,
      dismissible: false,
    });
    ToastManager.show({
      variant: 'warning',
      message: '未保存の変更があります',
      duration: 0,
    });
    ToastManager.show({
      variant: 'danger',
      message: '保存に失敗しました',
    });
    await flush(host);

    const infoToast = findToastByMessage(host, '新しいバージョンが利用可能です');
    const warningToast = findToastByMessage(host, '未保存の変更があります');
    const dangerToast = findToastByMessage(host, '保存に失敗しました');

    assertVariant(infoToast, 'info');
    assertRole(infoToast, 'status');
    assertVariant(warningToast, 'warning');
    assertRole(warningToast, 'alert');
    assertVariant(dangerToast, 'danger');
    assertRole(dangerToast, 'alert');

    // duration:0 は dismissible=true に強制される
    getCloseButton(infoToast);

    const dangerSnapshot = getSnapshotByMessage('保存に失敗しました');
    if (!dangerSnapshot) throw new Error('danger の snapshot が見つかりません');
    if (dangerSnapshot.duration !== DANGER_TOAST_DURATION_MS) {
      throw new Error(
        `danger のデフォルト duration が不正です: expected=${String(DANGER_TOAST_DURATION_MS)}, actual=${String(dangerSnapshot.duration)}`,
      );
    }
  },
};

/**
 * 境界条件:
 * - 4件目追加時に最古トーストを即時削除
 * - 新着がDOM先頭（視覚上最上部）に入る
 */
export const OverflowAndOrderIntegrity: Story = {
  render: () => html`<ui-toast id="toast-overflow"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-overflow');
    await flush(host);

    const first = ToastManager.show({ variant: 'info', message: 'A', duration: 0 });
    const second = ToastManager.show({ variant: 'info', message: 'B', duration: 0 });
    const third = ToastManager.show({ variant: 'info', message: 'C', duration: 0 });
    const fourth = ToastManager.show({ variant: 'info', message: 'D', duration: 0 });
    await flush(host);

    if (!first || !second || !third || !fourth) {
      throw new Error('トーストIDの発行に失敗しました');
    }

    const toasts = getOutputs(host);
    if (toasts.length !== MAX_TOAST_STACK) {
      throw new Error(`${String(MAX_TOAST_STACK)}個のトーストを期待していましたが、実際には ${String(toasts.length)}個でした`);
    }

    const messages = toasts.map((toast) => getMessage(toast));
    const expectedOrder = ['D', 'C', 'B'];
    if (messages.join('|') !== expectedOrder.join('|')) {
      throw new Error(`順序不整合: 期待値=${expectedOrder.join(' > ')}, 実際値=${messages.join(' > ')}`);
    }

    const ids = toasts.map((toast) => toast.dataset['toastId'] ?? '');
    if (ids[0] !== fourth || ids[1] !== third || ids[2] !== second) {
      throw new Error('DOM順が新着順（prepend）になっていません');
    }

    if (ToastManager.getSnapshot().some((item) => item.id === first)) {
      throw new Error('最古トースト（A）が削除されていません');
    }

    ToastManager.clear();
  },
};

/**
 * 境界条件:
 * - 同一 variant + message は重複統合（件数増加しない）
 * - 再通知で duration をリセット
 */
export const DuplicateMergeAndDurationReset: Story = {
  render: () => html`<ui-toast id="toast-duplicate"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-duplicate');
    await flush(host);

    ToastManager.show({
      variant: 'success',
      message: '保存が完了しました',
      duration: 3000,
    });
    await flush(host);

    await wait(140);
    ToastManager.show({
      variant: 'success',
      message: '  保存が完了しました  ',
      duration: 280,
    });
    await flush(host);

    if (ToastManager.getSnapshot().length !== 1) {
      throw new Error('重複統合に失敗し、トーストが増加しています');
    }

    await wait(180);
    await flush(host);
    if (ToastManager.getSnapshot().length !== 1) {
      throw new Error('duration リセット後の保持に失敗しました');
    }

    await wait(180 + TOAST_EXIT_DURATION_MS + 30);
    await flush(host);
    if (ToastManager.getSnapshot().length !== 0) {
      throw new Error('duration 経過後にトーストが消えていません');
    }

    ToastManager.clear();
  },
};

/**
 * 境界条件:
 * - hover 中は auto-dismiss タイマーを停止
 * - hover 解除でタイマー再開
 */
export const HoverPauseAndResumeTimer: Story = {
  render: () => html`<ui-toast id="toast-hover-pause"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-hover-pause');
    await flush(host);

    ToastManager.show({
      variant: 'warning',
      message: '接続が不安定です',
      duration: 720,
    });
    await flush(host);

    const toast = findToastByMessage(host, '接続が不安定です');
    await wait(180);

    toast.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await wait(720);
    await flush(host);

    if (ToastManager.getSnapshot().length !== 1) {
      throw new Error('hover 中にトーストが消えました（タイマー停止失敗）');
    }

    toast.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await waitForSnapshotCount(0, 1800);
    await flush(host);

    if (ToastManager.getSnapshot().length !== 0) {
      throw new Error('hover 解除後にトーストが消えていません（タイマー再開失敗）');
    }

    ToastManager.clear();
  },
};

/**
 * 境界条件:
 * - focusin 中は auto-dismiss タイマーを停止
 * - focusout でタイマー再開
 */
export const FocusPauseAndResumeTimer: Story = {
  render: () => html`<ui-toast id="toast-focus-pause"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-focus-pause');
    await flush(host);

    ToastManager.show({
      variant: 'warning',
      message: 'フォーカステスト',
      duration: 320,
    });
    await flush(host);

    const toast = findToastByMessage(host, 'フォーカステスト');
    const closeButton = getCloseButton(toast);

    await wait(110);
    closeButton.focus();
    await wait(360);
    await flush(host);

    if (ToastManager.getSnapshot().length !== 1) {
      throw new Error('focusin 中にトーストが消えました（タイマー停止失敗）');
    }

    closeButton.blur();
    await waitForSnapshotCount(0);
    await flush(host);

    if (ToastManager.getSnapshot().length !== 0) {
      throw new Error('focusout 後にトーストが消えていません（タイマー再開失敗）');
    }

    ToastManager.clear();
  },
};

/**
 * 境界条件:
 * - visibility hidden 中は auto-dismiss タイマーを停止
 * - visible 復帰後にタイマー再開
 */
export const VisibilityPauseAndResumeTimer: Story = {
  render: () => html`<ui-toast id="toast-visibility-pause"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    ToastManager.setVisibilityPaused(false);
    const host = getHost(canvasElement, 'toast-visibility-pause');
    await flush(host);

    ToastManager.show({
      variant: 'info',
      message: 'visibility テスト',
      duration: 280,
    });
    await flush(host);

    await wait(100);
    ToastManager.setVisibilityPaused(true);
    await wait(360);
    await flush(host);

    if (ToastManager.getSnapshot().length !== 1) {
      throw new Error('visibility hidden 中にトーストが消えました');
    }

    ToastManager.setVisibilityPaused(false);
    await waitForSnapshotCount(0);
    await flush(host);

    if (ToastManager.getSnapshot().length !== 0) {
      throw new Error('visibility visible 復帰後にトーストが消えていません');
    }

    ToastManager.setVisibilityPaused(false);
    ToastManager.clear();
  },
};

/**
 * 境界条件:
 * - 重複判定キーは variant + normalizedMessage
 * - 同一 message でも variant が違えば統合しない
 */
export const DuplicateKeyRespectsVariant: Story = {
  render: () => html`<ui-toast id="toast-variant-duplicate"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-variant-duplicate');
    await flush(host);

    ToastManager.show({ variant: 'info', message: '同一文言', duration: 0 });
    ToastManager.show({ variant: 'danger', message: '同一文言', duration: 0 });
    await flush(host);

    const outputs = getOutputs(host);
    if (outputs.length !== 2) {
      throw new Error(`variant が異なる同一文言は統合してはいけません: 実際値=${String(outputs.length)}`);
    }

    const variants = outputs.map((toast) => toast.getAttribute('data-variant')).sort().join('|');
    if (variants !== 'danger|info') {
      throw new Error(`variant の保持に失敗しました: ${variants}`);
    }

    ToastManager.clear();
  },
};

/**
 * ダークモード契約:
 * - バリアント背景が透明にならない
 * - forced-colors / reduced-motion / print の契約定義が存在する
 */
export const DarkModeAndStyleContracts: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div style="color-scheme: dark; background: oklch(16% 0.02 250); min-height: 220px; padding: 1rem;">
      <ui-toast id="toast-dark-contract"></ui-toast>
    </div>
  `,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-dark-contract');
    await flush(host);

    ToastManager.show({
      variant: 'danger',
      message: 'ダークモード確認',
      duration: 0,
    });
    await flush(host);

    const toast = findToastByMessage(host, 'ダークモード確認');
    const style = getComputedStyle(toast);
    if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') {
      throw new Error('ダークモードで背景が透明です');
    }

    const root = host.shadowRoot;
    const styleEl = root?.querySelector('style');
    let cssText = styleEl?.textContent ?? '';
    if (!cssText && root) {
      cssText = Array.from(root.adoptedStyleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
        .join('\n');
    }
    const requiredContracts = ['@media (forced-colors: active)', '@media (prefers-reduced-motion: reduce)', '@media print'];
    for (const contract of requiredContracts) {
      if (!cssText.includes(contract)) {
        throw new Error(`スタイル契約が不足しています: ${contract}`);
      }
    }

    ToastManager.clear();
  },
};

/**
 * 境界条件:
 * - 後方互換 variant="error" は danger へ内部マッピング
 */
export const LegacyErrorVariantMapping: Story = {
  render: () => html`<ui-toast id="toast-legacy-error"></ui-toast>`,
  play: async ({ canvasElement }) => {
    ToastManager.clear();
    const host = getHost(canvasElement, 'toast-legacy-error');
    await flush(host);

    ToastManager.show({
      variant: 'error',
      message: '旧variant互換テスト',
      duration: 1200,
    });
    await flush(host);

    const toast = findToastByMessage(host, '旧variant互換テスト');
    assertVariant(toast, 'danger');
    assertRole(toast, 'alert');

    ToastManager.clear();
  },
};
