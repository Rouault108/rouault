import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/layout/layout-footer.js';
import type { LayoutFooter } from '../../src/components/layout/layout-footer.js';

const countDirectFooters = (host: HTMLElement): number =>
  Array.from(host.children).filter(
    (child) => child instanceof HTMLElement && child.matches('footer.ui-footer'),
  ).length;

describe('LayoutFooter', () => {
  it('SSR 済みの footer を再描画で二重化しないこと', async () => {
    const root = await fixture<HTMLElement>(html`<div></div>`);
    const element = document.createElement('layout-footer') as LayoutFooter;

    element.setAttribute('build-label', 'build 1c50eeb');
    element.innerHTML = `
      <!--lit-part abc-->
      <!--lit-node 0-->
      <footer class="ui-footer">
        <div class="ui-footer__inner"></div>
      </footer>
      <!--/lit-part-->
    `;

    root.append(element);
    await element.updateComplete;

    expect(countDirectFooters(element)).to.equal(1);
  });

  it('SSR がない場合はクライアント描画で footer を補うこと', async () => {
    const element = await fixture<LayoutFooter>(html`<layout-footer></layout-footer>`);
    await element.updateComplete;

    expect(countDirectFooters(element)).to.equal(1);
  });
});