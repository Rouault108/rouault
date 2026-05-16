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

const getSurface = (host: TreeItem): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.surface'), 'surface');

const getAncestorRails = (host: TreeItem): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.ancestor-rails'), 'ancestor rails');

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

const parsePx = (rawValue: string, name: string): number => {
  const parsed = Number.parseFloat(rawValue);
  expect(Number.isFinite(parsed), `${name} should resolve to px: ${rawValue}`).to.equal(true);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} が px に解決されません: ${rawValue}`);
  }

  return parsed;
};

const readPseudoInlineStartPx = (element: HTMLElement, pseudo: string): number => {
  const pseudoStyles = getComputedStyle(element, pseudo);
  const rawValue =
    pseudoStyles.getPropertyValue('inset-inline-start').trim() ||
    pseudoStyles.getPropertyValue('left').trim();

  return parsePx(rawValue, `pseudo inline-start ${pseudo}`);
};

const readWidthPx = (element: HTMLElement, name: string): number => {
  return parsePx(getComputedStyle(element).width, name);
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

  it('branch 行クリックは primary-action-request を通知し、expand icon クリックは expanded-request のみを通知すること', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="src" icon="folder">
        <ui-tree-item slot="children" label="components" icon="folder"></ui-tree-item>
        <ui-tree-item slot="children" label="index.ts" icon="file-code"></ui-tree-item>
      </ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host);
    const children = getChildrenContainer(host);
    const expandIcon = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.expand-icon'),
      'expand icon',
    );

    let primaryActionCount = 0;
    let expandedEventCount = 0;
    let lastExpanded: boolean | null = null;

    host.addEventListener('tree-item-primary-action-request', (event: Event) => {
      primaryActionCount += 1;
      expect((event as CustomEvent<{ hasChildren: boolean }>).detail.hasChildren).to.equal(true);
    });
    host.addEventListener('tree-item-expanded-request', (event: Event) => {
      expandedEventCount += 1;
      lastExpanded = (event as CustomEvent<{ expanded: boolean }>).detail.expanded;
    });

    expect(host.querySelectorAll('[slot="children"]').length).to.equal(2);
    expect(host.expanded).to.equal(false);
    expect(host.getAttribute('aria-expanded')).to.equal('false');
    expect(children.getAttribute('aria-hidden')).to.equal('true');
    expect(children.hasAttribute('inert')).to.equal(true);

    item.click();
    await flush(host);

    expect(primaryActionCount).to.equal(1);
    expect(expandedEventCount).to.equal(0);
    expect(host.expanded).to.equal(false);

    expandIcon.click();
    await flush(host);

    expect(primaryActionCount).to.equal(1);
    expect(expandedEventCount).to.equal(1);
    expect(lastExpanded).to.equal(true);
    expect(host.expanded).to.equal(false);
    expect(host.getAttribute('aria-expanded')).to.equal('false');
    expect(children.getAttribute('aria-hidden')).to.equal('true');
    expect(children.hasAttribute('inert')).to.equal(true);
  });

  it('link leaf は Enter/Space で primary-action-request を発火し、内部 selected や synthetic click を起こさないこと', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="README.md" icon="file-text" href="/notes/readme"></ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host) as HTMLAnchorElement;

    expect(item.tagName.toLowerCase()).to.equal('a');
    expect(item.getAttribute('href')).to.equal('/notes/readme');
    expect(item.getAttribute('data-link-kind')).to.equal('internal-document');
    expect(item.getAttribute('data-link-surface')).to.equal('navigation');

    let primaryActionCount = 0;
    let anchorClickCount = 0;

    host.addEventListener('tree-item-primary-action-request', (event: Event) => {
      primaryActionCount += 1;
      const detail = (event as CustomEvent<{ hasChildren: boolean; href?: string }>).detail;
      expect(detail.hasChildren).to.equal(false);
      expect(detail.href).to.equal('/notes/readme');
    });

    item.addEventListener('click', (event) => {
      event.preventDefault();
      anchorClickCount += 1;
    });

    dispatchKey(item, 'Enter');
    await flush(host);

    expect(host.selected).to.equal(false);
    expect(host.getAttribute('aria-selected')).to.equal('false');
    expect(primaryActionCount).to.equal(1);
    expect(anchorClickCount).to.equal(0);

    dispatchKey(item, ' ');
    await flush(host);

    expect(host.selected).to.equal(false);
    expect(primaryActionCount).to.equal(2);
    expect(anchorClickCount).to.equal(0);
  });

  it('link leaf の mouse click は default を抑止せず、primary-action-request を通知すること', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="README.md" icon="file-text" href="/notes/readme"></ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host) as HTMLAnchorElement;

    expect(item.tagName.toLowerCase()).to.equal('a');
    expect(item.getAttribute('href')).to.equal('/notes/readme');
    expect(item.getAttribute('data-link-kind')).to.equal('internal-document');
    expect(item.getAttribute('data-link-surface')).to.equal('navigation');

    let primaryActionCount = 0;
    let defaultPreventedAtAnchor: boolean | undefined;

    host.addEventListener('tree-item-primary-action-request', () => {
      primaryActionCount += 1;
    });

    item.addEventListener('click', (event) => {
      defaultPreventedAtAnchor = event.defaultPrevented;

      // テスト中の実ナビゲーションだけ抑止する。
      // ここで観測したいのは、component 自身が先に preventDefault() していないこと。
      event.preventDefault();
    });

    item.click();
    await flush(host);

    expect(host.selected).to.equal(false);
    expect(host.getAttribute('aria-selected')).to.equal('false');
    expect(primaryActionCount).to.equal(1);
    expect(defaultPreventedAtAnchor).to.equal(false);
  });

  it('branch は ArrowRight/ArrowLeft で request event を通知し、内部 expanded を変更しないこと', async () => {
    const host = await fixture<TreeItem>(html`
      <ui-tree-item label="components" icon="folder">
        <ui-tree-item slot="children" label="button.ts" icon="file-code"></ui-tree-item>
      </ui-tree-item>
    `);

    await flush(host);

    const item = getItem(host);

    let expandedEventCount = 0;
    let focusFirstChildCount = 0;
    let focusParentCount = 0;
    const expandedStates: boolean[] = [];

    host.addEventListener('tree-item-expanded-request', (event: Event) => {
      expandedEventCount += 1;
      expandedStates.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    host.addEventListener('tree-item-focus-first-child-request', () => {
      focusFirstChildCount += 1;
    });
    host.addEventListener('tree-item-focus-parent-request', () => {
      focusParentCount += 1;
    });

    dispatchKey(item, 'ArrowRight');
    await flush(host);

    expect(host.expanded).to.equal(false);
    expect(expandedEventCount).to.equal(1);
    expect(expandedStates).to.deep.equal([true]);

    host.expanded = true;
    await flush(host);

    dispatchKey(item, 'ArrowRight');
    await flush(host);

    expect(focusFirstChildCount).to.equal(1);
    expect(host.expanded).to.equal(true);

    dispatchKey(item, 'ArrowLeft');
    await flush(host);

    expect(expandedEventCount).to.equal(2);
    expect(expandedStates).to.deep.equal([true, false]);
    expect(host.expanded).to.equal(true);

    host.expanded = false;
    await flush(host);

    dispatchKey(item, 'ArrowLeft');
    await flush(host);

    expect(focusParentCount).to.equal(1);
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

  it('背景面は surface に限定され、ancestor rails と分離されること', async () => {
    const root = await fixture<HTMLDivElement>(html`
      <div>
        <ui-tree-item
          id="root-branch"
          label="Collection"
          icon="folder"
          expanded
          style="
            --tree-indent-step: 20px;
            --tree-item-selected-indicator-width: 2px;
          "
        >
          <ui-tree-item
            id="nested-branch"
            slot="children"
            label="Program"
            icon="folder"
            expanded
            style="
              --tree-indent-step: 20px;
              --tree-item-selected-indicator-width: 2px;
            "
          >
            <ui-tree-item
              id="nested-leaf"
              slot="children"
              label="JavaScriptの配列"
              icon="file-text"
              href="/notes/javascript/array"
              selected
              style="
                --tree-indent-step: 20px;
                --tree-item-selected-indicator-width: 2px;
              "
            ></ui-tree-item>
          </ui-tree-item>
        </ui-tree-item>
      </div>
    `);

    const rootBranch = expectPresent(
      root.querySelector<TreeItem>('#root-branch'),
      'root branch item',
    );
    const nestedBranch = expectPresent(
      root.querySelector<TreeItem>('#nested-branch'),
      'nested branch item',
    );
    const nestedLeaf = expectPresent(
      root.querySelector<TreeItem>('#nested-leaf'),
      'nested leaf item',
    );

    await flush(rootBranch);
    await flush(nestedBranch);
    await flush(nestedLeaf);

    const rootBranchAncestorRails = getAncestorRails(rootBranch);
    const nestedBranchAncestorRails = getAncestorRails(nestedBranch);
    const nestedLeafAncestorRails = getAncestorRails(nestedLeaf);

    expect(rootBranch.shadowRoot?.querySelectorAll('.ancestor-rail').length).to.equal(0);
    expect(nestedBranch.shadowRoot?.querySelectorAll('.ancestor-rail').length).to.equal(1);
    expect(nestedLeaf.shadowRoot?.querySelectorAll('.ancestor-rail').length).to.equal(1);

    expect(readWidthPx(rootBranchAncestorRails, 'root branch ancestor rails width')).to.equal(0);
    expect(readWidthPx(nestedBranchAncestorRails, 'nested branch ancestor rails width')).to.equal(
      20,
    );
    expect(readWidthPx(nestedLeafAncestorRails, 'nested leaf ancestor rails width')).to.equal(20);

    expect(readPseudoInlineStartPx(getSurface(rootBranch), '::before')).to.equal(0);
    expect(readPseudoInlineStartPx(getSurface(nestedBranch), '::before')).to.equal(0);
    expect(readPseudoInlineStartPx(getSurface(nestedLeaf), '::before')).to.equal(0);
  });
});
