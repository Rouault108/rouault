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

  it('missing target / invalid kind / clipboard failure を error status にして idle へ戻すこと', async () => {
    let now = 0;
    const callbacks = new Map<number, () => void>();
    const originalSetTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;
    window.setTimeout = ((handler: TimerHandler, timeout?: number) => {
      now += 1;
      const id = now;
      callbacks.set(id, () => {
        if (typeof handler === 'function') {
          handler();
        }
      });
      expect(timeout).to.equal(1500);
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id?: number) => {
      if (typeof id === 'number') {
        callbacks.delete(id);
      }
    }) as typeof window.clearTimeout;

    installClipboardMock(() => Promise.reject(new Error('denied')));

    const root = document.createElement('article');
    root.innerHTML = `
      <span data-copy-control>
        <button type="button" data-copy-button data-copy-target-id="missing" aria-describedby="copy-status">copy</button>
        <span id="copy-status" data-copy-status></span>
      </span>
      <span data-copy-control>
        <button type="button" data-copy-button data-copy-kind="code" data-copy-value="bad" aria-describedby="kind-status">copy</button>
        <span id="kind-status" data-copy-status></span>
      </span>
      <span data-copy-control>
        <template id="reject-source" data-code-copy-source>source</template>
        <button type="button" data-copy-button data-copy-target-id="reject-source" aria-describedby="reject-status">copy</button>
        <span id="reject-status" data-copy-status></span>
      </span>
    `;
    document.body.append(root);

    try {
      activateStaticCopyButtons(root);

      const missing = root.querySelector<HTMLButtonElement>('[aria-describedby="copy-status"]');
      const invalidKind = root.querySelector<HTMLButtonElement>('[aria-describedby="kind-status"]');
      const rejected = root.querySelector<HTMLButtonElement>('[aria-describedby="reject-status"]');

      expect(missing?.dataset['copyState']).to.equal('error');
      expect(root.querySelector('#copy-status')?.textContent).to.equal('コピーできませんでした');
      expect(invalidKind?.dataset['copyState']).to.equal('error');
      expect(root.querySelector('#kind-status')?.textContent).to.equal('コピーできませんでした');

      rejected?.click();
      await Promise.resolve();

      expect(rejected?.dataset['copyState']).to.equal('error');
      expect(root.querySelector('#reject-status')?.textContent).to.equal('コピーできませんでした');

      callbacks.get(1)?.();
      expect(missing?.dataset['copyState']).to.equal('idle');
      expect(root.querySelector('#copy-status')?.textContent).to.equal('');
    } finally {
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
    }
  });

  it('disabled / hidden button は clipboard 書き込みを実行しないこと', async () => {
    const copied: string[] = [];
    installClipboardMock((value) => {
      copied.push(value);
      return Promise.resolve();
    });

    const root = document.createElement('article');
    root.innerHTML = `
      <template id="copy-source" data-code-copy-source>source</template>
      <button type="button" data-copy-button data-copy-target-id="copy-source" disabled>disabled</button>
      <span hidden>
        <button type="button" data-copy-button data-copy-target-id="copy-source">hidden</button>
      </span>
    `;
    document.body.append(root);

    activateStaticCopyButtons(root);

    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-copy-button]')) {
      button.click();
    }
    await Promise.resolve();

    expect(copied).to.deep.equal([]);
  });

  it('clipboard.writeText が存在しない場合は error state にすること', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {},
    });

    const root = document.createElement('article');
    root.innerHTML = `
      <span data-copy-control>
        <template id="copy-source" data-code-copy-source>source</template>
        <button type="button" data-copy-button data-copy-target-id="copy-source" aria-describedby="copy-status">copy</button>
        <span id="copy-status" data-copy-status></span>
      </span>
    `;
    document.body.append(root);

    activateStaticCopyButtons(root);
    const button = root.querySelector<HTMLButtonElement>('[data-copy-button]');
    button?.click();
    await Promise.resolve();

    expect(button?.dataset['copyState']).to.equal('error');
    expect(root.querySelector('#copy-status')?.textContent).to.equal('コピーできませんでした');
  });
});
