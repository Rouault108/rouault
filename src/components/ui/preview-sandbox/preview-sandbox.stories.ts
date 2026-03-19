import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
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

const meta: Meta<PreviewSandbox> = {
  title: 'Components/Preview Sandbox',
  component: 'ui-preview-sandbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
HTML/CSS/JS を isolated iframe で描画する preview 用コンポーネントです。

- payload は \`template[data-preview-kind]\` から受け取ります
- sandbox iframe は常に \`allow-scripts\` を含みます
- \`allow-js\` は author supplied JS の注入可否だけを表します
- \`allow-js="false"\` でも高さ同期 helper script のため \`allow-scripts\` は維持されます
- 追加 capability は \`allow-forms\` / \`allow-downloads\` / \`allow-pointer-lock\` / \`allow-popups\` で opt-in します
- \`allow-modals\` / \`allow-same-origin\` / \`allow-top-navigation*\` は公開しません
- \`ui-code-preview\` と組み合わせると isolated preview を構成できます
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
      <ui-preview-sandbox id="html-only-sandbox" title="HTML only sandbox" height="160">
        <template data-preview-kind="html"><button class="demo">押す</button></template>
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sandbox = getSandbox(canvasElement, 'html-only-sandbox');
    await sandbox.updateComplete;
    await waitFrame();

    const iframe = getIframe(sandbox);
    if (iframe.getAttribute('sandbox') !== 'allow-scripts') {
      throw new Error('iframe の sandbox は allow-scripts のみである必要があります');
    }
    if (iframe.getAttribute('title') !== 'HTML only sandbox') {
      throw new Error('iframe title が反映されていません');
    }

    const srcdoc = iframe.srcdoc;
    if (!srcdoc.includes('<button class="demo">押す</button>')) {
      throw new Error('HTML payload が srcdoc に反映されていません');
    }
    if (!srcdoc.includes("'ui-preview-sandbox'")) {
      throw new Error('高さ同期 bootstrap script が srcdoc に含まれていません');
    }
  },
};

export const AuthorJsOptIn: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-preview-sandbox id="js-enabled-sandbox" title="JS enabled sandbox" height="160" allow-js>
        <template data-preview-kind="html"><button class="demo">押す</button></template>
        <template data-preview-kind="js"
          >parent.postMessage({ source: 'preview-sandbox-author-js', caseId: 'enabled' },
          '*');</template
        >
      </ui-preview-sandbox>
      <ui-preview-sandbox id="js-disabled-sandbox" title="JS disabled sandbox" height="160">
        <template data-preview-kind="html"><button class="demo">押す</button></template>
        <template data-preview-kind="js"
          >parent.postMessage({ source: 'preview-sandbox-author-js', caseId: 'disabled' },
          '*');</template
        >
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const enabledSandbox = getSandbox(canvasElement, 'js-enabled-sandbox');
    const disabledSandbox = getSandbox(canvasElement, 'js-disabled-sandbox');
    await Promise.all([enabledSandbox.updateComplete, disabledSandbox.updateComplete]);

    const enabledIframe = getIframe(enabledSandbox);
    const disabledIframe = getIframe(disabledSandbox);

    if (enabledIframe.getAttribute('sandbox') !== 'allow-scripts') {
      throw new Error('allow-js ありでも sandbox token は allow-scripts のみである必要があります');
    }
    if (disabledIframe.getAttribute('sandbox') !== 'allow-scripts') {
      throw new Error(
        'allow-js なしでも helper script 用に allow-scripts を維持する必要があります',
      );
    }
    if (!disabledIframe.srcdoc.includes("'ui-preview-sandbox'")) {
      throw new Error('allow-js なしでも helper script が srcdoc に含まれている必要があります');
    }
    if (disabledIframe.srcdoc.includes("caseId: 'disabled'")) {
      throw new Error('allow-js なしの sandbox に author JS が srcdoc 注入されています');
    }

    const messages: string[] = [];
    const handleMessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }
      const payload = data as { source?: string; caseId?: string };
      if (payload.source === 'preview-sandbox-author-js' && typeof payload.caseId === 'string') {
        messages.push(payload.caseId);
      }
    };

    window.addEventListener('message', handleMessage);
    await wait(400);
    window.removeEventListener('message', handleMessage);

    if (!messages.includes('enabled')) {
      throw new Error('allow-js ありの author JS が実行されていません');
    }
    if (messages.includes('disabled')) {
      throw new Error('allow-js なしでも author JS が実行されています');
    }
  },
};

export const SandboxCapabilityTokens: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px; display: grid; gap: 1.5rem;">
      <ui-preview-sandbox id="sandbox-default" title="default sandbox" height="120">
        <template data-preview-kind="html"><button>default</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox
        id="sandbox-forms-downloads"
        title="forms and downloads sandbox"
        height="120"
        allow-forms
        allow-downloads
      >
        <template data-preview-kind="html"><button>forms-downloads</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox
        id="sandbox-pointer-popups"
        title="pointer lock and popups sandbox"
        height="120"
        allow-pointer-lock
        allow-popups
      >
        <template data-preview-kind="html"><button>pointer-popups</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox id="sandbox-js-only" title="js only sandbox" height="120" allow-js>
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

    if (defaultIframe.getAttribute('sandbox') !== 'allow-scripts') {
      throw new Error('デフォルト sandbox は allow-scripts のみである必要があります');
    }

    if (
      formsDownloadsIframe.getAttribute('sandbox') !== 'allow-scripts allow-forms allow-downloads'
    ) {
      throw new Error(
        'allow-forms / allow-downloads 指定時の sandbox token が期待値と一致しません',
      );
    }

    if (
      pointerPopupsIframe.getAttribute('sandbox') !==
      'allow-scripts allow-pointer-lock allow-popups'
    ) {
      throw new Error(
        'allow-pointer-lock / allow-popups 指定時の sandbox token が期待値と一致しません',
      );
    }

    if (jsOnlyIframe.getAttribute('sandbox') !== 'allow-scripts') {
      throw new Error(
        'allow-js は author supplied JS 注入フラグであり、sandbox token を増やしてはいけません',
      );
    }

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
      <ui-preview-sandbox id="sanitize-sandbox" title="sanitize sandbox" height="160">
        <template data-preview-kind="html"
          >&lt;script&gt;parent.postMessage({ source: 'bad' }, '*');&lt;/script&gt;&lt;a
          href="javascript:alert(1)" onclick="alert(1)"&gt;危険&lt;/a&gt;&lt;iframe
          src="/evil"&gt;&lt;/iframe&gt;&lt;button style="background:
          red;"&gt;安全&lt;/button&gt;</template
        >
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
          title="integrated sandbox"
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
      throw new Error('ui-code-preview の token 切替で sandbox 内 srcdoc が変化してはいけません');
    }
  },
};
