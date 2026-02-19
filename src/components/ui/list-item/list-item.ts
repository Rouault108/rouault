import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * ??????? (List Item) ???????
 *
 * ?????? (`<ui-list>`) ??????????????????
 * WAI-ARIA Grid Pattern ????????????????????????????
 *
 * ## ??????
 *
 * - **High Density**: ????????????????????????????????
 * - **Browsing First**: ?????????????????????????????
 * - **Web Standard**: WAI-ARIA Grid Pattern (Roving Tabindex) ??????
 *
 * ## ????
 *
 * - **Row Focus Model**: ??????????????????? (`role="gridcell"`)????
 * - **Primary Action**: ?????? `<a>` ???????????????????????????
 * - **Touch Target**: ???????32px?????????????44px??????????
 *
 * @slot - ???????? `role="gridcell"` ??????
 * @slot mobile-supplement - ??????????????????????????
 *
 * @property {string} itemId - ????ID?`items` ???? `id` ????
 * @property {string | null} href - ????????????????Detail View?
 * @property {boolean} active - ????????????????????
 * @property {number | null} rowIndex - ??????????????????
 *
 * @fires ui-item-click - ???????????detail: { itemId: string, event: MouseEvent }
 * @fires ui-item-preview - Quick Look????Shift + Space??detail: { itemId: string }
 * @fires ui-item-context - ??????????????detail: { itemId: string, anchor: { x: number, y: number } }
 *
 * @cssprop --control-height-md - ???? (32px)
 * @cssprop --control-min-touch - ?????????? (44px)
 * @cssprop --space-4 - ??????? (16px)
 * @cssprop --border-width-thick - ?????????? (2px)
 * @cssprop --primary - ??????????
 * @cssprop --bg-hover - ??????
 * @cssprop --bg-surface-active - ????????
 * @cssprop --duration-fast - ???? (70ms)
 * @cssprop --ease-out - ???????
 *
 * @example
 * ```html
 * <ui-list-item item-id="1" href="/notes/1" active>
 *   <div role="gridcell">???????</div>
 *   <div role="gridcell">2024-01-01</div>
 * </ui-list-item>
 * ```
 */
@customElement('ui-list-item')
export class ListItem extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
    }

    /* ?? Row Container ?? */
    .row {
      display: grid;
      grid-template-columns: subgrid;
      grid-column: 1 / -1;
      align-items: center;
      min-height: var(--control-height-md, 32px);
      padding: 0 var(--space-4, 16px);

      /* Border: Forced Colors Mode????????????????????????????????? */
      border-left: var(--border-width-thick, 2px) solid transparent;

      /* Background & Border Transition */
      background-color: transparent;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));

      /* Cursor */
      cursor: pointer;
    }

    /* ?? Hover / Focus Within State ?? */
    .row:hover,
    .row:focus-within {
      background-color: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    /* ?? Active (Focus) State ?? */
    .row.active {
      background-color: var(--bg-surface-active, oklch(0% 0 0 / 0.08));
      border-left-color: var(--primary, oklch(60% 0.15 250));
    }

    /* ?? Touch Target (??44×44px) ?? */
    /**
     * ???????32px????????????????????????44px????
     * ??????????????????????z-index????????
     */
    .row::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      min-height: var(--control-min-touch, 44px);
      pointer-events: auto;
      z-index: 0;
    }

    /* ????????????? */
    .row > ::slotted(*) {
      position: relative;
      z-index: 1;
    }

    /* ?? Action Button Container ?? */
    /**
     * ??????????????????????
     * ???????????????????????????????
     */
    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
      opacity: 0;
      transition: opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
      position: relative;
      z-index: 1;
    }

    .row:hover .actions,
    .row:focus-within .actions,
    .row.active .actions {
      opacity: 1;
    }

    /* ?? Motion Reduction ?? */
    @media (prefers-reduced-motion: reduce) {
      .row,
      .actions {
        transition-duration: 0.01ms;
      }
    }

    /* ?? Forced Colors Mode ?? */
    @media (forced-colors: active) {
      /* Active State: ??????? Highlight???????????? */
      .row.active {
        border-left-color: Highlight;
      }

      .row:focus-within {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
    }

    /* ?? Print Styles ?? */
    @media print {
      .actions {
        display: none !important;
      }

      .row {
        border-left: none !important;
        background: transparent !important;
      }
    }

    /* ?? Mobile Supplement ?? */
    .mobile-supplement {
      display: none;
    }

    @media (max-width: 768px) {
      .mobile-supplement {
        display: inline;
        color: var(--fg-muted, oklch(48% 0.01 250));
        font-size: var(--text-sm, 13px);
        margin-left: var(--space-2, 8px);
      }
    }
  `;

  /**
   * ????ID?`items` ???? `id` ????
   */
  @property({ type: String, attribute: 'item-id', reflect: true })
  itemId = '';

  /**
   * ????????????????Detail View?
   * ??????????? `null`
   */
  @property({ type: String, reflect: true })
  href: string | null = null;

  /**
   * ????????????????????
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  active = false;

  /**
   * ??????????????????
   * @default null
   */
  @property({ type: Number, attribute: 'row-index', reflect: true })
  rowIndex: number | null = null;

  /**
   * ??????????
   * Primary Action??????? <a> ?????????????
   *
   * ## ?????????:
   * - ??????? (`window.getSelection().toString()`)
   * - ??????? (Command, Ctrl, Shift, Alt) - ????????????????
   * - ????? (Mouse Button 1)
   */
  private _handleClick = (e: MouseEvent): void => {
    this._handleActivationEvent(e);
  }

  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') {
      return;
    }
    this._handleActivationEvent(e);
  }

  private _handleActivationEvent = (e: MouseEvent | KeyboardEvent): void => {
    const hasTextSelection = (window.getSelection()?.toString().length ?? 0) > 0;
    const hasModifierKey = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    const isMiddleClick = e instanceof MouseEvent && e.button === 1;

    if (hasTextSelection || hasModifierKey || isMiddleClick) {
      return;
    }

    const target = e.target;
    if (target instanceof HTMLElement && target.closest('a, button, [role="button"]')) {
      return;
    }

    const primaryLink = this.shadowRoot?.querySelector('slot')?.assignedElements().find(
      el => {
        const gridcell = el.querySelector('[role="gridcell"]');
        return gridcell?.querySelector('a');
      }
    )?.querySelector('[role="gridcell"] a') as HTMLAnchorElement | undefined;

    if (primaryLink && this.href) {
      e.preventDefault();
      primaryLink.click();
    }

    this.dispatchEvent(new CustomEvent('ui-item-click', {
      detail: { itemId: this.itemId, event: e },
      bubbles: true,
      composed: true,
    }));
  }
  private _handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('ui-item-context', {
      detail: {
        itemId: this.itemId,
        anchor: { x: e.clientX, y: e.clientY },
      },
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    const classes = {
      row: true,
      active: this.active,
    };

    return html`
      <div
        class="${classMap(classes)}"
        role="row"
        aria-rowindex="${ifDefined(this.rowIndex ?? undefined)}"
        aria-selected="${this.active}"
        aria-haspopup="dialog"
        tabindex="-1"
        @click="${this._handleClick}"
        @keydown="${this._handleKeyDown}"
        @contextmenu="${this._handleContextMenu}"
      >
        <slot></slot>

        <!-- Mobile Supplement Slot -->
        <span class="mobile-supplement">
          <slot name="mobile-supplement"></slot>
        </span>

        <!-- Action Buttons Container -->
        <div class="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-list-item': ListItem;
  }
}
