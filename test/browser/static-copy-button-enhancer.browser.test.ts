import { expect } from '@open-wc/testing';

import { activateStaticCopyButtons } from '../../src/client/post-hydrate/static-copy-button-enhancer.js';

const installClipboardMock = (writeText: (value: string) => Promise<void>): void => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
};

describe('static-copy-button-enhancer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('template[data-code-copy-source] の textContent だけを code copy source にすること', async () => {
    const copied: string[] = [];
    installClipboardMock((value) => {
      copied.push(value);
      return Promise.resolve();
    });

    const root = document.createElement('article');
    root.innerHTML = `
      <template id="copy-source" data-code-copy-source>const answer = 42;</template>
      <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-state="idle">copy</button>
      <pre>visible text must not be copied</pre>
    `;
    document.body.append(root);

    activateStaticCopyButtons(root);
    const button = root.querySelector<HTMLButtonElement>('[data-copy-button]');
    expect(button?.dataset['copyEnhanced']).to.equal('true');

    button?.click();
    await Promise.resolve();

    expect(copied).to.deep.equal(['const answer = 42;']);
    expect(button?.dataset['copyState']).to.equal('copied');
  });

  it('root 外の copy button を activate せず、targetId と copyValue の併用を error state にすること', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      <template id="copy-source" data-code-copy-source>source</template>
      <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-value="bad">bad</button>
    `;
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.dataset['copyButton'] = 'true';
    document.body.append(root, outside);

    activateStaticCopyButtons(root);

    const invalid = root.querySelector<HTMLButtonElement>('[data-copy-button]');
    expect(invalid?.dataset['copyEnhanced']).to.equal('true');
    expect(invalid?.dataset['copyState']).to.equal('error');
    expect(outside.dataset['copyEnhanced']).to.equal(undefined);
  });
});
