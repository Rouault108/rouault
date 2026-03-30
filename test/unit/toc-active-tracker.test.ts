import { expect } from '@open-wc/testing';
import type { Heading } from '../../src/components/ui/toc/toc.js';
import { TocActiveTracker } from '../../src/lib/toc/toc-active-tracker.js';

const waitForRefresh = async (): Promise<void> => {
  await Promise.resolve();
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
});
