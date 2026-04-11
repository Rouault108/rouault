import { expect } from '@open-wc/testing';
import type { Heading } from '../../src/components/ui/toc/toc.js';
import { TocActiveTracker } from '../../src/toc/toc-active-tracker.js';

const waitForRefresh = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await Promise.resolve();
};

describe('TocActiveTracker', () => {
  it('tabs の hydration 後に selected-value と panel visibility の変化を再同期すること', async () => {
    document.body.innerHTML = `
      <article id="content-root">
        <ui-tabs data-toc-scope="toc-scope-1" selected-value="javascript">
          <button slot="tab" value="javascript">JavaScript</button>
          <section slot="panel" role="tabpanel">
            <h3 id="js-heading">JavaScript</h3>
          </section>
          <button slot="tab" value="rust">Rust</button>
          <section slot="panel" role="tabpanel" aria-hidden="true" hidden>
            <h3 id="rust-heading">Rust</h3>
          </section>
        </ui-tabs>
      </article>
    `;

    const headings: Heading[] = [
      {
        id: 'js-heading',
        text: 'JavaScript',
        level: 3,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'javascript' }],
      },
      {
        id: 'rust-heading',
        text: 'Rust',
        level: 3,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'rust' }],
      },
    ];

    const snapshots: string[][] = [];
    const tracker = new TocActiveTracker({
      contentRootId: 'content-root',
      headings,
      capabilities: {
        activeTracking: false,
        dynamicScopes: true,
        mobileSummary: false,
      },
      getActiveId: () => '',
      onVisibleHeadingsChange: (visibleHeadings) => {
        snapshots.push(visibleHeadings.map((heading) => heading.id));
      },
      onActiveIdChange: () => undefined,
    });

    tracker.start();
    expect(snapshots.at(-1)).to.deep.equal(['js-heading']);

    const tabs = document.querySelector('ui-tabs');
    const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');
    if (!(tabs instanceof HTMLElement) || panels.length !== 2) {
      throw new Error('tabs fixture の構築に失敗しました。');
    }

    tabs.setAttribute('selected-value', 'rust');
    panels[0]?.setAttribute('aria-hidden', 'true');
    panels[0]?.setAttribute('hidden', '');
    panels[1]?.removeAttribute('aria-hidden');
    panels[1]?.removeAttribute('hidden');
    tabs.setAttribute('hydrated', '');

    await waitForRefresh();

    expect(snapshots.at(-1)).to.deep.equal(['rust-heading']);

    tracker.destroy();
  });

  it('スクロール位置に応じて現在見出しを幾何学的に再計算すること', async () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="section-1">Section 1</h2>
        <h2 id="section-2">Section 2</h2>
        <h2 id="section-3">Section 3</h2>
      </article>
    `;

    document.documentElement.style.setProperty('--header-height', '48px');

    const headings: Heading[] = [
      { id: 'section-1', text: 'Section 1', level: 2 },
      { id: 'section-2', text: 'Section 2', level: 2 },
      { id: 'section-3', text: 'Section 3', level: 2 },
    ];

    const topById = new Map<string, number>([
      ['section-1', 16],
      ['section-2', 220],
      ['section-3', 520],
    ]);

    for (const heading of headings) {
      const element = document.getElementById(heading.id);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`${heading.id} の fixture 構築に失敗しました。`);
      }

      Object.defineProperty(element, 'getBoundingClientRect', {
        configurable: true,
        value: () => {
          const top = topById.get(heading.id) ?? 0;
          return {
            x: 0,
            y: top,
            top,
            left: 0,
            right: 800,
            bottom: top + 32,
            width: 800,
            height: 32,
            toJSON: () => undefined,
          } satisfies DOMRect;
        },
      });
    }

    let activeId = '';
    const snapshots: string[] = [];
    const tracker = new TocActiveTracker({
      contentRootId: 'content-root',
      headings,
      capabilities: {
        activeTracking: true,
        dynamicScopes: false,
        mobileSummary: false,
      },
      getActiveId: () => activeId,
      onVisibleHeadingsChange: () => undefined,
      onActiveIdChange: (id) => {
        activeId = id;
        snapshots.push(id);
      },
    });

    tracker.start();
    await waitForRefresh();
    expect(activeId).to.equal('section-1');

    topById.set('section-1', -120);
    topById.set('section-2', 40);
    topById.set('section-3', 320);
    window.dispatchEvent(new Event('scroll'));
    await waitForRefresh();
    expect(activeId).to.equal('section-2');

    topById.set('section-1', -360);
    topById.set('section-2', -96);
    topById.set('section-3', 24);
    window.dispatchEvent(new Event('scroll'));
    await waitForRefresh();
    expect(activeId).to.equal('section-3');

    expect(snapshots).to.deep.equal(['section-1', 'section-2', 'section-3']);

    tracker.destroy();
    document.documentElement.style.removeProperty('--header-height');
  });

  it('静的 TOC では mutation 中の一時的な heading 不在で visible headings を空に戻さないこと', async () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="section-1">Section 1</h2>
        <h2 id="section-2">Section 2</h2>
      </article>
    `;

    const contentRoot = document.getElementById('content-root');
    if (!(contentRoot instanceof HTMLElement)) {
      throw new Error('content-root の fixture 構築に失敗しました。');
    }

    const headings: Heading[] = [
      { id: 'section-1', text: 'Section 1', level: 2 },
      { id: 'section-2', text: 'Section 2', level: 2 },
    ];

    const snapshots: string[][] = [];
    const tracker = new TocActiveTracker({
      contentRootId: 'content-root',
      headings,
      capabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobileSummary: false,
      },
      getActiveId: () => 'section-1',
      onVisibleHeadingsChange: (visibleHeadings) => {
        snapshots.push(visibleHeadings.map((heading) => heading.id));
      },
      onActiveIdChange: () => undefined,
    });

    tracker.start();
    expect(snapshots.at(-1)).to.deep.equal(['section-1', 'section-2']);

    contentRoot.replaceChildren(document.createElement('p'));
    await waitForRefresh();

    expect(snapshots.at(-1)).to.deep.equal(['section-1', 'section-2']);

    const restoredFirstHeading = document.createElement('h2');
    restoredFirstHeading.id = 'section-1';
    restoredFirstHeading.textContent = 'Section 1';
    const restoredSecondHeading = document.createElement('h2');
    restoredSecondHeading.id = 'section-2';
    restoredSecondHeading.textContent = 'Section 2';
    contentRoot.replaceChildren(restoredFirstHeading, restoredSecondHeading);

    await waitForRefresh();
    expect(snapshots.at(-1)).to.deep.equal(['section-1', 'section-2']);

    tracker.destroy();
  });
});
