const fixtures = new Map<HTMLElement, Set<AbortController>>();

export const fixture = async <T extends HTMLElement = HTMLElement>(
  input: string | Node,
): Promise<T> => {
  const container = document.createElement('div');
  if (typeof input === 'string') container.innerHTML = input;
  else container.append(input);
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new TypeError('fixture root must be an HTMLElement');
  fixtures.set(container, new Set());
  document.body.append(container);
  await Promise.resolve();
  return root as T;
};

export const fixtureAbortController = (root: HTMLElement): AbortController => {
  for (const [container, controllers] of fixtures) {
    if (!container.contains(root)) continue;
    const controller = new AbortController();
    controllers.add(controller);
    return controller;
  }
  throw new Error('fixtureのlifecycleに属するrootが必要です');
};

export const fixtureCleanup = (): void => {
  for (const [container, controllers] of fixtures) {
    for (const controller of controllers) controller.abort();
    container.remove();
  }
  fixtures.clear();
};

export const requireFixtureValue = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error('Required fixture value is missing');
  return value;
};
