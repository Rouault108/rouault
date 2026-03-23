import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

/** ドキュメントに注入するスタイルタグのID（重複注入防止） */
const DOCUMENT_STYLE_ID = 'ui-ol-document-styles';

/**
 * Shadow DOM の `::slotted()` 制約を回避し、ネストした `li` まで確実に制御するため、
 * リスト本体スタイルはドキュメントへ注入する。
 *
 * 適用スコープは `.prose ol` と `ui-ol > ol` のみに限定し、
 * グローバル `ol` への副作用を防ぐ。
 */
const DOCUMENT_CSS = `
:where(.prose ol, ui-ol > ol) {
  --ol-marker-column: 3ch;
  list-style: none;
  counter-reset: list-item var(--ui-ol-counter-reset, 0);
  margin: 0;
  padding: 0;
}

:where(.prose ol[data-marker-digits="3"], ui-ol > ol[data-marker-digits="3"]) {
  --ol-marker-column: 4ch;
}

:where(.prose ol li, ui-ol li) + :where(.prose ol li, ui-ol li) {
  margin-block-start: var(--space-2);
}

:where(.prose ol li, ui-ol li) {
  display: grid;
  grid-template-columns: var(--ol-marker-column) 1fr;
  gap: var(--space-2);
  align-items: baseline;
}

:where(.prose ol li, ui-ol li)::before {
  counter-increment: list-item var(--ui-ol-counter-step, 1);
  content: counter(list-item) ".";
  font-family: var(--font-mono);
  font-size: inherit;
  font-weight: var(--font-medium);
  font-variant-numeric: tabular-nums;
  color: var(--fg-muted);
  justify-self: end;
}

:where(.prose ol li[data-ol-has-value], ui-ol li[data-ol-has-value]) {
  counter-set: list-item var(--ui-ol-counter-set, 0);
}

:where(.prose ol[variant="steps"] li, ui-ol[variant="steps"] li, ui-ol > ol[variant="steps"] li)::before {
  color: var(--primary);
}

:where(.prose ol li ol, ui-ol li ol) {
  margin-block-start: var(--space-2);
}

:where(.prose ol li, ui-ol li) :is(a, button, [role="button"]) {
  position: relative;
  min-height: max(var(--control-height-sm, 32px), 24px);
}

:where(.prose ol li, ui-ol li) :is(a, button, [role="button"])::after {
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
  :where(.prose ol li, ui-ol li)::before {
    color: CanvasText;
    forced-color-adjust: auto;
  }
}
`;

const parseInteger = (value: string | null): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const digits = (value: number): number => Math.abs(value).toString().length;

@customElement('ui-ol')
export class Ol extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
  `;

  private _observer: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    this._syncOrderedLists();
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
      this._syncOrderedLists();
    });

    this._observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['start', 'reversed', 'value'],
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
   * `<ui-ol><li>...</li></ui-ol>` の入力も受け入れるため、
   * 直下 `li` のみが存在する場合は `ol` を自動補完する。
   */
  private _ensureRootList(): void {
    const children =
      'children' in this
        ? Array.from((this as typeof this & { children?: ArrayLike<Element> }).children ?? [])
        : [];
    const directItems = children.filter(
      (child): child is HTMLLIElement => child instanceof HTMLLIElement,
    );
    if (directItems.length === 0) return;

    const firstItem = directItems[0];
    if (!firstItem) return;

    const list = document.createElement('ol');
    this.insertBefore(list, firstItem);
    for (const item of directItems) {
      list.appendChild(item);
    }
  }

  private _getDirectItems(list: HTMLOListElement): HTMLLIElement[] {
    return [...list.children].filter(
      (child): child is HTMLLIElement => child instanceof HTMLLIElement,
    );
  }

  /**
   * `start` / `reversed` / `li[value]` / 直下 `li` 件数から、
   * 3桁以上の番号が出る可能性を判定して属性を付与する。
   */
  private _syncMarkerDigits(list: HTMLOListElement): void {
    const directItems = this._getDirectItems(list);
    const itemCount = directItems.length;
    const hasReversed = list.hasAttribute('reversed');
    const explicitStart = parseInteger(list.getAttribute('start'));
    const start = explicitStart ?? (hasReversed ? itemCount : 1);
    const step = hasReversed ? -1 : 1;
    const end = itemCount > 0 ? start + step * (itemCount - 1) : start;

    const explicitValues = directItems
      .map((item) => parseInteger(item.getAttribute('value')))
      .filter((value): value is number => value !== null);

    const maxDigits = Math.max(
      digits(start),
      digits(end),
      ...explicitValues.map((value) => digits(value)),
    );

    if (maxDigits >= 3) {
      list.setAttribute('data-marker-digits', '3');
      return;
    }
    list.removeAttribute('data-marker-digits');
  }

  /**
   * `start` / `reversed` / `li[value]` を視覚マーカーにも反映するため、
   * カウンタ開始値と `counter-set` を同期する。
   */
  private _syncCounterSettings(list: HTMLOListElement): void {
    const directItems = this._getDirectItems(list);
    const itemCount = directItems.length;
    const hasReversed = list.hasAttribute('reversed');
    const explicitStart = parseInteger(list.getAttribute('start'));
    const start = explicitStart ?? (hasReversed ? itemCount : 1);
    const step = hasReversed ? -1 : 1;
    const baseCounterValue = start - step;

    list.style.setProperty('--ui-ol-counter-reset', String(baseCounterValue));
    list.style.setProperty('--ui-ol-counter-step', String(step));

    for (const item of directItems) {
      const explicitValue = parseInteger(item.getAttribute('value'));
      if (explicitValue === null) {
        item.removeAttribute('data-ol-has-value');
        item.style.removeProperty('--ui-ol-counter-set');
        continue;
      }

      item.setAttribute('data-ol-has-value', '');
      item.style.setProperty('--ui-ol-counter-set', String(explicitValue - step));
    }
  }

  private _syncOrderedLists(): void {
    this._ensureRootList();

    const children =
      'children' in this
        ? Array.from((this as typeof this & { children?: ArrayLike<Element> }).children ?? [])
        : [];
    const rootLists = children.filter(
      (child): child is HTMLOListElement => child instanceof HTMLOListElement,
    );

    for (const rootList of rootLists) {
      const allLists = [rootList, ...rootList.querySelectorAll('ol')];
      for (const list of allLists) {
        if (!list.hasAttribute('role')) {
          list.setAttribute('role', 'list');
        }
        this._syncMarkerDigits(list);
        this._syncCounterSettings(list);
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
    this._syncOrderedLists();
  };

  override render() {
    return html`<slot @slotchange="${this._handleSlotChange}"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-ol': Ol;
  }
}
