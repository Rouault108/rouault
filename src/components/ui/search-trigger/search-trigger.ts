import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../button/button.js';
import '../icon/icon.js';

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

    ui-button {
      display: inline-flex;
      inline-size: fit-content;
      min-inline-size: 0;
      max-inline-size: min(100%, 20rem);
      color: inherit;
    }

    ui-button::part(button) {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      position: relative;
      inline-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      gap: var(--space-2, 8px);
      padding-inline: var(--search-trigger-padding-inline, var(--space-3, 12px));
      border: var(--border-width, 1px) solid transparent;
      border-radius: var(--radius-md, 6px);
      background: var(--bg-fill-muted, oklch(95% 0 0));
      box-shadow: none;
      color: inherit;
      font: inherit;
      line-height: 1;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        box-shadow var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    ui-button::part(button):hover:not(:disabled) {
      border-color: var(--border-default, oklch(85% 0 0));
      background: var(--bg-fill-muted, oklch(95% 0 0));
    }

    ui-button::part(button):focus-visible {
      border-color: var(--border-default, oklch(85% 0 0));
      background: var(--bg-default, oklch(100% 0 0));
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    ui-button::part(button):active:not(:disabled) {
      border-color: var(--border-default, oklch(85% 0 0));
      background: var(--bg-default, oklch(100% 0 0));
      transform: scale(var(--scale-pressed, 0.96));
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

    .icon ui-icon {
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

    ui-button[data-density='auto']::part(button),
    ui-button[data-density='compact']::part(button) {
      gap: var(--space-1, 4px);
      padding-inline: var(--space-2, 8px);
    }

    ui-button[data-density='icon-only']::part(button) {
      justify-content: center;
      inline-size: max(
        var(--control-height-md, 32px),
        var(--control-min-touch, var(--control-height-md, 32px))
      );
      padding-inline: 0;
    }

    ui-button[data-density='icon-only'] .placeholder {
      display: none;
    }

    @media (max-width: 960px) {
      ui-button[data-density='auto']::part(button) {
        gap: var(--space-1, 4px);
        padding-inline: var(--space-2, 8px);
      }
    }

    @media (max-width: 639px) {
      ui-button[data-density='auto']::part(button) {
        justify-content: center;
        inline-size: max(
          var(--control-height-md, 32px),
          var(--control-min-touch, var(--control-height-md, 32px))
        );
        padding-inline: 0;
      }

      ui-button[data-density='auto'] .placeholder {
        display: none;
      }
    }

    @media (forced-colors: active) {
      ui-button::part(button) {
        border-color: CanvasText;
        background: Canvas;
      }

      ui-button::part(button):hover:not(:disabled) {
        border-color: CanvasText;
      }

      ui-button::part(button):focus-visible {
        outline: 3px solid CanvasText;
      }

      ui-button::part(button):active:not(:disabled) {
        border-color: CanvasText;
        background: ButtonFace;
      }

      .icon,
      .placeholder {
        color: CanvasText;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      ui-button::part(button) {
        animation: none;
        transition:
          background-color 0s,
          border-color 0s,
          box-shadow 0s,
          transform 0s,
          outline-color 0s;
      }

      ui-button::part(button):active:not(:disabled) {
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

  private get _button(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('ui-button') ?? null;
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
      <ui-button
        part="button"
        variant="ghost"
        size="md"
        data-density="${this.density}"
        .disabled=${this.disabled}
        .accessibleName=${this._resolvedAriaLabel}
        aria-haspopup="dialog"
        aria-controls=${ifDefined(this.ariaControls ?? undefined)}
        aria-expanded=${ifDefined(this.ariaExpanded ?? undefined)}
        @click=${this._handleActivate}
      >
        <span class="icon" part="icon" aria-hidden="true">
          <ui-icon name="search" aria-hidden="true"></ui-icon>
        </span>
        <span class="placeholder" part="placeholder" aria-hidden="true"
          >${this._normalizedPlaceholder}</span
        >
      </ui-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-trigger': SearchTrigger;
  }
}