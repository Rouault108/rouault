import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/tree-item/tree-item.js';
import type { TreeItem } from '../../src/components/ui/tree-item/tree-item.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: TreeItem): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const getItem = (host: TreeItem): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.item'), 'item');

const getChildrenContainer = (host: TreeItem): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.children'), 'children');

const getLabel = (host: TreeItem): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.label'), 'label');

const getTooltipHost = (host: TreeItem): HTMLElement & { disabled?: boolean } =>
  expectPresent(
    host.shadowRoot?.querySelector<HTMLElement>('ui-tooltip.label-tooltip') as
      | (HTMLElement & { disabled?: boolean })
      | null,
    'tooltip host',
  );

const getContentIcon = (host: TreeItem): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.content-icon'), 'content icon');

const waitForTooltipPanel = async (
  tooltipHost: HTMLElement,
  ownerDocument: Document,
): Promise<HTMLElement> => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const tooltipId = tooltipHost.dataset['tooltipId'];
    if (tooltipId) {
      const panel = ownerDocument.getElementById(tooltipId);
      if (panel) {
        return panel;
      }
    }

    await nextAnimationFrame();
  }

  throw new Error('tooltip panel が見つかりません');
};

describe('ui-tree-item browser contract', () => {
  it('既定の leaf は role/aria/tabindex を持つ button として成立すること', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="ファイル.txt" icon="file-text"></ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host);

    expect(host.getAttribute('role')).to.equal('treeitem');
    expect(host.getAttribute('aria-selected')).to.equal('false');
    expect(host.getAttribute('aria-level')).to.equal('1');
    expect(host.hasAttribute('aria-expanded')).to.equal(false);

    expect(item.tagName.toLowerCase()).to.equal('button');
    expect(item.getAttribute('tabindex')).to.equal('0');
  });

  it('branch は click で expanded を切り替え、children aria と inert を同期すること', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="src" icon="folder">
        <ui-tree-item slot="children" label="components" icon="folder"></ui-tree-item>
        <ui-tree-item slot="children" label="index.ts" icon="file-code"></ui-tree-item>
      </ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host);
    const children = getChildrenContainer(host);

    let expandedEventCount = 0;
    let selectedEventCount = 0;

    host.addEventListener('expanded-change', () => {
      expandedEventCount += 1;
    });
    host.addEventListener('selected-change', () => {
      selectedEventCount += 1;
    });

    expect(host.querySelectorAll('[slot="children"]').length).to.equal(2);
    expect(host.expanded).to.equal(false);
    expect(host.getAttribute('aria-expanded')).to.equal('false');
    expect(children.getAttribute('aria-hidden')).to.equal('true');
    expect(children.hasAttribute('inert')).to.equal(true);

    item.click();
    await flush(host);

    expect(expandedEventCount).to.equal(1);
    expect(selectedEventCount).to.equal(0);
    expect(host.expanded).to.equal(true);
    expect(host.getAttribute('aria-expanded')).to.equal('true');
    expect(children.getAttribute('aria-hidden')).to.equal('false');
    expect(children.hasAttribute('inert')).to.equal(false);

    item.click();
    await flush(host);

    expect(expandedEventCount).to.equal(2);
    expect(host.expanded).to.equal(false);
    expect(children.getAttribute('aria-hidden')).to.equal('true');
    expect(children.hasAttribute('inert')).to.equal(true);
  });

  it('link leaf は Enter/Space で selected-change を発火し、Enter は anchor click を伴うこと', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="README.md" icon="file-text" href="/notes/readme"></ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host) as HTMLAnchorElement;

    let selectedEventCount = 0;
    let anchorClickCount = 0;

    host.addEventListener('selected-change', () => {
      selectedEventCount += 1;
    });

    item.addEventListener('click', (event) => {
      event.preventDefault();
      anchorClickCount += 1;
    });

    dispatchKey(item, 'Enter');
    await flush(host);

    expect(host.selected).to.equal(true);
    expect(host.getAttribute('aria-selected')).to.equal('true');
    expect(selectedEventCount).to.equal(1);
    expect(anchorClickCount).to.equal(1);

    host.selected = false;
    await flush(host);

    dispatchKey(item, ' ');
    await flush(host);

    expect(host.selected).to.equal(true);
    expect(selectedEventCount).to.equal(2);
    expect(anchorClickCount).to.equal(1);
  });

  it('branch は ArrowRight/ArrowLeft で展開収縮し、境界では委譲イベントを送出すること', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="components" icon="folder">
        <ui-tree-item slot="children" label="button.ts" icon="file-code"></ui-tree-item>
      </ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host);

    let expandedEventCount = 0;
    let arrowRightDelegated = 0;
    let arrowLeftDelegated = 0;

    host.addEventListener('expanded-change', () => {
      expandedEventCount += 1;
    });
    host.addEventListener('tree-item-arrow-right', () => {
      arrowRightDelegated += 1;
    });
    host.addEventListener('tree-item-arrow-left', () => {
      arrowLeftDelegated += 1;
    });

    dispatchKey(item, 'ArrowRight');
    await flush(host);

    expect(host.expanded).to.equal(true);
    expect(expandedEventCount).to.equal(1);

    dispatchKey(item, 'ArrowRight');
    await flush(host);

    expect(arrowRightDelegated).to.equal(1);
    expect(host.expanded).to.equal(true);

    dispatchKey(item, 'ArrowLeft');
    await flush(host);

    expect(host.expanded).to.equal(false);
    expect(expandedEventCount).to.equal(2);

    dispatchKey(item, 'ArrowLeft');
    await flush(host);

    expect(arrowLeftDelegated).to.equal(1);
    expect(host.expanded).to.equal(false);
  });

  it('ネスト時に aria-level を DOM 階層から算出すること', async () => {
    const root = await fixture<TreeItem>(html`
      <ui-tree-item label="プロジェクト" icon="folder" expanded>
        <ui-tree-item slot="children" label="src" icon="folder" expanded>
          <ui-tree-item slot="children" label="components" icon="folder"></ui-tree-item>
        </ui-tree-item>
      </ui-tree-item>
    `);

    await flush(root);

    const second = expectPresent(
      root.querySelector<TreeItem>('ui-tree-item[label="src"]'),
      'second level item',
    );
    const third = expectPresent(
      root.querySelector<TreeItem>('ui-tree-item[label="components"]'),
      'third level item',
    );

    await flush(second);
    await flush(third);

    expect(root.getAttribute('aria-level')).to.equal('1');
    expect(second.getAttribute('aria-level')).to.equal('2');
    expect(third.getAttribute('aria-level')).to.equal('3');
  });

  it('長いラベルでは tooltip を有効化し、hover で panel を開閉すること', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item
        label="これは非常に長いファイル名でコンテナの幅を超える可能性があります.tsx"
        icon="file-code"
      ></ui-tree-item>
    `);

    await flush(host);

    const label = getLabel(host);
    const tooltipHost = getTooltipHost(host);

    Object.defineProperty(label, 'clientWidth', {
      configurable: true,
      get: () => 80,
    });
    Object.defineProperty(label, 'scrollWidth', {
      configurable: true,
      get: () => 280,
    });

    host.requestUpdate();
    await flush(host);
    await nextAnimationFrame();
    await nextAnimationFrame();

    expect(tooltipHost.disabled).to.equal(false);

    label.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, composed: true }));
    await nextAnimationFrame();
    await nextAnimationFrame();

    const panel = await waitForTooltipPanel(tooltipHost, host.ownerDocument);

    expect(panel.getAttribute('role')).to.equal('tooltip');
    expect(panel.getAttribute('aria-hidden')).to.equal('false');

    label.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, composed: true }));
    await nextAnimationFrame();
    await nextAnimationFrame();

    expect(panel.getAttribute('aria-hidden')).to.equal('true');
  });

  it('icon がない場合は content-icon を hidden にし、focus() を item へ委譲すること', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="テキストのみのアイテム"></ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host);
    const contentIcon = getContentIcon(host);

    expect(contentIcon.classList.contains('hidden')).to.equal(true);
    expect(getComputedStyle(contentIcon).display).to.equal('none');

    host.focus();
    await nextAnimationFrame();

    expect(host.shadowRoot?.activeElement).to.equal(item);
  });

  it('branch の surface 開始位置は chevron slot を含み、leaf は page 基準位置を維持すること', async () => {
    const root = await fixture<HTMLDivElement>(html`
      <div>
        <ui-tree-item
          id="branch"
          label="src"
          icon="folder"
          style="
            --tree-indent-step: 20px;
            --tree-item-selection-start-gap: 0px;
            --tree-item-selected-indicator-width: 0px;
          "
        >
          <ui-tree-item slot="children" label="index.ts" icon="file-code"></ui-tree-item>
        </ui-tree-item>

        <ui-tree-item
          id="leaf"
          label="README.md"
          icon="file-text"
          href="/notes/readme"
          style="
            --tree-indent-step: 20px;
            --tree-item-selection-start-gap: 0px;
            --tree-item-selected-indicator-width: 0px;
          "
        ></ui-tree-item>
      </div>
    `);

    const branch = expectPresent(root.querySelector<TreeItem>('#branch'), 'branch');
    const leaf = expectPresent(root.querySelector<TreeItem>('#leaf'), 'leaf');

    await flush(branch);
    await flush(leaf);

    const readBeforeInlineStartPx = (element: HTMLElement): number => {
      const pseudoStyles = getComputedStyle(element, '::before');
      const rawValue =
        pseudoStyles.getPropertyValue('inset-inline-start').trim() ||
        pseudoStyles.getPropertyValue('left').trim();

      const parsed = Number.parseFloat(rawValue);
      expect(Number.isFinite(parsed), `inline-start should resolve to px: ${rawValue}`).to.equal(
        true,
      );

      return parsed;
    };

    const branchItem = getItem(branch);
    const leafItem = getItem(leaf);

    expect(readBeforeInlineStartPx(branchItem)).to.equal(0);
    expect(readBeforeInlineStartPx(leafItem)).to.equal(10);
  });
});
