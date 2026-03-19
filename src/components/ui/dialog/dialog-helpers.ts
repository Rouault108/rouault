// dialog と search-dialog で共有する開閉補助処理をここに集約し、
// フォーカス復元・ネイティブ dialog 操作・スクロールロックの実装を重複させないためのファイル。

export interface BodyScrollLock {
  lock(): void;
  unlock(): void;
}

// ダイアログに紐づくアニメーションの完了を待ち、開閉状態の更新タイミングを揃える。
export const waitForDialogAnimations = async (dialog: HTMLDialogElement): Promise<void> => {
  const animations = dialog.getAnimations();
  if (animations.length === 0) {
    await Promise.resolve();
    return;
  }

  await Promise.allSettled(animations.map((animation) => animation.finished));
};

// 明示的なトリガーがあればそれを使い、なければ現在フォーカス中の要素を開閉トリガーとして記録する。
export const captureTrigger = (
  ownerDocument: Document,
  trigger?: HTMLElement,
): HTMLElement | null => {
  if (trigger instanceof HTMLElement) {
    return trigger;
  }

  const activeElement = ownerDocument.activeElement;
  return activeElement instanceof HTMLElement ? activeElement : null;
};

// ダイアログを閉じたあとに、記録しておいたトリガーへ安全にフォーカスを戻す。
export const restoreTriggerFocus = (trigger: HTMLElement | null): void => {
  if (!trigger?.isConnected) return;
  trigger.focus({ preventScroll: true });
};

// ネイティブの dialog API を安全に呼び出し、利用できないケースでは失敗として扱う。
export const showNativeDialog = (dialog: HTMLDialogElement, modal: boolean): boolean => {
  try {
    if (modal) {
      dialog.showModal();
    } else {
      dialog.show();
    }

    return true;
  } catch {
    return false;
  }
};

// 複数ダイアログの同時表示にも対応できるよう、参照カウント付きの body スクロールロックを作る。
export const createBodyScrollLock = (bodyAttribute: string): BodyScrollLock => {
  let lockCount = 0;

  return {
    lock(): void {
      if (typeof document === 'undefined') return;

      const body = document.body;
      if (lockCount === 0) {
        body.setAttribute(bodyAttribute, '');
      }

      lockCount += 1;
    },

    unlock(): void {
      if (typeof document === 'undefined') return;
      if (lockCount === 0) return;

      lockCount -= 1;
      if (lockCount > 0) return;

      document.body.removeAttribute(bodyAttribute);
    },
  };
};
