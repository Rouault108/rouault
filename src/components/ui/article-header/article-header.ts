import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../tag/tag';

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
      /* clamp + media query の不連続を解消。フォントサイズに追従する相対値で統一。 */
      line-height: var(--line-height-tight, 1.25);
      letter-spacing: var(--tracking-tight, -0.01em);
      color: var(--fg-default, oklch(20% 0.01 250));
      font-feature-settings: 'palt';
      word-break: auto-phrase;
      overflow-wrap: break-word;
    }

    .metadata-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      list-style: none;
      /* heading 直下（status-badge なし）の場合の余白 */
      margin: var(--space-3, 12px) 0 0;
      padding: 0;
      gap: 0;
      font-size: var(--text-sm, 13px);
      font-weight: 500;
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    /* status-badge 直後は詰める（badge が既に heading との距離を稼いでいるため） */
    .status-badge + .metadata-list {
      margin-top: var(--space-2, 8px);
    }

    /* セカンダリメタデータ（出典・ライセンス）: 補助情報として控えめに */
    .metadata-list--secondary {
      margin-top: var(--space-2, 8px);
      font-size: var(--text-xs, 12px);
      color: var(--fg-subtle, oklch(60% 0.01 250));
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
      /* セパレータ間隔（16px）をタグ内ギャップ（8px）の2倍に設定し、「区切り」と「群れ」のリズムを明示 */
      margin-inline: var(--space-4, 16px);
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

    /* セカンダリリスト内のアイコンはフォントサイズに合わせて縮小 */
    .metadata-list--secondary .meta-icon {
      width: var(--icon-xs, 12px);
      height: var(--icon-xs, 12px);
      font-size: var(--icon-xs, 12px);
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

    .tags-row {
      /* metadata-list または status-badge の後に続く場合の余白 */
      margin-top: var(--space-2, 8px);
    }

    /* heading または status-badge の直後（primary metadata なし）は余白を増やす */
    .heading + .tags-row,
    .status-badge + .tags-row {
      margin-top: var(--space-3, 12px);
    }

    .tag-links {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2, 8px);
      min-width: 0;
    }

    /* ステータスバッジ: 見出し直下の信頼性シグナル。メタデータリストとは独立して配置。 */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      margin-top: var(--space-3, 12px);
      font-size: var(--text-xs, 12px);
      font-weight: 500;
    }

    .status-draft     { color: var(--fg-muted, oklch(48% 0.01 250)); }
    .status-archived  { color: var(--fg-subtle, oklch(60% 0.01 250)); }
    .status-wip       { color: var(--fg-warning, oklch(72% 0.13 85)); }
    .status-deprecated { color: var(--fg-danger, oklch(60% 0.22 25)); }

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

      .status-badge {
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
        return { label: '下書き', icon: 'lucide:file-pen', toneClass: 'status-draft' };
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

  // 主要メタデータ（日付・読了時間）: 時間的コンテキスト。タグとは独立して管理。
  private get _hasPrimaryMetadata(): boolean {
    return this._displayDate.length > 0 || this._displayReadingTime !== null;
  }

  // 補助メタデータ（出典・ライセンス）: 帰属情報。主要メタデータとは優先度が異なる。
  private get _hasSecondaryMetadata(): boolean {
    return this._safeSourceHref !== null || this.license.length > 0;
  }

  private get _safeSourceHref(): string | null {
    const rawSource = this.source.trim();
    if (rawSource.length === 0) return null;

    try {
      const parsed = new URL(rawSource);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  private _buildTagHref(tag: string): string {
    return `/tags/${encodeURIComponent(tag)}`;
  }

  private _handleTagClick = (event: MouseEvent, tag: string): void => {
    const href = this._buildTagHref(tag);
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
        <iconify-icon class="meta-icon" icon="lucide:history" aria-hidden="true"></iconify-icon>
        <time datetime="${displayDate}" aria-label="${ariaLabel}">${displayDate}</time>
      </li>
    `;
  }

  // タグは分類・ナビゲーション情報。日付・読了時間とは性質が異なるため独立行で表示。
  private _renderTagsRow(): TemplateResult | typeof nothing {
    const tags = this._normalizedTags;
    if (tags.length === 0) return nothing;

    return html`
      <div class="tags-row" aria-label="タグ">
        <span class="tag-links">
          ${tags.map((tag) => {
            const href = this._buildTagHref(tag);
            return html`
              <ui-tag
                class="tag-link"
                href="${href}"
                aria-label="タグ: ${tag}"
                @click="${(event: MouseEvent) => { this._handleTagClick(event, tag); }}"
              >${tag}</ui-tag>
            `;
          })}
        </span>
      </div>
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
    const sourceHref = this._safeSourceHref;
    if (!sourceHref) return nothing;

    return html`
      <li class="metadata-item metadata-source">
        <iconify-icon class="meta-icon" icon="lucide:link" aria-hidden="true"></iconify-icon>
        <a
          class="silent-link source-link"
          href="${sourceHref}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="原文（外部リンク）"
        >
          原文
        </a>
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

  private _renderStatusBadge(): TemplateResult | typeof nothing {
    const status = this._statusPresentation;
    if (!status) return nothing;

    // メタデータリストとは独立した信頼性シグナル。
    // `.status` クラスは既存の play() テストとの互換性のため保持。
    return html`
      <div class="status status-badge ${status.toneClass}" aria-label="ステータス: ${status.label}">
        <iconify-icon class="meta-icon" icon="${status.icon}" aria-hidden="true"></iconify-icon>
        <span>${status.label}</span>
      </div>
    `;
  }

  override render() {
    return html`
      <header class="article-header">
        <h1 class="heading">${this.heading}</h1>

        ${this._renderStatusBadge()}

        ${this._hasPrimaryMetadata
          ? html`
              <ul class="metadata-list metadata-list--primary" aria-label="記事メタデータ">
                ${this._renderDateItem()}
                ${this._renderReadingTimeItem()}
              </ul>
            `
          : nothing}

        ${this._renderTagsRow()}

        ${this._hasSecondaryMetadata
          ? html`
              <ul class="metadata-list metadata-list--secondary" aria-label="出典・ライセンス情報">
                ${this._renderSourceItem()}
                ${this._renderLicenseItem()}
              </ul>
            `
          : nothing}
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-article-header': ArticleHeader;
  }
}
