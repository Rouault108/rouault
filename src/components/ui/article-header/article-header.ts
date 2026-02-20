import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type ArticleStatus = 'draft' | 'archived' | 'wip' | 'deprecated';

export interface TagClickDetail {
  tag: string;
  href: string;
}

interface StatusPresentation {
  label: string;
  icon: string;
  toneClass: string;
}

/**
 * 記事ヘッダーコンポーネント。
 *
 * - `updated > published` の優先順位で表示日を決定
 * - `tags` は property only（`.tags=${string[]}`）
 * - タグクリック時に `tag-click` を発火
 */
@customElement('ui-article-header')
export class ArticleHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
      max-width: var(--width-reading, 72ch);
    }

    .article-header {
      display: block;
    }

    .heading {
      margin: 0;
      max-width: var(--width-reading, 72ch);
      font-size: clamp(var(--text-2xl, 24px), 4vw + 1rem, var(--text-4xl, 36px));
      font-weight: 700;
      line-height: clamp(2rem, 5vw, 2.5rem);
      letter-spacing: var(--tracking-tight, -0.01em);
      color: var(--fg-default, oklch(20% 0.01 250));
      font-feature-settings: 'palt';
      word-break: auto-phrase;
      overflow-wrap: break-word;
    }

    @media (min-width: 900px) {
      .heading {
        line-height: var(--line-height-tight, 1.25);
      }
    }

    .metadata-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      list-style: none;
      margin: var(--space-4, 16px) 0 0;
      padding: 0;
      gap: 0;
      font-size: var(--text-sm, 13px);
      font-weight: 500;
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    .no-lead .metadata-list {
      margin-bottom: var(--space-12, 48px);
    }

    .metadata-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      min-width: 0;
    }

    .metadata-item + .metadata-item::before {
      content: '・';
      content: '・' / '';
      margin-inline: var(--space-3, 12px);
      color: var(--fg-subtle, oklch(60% 0.01 250));
      flex-shrink: 0;
    }

    .meta-icon {
      width: var(--icon-sm, 14px);
      height: var(--icon-sm, 14px);
      font-size: var(--icon-sm, 14px);
      color: currentColor;
      flex-shrink: 0;
      transform: translateY(1px);
    }

    .silent-link {
      color: inherit;
      text-decoration: none;
      border-radius: 2px;
      outline: var(--focus-ring-width, 2px) solid transparent;
      outline-offset: var(--focus-ring-offset, 2px);
      transition:
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .silent-link:hover {
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    .silent-link:focus-visible {
      color: var(--fg-default, oklch(20% 0.01 250));
      outline-color: var(--focus-ring-color, oklch(60% 0.15 250));
      animation: var(--animation-focus, none);
    }

    .tag-links {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2, 8px);
      min-width: 0;
    }

    .tag-link {
      white-space: nowrap;
    }

    .status {
      font-weight: 500;
    }

    .status-draft {
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    .status-archived {
      color: var(--fg-subtle, oklch(60% 0.01 250));
    }

    .status-wip {
      color: var(--fg-warning, oklch(72% 0.13 85));
    }

    .status-deprecated {
      color: var(--fg-danger, oklch(60% 0.22 25));
    }

    .lead {
      margin-top: var(--space-6, 24px);
      margin-bottom: var(--space-12, 48px);
      max-width: var(--width-reading, 72ch);
      color: var(--fg-default, oklch(20% 0.01 250));
      font-size: var(--text-xl, 18px);
      line-height: var(--line-height-relaxed, 1.75);
    }

    .lead[hidden] {
      display: none;
    }

    .lead ::slotted(*) {
      margin: 0;
    }

    .lead ::slotted(* + *) {
      margin-top: var(--space-4, 16px);
    }

    @media (hover: none) and (pointer: coarse) {
      .silent-link {
        text-decoration: underline;
        text-decoration-color: var(--link-decoration-color-touch, currentColor);
        text-underline-offset: 0.15em;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .silent-link {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      .heading {
        color: CanvasText;
      }

      .metadata-list {
        color: GrayText;
      }

      .silent-link {
        color: LinkText;
        text-decoration: underline;
      }

      .silent-link:focus-visible {
        outline-color: Highlight;
      }

      .status {
        color: CanvasText;
      }
    }
  `;

  @property({ type: String })
  heading = '';

  @property({ type: String })
  published = '';

  @property({ type: String })
  created = '';

  // LitElement のライフサイクル `updated()` と衝突しないよう内部名を分離
  @property({ type: String, attribute: 'updated' })
  updatedDate = '';

  @property({ attribute: false })
  tags: string[] = [];

  @property({ type: Number, attribute: 'reading-time' })
  readingTime: number | null = null;

  @property({ type: String })
  status: ArticleStatus | '' = '';

  @property({ type: String })
  source = '';

  @property({ type: String })
  license = '';

  @state()
  private _hasLead = false;

  override firstUpdated(): void {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('#lead-slot');
    if (slot) {
      this._syncLeadState(slot);
    }
  }

  private get _displayDate(): string {
    return this.updatedDate || this.published;
  }

  private get _displayDateLabel(): string {
    return this.updatedDate ? '最終更新日' : '公開日';
  }

  private get _normalizedTags(): string[] {
    return this.tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  private get _displayReadingTime(): number | null {
    if (this.readingTime === null || Number.isNaN(this.readingTime)) {
      return null;
    }

    const rounded = Math.round(this.readingTime);
    return rounded > 0 ? rounded : null;
  }

  private get _statusPresentation(): StatusPresentation | null {
    switch (this.status) {
      case 'draft':
        return { label: '下書き', icon: 'lucide:file-dashed', toneClass: 'status-draft' };
      case 'archived':
        return { label: 'アーカイブ', icon: 'lucide:archive', toneClass: 'status-archived' };
      case 'wip':
        return { label: '作業中', icon: 'lucide:construction', toneClass: 'status-wip' };
      case 'deprecated':
        return { label: '非推奨', icon: 'lucide:alert-triangle', toneClass: 'status-deprecated' };
      default:
        return null;
    }
  }

  private get _hasMetadata(): boolean {
    return (
      this._displayDate.length > 0 ||
      this._normalizedTags.length > 0 ||
      this._displayReadingTime !== null ||
      this.source.length > 0 ||
      this.license.length > 0 ||
      this._statusPresentation !== null
    );
  }

  private _buildTagHref(tag: string): string {
    return `/tags/${encodeURIComponent(tag)}`;
  }

  private _syncLeadState(slot: HTMLSlotElement): void {
    this._hasLead = slot
      .assignedNodes({ flatten: true })
      .some((node) => node.nodeType !== Node.TEXT_NODE || (node.textContent?.trim().length ?? 0) > 0);
  }

  private _handleLeadSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) return;
    this._syncLeadState(slot);
  };

  private _handleTagClick = (event: MouseEvent, tag: string): void => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLAnchorElement)) return;

    const href = target.getAttribute('href') ?? this._buildTagHref(tag);
    const tagClickEvent = new CustomEvent<TagClickDetail>('tag-click', {
      detail: { tag, href },
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    const shouldContinue = this.dispatchEvent(tagClickEvent);
    if (!shouldContinue) {
      event.preventDefault();
    }
  };

  private _renderDateItem(): TemplateResult | typeof nothing {
    const displayDate = this._displayDate;
    if (!displayDate) return nothing;

    const createdSuffix = this.created ? `、作成日: ${this.created}` : '';
    const ariaLabel = `${this._displayDateLabel}: ${displayDate}${createdSuffix}`;

    return html`
      <li class="metadata-item metadata-date">
        <iconify-icon class="meta-icon" icon="lucide:calendar-days" aria-hidden="true"></iconify-icon>
        <time datetime="${displayDate}" aria-label="${ariaLabel}">${displayDate}</time>
      </li>
    `;
  }

  private _renderTagsItem(): TemplateResult | typeof nothing {
    const tags = this._normalizedTags;
    if (tags.length === 0) return nothing;

    return html`
      <li class="metadata-item metadata-tags" aria-label="タグ">
        <iconify-icon class="meta-icon" icon="lucide:hash" aria-hidden="true"></iconify-icon>
        <span class="tag-links">
          ${tags.map((tag) => {
            const href = this._buildTagHref(tag);
            return html`
              <a
                class="silent-link tag-link"
                href="${href}"
                aria-label="タグ: ${tag}"
                @click="${(event: MouseEvent) => { this._handleTagClick(event, tag); }}"
              >
                #${tag}
              </a>
            `;
          })}
        </span>
      </li>
    `;
  }

  private _renderReadingTimeItem(): TemplateResult | typeof nothing {
    const readingTime = this._displayReadingTime;
    if (readingTime === null) return nothing;

    return html`
      <li class="metadata-item metadata-reading-time">
        <iconify-icon class="meta-icon" icon="lucide:clock-3" aria-hidden="true"></iconify-icon>
        <span aria-label="読了目安 ${readingTime}分">読了目安 ${readingTime}分</span>
      </li>
    `;
  }

  private _renderSourceItem(): TemplateResult | typeof nothing {
    if (!this.source) return nothing;

    return html`
      <li class="metadata-item metadata-source">
        <iconify-icon class="meta-icon" icon="lucide:link" aria-hidden="true"></iconify-icon>
        <a class="silent-link source-link" href="${this.source}" rel="noopener noreferrer">原文</a>
      </li>
    `;
  }

  private _renderLicenseItem(): TemplateResult | typeof nothing {
    if (!this.license) return nothing;

    return html`
      <li class="metadata-item metadata-license">
        <iconify-icon class="meta-icon" icon="lucide:scale" aria-hidden="true"></iconify-icon>
        <span>${this.license}</span>
      </li>
    `;
  }

  private _renderStatusItem(): TemplateResult | typeof nothing {
    const status = this._statusPresentation;
    if (!status) return nothing;

    return html`
      <li class="metadata-item status ${status.toneClass}" aria-label="ステータス: ${status.label}">
        <iconify-icon class="meta-icon" icon="${status.icon}" aria-hidden="true"></iconify-icon>
        <span>${status.label}</span>
      </li>
    `;
  }

  override render() {
    const hasMetadata = this._hasMetadata;
    const rootClass = this._hasLead ? 'article-header has-lead' : 'article-header no-lead';

    return html`
      <header class="${rootClass}">
        <h1 class="heading">${this.heading}</h1>

        ${hasMetadata
          ? html`
              <ul class="metadata-list" aria-label="記事メタデータ">
                ${this._renderDateItem()}
                ${this._renderTagsItem()}
                ${this._renderReadingTimeItem()}
                ${this._renderSourceItem()}
                ${this._renderLicenseItem()}
                ${this._renderStatusItem()}
              </ul>
            `
          : nothing}

        <div class="lead" ?hidden="${!this._hasLead}">
          <slot id="lead-slot" @slotchange="${this._handleLeadSlotChange}"></slot>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-article-header': ArticleHeader;
  }
}
