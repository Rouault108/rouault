import { afterEach, describe, expect, it } from 'vitest';

import { activateStaticCopyButtons } from '../../src/client/post-hydrate/static-copy-button-enhancer.js';

const installClipboardMock = (writeText: (value: string) => Promise<void>): void => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
};

const textFingerprint = (value: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const semanticLineSignature = (line: Element | null): unknown => {
  const wrapper = line?.firstElementChild;
  return {
    role: line?.getAttribute('role') ?? null,
    label: line?.getAttribute('aria-label') ?? null,
    wrapper: wrapper?.localName ?? null,
    wrapperCount: line?.querySelectorAll(':scope > mark, :scope > ins, :scope > del').length ?? 0,
    descendantWrapperCount: line?.querySelectorAll('mark, ins, del').length ?? 0,
    tokens: Array.from(wrapper?.childNodes ?? []).map((node) => ({
      kind: node.nodeType,
      tag: node instanceof Element ? node.localName : null,
      className: node instanceof Element ? node.getAttribute('class') : null,
      style: node instanceof Element ? node.getAttribute('style') : null,
      textLength: node.textContent?.length ?? 0,
      textFingerprint: textFingerprint(node.textContent ?? ''),
    })),
  };
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
      <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-state="idle" data-copy-disabled-reason="no-js" disabled>copy</button>
      <pre data-code-block><code><span class="line diff add" data-code-line-state="add" role="group" aria-label="追加行"><ins><span class="token keyword" style="color: rgb(42, 46, 51)">visible</span> text must not be copied</ins></span></code></pre>
    `;
    document.body.append(root);

    const line = root.querySelector('[data-code-line-state="add"]');
    const beforeSemanticSignature = semanticLineSignature(line);

    activateStaticCopyButtons(root);
    const button = root.querySelector<HTMLButtonElement>('[data-copy-button]');
    expect(button?.dataset['copyEnhanced']).to.equal('true');
    expect(button?.disabled).to.equal(false);
    expect(button?.hasAttribute('data-copy-disabled-reason')).to.equal(false);

    button?.click();
    await Promise.resolve();

    expect(copied).to.deep.equal(['const answer = 42;']);
    expect(button?.dataset['copyState']).to.equal('copied');
    expect(semanticLineSignature(line)).to.deep.equal(beforeSemanticSignature);
  });

  it('root 外の copy button を activate せず、targetId と copyValue の併用を error status にすること', () => {
    const root = document.createElement('article');
    root.innerHTML = `
      <template id="copy-source" data-code-copy-source>source</template>
      <span data-copy-control>
        <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-value="bad" data-copy-disabled-reason="no-js" aria-describedby="copy-status" disabled>bad</button>
        <span id="copy-status" data-copy-status></span>
      </span>
    `;
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.dataset['copyButton'] = 'true';
    document.body.append(root, outside);

    activateStaticCopyButtons(root);

    const invalid = root.querySelector<HTMLButtonElement>('[data-copy-button]');
    expect(invalid?.dataset['copyEnhanced']).to.equal('true');
    expect(invalid?.disabled).to.equal(true);
    expect(invalid?.dataset['copyState']).to.equal('error');
    expect(root.querySelector('#copy-status')?.textContent).to.equal('コピーできませんでした');
    expect(outside.dataset['copyEnhanced']).to.equal(undefined);
  });

  it('short-text / permalink の data-copy-value だけを success path として扱うこと', async () => {
    const copied: string[] = [];
    installClipboardMock((value) => {
      copied.push(value);
      return Promise.resolve();
    });

    const root = document.createElement('article');
    root.innerHTML = `
      <button type="button" data-copy-button data-copy-kind="short-text" data-copy-value="短文" data-copy-disabled-reason="no-js" disabled>short</button>
      <button type="button" data-copy-button data-copy-kind="permalink" data-copy-value="https://example.test/note" data-copy-disabled-reason="no-js" disabled>permalink</button>
      <button type="button" data-copy-button data-copy-value="bad" data-copy-disabled-reason="no-js" disabled>invalid</button>
    `;
    document.body.append(root);

    activateStaticCopyButtons(root);

    expect(root.querySelector<HTMLButtonElement>('[data-copy-value="短文"]')?.disabled).to.equal(
      false,
    );
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-copy-button]')) {
      button.click();
    }
    await Promise.resolve();

    expect(copied).to.deep.equal(['短文', 'https://example.test/note']);
    expect(
      root.querySelector<HTMLButtonElement>('[data-copy-value="bad"]')?.dataset['copyState'],
    ).to.equal('error');
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
        <button type="button" data-copy-button data-copy-target-id="missing" data-copy-disabled-reason="no-js" aria-describedby="copy-status" disabled>copy</button>
        <span id="copy-status" data-copy-status></span>
      </span>
      <span data-copy-control>
        <button type="button" data-copy-button data-copy-kind="code" data-copy-value="bad" data-copy-disabled-reason="no-js" aria-describedby="kind-status" disabled>copy</button>
        <span id="kind-status" data-copy-status></span>
      </span>
      <span data-copy-control>
        <template id="reject-source" data-code-copy-source>source</template>
        <button type="button" data-copy-button data-copy-target-id="reject-source" data-copy-disabled-reason="no-js" aria-describedby="reject-status" disabled>copy</button>
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
      expect(missing?.disabled).to.equal(true);
      expect(root.querySelector('#copy-status')?.textContent).to.equal('コピーできませんでした');
      expect(invalidKind?.dataset['copyState']).to.equal('error');
      expect(root.querySelector('#kind-status')?.textContent).to.equal('コピーできませんでした');
      expect(rejected?.disabled).to.equal(false);

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
        <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-disabled-reason="no-js" disabled>hidden</button>
      </span>
    `;
    document.body.append(root);

    activateStaticCopyButtons(root);
    expect(root.querySelector<HTMLButtonElement>('button[disabled]')?.disabled).to.equal(true);

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
        <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-disabled-reason="no-js" aria-describedby="copy-status" disabled>copy</button>
        <span id="copy-status" data-copy-status></span>
      </span>
    `;
    document.body.append(root);

    activateStaticCopyButtons(root);
    const button = root.querySelector<HTMLButtonElement>('[data-copy-button]');

    expect(button?.dataset['copyEnhanced']).to.equal('true');
    expect(button?.disabled).to.equal(true);
    expect(button?.dataset['copyState']).to.equal('error');
    expect(root.querySelector('#copy-status')?.textContent).to.equal('コピーできませんでした');
  });

  it('同一 button の連続操作では既存 reset timer を破棄して新しい timer に置換すること', async () => {
    let nextTimerId = 0;
    const callbacks = new Map<number, () => void>();
    const originalSetTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;
    window.setTimeout = ((handler: TimerHandler, timeout?: number) => {
      nextTimerId += 1;
      const id = nextTimerId;
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
    installClipboardMock(() => Promise.resolve());

    const root = document.createElement('article');
    root.innerHTML = `
      <template id="copy-source" data-code-copy-source>source</template>
      <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-disabled-reason="no-js" disabled>copy</button>
    `;
    document.body.append(root);

    try {
      activateStaticCopyButtons(root);
      const button = root.querySelector<HTMLButtonElement>('[data-copy-button]');

      button?.click();
      await Promise.resolve();
      button?.click();
      await Promise.resolve();

      expect(callbacks.has(1)).to.equal(false);
      expect(callbacks.has(2)).to.equal(true);
      expect(button?.dataset['copyState']).to.equal('copied');

      callbacks.get(1)?.();
      expect(button?.dataset['copyState']).to.equal('copied');

      callbacks.get(2)?.();
      expect(button?.dataset['copyState']).to.equal('idle');
    } finally {
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
    }
  });

  it('旧 copy / copy-error custom event を発火しないこと', async () => {
    const dispatched: string[] = [];
    installClipboardMock(() => Promise.resolve());

    const root = document.createElement('article');
    root.innerHTML = `
      <template id="copy-source" data-code-copy-source>source</template>
      <button type="button" data-copy-button data-copy-target-id="copy-source" data-copy-disabled-reason="no-js" disabled>copy</button>
    `;
    document.body.append(root);
    root.addEventListener('copy', () => {
      dispatched.push('copy');
    });
    root.addEventListener('copy-error', () => {
      dispatched.push('copy-error');
    });

    activateStaticCopyButtons(root);
    root.querySelector<HTMLButtonElement>('[data-copy-button]')?.click();
    await Promise.resolve();

    expect(dispatched).to.deep.equal([]);
  });
});
