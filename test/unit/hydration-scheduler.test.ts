import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { HydrationScheduler } from '../../src/client/hydration/scheduler.js';
import type { HydrationRegistryEntry } from '../../src/client/hydration/registry.js';
import type { HydrationDiagnostics } from '../../src/client/hydration/types.js';

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

describe('HydrationScheduler', () => {
  it('plain DOM enhancer を data-hydration-key 経由で起動できること', async () => {
    const steps: string[] = [];

    const registry = new Map<string, HydrationRegistryEntry>([
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
    root.addEventListener('app-router:hydration-diagnostics', (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(root, { allowFallback: false, dispatchTarget: root });

    await waitUntil(() => diagnostics !== null, 'enhancer diagnostics が発火すること');

    const currentDiagnostics = requireDiagnostics(diagnostics, 'diagnostics が取得できませんでした');

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

    const registry = new Map<string, HydrationRegistryEntry>([
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
    root.addEventListener('app-router:hydration-diagnostics', (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(root, { allowFallback: false, dispatchTarget: root });

    await waitUntil(
      () =>
        steps.includes('activate:initial') &&
        steps.includes('activate:post') &&
        !steps.includes('activate:visible'),
      'initial と post-commit が先に完了すること',
    );

    expect(steps.indexOf('activate:initial')).to.be.lessThan(steps.indexOf('activate:post'));

    const visible = root.querySelector<HTMLElement>(visibleTag);
    visible?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));

    await waitUntil(
      () => steps.includes('activate:visible') && diagnostics !== null,
      'visible が focusin で起動し diagnostics が発火すること',
    );

    const currentDiagnostics = requireDiagnostics(diagnostics, 'diagnostics が取得できませんでした');

    expect(currentDiagnostics.plannedCount).to.equal(3);
    expect(currentDiagnostics.activatedCount).to.equal(3);
    expect(currentDiagnostics.failedCount).to.equal(0);
  });

  it('新しい route が始まったら旧 session の diagnostics を commit しないこと', async () => {
    const visibleTag = 'x-hydration-abort-visible';
    const initialTag = 'x-hydration-abort-initial';

    defineTestElement(visibleTag);
    defineTestElement(initialTag);

    const registry = new Map<string, HydrationRegistryEntry>([
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

    firstRoot.addEventListener('app-router:hydration-diagnostics', () => {
      firstDiagnosticsCount += 1;
    });
    secondRoot.addEventListener('app-router:hydration-diagnostics', (event: Event) => {
      secondDiagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(firstRoot, { allowFallback: false, dispatchTarget: firstRoot });
    await scheduler.hydrateContent(secondRoot, { allowFallback: false, dispatchTarget: secondRoot });

    await waitUntil(
      () => secondDiagnostics !== null,
      '後続 session の diagnostics が発火すること',
    );

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

    const registry = new Map<string, HydrationRegistryEntry>([
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
    root.addEventListener('app-router:hydration-diagnostics', (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    });

    const scheduler = new HydrationScheduler(registry);
    await scheduler.hydrateContent(root, { allowFallback: false, dispatchTarget: root });

    await waitUntil(
      () => diagnostics !== null,
      'failure diagnostics が発火すること',
    );

    const currentDiagnostics = requireDiagnostics(diagnostics, 'diagnostics が取得できませんでした');

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
