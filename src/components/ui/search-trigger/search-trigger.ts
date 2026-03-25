import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type SearchTriggerDensity = 'auto' | 'default' | 'compact' | 'icon-only';

const DEFAULT_PLACEHOLDER = '検索...';
const DEFAULT_ARIA_LABEL = '検索ダイアログを開く';
const DENSITY_VALUES: readonly SearchTriggerDensity[] = ['auto', 'default', 'compact', 'icon-only'];

const densityConverter = {
  fromAttribute(value: string | null): SearchTriggerDensity {
    if (value === null) {
      return 'auto';
    }

    return isSearchTriggerDensity(value) ? value : 'auto';
  },
  toAttribute(value: SearchTriggerDensity): string {
    return value;
  },
};

function isSearchTriggerDensity(value: string): value is SearchTriggerDensity {
  return DENSITY_VALUES.includes(value as SearchTriggerDensity);
}

/**
 * 検索トリガーコンポーネント。
 *
 * 検索入力欄に近い外形を取りつつ、実体は検索ダイアログの起動要求を通知する
 * stateless launcher として振る舞います。
 */
@customElement('ui-search-trigger')
export class SearchTrigger extends LitElement {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override styles = css`
    :host {
      display: inline-flex;
      inline-size: fit-content;
    }

    button {
      display: inline-flex;
      align-items: center;
      position: relative;
      gap: var(--space-2, 8px);
      box-sizing: border-box;
      min-block-size: var(--control-height-md, 32px);
      min-inline-size: 0;
      max-inline-size: min(100%, 20rem);
      padding-inline: var(--search-trigger-padding-inline, var(--space-3, 12px));
      border: var(--border-width, 1px) solid transparent;
      border-radius: var(--radius-md, 6px);
      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: inherit;
      font: inherit;
      line-height: 1;
      cursor: pointer;
      user-select: none;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    button:hover:not(:disabled) {
      border-color: var(--border-default, oklch(85% 0 0));
    }

    button:focus-visible {
      border-color: var(--border-default, oklch(85% 0 0));
      background: var(--bg-default, oklch(100% 0 0));
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    button:active:not(:disabled) {
      border-color: var(--border-default, oklch(85% 0 0));
      background: var(--bg-default, oklch(100% 0 0));
      transform: scale(var(--scale-pressed, 0.96));
    }

    button:disabled {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      pointer-events: none;
    }

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      inline-size: var(--icon-base, 16px);
      block-size: var(--icon-base, 16px);
      color: var(--fg-muted, oklch(48% 0 0));
    }

    .icon iconify-icon {
      display: block;
      inline-size: 100%;
      block-size: 100%;
    }

    .placeholder {
      min-inline-size: 0;
      color: var(--fg-subtle, oklch(65% 0 0));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    button[data-density='compact'] {
      gap: var(--space-1, 4px);
      padding-inline: var(--space-2, 8px);
    }

    button[data-density='icon-only'] {
      justify-content: center;
      inline-size: max(
        var(--control-height-md, 32px),
        var(--control-min-touch, var(--control-height-md, 32px))
      );
      padding-inline: 0;
    }

    button[data-density='icon-only'] .placeholder {
      display: none;
    }

    @media (max-width: 960px) {
      button[data-density='auto'] {
        gap: var(--space-1, 4px);
        padding-inline: var(--space-2, 8px);
      }
    }

    @media (max-width: 640px) {
      button[data-density='auto'] {
        justify-content: center;
        inline-size: max(
          var(--control-height-md, 32px),
          var(--control-min-touch, var(--control-height-md, 32px))
        );
        padding-inline: 0;
      }

      button[data-density='auto'] .placeholder {
        display: none;
      }
    }

    @media (forced-colors: active) {
      button {
        border-color: CanvasText;
        background: Canvas;
      }

      button:hover:not(:disabled) {
        border-color: CanvasText;
      }

      button:focus-visible {
        outline: 3px solid CanvasText;
      }

      button:active:not(:disabled) {
        border-color: CanvasText;
        background: ButtonFace;
      }

      .icon,
      .placeholder {
        color: CanvasText;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      button {
        animation: none;
        transition:
          background-color 0s,
          border-color 0s,
          transform 0s,
          outline-color 0s;
      }

      button:active:not(:disabled) {
        transform: none;
      }
    }
  `;

  @property({ type: String, reflect: true })
  placeholder = DEFAULT_PLACEHOLDER;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ reflect: true, converter: densityConverter })
  density: SearchTriggerDensity = 'auto';

  @property({ attribute: 'aria-label', reflect: true })
  override ariaLabel: string | null = null;

  @property({ attribute: 'aria-controls', reflect: true })
  ariaControls: string | null = null;

  @property({ attribute: 'aria-expanded', reflect: true })
  override ariaExpanded: string | null = null;

  private get _button(): HTMLButtonElement | null {
    return this.shadowRoot?.querySelector<HTMLButtonElement>('button') ?? null;
  }

  private get _normalizedPlaceholder(): string {
    return this.placeholder.replace(/\r?\n+/g, ' ');
  }

  private get _resolvedAriaLabel(): string {
    const label = this.ariaLabel?.trim();

    return label === undefined || label === '' ? DEFAULT_ARIA_LABEL : label;
  }

  private _handleActivate = (): void => {
    if (this.disabled) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent('open-search-dialog', {
        bubbles: true,
        composed: true,
      }),
    );
  };

  override focus(options?: FocusOptions): void {
    this._button?.focus(options);
  }

  override blur(): void {
    this._button?.blur();
  }

  override click(): void {
    this._button?.click();
  }

  override render() {
    return html`
      <button
        part="button"
        type="button"
        data-density="${this.density}"
        ?disabled=${this.disabled}
        aria-label=${this._resolvedAriaLabel}
        aria-haspopup="dialog"
        aria-controls=${ifDefined(this.ariaControls ?? undefined)}
        aria-expanded=${ifDefined(this.ariaExpanded ?? undefined)}
        @click=${this._handleActivate}
      >
        <span class="icon" part="icon" aria-hidden="true">
          <iconify-icon icon="lucide:search" aria-hidden="true"></iconify-icon>
        </span>
        <span class="placeholder" part="placeholder" aria-hidden="true">${this._normalizedPlaceholder}</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-trigger': SearchTrigger;
  }
}
