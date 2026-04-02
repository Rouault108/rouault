import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/preview-sandbox/preview-sandbox.js';

type LitLikeElement = HTMLElement & {
  updateComplete?: Promise<unknown>;
};

type PreviewSandboxHost = LitLikeElement & {
  activationPolicy?: string;
};

const waitForElement = async (element: LitLikeElement): Promise<void> => {
  await element.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
};

describe('ui-preview-sandbox contract', () => {
  it('activation-policy の既定値は visible で、列挙外の値は visible として扱うこと', async () => {
    const defaultSandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox data-hydration-trigger="interaction"></ui-preview-sandbox>
    `);

    await waitForElement(defaultSandbox);

    expect(defaultSandbox.activationPolicy).to.equal('visible');
    expect(defaultSandbox.getAttribute('activation-policy')).to.equal('visible');

    const invalidSandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox
        activation-policy="unexpected"
        iframe-title="Invalid fallback"
        data-hydration-trigger="interaction"
      >
        <template data-preview-kind="html"><button>Push</button></template>
      </ui-preview-sandbox>
    `);

    await waitForElement(invalidSandbox);

    const placeholder = invalidSandbox.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    expect(placeholder).to.not.equal(null);
    expect(placeholder?.getAttribute('role')).to.equal('status');
    expect(placeholder?.getAttribute('tabindex')).to.equal('-1');
    expect(invalidSandbox.shadowRoot?.querySelector('iframe')).to.equal(null);
  });

  it('manual の未起動時は iframe ではなく placeholder を描画し、focus で起動すること', async () => {
    const sandbox = await fixture<PreviewSandboxHost>(html`
      <ui-preview-sandbox activation-policy="manual" iframe-title="Manual preview" allow-js>
        <template data-preview-kind="html"><button>Push</button></template>
        <template data-preview-kind="js">console.log('sandbox');</template>
      </ui-preview-sandbox>
    `);

    await waitForElement(sandbox);

    const shadowRoot = sandbox.shadowRoot;
    expect(shadowRoot).to.not.equal(null);

    const placeholder = shadowRoot?.querySelector<HTMLElement>('.placeholder');
    expect(placeholder).to.not.equal(null);
    expect(placeholder?.getAttribute('role')).to.equal('button');
    expect(placeholder?.getAttribute('tabindex')).to.equal('0');
    expect(shadowRoot?.querySelector('iframe')).to.equal(null);

    placeholder?.focus();
    await waitForElement(sandbox);

    const iframe = sandbox.shadowRoot?.querySelector<HTMLIFrameElement>('iframe');
    expect(iframe).to.not.equal(null);
    expect(iframe?.getAttribute('title')).to.equal('Manual preview');
    expect(iframe?.getAttribute('sandbox')).to.contain('allow-scripts');
    expect(iframe?.srcdoc).to.contain('<button>Push</button>');
    expect(iframe?.srcdoc).to.contain("console.log('sandbox');");
  });
});
