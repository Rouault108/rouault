import { describe, expect, it } from 'vitest';
import type { HastNode, HastProperties } from '../../build/rehype/hast-utils.js';
import { HydrationScheduler } from '../../src/client/hydration/scheduler.js';
import { activatePreviewSandbox } from '../../src/client/post-hydrate/preview-sandbox-enhancer.js';
import { fixtureAbortController, requireFixtureValue } from './harness/browser-fixture.js';
import { element, text, nativeNoteFixture } from './harness/native-note-fixture.js';
import { waitForCondition } from './harness/browser-test-utilities.js';

const payload = (kind: string, children: HastNode[]): HastNode => ({
  ...element('template', { 'data-preview-kind': kind }),
  content: { type: 'root', children },
});
const makeSandbox = (
  properties: HastProperties = {},
  children: HastNode[] = [payload('html', [element('button', {}, [text('Push')])])],
) =>
  nativeNoteFixture(
    element('ui-preview-sandbox', { 'iframe-title': 'Preview', ...properties }, children),
  );
const activate = (root: HTMLElement) => {
  const controller = fixtureAbortController(root);
  activatePreviewSandbox(root, controller.signal);
  return controller;
};
const frame = (root: HTMLElement): HTMLIFrameElement => {
  const result = root.querySelector('iframe');
  if (!result) throw new Error('iframe missing');
  return result;
};
const resize = (
  iframe: HTMLIFrameElement,
  height: number,
  validToken = true,
  source: Window | null = iframe.contentWindow,
) => {
  const token = /token: "([^"]+)"/.exec(iframe.srcdoc)?.[1];
  if (!token) throw new Error('helper message token missing');
  const event = new MessageEvent('message', {
    data: {
      source: 'ui-preview-sandbox',
      token: validToken ? token : 'wrong-token',
      height,
    },
  });
  // Firefoxはopaque-origin WindowProxyをconstructor引数へ渡せないため、合成eventへ明示する。
  Object.defineProperty(event, 'source', { value: source });
  window.dispatchEvent(event);
};

describe('native preview sandbox contract', () => {
  it('静的payloadはinertで、正規metadataとno-JS説明を持つ', async () => {
    const root = await makeSandbox({ 'activation-policy': 'manual' });
    expect(root.querySelector('iframe')).toBeNull();
    expect(root.querySelector('template')?.content.querySelector('button')?.textContent).toBe(
      'Push',
    );
    expect(root.dataset['sandboxContentLayout']).toBe('stage');
    expect(root.dataset['hydrationTrigger']).toBe('interaction');
    expect(root.textContent).toContain('JavaScript');
    expect(root.querySelector('button')?.textContent).toBe('プレビューを表示');
    expect(root.querySelector('button')?.getAttribute('aria-label')).toBe(
      'プレビューを表示: Preview',
    );
  });

  it.each(['allow-js', 'allow-forms', 'allow-downloads', 'allow-pointer-lock', 'allow-popups'])(
    '%sのmanual文言とtokenを維持する',
    async (capability) => {
      const root = await makeSandbox({ 'activation-policy': 'manual', [capability]: true });
      expect(root.querySelector('button')?.textContent).toBe('プレビューを実行');
      activate(root);
      const tokens = frame(root).sandbox;
      expect(tokens.contains('allow-scripts')).toBe(true);
      expect(tokens.contains('allow-same-origin')).toBe(false);
      if (capability !== 'allow-js') expect(tokens.contains(capability)).toBe(true);
    },
  );

  it('schedulerだけがmanual初回起動を所有し、focusとpointerdownでは起動しない', async () => {
    const root = await makeSandbox({ 'activation-policy': 'manual' });
    requireFixtureValue(root.parentElement).setAttribute('data-hydration-scope', 'note');
    const scheduler = new HydrationScheduler();
    try {
      await scheduler.hydrateContent(requireFixtureValue(root.parentElement));
      const button = requireFixtureValue(root.querySelector('button'));
      button.focus();
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await Promise.resolve();
      expect(root.querySelector('iframe')).toBeNull();
      button.click();
      await waitForCondition(
        () => root.querySelector('iframe') !== null,
        'manual activation missing',
      );
      expect(frame(root).srcdoc).toContain('<button>Push</button>');
    } finally {
      await scheduler.hydrateContent(document.createElement('div'));
    }
    expect(root.querySelector('iframe')).toBeNull();
  });

  it.each(['eager', 'visible'])('%sはscheduler経由で起動する', async (activation) => {
    const root = await makeSandbox({ 'activation-policy': activation });
    requireFixtureValue(root.parentElement).setAttribute('data-hydration-scope', 'note');
    const scheduler = new HydrationScheduler();
    try {
      await scheduler.hydrateContent(requireFixtureValue(root.parentElement));
      await waitForCondition(
        () => root.querySelector('iframe') !== null,
        'scheduler activation missing',
      );
      expect(frame(root).title).toBe('Preview');
    } finally {
      await scheduler.hydrateContent(document.createElement('div'));
    }
  });

  it.each([
    ['fixed', undefined, 160],
    ['auto', undefined, 420],
    ['bounded-auto', 300, 300],
  ] as const)('%sの高さとmessage source/token検証を維持する', async (mode, maximum, expected) => {
    const root = await makeSandbox({ height: '160', 'height-mode': mode, 'max-height': maximum });
    activate(root);
    const iframe = frame(root);
    resize(iframe, 420, false);
    resize(iframe, 420, true, window);
    resize(iframe, Number.POSITIVE_INFINITY);
    resize(iframe, -1);
    expect(iframe.style.height).toBe('160px');
    resize(iframe, 419.1);
    expect(iframe.style.height).toBe(`${expected}px`);
  });

  it('payloadだけを再構築しmetadata mutationを入力にしない、abort後は破棄する', async () => {
    const root = await makeSandbox();
    const lifetime = activate(root);
    const iframe = frame(root);
    const original = iframe.srcdoc;
    root.dataset['sandboxContentLayout'] = 'flow';
    root.dataset['sandboxAllowJs'] = '';
    root.dataset['sandboxBaseUrl'] = 'https://changed.invalid/';
    await Promise.resolve();
    expect(iframe.srcdoc).toBe(original);
    const template = requireFixtureValue(root.querySelector('template'));
    const strong = document.createElement('strong');
    strong.textContent = 'After';
    template.content.replaceChildren(strong);
    await waitForCondition(
      () => iframe.srcdoc.includes('<strong>After</strong>'),
      'payload mutation missing',
    );
    expect(frame(root)).toBe(iframe);
    expect(iframe.srcdoc).toContain('data-preview-content-layout="stage"');
    expect(iframe.srcdoc).not.toContain('https://changed.invalid/');
    lifetime.abort();
    expect(root.querySelector('iframe')).toBeNull();
    expect(root.querySelector<HTMLElement>('[data-preview-sandbox-placeholder]')?.hidden).toBe(
      false,
    );
    template.content.replaceChildren(document.createTextNode('Late'));
    resize(iframe, 900);
    await Promise.resolve();
    expect(root.querySelector('iframe')).toBeNull();
  });

  it.each([false, true])(
    'helperとauthor JSを分離し、危険なpayloadを除去する (allow-js=%s)',
    async (allowJs) => {
      const root = await makeSandbox({ 'allow-js': allowJs }, [
        payload('html', [
          text(
            '<base href="https://evil.invalid/"><script>bad()</script><iframe></iframe><a href="javascript:bad()" onclick="bad()">Safe</a><img src="data:text/html,bad">',
          ),
        ]),
        payload('js', [text('document.body.dataset.authorScriptRan = "true";')]),
        payload('css', [text('div { color: rgb(1 2 3); }')]),
      ]);
      activate(root);
      const srcdoc = frame(root).srcdoc;
      const doc = new DOMParser().parseFromString(srcdoc, 'text/html');
      expect(frame(root).sandbox.value).toBe('allow-scripts');
      expect(doc.querySelectorAll('base')).toHaveLength(1);
      expect(doc.querySelector('base')?.href).toBe(document.baseURI);
      expect(doc.querySelector('iframe')).toBeNull();
      expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false);
      expect(doc.querySelector('a')?.hasAttribute('onclick')).toBe(false);
      expect(doc.querySelector('img')?.hasAttribute('src')).toBe(false);
      expect(srcdoc).not.toContain('bad()');
      expect(srcdoc.includes('document.body.dataset.authorScriptRan')).toBe(allowJs);
      expect(srcdoc).toContain('parent.postMessage');
      expect(doc.body.firstElementChild?.localName).toBe('ui-preview-content-root');
      expect(srcdoc.indexOf('body[data-preview-content-layout]')).toBeGreaterThan(
        srcdoc.indexOf('div { color: rgb(1 2 3); }'),
      );
    },
  );

  it('text encodedとDOM fragmentのpayloadを同じHTMLとして渡す', async () => {
    for (const children of [
      [text('<button class="demo">押す</button>')],
      [element('button', { className: ['demo'] }, [text('押す')])],
    ]) {
      const root = await makeSandbox({}, [payload('html', children)]);
      activate(root);
      expect(frame(root).srcdoc).toContain('<button class="demo">押す</button>');
      expect(frame(root).srcdoc).not.toContain('&lt;button');
    }
  });
});
