import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../../../lib/icons';

export type CalloutKind = 'note' | 'tip' | 'success' | 'warning' | 'danger';

interface CalloutKindConfig {
  readonly icon: string;
  readonly fallbackLabel: string;
}

const KIND_CONFIG: Record<CalloutKind, CalloutKindConfig> = {
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
    fallbackLabel: '危険',
  },
};

const VALID_KINDS = new Set<CalloutKind>(['note', 'tip', 'success', 'warning', 'danger']);

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeCalloutKind = (value: unknown): CalloutKind => {
  const normalized = normalizeString(value).toLowerCase();
  return VALID_KINDS.has(normalized as CalloutKind) ? (normalized as CalloutKind) : 'note';
};

let calloutHeadingId = 0;

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

    .callout[data-kind='note'] {
      background: var(--bg-note-subtle);
      border-inline-start-color: var(--fg-muted);
      --ui-callout-accent-color: var(--fg-muted);
    }

    .callout[data-kind='tip'] {
      background: var(--bg-tip-subtle);
      border-inline-start-color: var(--fg-info);
      --ui-callout-accent-color: var(--fg-info);
    }

    .callout[data-kind='success'] {
      background: var(--bg-success-subtle);
      border-inline-start-color: var(--fg-success);
      --ui-callout-accent-color: var(--fg-success);
    }

    .callout[data-kind='warning'] {
      background: var(--bg-warning-subtle);
      border-inline-start-color: var(--fg-warning);
      --ui-callout-accent-color: var(--fg-warning);
    }

    .callout[data-kind='danger'] {
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

    .heading {
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

      .callout[data-kind='danger'] {
        border-inline-start-color: var(--danger);
      }
    }
  `;

  @property({ type: String, reflect: true })
  get kind(): CalloutKind {
    return this._kind;
  }

  set kind(value: CalloutKind) {
    const normalized = normalizeCalloutKind(value);
    const oldValue = this._kind;
    if (oldValue === normalized) {
      return;
    }

    this._kind = normalized;
    this.requestUpdate('kind', oldValue);
  }

  @property({ type: String, reflect: true })
  get heading(): string {
    return this._heading;
  }

  set heading(value: string) {
    const normalized = normalizeString(value);
    const oldValue = this._heading;
    if (oldValue === normalized) {
      return;
    }

    this._heading = normalized;
    this.requestUpdate('heading', oldValue);
  }

  @property({ type: String, reflect: true })
  get label(): string {
    return this._label;
  }

  set label(value: string) {
    const normalized = normalizeString(value);
    const oldValue = this._label;
    if (oldValue === normalized) {
      return;
    }

    this._label = normalized;
    this.requestUpdate('label', oldValue);
  }

  @property({ type: String, reflect: true })
  get icon(): string {
    return this._icon;
  }

  set icon(value: string) {
    const normalized = normalizeString(value);
    const oldValue = this._icon;
    if (oldValue === normalized) {
      return;
    }

    this._icon = normalized;
    this.requestUpdate('icon', oldValue);
  }

  @property({ type: Number, attribute: 'heading-level', reflect: true })
  headingLevel: number | undefined = undefined;

  private _kind: CalloutKind = 'note';

  private _heading = '';

  private _label = '';

  private _icon = '';

  private readonly _headingId = `ui-callout-heading-${String(++calloutHeadingId)}`;

  private get _resolvedHeadingLevel(): number | null {
    if (this.heading.length === 0) return null;
    if (typeof this.headingLevel !== 'number' || !Number.isFinite(this.headingLevel)) return null;
    if (!Number.isInteger(this.headingLevel)) return null;

    if (this.headingLevel < 1 || this.headingLevel > 6) return null;

    return this.headingLevel;
  }

  private get _resolvedIcon(): string {
    if (this.icon !== '') return this.icon;

    return KIND_CONFIG[this.kind].icon;
  }

  private get _resolvedLabel(): string {
    if (this.label !== '') {
      return this.label;
    }

    return KIND_CONFIG[this.kind].fallbackLabel;
  }

  override render() {
    const hasHeading = this.heading.length > 0;
    const headingLevel = this._resolvedHeadingLevel;

    return html`
      <aside
        class="callout"
        part="container"
        data-kind="${this.kind}"
        aria-labelledby="${ifDefined(hasHeading ? this._headingId : undefined)}"
        aria-label="${ifDefined(hasHeading ? undefined : this._resolvedLabel)}"
      >
        <iconify-icon
          class="icon"
          part="icon"
          icon="${this._resolvedIcon}"
          aria-hidden="true"
        ></iconify-icon>

        <div class="content">
          ${hasHeading
            ? html`
                <div
                  id="${this._headingId}"
                  class="heading"
                  part="heading"
                  role="${headingLevel !== null ? 'heading' : nothing}"
                  aria-level="${ifDefined(
                    headingLevel !== null ? String(headingLevel) : undefined,
                  )}"
                >
                  ${this.heading}
                </div>
              `
            : nothing}

          <div class="body" part="body">
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
