const COPY_RESET_DELAY_MS = 1500;
const COPY_SUCCESS_MESSAGE = 'コピーしました';
const COPY_ERROR_MESSAGE = 'コピーできませんでした';
const PROGRESSIVE_DISABLED_REASON = 'no-js';

type CopyState = 'idle' | 'copied' | 'error';
type CopyDisabledReason = 'clipboard-unavailable' | 'no-js' | 'source';
type ActivationErrorDisabledReason = Exclude<
  CopyDisabledReason,
  typeof PROGRESSIVE_DISABLED_REASON
>;

const allowedCopyKinds = new Set<string>(['short-text', 'permalink']);
const resetTimers = new WeakMap<HTMLButtonElement, number>();

const getStatusElement = (button: HTMLButtonElement): HTMLElement | null => {
  const describedBy = button.getAttribute('aria-describedby');
  if (describedBy) {
    const status = button.ownerDocument.getElementById(describedBy);
    if (status instanceof HTMLElement && status.matches('[data-copy-status]')) {
      return status;
    }
  }
  return (
    button.closest('[data-copy-control]')?.querySelector<HTMLElement>('[data-copy-status]') ?? null
  );
};

const setCopyState = (button: HTMLButtonElement, state: CopyState): void => {
  button.dataset['copyState'] = state;
  const status = getStatusElement(button);
  if (status) {
    status.textContent =
      state === 'copied' ? COPY_SUCCESS_MESSAGE : state === 'error' ? COPY_ERROR_MESSAGE : '';
  }
};

const scheduleReset = (button: HTMLButtonElement): void => {
  const current = resetTimers.get(button);
  if (current !== undefined) {
    window.clearTimeout(current);
  }
  resetTimers.set(
    button,
    window.setTimeout(() => {
      setCopyState(button, 'idle');
      resetTimers.delete(button);
    }, COPY_RESET_DELAY_MS),
  );
};

const readTemplateCopyValue = (button: HTMLButtonElement, targetId: string): string | null => {
  const target = button.ownerDocument.getElementById(targetId);
  if (
    !(target instanceof HTMLTemplateElement) ||
    !target.matches('template[data-code-copy-source]')
  ) {
    return null;
  }
  return target.content.textContent;
};

const resolveCopyValue = (button: HTMLButtonElement): string | null => {
  const hasTargetId = button.hasAttribute('data-copy-target-id');
  const hasCopyValue = button.hasAttribute('data-copy-value');
  const targetId = button.dataset['copyTargetId'];
  const copyValue = button.dataset['copyValue'];
  if (hasTargetId && hasCopyValue) {
    return null;
  }
  if (hasTargetId) {
    if (!targetId) {
      return null;
    }
    return readTemplateCopyValue(button, targetId);
  }
  if (hasCopyValue) {
    const kind = button.dataset['copyKind'];
    if (copyValue === undefined || kind === undefined || !allowedCopyKinds.has(kind)) {
      return null;
    }
    return copyValue;
  }
  return null;
};

const isHidden = (button: HTMLButtonElement): boolean =>
  button.hidden || button.closest('[hidden], [aria-hidden="true"]') !== null;

const getClipboard = (): Clipboard | null => {
  const clipboard: Clipboard | undefined =
    'clipboard' in navigator ? navigator.clipboard : undefined;
  return clipboard && typeof clipboard.writeText === 'function' ? clipboard : null;
};

const hasProgressiveDisabledState = (button: HTMLButtonElement): boolean =>
  !button.disabled || button.dataset['copyDisabledReason'] === PROGRESSIVE_DISABLED_REASON;

const disableCopyButton = (
  button: HTMLButtonElement,
  reason: CopyDisabledReason,
): void => {
  button.disabled = true;
  button.dataset['copyDisabledReason'] = reason;
  setCopyState(button, 'idle');
};

const disableCopyButtonWithActivationError = (
  button: HTMLButtonElement,
  reason: ActivationErrorDisabledReason,
): void => {
  disableCopyButton(button, reason);
  setCopyState(button, 'error');
  scheduleReset(button);
};

const isActivationErrorDisabledReason = (
  reason: CopyDisabledReason,
): reason is ActivationErrorDisabledReason => reason !== PROGRESSIVE_DISABLED_REASON;

const enableCopyButton = (button: HTMLButtonElement): void => {
  if (button.dataset['copyDisabledReason'] === PROGRESSIVE_DISABLED_REASON) {
    button.removeAttribute('data-copy-disabled-reason');
  }
  button.disabled = false;
  setCopyState(button, 'idle');
};

const resolveDisabledReason = (
  button: HTMLButtonElement,
  value: string | null,
  clipboard: Clipboard | null,
): CopyDisabledReason | null => {
  if (value === null || button.dataset['copyDisabledReason'] === 'source') {
    return 'source';
  }
  if (clipboard === null) {
    return 'clipboard-unavailable';
  }
  return null;
};

const copyFromButton = async (button: HTMLButtonElement): Promise<void> => {
  if (button.disabled || isHidden(button)) {
    return;
  }
  const value = resolveCopyValue(button);
  const clipboard = getClipboard();
  if (value === null || clipboard === null) {
    setCopyState(button, 'error');
    scheduleReset(button);
    return;
  }
  try {
    await clipboard.writeText(value);
    setCopyState(button, 'copied');
  } catch {
    setCopyState(button, 'error');
  }
  scheduleReset(button);
};

export const activateStaticCopyButtons = (root: ParentNode): void => {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-copy-button]')) {
    if (button.dataset['copyEnhanced'] === 'true') {
      continue;
    }
    button.dataset['copyEnhanced'] = 'true';
    if (!isHidden(button) && hasProgressiveDisabledState(button)) {
      const value = resolveCopyValue(button);
      const clipboard = getClipboard();
      const disabledReason = resolveDisabledReason(button, value, clipboard);

      if (disabledReason === null) {
        enableCopyButton(button);
      } else if (isActivationErrorDisabledReason(disabledReason)) {
        disableCopyButtonWithActivationError(button, disabledReason);
      } else {
        disableCopyButton(button, disabledReason);
      }
    }
    button.addEventListener('click', () => {
      void copyFromButton(button);
    });
  }
};
