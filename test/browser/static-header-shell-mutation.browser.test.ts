import { createStaticHeaderMenuController } from '../../src/client/post-hydrate/static-header-menu-controller.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseAndValidateStaticHeaderHtml,
  prepareStaticHeaderMutation,
} from '../../src/components/app/shell/static-header-shell-mutation.js';
import {
  prepareFooterCopyrightMutation,
  readLayoutFooterCopyrightText,
} from '../../src/components/app/shell/footer-shell-mutation.js';
import {
  STATIC_HEADER_CONTRACT_ACCEPTED_HTML,
  STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML,
  STATIC_HEADER_CONTRACT_REJECTED_CASES,
} from '../fixtures/static-header-contract-cases.js';

const headerHtml = (label = 'current'): string =>
  STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML.replace(
    '</div>\n    </div>\n  </header>',
    `<span>${label}</span>\n      </div>\n    </div>\n  </header>`,
  );

describe('static-header-shell-mutation', () => {
  it('閉じたmenuのscroll同期は同値のARIA mutationを発生させない', async () => {
    document.body.innerHTML = STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML;
    document.querySelector('header')?.insertAdjacentHTML(
      'beforeend',
      '<details data-header-menu><summary id="test-menu-trigger" data-header-menu-trigger aria-expanded="false" aria-controls="test-menu-panel">Menu</summary><nav id="test-menu-panel" data-header-menu-panel aria-labelledby="test-menu-trigger"></nav></details>',
    );
    const controller = createStaticHeaderMenuController();
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((mutations) => records.push(...mutations));
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    try {
      window.dispatchEvent(new Event('scroll'));
      document.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
      records.push(...observer.takeRecords());
      expect(records).toEqual([]);
      const menu = document.querySelector('details[data-header-menu]');
      if (!(menu instanceof HTMLDetailsElement)) throw new Error('menu');
      menu.open = true;
      window.dispatchEvent(new Event('scroll'));
      expect(menu.open).toBe(false);
      expect(menu.querySelector('summary')?.getAttribute('aria-expanded')).toBe('false');
    } finally {
      observer.disconnect();
      controller.dispose();
    }
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('単一 static header root だけを受け付けること', () => {
    expect(() =>
      parseAndValidateStaticHeaderHtml(`${headerHtml()}<div></div>`, document),
    ).to.throw();
    expect(() => parseAndValidateStaticHeaderHtml(`text${headerHtml()}`, document)).to.throw();
    expect(() =>
      parseAndValidateStaticHeaderHtml(`<${'layout-header'}></${'layout-header'}>`, document),
    ).to.throw();
  });

  it('parse5 validator と共有する fixture を同じ判定で扱うこと', () => {
    expect(() =>
      parseAndValidateStaticHeaderHtml(STATIC_HEADER_CONTRACT_ACCEPTED_HTML, document),
    ).not.to.throw();
    expect(() =>
      parseAndValidateStaticHeaderHtml(STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML, document),
    ).not.to.throw();
    for (const { html } of STATIC_HEADER_CONTRACT_REJECTED_CASES) {
      expect(() => parseAndValidateStaticHeaderHtml(html, document)).to.throw();
    }
  });

  it('current header 欠損は prepare 時に拒否すること', () => {
    expect(() => prepareStaticHeaderMutation(headerHtml('next'))).to.throw(
      'current header[data-layout-header] is required',
    );
  });

  it('commit と rollback は検証済み outerHTML で header を置換すること', () => {
    document.body.innerHTML = `<div data-test-shell>${headerHtml('previous')}</div>`;
    const mutation = prepareStaticHeaderMutation(headerHtml('next'));
    mutation.commit();
    expect(document.querySelector('header')?.textContent).to.contain('next');
    mutation.rollback();
    expect(document.querySelector('header')?.textContent).to.contain('previous');
  });

  it('footer copyright の commit と rollback を同じ静的shell上で行うこと', () => {
    document.body.innerHTML =
      '<footer data-layout-footer><p class="ui-footer__copyright">previous</p></footer>';
    const mutation = prepareFooterCopyrightMutation('next');
    mutation.commit();
    expect(readLayoutFooterCopyrightText()).to.equal('next');
    mutation.rollback();
    expect(readLayoutFooterCopyrightText()).to.equal('previous');
    expect(() => prepareFooterCopyrightMutation('   ')).to.throw(
      'shell.footerCopyrightText must be non-empty',
    );
  });
});
