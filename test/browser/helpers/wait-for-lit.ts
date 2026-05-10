export type LitLikeElement = HTMLElement & {
  updateComplete?: Promise<unknown>;
};

export async function waitForLitUpdate(element: LitLikeElement): Promise<void> {
  if (element.updateComplete) {
    await element.updateComplete;
  }
  await Promise.resolve();
  await Promise.resolve();
}

export async function waitForStyleRecalc(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export async function nextAnimationFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

export function dispatchKey(
  target: EventTarget & { dispatchEvent(event: Event): boolean },
  key: string,
  init: KeyboardEventInit = {},
): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
      ...init,
    }),
  );
}

export async function waitMs(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
