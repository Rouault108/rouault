import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import '../../src/components/ui/preview-sandbox/preview-sandbox.js';

type LitLikeElement = HTMLElement & {
  updateComplete?: Promise<unknown>;
};

type PreviewSandboxHost = LitLikeElement & {
  activationPolicy?: string;
  contentLayout?: string;
  height?: number;
  heightMode?: string;
  maxHeight?: number;
  activateHydration?: () => void;
  readonly _messageToken?: string;
  _handleWindowMessage?: (event: MessageEvent<unknown>) => void;
};

const waitForElement = async (element: LitLikeElement): Promise<void> => {
  await element.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
};

const waitForMutationFrame = async (element: LitLikeElement): Promise<void> => {
  await element.updateComplete;
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await element.updateComplete;
};

describe('ui-preview-sandbox contract', () => {
  it('content-layout は stage を既定として reflect し、runtime 列挙外値は property を保ったまま実効 stage として扱うこと', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox activation-policy="eager" iframe-title="Layout preview">
        <template data-preview-kind="html"><button>Push</button></template>
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const initialSrcdoc =
      sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc ?? '';
    expect(sandbox.contentLayout).to.equal('stage');
    expect(sandbox.getAttribute('content-layout')).to.equal('stage');
    expect(initialSrcdoc).to.contain('<body data-preview-content-layout="stage">');

    sandbox.contentLayout = 'unexpected';
    await waitForElement(sandbox);

    expect(sandbox.contentLayout).to.equal('unexpected');
    expect(sandbox.getAttribute('content-layout')).to.equal('unexpected');
    expect(sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc).to.equal(
      initialSrcdoc,
    );

    sandbox.contentLayout = 'flow';
    await waitForElement(sandbox);
    const flowSrcdoc = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc ?? '';
    expect(sandbox.getAttribute('content-layout')).to.equal('flow');
    expect(flowSrcdoc).to.contain('<body data-preview-content-layout="flow">');
    expect(flowSrcdoc).not.to.equal(initialSrcdoc);

    sandbox.contentLayout = 'flow';
    await waitForElement(sandbox);
    expect(sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc).to.equal(
      flowSrcdoc,
    );
  });

  it('srcdoc は author JS より前に body 直下の正規 content root を1個だけ持つこと', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox activation-policy="eager" iframe-title="Root preview" allow-js>
        <template data-preview-kind="html">
          <section>
            <ui-preview-content-root id="nested">Nested</ui-preview-content-root>
          </section>
        </template>
        <template data-preview-kind="js">document.body.dataset.authorScriptRan = 'true';</template>
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const srcdoc = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc ?? '';
    const previewDocument = new DOMParser().parseFromString(srcdoc, 'text/html');
    const directRoots = Array.from(previewDocument.body.children).filter(
      (child) => child.tagName.toLowerCase() === 'ui-preview-content-root',
    );
    const allRoots = previewDocument.querySelectorAll('ui-preview-content-root');

    expect(directRoots).to.have.length(1);
    expect(allRoots).to.have.length(2);
    expect(directRoots[0]?.querySelector('#nested')).to.not.equal(null);
    expect(previewDocument.body.firstElementChild).to.equal(directRoots[0]);
    expect(directRoots[0]?.nextElementSibling?.tagName).to.equal('SCRIPT');
    expect(srcdoc.indexOf('<ui-preview-content-root>')).to.be.lessThan(
      srcdoc.indexOf('document.body.dataset.authorScriptRan'),
    );
  });

  it('author CSS の後に shell だけを対象とする structural guard を配置すること', async () => {
    const authorCss = 'div { color: rgb(1 2 3); } html, body { display: block; }';
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox activation-policy="eager" iframe-title="Cascade preview">
        <template data-preview-kind="html"><div>Payload</div></template>
        <template data-preview-kind="css"
          >div { color: rgb(1 2 3); } html, body { display: block; }</template
        >
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const srcdoc = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc ?? '';
    const authorIndex = srcdoc.indexOf(authorCss);
    const guardIndex = srcdoc.indexOf('body[data-preview-content-layout]');

    expect(authorIndex).to.be.greaterThan(-1);
    expect(guardIndex).to.be.greaterThan(authorIndex);
    expect(srcdoc).to.contain('body > ui-preview-content-root');
    expect(srcdoc).not.to.contain('ui-preview-content-root div');
    expect(srcdoc).not.to.contain('ui-preview-content-root *');
  });

  it('fixed/auto/bounded-auto の高さ解決を content root 導入後も維持すること', async () => {
    const cases = [
      { heightMode: 'fixed', maxHeight: undefined, expectedHeight: 160 },
      { heightMode: 'auto', maxHeight: undefined, expectedHeight: 420 },
      { heightMode: 'bounded-auto', maxHeight: 300, expectedHeight: 300 },
    ] as const;

    for (const testCase of cases) {
      const sandbox = await fixture<PreviewSandboxHost>(html`
        <ui-preview-sandbox
          activation-policy="eager"
          iframe-title="Height preview"
          height="160"
          height-mode=${testCase.heightMode}
          max-height=${testCase.maxHeight ?? ''}
        >
          <template data-preview-kind="html"><div>Payload</div></template>
        </ui-preview-sandbox>
      `);
      await waitForElement(sandbox);

      const iframe = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe');
      expect(iframe).to.not.equal(null);
      expect(sandbox._messageToken).to.be.a('string');
      sandbox._handleWindowMessage?.({
        source: iframe?.contentWindow ?? null,
        data: {
          source: 'ui-preview-sandbox',
          token: sandbox._messageToken,
          height: 420,
        },
      } as MessageEvent<unknown>);
      await waitForElement(sandbox);

      const root = sandbox.shadowRoot?.querySelector<HTMLElement>('.root');
      expect(root?.style.getPropertyValue('--_ui-preview-sandbox-resolved-height').trim()).to.equal(
        `${String(testCase.expectedHeight)}px`,
      );
    }
  });

  it('activation-policy の既定値は visible で、列挙外の値は visible として扱うこと', async () => {
    const defaultSandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox data-hydration-trigger="interaction"></ui-preview-sandbox>
    `);

    await waitForElement(defaultSandbox);

    expect(defaultSandbox.activationPolicy).to.equal('visible');
    expect(defaultSandbox.getAttribute('activation-policy')).to.equal('visible');

    const invalidSandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox activation-policy="unexpected" iframe-title="Invalid fallback">
        <template data-preview-kind="html"><button>Push</button></template>
      </ui-preview-sandbox>
    `);

    await waitForElement(invalidSandbox);

    const placeholder = invalidSandbox.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    expect(placeholder).to.not.equal(null);
    expect(placeholder?.getAttribute('role')).to.equal('status');
    expect(placeholder?.textContent?.trim()).to.equal('プレビューを読み込んでいます');
    expect(invalidSandbox.shadowRoot?.querySelector('iframe')).to.equal(null);
  });

  it('scheduler visible/eager 経路では activateHydration() 後に iframe を生成すること', async () => {
    const visibleSandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox data-hydration-trigger="visible" iframe-title="Visible preview">
        <template data-preview-kind="html"><button>Visible</button></template>
      </ui-preview-sandbox>
    `);
    visibleSandbox.activateHydration?.();
    await waitForElement(visibleSandbox);

    expect(
      visibleSandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc,
    ).to.contain('<button>Visible</button>');

    const eagerSandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="eager"
        data-hydration-trigger="initial"
        iframe-title="Eager preview"
      >
        <template data-preview-kind="html"><button>Eager</button></template>
      </ui-preview-sandbox>
    `);
    eagerSandbox.activateHydration?.();
    await waitForElement(eagerSandbox);

    expect(eagerSandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc).to.contain(
      '<button>Eager</button>',
    );
  });

  it('scheduler interaction 経路では manual preview も activateHydration() 後に iframe を生成すること', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="manual"
        data-hydration-trigger="interaction"
        iframe-title="Manual scheduler preview"
      >
        <template data-preview-kind="html"><button>Push</button></template>
      </ui-preview-sandbox>
    `);

    sandbox.activateHydration?.();
    await waitForElement(sandbox);

    expect(sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc).to.contain(
      '<button>Push</button>',
    );
  });

  it('manual の未起動時は native button を描画し、focus では起動せず click で起動すること', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="manual"
        data-hydration-trigger="interaction"
        iframe-title="Manual preview"
      >
        <template data-preview-kind="html"><button>Push</button></template>
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const shadowRoot = sandbox.shadowRoot;
    expect(shadowRoot).to.not.equal(null);

    const placeholder = shadowRoot?.querySelector<HTMLButtonElement>('button.placeholder');
    expect(placeholder).to.not.equal(null);
    expect(placeholder?.textContent?.trim()).to.equal('プレビューを表示');
    expect(placeholder?.getAttribute('aria-label')).to.contain('表示');
    expect(shadowRoot?.querySelector('iframe')).to.equal(null);

    placeholder?.focus();
    await waitForElement(sandbox);
    expect(shadowRoot?.querySelector('iframe')).to.equal(null);

    placeholder?.click();
    await waitForElement(sandbox);

    const iframe = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe');
    expect(iframe).to.not.equal(null);
    expect(iframe?.getAttribute('title')).to.equal('Manual preview');
    expect(iframe?.srcdoc).to.contain('<button>Push</button>');
  });

  it('manual allow-js と manual-only capability は実行文言を使うこと', async () => {
    const allowJsSandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="manual"
        data-hydration-trigger="interaction"
        iframe-title="Manual JS preview"
        allow-js
      >
        <template data-preview-kind="html"><button>Push</button></template>
        <template data-preview-kind="js">console.log('sandbox');</template>
      </ui-preview-sandbox>
    `);
    await waitForElement(allowJsSandbox);
    const allowJsButton =
      allowJsSandbox.shadowRoot?.querySelector<HTMLButtonElement>('button.placeholder');
    expect(allowJsButton?.textContent?.trim()).to.equal('プレビューを実行');
    expect(allowJsButton?.getAttribute('aria-label')).to.contain('実行');

    const manualOnlySandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="manual"
        data-hydration-trigger="interaction"
        iframe-title="Manual forms preview"
        allow-forms
      >
        <template data-preview-kind="html">
          <form><button>Send</button></form>
        </template>
      </ui-preview-sandbox>
    `);
    await waitForElement(manualOnlySandbox);
    const manualOnlyButton =
      manualOnlySandbox.shadowRoot?.querySelector<HTMLButtonElement>('button.placeholder');
    expect(manualOnlyButton?.textContent?.trim()).to.equal('プレビューを実行');
    expect(manualOnlyButton?.getAttribute('aria-label')).to.contain('実行');
  });

  it('manual click 前に hydration plumbing が未初期化でも template mutation 追従が機能すること', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="manual"
        data-hydration-trigger="interaction"
        iframe-title="Mutation preview"
      >
        <template data-preview-kind="html"><button>Before</button></template>
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    sandbox.shadowRoot?.querySelector<HTMLButtonElement>('button.placeholder')?.click();
    await waitForElement(sandbox);

    const iframe = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe');
    expect(iframe).to.not.equal(null);
    expect(iframe?.srcdoc).to.contain('<button>Before</button>');

    const template = sandbox.querySelector<HTMLTemplateElement>(
      'template[data-preview-kind="html"]',
    );
    expect(template).to.not.equal(null);
    if (template) {
      template.content.replaceChildren(document.createElement('strong'));
      const strong = template.content.querySelector('strong');
      if (strong) {
        strong.textContent = 'After';
      }
    }

    await waitForMutationFrame(sandbox);

    expect(sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe')?.srcdoc).to.contain(
      '<strong>After</strong>',
    );
  });

  it('manual+visible/manual+initial は activateHydration() 後も iframe を生成しないこと', async () => {
    for (const trigger of ['visible', 'initial']) {
      const sandbox = await fixture<PreviewSandboxHost>(html`
        <ui-preview-sandbox
          activation-policy="manual"
          data-hydration-trigger=${trigger}
          iframe-title="Robust preview"
        >
          <template data-preview-kind="html"><button>Push</button></template>
        </ui-preview-sandbox>
      `);

      sandbox.activateHydration?.();
      await waitForElement(sandbox);

      expect(sandbox.shadowRoot?.querySelector('iframe')).to.equal(null);
    }
  });

  it('非 manual status は「読み込んでいます」を支援技術上も残すこと', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox data-hydration-trigger="visible" iframe-title="Loading preview">
        <template data-preview-kind="html"><button>Push</button></template>
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const status = sandbox.shadowRoot?.querySelector<HTMLElement>('[role="status"]');
    expect(status?.textContent?.trim()).to.equal('プレビューを読み込んでいます');
    expect(status?.getAttribute('aria-label')).to.contain('読み込んでいます');
  });

  it('text-encoded HTML payload は activation 後に実 HTML として iframe へ渡すこと', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="manual"
        data-hydration-trigger="interaction"
        iframe-title="Text encoded preview"
      >
        <template data-preview-kind="html"
          >&lt;button class="demo-button"&gt;押す&lt;/button&gt;</template
        >
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const placeholder = sandbox.shadowRoot?.querySelector<HTMLButtonElement>('button.placeholder');
    placeholder?.click();
    await waitForElement(sandbox);

    const iframe = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe');
    expect(iframe).to.not.equal(null);
    expect(iframe?.srcdoc).to.contain('<button class="demo-button">押す</button>');
    expect(iframe?.srcdoc).not.to.contain('&lt;button');
  });

  it('手書き DOM fragment 形式の HTML payload を維持すること', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="manual"
        data-hydration-trigger="interaction"
        iframe-title="DOM fragment preview"
      >
        <template data-preview-kind="html"><button class="demo-button">押す</button></template>
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const placeholder = sandbox.shadowRoot?.querySelector<HTMLButtonElement>('button.placeholder');
    placeholder?.click();
    await waitForElement(sandbox);

    const iframe = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe');
    expect(iframe).to.not.equal(null);
    expect(iframe?.srcdoc).to.contain('<button class="demo-button">押す</button>');
  });
});
