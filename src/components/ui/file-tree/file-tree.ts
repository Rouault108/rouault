import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import '../tree-item/tree-item';

export type TreeItemDensity = 'normal' | 'compact';
export type FileTreeVariant = 'default' | 'card';

/**
 * ツリーノードの型定義
 */
export interface TreeNode {
  /** 一意の識別子（必須）。aria-* 属性や状態管理に使用。 */
  id: string;

  /** 表示ラベル（必須）。 */
  label: string;

  /** アイコン名（オプション）。iconify/lucide を使用。 */
  icon?: string;

  /** 子ノード（オプション）。再帰的なツリー構造を表現。 */
  children?: TreeNode[];

  /** リンク先URL（オプション）。設定時、アイテムはナビゲーション可能になる。 */
  href?: string;

  /** 初期展開状態（オプション）。`true` で展開済み、未指定は `false`。 */
  expanded?: boolean;

  /** 選択状態（オプション）。`true` で選択済み（`aria-selected="true"`）。 */
  selected?: boolean;
}

/**
 * ファイルツリー (File Tree) コンポーネント
 *
 * 複数のツリーアイテムを包含し、ディレクトリ構造を管理するルートコンテナです。
 * フォーカス管理、キーボードナビゲーション、データフローの統合管理を担います。
 *
 * @property {TreeNode[]} items - ツリー構造を表す再帰的なデータオブジェクト
 * @property {FileTreeVariant} variant - バリアント（default: 背景なし, card: 独立ウィジェット）
 * @property {boolean} loading - データ取得中の状態フラグ
 * @property {string} activeId - 現在フォーカスされているアイテムのid
 * @property {TreeItemDensity} density - 全アイテムの高さ密度
 *
 * @fires ui-tree-select - ユーザーが項目を選択した時。detail: { id: string, node: TreeNode }
 * @fires ui-tree-expand - 項目の展開/収縮状態が変更された時。detail: { id: string, expanded: boolean }
 * @fires ui-tree-focus-change - フォーカスが別の項目へ移動した時。detail: { id: string }
 *
 * @cssprop --font-sans - フォントファミリー
 * @cssprop --text-sm - フォントサイズ (13px)
 * @cssprop --fg-muted - 非アクティブ項目の基本色
 * @cssprop --fg-subtle - Empty State のテキスト色
 * @cssprop --bg-surface-2 - Card バリアント背景色
 * @cssprop --border-default - Card バリアント境界線色
 * @cssprop --border-width - ボーダー幅
 * @cssprop --radius-md - Card バリアント角丸
 * @cssprop --elevation-md - Card バリアント シャドウ
 * @cssprop --space-2 - 上下余白 (8px)
 * @cssprop --space-4 - Card バリアント パディング (16px)
 * @cssprop --space-8 - Empty State パディング (32px)
 * @cssprop --duration-fast - トランジション時間 (70ms)
 * @cssprop --ease-out - イージング関数
 * @cssprop --skeleton-bg - スケルトン背景色
 * @cssprop --skeleton-shimmer - スケルトンシマーエフェクト
 * @cssprop --control-height-md - スケルトン項目高さ (32px)
 *
 * @example
 * ```html
 * <ui-file-tree .items="${treeData}"></ui-file-tree>
 * ```
 */
@customElement('ui-file-tree')
export class FileTree extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-sans);
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0.01 250));
      user-select: none;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* ── Container (Default) ── */
    .container {
      background: transparent;
      border: none;
      padding: var(--space-2, 8px) 0;
    }

    /* ── Container (Variant: Card) ── */
    :host([variant='card']) .container {
      background: var(--bg-surface-2, oklch(98% 0 0));
      border: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      padding: var(--space-4, 16px);
      box-shadow: var(--elevation-md, 0 2px 4px oklch(0% 0 0 / 0.08));
    }

    /* Dark Mode Edge Highlight for Card */
    @media (prefers-color-scheme: dark) {
      :host([variant='card']) .container {
        box-shadow:
          var(--elevation-md, 0 2px 4px oklch(0% 0 0 / 0.3)),
          inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
      }
    }

    /* ── Empty State ── */
    .empty-state {
      text-align: center;
      color: var(--fg-subtle, oklch(62% 0.01 250));
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-normal, 400);
      padding: var(--space-8, 32px) var(--space-4, 16px);
    }

    /* ── Loading State (Skeleton) ── */
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) 0;
    }

    .skeleton-item {
      height: var(--control-height-md, 32px);
      background: var(--skeleton-bg, var(--bg-fill-neutral, oklch(0% 0 0 / 0.05)));
      border-radius: var(--radius-sm, 4px);
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* ── Motion Reduction ── */
    @media (prefers-reduced-motion: reduce) {
      :host {
        transition-duration: 0.01ms;
      }

      .skeleton-item {
        animation: none;
      }
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid CanvasText;
        box-shadow: none;
      }

      :host([variant='card']) .container {
        background-color: Canvas;
        border-color: CanvasText;
      }
    }

    /* ── Print Styles ── */
    @media print {
      :host {
        display: none !important;
      }

      :host([variant='card'][data-printable='true']) {
        display: block !important;
      }

      :host([variant='card'][data-printable='true']) .container {
        box-shadow: none !important;
        background: transparent !important;
        border-color: #000 !important;
      }
    }
  `;

  /**
   * ツリー構造データ
   */
  @property({ type: Array })
  items: TreeNode[] = [];

  /**
   * バリアント（default: 背景なし、card: 独立ウィジェット）
   * @default 'default'
   */
  @property({ type: String, reflect: true })
  variant: FileTreeVariant = 'default';

  /**
   * データ取得中の状態フラグ
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  loading = false;

  /**
   * 現在フォーカスされているアイテムのid
   */
  @property({ type: String, attribute: 'active-id' })
  activeId = '';

  /**
   * 全アイテムの高さ密度
   * @default 'normal'
   */
  @property({ type: String, reflect: true })
  density: TreeItemDensity = 'normal';

  /**
   * スケルトン表示フラグ（内部状態）
   * @internal
   */
  @state()
  private showSkeleton = false;

  /**
   * ローディングタイマー
   * @internal
   */
  private loadingTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  /**
   * Type-ahead バッファ
   * @internal
   */
  private typeAheadBuffer = '';

  /**
   * Type-ahead タイマー
   * @internal
   */
  private typeAheadTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  /**
   * 初回の選択項目スクロールを実施済みか
   * @internal
   */
  private didInitialSelectedScroll = false;

  /**
   * Tree外部から流入した直前フォーカス要素
   * @internal
   */
  private lastExternalFocusTarget: HTMLElement | null = null;

  /**
   * 印刷時に復元する expanded 状態スナップショット
   * @internal
   */
  private printExpandedSnapshot: Map<string, boolean | undefined> | null = null;

  /**
   * フラット化された可視ノードリスト
   * @internal
   */
  @state()
  private flattenedNodes: { node: TreeNode; depth: number }[] = [];

  private readonly _focusInHandler = (e: FocusEvent): void => {
    const related = e.relatedTarget;
    if (related instanceof HTMLElement && !this.contains(related)) {
      this.lastExternalFocusTarget = related;
    }
  };

  private readonly _beforePrintHandler = (): void => {
    if (!this._isPrintableCard()) return;

    this.printExpandedSnapshot = new Map<string, boolean | undefined>();
    this._snapshotExpandedState(this.items, this.printExpandedSnapshot);
    this._setAllExpanded(this.items, true);
    this.flattenedNodes = this._flattenNodes(this.items);
    this.requestUpdate();
  };

  private readonly _afterPrintHandler = (): void => {
    if (!this.printExpandedSnapshot) return;

    this._restoreExpandedState(this.items, this.printExpandedSnapshot);
    this.flattenedNodes = this._flattenNodes(this.items);
    this.printExpandedSnapshot = null;
    this.requestUpdate();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    // role="tree" を設定
    this.setAttribute('role', 'tree');
    // aria-label を設定（多言語対応時は外部化）
    if (!this.hasAttribute('aria-label') && !this.hasAttribute('aria-labelledby')) {
      this.setAttribute('aria-label', 'ファイルツリー');
    }
    // aria-orientation を設定
    this.setAttribute('aria-orientation', 'vertical');
    this.addEventListener('focusin', this._focusInHandler);
    window.addEventListener('beforeprint', this._beforePrintHandler);
    window.addEventListener('afterprint', this._afterPrintHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearLoadingTimer();
    this._clearTypeAheadTimer();
    this.removeEventListener('focusin', this._focusInHandler);
    window.removeEventListener('beforeprint', this._beforePrintHandler);
    window.removeEventListener('afterprint', this._afterPrintHandler);
  }

  override willUpdate(changedProperties: Map<string, unknown>): void {
    // items が変更されたら、フラット化リストを再計算
    if (changedProperties.has('items')) {
      // 初期化: selected 項目までのパスを自動展開
      this._autoExpandSelectedPath();
      this.flattenedNodes = this._flattenNodes(this.items);
      this.didInitialSelectedScroll = false;
      // activeId が未設定の場合、初期フォーカス位置を設定
      if (!this.activeId && this.flattenedNodes.length > 0) {
        const selectedNode = this.flattenedNodes.find((item) => item.node.selected);
        const firstNode = this.flattenedNodes[0];
        this.activeId = selectedNode?.node.id ?? (firstNode ? firstNode.node.id : '');
      }
    }

    // loading が変更されたら、500ms閾値のタイマーを設定
    if (changedProperties.has('loading')) {
      this._handleLoadingChange();
    }
  }

  override updated(changedProperties: Map<string, unknown>): void {
    const busy = this.loading && this.showSkeleton;
    this.setAttribute('aria-busy', String(busy));

    if (this.loading) return;

    if (!this.didInitialSelectedScroll && this.items.length > 0 && changedProperties.has('items')) {
      this._scrollSelectedIntoView();
      this.didInitialSelectedScroll = true;
      return;
    }

    if (changedProperties.has('activeId') && this.activeId) {
      this._focusItem(this.activeId);
    }
  }

  /**
   * ローディング状態変更ハンドラ（500ms閾値）
   */
  private _handleLoadingChange(): void {
    this._clearLoadingTimer();

    if (this.loading) {
      // 500ms後にスケルトン表示開始
      this.loadingTimer = setTimeout(() => {
        this.showSkeleton = true;
      }, 500);
    } else {
      // ローディング完了時はスケルトンを即座に非表示
      this.showSkeleton = false;
    }
  }

  /**
   * ローディングタイマーをクリア
   */
  private _clearLoadingTimer(): void {
    if (this.loadingTimer !== undefined) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = undefined;
    }
  }

  /**
   * Type-aheadタイマーをクリア
   */
  private _clearTypeAheadTimer(): void {
    if (this.typeAheadTimer !== undefined) {
      clearTimeout(this.typeAheadTimer);
      this.typeAheadTimer = undefined;
    }
  }

  /**
   * ツリーノードを再帰的にフラット化（可視アイテムのみ）
   */
  private _flattenNodes(nodes: TreeNode[], depth = 0): { node: TreeNode; depth: number }[] {
    const result: { node: TreeNode; depth: number }[] = [];

    for (const node of nodes) {
      result.push({ node, depth });

      // 展開済みの場合、子要素も追加
      if (node.expanded && node.children && node.children.length > 0) {
        result.push(...this._flattenNodes(node.children, depth + 1));
      }
    }

    return result;
  }

  /**
   * selected 項目までのパスを自動展開
   */
  private _autoExpandSelectedPath(): void {
    const selectedNode = this._findSelectedNode(this.items);
    if (selectedNode) {
      this._expandPathTo(this.items, selectedNode.id);
    }
  }

  /**
   * selected ノードを探索
   */
  private _findSelectedNode(nodes: TreeNode[]): TreeNode | null {
    for (const node of nodes) {
      if (node.selected) {
        return node;
      }
      if (node.children) {
        const found = this._findSelectedNode(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 指定idまでのパスを展開
   */
  private _expandPathTo(nodes: TreeNode[], targetId: string, path: TreeNode[] = []): boolean {
    for (const node of nodes) {
      const currentPath = [...path, node];

      if (node.id === targetId) {
        // パス上のすべてのノードを展開
        for (const pathNode of currentPath) {
          pathNode.expanded = true;
        }
        return true;
      }

      if (node.children) {
        const found = this._expandPathTo(node.children, targetId, currentPath);
        if (found) return true;
      }
    }
    return false;
  }

  /**
   * selected 項目を画面内にスクロール
   */
  private _scrollSelectedIntoView(): void {
    const selectedNode = this.flattenedNodes.find((item) => item.node.selected);
    if (!selectedNode || !this.shadowRoot) return;

    // tree-item 要素を取得
    const treeItem = this.shadowRoot.querySelector(
      `ui-tree-item[data-id="${selectedNode.node.id}"]`,
    );

    if (treeItem instanceof HTMLElement) {
      treeItem.scrollIntoView({
        behavior: 'instant',
        block: 'nearest',
      });
    }
  }

  /**
   * キーボードナビゲーションハンドラ
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    const currentIndex = this.flattenedNodes.findIndex((item) => item.node.id === this.activeId);
    if (currentIndex === -1) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._moveFocus(currentIndex + 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this._moveFocus(currentIndex - 1);
        break;

      case 'Home':
        e.preventDefault();
        this._moveFocus(0);
        break;

      case 'End':
        e.preventDefault();
        this._moveFocus(this.flattenedNodes.length - 1);
        break;

      case 'Escape':
        e.preventDefault();
        this._restoreExternalFocus();
        break;

      default:
        // Type-ahead
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this._handleTypeAhead(e.key);
        }
        break;
    }
  };

  /**
   * フォーカス移動
   */
  private _moveFocus(targetIndex: number): void {
    // 範囲チェック
    if (targetIndex < 0 || targetIndex >= this.flattenedNodes.length) return;

    const targetItem = this.flattenedNodes[targetIndex];
    if (!targetItem) return;

    const targetNode = targetItem.node;
    this.activeId = targetNode.id;

    // ui-tree-focus-change イベント発火
    this.dispatchEvent(
      new CustomEvent('ui-tree-focus-change', {
        detail: { id: targetNode.id },
        bubbles: true,
        composed: true,
      }),
    );

    // フォーカスを当てる
    this._focusItem(targetNode.id);

    // スクロール
    this._scrollItemIntoView(targetNode.id);
  }

  /**
   * アイテムにフォーカス
   */
  private _focusItem(nodeId: string): void {
    if (!this.shadowRoot) return;

    const treeItem = this.shadowRoot.querySelector<HTMLElement>(
      `ui-tree-item[data-id="${nodeId}"]`,
    );
    treeItem?.focus();
  }

  /**
   * アイテムを画面内にスクロール（ユーザー操作時）
   */
  private _scrollItemIntoView(nodeId: string): void {
    if (!this.shadowRoot) return;

    const treeItem = this.shadowRoot.querySelector(
      `ui-tree-item[data-id="${nodeId}"]`,
    );

    if (treeItem instanceof HTMLElement) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      treeItem.scrollIntoView({
        behavior: prefersReducedMotion ? 'instant' : 'smooth',
        block: 'nearest',
      });
    }
  }

  /**
   * Type-ahead 処理
   */
  private _handleTypeAhead(key: string): void {
    // バッファに追加
    this.typeAheadBuffer += key.toLowerCase();

    // 500ms無入力でバッファをクリア
    this._clearTypeAheadTimer();
    this.typeAheadTimer = setTimeout(() => {
      this.typeAheadBuffer = '';
    }, 500);

    // マッチング
    const currentIndex = this.flattenedNodes.findIndex((item) => item.node.id === this.activeId);
    const searchStartIndex = currentIndex + 1;

    // 現在位置以降を検索
    for (let i = 0; i < this.flattenedNodes.length; i++) {
      const index = (searchStartIndex + i) % this.flattenedNodes.length;
      const node = this.flattenedNodes[index]?.node;

      if (node?.label.toLowerCase().startsWith(this.typeAheadBuffer)) {
        this._moveFocus(index);
        return;
      }
    }
  }

  /**
   * tree-item の selected-change イベントハンドラ
   */
  private _handleItemSelect = (e: CustomEvent, node: TreeNode): void => {
    e.stopPropagation();

    // すべての選択状態をクリア
    this._clearAllSelected(this.items);

    // 選択されたノードのみ選択状態にする
    node.selected = true;

    // activeId を更新
    this.activeId = node.id;

    // ui-tree-select イベント発火
    this.dispatchEvent(
      new CustomEvent('ui-tree-select', {
        detail: { id: node.id, node },
        bubbles: true,
        composed: true,
      }),
    );

    // 再レンダリング
    this.requestUpdate();
  };

  /**
   * すべての選択状態をクリア
   */
  private _clearAllSelected(nodes: TreeNode[]): void {
    for (const node of nodes) {
      node.selected = false;
      if (node.children) {
        this._clearAllSelected(node.children);
      }
    }
  }

  /**
   * tree-item の expanded-change イベントハンドラ
   */
  private _handleItemExpand = (e: CustomEvent, node: TreeNode): void => {
    e.stopPropagation();

    const detail = e.detail as { expanded: boolean };
    const expanded = detail.expanded;
    node.expanded = expanded;

    // ui-tree-expand イベント発火
    this.dispatchEvent(
      new CustomEvent('ui-tree-expand', {
        detail: { id: node.id, expanded },
        bubbles: true,
        composed: true,
      }),
    );

    // フラット化リストを再計算
    this.flattenedNodes = this._flattenNodes(this.items);

    // 再レンダリング
    this.requestUpdate();
  };

  /**
   * tree-item の arrow-right イベントハンドラ（既に展開済みの場合、子へ移動）
   */
  private _handleItemArrowRight = (e: CustomEvent): void => {
    e.stopPropagation();

    const currentIndex = this.flattenedNodes.findIndex((item) => item.node.id === this.activeId);
    if (currentIndex === -1) return;

    const currentItem = this.flattenedNodes[currentIndex];
    if (!currentItem) return;

    const currentNode = currentItem.node;

    // 子要素がある && 展開済み → 最初の子へ移動
    if (currentNode.children && currentNode.children.length > 0 && currentNode.expanded) {
      this._moveFocus(currentIndex + 1);
    }
  };

  /**
   * tree-item の arrow-left イベントハンドラ（既に収縮済みの場合、親へ移動）
   */
  private _handleItemArrowLeft = (e: CustomEvent): void => {
    e.stopPropagation();

    const currentIndex = this.flattenedNodes.findIndex((item) => item.node.id === this.activeId);
    if (currentIndex === -1) return;

    const currentItem = this.flattenedNodes[currentIndex];
    if (!currentItem) return;

    const currentNode = currentItem;

    // 親ノードを探す（1つ上のdepthが小さいノード）
    for (let i = currentIndex - 1; i >= 0; i--) {
      const parentItem = this.flattenedNodes[i];
      if (parentItem && parentItem.depth < currentNode.depth) {
        this._moveFocus(i);
        break;
      }
    }
  };

  /**
   * ツリーアイテムを再帰的にレンダリング
   */
  private _renderTreeItems(nodes: TreeNode[], depth = 0): TemplateResult[] {
    return nodes.map((node) => {
      const isActive = node.id === this.activeId;
      const tabindex = isActive ? 0 : -1;

      return html`
        <ui-tree-item
          data-id="${node.id}"
          label="${node.label}"
          icon="${node.icon ?? ''}"
          href="${node.href ?? ''}"
          ?expanded="${node.expanded ?? false}"
          ?selected="${node.selected ?? false}"
          ?print-mode="${this._isPrintableCard()}"
          tabindex="${tabindex}"
          density="${this.density}"
          @selected-change="${(e: CustomEvent) => {
            this._handleItemSelect(e, node);
          }}"
          @expanded-change="${(e: CustomEvent) => {
            this._handleItemExpand(e, node);
          }}"
          @tree-item-arrow-right="${this._handleItemArrowRight}"
          @tree-item-arrow-left="${this._handleItemArrowLeft}"
        >
          ${node.children && node.children.length > 0
            ? html`
                <div slot="children">${this._renderTreeItems(node.children, depth + 1)}</div>
              `
            : nothing}
        </ui-tree-item>
      `;
    });
  }

  /**
   * スケルトンアイテムをレンダリング
   */
  private _renderSkeleton(): TemplateResult {
    return html`
      <div class="skeleton">
        ${Array.from({ length: 5 }, () => html`<div class="skeleton-item"></div>`)}
      </div>
    `;
  }

  /**
   * Empty State をレンダリング
   */
  private _renderEmptyState(): TemplateResult {
    return html`<div class="empty-state" role="status">項目がありません</div>`;
  }

  override render() {
    const containerClasses = {
      container: true,
    };

    return html`
      <div class="${classMap(containerClasses)}" @keydown="${this._handleKeyDown}">
        ${this.loading && this.showSkeleton
          ? this._renderSkeleton()
          : this.items.length === 0
            ? this._renderEmptyState()
            : this._renderTreeItems(this.items)}
      </div>
    `;
  }

  private _restoreExternalFocus(): void {
    if (this.lastExternalFocusTarget?.isConnected) {
      this.lastExternalFocusTarget.focus();
      return;
    }

    const active = this.shadowRoot?.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  }

  private _isPrintableCard(): boolean {
    return this.variant === 'card' && this.hasAttribute('data-printable');
  }

  private _snapshotExpandedState(
    nodes: TreeNode[],
    snapshot: Map<string, boolean | undefined>,
  ): void {
    for (const node of nodes) {
      snapshot.set(node.id, node.expanded);
      if (node.children) {
        this._snapshotExpandedState(node.children, snapshot);
      }
    }
  }

  private _restoreExpandedState(
    nodes: TreeNode[],
    snapshot: Map<string, boolean | undefined>,
  ): void {
    for (const node of nodes) {
      const expanded = snapshot.get(node.id);
      if (expanded === undefined) {
        delete node.expanded;
      } else {
        node.expanded = expanded;
      }
      if (node.children) {
        this._restoreExpandedState(node.children, snapshot);
      }
    }
  }

  private _setAllExpanded(nodes: TreeNode[], expanded: boolean): void {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        node.expanded = expanded;
        this._setAllExpanded(node.children, expanded);
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-file-tree': FileTree;
  }
}
