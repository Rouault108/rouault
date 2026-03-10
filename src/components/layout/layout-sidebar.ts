import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../../lib/icons';
import '../ui/sidebar/sidebar';
import type { TreeNode } from '../ui/file-tree/file-tree';
import type { UiSidebar } from '../ui/sidebar/sidebar';
import type { UiSidebarStateChangeDetail } from '../ui/sidebar-shell/sidebar-shell';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
};

const toTreeNode = (value: unknown): TreeNode | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toOptionalString(value['id']);
  const label = toOptionalString(value['label']);
  if (!id || !label) {
    return null;
  }

  const childrenValue = value['children'];
  const children = Array.isArray(childrenValue)
    ? childrenValue
      .map((item) => toTreeNode(item))
      .filter((item): item is TreeNode => item !== null)
    : undefined;
  const icon = toOptionalString(value['icon']);
  const href = toOptionalString(value['href']);
  const selected = toOptionalBoolean(value['selected']);
  const expanded = toOptionalBoolean(value['expanded']);

  const node: TreeNode = {
    id,
    label,
    ...(icon ? { icon } : {}),
    ...(href ? { href } : {}),
    ...(selected !== undefined ? { selected } : {}),
    ...(expanded !== undefined ? { expanded } : {}),
    ...(children && children.length > 0 ? { children } : {}),
  };
  return node;
};

@customElement('layout-sidebar')
export class LayoutSidebar extends LitElement {
  static override styles = css`
    :host {
      display: block;
      block-size: 100%;
      min-block-size: 0;
      overflow: visible;
    }

    .sidebar-shell {
      block-size: 100%;
      min-block-size: 0;
      position: sticky;
      top: var(--header-height);
      max-block-size: calc(100vh - var(--header-height));
    }

    ui-sidebar {
      block-size: 100%;
      min-block-size: 0;
    }

    .floating-toggle {
      position: fixed;
      left: var(--space-4, 16px);
      bottom: var(--space-4, 16px);
      z-index: var(--z-popover, 400);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 48px;
      block-size: 48px;
      border: var(--border-width, 1px) solid var(--border-default);
      border-radius: var(--radius-full, 9999px);
      background: var(--bg-surface-2);
      color: var(--fg-default);
      box-shadow: var(--shadow-md);
      cursor: pointer;
    }

    .floating-toggle iconify-icon {
      font-size: 18px;
    }

    @media (min-width: 768px) {
      .floating-toggle {
        display: none;
      }
    }

    @media (forced-colors: active) {
      .floating-toggle {
        border-color: CanvasText;
        background: Canvas;
        color: CanvasText;
      }
    }

    @media print {
      .floating-toggle {
        display: none !important;
      }
    }
  `;

  @property({ type: String, attribute: 'source-id' })
  sourceId = '';

  @property({ type: String, attribute: 'active-id' })
  activeId = '';

  @property({ type: String })
  heading = 'ナビゲーション';

  @property({ type: Number, attribute: 'fixed-breakpoint' })
  fixedBreakpoint = 768;

  @state()
  private _items: TreeNode[] = [];

  @state()
  private _state: 'expanded' | 'collapsed' = 'collapsed';

  @query('ui-sidebar')
  private _sidebarElement!: UiSidebar | null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadItemsFromSource();
    window.addEventListener('layout-sidebar-toggle-request', this._onToggleRequest as EventListener);
  }

  override disconnectedCallback(): void {
    window.removeEventListener('layout-sidebar-toggle-request', this._onToggleRequest as EventListener);
    super.disconnectedCallback();
  }

  protected override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('sourceId')) {
      this._loadItemsFromSource();
    }
  }

  protected override firstUpdated(): void {
    this._state = this._sidebarElement?.state ?? this._state;
  }

  private _loadItemsFromSource(): void {
    if (this.sourceId.length === 0) {
      this._items = [];
      return;
    }

    const source = document.getElementById(this.sourceId);
    if (!(source instanceof HTMLScriptElement)) {
      this._items = [];
      return;
    }

    try {
      const parsed: unknown = JSON.parse(source.textContent || '[]');
      if (!Array.isArray(parsed)) {
        this._items = [];
        return;
      }
      this._items = parsed
        .map((item) => toTreeNode(item))
        .filter((item): item is TreeNode => item !== null);
    } catch {
      this._items = [];
    }
  }

  private _onToggleButtonClick = (event: Event): void => {
    const trigger = event.currentTarget;
    this._sidebarElement?.toggle(trigger instanceof HTMLElement ? trigger : undefined);
  };

  private _onToggleRequest = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail: unknown = event.detail;
    const trigger =
      isRecord(detail) && detail['trigger'] instanceof HTMLElement
        ? detail['trigger']
        : undefined;
    this._sidebarElement?.toggle(trigger);
  };

  private _onSidebarStateChange = (event: CustomEvent<UiSidebarStateChangeDetail>): void => {
    this._state = event.detail.state;
  };

  private _onSidebarSelect = (): void => {
    if (this._sidebarElement?.mode === 'overlay') {
      this._sidebarElement.collapse();
    }
  };

  override render() {
    const isExpanded = this._state === 'expanded';

    return html`
      <div class="sidebar-shell">
        <ui-sidebar
          id="layout-sidebar-panel"
          .items=${this._items}
          .activeId=${this.activeId}
          .heading=${this.heading}
          .fixedBreakpoint=${this.fixedBreakpoint}
          @ui-sidebar-state-change=${this._onSidebarStateChange}
          @ui-sidebar-select=${this._onSidebarSelect}
        ></ui-sidebar>
      </div>

      <button
        class="floating-toggle"
        type="button"
        aria-controls="layout-sidebar-panel"
        aria-expanded=${String(isExpanded)}
        aria-label="サイドバーを開閉"
        @click=${this._onToggleButtonClick}
      >
        <iconify-icon icon="lucide:panel-left"></iconify-icon>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-sidebar': LayoutSidebar;
  }
}
