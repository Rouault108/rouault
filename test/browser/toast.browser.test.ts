import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/toast/toast.js';
import {
  DANGER_TOAST_DURATION_MS,
  MAX_TOAST_STACK,
  TOAST_EXIT_DURATION_MS,
  ToastManager,
  type ToastItem,
  type ToastVariant,
  type UiToast,
} from '../../src/components/ui/toast/toast.js';
import { nextAnimationFrame, waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: UiToast): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const waitUntil = async (
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 20,
  message = 'condition not met',
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await waitMs(intervalMs);
  }

  throw new Error(message);
};

const getOutputs = (host: UiToast): HTMLOutputElement[] =>
  Array.from(host.shadowRoot?.querySelectorAll<HTMLOutputElement>('output.toast') ?? []);

const getMessage = (toast: HTMLOutputElement): string =>
  expectPresent(
    toast.querySelector<HTMLElement>('.toast-message'),
    'toast message',
  ).textContent?.trim() ?? '';

const getCloseButton = (toast: HTMLOutputElement): HTMLButtonElement =>
  expectPresent(toast.querySelector<HTMLButtonElement>('button.toast-close'), 'toast close button');

const findToastByVariantAndMessage = (
  host: UiToast,
  variant: ToastVariant,
  message: string,
): HTMLOutputElement => {
  const target = getOutputs(host).find(
    (toast) => toast.dataset['variant'] === variant && getMessage(toast) === message,
  );

  if (!target) {
    throw new Error(`"${variant}" / "${message}" の toast が見つかりません`);
  }

  return target;
};

const assertRole = (toast: HTMLOutputElement, expected: 'status' | 'alert'): void => {
  expect(toast.getAttribute('role')).to.equal(expected);
};

const assertVariant = (toast: HTMLOutputElement, expected: ToastVariant): void => {
  expect(toast.getAttribute('data-variant')).to.equal(expected);
};

const getSnapshotByMessage = (message: string): ToastItem | undefined =>
  ToastManager.getSnapshot().find((item) => item.message === message);

describe('ui-toast browser contract', () => {
  afterEach(() => {
    ToastManager.setVisibilityPaused(false);
    ToastManager.clear();
  });

  it('success toast を描画し、close button で dismiss できること', async () => {
    const host = await fixture<UiToast>(html`<ui-toast></ui-toast>`);
    await flush(host);

    ToastManager.show({
      variant: 'success',
      message: '保存が完了しました',
      duration: 0,
    });
    await flush(host);

    const outputs = getOutputs(host);
    expect(outputs.length).to.equal(1);

    const toast = expectPresent(outputs[0], 'toast');
    const closeButton = getCloseButton(toast);

    assertVariant(toast, 'success');
    assertRole(toast, 'status');
    expect(closeButton.getAttribute('aria-label')).to.equal('通知を閉じる');

    closeButton.click();
    await flush(host);

    expect(toast.getAttribute('data-exiting')).to.equal('true');

    await waitMs(TOAST_EXIT_DURATION_MS + 30);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(0);
    expect(getOutputs(host).length).to.equal(0);
  });

  it('最大3件を保持し、新着を先頭に積み、最古を落とすこと', async () => {
    const host = await fixture<UiToast>(html`<ui-toast></ui-toast>`);
    await flush(host);

    const first = ToastManager.show({ variant: 'info', message: 'A', duration: 0 });
    const second = ToastManager.show({ variant: 'info', message: 'B', duration: 0 });
    const third = ToastManager.show({ variant: 'info', message: 'C', duration: 0 });
    const fourth = ToastManager.show({ variant: 'info', message: 'D', duration: 0 });
    await flush(host);

    expect(first).to.not.equal(null);
    expect(second).to.not.equal(null);
    expect(third).to.not.equal(null);
    expect(fourth).to.not.equal(null);

    const outputs = getOutputs(host);
    const messages = outputs.map((toast) => getMessage(toast));
    const ids = outputs.map((toast) => toast.dataset['toastId'] ?? '');

    expect(outputs.length).to.equal(MAX_TOAST_STACK);
    expect(messages).to.deep.equal(['D', 'C', 'B']);
    expect(ids).to.deep.equal([fourth ?? '', third ?? '', second ?? '']);
    expect(ToastManager.getSnapshot().some((item) => item.id === first)).to.equal(false);
  });

  it('同一 variant + normalized message を重複統合し、duration を再設定すること', async () => {
    const host = await fixture<UiToast>(html`<ui-toast></ui-toast>`);
    await flush(host);

    ToastManager.show({
      variant: 'success',
      message: '保存が完了しました',
      duration: 300,
    });
    await flush(host);

    await waitMs(140);

    ToastManager.show({
      variant: 'success',
      message: '  保存が完了しました  ',
      duration: 280,
    });
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(1);

    await waitMs(170);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(1);

    await waitMs(170 + TOAST_EXIT_DURATION_MS + 30);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(0);
  });

  it('hover で auto-dismiss timer を pause / resume すること', async () => {
    const host = await fixture<UiToast>(html`<ui-toast></ui-toast>`);
    await flush(host);

    ToastManager.show({
      variant: 'warning',
      message: '接続が不安定です',
      duration: 120,
    });
    await flush(host);

    const hoverToast = findToastByVariantAndMessage(host, 'warning', '接続が不安定です');

    await waitMs(20);
    hoverToast.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await waitMs(60);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(1);

    hoverToast.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await waitMs(TOAST_EXIT_DURATION_MS + 90);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(0);
  });

  it('focus で auto-dismiss timer を pause / resume すること', async () => {
    const host = await fixture<UiToast>(html`<ui-toast></ui-toast>`);
    await flush(host);

    ToastManager.show({
      variant: 'warning',
      message: 'フォーカステスト',
      duration: 120,
    });
    await flush(host);

    const focusToast = findToastByVariantAndMessage(host, 'warning', 'フォーカステスト');
    const closeButton = getCloseButton(focusToast);

    await waitMs(20);
    closeButton.focus();
    await waitMs(60);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(1);

    closeButton.blur();
    await waitMs(TOAST_EXIT_DURATION_MS + 90);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(0);
  });

  it('visibility で auto-dismiss timer を pause / resume すること', async () => {
    const host = await fixture<UiToast>(html`<ui-toast></ui-toast>`);
    await flush(host);

    ToastManager.show({
      variant: 'info',
      message: 'visibility テスト',
      duration: 120,
    });
    await flush(host);

    await waitMs(20);
    ToastManager.setVisibilityPaused(true);
    await waitMs(60);
    await flush(host);

    expect(ToastManager.getSnapshot().length).to.equal(1);

    ToastManager.setVisibilityPaused(false);
    await waitMs(TOAST_EXIT_DURATION_MS + 90);
    await flush(host);
    await waitUntil(
      () => ToastManager.getSnapshot().length === 0,
      2000,
      20,
      'visibility resume 後に toast が dismiss されません',
    );

    expect(ToastManager.getSnapshot().length).to.equal(0);
  });

  it('duration:0 は dismissible=true になり、variant 違いは重複統合せず、legacy error は danger へ写像されること', async () => {
    const host = await fixture<UiToast>(html`<ui-toast></ui-toast>`);
    await flush(host);

    ToastManager.show({
      variant: 'info',
      message: '同一文言',
      duration: 0,
      dismissible: false,
    });
    ToastManager.show({
      variant: 'danger',
      message: '同一文言',
      duration: 0,
    });
    ToastManager.show({
      variant: 'error',
      message: '旧variant互換テスト',
      duration: 1200,
    });
    await flush(host);

    const outputs = getOutputs(host);
    expect(outputs.length).to.equal(3);

    const infoToast = findToastByVariantAndMessage(host, 'info', '同一文言');
    const legacyToast = findToastByVariantAndMessage(host, 'danger', '旧variant互換テスト');

    getCloseButton(infoToast);
    assertRole(infoToast, 'status');
    assertVariant(legacyToast, 'danger');
    assertRole(legacyToast, 'alert');

    const legacySnapshot = getSnapshotByMessage('旧variant互換テスト');
    expect(legacySnapshot?.duration).to.equal(1200);

    ToastManager.clear();
    await flush(host);

    ToastManager.show({
      variant: 'danger',
      message: '保存に失敗しました',
    });
    await flush(host);

    const dangerSnapshot = getSnapshotByMessage('保存に失敗しました');
    expect(dangerSnapshot?.duration).to.equal(DANGER_TOAST_DURATION_MS);
  });
});
