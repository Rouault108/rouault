import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../../../lib/icons';

export type CalloutVariant = 'note' | 'tip' | 'success' | 'warning' | 'danger';

interface CalloutVariantConfig {
  readonly icon: string;
  readonly fallbackLabel: string;
}

const VARIANT_CONFIG: Record<CalloutVariant, CalloutVariantConfig> = {
  note: {
    icon: 'lucide:info',
    fallbackLabel: '補足',
  },
  tip: {
    icon: 'lucide:lightbulb',
    fallbackLabel: 'ヒント',
  },
  success: {
    icon: 'lucide:check-circle',
    fallbackLabel: '成功',
  },
  warning: {
    icon: 'lucide:alert-triangle',
    fallbackLabel: '警告',
  },
  danger: {
    icon: 'lucide:alert-octagon',
    fallbackLabel: '注意',
  },
};

const VALID_VARIANTS = new Set<CalloutVariant>(['note', 'tip', 'success', 'warning', 'danger']);

let calloutTitleId = 0;

@customElement('ui-callout')
export class Callout extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .callout {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3, 12px);
      padding: var(--space-4, 16px);
      border-radius: var(--radius-md, 6px);
      border-inline-start: var(--border-width-thick, 2px) solid var(--fg-muted);
      background: var(--bg-note-subtle);
      color: var(--fg-default);
    }

    .callout[data-variant='note'] {
      background: var(--bg-note-subtle);
      border-inline-start-color: var(--fg-muted);
      --ui-callout-accent-color: var(--fg-muted);
    }

    .callout[data-variant='tip'] {
      background: var(--bg-tip-subtle);
      border-inline-start-color: var(--fg-info);
      --ui-callout-accent-color: var(--fg-info);
    }

    .callout[data-variant='success'] {
      background: var(--bg-success-subtle);
      border-inline-start-color: var(--fg-success);
      --ui-callout-accent-color: var(--fg-success);
    }

    .callout[data-variant='warning'] {
      background: var(--bg-warning-subtle);
      border-inline-start-color: var(--fg-warning);
      --ui-callout-accent-color: var(--fg-warning);
    }

    .callout[data-variant='danger'] {
      background: var(--bg-danger-subtle);
      border-inline-start-color: var(--fg-danger);
      --ui-callout-accent-color: var(--fg-danger);
    }

    .icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      width: var(--icon-base, 16px);
      /* テキスト1行分の行高さに合わせることでアイコンを1行目に垂直中央配置する */
      height: calc(1em * var(--line-height-relaxed, 1.75));
      stroke-width: 1.5;
      color: var(--ui-callout-accent-color, var(--fg-muted));
    }

    .content {
      min-width: 0;
      line-height: var(--line-height-relaxed, 1.75);
      color: var(--fg-default);
    }

    .title {
      margin: 0 0 var(--space-2, 8px) 0;
      font-weight: var(--font-semibold, 600);
      line-height: var(--line-height-relaxed, 1.75);
      color: inherit;
    }

    .body {
      color: inherit;
    }

    @media (forced-colors: active) {
      .callout {
        border: var(--border-width, 1px) solid var(--border-default);
        border-inline-start: var(--border-width-thick, 2px) solid var(--primary);
      }

      .callout[data-variant='danger'] {
        border-inline-start-color: var(--danger);
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: CalloutVariant = 'note';

  @property({ type: String, reflect: true })
  override title = '';

  @property({ type: String, reflect: true })
  icon = '';

  @property({ type: Number, attribute: 'heading-level', reflect: true })
  headingLevel: number | undefined = undefined;

  private readonly _titleId = `ui-callout-title-${String(++calloutTitleId)}`;

  private get _resolvedVariant(): CalloutVariant {
    if (VALID_VARIANTS.has(this.variant)) {
      return this.variant;
    }

    return 'note';
  }

  private get _resolvedTitle(): string {
    return this.title.trim();
  }

  private get _resolvedHeadingLevel(): number | null {
    if (this._resolvedTitle.length === 0) return null;
    if (typeof this.headingLevel !== 'number' || !Number.isFinite(this.headingLevel)) return null;
    if (!Number.isInteger(this.headingLevel)) return null;

    if (this.headingLevel < 1 || this.headingLevel > 6) return null;

    return this.headingLevel;
  }

  private get _resolvedIcon(): string {
    const icon = this.icon.trim();
    if (icon !== '') return icon;

    return VARIANT_CONFIG[this._resolvedVariant].icon;
  }

  override render() {
    const title = this._resolvedTitle;
    const hasTitle = title.length > 0;
    const headingLevel = this._resolvedHeadingLevel;
    const explicitLabel = this.getAttribute('aria-label')?.trim();
    const labelFallback =
      explicitLabel && explicitLabel.length > 0
        ? explicitLabel
        : VARIANT_CONFIG[this._resolvedVariant].fallbackLabel;

    return html`
      <aside
        class="callout"
        data-variant="${this._resolvedVariant}"
        aria-labelledby="${ifDefined(hasTitle ? this._titleId : undefined)}"
        aria-label="${ifDefined(hasTitle ? undefined : labelFallback)}"
      >
        <iconify-icon class="icon" icon="${this._resolvedIcon}" aria-hidden="true"></iconify-icon>

        <div class="content">
          ${hasTitle
            ? html`
                <div
                  id="${this._titleId}"
                  class="title"
                  role="${headingLevel !== null ? 'heading' : nothing}"
                  aria-level="${ifDefined(
                    headingLevel !== null ? String(headingLevel) : undefined,
                  )}"
                >
                  ${title}
                </div>
              `
            : nothing}

          <div class="body">
            <slot></slot>
          </div>
        </div>
      </aside>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-callout': Callout;
  }
}
