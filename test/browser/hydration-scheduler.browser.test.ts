import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import { waitForCondition } from './harness/browser-test-utilities.js';
import { HydrationScheduler } from '../../src/client/hydration/scheduler.js';
import type {
  HydrationDiagnostics,
  HydrationRegistryEntry,
} from '../../src/client/hydration/types.js';

type TestHydrationRegistryEntry = Omit<HydrationRegistryEntry, 'kind' | 'profiles'> &
  Partial<Pick<HydrationRegistryEntry, 'kind' | 'profiles'>>;

const createTestRegistry = (
  entries: readonly (readonly [string, TestHydrationRegistryEntry])[],
): ReadonlyMap<string, HydrationRegistryEntry> =>
  new Map(
    entries.map(
      ([key, entry]) =>
        [
          key,
          {
            kind: 'custom-element',
            profiles: ['shell'],
            ...entry,
          },
        ] as const,
    ),
  );

const defineTestElement = (tag: string): void => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
};

const requireDiagnostics = (
  diagnostics: HydrationDiagnostics | null,
  message: string,
): HydrationDiagnostics => {
  if (diagnostics === null) {
    throw new Error(message);
  }

  return diagnostics;
};

const delayTask = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
};

const clickUntil = async (element: HTMLElement, isDone: () => boolean): Promise<void> => {
  const dispatchClick = (): void => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  };

  dispatchClick();
  const intervalId = window.setInterval(() => {
    if (!isDone()) {
      dispatchClick();
    }
  }, 16);

  try {
    await waitForCondition(isDone, 'interaction hydration が完了すること');
  } finally {
    window.clearInterval(intervalId);
  }
};

describe('HydrationScheduler', () => {
  it('root 自身が executable custom element scope root の場合も loader 経由で upgrade すること', async () => {
    const tag = 'x-hydration-root-scope';
    let loadCount = 0;

    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          kind: 'custom-element',
          loader: () => {
            loadCount += 1;
            defineTestElement(tag);
            return Promise.resolve();
          },
        },
      ],
    ]);

    // 本番の静的HTMLと同じHTML parser経路で、未定義Custom Elementを生成する。
    // LitのTemplateResult経路では、WebKitが要素にnull CustomElementRegistryを
    // 関連付けたまま保持し、後続のグローバルregistryによるupgrade対象外とする場合がある。
    const root = await fixture<HTMLElement>(`
      <x-hydration-root-scope
      data-hydration-scope="x-hydration-root-scope"
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
      ></x-hydration-root-scope>
      `);

    const scheduler = new HydrationScheduler(registry);
    const diagnostics = await scheduler.hydrateShell(root);

    expect(loadCount).to.equal(1);
    expect(root.constructor).not.to.equal(HTMLElement);
    expect(diagnostics.plannedCount).to.equal(1);
    expect(diagnostics.upgradedCount).to.equal(1);
  });

  it('root executable custom element は scope id が localName と異なっても loader 経由で upgrade すること', async () => {
    const tag = 'x-hydration-global-search-dialog';
    let loadCount = 0;

    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          kind: 'custom-element',
          loader: () => {
            loadCount += 1;
            defineTestElement(tag);
            return Promise.resolve();
          },
        },
      ],
    ]);

    // このテストも静的HTMLの生成経路を使用し、先行テストによる
    // グローバルCustomElementRegistry初期化の有無に依存させない。
    const root = await fixture<HTMLElement>(`
      <x-hydration-global-search-dialog
      data-hydration-scope="global-search"
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
      ></x-hydration-global-search-dialog>
      `);

    const scheduler = new HydrationScheduler(registry);
    const diagnostics = await scheduler.hydrateShell(root);

    expect(loadCount).to.equal(1);
    expect(root.constructor).not.to.equal(HTMLElement);
    expect(diagnostics.plannedCount).to.equal(1);
    expect(diagnostics.upgradedCount).to.equal(1);
  });

  it('descendant route-level self-scope component を hydrateContent 経由で upgrade できること', async () => {
    const tag = 'x-hydration-route-page';
    let loadCount = 0;

    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          kind: 'custom-element',
          loader: () => {
            loadCount += 1;
            defineTestElement(tag);
            return Promise.resolve();
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <${tag}
        data-hydration-scope="${tag}"
        data-hydration-capability="interactive"
        data-hydration-trigger="initial"
      ></${tag}>
    `;

    let diagnostics: HydrationDiagnostics | null = null;
    root.addEventListener('router-document-host:hydration-diagnostics', (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(root, { dispatchTarget: root });
    await waitForCondition(() => diagnostics !== null, 'content diagnostics が発火すること');

    const page = root.querySelector<HTMLElement>(tag);
    const currentDiagnostics = requireDiagnostics(
      diagnostics,
      'diagnostics が取得できませんでした',
    );

    expect(loadCount).to.equal(1);
    expect(page?.constructor).not.to.equal(HTMLElement);
    expect(currentDiagnostics.upgradedCount).to.equal(1);
  });

  it('custom-element key mismatch では loader を呼ばず upgrade-failed を記録すること', async () => {
    let loadCount = 0;
    const registry = createTestRegistry([
      [
        'x-hydration-keyed-card',
        {
          tag: 'x-hydration-keyed-card',
          kind: 'custom-element',
          loader: () => {
            loadCount += 1;
            defineTestElement('x-hydration-keyed-card');
            return Promise.resolve();
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="note-content">
        <div
          data-hydration-key="x-hydration-keyed-card"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></div>
      </section>
    `);

    const scheduler = new HydrationScheduler(registry);
    const diagnostics = await scheduler.hydrateShell(root);

    expect(loadCount).to.equal(0);
    expect(diagnostics.failedCount).to.equal(1);
    expect(diagnostics.issues).to.deep.equal([
      {
        code: 'upgrade-failed',
        trigger: 'initial',
        capability: 'interactive',
        count: 1,
      },
    ]);
  });

  it('custom-element key mismatch では planned preload でも loader を呼ばないこと', async () => {
    let loadCount = 0;
    const registry = createTestRegistry([
      [
        'x-hydration-keyed-preload',
        {
          tag: 'x-hydration-keyed-preload',
          kind: 'custom-element',
          loader: () => {
            loadCount += 1;
            defineTestElement('x-hydration-keyed-preload');
            return Promise.resolve();
          },
          preload: { when: 'planned' },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="note-content">
        <div
          data-hydration-key="x-hydration-keyed-preload"
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></div>
      </section>
    `);

    const scheduler = new HydrationScheduler(registry);
    const diagnostics = await scheduler.hydrateShell(root);

    expect(loadCount).to.equal(0);
    expect(diagnostics.failedCount).to.equal(1);
    expect(diagnostics.issues).to.deep.equal([
      {
        code: 'upgrade-failed',
        trigger: 'post-commit',
        capability: 'progressive',
        count: 1,
      },
    ]);
  });

  it('shell hydration が excludeSubtrees 配下の route content component を先に hydrate しないこと', async () => {
    const headerTag = 'x-hydration-shell-header';
    const pageTag = 'x-hydration-content-page';
    defineTestElement(headerTag);
    defineTestElement(pageTag);

    const steps: string[] = [];
    const registry = createTestRegistry([
      [
        headerTag,
        {
          tag: headerTag,
          loader: () => {
            steps.push('load:header');
            return Promise.resolve();
          },
        },
      ],
      [
        pageTag,
        {
          tag: pageTag,
          loader: () => {
            steps.push('load:page');
            return Promise.resolve();
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`
      <div data-hydration-scope="app-shell">
        <x-hydration-shell-header
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></x-hydration-shell-header>
        <main id="content">
          <x-hydration-content-page
            data-hydration-scope="x-hydration-content-page"
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></x-hydration-content-page>
        </main>
      </div>
    `);
    const content = root.querySelector<HTMLElement>('#content');
    if (!(content instanceof HTMLElement)) {
      throw new Error('content root が見つかりません');
    }

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateShell(root, { excludeSubtrees: [content] });

    expect(steps).to.deep.equal(['load:header']);
  });

  it('excludeSubtrees が second pass の newly planned preload item にも適用され snapshot として固定されること', async () => {
    const producerTag = 'x-hydration-exclude-producer';
    const preloadTag = 'x-hydration-excluded-preload';
    defineTestElement(producerTag);
    defineTestElement(preloadTag);

    let resolveProducer!: () => void;
    const producerGate = new Promise<void>((resolve) => {
      resolveProducer = resolve;
    });
    let loadPreloadCount = 0;

    const registry = createTestRegistry([
      [
        producerTag,
        {
          tag: producerTag,
          loader: () => Promise.resolve(),
          activate: async ({ root }) => {
            await producerGate;
            const target =
              root instanceof HTMLElement ? root.querySelector<HTMLElement>('#content') : null;
            if (!(target instanceof HTMLElement)) {
              throw new Error('content root が見つかりません');
            }
            target.insertAdjacentHTML(
              'beforeend',
              `
                <${preloadTag}
                  data-hydration-capability="interactive"
                  data-hydration-trigger="interaction"
                ></${preloadTag}>
              `,
            );
          },
        },
      ],
      [
        preloadTag,
        {
          tag: preloadTag,
          loader: () => {
            loadPreloadCount += 1;
            return Promise.resolve();
          },
          preload: { when: 'planned' },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`
      <div data-hydration-scope="app-shell">
        <x-hydration-exclude-producer
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></x-hydration-exclude-producer>
        <main id="content"></main>
      </div>
    `);
    const content = root.querySelector<HTMLElement>('#content');
    if (!(content instanceof HTMLElement)) {
      throw new Error('content root が見つかりません');
    }

    const excluded = [content];
    const scheduler = new HydrationScheduler(registry);
    const hydration = scheduler.hydrateShell(root, { excludeSubtrees: excluded });
    excluded.length = 0;
    resolveProducer();

    await hydration;
    expect(loadPreloadCount).to.equal(0);
  });

  it('plain DOM enhancer を data-hydration-key 経由で起動できること', async () => {
    const steps: string[] = [];

    const registry = createTestRegistry([
      [
        'code-group-enhancer',
        {
          tag: 'code-group-enhancer',
          kind: 'enhancer',
          loader: () => {
            steps.push('load:enhancer');
            return Promise.resolve();
          },
          activate: () => {
            steps.push('activate:enhancer');
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="note-content">
        <section
          data-code-group
          data-hydration-key="code-group-enhancer"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></section>
      </section>
    `;

    let diagnostics: HydrationDiagnostics | null = null;
    root.addEventListener('router-document-host:hydration-diagnostics', (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(root, { dispatchTarget: root });

    await waitForCondition(() => diagnostics !== null, 'enhancer diagnostics が発火すること');

    const currentDiagnostics = requireDiagnostics(
      diagnostics,
      'diagnostics が取得できませんでした',
    );

    expect(steps).to.deep.equal(['load:enhancer', 'activate:enhancer']);
    expect(currentDiagnostics.plannedCount).to.equal(1);
    expect(currentDiagnostics.upgradedCount).to.equal(0);
    expect(currentDiagnostics.activatedCount).to.equal(1);
  });

  it('initial の後に post-commit を実行し、visible は focusin で起動すること', async () => {
    const steps: string[] = [];
    const initialTag = 'x-hydration-initial';
    const postTag = 'x-hydration-post';
    const visibleTag = 'x-hydration-visible';

    defineTestElement(initialTag);
    defineTestElement(postTag);
    defineTestElement(visibleTag);

    const registry = createTestRegistry([
      [
        initialTag,
        {
          tag: initialTag,
          loader: () => {
            steps.push('load:initial');
            return Promise.resolve();
          },
          activate: () => {
            steps.push('activate:initial');
          },
        },
      ],
      [
        postTag,
        {
          tag: postTag,
          loader: () => {
            steps.push('load:post');
            return Promise.resolve();
          },
          activate: () => {
            steps.push('activate:post');
          },
        },
      ],
      [
        visibleTag,
        {
          tag: visibleTag,
          loader: () => {
            steps.push('load:visible');
            return Promise.resolve();
          },
          activate: () => {
            steps.push('activate:visible');
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="note-content">
        <${initialTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${initialTag}>
        <${postTag}
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></${postTag}>
        <${visibleTag}
          tabindex="0"
          data-hydration-capability="interactive"
          data-hydration-trigger="visible"
        ></${visibleTag}>
      </section>
    `;

    let diagnostics: HydrationDiagnostics | null = null;
    root.addEventListener('router-document-host:hydration-diagnostics', (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(root, { dispatchTarget: root });

    await waitForCondition(
      () =>
        steps.includes('activate:initial') &&
        steps.includes('activate:post') &&
        !steps.includes('activate:visible'),
      'initial と post-commit が先に完了すること',
    );

    expect(steps.indexOf('activate:initial')).to.be.lessThan(steps.indexOf('activate:post'));

    const visible = root.querySelector<HTMLElement>(visibleTag);
    visible?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));

    await waitForCondition(
      () => steps.includes('activate:visible') && diagnostics !== null,
      'visible が focusin で起動し diagnostics が発火すること',
    );

    const currentDiagnostics = requireDiagnostics(
      diagnostics,
      'diagnostics が取得できませんでした',
    );

    expect(currentDiagnostics.plannedCount).to.equal(3);
    expect(currentDiagnostics.activatedCount).to.equal(3);
    expect(currentDiagnostics.failedCount).to.equal(0);
  });

  it('planned preload が未解決でも initial hydration を阻害しないこと', async () => {
    const steps: string[] = [];
    const preloadTag = 'x-hydration-preload-target';
    const initialTag = 'x-hydration-initial-target';

    defineTestElement(preloadTag);
    defineTestElement(initialTag);

    let resolvePreload!: () => void;
    const preloadPromise = new Promise<void>((resolve) => {
      resolvePreload = resolve;
    });

    const registry = createTestRegistry([
      [
        preloadTag,
        {
          tag: preloadTag,
          loader: () => {
            steps.push('load:preload');
            return preloadPromise;
          },
          preload: { when: 'planned' },
        },
      ],
      [
        initialTag,
        {
          tag: initialTag,
          loader: () => {
            steps.push('load:initial');
            return Promise.resolve();
          },
          activate: () => {
            steps.push('activate:initial');
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${preloadTag}
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></${preloadTag}>
        <${initialTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${initialTag}>
      </section>
    `;

    const scheduler = new HydrationScheduler(registry);
    const hydration = scheduler.hydrateShell(root);

    await waitForCondition(() => steps.includes('load:preload'), 'planned preload が開始されること');
    await waitForCondition(
      () => steps.includes('activate:initial'),
      'preload 未解決でも initial activation が実行されること',
    );

    resolvePreload();
    await hydration;
  });

  it('preload.scopes が planned preload だけを session.kind で制御すること', async () => {
    const preloadTag = 'x-hydration-scoped-preload';
    const gateTag = 'x-hydration-scoped-gate';

    defineTestElement(preloadTag);
    defineTestElement(gateTag);

    let loadCount = 0;
    let gatePromise: Promise<void> = Promise.resolve();

    const registry = createTestRegistry([
      [
        preloadTag,
        {
          tag: preloadTag,
          loader: () => {
            loadCount += 1;
            return Promise.resolve();
          },
          preload: {
            when: 'planned',
            scopes: ['shell'],
          },
        },
      ],
      [
        gateTag,
        {
          tag: gateTag,
          loader: () => Promise.resolve(),
          activate: () => gatePromise,
        },
      ],
    ]);

    let resolveContentGate!: () => void;
    gatePromise = new Promise<void>((resolve) => {
      resolveContentGate = resolve;
    });

    const contentRoot = await fixture<HTMLElement>(html`<main></main>`);
    contentRoot.innerHTML = `
      <section data-hydration-scope="note-content">
        <${gateTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${gateTag}>
        <${preloadTag}
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></${preloadTag}>
      </section>
    `;

    const contentScheduler = new HydrationScheduler(registry);
    const contentHydration = contentScheduler.hydrateContent(contentRoot, {
      dispatchTarget: contentRoot,
    });

    await delayTask();
    expect(loadCount).to.equal(0);

    resolveContentGate();
    await contentHydration;
    expect(loadCount).to.equal(1);

    loadCount = 0;
    let resolveShellGate!: () => void;
    gatePromise = new Promise<void>((resolve) => {
      resolveShellGate = resolve;
    });

    const shellRoot = await fixture<HTMLElement>(html`<main></main>`);
    shellRoot.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${gateTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${gateTag}>
        <${preloadTag}
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></${preloadTag}>
      </section>
    `;

    const shellScheduler = new HydrationScheduler(registry);
    const shellHydration = shellScheduler.hydrateShell(shellRoot);

    await waitForCondition(() => loadCount === 1, 'shell session で planned preload が開始されること');

    resolveShellGate();
    await shellHydration;
    expect(loadCount).to.equal(1);
  });

  it('second pass で新規 planned になった interaction item も preload されること', async () => {
    const steps: string[] = [];
    const initialTag = 'x-hydration-second-pass-producer';
    const interactionTag = 'x-hydration-second-pass-interaction';

    defineTestElement(initialTag);
    defineTestElement(interactionTag);

    const registry = createTestRegistry([
      [
        initialTag,
        {
          tag: initialTag,
          loader: () => Promise.resolve(),
          activate: ({ root }) => {
            const scope =
              root instanceof HTMLElement
                ? root.querySelector('[data-hydration-scope="test-shell"]')
                : null;
            if (!(scope instanceof HTMLElement)) {
              throw new Error('test scope が見つかりません');
            }

            scope.insertAdjacentHTML(
              'beforeend',
              `
                <${interactionTag}
                  data-hydration-capability="interactive"
                  data-hydration-trigger="interaction"
                ></${interactionTag}>
              `,
            );
          },
        },
      ],
      [
        interactionTag,
        {
          tag: interactionTag,
          loader: () => {
            steps.push('load:interaction');
            return Promise.resolve();
          },
          preload: { when: 'planned' },
          activate: () => {
            steps.push('activate:interaction');
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${initialTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${initialTag}>
      </section>
    `;

    const scheduler = new HydrationScheduler(registry);
    const hydration = scheduler.hydrateShell(root);

    await waitForCondition(
      () => steps.includes('load:interaction'),
      'second pass planned item の preload が開始されること',
    );
    expect(steps).not.to.include('activate:interaction');

    const interaction = root.querySelector<HTMLElement>(interactionTag);
    if (!(interaction instanceof HTMLElement)) {
      throw new Error('interaction target が見つかりません');
    }

    await clickUntil(interaction, () => steps.includes('activate:interaction'));
    await hydration;
  });

  it('preload 対象が重複しても loader を1回だけ呼ぶこと', async () => {
    const tag = 'x-hydration-duplicate-preload';
    defineTestElement(tag);

    let loadCount = 0;
    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          loader: () => {
            loadCount += 1;
            return Promise.resolve();
          },
          preload: { when: 'planned' },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${tag}
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></${tag}>
        <${tag}
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></${tag}>
      </section>
    `;

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateShell(root);

    expect(loadCount).to.equal(1);
  });

  it('通常 hydration の loader 失敗後に同一 scheduler で再試行できること', async () => {
    const tag = 'x-hydration-load-retry';
    defineTestElement(tag);

    let loadCount = 0;
    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          loader: () => {
            loadCount += 1;
            if (loadCount === 1) {
              return Promise.reject(new Error('load failed'));
            }
            return Promise.resolve();
          },
        },
      ],
    ]);

    const scheduler = new HydrationScheduler(registry);
    const firstRoot = await fixture<HTMLElement>(html`<main></main>`);
    firstRoot.innerHTML = `
      <section data-hydration-scope="note-content">
        <${tag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${tag}>
      </section>
    `;

    let firstDiagnostics: HydrationDiagnostics | null = null;
    firstRoot.addEventListener('router-document-host:hydration-diagnostics', (event: Event) => {
      firstDiagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    await scheduler.hydrateContent(firstRoot, { dispatchTarget: firstRoot });
    await waitForCondition(() => firstDiagnostics !== null, '1回目の diagnostics が発火すること');

    const currentFirstDiagnostics = requireDiagnostics(
      firstDiagnostics,
      'firstDiagnostics が取得できませんでした',
    );
    expect(currentFirstDiagnostics.issues).to.deep.equal([
      {
        code: 'module-load-failed',
        trigger: 'initial',
        capability: 'interactive',
        count: 1,
      },
    ]);

    const secondRoot = await fixture<HTMLElement>(html`<main></main>`);
    secondRoot.innerHTML = `
      <section data-hydration-scope="note-content">
        <${tag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${tag}>
      </section>
    `;

    let secondDiagnostics: HydrationDiagnostics | null = null;
    secondRoot.addEventListener('router-document-host:hydration-diagnostics', (event: Event) => {
      secondDiagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    await scheduler.hydrateContent(secondRoot, { dispatchTarget: secondRoot });
    await waitForCondition(() => secondDiagnostics !== null, '2回目の diagnostics が発火すること');

    const currentSecondDiagnostics = requireDiagnostics(
      secondDiagnostics,
      'secondDiagnostics が取得できませんでした',
    );
    expect(loadCount).to.equal(2);
    expect(currentSecondDiagnostics.failedCount).to.equal(0);
  });

  it('planned preload 失敗後に通常 hydration で再試行できること', async () => {
    const preloadTag = 'x-hydration-preload-retry';
    const gateTag = 'x-hydration-preload-retry-gate';

    defineTestElement(preloadTag);
    defineTestElement(gateTag);

    let resolveGate!: () => void;
    const gatePromise = new Promise<void>((resolve) => {
      resolveGate = resolve;
    });

    let rejectFirstLoad!: (error: Error) => void;
    const firstLoadPromise = new Promise<void>((_resolve, reject) => {
      rejectFirstLoad = reject;
    });

    let preloadFailureObserved = false;
    const observedFirstLoadPromise = firstLoadPromise.catch((error) => {
      preloadFailureObserved = true;
      throw error;
    });

    let resolveSecondLoad!: () => void;
    const secondLoadPromise = new Promise<void>((resolve) => {
      resolveSecondLoad = resolve;
    });

    let loadCount = 0;
    const registry = createTestRegistry([
      [
        preloadTag,
        {
          tag: preloadTag,
          loader: () => {
            loadCount += 1;
            if (loadCount === 1) {
              return observedFirstLoadPromise;
            }
            return secondLoadPromise;
          },
          preload: { when: 'planned' },
        },
      ],
      [
        gateTag,
        {
          tag: gateTag,
          loader: () => Promise.resolve(),
          activate: () => gatePromise,
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${gateTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${gateTag}>
        <${preloadTag}
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></${preloadTag}>
      </section>
    `;

    const scheduler = new HydrationScheduler(registry);
    const hydration = scheduler.hydrateShell(root);

    await waitForCondition(() => loadCount === 1, 'planned preload が開始されること');
    rejectFirstLoad(new Error('preload failed'));
    await waitForCondition(() => preloadFailureObserved, 'preload 失敗が観測されること');

    resolveGate();
    await waitForCondition(() => loadCount === 2, 'post-commit hydration で再試行されること');

    resolveSecondLoad();
    await hydration;
  });

  it('planned preload の失敗が unhandledrejection を発生させないこと', async () => {
    const tag = 'x-hydration-preload-unhandled';
    const gateTag = 'x-hydration-preload-unhandled-gate';

    defineTestElement(tag);
    defineTestElement(gateTag);

    const unhandled: PromiseRejectionEvent[] = [];
    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      unhandled.push(event);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);

    try {
      let resolveGate!: () => void;
      const gatePromise = new Promise<void>((resolve) => {
        resolveGate = resolve;
      });

      let rejectPreload!: (error: Error) => void;
      const preloadPromise = new Promise<void>((_resolve, reject) => {
        rejectPreload = reject;
      });

      let resolveSecondLoad!: () => void;
      const secondLoadPromise = new Promise<void>((resolve) => {
        resolveSecondLoad = resolve;
      });

      let loadCount = 0;
      const registry = createTestRegistry([
        [
          tag,
          {
            tag,
            loader: () => {
              loadCount += 1;
              if (loadCount === 1) {
                return preloadPromise;
              }
              return secondLoadPromise;
            },
            preload: { when: 'planned' },
          },
        ],
        [
          gateTag,
          {
            tag: gateTag,
            loader: () => Promise.resolve(),
            activate: () => gatePromise,
          },
        ],
      ]);

      const root = await fixture<HTMLElement>(html`<main></main>`);
      root.innerHTML = `
        <section data-hydration-scope="test-shell">
          <${gateTag}
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></${gateTag}>
          <${tag}
            data-hydration-capability="progressive"
            data-hydration-trigger="post-commit"
          ></${tag}>
        </section>
      `;

      const scheduler = new HydrationScheduler(registry);
      const hydration = scheduler.hydrateShell(root);

      await waitForCondition(() => loadCount === 1, 'planned preload の loader が呼ばれること');
      rejectPreload(new Error('preload failed'));
      await delayTask();
      expect(unhandled).to.deep.equal([]);

      resolveGate();
      await waitForCondition(() => loadCount === 2, 'post-commit hydration で再試行されること');

      resolveSecondLoad();
      await hydration;
      expect(unhandled).to.deep.equal([]);
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    }
  });

  it('boot marker を scheduler の契約で解除すること', async () => {
    const tag = 'x-hydration-boot-marker';
    defineTestElement(tag);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${tag}
          data-test-boot-state="ssr"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${tag}>
      </section>
    `;

    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          loader: () => Promise.resolve(),
          bootMarker: {
            attribute: 'data-test-boot-state',
            value: 'ssr',
            remove: 'after-activation',
          },
        },
      ],
    ]);

    const element = root.querySelector<HTMLElement>(tag);
    if (!(element instanceof HTMLElement)) {
      throw new Error('boot marker target が見つかりません');
    }

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateShell(root);

    expect(element.getAttribute('data-test-boot-state')).to.equal(null);
  });

  it('boot marker の value が一致しない場合は解除しないこと', async () => {
    const tag = 'x-hydration-boot-marker-value';
    defineTestElement(tag);

    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          loader: () => Promise.resolve(),
          bootMarker: {
            attribute: 'data-test-boot-state',
            value: 'ssr',
            remove: 'after-activation',
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${tag}
          data-test-boot-state="client"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${tag}>
      </section>
    `;

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateShell(root);

    const element = root.querySelector<HTMLElement>(tag);
    expect(element?.getAttribute('data-test-boot-state')).to.equal('client');
  });

  it('activate が marker を変更しなくても scheduler が boot marker を解除すること', async () => {
    const tag = 'x-hydration-boot-marker-activate';
    defineTestElement(tag);

    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          loader: () => Promise.resolve(),
          activate: () => undefined,
          bootMarker: {
            attribute: 'data-test-boot-state',
            value: 'ssr',
            remove: 'after-activation',
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${tag}
          data-test-boot-state="ssr"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${tag}>
      </section>
    `;

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateShell(root);

    const element = root.querySelector<HTMLElement>(tag);
    expect(element?.getAttribute('data-test-boot-state')).to.equal(null);
  });

  it('未対応の boot marker remove 値では属性を解除しないこと', async () => {
    const tag = 'x-hydration-boot-marker-upgrade';
    defineTestElement(tag);

    const registry = createTestRegistry([
      [
        tag,
        {
          tag,
          loader: () => Promise.resolve(),
          bootMarker: {
            attribute: 'data-test-boot-state',
            value: 'ssr',
            remove: 'after-upgrade',
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="test-shell">
        <${tag}
          data-test-boot-state="ssr"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${tag}>
      </section>
    `;

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateShell(root);

    const element = root.querySelector<HTMLElement>(tag);
    expect(element?.getAttribute('data-test-boot-state')).to.equal('ssr');
  });

  it('新しい route が始まったら旧 session の diagnostics を commit しないこと', async () => {
    const visibleTag = 'x-hydration-abort-visible';
    const initialTag = 'x-hydration-abort-initial';

    defineTestElement(visibleTag);
    defineTestElement(initialTag);

    const registry = createTestRegistry([
      [
        visibleTag,
        {
          tag: visibleTag,
          loader: () => Promise.resolve(),
          activate: () => undefined,
        },
      ],
      [
        initialTag,
        {
          tag: initialTag,
          loader: () => Promise.resolve(),
          activate: () => undefined,
        },
      ],
    ]);

    const firstRoot = await fixture<HTMLElement>(html`<main></main>`);
    firstRoot.innerHTML = `
      <section data-hydration-scope="note-content">
        <${visibleTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="visible"
        ></${visibleTag}>
      </section>
    `;

    const secondRoot = await fixture<HTMLElement>(html`<main></main>`);
    secondRoot.innerHTML = `
      <section data-hydration-scope="note-content">
        <${initialTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${initialTag}>
      </section>
    `;

    let firstDiagnosticsCount = 0;
    let secondDiagnostics: HydrationDiagnostics | null = null;

    firstRoot.addEventListener('router-document-host:hydration-diagnostics', () => {
      firstDiagnosticsCount += 1;
    });
    secondRoot.addEventListener('router-document-host:hydration-diagnostics', (event: Event) => {
      secondDiagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(firstRoot, { dispatchTarget: firstRoot });
    await scheduler.hydrateContent(secondRoot, { dispatchTarget: secondRoot });

    await waitForCondition(() => secondDiagnostics !== null, '後続 session の diagnostics が発火すること');

    const currentSecondDiagnostics = requireDiagnostics(
      secondDiagnostics,
      'secondDiagnostics が取得できませんでした',
    );

    expect(firstDiagnosticsCount).to.equal(0);
    expect(currentSecondDiagnostics.plannedCount).to.equal(1);
    expect(currentSecondDiagnostics.failedCount).to.equal(0);
  });

  it('module load failure と activation failure を分離して記録すること', async () => {
    const loadFailTag = 'x-hydration-load-fail';
    const activateFailTag = 'x-hydration-activate-fail';

    defineTestElement(activateFailTag);

    const registry = createTestRegistry([
      [
        loadFailTag,
        {
          tag: loadFailTag,
          loader: () => Promise.reject(new Error('load failed')),
        },
      ],
      [
        activateFailTag,
        {
          tag: activateFailTag,
          loader: () => Promise.resolve(),
          activate: () => {
            throw new Error('activate failed');
          },
        },
      ],
    ]);

    const root = await fixture<HTMLElement>(html`<main></main>`);
    root.innerHTML = `
      <section data-hydration-scope="note-content">
        <${loadFailTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${loadFailTag}>
        <${activateFailTag}
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></${activateFailTag}>
      </section>
    `;

    let diagnostics: HydrationDiagnostics | null = null;
    root.addEventListener('router-document-host:hydration-diagnostics', (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(root, { dispatchTarget: root });

    await waitForCondition(() => diagnostics !== null, 'failure diagnostics が発火すること');

    const currentDiagnostics = requireDiagnostics(
      diagnostics,
      'diagnostics が取得できませんでした',
    );

    expect(currentDiagnostics.failedCount).to.equal(2);
    expect(currentDiagnostics.issues).to.deep.equal([
      {
        code: 'activation-failed',
        trigger: 'initial',
        capability: 'interactive',
        count: 1,
      },
      {
        code: 'module-load-failed',
        trigger: 'initial',
        capability: 'interactive',
        count: 1,
      },
    ]);
  });
});
