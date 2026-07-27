import { afterEach, describe, expect, it } from 'vitest';

import { APP_SHELL_ROOT_ATTRIBUTE } from '../../shared/app-shell/app-shell-root-contract.js';
import {
  APP_SHELL_SIDEBAR_OVERLAY_LAYER_ATTRIBUTE,
  APP_SHELL_SIDEBAR_OVERLAY_LAYER_SELECTOR,
  ensureLayoutSidebarOverlayLayer,
} from '../../src/components/layout/layout-sidebar-overlay-layer.js';

const appendAppShellRoot = (): HTMLElement => {
  const root = document.createElement('div');
  root.setAttribute(APP_SHELL_ROOT_ATTRIBUTE, '');
  document.body.append(root);
  return root;
};

describe('layout-sidebar-overlay-layer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('root と direct footer がある場合は footer 直前へ挿入すること', () => {
    const root = appendAppShellRoot();
    const content = document.createElement('main');
    const footer = document.createElement('footer');
    footer.setAttribute('data-layout-footer', '');
    root.append(content, footer);

    const layer = ensureLayoutSidebarOverlayLayer(document);

    expect(layer.parentElement).to.equal(root);
    expect([...root.children]).to.deep.equal([content, layer, footer]);
  });

  it('root に direct footer がない場合は root 末尾へ追加すること', () => {
    const root = appendAppShellRoot();
    const nestedFooterContainer = document.createElement('section');
    const nestedFooter = document.createElement('footer');
    nestedFooter.setAttribute('data-layout-footer', '');
    nestedFooterContainer.append(nestedFooter);
    root.append(nestedFooterContainer);

    const layer = ensureLayoutSidebarOverlayLayer(document);

    expect(layer.parentElement).to.equal(root);
    expect(root.lastElementChild).to.equal(layer);
  });

  it('root がない場合は既存の body fallback を維持すること', () => {
    const content = document.createElement('main');
    document.body.append(content);

    const layer = ensureLayoutSidebarOverlayLayer(document);

    expect(layer.parentElement).to.equal(document.body);
    expect(document.body.lastElementChild).to.equal(layer);
  });

  it('existing layer がある場合は配置を変えずに再利用すること', () => {
    const existing = document.createElement('div');
    existing.setAttribute(APP_SHELL_SIDEBAR_OVERLAY_LAYER_ATTRIBUTE, '');
    document.body.append(existing);
    appendAppShellRoot();

    const layer = ensureLayoutSidebarOverlayLayer(document);

    expect(layer).to.equal(existing);
    expect(layer.parentElement).to.equal(document.body);
  });

  it('複数回呼び出しても layer は単一実体であること', () => {
    appendAppShellRoot();

    const first = ensureLayoutSidebarOverlayLayer(document);
    const second = ensureLayoutSidebarOverlayLayer(document);

    expect(second).to.equal(first);
    expect(document.querySelectorAll(APP_SHELL_SIDEBAR_OVERLAY_LAYER_SELECTOR)).to.have.length(1);
  });
});
