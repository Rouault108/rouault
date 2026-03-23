# 現在の検索機能まとめ

> [!WARNING]
> 本文書は旧実装ベースの整理であり、現行の正本ではありません。検索仕様の正本は [`docs/search-specification.md`](../search-specification.md) を参照してください。shared `search-core` 導入後は、本書の説明より仕様書と実装を優先します。

## 概要

現在の検索機能は、**Pagefind を使った全文検索**を中心に構成されています。UI は次の 2 系統です。

- グローバル検索ダイアログ: すばやく目的のノートへ移動するための検索
- 検索結果ページ: 結果を比較しながら絞り込むための検索

`/tags/<tag>/` は検索結果ページを `initial-tag` 付きで再利用する派生ページです。いずれもクライアントサイドで動作し、`<noscript>` では JavaScript が必要という案内のみを表示します。

## 入口となる UI

### 1. ヘッダーのグローバル検索ダイアログ

- `layout-header` 内の `<ui-search-trigger>` から起動します。
- `open-search-dialog` を `initSearch()` が受け取り、`#global-search-dialog` を開きます。
- `Cmd+K` / `Ctrl+K` でも起動できます。
- 入力欄には共通コンポーネント `<ui-search-field>` を使います。
- 結果はタイトルとパス中心の軽量表示です。
- `Enter`、クリックで選択すると `navigateToUrl()` 経由で遷移します。

### 2. `/search` の検索結果ページ

- `src/search.11ty.ts` が `/search/index.html` を生成します。
- 実体は `<search-page>` コンポーネントです。
- キーワード入力にはダイアログと同じ `<ui-search-field>` を使います。
- キーワード入力、タグフィルター、並び順切り替えを同じ画面で扱います。
- 検索結果にはタイトル、パス、更新日、抜粋または description を表示します。

### 3. `/tags/<tag>/` のタグページ

- `src/tags.11ty.ts` が `searchGenres` を元に静的生成します。
- 中身は `<search-page initial-tag="...">` で、検索結果ページの再利用です。
- 初期表示時点でタグが 1 つ選択された状態になります。

## 検索対象データ

### 1. Pagefind インデックス

ノート本文の全文検索には Pagefind を使います。各ノートページでは `NoteLayout` が次の情報を埋め込みます。

- `data-pagefind-body`: 本文の検索対象
- `data-pagefind-meta="title"`: タイトル
- `data-pagefind-meta="description"`: 説明文
- `data-pagefind-meta="date"`: 更新日または公開日
- `data-pagefind-filter="genre:<name>"`: genre フィルター
- `data-pagefind-sort="date:YYYY-MM-DD"`: 更新日の sort キー
- `data-pagefind-weight="10"`: タイトル用の索引テキスト
- `data-pagefind-weight="8"`: タイトル token 用の補助索引テキスト
- `data-pagefind-weight="5"`: description 用の索引テキスト
- `data-pagefind-weight="3"`: description token 用の補助索引テキスト

補足:

- `title` / `description` は表示用メタに加えて、`sr-only` の索引用テキストとしても本文内に埋め込みます。
- `Intl.Segmenter` で token 化した `title` / `description` も別 weight で埋め込み、空白なし日本語クエリの Recall を補強します。
- token 化結果が raw テキストと同一になる場合は、補助索引テキストを重複出力しません。
- `data-pagefind-sort` は `updated ?? date ?? '0000-00-00'` を使うため、日付未設定ノートでも sort 時に脱落しません。
- これにより検索結果ページでは、**キーワード検索 + genre の AND 条件**に加えて**関連度順 / 新しい順**の切り替えができます。

### 2. 検索ダイアログ用の補助カタログ

グローバル検索ダイアログでは、Pagefind に加えて `/search-catalog.json` も読みます。これは `buildSearchCatalog()` で生成される補助データです。

- 公開ノートのみを対象にする
- `title`、`url`、`path`、`description`、`date` を持つ
- `slug` を分解した語や `genre` を `keywords` に含める
- `title` / `description` を `Intl.Segmenter` で token 化した語も `keywords` に含める

この補助カタログにより、**本文にヒットしなくても URL パスや slug 由来のキーワードでダイアログ検索に引っかかる**ようになっています。

### 3. 検索前処理

検索クエリは `prepareSearchQuery()` を通して正規化します。

- まず空白を正規化して `rawQuery` を作る
- `Intl.Segmenter('ja', { granularity: 'word' })` で分かち書きして `tokens` を得る
- `tokens` を空白結合した `segmentedQuery` を Pagefind へ渡す
- `Intl.Segmenter` 非対応環境では、正規化済みクエリをそのまま使う

これにより、空白なし日本語クエリでも Pagefind と補助カタログの両方で検索しやすくしています。

## 実際の検索フロー

### グローバル検索ダイアログ

1. `initSearch()` が `dialog.searcher` を設定する
2. 検索時に `pagefindSearchAdapter.search(query, [], 'relevance')` と `getSearchCatalog()` を並列実行する
3. Pagefind の結果は `pagefindBacked` な候補として扱う
4. 補助カタログは `rawQuery` と `tokens` を使って `title` / `description` / `path` / `keywords` を検索する
5. URL 単位で両者をマージし、再ランキングして一覧表示する

再ランキングの優先順位:

- `title exact`
- `title prefix`
- `title contains all tokens`
- `title/path/description/keyword exact token`
- `title/path/description/keyword contains all tokens`
- `pagefind-backed result`
- `title/path substring`
- `description/keyword substring`

同点時は `date` の降順、その後に `title/path` の `localeCompare('ja')` で安定化します。

補足:

- Pagefind 側が失敗しても、補助カタログ側に結果があればダイアログ自体は動作します。
- ダイアログにはタグフィルター UI はありません。
- 大量件数では Web Worker と簡易 virtualization を使って一覧描画を軽くしています。

### 検索結果ページ

1. 初期表示時に URL から `q`、`tag`、`sort` を読む
2. `pagefindSearchAdapter.search(query, selectedTags, sortMode)` を実行する
3. 結果一覧、件数、genre 別件数を描画する
4. 入力変更は 150ms debounce で再検索する
5. タグ切り替えと並び順切り替えは即時再検索する

補足:

- 入力中は `history.replaceState()`、タグ変更と並び順変更は `history.pushState()` で URL を同期します。
- `sort` は `relevance` が既定値で、`date-desc` を選んだ時だけ URL に出ます。
- `popstate` に対応しているため、ブラウザの戻る / 進むで `q` / `tag` / `sort` を復元できます。
- 結果 0 件時は空状態 UI を表示します。

## URL 仕様

- 検索ページ: `/search`
- キーワード付き: `/search?q=<query>`
- タグ付き: `/search?tag=<genre>`
- 複数タグ: `/search?tag=a&tag=b`
- 並び順付き: `/search?sort=date-desc`
- 複合条件: `/search?q=<query>&tag=<genre>&sort=date-desc`
- タグ専用ページ: `/tags/<genre>/`

`q` は空白を正規化して保存し、`tag` は trim + 重複除去、`sort` は `relevance | date-desc` に正規化して扱います。`relevance` は URL に出しません。

## ビルド時の処理

- `pnpm build` では 11ty ビルド後に `scripts/build-pagefind.ts` を実行して `dist` へ Pagefind インデックスを生成します。
- 開発サーバー時も `eleventy.after` で Pagefind を再生成し、検索候補を最新に保ちます。
- `searchGenres` は `.velite/notes.json` を読んで公開ノートの genre 一覧を構築します。
- `/search-catalog.json` は Eleventy テンプレートとして出力されます。

## 現状の仕様上の注意点

- 検索機能全体は JavaScript 前提で、非 JS 環境向けの検索結果フォールバックはありません。
- グローバル検索ダイアログと検索結果ページは、同じ Pagefind を使いつつも完全に同じ結果集合ではありません。
- ダイアログは補助カタログを併用するため、`path` や `keywords` 由来の候補を返せます。
- 検索結果ページは Pagefind の結果だけを使うため、slug 由来だけの候補は返しません。
- タグフィルターは `genre` のみを対象にしています。
- 並び順切り替えは検索結果ページのみにあり、ダイアログは常に移動優先ランキングです。

## 主な実装ファイル

- `src/lib/search/bootstrap.ts`: グローバル検索の初期化
- `src/components/ui/search-dialog/search-dialog.ts`: ダイアログ UI と操作
- `src/components/ui/search-field/search-field.ts`: 検索入力 UI の共通コンポーネント
- `src/components/search/search-page.ts`: 検索結果ページ UI
- `src/lib/search/query-preprocessor.ts`: 検索前処理
- `src/lib/search/pagefind-search.ts`: Pagefind アダプタ
- `src/lib/search/search-url.ts`: URL 状態の正規化と組み立て
- `src/lib/search/search-catalog.ts`: 補助カタログの読込、検索、再ランキング
- `src/data/searchCatalog.ts`: 補助カタログ生成
- `src/data/searchGenres.ts`: タグページ用 genre 一覧生成
- `src/search.11ty.ts`: `/search` 生成
- `src/search-catalog.11ty.ts`: `/search-catalog.json` 生成
- `src/tags.11ty.ts`: `/tags/<tag>/` 生成
- `src/layouts/NoteLayout.11ty.ts`: Pagefind メタデータ / sort / weight 埋め込み
- `scripts/build-pagefind.ts`: Pagefind インデックス生成
