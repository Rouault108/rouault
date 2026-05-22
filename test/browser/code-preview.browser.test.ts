import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/code-preview/code-preview.js';
import '../../src/components/ui/button/button.js';
import type {
  CodePreview,
  CodePreviewStateChangeDetail,
} from '../../src/components/ui/code-preview/code-preview.js';
import { nextAnimationFrame, waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

const getRoot = (preview: CodePreview): HTMLElement | null =>
  preview.shadowRoot?.querySelector<HTMLElement>('.root') ?? null;

const getHeader = (preview: CodePreview): HTMLElement | null =>
  preview.shadowRoot?.querySelector<HTMLElement>('.header') ?? null;

const getPreviewArea = (preview: CodePreview): HTMLElement | null =>
  preview.shadowRoot?.querySelector<HTMLElement>('.preview-area') ?? null;

const getPreviewFrame = (preview: CodePreview): HTMLElement | null =>
  preview.shadowRoot?.querySelector<HTMLElement>('.preview-frame') ?? null;

const getHeaderHeading = (preview: CodePreview): HTMLElement | null =>
  preview.shadowRoot?.querySelector<HTMLElement>('.header-heading') ?? null;

const getDropdown = (
  preview: CodePreview,
  control: 'theme' | 'surface' | 'viewport',
): HTMLElement | null =>
  preview.shadowRoot?.querySelector<HTMLElement>(`ui-dropdown[data-control="${control}"]`) ?? null;

const dispatchMenuSelect = (target: HTMLElement, value: string, label: string): void => {
  target.dispatchEvent(
    new CustomEvent<{ value: string; label: string }>('menu-item-select', {
      bubbles: true,
      composed: true,
      detail: { value, label },
    }),
  );
};

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('ui-code-preview browser contract', () => {
  it('header の表示条件と aria-label を heading / toolbar / controls / profile に応じて切り替えること', async () => {
    const basic = await fixture<CodePreview>(html`
      <ui-code-preview>
        <div slot="preview">preview</div>
        <pre data-code-block><code>const basic = 1;</code></pre>
      </ui-code-preview>
    `);

    const headingOnly = await fixture<CodePreview>(html`
      <ui-code-preview heading="見出しあり">
        <div slot="preview">preview</div>
        <pre data-code-block><code>const headingOnly = 1;</code></pre>
      </ui-code-preview>
    `);

    const readerWithControls = await fixture<CodePreview>(html`
      <ui-code-preview controls="theme surface viewport" preview-profile="reader">
        <div slot="preview">preview</div>
        <pre data-code-block><code>const reader = 1;</code></pre>
      </ui-code-preview>
    `);

    await Promise.all([
      waitForLitUpdate(basic),
      waitForLitUpdate(headingOnly),
      waitForLitUpdate(readerWithControls),
    ]);
    await nextAnimationFrame();

    const basicRoot = expectPresent(getRoot(basic), 'basicRoot');
    expect(basic.hasAttribute('data-show-header')).to.equal(false);
    expect(basic.hasAttribute('data-has-heading')).to.equal(false);
    expect(basicRoot.getAttribute('role')).to.equal('group');
    expect(basicRoot.getAttribute('aria-label')).to.equal('コード プレビュー');

    const headingHeader = expectPresent(getHeader(headingOnly), 'headingHeader');
    const headingText = expectPresent(getHeaderHeading(headingOnly), 'headingText');
    expect(headingOnly.hasAttribute('data-show-header')).to.equal(true);
    expect(headingOnly.hasAttribute('data-has-heading')).to.equal(true);
    expect(getComputedStyle(headingHeader).display).to.not.equal('none');
    expect(headingText.textContent?.trim()).to.equal('見出しあり');
    expect(expectPresent(getRoot(headingOnly), 'headingRoot').getAttribute('aria-label')).to.equal(
      '見出しあり',
    );

    expect(readerWithControls.hasAttribute('data-show-header')).to.equal(false);
    expect(readerWithControls.shadowRoot?.querySelector('ui-dropdown')).to.equal(null);

    const button = document.createElement('button');
    button.setAttribute('slot', 'toolbar');
    button.textContent = '追加';
    basic.append(button);

    await waitMs(30);
    await waitForLitUpdate(basic);
    await nextAnimationFrame();

    expect(basic.hasAttribute('data-show-header')).to.equal(true);

    button.remove();

    await waitMs(30);
    await waitForLitUpdate(basic);
    await nextAnimationFrame();

    expect(basic.hasAttribute('data-show-header')).to.equal(false);
  });

  it('built-in controls が preview state を更新し、state-change event を送出すること', async () => {
    const preview = await fixture<CodePreview>(html`
      <ui-code-preview
        heading="Showcase Controls"
        controls="theme surface viewport"
        preview-theme="page"
        preview-surface="surface"
        preview-viewport="full"
      >
        <div id="preview-host" slot="preview" style="padding: 1rem; border-radius: 8px;">
          preview
        </div>
        <pre id="preview-code" data-code-block><code>const showcase = 1;</code></pre>
      </ui-code-preview>
    `);

    await waitForLitUpdate(preview);
    await nextAnimationFrame();

    const themeDropdown = expectPresent(getDropdown(preview, 'theme'), 'themeDropdown');
    const surfaceDropdown = expectPresent(getDropdown(preview, 'surface'), 'surfaceDropdown');
    const viewportDropdown = expectPresent(getDropdown(preview, 'viewport'), 'viewportDropdown');
    const previewArea = expectPresent(getPreviewArea(preview), 'previewArea');
    const previewFrame = expectPresent(getPreviewFrame(preview), 'previewFrame');

    const previewHost = expectPresent(
      preview.querySelector<HTMLElement>('#preview-host'),
      'previewHost',
    );
    const codeBlock = expectPresent(
      preview.querySelector<HTMLElement>('#preview-code'),
      'codeBlock',
    );

    const events: CodePreviewStateChangeDetail[] = [];
    preview.addEventListener('ui-code-preview-state-change', (event: Event) => {
      if (event instanceof CustomEvent) {
        const detail = (event as CustomEvent<CodePreviewStateChangeDetail>).detail;
        events.push(detail);
      }
    });

    const initialPreviewToken = getComputedStyle(previewHost)
      .getPropertyValue('--bg-default')
      .trim();
    const initialCodeToken = getComputedStyle(codeBlock).getPropertyValue('--bg-default').trim();
    const initialPreviewAreaBg = getComputedStyle(previewArea).backgroundColor;
    const initialFrameWidth = Number.parseFloat(getComputedStyle(previewFrame).width);

    dispatchMenuSelect(themeDropdown, 'dark', 'Dark');
    await waitForLitUpdate(preview);
    await nextAnimationFrame();

    expect(preview.getAttribute('preview-theme')).to.equal('dark');
    expect(events[0]?.userInitiated).to.equal(true);
    expect(events[0]?.keys).to.deep.equal(['previewTheme']);

    const darkPreviewToken = getComputedStyle(previewHost).getPropertyValue('--bg-default').trim();
    const darkCodeToken = getComputedStyle(codeBlock).getPropertyValue('--bg-default').trim();

    expect(darkPreviewToken).to.not.equal(initialPreviewToken);
    expect(darkCodeToken).to.equal(initialCodeToken);

    dispatchMenuSelect(surfaceDropdown, 'muted', 'Muted');
    await waitForLitUpdate(preview);
    await nextAnimationFrame();

    expect(preview.getAttribute('preview-surface')).to.equal('muted');
    expect(events[1]?.userInitiated).to.equal(true);
    expect(events[1]?.keys).to.deep.equal(['previewSurface']);

    const mutedPreviewAreaBg = getComputedStyle(previewArea).backgroundColor;
    expect(mutedPreviewAreaBg).to.not.equal(initialPreviewAreaBg);

    dispatchMenuSelect(viewportDropdown, 'mobile', 'Mobile');
    await waitForLitUpdate(preview);
    await nextAnimationFrame();

    expect(preview.getAttribute('preview-viewport')).to.equal('mobile');
    expect(events[2]?.userInitiated).to.equal(true);
    expect(events[2]?.keys).to.deep.equal(['previewViewport']);

    const resolvedFrameWidth = getComputedStyle(preview)
      .getPropertyValue('--_ui-code-preview-frame-width')
      .trim();
    expect(resolvedFrameWidth).to.equal('375px');

    const mobileWidth = Number.parseFloat(getComputedStyle(previewFrame).width);
    expect(mobileWidth).to.be.lessThan(initialFrameWidth);

    preview.previewTheme = 'light';
    await waitForLitUpdate(preview);
    await nextAnimationFrame();

    expect(events[3]?.userInitiated).to.equal(false);
    expect(events[3]?.keys).to.deep.equal(['previewTheme']);
  });

  it('child breakout neutralization と slotted code copy value を壊さないこと', async () => {
    const preview = await fixture<CodePreview>(html`
      <ui-code-preview heading="Copy Preservation">
        <div slot="preview">preview</div>

        <pre id="copy-block" data-code-block><code>const blockValue = 1;</code></pre>

        <section id="copy-group" data-code-group aria-label="comparison group">
          <pre data-code-block><code>const groupValueA = 1;</code></pre>
          <pre data-code-block><code>const groupValueB = 2;</code></pre>
        </section>
      </ui-code-preview>
    `);

    await waitForLitUpdate(preview);
    await waitMs(60);
    await nextAnimationFrame();

    const previewStyle = getComputedStyle(preview);
    expect(previewStyle.getPropertyValue('--ui-code-surface-breakout-width').trim()).to.equal(
      '100%',
    );
    expect(previewStyle.getPropertyValue('--ui-code-surface-breakout-margin').trim()).to.equal('0');
    expect(previewStyle.getPropertyValue('--ui-code-surface-radius-top').trim()).to.equal('0');
    expect(previewStyle.getPropertyValue('--ui-code-group-width').trim()).to.equal('100%');
    expect(previewStyle.getPropertyValue('--ui-code-group-margin-inline').trim()).to.equal('0');

    expect(preview.querySelector('#copy-block')).to.not.equal(null);
    expect(preview.querySelector('#copy-group')).to.not.equal(null);
  });

  it('invalid padding / invalid align は安全にフォールバックすること', async () => {
    const preview = await fixture<CodePreview>(html`
      <ui-code-preview preview-padding="invalid" preview-align="invalid">
        <div slot="preview">preview</div>
        <pre data-code-block><code>const invalid = 1;</code></pre>
      </ui-code-preview>
    `);

    await waitForLitUpdate(preview);
    await nextAnimationFrame();

    expect(preview.previewPadding).to.equal('normal');
    expect(preview.previewAlign).to.equal('center');

    const previewArea = expectPresent(getPreviewArea(preview), 'previewArea');
    const previewAreaStyle = getComputedStyle(previewArea);
    expect(previewAreaStyle.alignItems).to.equal('center');
    expect(previewAreaStyle.justifyContent).to.equal('center');
  });
});
