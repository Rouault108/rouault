import { expect } from '@open-wc/testing';
import {
  parseAndValidateStaticHeaderHtml,
  prepareStaticHeaderMutation,
} from '../../src/components/app/shell/static-header-shell-mutation.js';
import {
  STATIC_HEADER_CONTRACT_ACCEPTED_HTML,
  STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML,
  STATIC_HEADER_CONTRACT_REJECTED_CASES,
} from '../fixtures/static-header-contract-cases.js';

const headerHtml = (label = 'current'): string =>
  STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML.replace('>search</a>', `>${label}</a>`);

describe('static-header-shell-mutation', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('単一 static header root だけを受け付けること', () => {
    expect(() =>
      parseAndValidateStaticHeaderHtml(`${headerHtml()}<div></div>`, document),
    ).to.throw();
    expect(() => parseAndValidateStaticHeaderHtml(`text${headerHtml()}`, document)).to.throw();
    expect(() =>
      parseAndValidateStaticHeaderHtml('<layout-header></layout-header>', document),
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
    document.body.innerHTML = `<div id="app">${headerHtml('previous')}</div>`;
    const mutation = prepareStaticHeaderMutation(headerHtml('next'));
    mutation.commit();
    expect(document.querySelector('header')?.textContent).to.contain('next');
    mutation.rollback();
    expect(document.querySelector('header')?.textContent).to.contain('previous');
  });
});
