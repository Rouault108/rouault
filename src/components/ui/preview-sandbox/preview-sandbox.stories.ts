import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  SHARED_SANDBOX_BUTTON_EXAMPLE,
} from '../../../../examples/manifests/testing-examples.js';
import buttonCss from '../../../../examples/snippets/sandbox/button.css?raw';
import buttonHtml from '../../../../examples/snippets/sandbox/button.html?raw';
import buttonJs from '../../../../examples/snippets/sandbox/button.js?raw';
import './preview-sandbox';
import '../code-preview/code-preview';
import '../codeblock/codeblock';
import type { PreviewSandbox } from './preview-sandbox';
import type { CodePreview } from '../code-preview/code-preview';

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const waitFor = async (predicate: () => boolean, timeoutMs = 1200): Promise<void> => {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await wait(40);
  }
  throw new Error('待機条件が timeout しました');
};

const getSandbox = (canvasElement: Element, id: string): PreviewSandbox => {
  const sandbox = canvasElement.querySelector<PreviewSandbox>(`#${id}`);
  if (!sandbox) {
    throw new Error(`ui-preview-sandbox#${id} が見つかりません`);
  }
  return sandbox;
};

const getIframe = (sandbox: PreviewSandbox): HTMLIFrameElement => {
  const iframe = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe');
  if (!(iframe instanceof HTMLIFrameElement)) {
    throw new Error('iframe が見つかりません');
  }
  return iframe;
};

const getPreview = (canvasElement: Element, id: string): CodePreview => {
  const preview = canvasElement.querySelector<CodePreview>(`#${id}`);
  if (!preview) {
    throw new Error(`ui-code-preview#${id} が見つかりません`);
  }
  return preview;
};

const getPreviewFrame = (preview: CodePreview): HTMLElement => {
  const frame = preview.shadowRoot?.querySelector<HTMLElement>('.preview-frame');
  if (!frame) {
    throw new Error('.preview-frame が見つかりません');
  }
  return frame;
};

const getSandboxTokenSet = (iframe: HTMLIFrameElement): Set<string> =>
  new Set(
    (iframe.getAttribute('sandbox') ?? '')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );

const expectSandboxTokens = (iframe: HTMLIFrameElement, expectedTokens: string[]): void => {
  const actualTokens = getSandboxTokenSet(iframe);
  const expectedSet = new Set(expectedTokens);

  if (actualTokens.size !== expectedSet.size) {
    throw new Error(`sandbox token 数が一致しません: ${[...actualTokens].join(', ')}`);
  }

  for (const token of expectedSet) {
    if (!actualTokens.has(token)) {
      throw new Error(`sandbox token ${token} が不足しています`);
    }
  }
};

const getIframeHeight = (sandbox: PreviewSandbox): number =>
  Math.round(getIframe(sandbox).getBoundingClientRect().height);

const meta: Meta<PreviewSandbox> = {
  title: 'Components/Preview Sandbox',
  component: 'ui-preview-sandbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
HTML/CSS/JS を \`srcdoc\` の sandboxed iframe へ閉じ込めて描画する preview 用コンポーネントです。

- payload は直下子の \`template[data-preview-kind]\` からだけ受け取ります
- iframe の baseline capability は常に \`allow-scripts\` です
- \`allow-js\` は author JS の注入可否だけを制御します
- \`iframe-title\` / \`base-url\` / \`activation-policy\` / \`height-mode\` / \`max-height\` を公開入力として扱います
- opt-in capability は \`allow-forms\` / \`allow-downloads\` / \`allow-pointer-lock\` / \`allow-popups\` だけを公開します
- 上位 UI の状態変更では \`srcdoc\` を不用意に再生成しません
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<PreviewSandbox>;

export const HtmlOnly: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-preview-sandbox
        id="html-only-sandbox"
        iframe-title="${SHARED_SANDBOX_BUTTON_EXAMPLE.iframeTitle}"
        height="160"
        base-url="https://example.com/examples/"
      >
        <template data-preview-kind="html">${buttonHtml}</template>
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sandbox = getSandbox(canvasElement, 'html-only-sandbox');
    await sandbox.updateComplete;
    await waitFrame();

    const iframe = getIframe(sandbox);
    expectSandboxTokens(iframe, ['allow-scripts']);

    if (iframe.getAttribute('title') !== 'HTML only sandbox') {
      throw new Error('iframe-title が iframe title へ反映されていません');
    }

    const srcdoc = iframe.srcdoc;
    if (!srcdoc.includes(buttonHtml.trim())) {
      throw new Error('HTML payload が srcdoc に反映されていません');
    }
    if (!srcdoc.includes('<base href="https://example.com/examples/">')) {
      throw new Error('base-url が preview 文書へ反映されていません');
    }
    if (!srcdoc.includes("'ui-preview-sandbox'")) {
      throw new Error('helper script が srcdoc に含まれていません');
    }
  },
};

export const AuthorJsOptIn: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-preview-sandbox
        id="js-enabled-sandbox"
        iframe-title="${SHARED_SANDBOX_BUTTON_EXAMPLE.iframeTitle}"
        height="160"
        allow-js
      >
        <template data-preview-kind="html">${buttonHtml}</template>
        <template data-preview-kind="css">${buttonCss}</template>
        <template data-preview-kind="js">${buttonJs}</template>
      </ui-preview-sandbox>
      <ui-preview-sandbox
        id="js-disabled-sandbox"
        iframe-title="${SHARED_SANDBOX_BUTTON_EXAMPLE.iframeTitle}"
        height="160"
      >
        <template data-preview-kind="html">${buttonHtml}</template>
        <template data-preview-kind="css">${buttonCss}</template>
        <template data-preview-kind="js">${buttonJs}</template>
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const enabledSandbox = getSandbox(canvasElement, 'js-enabled-sandbox');
    const disabledSandbox = getSandbox(canvasElement, 'js-disabled-sandbox');
    await Promise.all([enabledSandbox.updateComplete, disabledSandbox.updateComplete]);
    await waitFrame();

    const enabledIframe = getIframe(enabledSandbox);
    const disabledIframe = getIframe(disabledSandbox);

    expectSandboxTokens(enabledIframe, ['allow-scripts']);
    expectSandboxTokens(disabledIframe, ['allow-scripts']);

    if (!disabledIframe.srcdoc.includes("'ui-preview-sandbox'")) {
      throw new Error('allow-js なしでも helper script が srcdoc に含まれている必要があります');
    }
    if (disabledIframe.srcdoc.includes(buttonJs.trim())) {
      throw new Error('allow-js なしの sandbox に author JS が注入されています');
    }

    await wait(200);

    const enabledDoc = enabledIframe.contentWindow?.document;
    const disabledDoc = disabledIframe.contentWindow?.document;
    const enabledButton = enabledDoc?.querySelector<HTMLButtonElement>('.demo-button');
    const disabledButton = disabledDoc?.querySelector<HTMLButtonElement>('.demo-button');
    enabledButton?.click();
    disabledButton?.click();
    await wait(100);

    if (!enabledButton?.style.backgroundColor) {
      throw new Error('allow-js ありの author JS が実行されていません');
    }
    if (disabledButton?.style.backgroundColor) {
      throw new Error('allow-js なしでも author JS が実行されています');
    }
  },
};

export const SandboxCapabilityTokens: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px; display: grid; gap: 1.5rem;">
      <ui-preview-sandbox id="sandbox-default" iframe-title="default sandbox" height="120">
        <template data-preview-kind="html"><button>default</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox
        id="sandbox-forms-downloads"
        iframe-title="forms and downloads sandbox"
        height="120"
        allow-forms
        allow-downloads
      >
        <template data-preview-kind="html"><button>forms-downloads</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox
        id="sandbox-pointer-popups"
        iframe-title="pointer lock and popups sandbox"
        height="120"
        allow-pointer-lock
        allow-popups
      >
        <template data-preview-kind="html"><button>pointer-popups</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox id="sandbox-js-only" iframe-title="js only sandbox" height="120" allow-js>
        <template data-preview-kind="html"><button>js-only</button></template>
        <template data-preview-kind="js">window.__previewSandboxJsOnly = true;</template>
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultSandbox = getSandbox(canvasElement, 'sandbox-default');
    const formsDownloadsSandbox = getSandbox(canvasElement, 'sandbox-forms-downloads');
    const pointerPopupsSandbox = getSandbox(canvasElement, 'sandbox-pointer-popups');
    const jsOnlySandbox = getSandbox(canvasElement, 'sandbox-js-only');

    await Promise.all([
      defaultSandbox.updateComplete,
      formsDownloadsSandbox.updateComplete,
      pointerPopupsSandbox.updateComplete,
      jsOnlySandbox.updateComplete,
    ]);
    await waitFrame();

    const defaultIframe = getIframe(defaultSandbox);
    const formsDownloadsIframe = getIframe(formsDownloadsSandbox);
    const pointerPopupsIframe = getIframe(pointerPopupsSandbox);
    const jsOnlyIframe = getIframe(jsOnlySandbox);

    expectSandboxTokens(defaultIframe, ['allow-scripts']);
    expectSandboxTokens(formsDownloadsIframe, ['allow-scripts', 'allow-forms', 'allow-downloads']);
    expectSandboxTokens(pointerPopupsIframe, [
      'allow-scripts',
      'allow-pointer-lock',
      'allow-popups',
    ]);
    expectSandboxTokens(jsOnlyIframe, ['allow-scripts']);

    const jsOnlySrcdoc = jsOnlyIframe.srcdoc;
    if (!jsOnlySrcdoc.includes('window.__previewSandboxJsOnly = true;')) {
      throw new Error('allow-js ありの author JS が srcdoc に注入されていません');
    }

    const defaultSrcdoc = defaultIframe.srcdoc;
    if (defaultSrcdoc.includes('window.__previewSandboxJsOnly = true;')) {
      throw new Error('allow-js なしの sandbox に author JS が注入されています');
    }
  },
};

export const SanitizationBoundary: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-preview-sandbox id="sanitize-sandbox" iframe-title="sanitize sandbox" height="160">
        <template data-preview-kind="html">
          <script>
            parent.postMessage({ source: 'bad' }, '*');
          </script>
          <img src="javascript:alert(1)" alt="危険" onclick="alert(1)" />
          <iframe src="/evil" title="dangerous iframe"></iframe>
          <button style="background: red;">安全</button>
        </template>
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sandbox = getSandbox(canvasElement, 'sanitize-sandbox');
    await sandbox.updateComplete;
    await waitFrame();

    const iframe = getIframe(sandbox);
    const srcdoc = iframe.srcdoc;
    if (srcdoc.includes("<script>parent.postMessage({ source: 'bad' }, '*');</script>")) {
      throw new Error('危険な script 要素が除去されていません');
    }
    if (srcdoc.includes('onclick=')) {
      throw new Error('on* 属性が除去されていません');
    }
    if (srcdoc.includes('javascript:alert(1)')) {
      throw new Error('危険な URL が除去されていません');
    }
    if (srcdoc.includes('<iframe src="/evil"></iframe>')) {
      throw new Error('危険な iframe 要素が除去されていません');
    }
    if (!srcdoc.includes('<button') || !srcdoc.includes('安全</button>')) {
      throw new Error('安全な要素が保持されていません');
    }
  },
};

export const HeightBehavior: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px; display: grid; gap: 1.5rem;">
      <ui-preview-sandbox
        id="height-fixed"
        iframe-title="fixed height sandbox"
        height="120"
        height-mode="fixed"
        allow-js
      >
        <template data-preview-kind="html"><div class="box">fixed</div></template>
        <template data-preview-kind="css"
          >body { padding: 8px; } .box { height: 48px; background: rgb(238 242 255); }</template
        >
        <template data-preview-kind="js"
          >setTimeout(() => { const box = document.querySelector('.box'); if (box instanceof
          HTMLElement) { box.style.height = '260px'; } }, 80);</template
        >
      </ui-preview-sandbox>

      <ui-preview-sandbox
        id="height-auto"
        iframe-title="auto height sandbox"
        height="120"
        height-mode="auto"
        allow-js
      >
        <template data-preview-kind="html"><div class="box">auto</div></template>
        <template data-preview-kind="css"
          >body { padding: 8px; } .box { height: 48px; background: rgb(236 253 245); }</template
        >
        <template data-preview-kind="js"
          >setTimeout(() => { const box = document.querySelector('.box'); if (box instanceof
          HTMLElement) { box.style.height = '260px'; } }, 80);</template
        >
      </ui-preview-sandbox>

      <ui-preview-sandbox
        id="height-bounded"
        iframe-title="bounded height sandbox"
        height="120"
        height-mode="bounded-auto"
        max-height="180"
        allow-js
      >
        <template data-preview-kind="html"><div class="box">bounded</div></template>
        <template data-preview-kind="css"
          >body { padding: 8px; } .box { height: 48px; background: rgb(254 249 195); }</template
        >
        <template data-preview-kind="js"
          >setTimeout(() => { const box = document.querySelector('.box'); if (box instanceof
          HTMLElement) { box.style.height = '260px'; } }, 80);</template
        >
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fixedSandbox = getSandbox(canvasElement, 'height-fixed');
    const autoSandbox = getSandbox(canvasElement, 'height-auto');
    const boundedSandbox = getSandbox(canvasElement, 'height-bounded');
    await Promise.all([
      fixedSandbox.updateComplete,
      autoSandbox.updateComplete,
      boundedSandbox.updateComplete,
    ]);

    await waitFor(() => getIframeHeight(autoSandbox) >= 180);
    await waitFrame();

    const fixedHeight = getIframeHeight(fixedSandbox);
    const autoHeight = getIframeHeight(autoSandbox);
    const boundedHeight = getIframeHeight(boundedSandbox);

    if (fixedHeight !== 120) {
      throw new Error(`fixed 高さは 120px のままである必要があります: ${String(fixedHeight)}`);
    }
    if (autoHeight < 180) {
      throw new Error(`auto 高さが内容高へ追従していません: ${String(autoHeight)}`);
    }
    if (boundedHeight !== 180) {
      throw new Error(`bounded-auto 高さが max-height へ収束していません: ${String(boundedHeight)}`);
    }
  },
};

export const NonDestructiveUpdates: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-preview-sandbox
        id="nondestructive-sandbox"
        iframe-title="before update"
        height="120"
        height-mode="auto"
        allow-js
      >
        <template data-preview-kind="html"><div>non-destructive</div></template>
        <template data-preview-kind="js"
          >setTimeout(() => { parent.postMessage({ source: 'preview-sandbox-nondestructive',
          phase: 'boot' }, '*'); }, 150);</template
        >
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sandbox = getSandbox(canvasElement, 'nondestructive-sandbox');
    await sandbox.updateComplete;
    await waitFrame();

    const iframe = getIframe(sandbox);
    const initialSrcdoc = iframe.srcdoc;
    const phases: string[] = [];
    const handleMessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }
      const payload = data as { source?: string; phase?: string };
      if (
        payload.source === 'preview-sandbox-nondestructive' &&
        typeof payload.phase === 'string'
      ) {
        phases.push(payload.phase);
      }
    };

    window.addEventListener('message', handleMessage);
    await waitFor(() => phases.filter((phase) => phase === 'boot').length === 1, 1000);

    sandbox.iframeTitle = 'after update';
    sandbox.height = 200;
    sandbox.heightMode = 'fixed';
    await sandbox.updateComplete;
    await wait(300);
    window.removeEventListener('message', handleMessage);

    if (phases.filter((phase) => phase === 'boot').length !== 1) {
      throw new Error('iframeTitle / 高さ変更が author JS の再実行を起こしています');
    }
    if (iframe.srcdoc !== initialSrcdoc) {
      throw new Error('iframeTitle / 高さ更新で srcdoc が再生成されています');
    }
    if (getIframeHeight(sandbox) !== 200) {
      throw new Error('非破壊更新後の表示高さが反映されていません');
    }
  },
};

export const CodePreviewIntegration: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        id="sandbox-code-preview"
        controls="viewport theme"
        preview-viewport="full"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <ui-preview-sandbox
          id="integrated-sandbox"
          slot="preview"
          iframe-title="integrated sandbox"
          height="160"
        >
          <template data-preview-kind="html"><button class="demo">押す</button></template>
          <template data-preview-kind="css">button { color: rgb(12 12 12); }</template>
        </ui-preview-sandbox>
        <ui-code-block filename="button.html" lang="html">
          <pre><code>&lt;button class="demo"&gt;押す&lt;/button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const preview = getPreview(canvasElement, 'sandbox-code-preview');
    const sandbox = getSandbox(canvasElement, 'integrated-sandbox');
    await Promise.all([preview.updateComplete, sandbox.updateComplete]);
    await waitFrame();

    const iframe = getIframe(sandbox);
    const beforeSrcdoc = iframe.srcdoc;
    const beforeWidth = Math.round(getPreviewFrame(preview).getBoundingClientRect().width);

    preview.previewViewport = 'mobile';
    preview.previewTheme = 'dark';
    await preview.updateComplete;
    await waitFrame();

    const afterWidth = Math.round(getPreviewFrame(preview).getBoundingClientRect().width);
    if (afterWidth >= beforeWidth) {
      throw new Error('viewport 切替後も preview frame 幅が縮んでいません');
    }
    if (iframe.srcdoc !== beforeSrcdoc) {
      throw new Error('ui-code-preview の state 変更で sandbox 内 srcdoc が変化してはいけません');
    }
  },
};
