import { expect } from '@open-wc/testing';

import { enhanceCodeGroups } from '../../src/client/post-hydrate/code-group-enhancer.js';

const dispatchKey = (target: Element, key: string): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
    }),
  );
};

const expectElement = <T extends Element>(element: T | null | undefined, label: string): T => {
  expect(element, label).to.not.equal(null);
  expect(element, label).to.not.equal(undefined);
  return element as T;
};

describe('code-group-enhancer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('SSR stack HTML を tabs UI へ昇格し、active state と group copy target を同期すること', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      <section data-code-group data-code-group-id="example" data-code-group-label="比較" data-code-group-selected="valid">
        <div class="code-group-header">
          <div class="code-group-tablist">
            <button type="button" data-code-group-tab data-code-group-key="valid">Valid</button>
            <button type="button" data-code-group-tab data-code-group-key="invalid">Invalid</button>
            <button type="button" data-code-group-tab data-code-group-key="empty">Empty</button>
          </div>
          <span data-copy-control>
            <button
              type="button"
              data-copy-button
              data-code-group-copy
              data-copy-target-id="source-a"
              data-copy-state="copied"
              aria-describedby="copy-status"
            >copy</button>
            <span id="copy-status" data-copy-status>コピーしました</span>
          </span>
        </div>
        <section data-code-group-panel="valid" data-code-group-panel-label="正しい例" data-code-copy-source-id="source-a">
          <template id="source-a" data-code-copy-source>const valid = true;</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block data-code-language="ts"><code>const valid = true;</code></pre>
          </figure>
        </section>
        <section data-code-group-panel="invalid" data-code-group-panel-label="誤り例" data-code-copy-source-id="source-b">
          <template id="source-b" data-code-copy-source>const invalid = true;</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block data-code-language="ts" data-code-copy-label="Bad sample"><code>const invalid = true;</code></pre>
          </figure>
        </section>
        <section data-code-group-panel="empty" data-code-group-panel-label="空">
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block data-code-language="ts"><code></code></pre>
          </figure>
        </section>
      </section>
    `;
    document.body.append(root);

    enhanceCodeGroups(root);
    enhanceCodeGroups(root);

    const group = root.querySelector<HTMLElement>('[data-code-group]');
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-code-group-tab]'));
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-code-group-panel]'));
    const copyButton = root.querySelector<HTMLButtonElement>('[data-code-group-copy]');
    const status = root.querySelector<HTMLElement>('[data-copy-status]');
    const firstTab = expectElement(tabs[0], 'first tab');
    const thirdTab = expectElement(tabs[2], 'third tab');
    const copyControl = expectElement(copyButton, 'copy button');
    const copyStatus = expectElement(status, 'copy status');
    const tablist = expectElement(
      root.querySelector<HTMLElement>('.code-group-tablist'),
      'tablist',
    );

    expect(group?.dataset['codeGroupEnhanced']).to.equal('true');
    expect(tablist.getAttribute('role')).to.equal('tablist');
    expect(tablist.getAttribute('aria-label')).to.equal('比較');
    expect(tabs.every((tab) => tab.dataset['codeGroupTabBound'] === 'true')).to.equal(true);
    expect(tabs.some((tab) => tab.hasAttribute('data-bound'))).to.equal(false);
    expect(tabs[0]?.getAttribute('role')).to.equal('tab');
    expect(tabs[0]?.getAttribute('aria-selected')).to.equal('true');
    expect(tabs[0]?.dataset['codeGroupTabActive']).to.equal('true');
    expect(tabs[0]?.tabIndex).to.equal(0);
    expect(panels[0]?.getAttribute('role')).to.equal('tabpanel');
    expect(tabs[0]?.getAttribute('aria-controls')).to.equal(panels[0]?.id);
    expect(panels[0]?.getAttribute('aria-labelledby')).to.equal(tabs[0]?.id);
    expect(panels[0]?.dataset['codeGroupPanelActive']).to.equal('true');
    expect(panels[1]?.dataset['codeGroupPanelActive']).to.equal('false');
    expect(panels[1]?.hasAttribute('hidden')).to.equal(false);
    expect(panels[1]?.hasAttribute('aria-hidden')).to.equal(false);
    expect(copyButton?.dataset['copyTargetId']).to.equal('source-a');
    expect(copyButton?.dataset['copyState']).to.equal('copied');
    expect(status?.textContent).to.equal('コピーしました');

    tabs[1]?.click();

    expect(group?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(tabs[0]?.getAttribute('aria-selected')).to.equal('false');
    expect(tabs[0]?.dataset['codeGroupTabActive']).to.equal('false');
    expect(tabs[0]?.tabIndex).to.equal(-1);
    expect(tabs[1]?.getAttribute('aria-selected')).to.equal('true');
    expect(tabs[1]?.dataset['codeGroupTabActive']).to.equal('true');
    expect(tabs[1]?.tabIndex).to.equal(0);
    expect(panels[0]?.dataset['codeGroupPanelActive']).to.equal('false');
    expect(panels[1]?.dataset['codeGroupPanelActive']).to.equal('true');
    expect(panels[0]?.hasAttribute('hidden')).to.equal(false);
    expect(panels[0]?.hasAttribute('aria-hidden')).to.equal(false);
    expect(tabs[1]?.getAttribute('aria-controls')).to.equal(panels[1]?.id);
    expect(panels[1]?.getAttribute('aria-labelledby')).to.equal(tabs[1]?.id);
    expect(copyButton?.dataset['copyTargetId']).to.equal('source-b');
    expect(copyButton?.getAttribute('aria-label')).to.equal('Bad sample のコードをコピー');

    copyControl.dataset['copyState'] = 'copied';
    copyStatus.textContent = 'コピーしました';
    tabs[2]?.click();

    expect(group?.dataset['codeGroupSelected']).to.equal('empty');
    expect(copyButton?.hasAttribute('data-copy-target-id')).to.equal(false);
    expect(copyButton?.dataset['copyState']).to.equal('copied');
    expect(status?.textContent).to.equal('コピーしました');
    expect(panels[2]?.dataset['codeGroupPanelActive']).to.equal('true');

    tabs[2]?.focus();
    expect(tabs[2]?.tabIndex).to.equal(0);
    dispatchKey(thirdTab, 'ArrowRight');
    expect(document.activeElement).to.equal(tabs[0]);
    expect(tabs[0]?.tabIndex).to.equal(0);
    expect(tabs[2]?.tabIndex).to.equal(-1);
    expect(tabs[0]?.getAttribute('aria-selected')).to.equal('false');
    expect(group?.dataset['codeGroupSelected']).to.equal('empty');

    dispatchKey(firstTab, 'End');
    expect(document.activeElement).to.equal(tabs[2]);
    expect(tabs[0]?.tabIndex).to.equal(-1);
    expect(tabs[2]?.tabIndex).to.equal(0);
    expect(group?.dataset['codeGroupSelected']).to.equal('empty');

    dispatchKey(thirdTab, 'Home');
    expect(document.activeElement).to.equal(tabs[0]);
    expect(tabs[0]?.tabIndex).to.equal(0);
    expect(tabs[2]?.tabIndex).to.equal(-1);
    expect(group?.dataset['codeGroupSelected']).to.equal('empty');

    dispatchKey(firstTab, ' ');
    expect(group?.dataset['codeGroupSelected']).to.equal('valid');
    expect(tabs[0]?.getAttribute('aria-selected')).to.equal('true');
    expect(tabs[0]?.tabIndex).to.equal(0);
  });
});
