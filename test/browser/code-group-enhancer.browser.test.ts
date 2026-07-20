import { expect } from '@open-wc/testing';

import { enhanceCodeGroups } from '../../src/client/post-hydrate/code-group-enhancer.js';
import { activateStaticCopyButtons } from '../../src/client/post-hydrate/static-copy-button-enhancer.js';

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

const textFingerprint = (value: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const semanticSubtreeSignature = (owner: ParentNode): unknown[] =>
  Array.from(owner.querySelectorAll<HTMLElement>('[data-code-line-state]')).map((line) => {
    const wrapper = line.firstElementChild;
    return {
      state: line.dataset['codeLineState'] ?? null,
      role: line.getAttribute('role'),
      label: line.getAttribute('aria-label'),
      wrapper: wrapper?.localName ?? null,
      wrapperCount: line.querySelectorAll(':scope > mark, :scope > ins, :scope > del').length,
      descendantWrapperCount: line.querySelectorAll('mark, ins, del').length,
      tokens: Array.from(wrapper?.childNodes ?? line.childNodes).map((node) => ({
        kind: node.nodeType,
        tag: node instanceof Element ? node.localName : null,
        className: node instanceof Element ? node.getAttribute('class') : null,
        style: node instanceof Element ? node.getAttribute('style') : null,
        textLength: node.textContent?.length ?? 0,
        textFingerprint: textFingerprint(node.textContent ?? ''),
      })),
    };
  });

const codeGroupFixture = (
  id: string,
  options: {
    syncScope?: string;
    includeInvalidTab?: boolean;
    includeInvalidPanel?: boolean;
    selected?: string;
    enhanced?: boolean;
  } = {},
): string => {
  const selected = options.selected ?? 'valid';
  const syncScope = options.syncScope ? ` data-code-group-sync-scope="${options.syncScope}"` : '';
  const enhanced = options.enhanced ? ' data-code-group-enhanced="true"' : '';
  const invalidTab =
    options.includeInvalidTab === false
      ? ''
      : `<button type="button" data-code-group-tab="true" data-code-group-key="invalid">Invalid</button>`;
  const invalidPanel =
    options.includeInvalidPanel === false
      ? ''
      : `<section data-code-group-panel="invalid" data-code-group-panel-active="${selected === 'invalid' ? 'true' : 'false'}" data-code-group-panel-label="Invalid" data-code-copy-source-id="${id}-source-invalid">
        <template id="${id}-source-invalid" data-code-copy-source>const invalid = true;</template>
        <figure data-code-block-root data-code-group-owned="true">
          <pre data-code-block data-code-language="ts" data-code-copy-label="${id} invalid"><code>const invalid = true;</code></pre>
        </figure>
      </section>`;

  return `
    <section data-code-group data-code-group-id="${id}" data-code-group-label="${id}" data-code-group-selected="${selected}"${syncScope}${enhanced}>
      <div class="code-group-header" data-code-group-controls="true">
        <div class="code-group-tablist">
          <button type="button" data-code-group-tab="true" data-code-group-key="valid">Valid</button>
          ${invalidTab}
        </div>
        <div class="code-group-header-tools">
          <button type="button" data-copy-button data-code-group-copy data-copy-target-id="${id}-source-valid" aria-describedby="${id}-status">copy</button>
          <span id="${id}-status" data-copy-status></span>
        </div>
      </div>
      <section data-code-group-panel="valid" data-code-group-panel-active="${selected === 'valid' ? 'true' : 'false'}" data-code-group-panel-label="Valid" data-code-copy-source-id="${id}-source-valid">
        <template id="${id}-source-valid" data-code-copy-source>const valid = true;</template>
        <figure data-code-block-root data-code-group-owned="true">
          <pre data-code-block data-code-language="ts" data-code-copy-label="${id} valid"><code>const valid = true;</code></pre>
        </figure>
      </section>
      ${invalidPanel}
    </section>
  `;
};

describe('code-group-enhancer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('SSR stack HTML を tabs UI へ昇格し、active state と group copy target を同期すること', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      <section data-code-group data-code-group-id="example" data-code-group-label="比較" data-code-group-selected="valid">
        <div class="code-group-header" data-code-group-controls="true">
          <div class="code-group-tablist">
            <button type="button" data-code-group-tab="true" data-code-group-key="valid">Valid</button>
            <button type="button" data-code-group-tab="true" data-code-group-key="invalid">Invalid</button>
            <button type="button" data-code-group-tab="true" data-code-group-key="empty">Empty</button>
          </div>
          <div class="code-group-header-tools">
            <button
              type="button"
              data-copy-button
              data-code-group-copy
              data-copy-target-id="source-a"
              data-copy-state="copied"
              aria-describedby="copy-status"
            >copy</button>
            <span id="copy-status" data-copy-status>コピーしました</span>
          </div>
        </div>
        <section data-code-group-panel="valid" data-code-group-panel-active="true" data-code-group-panel-label="正しい例" data-code-copy-source-id="source-a">
          <template id="source-a" data-code-copy-source>const valid = true;</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block data-code-language="ts"><code>const valid = true;</code></pre>
          </figure>
        </section>
        <section data-code-group-panel="invalid" data-code-group-panel-active="false" data-code-group-panel-label="誤り例" data-code-copy-source-id="source-b">
          <template id="source-b" data-code-copy-source>const invalid = true;</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block data-code-language="ts" data-code-copy-label="Bad sample"><code>const invalid = true;</code></pre>
          </figure>
        </section>
        <section data-code-group-panel="empty" data-code-group-panel-active="false" data-code-group-panel-label="空">
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
    expect(tabs.every((tab) => tab.dataset['codeGroupTab'] === 'true')).to.equal(true);
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

  it('no-JS semantic subtreeをtabs昇格・panel切替・再実行後も保ち、active sourceを正確にcopyすること', async () => {
    const copied: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          copied.push(value);
          return Promise.resolve();
        },
      },
    });

    const stateLines = (prefix: string): string => `
      <span class="line" data-code-line-state="normal"><span class="token">${prefix}0</span></span>
      <span class="line highlighted" data-code-line-state="highlight" role="group" aria-label="強調行"><mark><span class="token keyword" style="color: rgb(42, 46, 51)">${prefix}1</span></mark></span>
      <span class="line diff add" data-code-line-state="add" role="group" aria-label="追加行"><ins><span class="token string">${prefix}2</span></ins></span>
      <span class="line diff remove" data-code-line-state="remove" role="group" aria-label="削除行"><del><span class="token number">${prefix}3</span></del></span>
    `;
    const root = document.createElement('article');
    root.innerHTML = `
      <section data-code-group data-code-group-id="semantic" data-code-group-label="semantic" data-code-group-selected="active">
        <div class="code-group-header" data-code-group-controls="true">
          <div class="code-group-tablist">
            <button type="button" data-code-group-tab="true" data-code-group-key="active">Active</button>
            <button type="button" data-code-group-tab="true" data-code-group-key="secondary">Secondary</button>
          </div>
          <div class="code-group-header-tools">
            <button type="button" data-copy-button data-code-group-copy data-copy-target-id="semantic-source-active" data-copy-disabled-reason="no-js" aria-describedby="semantic-status" disabled>copy</button>
            <span id="semantic-status" data-copy-status></span>
          </div>
        </div>
        <section data-code-group-panel="active" data-code-group-panel-active="true" data-code-copy-source-id="semantic-source-active">
          <template id="semantic-source-active" data-code-copy-source>const active = true;</template>
          <figure data-code-block-root data-code-group-owned="true"><pre data-code-block><code>${stateLines('a')}</code></pre></figure>
        </section>
        <section data-code-group-panel="secondary" data-code-group-panel-active="false" data-code-copy-source-id="semantic-source-secondary">
          <template id="semantic-source-secondary" data-code-copy-source>const secondary = true;</template>
          <figure data-code-block-root data-code-group-owned="true"><pre data-code-block><code>${stateLines('b')}</code></pre></figure>
        </section>
      </section>
    `;
    document.body.append(root);

    const before = semanticSubtreeSignature(root);
    enhanceCodeGroups(root);
    enhanceCodeGroups(root);
    expect(semanticSubtreeSignature(root)).to.deep.equal(before);

    const secondaryTab = expectElement(
      root.querySelector<HTMLButtonElement>('[data-code-group-key="secondary"]'),
      'secondary tab',
    );
    secondaryTab.click();
    expect(semanticSubtreeSignature(root)).to.deep.equal(before);
    expect(root.querySelectorAll('[data-code-line-state][role="group"]')).to.have.length(6);
    expect(root.querySelectorAll('[data-code-line-state] mark')).to.have.length(2);
    expect(root.querySelectorAll('[data-code-line-state] ins')).to.have.length(2);
    expect(root.querySelectorAll('[data-code-line-state] del')).to.have.length(2);

    activateStaticCopyButtons(root);
    const copyButton = expectElement(
      root.querySelector<HTMLButtonElement>('[data-code-group-copy]'),
      'group copy button',
    );
    expect(copyButton.dataset['copyTargetId']).to.equal('semantic-source-secondary');
    copyButton.click();
    await Promise.resolve();
    expect(copied).to.deep.equal(['const secondary = true;']);
    expect(semanticSubtreeSignature(root)).to.deep.equal(before);
  });

  it('tab key は data-code-group-key だけから読み、nested descendant を親 group state に混ぜないこと', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      <section data-code-group data-code-group-id="outer" data-code-group-label="外側" data-code-group-selected="">
        <div class="code-group-header" data-code-group-controls="true">
          <div class="code-group-tablist">
            <button type="button" data-code-group-tab="true" data-code-group-key="outer-a">Outer A</button>
            <button type="button" data-code-group-tab="true" data-code-group-key="outer-b">Outer B</button>
          </div>
          <div class="code-group-header-tools">
            <button type="button" data-copy-button data-code-group-copy data-copy-target-id="outer-source-a" aria-describedby="outer-status">copy</button>
            <span id="outer-status" data-copy-status></span>
          </div>
        </div>
        <section data-code-group-panel="outer-a" data-code-group-panel-active="true" data-code-copy-source-id="outer-source-a">
          <template id="outer-source-a" data-code-copy-source>outer a</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block><code>outer a</code></pre>
          </figure>
          <section data-code-group data-code-group-id="inner" data-code-group-selected="inner-a">
            <div class="code-group-header" data-code-group-controls="true">
              <div class="code-group-tablist">
                <button type="button" data-code-group-tab="true" data-code-group-key="inner-a">Inner A</button>
              </div>
              <div class="code-group-header-tools">
                <button type="button" data-copy-button data-code-group-copy data-copy-target-id="inner-source-a" aria-describedby="inner-status">copy</button>
                <span id="inner-status" data-copy-status></span>
              </div>
            </div>
            <section data-code-group-panel="inner-a" data-code-group-panel-active="true" data-code-copy-source-id="inner-source-a">
              <template id="inner-source-a" data-code-copy-source>inner a</template>
              <figure data-code-block-root data-code-group-owned="true">
                <pre data-code-block><code>inner a</code></pre>
              </figure>
            </section>
          </section>
        </section>
        <section data-code-group-panel="outer-b" data-code-group-panel-active="false" data-code-copy-source-id="outer-source-b">
          <template id="outer-source-b" data-code-copy-source>outer b</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block><code>outer b</code></pre>
          </figure>
        </section>
      </section>
    `;
    document.body.append(root);

    enhanceCodeGroups(root);

    const groups = Array.from(root.querySelectorAll<HTMLElement>('section[data-code-group]'));
    const outer = expectElement(groups[0], 'outer group');
    const inner = expectElement(groups[1], 'inner group');
    const outerTabs = Array.from(
      outer
        .querySelector<HTMLElement>(':scope > .code-group-header .code-group-tablist')
        ?.querySelectorAll<HTMLButtonElement>(':scope > button[data-code-group-tab]') ?? [],
    );
    const outerPanels = Array.from(outer.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.hasAttribute('data-code-group-panel'),
    );
    const outerCopyButton = expectElement(
      outer.querySelector<HTMLButtonElement>(
        ':scope > .code-group-header > .code-group-header-tools > button[data-code-group-copy][data-copy-button]',
      ),
      'outer copy button',
    );
    const innerCopyButton = expectElement(
      inner.querySelector<HTMLButtonElement>(
        ':scope > .code-group-header > .code-group-header-tools > button[data-code-group-copy][data-copy-button]',
      ),
      'inner copy button',
    );

    expect(outer.dataset['codeGroupSelected']).to.equal('outer-a');
    expect(outerTabs).to.have.length(2);
    expect(outerPanels).to.have.length(2);
    expect(outer.querySelectorAll('[role="tab"]')).to.have.length(3);
    expect(outerTabs.every((tab) => tab.dataset['codeGroupTab'] === 'true')).to.equal(true);
    expect(outerTabs[0]?.getAttribute('aria-selected')).to.equal('true');
    expect(outerTabs[0]?.dataset['codeGroupTabActive']).to.equal('true');
    expect(outerCopyButton.dataset['copyTargetId']).to.equal('outer-source-a');
    expect(innerCopyButton.dataset['copyTargetId']).to.equal('inner-source-a');

    outerTabs[1]?.click();

    expect(outer.dataset['codeGroupSelected']).to.equal('outer-b');
    expect(outerPanels[0]?.dataset['codeGroupPanelActive']).to.equal('false');
    expect(outerPanels[1]?.dataset['codeGroupPanelActive']).to.equal('true');
    expect(inner.dataset['codeGroupSelected']).to.equal('inner-a');
    expect(innerCopyButton.dataset['copyTargetId']).to.equal('inner-source-a');
    expect(outerCopyButton.dataset['copyTargetId']).to.equal('outer-source-b');
  });

  it('sync-scope 未指定の code group はユーザー選択時も他 group と連動しないこと', () => {
    const root = document.createElement('article');
    root.innerHTML = `${codeGroupFixture('a')}${codeGroupFixture('b')}`;
    document.body.append(root);

    enhanceCodeGroups(root);

    const groups = Array.from(root.querySelectorAll<HTMLElement>('section[data-code-group]'));
    const sourceTab = expectElement(
      groups[0]?.querySelector<HTMLButtonElement>('[data-code-group-key="invalid"]'),
      'source invalid tab',
    );
    sourceTab.click();

    expect(groups[0]?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(groups[1]?.dataset['codeGroupSelected']).to.equal('valid');
  });

  it('同一 enhance root 内の同じ sync-scope だけをユーザー選択で同期すること', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      ${codeGroupFixture('a', { syncScope: 'package-manager' })}
      ${codeGroupFixture('b', { syncScope: 'package-manager' })}
      ${codeGroupFixture('c', { syncScope: 'runtime' })}
    `;
    document.body.append(root);

    enhanceCodeGroups(root);

    const groups = Array.from(root.querySelectorAll<HTMLElement>('section[data-code-group]'));
    const sourceTab = expectElement(
      groups[0]?.querySelector<HTMLButtonElement>('[data-code-group-key="invalid"]'),
      'source invalid tab',
    );
    const sourceValidTab = expectElement(
      groups[0]?.querySelector<HTMLButtonElement>('[data-code-group-key="valid"]'),
      'source valid tab',
    );
    const peerCopyButton = expectElement(
      groups[1]?.querySelector<HTMLButtonElement>('[data-code-group-copy]'),
      'peer copy button',
    );

    sourceTab.click();

    expect(groups[0]?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(groups[1]?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(groups[2]?.dataset['codeGroupSelected']).to.equal('valid');
    expect(peerCopyButton.dataset['copyTargetId']).to.equal('b-source-invalid');
    expect(document.activeElement).to.not.equal(
      groups[1]?.querySelector<HTMLButtonElement>('[data-code-group-key="invalid"]'),
    );

    dispatchKey(sourceValidTab, 'Enter');
    expect(groups[0]?.dataset['codeGroupSelected']).to.equal('valid');
    expect(groups[1]?.dataset['codeGroupSelected']).to.equal('valid');
    expect(groups[2]?.dataset['codeGroupSelected']).to.equal('valid');
    expect(peerCopyButton.dataset['copyTargetId']).to.equal('b-source-valid');

    dispatchKey(sourceTab, ' ');
    expect(groups[0]?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(groups[1]?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(groups[2]?.dataset['codeGroupSelected']).to.equal('valid');
    expect(peerCopyButton.dataset['copyTargetId']).to.equal('b-source-invalid');
  });

  it('別 enhance root、未enhanced peer、該当key不足の peer には同期しないこと', () => {
    const firstRoot = document.createElement('article');
    const secondRoot = document.createElement('article');
    firstRoot.innerHTML = `
      ${codeGroupFixture('a', { syncScope: 'package-manager' })}
      ${codeGroupFixture('missing-panel', {
        syncScope: 'package-manager',
        includeInvalidTab: true,
        includeInvalidPanel: false,
      })}
      ${codeGroupFixture('missing-tab', {
        syncScope: 'package-manager',
        includeInvalidTab: false,
        includeInvalidPanel: true,
      })}
    `;
    secondRoot.innerHTML = codeGroupFixture('other-root', { syncScope: 'package-manager' });
    document.body.append(firstRoot, secondRoot);

    enhanceCodeGroups(firstRoot);
    enhanceCodeGroups(secondRoot);

    firstRoot.insertAdjacentHTML(
      'beforeend',
      codeGroupFixture('late', { syncScope: 'package-manager' }),
    );

    const source = expectElement(
      firstRoot.querySelector<HTMLElement>('[data-code-group-id="a"]'),
      'source group',
    );
    const missingPanel = expectElement(
      firstRoot.querySelector<HTMLElement>('[data-code-group-id="missing-panel"]'),
      'missing-panel-key group',
    );
    const missingTab = expectElement(
      firstRoot.querySelector<HTMLElement>('[data-code-group-id="missing-tab"]'),
      'missing-tab-key group',
    );
    const late = expectElement(
      firstRoot.querySelector<HTMLElement>('[data-code-group-id="late"]'),
      'late group',
    );
    const otherRoot = expectElement(
      secondRoot.querySelector<HTMLElement>('[data-code-group-id="other-root"]'),
      'other root group',
    );
    const sourceTab = expectElement(
      source.querySelector<HTMLButtonElement>('[data-code-group-key="invalid"]'),
      'source invalid tab',
    );

    sourceTab.click();

    expect(source.dataset['codeGroupSelected']).to.equal('invalid');
    expect(missingPanel.dataset['codeGroupSelected']).to.equal('valid');
    expect(missingTab.dataset['codeGroupSelected']).to.equal('valid');
    expect(late.dataset['codeGroupSelected']).to.equal('valid');
    expect(late.dataset['codeGroupEnhanced']).to.equal(undefined);
    expect(otherRoot.dataset['codeGroupSelected']).to.equal('valid');
  });

  it('arrow / Home / End と初期 hydration では sync-scope peer の selection を同期しないこと', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      ${codeGroupFixture('a', { syncScope: 'package-manager', selected: 'invalid' })}
      ${codeGroupFixture('b', { syncScope: 'package-manager', selected: 'valid' })}
    `;
    document.body.append(root);

    enhanceCodeGroups(root);

    const groups = Array.from(root.querySelectorAll<HTMLElement>('section[data-code-group]'));
    const sourceTabs = Array.from(
      groups[0]?.querySelectorAll<HTMLButtonElement>('[data-code-group-tab]') ?? [],
    );

    expect(groups[0]?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(groups[1]?.dataset['codeGroupSelected']).to.equal('valid');

    const secondTab = expectElement(sourceTabs[1], 'source second tab');
    secondTab.focus();
    dispatchKey(secondTab, 'ArrowLeft');
    dispatchKey(expectElement(sourceTabs[0], 'source first tab'), 'End');
    dispatchKey(secondTab, 'Home');

    expect(groups[0]?.dataset['codeGroupSelected']).to.equal('invalid');
    expect(groups[1]?.dataset['codeGroupSelected']).to.equal('valid');
  });

  it('同一 root 内の nested code group は親 state に混ざらず独立 peer として同期できること', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      <section data-code-group data-code-group-id="outer" data-code-group-label="outer" data-code-group-selected="valid" data-code-group-sync-scope="package-manager">
        <div class="code-group-header" data-code-group-controls="true">
          <div class="code-group-tablist">
            <button type="button" data-code-group-tab="true" data-code-group-key="valid">Outer Valid</button>
            <button type="button" data-code-group-tab="true" data-code-group-key="invalid">Outer Invalid</button>
          </div>
          <div class="code-group-header-tools">
            <button type="button" data-copy-button data-code-group-copy data-copy-target-id="outer-source-valid" aria-describedby="outer-status">copy</button>
            <span id="outer-status" data-copy-status></span>
          </div>
        </div>
        <section data-code-group-panel="valid" data-code-group-panel-active="true" data-code-copy-source-id="outer-source-valid">
          <template id="outer-source-valid" data-code-copy-source>outer valid</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block><code>outer valid</code></pre>
          </figure>
          ${codeGroupFixture('inner', { syncScope: 'package-manager' })}
        </section>
        <section data-code-group-panel="invalid" data-code-group-panel-active="false" data-code-copy-source-id="outer-source-invalid">
          <template id="outer-source-invalid" data-code-copy-source>outer invalid</template>
          <figure data-code-block-root data-code-group-owned="true">
            <pre data-code-block><code>outer invalid</code></pre>
          </figure>
        </section>
      </section>
    `;
    document.body.append(root);

    enhanceCodeGroups(root);

    const outer = expectElement(
      root.querySelector<HTMLElement>('[data-code-group-id="outer"]'),
      'outer group',
    );
    const inner = expectElement(
      root.querySelector<HTMLElement>('[data-code-group-id="inner"]'),
      'inner group',
    );
    const outerDirectTabs = Array.from(
      outer
        .querySelector<HTMLElement>(':scope > .code-group-header .code-group-tablist')
        ?.querySelectorAll<HTMLButtonElement>(':scope > button[data-code-group-tab]') ?? [],
    );
    const innerTab = expectElement(
      inner.querySelector<HTMLButtonElement>('[data-code-group-key="invalid"]'),
      'inner invalid tab',
    );

    expect(outerDirectTabs).to.have.length(2);
    innerTab.click();

    expect(inner.dataset['codeGroupSelected']).to.equal('invalid');
    expect(outer.dataset['codeGroupSelected']).to.equal('invalid');
    expect(outerDirectTabs[1]?.getAttribute('aria-selected')).to.equal('true');
  });
});
