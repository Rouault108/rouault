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
- sandbox iframe は \`allow-scripts\` のみ許可します
- author JS は \`allow-js\` 明示時だけ注入します
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
          >parent.postMessage({ source: 'preview-sandbox-author-js', caseId: 'enabled' }, '*');</template
        >
      </ui-preview-sandbox>
      <ui-preview-sandbox id="js-disabled-sandbox" title="JS disabled sandbox" height="160">
        <template data-preview-kind="html"><button class="demo">押す</button></template>
        <template data-preview-kind="js"
          >parent.postMessage({ source: 'preview-sandbox-author-js', caseId: 'disabled' }, '*');</template
        >
      </ui-preview-sandbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const enabledSandbox = getSandbox(canvasElement, 'js-enabled-sandbox');
    const disabledSandbox = getSandbox(canvasElement, 'js-disabled-sandbox');
    await Promise.all([enabledSandbox.updateComplete, disabledSandbox.updateComplete]);

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

export const SanitizationBoundary: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-preview-sandbox id="sanitize-sandbox" title="sanitize sandbox" height="160">
        <template data-preview-kind="html"
          >&lt;script&gt;parent.postMessage({ source: 'bad' }, '*');&lt;/script&gt;&lt;a href="javascript:alert(1)" onclick="alert(1)"&gt;危険&lt;/a&gt;&lt;iframe src="/evil"&gt;&lt;/iframe&gt;&lt;button style="background: red;"&gt;安全&lt;/button&gt;</template
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
    if (srcdoc.includes('<script>parent.postMessage({ source: \'bad\' }, \'*\');</script>')) {
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
        <ui-preview-sandbox id="integrated-sandbox" slot="preview" title="integrated sandbox" height="160">
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
