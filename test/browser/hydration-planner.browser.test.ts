import { expect, fixture, html } from '@open-wc/testing';
import { planHydration } from '../../src/client/hydration/planner.js';

describe('planHydration', () => {
  it('入れ子の scope で directive を重複収集しないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <main>
        <section data-hydration-scope="note-shell">
          <aside data-hydration-scope="note-sidebar">
            <layout-sidebar
              data-hydration-capability="interactive"
              data-hydration-trigger="initial"
            ></layout-sidebar>
          </aside>
          <article data-hydration-scope="note-content">
            <pre
              data-hydration-key="code-block-enhancer"
              data-hydration-capability="progressive"
              data-hydration-trigger="post-commit"
            ></pre>
          </article>
        </section>
      </main>
    `);

    const plans = planHydration(root);

    expect(plans.map((plan) => plan.scope)).to.deep.equal([
      'note-shell',
      'note-sidebar',
      'note-content',
    ]);
    expect(plans[0]?.items).to.have.length(0);
    expect(plans[1]?.items.map((item) => item.tag)).to.deep.equal(['layout-sidebar']);
    expect(plans[2]?.items.map((item) => item.tag)).to.deep.equal(['code-block-enhancer']);
  });

  it('scope がない root では fallback せず空配列を返すこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <main>
        <section class="plain-page"></section>
      </main>
    `);

    const plans = planHydration(root);

    expect(plans).to.deep.equal([]);
  });
});