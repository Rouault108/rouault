# 検索機能新仕様書

## 0. 要約

本仕様書は、Rouault の検索機能を**新規実装として再定義**するための仕様書です。現行実装との互換維持は目的とせず、長期的保守性、責務分離、観測性、検索意味論の明確さを優先します。

本仕様では、検索機能を次の 3 層に分離します。

1. **検索コア**
   - クエリ前処理、検索ソース統合、候補統合、特徴量算出、ランキング、件数集計を担います。
2. **検索ソース層**
   - Pagefind インデックスと補助検索カタログを提供し、検索コアへ正規化済みの検索材料を渡します。
3. **UI 層**
   - グローバル検索ダイアログと検索結果ページを提供します。UI は検索意味論を持たず、検索コアの結果を表示・操作する責務に限定します。

本仕様での重要決定は以下です。

- 検索ダイアログと検索結果ページは**同一検索コア**を使う
- 検索モードは `navigate` と `explore` に分離する
- 検索ソースは **Pagefind を主検索源**、**補助検索カタログを補完検索源**として扱う
- 重複判定の主キーは `canonicalUrl` とする
- `canonicalUrl` の正規化規則を固定し、実装裁量を残さない
- 補助検索カタログでは `path` を文書識別用、`url` を遷移用として分離し、両者が**同一文書を指すこと**を必須契約とする
- 複数タグの意味論は URL で明示可能とし、既定を `or` とする
- 検索結果のスニペットは **安全な構造化表現**として扱い、生の HTML を UI 境界に持ち込まない
- ランキング特徴量は値域と算出規則を固定する
- フォールバック運転は維持するが、縮退状態は観測可能にする

---

## 1. 文書の目的

本書の目的は、Rouault における検索機能の新規仕様を定義し、以下を固定することです。

- 検索機能の責務境界
- 検索モードの意味論
- 検索ソース統合規則
- URL 状態契約
- URL 正規化契約
- データモデル
- ランキング規則
- フィルター意味論
- エラー処理と縮退運転
- アクセシビリティ要件
- 性能要件
- テスト可能な受け入れ基準

---

## 2. 非目的

本仕様は以下を目的としません。

- 現行 URL 仕様との完全互換維持
- 現行内部モジュール名の継承
- 既存 UI 文言の維持
- 非 JavaScript 環境向けの完全検索体験
- 検索ランキングの機械学習化

---

## 3. 設計原則

### 3.1 単一責務

検索意味論は検索コアへ集約し、UI 層・URL 層・データ取得層に分散させません。

### 3.2 正規化優先

検索結果は、表示前に必ず共通データモデルへ正規化します。ソース固有形式を UI に露出してはなりません。

### 3.3 説明可能性

検索結果は、なぜ一致したかを内部的に追跡可能でなければなりません。

### 3.4 縮退可能性

主検索源が障害状態でも、機能全停止を避ける経路を持たなければなりません。

### 3.5 URL の明示性

検索結果ページの状態は URL で復元可能でなければなりません。

### 3.6 安全な表示境界

検索ソースが返す HTML 断片を UI へそのまま流してはなりません。検索スニペットは構造化して扱います。

### 3.7 実装より契約を優先

UI コンポーネントや内部実装の都合で意味論を変えてはなりません。意味論変更は仕様改訂として扱います。

### 3.8 内部表現と表示表現の分離

検索、統合、ソートに使う内部値と、UI 表示に使う文字列表現は分離しなければなりません。

---

## 4. システム全体像

検索機能は以下の経路で構成します。

```mermaid
flowchart LR
  UI1[検索ダイアログ]
  UI2[検索結果ページ]
  URL[URL 状態]
  CORE[search-core]
  PREP[query-pipeline]
  SRC1[pagefind-source]
  SRC2[catalog-source]
  NAV[navigation-adapter]
  IDX[Pagefind Index]
  CAT[/search-catalog.json]

  UI1 --> CORE
  UI2 --> URL
  URL --> UI2
  UI2 --> CORE
  CORE --> PREP
  CORE --> SRC1
  CORE --> SRC2
  SRC1 --> IDX
  SRC2 --> CAT
  UI1 --> NAV
  UI2 --> NAV
```

---

## 5. 用語

### 5.1 検索ダイアログ

少数候補を高速提示し、目的ノートへ即時移動するための UI です。

### 5.2 検索結果ページ

検索結果を比較しながら絞り込み・再探索するための UI です。

### 5.3 タグ

ユーザー向けの分類ラベルです。内部データ源としては `genre` を利用してもよいものとしますが、外部契約では「タグ」に統一します。

### 5.4 検索コア

クエリ前処理、検索ソース統合、候補統合、スコア算出、件数集計を実行する中核モジュールです。

### 5.5 検索ソース

Pagefind または補助検索カタログのように、検索候補や一致情報を供給するデータ源です。

### 5.6 DocumentCanonicalUrl

候補の重複判定と内部一意性判定に使う**文書単位の正規 URL**です。`DocumentCanonicalUrl` は、ノート本文や個別文書のような**検索結果項目そのもの**を識別するために使います。`DocumentCanonicalUrl` は UI 入口の違いを吸収した文書識別子であり、遷移先 URL と常に同一である必要はありません。

`DocumentCanonicalUrl` について、次を満たさなければなりません。

- 検索結果項目に対して安定であること
- query / hash に依存しないこと
- `/search` や `/tags/...` のような検索状態 URL を表現しないこと

### 5.7 sourceReliabilityScore

検索ソース自体の信頼度を表す内部指標です。ソースごとの信頼性差のみを表し、一致の強さは表しません。

### 5.8 matchEvidenceScore

候補がどれだけ強い一致根拠を持つかを要約する**派生指標**です。`matchEvidenceScore` は本文一致、タイトル一致、path 一致、keyword 一致などの強度を要約しますが、**13.7 の総合スコアへ直接加算してはなりません**。

`matchEvidenceScore` の用途は以下に限定します。

- 一致理由の要約
- 安定化ソートの補助
- 同点時の優先順位付け
- 将来のしきい値判定

### 5.9 pathLabel

検索結果に表示する**表示専用の経路ラベル**です。`pathLabel` は `DocumentCanonicalUrl` またはそれと同値な文書 URL から導出される派生表現であり、識別子ではありません。

`pathLabel` について、次を満たさなければなりません。

- 表示専用であり、重複判定に使ってはならない
- `title` の代替識別子として扱ってはならない
- `DocumentCanonicalUrl` と 1 対 1 で安定に導出できること
- 検索状態 URL から生成してはならない

### 5.10 SearchStateUrl

検索結果ページの状態を表現する**状態 URL**です。`SearchStateUrl` は検索 UI の状態復元、履歴操作、共有 URL のために使います。`SearchStateUrl` は文書単位の識別子ではありません。

`SearchStateUrl` について、次を満たさなければなりません。

- `q`、`tag`、`tagMode`、`sort` を一意に表現できること
- canonical な状態表現は常に `/search?...` 形式であること
- 検索結果項目の `canonicalUrl` と混同してはならない

---

## 6. 検索モード

検索コアは、少なくとも次の 2 モードを提供しなければなりません。

### 6.1 `navigate`

目的:

- 最短で目的ノートへ移動すること

利用 UI:

- 検索ダイアログ

特性:

- 上位候補精度を優先する
- 結果件数を制限する
- 高速な初期応答を優先する
- タグフィルター UI は持たない

### 6.2 `explore`

目的:

- 結果比較、タグ絞り込み、並び替えを行うこと

利用 UI:

- `/search`
- `/tags/<tag>/`

特性:

- 結果集合の整合性を優先する
- 件数表示とフィルター件数の整合を保証する
- URL 状態を正規状態とする

### 6.3 モード差の制約

モード差として許容されるのは以下に限ります。

- 上限件数
- スコア重み
- 表示情報量
- 応答戦略

一致判定規則、候補統合規則、タグ意味論、URL 正規化規則はモードごとに分岐してはなりません。

---

## 7. モジュール責務

### 7.1 `search-core`

責務:

- クエリ前処理の呼び出し
- 検索ソース呼び出し
- 候補の URL 正規化
- 候補統合
- 特徴量算出
- スコア算出
- 並び順適用
- タグ件数算出
- 縮退状態の診断情報生成

非責務:

- DOM 操作
- History API 操作
- クリック遷移

### 7.2 `query-pipeline`

責務:

- クエリ正規化
- Unicode 正規化
- 日本語トークン化
- トークン重複除去
- 検索用語の派生生成

### 7.3 `pagefind-source`

責務:

- Pagefind モジュールロード
- Pagefind 検索実行
- Pagefind 結果の正規化
- Pagefind 側タグ / facet 件数の取得
- Pagefind 側タグ / facet 件数の取得可否の明示的報告
- Pagefind が表現可能な範囲の前段絞り込み

非責務:

- 最終タグ意味論の保証
- 最終ソート規則の保証

### 7.4 `catalog-source`

責務:

- `/search-catalog.json` の取得
- カタログ項目の正規化
- `SearchCatalogItem.path` からの `DocumentCanonicalUrl` 導出
- `SearchCatalogItem.url` の遷移先検証
- `SearchCatalogItem.path` と `SearchCatalogItem.url` の**同一文書性検証**
- path / slug / keyword ベースの補完一致判定

### 7.5 `search-url`

責務:

- URL から検索状態を読み取る
- 検索状態から URL を生成する
- URL 状態の正規化を一元管理する

### 7.6 `navigation-adapter`

責務:

- ルーター優先の遷移
- ルーター不在時のフルページ遷移

### 7.7 UI 層

責務:

- 入力受付
- URL 同期
- 検索コア呼び出し
- 結果表示
- キーボード操作
- 読み上げ向け状態通知

UI は検索ロジックを持ってはなりません。

---

## 8. データモデル

### 8.1 列挙型

```ts
type SearchSourceKind = 'pagefind' | 'catalog';

type SearchFieldKind =
  | 'title'
  | 'description'
  | 'body'
  | 'path'
  | 'keyword'
  | 'tag';

type SearchFailureKind =
  | 'pagefind-load-failed'
  | 'pagefind-search-failed'
  | 'pagefind-filter-read-failed'
  | 'catalog-fetch-failed'
  | 'catalog-normalize-failed'
  | 'all-sources-failed';

type SearchDiagnosticSeverity = 'info' | 'warn' | 'error';

type SearchDiagnosticStage =
  | 'fetch'
  | 'normalize'
  | 'validate'
  | 'merge'
  | 'rank'
  | 'filter'
  | 'navigate';

type SearchDiagnosticIssueCode =
  | 'invalid-result-url'
  | 'unsupported-url-scheme'
  | 'cross-origin-url'
  | 'url-with-credentials'
  | 'invalid-document-canonical-url'
  | 'catalog-path-url-mismatch'
  | 'invalid-catalog-item'
  | 'source-degraded'
  | 'source-failed';

type DocumentCanonicalUrl = string;
type SearchStateUrl = string;
type SearchRankingProfileId = 'rouault-search-v1';

type SearchCountMap = Record<string, number>;
```

規則:

- `SearchDiagnosticStage` の**定義順そのもの**を正規の順序としなければなりません
- stage の順序は ``** → **``** → **``** → **``** → **``** → **``** → **`` とし、8.9 の issue 並び順および診断集約の基準に使います
- 実装はこの順序を別定義で上書きしてはなりません

### 8.2 特徴量

```ts
interface SearchFeatureScores {
  titleExactScore: number;
  titlePrefixScore: number;
  titleTokenCoverageScore: number;
  bodyScore: number;
  pathScore: number;
  keywordScore: number;
  freshnessScore: number;
  sourceReliabilityScore: number;
  matchEvidenceScore: number;
}
```

規則:

- すべての特徴量は `0.0..1.0` の範囲に正規化しなければなりません
- `NaN`、`Infinity`、負値は許可しません
- `matchEvidenceScore` は他特徴量から導出される派生値であり、総合スコアへの直接加算には使いません

### 8.3 内部日付表現

```ts
interface SearchDateValue {
  epochMs: number | null;
  original: string | null;
}
```

規則:

- 内部ソートと比較には `epochMs` を使う
- 表示には `original` または別のフォーマッタ出力を使う
- 日付欠損時は `epochMs = null` とする

### 8.4 検索ソース共通候補

```ts
interface SearchCandidate {
  canonicalUrl: DocumentCanonicalUrl;
  url: string;
  pathLabel: string;
  title: string;
  description: string;
  date: SearchDateValue;
  tags: string[];
  snippet: SearchSnippet | null;
  matchedSources: SearchSourceKind[];
  matchedFields: SearchFieldKind[];
  matchedTokens: string[];
  featureScores: SearchFeatureScores;
}
```

規則:

- `SearchCandidate.canonicalUrl` は、**ソースごとに定義された canonical 入力**を `normalizeDocumentCanonicalUrl(...)` へ通して `null` を返さない場合にのみ設定してよいものとします
- `SearchCandidate.url` は、22.2 の URL 検証を通過した値でなければなりません
- `catalog-source` では `SearchCatalogItem.path` を canonical 入力とし、`url` を canonical 入力として使ってはなりません
- `SearchCandidate` は**正規化済みで有効な候補のみ**を表し、`canonicalUrl = null` を許可しません

### 8.5 検索スニペット

```ts
interface SearchSnippetSegment {
  text: string;
  matched: boolean;
}

interface SearchSnippet {
  segments: SearchSnippetSegment[];
}
```

規則:

- `segments` は表示順で保持する
- `text` はプレーンテキストとする
- HTML は含めない
- UI は `matched=true` の区間のみを安全に強調表示する
- 表示用スニペットの最大長は 180 文字とする
- 一致区間は最大 3 か所まで保持する
- 隣接する同種 segment はマージしなければならない
- 先頭または末尾が途中省略された場合は `…` を付与する

### 8.6 検索レスポンス

#### 8.6.1 count map 型契約

`SearchCountMap` は、タグ名から件数への写像を表す型です。

規則:

- key は**正規化済み非空タグ名**でなければなりません
- value は `0` 以上の有限な安全整数でなければなりません
- `null`、`undefined`、`NaN`、負値、小数値を value に含めてはなりません
- 同一タグへ正規化される複数 key を同時に含めてはなりません
- key 不在は件数 `0` と同義であり、`0` 件のタグを必ずしも明示列挙する必要はありません
- 空 object は有効な `SearchCountMap` です
- Array、Map、class instance を `SearchCountMap` として扱ってはなりません

Pagefind 由来のタグ / facet 件数について、`count map が型契約を満たさない` とは少なくとも次のいずれかを指します。

1. object でない
2. key が正規化後に空文字となる
3. value が有限な安全整数でない
4. 同一タグへ正規化される key 衝突が解消されていない

### 8.6 検索レスポンス

```ts
interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  tagCounts: SearchCountMap;
  allTagCounts: SearchCountMap;
  togglePreviewTagCounts: SearchCountMap;
  rankingProfileId: SearchRankingProfileId;
  diagnostics: SearchDiagnostics;
}
```

### 8.7 検索結果項目

```ts
interface SearchResultItem {
  canonicalUrl: DocumentCanonicalUrl;
  url: string;
  pathLabel: string;
  title: string;
  description: string;
  date: SearchDateValue;
  tags: string[];
  snippet: SearchSnippet | null;
  reasons: SearchReason[];
}
```

### 8.8 理由情報

```ts
interface SearchReason {
  kind:
    | 'title-exact'
    | 'title-prefix'
    | 'title-token-coverage'
    | 'body-match'
    | 'path-match'
    | 'keyword-match'
    | 'tag-filter-match'
    | 'catalog-fallback';
  tokens?: string[];
  source?: SearchSourceKind;
}
```

### 8.9 診断情報

#### 8.9.1 severity 割当基準

`SearchDiagnosticSeverity` は次の基準で割り当てなければなりません。

- `info`: 観測用の補助情報であり、候補破棄、ソース縮退、遷移拒否のいずれも直接引き起こさない事象
- `warn`: 部分的な縮退、候補破棄、または一部情報欠落を伴うが、検索レスポンス全体は継続可能な事象
- `error`: 安全性違反、URL 契約違反、ソース不能、または結果の正当性を維持できない事象

issue code ごとの既定 severity は以下のとおりとします。

- `invalid-result-url`: `error`
- `unsupported-url-scheme`: `error`
- `cross-origin-url`: `error`
- `url-with-credentials`: `error`
- `invalid-document-canonical-url`: `error`
- `catalog-path-url-mismatch`: `error`
- `invalid-catalog-item`: `warn`
- `source-degraded`: `warn`
- `source-failed`: `error`

追加規則:

- `invalid-catalog-item` は、**catalog 項目単位**の契約違反にのみ使わなければなりません
- `invalid-catalog-item` は、required field 欠落、required field の型不正、または catalog 項目全体を採用不能にする正規化契約違反であって、**より具体的な issue code が存在しない場合に限って**使わなければなりません
- `invalid-result-url`、`unsupported-url-scheme`、`cross-origin-url`、`url-with-credentials`、`invalid-document-canonical-url`、`catalog-path-url-mismatch` に該当する事象に対して、`invalid-catalog-item` を代用してはなりません
- `invalid-catalog-item` は候補単位の `warn` であり、source 全体の縮退を直接表してはなりません
- `source-degraded` は **source 単位**の `warn` であり、source は active だが完全品質契約を満たしていない状態のみを表さなければなりません
- 同一 code に対して実装ごとに severity を変更してはなりません

#### 8.9.2 stage 割当基準

`SearchDiagnosticStage` は、異常が**最初に確定した処理段階**へ割り当てなければなりません。

代表例:

- 取得不能、レスポンス読込失敗: `fetch`
- 形式不正、パース不能、正規化不能: `normalize`
- URL 検証失敗、同一文書性不一致、契約違反: `validate`
- 重複統合や候補統合時に発見された不整合: `merge`
- 特徴量算出・ランキング式の適用不能: `rank`
- タグ条件や後段フィルターでの不整合: `filter`
- 実遷移時の拒否やナビゲーション不能: `navigate`

同一事象が複数段階にまたがる場合でも、後段で再分類してはならず、**最初に確定した段階**を維持しなければなりません

#### 8.9.3 `source-degraded` 発火条件

`source-degraded` は、**source が activeSources に残っている場合に限って**発火してよいものとします。

`source-degraded` は、1 レスポンスあたり source ごとに高々 1 件だけ記録しなければなりません。

発火条件は以下のいずれかです。

1. **catalog 項目破棄率条件**
   - `catalog-source` が取得した総項目数を `catalogFetchedCount` とします
   - `catalogFetchedCount` は、fetch 成功・JSON パース成功・トップレベル配列確認成功の後に得られた**配列要素数そのもの**としなければなりません
   - `catalogDroppedCount` は、次の理由で**候補化前に項目全体を破棄した件数**のみを数えなければなりません
     1. required field `title` / `url` / `path` の欠落
     2. required field `title` / `url` / `path` が正規化後に空文字となる
     3. `path` がルート相対 path 契約を満たさない、または `normalizeDocumentCanonicalUrl(path) = null`
     4. `url` が 22.2 の許可 URL 契約を満たさない
     5. `normalizeDocumentCanonicalUrl(url) = null`
     6. `normalizeDocumentCanonicalUrl(path) !== normalizeDocumentCanonicalUrl(url)`
   - 次の事象は `catalogDroppedCount` に含めてはなりません
     1. `date` のパース失敗により `epochMs = null` へフォールバックしたが、項目自体は採用できる場合
     2. `description`、`keywords`、`tags` の一部正規化や空要素除去により項目は採用可能な場合
     3. keyword / tag の重複除去
     4. 候補統合段階での重複吸収

- 次の事象は `catalogFetchedCount` の**分母から除外**しなければなりません
  1. fetch 失敗により取得できなかった項目
  2. JSON パース失敗により列挙不能な項目
  3. トップレベルが配列契約を満たさず、配列要素として列挙できない入力
- 逆に、トップレベル配列に列挙された要素は、後続で不正と判定されても `catalogFetchedCount` の分母に**含めなければなりません**
  - `catalogFetchedCount >= 20` かつ `catalogDroppedCount >= max(5, ceil(catalogFetchedCount * 0.05))` の場合、`source='catalog'` の `source-degraded` を発火しなければなりません

2. **Pagefind フィルター件数欠落条件**
   - `pagefind-source` は、`explore` モードにおいて候補取得成功後、`SearchResponse` を確定する前にタグ / facet 件数取得を試行しなければなりません
   - 件数取得失敗の**確定点**は、候補取得が成功し、かつ件数取得試行が次のいずれかで終了した時点とします
     1. 例外送出または promise rejection
     2. count map が `null` / `undefined`
     3. count map が型契約を満たさない
   - 候補 0 件で count map が空である場合は、件数取得失敗とみなしてはなりません
   - 上記の確定点に達し、かつ結果候補が 1 件以上ある場合、`source='pagefind'` の `source-degraded` を発火しなければなりません

追加規則:

- `source-degraded` は source 全体停止ではないため、`failures` のみで代用してはなりません
- `catalogFetchedCount < 20` の場合、catalog の軽微な個別項目破棄だけで `source-degraded` を発火してはなりません
- `invalid-catalog-item` の複数発生は、そのまま `source-degraded` の代用ではありません。上記の定量条件を満たした場合にのみ source 単位の縮退として記録しなければなりません

### 8.9 診断情報

```ts
interface SearchDiagnosticIssue {
  code: SearchDiagnosticIssueCode;
  severity: SearchDiagnosticSeverity;
  stage: SearchDiagnosticStage;
  source?: SearchSourceKind;
  candidateRef?: string;
  count: number;
}

interface SearchDiagnostics {
  degraded: boolean;
  activeSources: SearchSourceKind[];
  failures: SearchFailureKind[];
  issues: SearchDiagnosticIssue[];
}
```

規則:

- `failures` は**ソース単位の粗い失敗分類**のみを保持し、UI の一般向け縮退表示とテスト判定に使います
- `issues` は**開発時診断向けの詳細粒度**を保持し、候補破棄・検証失敗・縮退理由の追跡に使います
- `issues` の 1 要素は 1 つの**集約済み異常事象**に対応しなければなりません
- `candidateRef` は開発向けの**不透明な安定識別子**とし、raw URL、origin、本文断片を含めてはなりません
- `count` は同一 issue key に集約された発生回数を表し、`1` 以上の整数でなければなりません
- `issues` の最大保持件数は **100 件**としなければなりません
- `issues` は `(code, stage, source, candidateRef)` が同一の事象を**重複記録してはなりません**
- 同一キーの事象が複数回発生した場合、`issues` には 1 件のみ保持し、その `count` を加算しなければなりません
- `issues` の並び順は決定的でなければなりません。並び順は **severity 降順（**``** → **``** → **``**）→ stage 定義順 → code 昇順 → source 昇順（**``** は末尾）→ candidateRef 昇順（**``** は末尾）** とします
- `severity` の順序は ``** → **``** → **`` で固定しなければなりません
- `issues` が最大保持件数に達した後は、追加事象を無制限に蓄積してはなりません。保持優先順位は上記並び順の高いものを優先し、下位事象を抑止しなければなりません
- 一般ユーザー向け UI は `issues` を逐一表示してはなりません

---

## 9. URL 契約と正規化仕様

### 9.1 概念分離

URL は次の 2 種類に厳密に分離します。

- `DocumentCanonicalUrl`: 検索結果項目である文書を識別する URL
- `SearchStateUrl`: 検索結果ページの状態を表現する URL

両者は役割が異なるため、同一型名・同一契約として扱ってはなりません。

### 9.2 適用範囲

- `SearchCandidate.canonicalUrl` と `SearchResultItem.canonicalUrl` は **DocumentCanonicalUrl のみ**を許可します
- `/search?...` および `/tags/...` は **SearchStateUrl またはその別入口 URL**であり、検索結果項目の `canonicalUrl` に使ってはなりません
- 検索結果集合の重複統合は `DocumentCanonicalUrl` のみで行わなければなりません

### 9.3 DocumentCanonicalUrl の目的

`DocumentCanonicalUrl` は、検索候補の重複統合と同一文書判定の唯一の基準です。したがって、正規化規則は実装差を許してはなりません。

### 9.4 DocumentCanonicalUrl の正規化入力

正規化関数 `normalizeDocumentCanonicalUrl(url)` は、絶対 URL またはルート相対 URL を受け付けます。

### 9.5 DocumentCanonicalUrl の正規化出力

`normalizeDocumentCanonicalUrl(url)` の戻り値型は `DocumentCanonicalUrl | null` としなければなりません。

- 正常時は、**origin を含まない絶対パス形式の **`` を返します
- 文書 URL として不正な入力を受けた場合は `null` を返します
- 不正入力を例外で表現してはなりません

正常時の例:

- `/notes/math/logic/`
- `/essay/formal-language/`

### 9.6 DocumentCanonicalUrl の正規化規則

`normalizeDocumentCanonicalUrl(url)` は以下を適用します。

1. origin を除去する
2. hash を除去する
3. query を除去する
4. `index.html` は除去する
5. trailing slash はディレクトリ URL として `/` ありへ統一する
6. `%xx` は URL デコード後に再エンコードした正規形へ統一する
7. path の重複スラッシュは単一化する
8. 空 path は `/` とする
9. `/search` および `/tags/...` を受け取った場合は、**DocumentCanonicalUrl としては不正**として `null` を返さなければなりません

### 9.7 pathLabel の生成入力

`derivePathLabel(documentCanonicalUrl)` は、`DocumentCanonicalUrl` のみを受け付けなければなりません。`SearchStateUrl` や未正規化 URL を直接受け取ってはなりません。

### 9.8 pathLabel の生成規則

`derivePathLabel(documentCanonicalUrl)` は以下を適用します。

1. `DocumentCanonicalUrl` から先頭 `/` と末尾 `/` を除去する
2. 空文字になった場合は `/` を返す
3. `/` で分割して path segment 列を得る
4. 各 segment に対して URL デコードを行う
5. 各 segment に対して Unicode 正規化 `NFKC` を適用し、前後空白を除去する
6. 空 segment は除去する
7. segment 列を `/` で連結する
8. 連結後の文字列長が 80 文字以下ならそのまま返す
9. 80 文字を超える場合は、先頭 2 segment と末尾 2 segment を保持し、中間を `…` に置換して返す
10. 上記でも 80 文字を超える場合は、末尾側 segment を優先して残しつつ、各 segment の中間省略を行って 80 文字以内へ収める

例:

- `/notes/math/logic/` → `notes / math / logic`
- `/essay/formal-language/automata-theory/` → `essay / formal-language / automata-theory`

### 9.9 pathLabel の追加規則

- `pathLabel` は表示専用であり、ソートや重複判定に使ってはなりません
- `pathLabel` は `title` の代替表示ではなく、補助情報として扱わなければなりません
- 同一 `DocumentCanonicalUrl` に対して、常に同じ `pathLabel` が導出されなければなりません

### 9.10 SearchStateUrl の目的

`SearchStateUrl` は検索 UI の状態復元、履歴、共有のための URL です。`SearchStateUrl` は文書識別子ではありません。

### 9.11 SearchState

```ts
interface SearchState {
  q: string;
  tags: string[];
  tagMode: 'or' | 'and';
  sort: 'relevance' | 'date-desc';
}
```

### 9.12 SearchStateUrl の生成規則

`buildSearchStateUrl(state)` は、canonical な状態 URL として**常に **`` を返さなければなりません。

規則:

1. path は常に `/search` とする
2. `q`、`tag`、`tagMode`、`sort` を 15 章の契約に従って query へ符号化する
3. `tags` は正規化後、**タグ名の昇順**で安定ソートしなければなりません
4. `tagMode='or'` の場合、タグの選択順は意味論に含めてはなりません
5. `tagMode='and'` の場合も、タグの選択順は意味論に含めてはなりません
6. `tag` は 3 の順序で複数回出力してよい
7. 既定値は省略してよい
8. 返却値の型は `SearchStateUrl` とする

### 9.13 SearchStateUrl の正規化規則

`normalizeSearchStateUrl(url)` は以下を適用します。

1. `/tags/<tag>/` を受け取った場合、等価な `SearchState` を構成する
2. 得られた `SearchState` を `buildSearchStateUrl(state)` へ通し、canonical な `/search?...` 形式へ変換する
3. `/search?...` を受け取った場合も、15 章の正規化規則を適用後に再構築する
4. hash は除去する
5. origin は除去する

### 9.14 タグページの位置づけ

`/tags/<tag>/` は UI 入口専用 URL です。検索状態の canonical 表現は常に `SearchStateUrl`、すなわち `/search?...` 形式でなければなりません。

---

## 10. クエリ前処理仕様

### 10.1 正規化

クエリは以下の規則で正規化します。

- Unicode 正規化は `NFKC` を適用する
- 連続空白を単一半角空白へ畳み込む
- 前後空白を除去する
- ASCII 英字は小文字へ case folding する
- 全角英数字は半角へ正規化する
- 空文字は空クエリとして扱う

### 10.2 トークン化

`Intl.Segmenter('ja', { granularity: 'word' })` が利用可能な場合、語単位で分割します。

規則:

- `isWordLike === false` のセグメントは除外する
- 空トークンは除外する
- 正規化後トークンで重複除去する
- ユーザー入力文字列 `inputQuery` と、正規化済み検索語 `normalizedQuery` と、検索ソース入力用 `segmentedQuery` を分離する

### 10.3 フォールバック

`Intl.Segmenter` が利用できない場合は、正規化済み文字列を空白分割してトークン化します。

### 10.4 生成物

```ts
interface PreparedSearchQuery {
  inputQuery: string;
  normalizedQuery: string;
  segmentedQuery: string;
  tokens: string[];
}
```

規則:

- `inputQuery` はユーザーが入力した文字列そのものを保持し、正規化してはなりません
- `normalizedQuery` は 10.1 の正規化規則を適用した canonical な検索語とします
- `segmentedQuery` は `tokens` を単一半角空白で連結した検索ソース入力用文字列とします
- URL 状態 `q` には `normalizedQuery` を使わなければなりません
- 内部ランキング計算は `tokens` を基準とし、`inputQuery` を直接参照してはなりません
- `inputQuery` は **UI 入力中の一時状態**であり、`SearchStateUrl`、`SearchState`、検索結果項目、検索ソース入力の永続契約に含めてはなりません
- ページ再読込、直接アクセス、`popstate`、共有 URL 復元時には、入力欄表示値を `normalizedQuery` から復元しなければなりません
- `inputQuery` をセッションをまたいで復元してはなりません

### 10.5 派生語

検索コアは必要に応じて以下を派生してもよいものとします。

- path 分割語
- slug 分割語
- title token
- description token

ただし、派生語の生成責務は `query-pipeline` または `catalog-source` に閉じ込め、UI 層へ漏らしてはなりません。

---

## 11. 検索ソース仕様

### 11.1 Pagefind ソース

役割:

- 本文、タイトル、説明文、日付、タグの主検索源

入力:

- `segmentedQuery`
- Pagefind がネイティブに表現できる範囲の前段フィルター

出力:

- 候補集合
- タグ件数
- 一致根拠に変換可能な断片情報

規則:

- 本文一致は高い `matchEvidenceScore` を持つ
- タグ / facet 件数の取得失敗は検索全体失敗と同一視しない
- `explore` モードでは、候補取得成功後にタグ / facet 件数取得を試行し、その可否を `pagefind-source` が曖昧さなく区別して `search-core` へ渡さなければなりません
- 候補 0 件で count map が空である場合と、件数取得失敗により count map を返せない場合を同一視してはなりません
- Pagefind ソースは最終 `and` 意味論を保証しない
- Pagefind ソースは最終 `date-desc` ソートを保証しない

### 11.2 補助検索カタログ

役割:

- path、slug、補助キーワード、Pagefind 非搭載情報の補完
- 主検索源障害時の縮退運転経路

項目契約:

```ts
interface SearchCatalogItem {
  title: string;
  url: string;
  path: string;
  description?: string;
  date?: string;
  keywords?: string[];
  tags?: string[];
}
```

意味論:

- `path`: 文書識別および索引のための**内部ルート相対 path**。`DocumentCanonicalUrl` の導出元として使います
- `url`: UI が実際に遷移に使う**遷移先 URL**。文書識別子として使ってはなりません

規則:

- `title`、`url`、`path` は必須
- `path` は `/` から始まるルート相対 path でなければなりません
- `path` は `normalizeDocumentCanonicalUrl(path)` により `DocumentCanonicalUrl` へ変換可能でなければなりません
- `url` は遷移前検証の対象であり、`DocumentCanonicalUrl` 導出元として使ってはなりません
- `url` は同一 origin の内部文書 URL、またはそれと等価なルート相対 URL でなければなりません
- `url` は `http:` または `https:` の絶対 URL、もしくは `/` から始まるルート相対 URL のみを許可します
- `javascript:`, `data:`, `file:`, `blob:`, `mailto:`, `tel:` などの許可されないスキームを持つ `url` は不正とみなし破棄しなければなりません
- userinfo を含む `url` は不正とみなし破棄しなければなりません
- `url` から `normalizeDocumentCanonicalUrl(url)` が `null` を返す場合、その catalog 項目は不正とみなし破棄しなければなりません
- `normalizeDocumentCanonicalUrl(url)` が成功した場合、その値は `normalizeDocumentCanonicalUrl(path)` と**必ず一致**しなければなりません
- `url` と `path` の正規化結果が一致しない場合、その catalog 項目は破棄し、`diagnostics.issues` に `catalog-path-url-mismatch` を記録しなければなりません
- `date` を持つ場合、その形式は `YYYY-MM-DD` または UTC の ISO 8601 としなければなりません
- `date` のパースに失敗した場合、`epochMs = null` として扱い、検索処理を失敗させてはなりません
- 空文字は除去する
- `url` と `path` はそれぞれの契約に従って正規化または検証する
- `keywords`、`tags` は空要素除去と重複除去を行う

### 11.3 ソース優先順位

- 主検索源: Pagefind
- 補完検索源: 補助検索カタログ

補助検索カタログは**補完用**であり、本文一致と同等の重みを与えてはなりません。

### 11.4 ソース信頼度

`sourceReliabilityScore` は次の既定値を取ります。

- `pagefind`: `1.0`
- `catalog`: `0.6`

この値はソース差のみを表し、一致の強さは表しません。

---

## 12. 候補統合仕様

### 12.1 統合単位

候補統合の主キーは `canonicalUrl` とします。

### 12.2 URL モデル

- `url`: 遷移に使う URL
- `pathLabel`: `DocumentCanonicalUrl` から導出される表示専用ラベル
- `canonicalUrl`: `DocumentCanonicalUrl`。重複判定用 URL

この 3 者を同一視してはなりません。とくに `pathLabel` は表示専用、`canonicalUrl` は識別専用です。

### 12.3 統合規則

同一 `canonicalUrl` の候補は以下で統合します。

- `title`: 正規化済み非空値を採用
- `description`: 主検索源由来を優先し、同一優先度なら可視文字数が長いものを採用
- `date`: `epochMs` が大きいものを優先する
- `tags`: 和集合
- `matchedSources`: 和集合
- `matchedFields`: 和集合
- `matchedTokens`: 和集合
- `featureScores.sourceReliabilityScore`: 最大値を採用
- `featureScores.matchEvidenceScore`: 最大値を採用
- `featureScores` のうち上記 2 項目以外は、統合後候補に対して `search-core` が**再計算**しなければなりません
- `snippet`: 主検索源由来を優先し、同一優先度なら一致区間数が多いものを採用

### 12.4 不正候補

以下の候補は破棄します。

- `canonicalUrl` が空
- `url` が空
- `title` が空
- `normalizeDocumentCanonicalUrl(...)` が `null` を返す
- `catalog-source` において `normalizeDocumentCanonicalUrl(path) !== normalizeDocumentCanonicalUrl(url)` となる

`normalizeDocumentCanonicalUrl(...)` が `null` を返した場合、または `catalog-source` で `path` と `url` の正規化結果が一致しない場合、候補は破棄し、開発時に観測可能な形で `diagnostics` へ記録しなければなりません

---

## 13. 特徴量とランキング

### 13.1 特徴量

少なくとも以下の特徴量を算出しなければなりません。

- `titleExactScore`
- `titlePrefixScore`
- `titleTokenCoverageScore`
- `bodyScore`
- `pathScore`
- `keywordScore`
- `freshnessScore`
- `sourceReliabilityScore`
- `matchEvidenceScore`

### 13.2 値域

すべての特徴量は `0.0..1.0` へ正規化しなければなりません。

### 13.3 共通正規化

フィールド一致系特徴量の算出に使うトークン集合は、10 章のクエリ正規化規則と同一の正規化規則を適用しなければなりません。

- `queryTokens`: `PreparedSearchQuery.tokens`
- `titleTokens`: タイトル全文から抽出した正規化済みトークン集合
- `bodyTokens`: 本文全文、または本文全文と等価な索引情報から抽出した正規化済みトークン集合
- `pathTokens`: path segment、slug segment、ファイル名 segment から抽出した正規化済みトークン集合
- `keywordTokens`: `keywords` から抽出した正規化済みトークン集合

検索ソースは、`titleTokenCoverageScore`、`bodyScore`、`pathScore`、`keywordScore` を仕様どおり算出するために必要な正規化済みトークン集合、またはそれと等価な一致情報を `search-core` に渡さなければなりません。

表示用 `snippet` はランキング計算用の `bodyTokens` 生成源として使ってはなりません。`snippet` は表示のための派生表現であり、順位計算へ逆流させてはなりません。

### 13.4 フィールドトークン一致関数

各 query token `q` に対して、あるフィールドトークン集合 `F` の一致値 `fieldTokenMatch(q, F)` を次のように定義します。

- `1.0`: `F` に `q` と完全一致するトークンが存在する
- `0.75`: 完全一致はないが、`F` に `q` で始まるトークンが存在する
- `0.4`: `q` の文字数が 2 以上であり、完全一致・前方一致はないが、`F` に `q` を部分文字列として含むトークンが存在する
- `0.0`: 上記のいずれでもない

文字数 1 の query token に対して、部分一致を用いてはなりません

### 13.5 算出規則

- `titleExactScore`: 正規化済みタイトル全体が正規化済みクエリと一致する場合 `1.0`、それ以外は `0.0`
- `titlePrefixScore`: 正規化済みタイトル全体が正規化済みクエリで始まる場合 `1.0`、それ以外は `0.0`
- `titleTokenCoverageScore`: `count(fieldTokenMatch(q, titleTokens) > 0 for q in queryTokens) / uniqueQueryTokens`。空クエリ時は `0.0`
- `bodyScore`: `sum(fieldTokenMatch(q, bodyTokens) for q in queryTokens) / uniqueQueryTokens`。空クエリ時は `0.0`
- `pathScore`: `sum(fieldTokenMatch(q, pathTokens) for q in queryTokens) / uniqueQueryTokens`。空クエリ時は `0.0`
- `keywordScore`: `sum(fieldTokenMatch(q, keywordTokens) for q in queryTokens) / uniqueQueryTokens`。空クエリ時は `0.0`
- `freshnessScore`: `max(0, 1 - ageDays / 3650)` とする。ここで `ageDays = floor((nowUtcMs - date.epochMs) / 86400000)` とし、`nowUtcMs` は検索実行時の UTC 現在時刻とする。日付欠損時は `0.0`
- `sourceReliabilityScore`: 11.4 の既定値を用いる
- `matchEvidenceScore`: `max(titleExactScore, titlePrefixScore, titleTokenCoverageScore, bodyScore, pathScore, keywordScore)` とする

### 13.6 ランキングプロファイル

検索コアは、**バージョン付きランキングプロファイル**を用いて総合スコアを算出しなければなりません。

本仕様で定義する規範プロファイル ID は次のとおりです。

- `rouault-search-v1`

重みベクトルを変更する場合は、既存プロファイルを上書きしてはならず、新しいプロファイル ID を導入しなければなりません。

### 13.7 総合スコア計算

`rouault-search-v1` における総合スコアは、モード別重みを使って次式で算出します。

```ts
score =
  titleExactScore * W1 +
  titlePrefixScore * W2 +
  titleTokenCoverageScore * W3 +
  bodyScore * W4 +
  pathScore * W5 +
  keywordScore * W6 +
  freshnessScore * W7 +
  sourceReliabilityScore * W8
```

`matchEvidenceScore` はこの式に加算してはなりません。

### 13.8 `rouault-search-v1` のモード別重み

`navigate`:

- `W1 = 3.0`
- `W2 = 2.0`
- `W3 = 1.5`
- `W4 = 0.8`
- `W5 = 1.8`
- `W6 = 1.2`
- `W7 = 0.1`
- `W8 = 0.8`

`explore`:

- `W1 = 2.0`
- `W2 = 1.2`
- `W3 = 1.8`
- `W4 = 1.8`
- `W5 = 0.8`
- `W6 = 0.8`
- `W7 = 0.4`
- `W8 = 0.6`

### 13.9 安定化ソート

`relevance` の同点時は以下で安定化します。

1. `matchEvidenceScore` 降順
2. `sourceReliabilityScore` 降順
3. `date.epochMs` 降順（`null` は最下位）
4. `title` 昇順
5. `pathLabel` 昇順

### 13.10 並び順モード

検索結果ページでは以下を提供します。

- `relevance`
- `date-desc`

`date-desc` は以下で並び替えます。

1. `date.epochMs` 降順（`null` は最下位）
2. `matchEvidenceScore` 降順
3. `title` 昇順
4. `pathLabel` 昇順

---

## 14. タグ意味論

### 14.1 タグ選択

タグフィルターは 0 個以上のタグを受け付けます。

### 14.2 タグ演算子

複数タグの意味論は `tagMode` で表現します。

許可値:

- `or`
- `and`

既定値:

- `or`

### 14.3 意味論

- `or`: いずれかの選択タグを持つ文書を一致とみなす
- `and`: すべての選択タグを持つ文書を一致とみなす

### 14.4 実装原則

- 検索ソースは前段絞り込みを行ってよい
- ただし最終意味論の保証責務は常に `search-core` が持つ
- 検索ソースが `and` をネイティブに表現できない場合、`search-core` が正規化後候補に対して後段フィルターを適用する

### 14.5 件数定義

以下を定義します。

- `Q`: クエリ一致集合
- `S(T, M)`: タグ集合 `T` とタグ演算子 `M` を `Q` に適用した結果集合
- `currentTags`: 現在選択中のタグ集合
- `currentMode`: 現在の `tagMode`

補助関数 `toggle(currentTags, tag)` は、`tag` が未選択なら追加し、選択済みなら除去した新しいタグ集合を返します。

件数は以下で定義します。

- `allTagCounts`: `Q` におけるタグ出現件数
- `tagCounts`: `S(currentTags, currentMode)` におけるタグ出現件数
- `togglePreviewTagCounts[tag]`: `S(toggle(currentTags, tag), currentMode)` の件数

追加規則:

- `currentTags` が空集合のとき、`S(currentTags, currentMode) = Q` とする
- `togglePreviewTagCounts` は**未選択タグへの追加時件数**と**選択済みタグの除去時件数**の両方を表しなければなりません
- `togglePreviewTagCounts` の定義域は `allTagCounts` に現れる全タグと `currentTags` の和集合とする

### 14.6 フィルターパネル表示規則

- 選択中タグは常に表示する
- 未選択タグは `togglePreviewTagCounts` 降順、同件数時タグ名昇順で並べる
- 未選択かつ `togglePreviewTagCounts = 0` のタグは無効表示とする
- 選択済みタグは件数 0 でも表示を維持する
- 選択済みタグについては、必要に応じて `togglePreviewTagCounts[tag]` を除去後件数として表示してよい

---

## 15. URL 仕様

### 15.1 URL 状態

検索結果ページの状態は `SearchState` と `SearchStateUrl` で表現します。

- `q`: 検索語
- `tag`: 0 個以上のタグ
- `tagMode`: `or | and`
- `sort`: `relevance | date-desc`

### 15.2 正規化規則

- `q` は `PreparedSearchQuery.normalizedQuery` と等価であり、10 章の正規化規則に従う
- `tag` は trim + 重複除去し、正規化後に**タグ名昇順**へ安定ソートする
- `tagMode` は未定義時 `or`
- `sort` は未定義時 `relevance`
- URL 状態において、タグの選択順は意味論に含めません

### 15.3 URL 生成

既定値は省略してよいものとします。

例:

- `/search`
- `/search?q=math`
- `/search?tag=physics`
- `/search?q=logic&tag=math&tag=philosophy`
- `/search?q=logic&tag=math&tag=philosophy&tagMode=and`
- `/search?q=logic&sort=date-desc`

### 15.4 タグページ

`/tags/<tag>/` はタグ 1 件を初期投入した `explore` モードの別入口です。

規則:

- 内部状態は `/search?tag=<tag>` と等価でなければなりません
- canonical な検索状態 URL は常に `SearchStateUrl`、すなわち `/search?...` 側へ寄せなければなりません
- `/tags/<tag>/` は検索結果項目の `canonicalUrl` と混同してはなりません

### 15.5 履歴操作

- 入力更新: `replaceState`
- タグ変更: `pushState`
- `tagMode` 変更: `pushState`
- 並び順変更: `pushState`
- `popstate`: URL から再読込して再検索

追加規則:

- 履歴復元時の入力欄表示値は `SearchState.q`、すなわち `normalizedQuery` と等価でなければなりません
- `inputQuery` は履歴状態に保存してはなりません

---

## 16. 検索結果ページ仕様

### 16.1 目的

- 結果一覧を比較できること
- キーワード、タグ、タグ演算子、並び順を組み合わせられること
- URL 共有・再訪・履歴復元に耐えること

### 16.2 構成要素

- 検索入力
- 結果件数表示
- 並び順切替
- タグフィルター
- タグ演算子切替
- 結果一覧
- ローディング表示
- エラー表示
- 空状態表示

### 16.3 検索起動条件

- 入力変更: debounce 後に再検索
- タグ変更: 即時再検索
- `tagMode` 変更: 即時再検索
- 並び順変更: 即時再検索
- `popstate`: 即時再検索

入力欄契約:

- ユーザー編集中の表示値として `inputQuery` を保持してよい
- ただし検索実行、URL 同期、再描画後の正規状態は `normalizedQuery` を基準としなければなりません
- IME 変換中など一時的に `inputQuery !== normalizedQuery` であってもよいが、その差異は URL 状態へ保存してはなりません

### 16.4 空状態

- クエリ空かつタグ未選択: 検索待ち状態
- クエリ空かつタグあり: タグ主導探索状態として検索実行を許可する
- 条件ありで結果 0 件: 一致なし状態

### 16.5 結果カード表示項目

- `pathLabel`
- `title`
- `date.original` または整形済み表示日付（存在時）
- `snippet` または `description`
- 任意で一致理由ラベル

### 16.6 リンク遷移

- 通常左クリックは SPA 遷移を優先する
- 修飾キー付きクリック、非左クリック、既定抑止済みイベントは通常リンク動作を妨げない

### 16.7 同時実行制御

検索要求ごとに request token を採番し、遅延応答した旧リクエスト結果を破棄しなければなりません。

---

## 17. 検索ダイアログ仕様

### 17.1 目的

- 現在文脈を大きく崩さずに目的ノートへ移動できること
- 少量入力で上位候補を高速提示できること

### 17.2 起動

- `open-search-dialog` カスタムイベント
- `Cmd+K` / `Ctrl+K`

### 17.3 起動抑止

フォーカス対象が以下のいずれかである場合、ショートカット起動してはなりません。

- `input`
- `textarea`
- `contenteditable`
- 検索ダイアログ自身の入力欄

### 17.4 出力件数

ダイアログの最大表示件数は固定しなければなりません。

既定値:

- 20 件

### 17.5 結果表示項目

- `title`
- `pathLabel`
- 必要に応じて一致理由の簡易ラベル

### 17.6 選択時動作

- Enter またはクリックで選択した候補へ遷移する
- 選択イベントには `url` と `canonicalUrl` を含めてもよい

### 17.7 結果ランキング

ダイアログは `navigate` モードの結果を用いるため、探索整合性よりも上位候補精度を優先します。

入力欄復元契約:

- ダイアログが開いている間は `inputQuery` を表示値として保持してよい
- ダイアログを閉じた時点で `inputQuery` は破棄してよく、次回起動時に自動復元してはなりません
- 共有 URL や履歴からダイアログ入力値を復元してはなりません

---

## 18. ナビゲーション仕様

### 18.1 ルーター取得

`navigation-adapter` は、アプリケーションのルート要素または明示的注入により `app-router` を取得しなければなりません。`window` グローバル依存を前提にしてはなりません。

### 18.2 遷移手順

`navigateToUrl(url)` は以下の順序で遷移を試みます。

1. `app-router` を取得する
2. `navigate()` 相当 API が存在すればそれを利用する
3. 存在しなければ `window.location.assign(url)` を使う

契約:

- ルーターがある環境では SPA 遷移を優先する
- ルーターがない環境でも遷移できること

---

## 19. エラー処理と縮退運転

### 19.1 障害分類

少なくとも以下を識別しなければなりません。

- `pagefind-load-failed`
- `pagefind-search-failed`
- `pagefind-filter-read-failed`
- `catalog-fetch-failed`
- `catalog-normalize-failed`
- `all-sources-failed`

追加規則:

- 上記は**ソース単位の failure** であり、`SearchDiagnostics.failures` に記録します
- 候補単位または検証単位の異常は `SearchDiagnostics.issues` に記録し、`failures` へ混在させてはなりません

### 19.2 縮退運転

- Pagefind ロード失敗時: 補助検索カタログのみで継続する
- Pagefind 検索失敗時: 補助検索カタログのみで継続する
- カタログ失敗時: Pagefind のみで継続する
- 全ソース失敗時: エラー状態とする

追加規則:

- source が継続動作しているが完全品質契約を満たしていない場合は、8.9.3 の条件に従って `source-degraded` を `diagnostics.issues` に記録しなければなりません
- source 全体停止を表す failure と、継続可能だが品質低下した `source-degraded` を混同してはなりません

### 19.3 UI 契約

- 一般ユーザー向けには過度な内部障害詳細を表示しない
- ただし開発時には縮退状態を観測できなければならない

### 19.4 観測手段

少なくとも以下のいずれかを持つこと。

- `console.warn` / `console.error`
- 開発モード専用デバッグパネル
- 計測イベント
- テスト参照可能な `diagnostics`

粒度要件:

- source の全体失敗は `failures` に記録する
- source は生きているが候補が一部破棄された場合は `issues` に記録する
- `issues` は少なくとも `code`、`severity`、`stage`、`count` を持たなければなりません
- `issues` は `info`、`warn`、`error` を区別しなければなりません
- `issues` の severity は 8.9.1 の割当基準および code 別既定値に従わなければなりません
- `issues` の重複判定キーは `(code, stage, source, candidateRef)` としなければなりません
- `issues` の保持件数上限到達時の抑止規則は決定的でなければなりません
- `issues` の提示順およびテスト観測順は 8.9 の並び順規則に従わなければなりません

---

## 20. アクセシビリティ要件

### 20.1 検索ダイアログ

- ダイアログは combobox パターンに従わなければなりません
- 候補一覧は listbox / option 相当の関係を持たなければなりません
- ArrowUp / ArrowDown で候補移動できること
- Enter で確定できること
- Escape で閉じられること
- 開閉時のフォーカス管理を保証すること
- 結果件数や状態変化をライブリージョンで通知できること

### 20.2 検索結果ページ

- 検索入力にプログラム上のラベルを持つこと
- タグフィルター開閉状態が支援技術から把握可能であること
- 選択済みタグの削除がキーボード操作可能であること
- 結果件数と空状態が読み上げ可能であること

### 20.3 表示スニペット

- 強調表示は意味的に過剰であってはならない
- `<mark>` 等の妥当な要素へマッピングすること

---

## 21. 性能要件

### 21.1 共通

- 同一セッション中の補助検索カタログ取得はキャッシュする
- 古い検索応答で新しい検索結果を上書きしてはならない

### 21.2 カタログキャッシュ無効化

`/search-catalog.json` は、少なくとも以下のいずれかでバージョン識別できなければなりません。

- ハッシュ付き URL
- `version` フィールド
- ビルド ID 付き URL

セッションキャッシュはこのバージョン単位で無効化しなければなりません。

### 21.3 ダイアログ

- 検索ソース問い合わせは並列実行する
- 最大表示件数を超える候補は切り詰める
- DOM 更新は差分更新を優先し、不要な再描画を避ける

### 21.4 検索結果ページ

- 文字入力には debounce を適用する
- debounce 既定値は 150 ms とする

---

## 22. セキュリティ要件

### 22.1 スニペット境界

検索ソースが返す HTML を UI へ直接渡してはなりません。

### 22.2 URL 検証

結果 `url` は遷移前に検証しなければなりません。

- `DocumentCanonicalUrl` への正規化と、遷移先 `url` の検証を混同してはなりません
- `url` の検証は、少なくとも空文字・不正 URL・許可されないスキームを排除することを目的とします
- 許可される `url` の形式は、`/` から始まるルート相対 URL、または同一 origin の `http:` / `https:` 絶対 URL に限ります
- `javascript:`, `data:`, `file:`, `blob:`, `mailto:`, `tel:` などのスキームは許可してはなりません
- userinfo を含む URL は許可してはなりません
- `catalog-source` においては、`path` を識別の正、`url` を遷移の正として扱わなければなりません
- `catalog-source` における `url` は、同一 origin 内で `path` と同一文書を指すことを検証しなければなりません
- 許可されない `url` は候補として採用してはならず、`diagnostics.issues` へ記録しなければなりません

### 22.3 診断情報

開発向け診断情報に機密情報や過剰な内部構造を含めてはなりません。

追加規則:

- `diagnostics.issues` に raw URL、origin、本文断片、未加工スニペットを含めてはなりません
- `diagnostics.issues` の `candidateRef` は不透明 ID またはハッシュ化識別子でなければなりません
- `candidateRef` は、`DocumentCanonicalUrl` が存在する場合はその値から、存在しない場合はソース内の安定入力値から生成しなければなりません
- `candidateRef` の生成には、少なくとも `(source, stableInput)` を連結した値に対する決定的ハッシュを用いなければなりません
- `candidateRef` の生成結果は同一入力に対して同一セッション内および同一ビルド内で安定でなければなりません
- `candidateRef` の生成に乱数や時刻依存値を使ってはなりません
- `diagnostics.issues.count` は raw イベント列を保持する代替ではなく、同一 issue key に集約された発生回数のみを表さなければなりません
- 一般ユーザー向け UI には、`issues` の詳細ではなく縮退の有無のみを表示しなければなりません

---

## 23. 推奨ファイル構成

```text
src/lib/search/
  search-core.ts
  search-types.ts
  query-pipeline.ts
  search-url.ts
  navigation.ts
  normalize-search-result-url.ts
  sources/
    pagefind-source.ts
    catalog-source.ts
  ranking/
    search-features.ts
    search-scoring.ts
    search-merge.ts
    search-tag-filter.ts

src/components/search/
  search-page.ts
  search-page-controller.ts

src/components/ui/search-dialog/
  search-dialog.ts
  search-dialog-controller.ts
```

原則:

- UI から直接 Pagefind を呼ばない
- UI から直接カタログ検索をしない
- ランキング処理は分離モジュール化する

---

## 24. テスト方針

### 24.1 単体テスト

対象:

- URL 正規化
- クエリ正規化
- トークン化
- URL 状態 parse / build
- 候補統合
- タグ意味論
- タグ件数算出
- スコア算出
- 縮退判定

### 24.2 結合テスト

対象:

- 検索コア + Pagefind ソース
- 検索コア + catalog ソース
- `tagMode=and` / `tagMode=or`
- `relevance` / `date-desc`

### 24.3 UI テスト

対象:

- ダイアログ起動
- キーボード移動
- Enter 遷移
- Escape 閉鎖
- フィルターパネル操作
- 空状態 / エラー表示
- `popstate` 復元

### 24.4 E2E テスト

対象:

- `/search` の URL 復元
- `/tags/<tag>/` 入口
- SPA 遷移優先
- フルページ遷移フォールバック
- 縮退運転時の最小動作保証

---

## 25. 受け入れ基準

1. 検索ダイアログと検索結果ページが同一検索コアを利用していること。
2. 検索ダイアログが `navigate` モード、検索結果ページが `explore` モードを利用すること。
3. 検索結果の重複判定が `canonicalUrl` で行われること。
4. `DocumentCanonicalUrl` 正規化が 9 章の規則どおりであること。
5. `SearchStateUrl` 正規化が 9 章の規則どおりであること。
6. 検索結果項目の `canonicalUrl` に `/search?...` または `/tags/...` が混入しないこと。
7. `pathLabel` が 9.8 および 9.9 の規則どおりに導出されること。
8. スニペットが構造化表現であり、生 HTML を UI に直接渡していないこと。
9. URL が `q`、`tag`、`tagMode`、`sort` を表現できること。
10. `/tags/<tag>/` の canonical な検索状態 URL が `/search?...` へ寄ること。
11. 複数タグの `or` / `and` が仕様どおりに動作すること。
12. `togglePreviewTagCounts` が、未選択タグでは追加後件数、選択済みタグでは除去後件数を表すこと。
13. `popstate` で状態が正しく復元されること。
14. `date-desc` で日付欠損項目が最下位になること。
15. Pagefind 障害時に catalog のみで縮退検索できること。
16. catalog 障害時に Pagefind のみで検索継続できること。
17. 全ソース失敗時のみエラー表示となること。
18. ダイアログ最大表示件数が固定されていること。
19. ダイアログのショートカットが入力中に誤発火しないこと。
20. 通常左クリックで SPA 遷移を優先し、修飾キー付きクリックでは通常リンク動作を維持すること。
21. 開発時に `diagnostics` から縮退状態を観測できること。 21a. `SearchDiagnostics.failures` がソース単位の失敗のみを保持し、候補単位の異常を含まないこと。 21b. `SearchDiagnostics.issues` が候補破棄や URL 検証失敗を `code` / `severity` / `stage` 付きで保持すること。 21c. `SearchDiagnostics.issues` が `(code, stage, source, candidateRef)` 単位で重複抑止されること。 21d. `SearchDiagnostics.issues` の保持件数が 100 件を超えず、上限到達時に上位優先順位の issue が保持されること。 21e. `SearchDiagnostics.issues` の同一 issue key 反復発生時に、新規要素を増やさず `count` が加算されること。 21f. `SearchDiagnostics.issues` の並び順が、severity 降順 → stage 定義順 → code 昇順 → source 昇順 → candidateRef 昇順で決定的であること。 21g. `SearchDiagnosticStage` の順序が `fetch` → `normalize` → `validate` → `merge` → `rank` → `filter` → `navigate` として固定されていること。 21h. `SearchDiagnosticSeverity` の割当が 8.9.1 の code 別既定値および割当基準に従うこと。 21i. `invalid-catalog-item` が catalog 項目単位の `warn` に限定され、より具体的な issue code の代用に使われないこと。 21j. `catalog-source` において、`catalogFetchedCount` が成功 fetch・成功 parse・成功したトップレベル配列確認後の配列要素数として数えられ、`catalogDroppedCount` が 8.9.3 で列挙した drop reason のみを数え、`catalogFetchedCount >= 20` かつ `catalogDroppedCount >= max(5, ceil(catalogFetchedCount * 0.05))` のときに `source='catalog'` の `source-degraded` が発火すること. 21k. `pagefind-source` において、`explore` モードで候補取得成功後かつ `SearchResponse` 確定前にタグ / facet 件数取得を試行し、例外送出、promise rejection、`null` / `undefined` count map、または 8.6.1 の型契約を満たさない count map のいずれかで失敗が確定し、結果候補が 1 件以上あるときに `source='pagefind'` の `source-degraded` が発火すること. 21l. 候補 0 件で count map が空である場合、`pagefind-source` はタグ / facet 件数取得失敗として扱わないこと.
22. `matchEvidenceScore` が総合スコアに直接加算されていないこと。
23. 返却される `rankingProfileId` が `rouault-search-v1` であること。
24. `titleTokenCoverageScore`、`bodyScore`、`pathScore`、`keywordScore` が 13.4 および 13.5 の一致関数と算出式に従うこと。
25. `normalizeDocumentCanonicalUrl(...)` が、不正入力に対して `null` を返し、候補が破棄されること。
26. `SearchStateUrl` の canonical 化においてタグ順序がタグ名昇順へ正規化されること。
27. 表示用 `snippet` が `bodyScore` 計算に使われないこと。
28. `SearchCatalogItem.path` が文書識別用、`SearchCatalogItem.url` が遷移用として扱われること。
29. URL 状態 `q` が `PreparedSearchQuery.normalizedQuery` と等価であること。
30. `catalog-source` において `normalizeDocumentCanonicalUrl(path) === normalizeDocumentCanonicalUrl(url)` が成立すること。 30a. 許可される結果 `url` が、ルート相対 URL、または同一 origin の `http:` / `https:` 絶対 URLに限定されること。 30b. 許可されないスキームや userinfo を含む `url` が候補として採用されず、`diagnostics.issues` に記録されること。 30c. `candidateRef` が raw URL や本文断片を露出せず、決定的ハッシュ方式で安定生成されること。
31. 検索結果ページの履歴復元時、入力欄表示値が `normalizedQuery` から復元され、`inputQuery` は永続化されないこと。
32. 検索ダイアログを閉じた後、`inputQuery` が自動復元されないこと。

---

## 26. 実装判断メモ

本仕様は、現行の段階的移行案を踏まえつつ、以下を**新仕様として前倒しで固定**しています。

- 検索コアの導入
- URL / path / canonical の分離
- `DocumentCanonicalUrl` と `SearchStateUrl` の概念分離
- `SearchCatalogItem.path` と `url` の責務分離
- `path` / `url` の同一文書性検証の導入
- `pathLabel` の導出規則の明文化
- `canonicalUrl` 正規化規則の明文化
- `inputQuery` と `normalizedQuery` の保持境界の明文化
- `sourceConfidence` の分割による意味の明確化
- `matchEvidenceScore` の派生指標化による二重計上の排除
- バージョン付きランキングプロファイルの導入
- タグ意味論の明示化
- トグル後件数を含むタグ件数定義の 3 層化
- スニペットの安全な構造化
- 診断情報の正式データモデル化
- `failures` と `issues` の二層診断粒度の明文化
- `issues` の最大保持件数、重複抑止規則、並び順の明文化
- `SearchDiagnosticStage` の定義順と `SearchDiagnosticSeverity` の割当基準の明文化
- `invalid-catalog-item` の適用境界、`catalogDroppedCount` の算入理由集合、`source-degraded` の定量発火条件の明文化
- Pagefind のタグ / facet 件数取得失敗の確定点と count map 型契約の明文化
- `catalogFetchedCount` の分母へ算入する対象と除外対象の明文化
- `issues.count` の正式データモデル化
- `candidateRef` の決定的生成方式の明文化
- 許可 URL スキームと URL 検証失敗時の扱いの明文化

これは互換性よりも、今後の改修コストの低減、仕様説明の明確さ、検索品質改善のしやすさを優先したためです。

