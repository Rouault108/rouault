export type LitLikeElement = HTMLElement & {
  updateComplete?: Promise<unknown>;
};

// Decisionで公開型の形を固定しているため、ここではtype aliasを維持する。
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WaitForConditionOptions = {
  timeout?: number;
  interval?: number;
};

function validateDelay(name: 'timeout' | 'interval', value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite, non-negative number.`);
  }
}

function waitForPredicateSettlement(
  predicate: () => unknown | Promise<unknown>,
  deadline: number,
  message: string,
  acceptZeroTimeoutImmediateSettlement: boolean,
): Promise<unknown> {
  const remaining = Math.max(0, deadline - performance.now());
  const predicatePromise = Promise.resolve().then(predicate);

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(message));
    }, remaining);

    predicatePromise.then(
      (value) => {
        if (settled) {
          return;
        }

        if (!acceptZeroTimeoutImmediateSettlement && performance.now() >= deadline) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(message));
          return;
        }

        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }

        if (!acceptZeroTimeoutImmediateSettlement && performance.now() >= deadline) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(message));
          return;
        }

        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function waitForCondition(
  predicate: () => unknown | Promise<unknown>,
  message: string,
  options: WaitForConditionOptions = {},
): Promise<void> {
  const timeout = options.timeout ?? 1_000;
  const interval = options.interval ?? 50;
  validateDelay('timeout', timeout);
  validateDelay('interval', interval);

  const deadline = performance.now() + timeout;
  let firstAttempt = true;

  while (firstAttempt || performance.now() < deadline) {
    const acceptZeroTimeoutImmediateSettlement = firstAttempt && timeout === 0;
    firstAttempt = false;

    const result = await waitForPredicateSettlement(
      predicate,
      deadline,
      message,
      acceptZeroTimeoutImmediateSettlement,
    );

    if (result) {
      return;
    }

    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      break;
    }

    await delay(Math.min(interval, remaining));
  }

  throw new Error(message);
}

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
