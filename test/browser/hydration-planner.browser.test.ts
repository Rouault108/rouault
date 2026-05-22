import { expect, fixture, html } from '@open-wc/testing';
import { planHydration } from '../../src/client/hydration/planner.js';

describe('planHydration', () => {
  it('root 配下の keyed enhancer を direct item として計画すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="search-page">
        <div
          data-hydration-key="search-page-enhancer"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></div>
      </section>
    `);

    const plans = planHydration(root);

    expect(plans).to.have.length(1);
    expect(plans[0]?.scope).to.equal('search-page');
    expect(plans[0]?.items.map((item) => [item.tag, item.scope])).to.deep.equal([
      ['search-page-enhancer', 'search-page'],
    ]);
  });

  it('root 配下の global search enhancer は scope id が key と異なっても採用すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="global-search">
        <dialog
          data-hydration-key="search-dialog-enhancer"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></dialog>
      </section>
    `);

    const plans = planHydration(root);

    expect(plans).to.have.length(1);
    expect(plans[0]?.scope).to.equal('global-search');
    expect(plans[0]?.items.map((item) => [item.tag, item.scope])).to.deep.equal([
      ['search-dialog-enhancer', 'global-search'],
    ]);
  });

  it('root 自身が non-executable structural scope の場合は配下 item を収集すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="app-shell">
        <layout-header
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></layout-header>
      </section>
    `);

    const plans = planHydration(root);

    expect(plans.map((plan) => plan.scope)).to.deep.equal(['app-shell']);
    expect(plans[0]?.items.map((item) => item.tag)).to.deep.equal(['layout-header']);
  });

  it('root 自身が executable non-custom scope の場合は空配列を返すこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <section
        data-hydration-scope="malformed"
        data-hydration-capability="interactive"
        data-hydration-trigger="initial"
      ></section>
    `);

    const plans = planHydration(root);

    expect(plans).to.deep.equal([]);
  });

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
              data-hydration-scope="note-content"
              data-hydration-marker="toc-source"
              data-hydration-owner-id="toc-owner-fixture"
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
    expect(plans[2]?.items[0]?.marker).to.deep.equal({
      marker: 'toc-source',
      ownerId: 'toc-owner-fixture',
      scopeId: 'note-content',
    });
  });

  it('descendant の route-level self-scope component を独立 scope として計画すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <main data-hydration-scope="app-shell">
        <section
          data-hydration-scope="search-page"
        >
          <div
            data-hydration-key="search-page-enhancer"
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></div>
        </section>
        <section
          data-hydration-scope="corpus-page"
        >
          <div
            data-hydration-key="corpus-page-static"
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></div>
        </section>
        <section
          data-hydration-scope="corpora-overview-page"
        >
          <div
            data-hydration-key="corpora-overview-static"
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></div>
        </section>
      </main>
    `);

    const plans = planHydration(root);

    expect(plans.map((plan) => plan.scope)).to.deep.equal([
      'app-shell',
      'search-page',
      'corpus-page',
      'corpora-overview-page',
    ]);
    expect(plans[0]?.items).to.have.length(0);
    expect(plans.slice(1).map((plan) => plan.items.map((item) => item.tag))).to.deep.equal([
      ['search-page-enhancer'],
      ['corpus-page-static'],
      ['corpora-overview-static'],
    ]);
  });

  it('layout-toc-controller は同一 scope の hosted item として計画し reserved は除外すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <article data-hydration-scope="note-content">
        <layout-toc-controller
          data-hydration-scope="note-content"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></layout-toc-controller>
        <layout-toc-controller
          data-hydration-scope="note-content"
          data-toc-trigger-reserved="true"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></layout-toc-controller>
      </article>
    `);

    const plans = planHydration(root);

    expect(plans).to.have.length(1);
    expect(plans[0]?.items.map((item) => item.tag)).to.deep.equal(['layout-toc-controller']);
  });

  it('declared scope が外側 scope と異なる executable item は暗黙収集しないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <article data-hydration-scope="outer">
        <pre
          data-hydration-scope="inner-like"
          data-hydration-key="code-block-enhancer"
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></pre>
        <div
          data-hydration-scope="inner-like"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></div>
      </article>
    `);

    const plans = planHydration(root);

    expect(plans).to.have.length(1);
    expect(plans[0]?.items).to.have.length(0);
  });

  it('同一 scope id を持つ keyed enhancer item は hosted item として収集すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <article data-hydration-scope="note-content">
        <pre
          data-hydration-scope="note-content"
          data-hydration-key="code-block-enhancer"
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></pre>
      </article>
    `);

    const plans = planHydration(root);

    expect(plans.map((plan) => plan.scope)).to.deep.equal(['note-content']);
    expect(plans[0]?.items.map((item) => item.tag)).to.deep.equal(['code-block-enhancer']);
  });

  it('data-hydration-key を持つ executable element は独立 scope root にしないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <article data-hydration-scope="note-content">
        <pre
          data-hydration-scope="note-content"
          data-hydration-key="code-block-enhancer"
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></pre>
      </article>
    `);

    const plans = planHydration(root);

    expect(plans.map((plan) => plan.scope)).to.deep.equal(['note-content']);
  });

  it('空の data-hydration-key は key なしとして扱い scope 配下 item にしないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="search-page">
        <div
          data-hydration-key=" "
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></div>
      </section>
    `);

    const plans = planHydration(root);

    expect(plans).to.have.length(1);
    expect(plans[0]?.items).to.have.length(0);
  });

  it('空の data-hydration-scope と marker-only source script は scope root として採用しないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <main>
        <section
          data-hydration-scope=" "
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></section>
        <script
          type="application/json"
          data-hydration-scope="note-content"
          data-hydration-marker="toc-source"
        >[]</script>
      </main>
    `);

    const plans = planHydration(root);

    expect(plans).to.deep.equal([]);
  });

  it('空 scope の executable custom element と keyed enhancer item は親 scope の item として収集しないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <article data-hydration-scope="note-content">
        <layout-toc-controller
          data-hydration-scope=" "
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></layout-toc-controller>
        <pre
          data-hydration-scope=" "
          data-hydration-key="code-block-enhancer"
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ></pre>
      </article>
    `);

    const plans = planHydration(root);

    expect(plans.map((plan) => plan.scope)).to.deep.equal(['note-content']);
    expect(plans[0]?.items).to.have.length(0);
  });

  it('executable scope root 配下の通常 nested scope を重複収集しないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <section
        data-hydration-scope="search-page"
      >
        <div
          data-hydration-key="search-page-enhancer"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></div>
        <section data-hydration-scope="nested">
          <layout-sidebar
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></layout-sidebar>
        </section>
      </section>
    `);

    const plans = planHydration(root);

    expect(plans.map((plan) => plan.scope)).to.deep.equal(['search-page', 'nested']);
    expect(plans[0]?.items.map((item) => item.tag)).to.deep.equal(['search-page-enhancer']);
    expect(plans[1]?.items.map((item) => item.tag)).to.deep.equal(['layout-sidebar']);
  });

  it('excludeSubtrees 配下の scope root と item を計画しないこと', async () => {
    const root = await fixture<HTMLElement>(html`
      <main data-hydration-scope="app-shell">
        <layout-header
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></layout-header>
        <article data-hydration-scope="note-content">
          <section data-hydration-scope="search-page">
            <div
              data-hydration-key="search-page-enhancer"
              data-hydration-capability="interactive"
              data-hydration-trigger="initial"
            ></div>
          </section>
        </article>
      </main>
    `);
    const content = root.querySelector<HTMLElement>('[data-hydration-scope="note-content"]');
    if (!(content instanceof HTMLElement)) {
      throw new Error('content scope が見つかりません');
    }

    const plans = planHydration(root, { excludeSubtrees: [content] });

    expect(plans.map((plan) => plan.scope)).to.deep.equal(['app-shell']);
    expect(plans[0]?.items.map((item) => item.tag)).to.deep.equal(['layout-header']);
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
