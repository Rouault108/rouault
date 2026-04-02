import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/code-group/code-group.js';

type LitLikeElement = HTMLElement & {
  updateComplete?: Promise<unknown>;
};

const waitForElement = async (element: LitLikeElement): Promise<void> => {
  await element.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
};

describe('ui-code-group contract', () => {
  it('child が 1 件だけなら比較 UI に昇格せず、stack fallback を維持すること', async () => {
    const group = await fixture<LitLikeElement>(html`
      <ui-code-group aria-label="single fallback">
        <ui-code-block group-key="only" tab-label="Only" filename="only.ts">
          <pre><code>const only = true;</code></pre>
        </ui-code-block>
      </ui-code-group>
    `);

    await waitForElement(group);

    const shadowRoot = group.shadowRoot;
    expect(shadowRoot).to.not.equal(null);

    const header = shadowRoot?.querySelector<HTMLElement>('.code-group-header');
    const body = shadowRoot?.querySelector<HTMLElement>('.body');
    const stackSlot = shadowRoot?.querySelector<HTMLSlotElement>('.stack-slot');

    expect(header).to.not.equal(null);
    expect(body).to.not.equal(null);
    expect(stackSlot).to.not.equal(null);

    expect(group.hasAttribute('data-ready')).to.equal(false);
    expect(getComputedStyle(header!).display).to.equal('none');
    expect(getComputedStyle(body!).display).to.equal('none');
    expect(getComputedStyle(stackSlot!).display).to.equal('block');

    const codeBlock = group.querySelector<HTMLElement>('ui-code-block');
    expect(codeBlock).to.not.equal(null);
    expect(codeBlock?.getAttribute('slot')).to.equal(null);
    expect(codeBlock?.hasAttribute('hidden')).to.equal(false);

    const assigned = stackSlot!.assignedElements({ flatten: true });
    expect(assigned).to.include(codeBlock!);

    expect(group.querySelectorAll('button[slot="tab"]').length).to.equal(0);
  });

  it('child が 2 件以上なら tab / panel / copy button を構成し、非選択 panel を hidden にすること', async () => {
    const group = await fixture<LitLikeElement>(html`
      <ui-code-group aria-label="comparison group">
        <ui-code-block group-key="ts" tab-label="TypeScript" filename="sample.ts" lang="ts">
          <pre><code>const lang = 'ts';</code></pre>
        </ui-code-block>
        <ui-code-block group-key="js" tab-label="JavaScript" filename="sample.js" lang="js">
          <pre><code>const lang = 'js';</code></pre>
        </ui-code-block>
      </ui-code-group>
    `);

    await waitForElement(group);

    const shadowRoot = group.shadowRoot;
    expect(shadowRoot).to.not.equal(null);

    const header = shadowRoot?.querySelector<HTMLElement>('.code-group-header');
    const body = shadowRoot?.querySelector<HTMLElement>('.body');
    const stackSlot = shadowRoot?.querySelector<HTMLElement>('.stack-slot');
    const copyButton = shadowRoot?.querySelector('ui-copy-button');

    expect(header).to.not.equal(null);
    expect(body).to.not.equal(null);
    expect(stackSlot).to.not.equal(null);
    expect(copyButton).to.not.equal(null);

    expect(group.getAttribute('data-ready')).to.equal('');
    expect(getComputedStyle(header!).display).to.equal('flex');
    expect(getComputedStyle(body!).display).to.equal('block');
    expect(getComputedStyle(stackSlot!).display).to.equal('none');

    const tabs = Array.from(group.querySelectorAll<HTMLButtonElement>('button[slot="tab"]'));
    expect(tabs).to.have.length(2);
    expect(tabs[0]?.getAttribute('role')).to.equal('tab');
    expect(tabs[0]?.getAttribute('aria-selected')).to.equal('true');
    expect(tabs[1]?.getAttribute('role')).to.equal('tab');
    expect(tabs[1]?.getAttribute('aria-selected')).to.equal('false');

    const panels = Array.from(group.querySelectorAll<HTMLElement>('ui-code-block[slot="panel"]'));
    expect(panels).to.have.length(2);

    expect(panels[0]?.getAttribute('role')).to.equal('tabpanel');
    expect(panels[0]?.hasAttribute('hidden')).to.equal(false);
    expect(panels[0]?.getAttribute('aria-hidden')).to.equal(null);

    expect(panels[1]?.getAttribute('role')).to.equal('tabpanel');
    expect(panels[1]?.hasAttribute('hidden')).to.equal(true);
    expect(panels[1]?.getAttribute('aria-hidden')).to.equal('true');
  });

  it('比較不能時は panel slot へ移さず、fallback surface を維持すること', async () => {
    const group = await fixture<LitLikeElement>(html`
      <ui-code-group aria-label="mixed children boundary">
        <ui-code-block group-key="one" tab-label="One" filename="one.ts">
          <pre><code>const one = 1;</code></pre>
        </ui-code-block>
        <p id="foreign">余計な要素</p>
        <ui-code-block group-key="two" tab-label="Two" filename="two.ts">
          <pre><code>const two = 2;</code></pre>
        </ui-code-block>
      </ui-code-group>
    `);

    await waitForElement(group);

    expect(group.hasAttribute('data-ready')).to.equal(false);
    expect(group.querySelectorAll('button[slot="tab"]').length).to.equal(0);

    const blocks = Array.from(group.querySelectorAll<HTMLElement>('ui-code-block'));
    expect(blocks).to.have.length(2);

    for (const block of blocks) {
      expect(block.getAttribute('slot')).to.equal(null);
      expect(block.hasAttribute('hidden')).to.equal(false);
      expect(block.getAttribute('role')).to.equal(null);
      expect(block.getAttribute('aria-hidden')).to.equal(null);
    }

    expect(group.querySelector('#foreign')).to.not.equal(null);
  });
});