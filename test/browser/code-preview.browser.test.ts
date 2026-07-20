import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/code-preview/code-preview.js';
import '../../src/components/ui/button/button.js';
import { activateStaticCopyButtons } from '../../src/client/post-hydrate/static-copy-button-enhancer.js';
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

const textFingerprint = (value: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const semanticSubtreeSignature = (owner: ParentNode): unknown[] =>
  Array.from(owner.querySelectorAll<HTMLElement>('[data-code-line-state]')).map((line) => {
    const wrapper = line.firstElementChild;
    return {
      state: line.dataset['codeLineState'] ?? null,
      role: line.getAttribute('role'),
      label: line.getAttribute('aria-label'),
      wrapper: wrapper?.localName ?? null,
      wrapperCount: line.querySelectorAll(':scope > mark, :scope > ins, :scope > del').length,
      descendantWrapperCount: line.querySelectorAll('mark, ins, del').length,
      tokens: Array.from(wrapper?.childNodes ?? line.childNodes).map((node) => ({
        kind: node.nodeType,
        tag: node instanceof Element ? node.localName : null,
        className: node instanceof Element ? node.getAttribute('class') : null,
        style: node instanceof Element ? node.getAttribute('style') : null,
        textLength: node.textContent?.length ?? 0,
        textFingerprint: textFingerprint(node.textContent ?? ''),
      })),
    };
  });

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

  it('preview compositionとstate更新でsemantic subtreeを保ち、template sourceだけをcopyすること', async () => {
    const copied: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          copied.push(value);
          return Promise.resolve();
        },
      },
    });

    const preview = await fixture<CodePreview>(html`
      <ui-code-preview heading="Semantic Preview" controls="theme">
        <div slot="preview">preview</div>
        <figure data-code-block-root>
          <template id="preview-semantic-source" data-code-copy-source
            >const previewSource = true;</template
          >
          <button
            type="button"
            data-copy-button
            data-copy-target-id="preview-semantic-source"
            data-copy-disabled-reason="no-js"
            disabled
          >
            copy
          </button>
          <pre data-code-block><code>
            <span class="line" data-code-line-state="normal"><span class="token">n0</span></span>
            <span class="line highlighted" data-code-line-state="highlight" role="group" aria-label="強調行"><mark><span class="token keyword" style="color: rgb(42, 46, 51)">n1</span></mark></span>
            <span class="line diff add" data-code-line-state="add" role="group" aria-label="追加行"><ins><span class="token string">n2</span></ins></span>
            <span class="line diff remove" data-code-line-state="remove" role="group" aria-label="削除行"><del><span class="token number">n3</span></del></span>
          </code></pre>
        </figure>
      </ui-code-preview>
    `);

    await waitForLitUpdate(preview);
    await nextAnimationFrame();
    const before = semanticSubtreeSignature(preview);
    expect(preview.querySelectorAll('[data-code-line-state][role="group"]')).to.have.length(3);
    expect(preview.querySelectorAll('[data-code-line-state] mark')).to.have.length(1);
    expect(preview.querySelectorAll('[data-code-line-state] ins')).to.have.length(1);
    expect(preview.querySelectorAll('[data-code-line-state] del')).to.have.length(1);

    const themeDropdown = expectPresent(getDropdown(preview, 'theme'), 'themeDropdown');
    dispatchMenuSelect(themeDropdown, 'dark', 'Dark');
    await waitForLitUpdate(preview);
    await nextAnimationFrame();
    expect(semanticSubtreeSignature(preview)).to.deep.equal(before);

    activateStaticCopyButtons(preview);
    const copyButton = expectPresent(
      preview.querySelector<HTMLButtonElement>('[data-copy-button]'),
      'copyButton',
    );
    copyButton.click();
    await Promise.resolve();
    expect(copied).to.deep.equal(['const previewSource = true;']);
    expect(semanticSubtreeSignature(preview)).to.deep.equal(before);
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
