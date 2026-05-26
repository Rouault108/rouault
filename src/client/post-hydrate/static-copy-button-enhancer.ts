const COPY_RESET_DELAY_MS = 1500;
const COPY_SUCCESS_MESSAGE = 'コピーしました';
const COPY_ERROR_MESSAGE = 'コピーできませんでした';

type CopyState = 'idle' | 'copied' | 'error';

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
  return button.closest('[data-copy-control]')?.querySelector<HTMLElement>('[data-copy-status]') ?? null;
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
  if (!(target instanceof HTMLTemplateElement) || !target.matches('template[data-code-copy-source]')) {
    return null;
  }
  return target.content.textContent;
};

const resolveCopyValue = (button: HTMLButtonElement): string | null => {
  const targetId = button.dataset['copyTargetId'];
  const copyValue = button.dataset['copyValue'];
  if (targetId && copyValue !== undefined) {
    return null;
  }
  if (targetId) {
    return readTemplateCopyValue(button, targetId);
  }
  if (copyValue !== undefined) {
    const kind = button.dataset['copyKind'];
    if (kind === undefined || !allowedCopyKinds.has(kind)) {
      return null;
    }
    return copyValue;
  }
  return null;
};

const isHidden = (button: HTMLButtonElement): boolean =>
  button.hidden || button.closest('[hidden], [aria-hidden="true"]') !== null;

const copyFromButton = async (button: HTMLButtonElement): Promise<void> => {
  if (button.disabled || isHidden(button)) {
    return;
  }
  const value = resolveCopyValue(button);
  if (value === null || !('clipboard' in navigator)) {
    setCopyState(button, 'error');
    scheduleReset(button);
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
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
    const initialValue = resolveCopyValue(button);
    if (initialValue === null && !button.disabled) {
      setCopyState(button, 'error');
    }
    button.addEventListener('click', () => {
      void copyFromButton(button);
    });
  }
};
