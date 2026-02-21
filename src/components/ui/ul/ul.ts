import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

/** ドキュメントに注入するスタイルタグのID（重複注入防止） */
const DOCUMENT_STYLE_ID = 'ui-ul-document-styles';

/**
 * Shadow DOM の `::slotted()` 制約を回避し、ネストした `li` まで確実に制御するため、
 * リスト本体スタイルはドキュメントへ注入する。
 *
 * 適用スコープは `.prose ul` と `ui-ul > ul` のみに限定し、
 * グローバル `ul` への副作用を防ぐ。
 */
const DOCUMENT_CSS = `
:where(.prose ul, ui-ul > ul) {
  list-style: none;
  padding: 0;
  margin: 0;
}

:where(.prose ul li, ui-ul li) {
  display: grid;
  grid-template-columns: var(--space-4) 1fr;
  gap: var(--space-2);
  align-items: baseline;
}

:where(.prose ul li, ui-ul li) + :where(.prose ul li, ui-ul li) {
  margin-block-start: var(--space-2);
}

:where(.prose ul li, ui-ul li)::before {
  content: "●";
  color: var(--fg-muted);
  justify-self: center;
}

:where(.prose ul li li, ui-ul li li)::before {
  content: "○";
}

:where(.prose ul li li li, ui-ul li li li)::before {
  content: "■";
}

:where(.prose ul li ul, ui-ul li ul) {
  margin-block-start: var(--space-2);
}

:where(.prose ul li, ui-ul li) :is(a, button, [role="button"]) {
  position: relative;
  min-height: max(var(--control-height-sm, 32px), 24px);
}

:where(.prose ul li, ui-ul li) :is(a, button, [role="button"])::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--control-min-touch);
  height: var(--control-min-touch);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

@media (forced-colors: active) {
  :where(.prose ul li, ui-ul li)::before {
    color: CanvasText;
    forced-color-adjust: auto;
  }
}
`;

@customElement('ui-ul')
export class Ul extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
  `;

  private _observer: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    this._syncListSemantics();
    this._observeLightDomChanges();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  private _observeLightDomChanges(): void {
    if (typeof MutationObserver === 'undefined') return;

    this._observer = new MutationObserver(() => {
      this._syncListSemantics();
    });

    this._observer.observe(this, {
      childList: true,
      subtree: true,
    });
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.appendChild(style);
  }

  /**
   * `<ui-ul><li>...</li></ui-ul>` の入力も受け入れるため、
   * 直下 `li` のみが存在する場合は `ul` を自動補完する。
   */
  private _ensureRootList(): void {
    const directLists = [...this.children].filter(
      (child): child is HTMLUListElement => child instanceof HTMLUListElement,
    );
    if (directLists.length > 0) return;

    const directItems = [...this.children].filter(
      (child): child is HTMLLIElement => child instanceof HTMLLIElement,
    );
    if (directItems.length === 0) return;

    const firstItem = directItems[0];
    if (!firstItem) return;

    const list = document.createElement('ul');
    this.insertBefore(list, firstItem);
    for (const item of directItems) {
      list.appendChild(item);
    }
  }

  private _syncListSemantics(): void {
    this._ensureRootList();

    const rootLists = [...this.children].filter(
      (child): child is HTMLUListElement => child instanceof HTMLUListElement,
    );

    for (const rootList of rootLists) {
      const allLists = [rootList, ...rootList.querySelectorAll('ul')];

      for (const list of allLists) {
        if (!list.hasAttribute('role')) {
          list.setAttribute('role', 'list');
        }
      }

      const allItems = rootList.querySelectorAll('li');
      for (const item of allItems) {
        if (!item.hasAttribute('role')) {
          item.setAttribute('role', 'listitem');
        }
      }
    }
  }

  private readonly _handleSlotChange = (): void => {
    this._syncListSemantics();
  };

  override render() {
    return html`<slot @slotchange="${this._handleSlotChange}"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-ul': Ul;
  }
}
