import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/code-group/code-group.js';
import '../../src/components/ui/codeblock/codeblock.js';
import type { CodeGroup } from '../../src/components/ui/code-group/code-group.js';
import { dispatchKey, waitForLitUpdate } from './helpers/wait-for-lit.js';

type CopyButtonElement = HTMLElement & {
  disabled: boolean;
  label: string;
  value: string;
};

interface CodeGroupChangeDetail {
  index: number;
  prevIndex: number;
  prevValue: string;
  userInitiated: boolean;
  value: string;
}

const getTabs = (group: CodeGroup): HTMLButtonElement[] =>
  Array.from(group.querySelectorAll<HTMLButtonElement>('button[slot="tab"]'));

const getPanels = (group: CodeGroup): HTMLElement[] =>
  Array.from(group.querySelectorAll<HTMLElement>('ui-code-block[slot="panel"]'));

const getCopyButton = (group: CodeGroup): CopyButtonElement | null =>
  group.shadowRoot?.querySelector<CopyButtonElement>('ui-copy-button') ?? null;

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const waitForGroupChange = (group: CodeGroup): Promise<CodeGroupChangeDetail> =>
  new Promise((resolve) => {
    group.addEventListener(
      'ui-code-group-change',
      ((event: Event) => {
        if (event instanceof CustomEvent) {
          resolve(event.detail as CodeGroupChangeDetail);
        }
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-code-group browser contract', () => {
  it('click により選択 tab / panel / copy value を更新し、change detail を公開すること', async () => {
    const group = await fixture<CodeGroup>(html`
      <ui-code-group aria-label="comparison group">
        <ui-code-block group-key="ts" tab-label="TypeScript" filename="sample.ts" lang="ts">
          <pre><code>console.log('ts');</code></pre>
        </ui-code-block>
        <ui-code-block group-key="js" tab-label="JavaScript" filename="sample.js" lang="js">
          <pre><code>console.log('js');</code></pre>
        </ui-code-block>
      </ui-code-group>
    `);

    await waitForLitUpdate(group);

    const tabs = getTabs(group);
    const panels = getPanels(group);

    const firstTab = expectPresent(tabs[0], 'tabs[0]');
    const secondTab = expectPresent(tabs[1], 'tabs[1]');
    const firstPanel = expectPresent(panels[0], 'panels[0]');
    const secondPanel = expectPresent(panels[1], 'panels[1]');

    expect(group.getAttribute('data-ready')).to.equal('');
    expect(tabs).to.have.length(2);
    expect(panels).to.have.length(2);
    expect(firstTab.getAttribute('aria-selected')).to.equal('true');
    expect(secondTab.getAttribute('aria-selected')).to.equal('false');
    expect(firstPanel.hasAttribute('hidden')).to.equal(false);
    expect(secondPanel.hasAttribute('hidden')).to.equal(true);

    const detailPromise = waitForGroupChange(group);
    secondTab.click();
    const detail = await detailPromise;
    await waitForLitUpdate(group);

    expect(detail.value).to.equal('js');
    expect(detail.prevValue).to.equal('ts');
    expect(detail.index).to.equal(1);
    expect(detail.prevIndex).to.equal(0);
    expect(detail.userInitiated).to.equal(true);

    expect(firstTab.getAttribute('aria-selected')).to.equal('false');
    expect(secondTab.getAttribute('aria-selected')).to.equal('true');
    expect(firstPanel.hasAttribute('hidden')).to.equal(true);
    expect(secondPanel.hasAttribute('hidden')).to.equal(false);

    const copyButton = expectPresent(getCopyButton(group), 'copyButton');
    expect(copyButton.value).to.equal("console.log('js');");
    expect(copyButton.label).to.equal('sample.js のコードをコピー');
  });

  it('activation="manual" では矢印キーで focus のみ移動し、Enter で選択を確定すること', async () => {
    const group = await fixture<CodeGroup>(html`
      <ui-code-group aria-label="manual activation" activation="manual">
        <ui-code-block group-key="react" tab-label="React" filename="app.tsx" lang="tsx">
          <pre><code>export const framework = 'react';</code></pre>
        </ui-code-block>
        <ui-code-block group-key="lit" tab-label="Lit" filename="app.ts" lang="ts">
          <pre><code>export const framework = 'lit';</code></pre>
        </ui-code-block>
      </ui-code-group>
    `);

    await waitForLitUpdate(group);

    const tabs = getTabs(group);
    const panels = getPanels(group);

    const firstTab = expectPresent(tabs[0], 'tabs[0]');
    const secondTab = expectPresent(tabs[1], 'tabs[1]');
    const firstPanel = expectPresent(panels[0], 'panels[0]');
    const secondPanel = expectPresent(panels[1], 'panels[1]');

    firstTab.focus();
    dispatchKey(firstTab, 'ArrowRight');
    await waitForLitUpdate(group);

    expect(firstTab.getAttribute('aria-selected')).to.equal('true');
    expect(secondTab.getAttribute('aria-selected')).to.equal('false');
    expect(secondTab.getAttribute('tabindex')).to.equal('0');
    expect(firstPanel.hasAttribute('hidden')).to.equal(false);
    expect(secondPanel.hasAttribute('hidden')).to.equal(true);

    dispatchKey(secondTab, 'Enter');
    await waitForLitUpdate(group);

    expect(firstTab.getAttribute('aria-selected')).to.equal('false');
    expect(secondTab.getAttribute('aria-selected')).to.equal('true');
    expect(firstPanel.hasAttribute('hidden')).to.equal(true);
    expect(secondPanel.hasAttribute('hidden')).to.equal(false);
  });

  it('copyable=false の item を選択した場合、group copy button を disabled にすること', async () => {
    const group = await fixture<CodeGroup>(html`
      <ui-code-group aria-label="copy disabled boundary">
        <ui-code-block group-key="alpha" tab-label="Alpha" filename="alpha.ts" lang="ts">
          <pre><code>export const alpha = 1;</code></pre>
        </ui-code-block>
        <ui-code-block
          group-key="beta"
          tab-label="Beta"
          filename="beta.ts"
          lang="ts"
          copyable="false"
        >
          <pre><code>export const beta = 2;</code></pre>
        </ui-code-block>
      </ui-code-group>
    `);

    await waitForLitUpdate(group);

    const tabs = getTabs(group);
    const secondTab = expectPresent(tabs[1], 'tabs[1]');

    const detailPromise = waitForGroupChange(group);
    secondTab.click();
    await detailPromise;
    await waitForLitUpdate(group);

    const copyButton = expectPresent(getCopyButton(group), 'copyButton');
    expect(copyButton.disabled).to.equal(true);
    expect(copyButton.label).to.equal('beta.ts のコードをコピー');
  });
});
