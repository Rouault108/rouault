import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

/** ドキュメントに注入するスタイルタグのID（重複注入防止） */
const DOCUMENT_STYLE_ID = 'ui-ol-document-styles';

/**
 * Shadow DOM の `::slotted()` 制約を回避しつつ、`ui-ol` 配下の ordered list のみを
 * 安定して整形するため、スタイルはドキュメントへ注入する。
 */
const DOCUMENT_CSS = `
ui-ol ol {
  --ui-ol-marker-column: 3ch;
  list-style: none;
  counter-reset: list-item var(--ui-ol-counter-reset, 0);
  margin: 0;
  padding: 0;
}

ui-ol ol > li + li {
  margin-block-start: var(--space-2);
}

ui-ol ol > li {
  display: grid;
  grid-template-columns: var(--ui-ol-marker-column) 1fr;
  gap: var(--space-2);
  align-items: baseline;
}

ui-ol ol > li::before {
  counter-increment: list-item var(--ui-ol-counter-step, 1);
  content: counter(list-item) ".";
  font-family: var(--font-mono);
  font-size: inherit;
  font-weight: var(--font-medium);
  font-variant-numeric: tabular-nums;
  color: var(--fg-muted);
  justify-self: end;
}

ui-ol ol > li[data-ol-has-value] {
  counter-set: list-item var(--ui-ol-counter-set, 0);
}

ui-ol[variant="steps"] ol > li::before {
  color: var(--primary);
}

ui-ol ol > li > ol {
  margin-block-start: var(--space-2);
}

ui-ol ol > li :is(a, button, [role="button"]) {
  position: relative;
  min-height: max(var(--control-height-sm, 32px), 24px);
}

ui-ol ol > li :is(a, button, [role="button"])::after {
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
  ui-ol ol > li::before {
    color: CanvasText;
    forced-color-adjust: auto;
  }
}
`;

const parseInteger = (value: string | null): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[-+]?\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const markerLength = (value: number): number => `${String(value)}.`.length;

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

  private _getDirectItems(list: HTMLOListElement): HTMLLIElement[] {
    return [...list.children].filter(
      (child): child is HTMLLIElement => child instanceof HTMLLIElement,
    );
  }

  /**
   * 表示される marker 文字列長に応じて、本文開始位置が崩れない列幅を与える。
   */
  private _syncMarkerColumn(list: HTMLOListElement): void {
    const directItems = this._getDirectItems(list);
    const itemCount = directItems.length;
    const hasReversed = list.hasAttribute('reversed');
    const explicitStart = parseInteger(list.getAttribute('start'));
    const start = explicitStart ?? (hasReversed ? itemCount : 1);
    const step = hasReversed ? -1 : 1;

    let current = start;
    let maxColumn = Math.max(3, markerLength(start));

    for (const item of directItems) {
      const explicitValue = parseInteger(item.getAttribute('value'));
      if (explicitValue !== null) {
        current = explicitValue;
      }
      maxColumn = Math.max(maxColumn, markerLength(current));
      current += step;
    }

    list.style.setProperty('--ui-ol-marker-column', `${String(maxColumn)}ch`);
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
    const children =
      'children' in this
        ? Array.from((this as typeof this & { children?: ArrayLike<Element> }).children)
        : [];
    const rootLists = children.filter(
      (child): child is HTMLOListElement => child instanceof HTMLOListElement,
    );

    for (const rootList of rootLists) {
      const allLists = [rootList, ...rootList.querySelectorAll('ol')];
      for (const list of allLists) {
        this._syncMarkerColumn(list);
        this._syncCounterSettings(list);
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
