# 検索機能仕様書

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

検索結果は、表示前に必ず共通データモデルへ正規化します。ソース固有形式を UI に露出してはいけません。

### 3.3 説明可能性

検索結果は、なぜ一致したかを内部的に追跡可能でなければいけません。

### 3.4 縮退可能性

主検索源が障害状態でも、機能全停止を避ける経路を持たなければいけません。

### 3.5 URL の明示性

検索結果ページの状態は URL で復元可能でなければいけません。

### 3.6 安全な表示境界

検索ソースが返す HTML 断片を UI へそのまま流してはいけません。検索スニペットは構造化して扱います。

### 3.7 実装より契約を優先

UI コンポーネントや内部実装の都合で意味論を変えてはいけません。意味論変更は仕様改訂として扱います。

### 3.8 内部表現と表示表現の分離

検索、統合、ソートに使う内部値と、UI 表示に使う文字列表現は分離しなければいけません。

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

`DocumentCanonicalUrl` について、次を満たさなければいけません。

- 検索結果項目に対して安定であること
- query / hash に依存しないこと
- `/search/` や `/search/?...`、`/tags/<tag>/` のような検索状態 URL を表現しないこと

### 5.7 sourceReliabilityScore

検索ソース自体の信頼度を表す内部指標です。ソースごとの信頼性差のみを表し、一致の強さは表しません。

### 5.8 matchEvidenceScore

候補がどれだけ強い一致根拠を持つかを要約する**派生指標**です。`matchEvidenceScore` は本文一致、タイトル一致、path 一致、keyword 一致などの強度を要約しますが、**13.7 の総合スコアへ直接加算してはいけません**。

`matchEvidenceScore` の用途は以下に限定します。

- 一致理由の要約
- 安定化ソートの補助
- 同点時の優先順位付け
- 将来のしきい値判定

### 5.9 pathLabel

検索結果に表示する**表示専用の経路ラベル**です。`pathLabel` は `DocumentCanonicalUrl` またはそれと同値な文書 URL から導出される派生表現であり、識別子ではありません。

`pathLabel` について、次を満たさなければいけません。

- 表示専用であり、重複判定に使ってはならない
- `title` の代替識別子として扱ってはならない
- `DocumentCanonicalUrl` と 1 対 1 で安定に導出できること
- 検索状態 URL から生成してはならない

### 5.10 SearchStateUrl

検索結果ページの状態を表現する**状態 URL**です。`SearchStateUrl` は検索 UI の状態復元、履歴操作、共有 URL のために使います。`SearchStateUrl` は文書単位の識別子ではありません。

`SearchStateUrl` について、次を満たさなければいけません。

- `q`、`tag`、`tagMode`、`sort` を一意に表現できること
- canonical な状態表現は常に `/search/` または `/search/?...` 形式であること
- 検索結果項目の `canonicalUrl` と混同してはならない

---

## 6. 検索モード

検索コアは、少なくとも次の 2 モードを提供しなければいけません。

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

- `/search/`
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

一致判定規則、候補統合規則、タグ意味論、URL 正規化規則はモードごとに分岐してはいけません。

---

## 7. モジュール責務

### 7.1 `search-core`

責務:

- 検索要求を受け取り、7.1.1 から 7.1.6 の処理段階を順にオーケストレーションする
- 各段階間の中間表現を受け渡す
- `navigate` / `explore` のモード差異を、段階ごとの設定値またはプロファイル選択として注入する
- 段階失敗時に `failures` と `diagnostics` を集約する
- 最終 `SearchResponse` を構成して返す

非責務:

- DOM 操作
- History API 操作
- クリック遷移
- 個別ソース API 形式の解釈
- 個別 tokenizer 実装の詳細
- 特徴量算出の個別アルゴリズム
- タグ件数算出の個別アルゴリズム
- 診断 issue の個別生成規則

追加規則:

- `search-core` は、ランキング、件数算出、診断生成の詳細実装を 1 モジュールへ抱え込んではいけません
- 各段階は、入力型・出力型・失敗境界が明示された独立モジュールとして分離しなければいけません
- 各段階は、副作用を持つ場合でも境界が明示されていなければいけません
- 後段は前段の公開出力だけに依存し、前段の内部状態へ直接依存してはいけません

#### 7.1.1 query preparation

- クエリ正規化
- tokenizer policy 選択
- トークン化
- 検索語派生の生成

#### 7.1.2 source federation

- 検索ソース実行
- `SearchSourceBatch` への正規化
- source 単位 failure の確定

#### 7.1.3 candidate validation

- URL 検証
- canonical URL 導出
- source ごとの候補妥当性確認

#### 7.1.4 candidate merge

- `canonicalUrl` 単位の統合
- 採用 `url` の決定
- 重複吸収

#### 7.1.5 ranking and sorting

- 特徴量算出
- 総合スコア算出
- モード別ソート
- 安定化ソート

#### 7.1.6 counts and diagnostics

- `explore` 用件数算出
- `issues` 集約
- `activeSources` 導出
- `degraded` 導出

### 7.2 `query-pipeline`

責務:

- クエリ正規化
- Unicode 正規化
- tokenizer policy 選択
- クエリトークン化
- トークン重複除去
- 検索ソース入力用 `segmentedQuery` の生成
- query 側派生語の生成

非責務:

- 個別検索ソースの呼び出し
- ランキングスコア算出
- 候補統合
- UI 状態更新

追加規則:

- `query-pipeline` は日本語固定実装としてはいけません
- tokenizer の選択は policy として扱い、追加ポリシー導入に耐えなければいけません
- field 側 tokenization は必要に応じて別モジュールへ分離してよいものとします

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

UI は検索ロジックを持ってはいけません。

---

## 8. データモデル

### 8.1 列挙型

```ts
type SearchSourceKind = 'pagefind' | 'catalog';

type SearchFieldKind = 'title' | 'description' | 'body' | 'path' | 'keyword' | 'tag';

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

- `SearchDiagnosticStage` の**定義順そのもの**を正規の順序としなければいけません
- stage の順序は `fetch → normalize → validate → merge → rank → filter → navigate` とし、8.9 の issue 並び順および診断集約の基準に使います
- 実装はこの順序を別定義で上書きしてはいけません

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

- すべての特徴量は `0.0..1.0` の範囲に正規化しなければいけません
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
- `SearchCandidate.url` は、22.2 の URL 検証を通過した値でなければいけません
- `catalog-source` では `SearchCatalogItem.path` を canonical 入力とし、`url` を canonical 入力として使ってはいけません
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

- key は**正規化済み非空タグ名**でなければいけません
- value は `0` 以上の有限な安全整数でなければいけません
- `null`、`undefined`、`NaN`、負値、小数値を value に含めてはいけません
- 同一タグへ正規化される複数 key を同時に含めてはいけません
- key 不在は件数 `0` と同義であり、`0` 件のタグを必ずしも明示列挙する必要はありません
- 空 object は有効な `SearchCountMap` です
- Array、Map、class instance を `SearchCountMap` として扱ってはいけません

Pagefind 由来のタグ / facet 件数について、`count map が型契約を満たさない` とは少なくとも次のいずれかを指します。

1. object でない
2. key が正規化後に空文字となる
3. value が有限な安全整数でない
4. 同一タグへ正規化される key 衝突が解消されていない

#### 8.6.2 ベースレスポンス

```ts
interface SearchResponseBase {
  items: SearchResultItem[];
  total: number;
  rankingProfileId: SearchRankingProfileId;
}
```

規則:

- すべての検索応答は少なくとも `SearchResponseBase` を満たさなければいけません
- `items` と `total` は、最終後段フィルター適用後の結果集合を表さなければいけません
- `rankingProfileId` は、当該レスポンスの順位付けに実際に使用したプロファイル ID を表さなければいけません

#### 8.6.3 `explore` 拡張

```ts
interface SearchExploreCounts {
  tagCounts: SearchCountMap;
  allTagCounts: SearchCountMap;
}

interface ExploreSearchResponse extends SearchResponseBase, SearchExploreCounts {
  mode: 'explore';
}
```

規則:

- `SearchExploreCounts` は `explore` モード専用の拡張契約です
- `navigate` モードのレスポンスに `tagCounts` および `allTagCounts` を含めてはいけません
- `tagCounts` および `allTagCounts` の定義は 14.5 に従わなければいけません
- **次状態プレビュー件数**は検索応答の基本契約に含めてはいけません
- UI が特定タグに対する次状態プレビュー件数を必要とする場合、その計算は**表示対象の少数タグに限定した遅延計算**または**明示的な次状態検索**として行わなければいけません
- 検索コアの基本レスポンスは、全タグに対する次状態プレビュー件数の完全列挙を義務としません

#### 8.6.4 `navigate` レスポンス

```ts
interface NavigateSearchResponse extends SearchResponseBase {
  mode: 'navigate';
}
```

規則:

- `navigate` モードは高速候補提示を目的とするため、facet / count 情報を契約に含めません
- `navigate` モードの結果件数上限はモード設定で制御し、レスポンス形状で代替してはいけません

#### 8.6.5 diagnostics 拡張

```ts
interface SearchDiagnosticsEnvelope {
  diagnostics: SearchDiagnostics;
}

type SearchResponse =
  | (NavigateSearchResponse & SearchDiagnosticsEnvelope)
  | (ExploreSearchResponse & SearchDiagnosticsEnvelope);
```

規則:

- `diagnostics` は検索品質と縮退状態を表す共通拡張です
- count 系情報と diagnostics は別責務であり、相互を暗黙依存させてはいけません
- UI は `mode` を見て必要な拡張だけを参照しなければいけません

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
- `issues` の 1 要素は 1 つの**集約済み異常事象**に対応しなければいけません
- `candidateRef` は開発向けの**不透明な安定識別子**とし、raw URL、origin、本文断片を含めてはいけません
- `count` は同一 issue key に集約された発生回数を表し、`1` 以上の整数でなければいけません
- `issues` の最大保持件数は **100 件**としなければいけません
- `issues` は `(code, stage, source, candidateRef)` が同一の事象を**重複記録してはいけません**
- 同一キーの事象が複数回発生した場合、`issues` には 1 件のみ保持し、その `count` を加算しなければいけません
- `issues` の並び順は決定的でなければいけません。並び順は **severity 降順（`error → warn → info`）→ stage 定義順 → code 昇順 → source 昇順（`undefined` は末尾）→ candidateRef 昇順（`undefined` は末尾）** とします
- `severity` の順序は `error → warn → info` で固定しなければいけません
- `issues` が最大保持件数に達した後は、追加事象を無制限に蓄積してはいけません。保持優先順位は上記並び順の高いものを優先し、下位事象を抑止しなければいけません
- 一般ユーザー向け UI は `issues` を逐一表示してはいけません
- `activeSources` と `degraded` は保存値ではなく、8.9.4 および 8.9.5 に従って各レスポンスごとに再導出しなければいけません

#### 8.9.1 severity 割当基準

`SearchDiagnosticSeverity` は次の基準で割り当てなければいけません。

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

- `invalid-catalog-item` は、**catalog 項目単位**の契約違反にのみ使わなければいけません
- `invalid-catalog-item` は、required field 欠落、required field の型不正、または catalog 項目全体を採用不能にする正規化契約違反であって、**より具体的な issue code が存在しない場合に限って**使わなければいけません
- `invalid-result-url`、`unsupported-url-scheme`、`cross-origin-url`、`url-with-credentials`、`invalid-document-canonical-url`、`catalog-path-url-mismatch` に該当する事象に対して、`invalid-catalog-item` を代用してはいけません
- `invalid-catalog-item` は候補単位の `warn` であり、source 全体の縮退を直接表してはいけません
- `source-degraded` は **source 単位**の `warn` であり、source は active だが完全品質契約を満たしていない状態のみを表さなければいけません
- 同一 code に対して実装ごとに severity を変更してはいけません

#### 8.9.2 stage 割当基準

`SearchDiagnosticStage` は、異常が**最初に確定した処理段階**へ割り当てなければいけません。

代表例:

- 取得不能、レスポンス読込失敗: `fetch`
- 形式不正、パース不能、正規化不能: `normalize`
- URL 検証失敗、同一文書性不一致、契約違反: `validate`
- 重複統合や候補統合時に発見された不整合: `merge`
- 特徴量算出・ランキング式の適用不能: `rank`
- タグ条件や後段フィルターでの不整合: `filter`
- 実遷移時の拒否やナビゲーション不能: `navigate`

同一事象が複数段階にまたがる場合でも、後段で再分類してはならず、**最初に確定した段階**を維持しなければいけません

#### 8.9.3 `source-degraded` 発火条件

`source-degraded` は、**8.9.4 により `activeSources` へ含まれる source に限って**発火してよいものとします。

`source-degraded` は、1 レスポンスあたり source ごとに高々 1 件だけ記録しなければいけません。

発火条件は以下のいずれかです。

1. **catalog 項目破棄率条件**
   - `catalog-source` が取得した総項目数を `catalogFetchedCount` とします
   - `catalogFetchedCount` は、fetch 成功・JSON パース成功・トップレベル配列確認成功の後に得られた配列要素数そのものとしなければいけません
   - `catalogDroppedCount` は、次の理由で候補化前に項目全体を破棄した件数のみを数えなければいけません
     1. required field `title` / `url` / `path` の欠落
     2. required field `title` / `url` / `path` が正規化後に空文字となる
     3. `path` がルート相対 path 契約を満たさない、または `normalizeDocumentCanonicalUrl(path) = null`
     4. `url` が 22.2 の許可 URL 契約を満たさない
     5. `normalizeDocumentCanonicalUrl(url) = null`
     6. `normalizeDocumentCanonicalUrl(path) !== normalizeDocumentCanonicalUrl(url)`
   - 次の事象は `catalogDroppedCount` に含めてはいけません
     1. `date` のパース失敗により `epochMs = null` へフォールバックしたが、項目自体は採用できる場合
     2. `description`、`keywords`、`tags` の一部正規化や空要素除去により項目は採用可能な場合
     3. keyword / tag の重複除去
     4. 候補統合段階での重複吸収
   - `catalogFetchedCount >= 20` かつ `catalogDroppedCount >= max(5, ceil(catalogFetchedCount * 0.05))` の場合、`source='catalog'` の `source-degraded` を発火しなければいけません

2. **Pagefind フィルター件数欠落条件**
   - `pagefind-source` は、`explore` モードにおいて候補取得成功後、`SearchResponse` を確定する前にタグ / facet 件数取得を試行しなければいけません
   - 件数取得失敗の確定点は、候補取得が成功し、かつ件数取得試行が次のいずれかで終了した時点とします
     1. 例外送出または promise rejection
     2. `countMap` が `null` / `undefined`
     3. `countMap` が 8.6.1 の型契約を満たさない
   - 候補 0 件で `countMap = {}` の場合は、件数取得失敗とみなしてはいけません
   - 上記の確定点に達し、かつ結果候補が 1 件以上ある場合、`source='pagefind'` の `source-degraded` を発火しなければいけません

追加規則:

- `source-degraded` は source 全体停止ではないため、`failures` のみで代用してはいけません
- `catalogFetchedCount < 20` の場合、catalog の軽微な個別項目破棄だけで `source-degraded` を発火してはいけません
- `invalid-catalog-item` の複数発生は、そのまま `source-degraded` の代用ではありません
- `status='failed'` の source に対して `source-degraded` を記録してはいけません

#### 8.9.4 `activeSources` の導出規則

`activeSources` は、各 configured source の実行結果から機械的に導出しなければいけません。

導出規則:

- source が `SearchSourceBatch` を返し、かつ `status='active'` の場合、その source は active とみなします
- source が `SearchSourceBatch` を返し、かつ `status='failed'` の場合、その source は active とみなしてはいけません
- 候補件数 `0` は inactive 条件ではありません
- `pagefind-source` は、候補取得成功後に件数取得だけが失敗した場合でも、`status='active'` のままとしなければいけません
- `catalog-source` は、トップレベル配列の取得と列挙に成功している限り、候補化後に全件破棄となっても `status='active'` のままとしなければいけません
- source が active であるかどうかは `issues` の有無ではなく、`SearchSourceBatch.status` によってのみ判定しなければいけません
- `activeSources` は重複を含んではいけません
- `activeSources` の並び順は `SearchSourceKind` の定義順としなければいけません

例:

- Pagefind 候補取得成功、件数取得失敗、catalog 正常: `activeSources = ['pagefind', 'catalog']`
- Pagefind ロード失敗、catalog 正常: `activeSources = ['catalog']`
- catalog fetch 失敗、Pagefind 正常: `activeSources = ['pagefind']`
- 全 source 失敗: `activeSources = []`

#### 8.9.5 `degraded` の導出規則

`SearchDiagnostics.degraded` は、レスポンスが**完全品質ではない**ことを表す派生真偽値とします。

導出規則:

- 次のいずれかを満たす場合、`degraded = true` としなければいけません
  1. `failures.length > 0`
  2. `issues` に、`code='source-degraded'` かつ `source` が `activeSources` に含まれる要素が 1 件以上存在する
- 上記のいずれも満たさない場合、`degraded = false` としなければいけません
- `invalid-catalog-item`、`invalid-result-url`、`catalog-path-url-mismatch` などの候補単位 issue は、それ単独では `degraded = true` の十分条件ではありません
- `all-sources-failed` を含む場合、`degraded = true` としなければいけません
- `degraded` の値を UI 実装側で再解釈してはいけません

---

## 9. URL 契約と正規化仕様

### 9.1 概念分離

URL は次の 2 種類に厳密に分離します。

- `DocumentCanonicalUrl`: 検索結果項目である文書を識別する URL
- `SearchStateUrl`: 検索結果ページの状態を表現する URL

両者は役割が異なるため、同一型名・同一契約として扱ってはいけません。

#### 用語注記

本仕様で `SearchCandidate.canonicalUrl` および `SearchResultItem.canonicalUrl` に格納される値は、常に **`DocumentCanonicalUrl`** を意味します。  
これは `patterns.md` における最新版導線としての **Canonical URL** とは別概念です。

また、router 文脈で用いる `navigation URL` / `fetch target URL` とも別概念です。  
本仕様では曖昧さを避けるため、型・規則・説明では `canonicalUrl` という略称だけで呼ばず、原則として **`DocumentCanonicalUrl`** と表記します。

### 9.2 適用範囲

- `SearchCandidate.canonicalUrl` と `SearchResultItem.canonicalUrl` は **DocumentCanonicalUrl のみ**を許可します
- `/search/` または `/search/?...` は **SearchStateUrl** であり、検索結果ページの汎用状態を表します
- `/tags/<tag>/` は **タグページ URL** であり、`SearchStateUrl` とは別の URL 種別として扱わなければいけません
- `/search/`、`/search/?...`、`/tags/<tag>/` は、いずれも検索結果項目の `canonicalUrl` に使ってはいけません
- 検索結果集合の重複統合は `DocumentCanonicalUrl` のみで行わなければいけません

### 9.3 DocumentCanonicalUrl の目的

`DocumentCanonicalUrl` は、検索候補の重複統合と同一文書判定の唯一の基準です。したがって、正規化規則は実装差を許してはいけません。

### 9.4 DocumentCanonicalUrl の正規化入力

正規化関数 `normalizeDocumentCanonicalUrl(url)` は、絶対 URL またはルート相対 URL を受け付けます。

### 9.5 DocumentCanonicalUrl の正規化出力

`normalizeDocumentCanonicalUrl(url)` の戻り値型は `DocumentCanonicalUrl | null` としなければいけません。

- 正常時は、**origin を含まない絶対パス形式の **`` を返します
- 文書 URL として不正な入力を受けた場合は `null` を返します
- 不正入力を例外で表現してはいけません

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
9. `/search/`、`/search/?...`、`/tags/<tag>/` を受け取った場合は、**DocumentCanonicalUrl としては不正**として `null` を返さなければいけません

### 9.7 pathLabel の生成入力

`derivePathLabel(documentCanonicalUrl)` は、`DocumentCanonicalUrl` のみを受け付けなければいけません。`SearchStateUrl` や未正規化 URL を直接受け取ってはいけません。

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

- `pathLabel` は表示専用であり、重複判定に使ってはいけません
- `pathLabel` は `title` の代替表示ではなく、補助情報として扱わなければいけません
- `pathLabel` はランキング特徴量の算出根拠に使ってはいけません
- `pathLabel` は安定化ソートの比較キーに使ってはいけません
- 安定化ソートが必要な場合は `DocumentCanonicalUrl` またはそれと同値な内部識別キーを使わなければいけません
- 同一 `DocumentCanonicalUrl` に対して、常に同じ `pathLabel` が導出されなければいけません

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

`buildSearchStateUrl(state)` は、汎用検索結果ページの canonical な状態 URL として、常に `/search/` または `/search/?...` 形式を返さなければいけません。

規則:
1. path は常に `/search/` とする
2. `q`、`tag`、`tagMode`、`sort` を 15 章の契約に従って query へ符号化する
3. `tags` は正規化後、**タグ名の昇順**で安定ソートしなければいけません
4. `tagMode='or'` の場合、タグの選択順は意味論に含めてはいけません
5. `tagMode='and'` の場合も、タグの選択順は意味論に含めてはいけません
6. `tag` は 3 の順序で複数回出力してよいものとします
7. `q`、`tag`、`tagMode`、`sort` がすべて既定値の場合、返却値は `/search/` とします
8. 既定値でない state のみを query へ出力してよいものとします
9. 返却値の型は `SearchStateUrl` とします
10. この関数は `/tags/<tag>/` を生成してはいけません

### 9.13 SearchStateUrl の正規化規則

`normalizeSearchStateUrl(url)` は、`/search/` または `/search/?...` を対象とする正規化関数です。`/tags/<tag>/` は本関数の対象外とします。

1. `/search/` または `/search/?...` を受け取った場合、15 章の正規化規則を適用後に再構築する
2. hash は除去する
3. origin は除去する
4. path は常に `/search/` へ正規化する
5. `/tags/<tag>/` を受け取った場合、この関数で `/search/?...` へ正規化してはいけません

### 9.14 タグページの位置づけ

`/tags/<tag>/` は、タグ自体を主語とする**独立した情報ページ**です。

規則:

- `/tags/<tag>/` は、単一タグ既定ビューの canonical URL とします
- 単一タグ既定ビューとは、`q=''`、`tags=[tag]`、`tagMode='or'`、`sort='relevance'` の状態を指します
- タグページは内部実装として `explore` モードの検索実行を利用してよいものとします
- ただし、`/tags/<tag>/` を `/search/?tag=` の canonical とみなしてはいけません
- 逆に、`/search/?tag=` を常に `/tags/<tag>/` へ正規化してもなりません
- 状態が単一タグ既定ビューを外れた場合、UI は対応する `/search/?...` へ遷移しなければなりません

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

### 10.2 トークン化ポリシー

クエリトークン化は、固定実装ではなくポリシー選択として扱います。

```ts
type SearchTokenizerPolicyId = 'ja-word-v1' | 'generic-whitespace-v1';
```

規則:

- 実装は、入力文字列と実行環境に基づいて `SearchTokenizerPolicyId` を 1 つ選択しなければいけません
- ポリシー選択は検索クエリごとに決定的でなければいけません
- query のトークン化と field のトークン化は、同一関数の共有を要求しません
- ただし、13.3 の共通正規化規則には整合しなければいけません
- 新しいトークン化ポリシーを追加する場合、既存ポリシー ID の意味を変更してはいけません

### 10.3 既定ポリシーとフォールバック

既定ポリシーは次のとおりとします。

- `ja-word-v1`: `Intl.Segmenter` が利用可能であり、日本語主体入力または日本語混在入力として扱う場合に用いる
- `generic-whitespace-v1`: 上記以外、または `Intl.Segmenter` を利用できない場合に用いる

`ja-word-v1` の規則:

- `Intl.Segmenter(localeHint, { granularity: 'word' })` を用いて語単位分割してよい
- `localeHint` は少なくとも `'ja'` を許可しなければいけません
- `isWordLike === false` のセグメントは除外しなければいけません
- 空トークンは除外しなければいけません

`generic-whitespace-v1` の規則:

- 正規化済み文字列を空白分割してトークン化しなければいけません
- 空トークンは除外しなければいけません

共通規則:

- 正規化後トークンで重複除去する
- トークン列の順序は初出順を維持する
- 英数字主体入力、slug、path 由来語、記号混在語を不必要に破壊してはいけません

### 10.4 生成物

```ts
type SearchTokenizerPolicyId = 'ja-word-v1' | 'generic-whitespace-v1';

interface PreparedSearchQuery {
  inputQuery: string;
  normalizedQuery: string;
  segmentedQuery: string;
  tokens: string[];
  tokenizerPolicyId: SearchTokenizerPolicyId;
}
```

規則:

- `inputQuery` はユーザーが入力した文字列そのものを保持し、正規化してはいけません
- `normalizedQuery` は 10.1 の正規化規則を適用した canonical な検索語とします
- `segmentedQuery` は `tokens` を単一半角空白で連結した検索ソース入力用文字列とします
- `tokenizerPolicyId` は実際に使用したトークン化ポリシーを表し、観測および回帰テストに利用できなければいけません
- URL 状態 `q` には `normalizedQuery` を使わなければいけません
- 内部ランキング計算は `tokens` を基準とし、`inputQuery` を直接参照してはいけません
- `inputQuery` は UI 入力中の一時状態であり、`SearchStateUrl`、`SearchState`、検索結果項目、検索ソース入力の永続契約に含めてはいけません
- ページ再読込、直接アクセス、`popstate`、共有 URL 復元時には、入力欄表示値を `normalizedQuery` から復元しなければいけません
- `inputQuery` をセッションをまたいで復元してはいけません

### 10.5 派生語とフィールド別トークン化

検索コアは必要に応じて以下を派生してもよいものとします。

- path 分割語
- slug 分割語
- title token
- description token
- keyword token

追加規則:

- query 用トークン化と field 用トークン化は責務を分離してよいものとします
- `title`、`body`、`path`、`keyword` の各フィールドは、同一ポリシーで一律処理することを要求しません
- ただし、13.3 の共通正規化規則に照らして比較可能な形へ正規化されていなければいけません
- 派生語の生成責務は `query-pipeline`、`sources/*`、または専用 tokenization モジュールに閉じ込め、UI 層へ漏らしてはいけません
- トークン化品質改善のために field 別ポリシーや追加ポリシーを導入する場合、既存の `SearchTokenizerPolicyId` の意味を破壊的に変更してはいけません

---

## 11. 検索ソース仕様

### 11.1 検索ソース共通出力契約

検索コアは、個別ソース API へ直接依存してはいけません。  
`pagefind-source`、`catalog-source` を含むすべての検索ソースは、少なくとも次の共通出力契約へ正規化して `search-core` へ渡さなければいけません。

```ts
interface SearchSourceCapabilities {
  providesBodyEvidence: boolean;
  providesCountMap: boolean;
  supportsTagPrefilter: boolean;
  supportsNativeAndSemantics: boolean;
  supportsNativeDateDescSort: boolean;
}

interface SearchSourceBatch {
  source: SearchSourceKind;
  status: 'active' | 'failed';
  failure?: SearchFailureKind;
  capabilities: SearchSourceCapabilities;
  candidates: SearchCandidate[];
  countMap?: SearchCountMap | null;
}
```

規則:

`search-core` は、検索ソースの意味論を `SearchSourceBatch` と `SearchSourceCapabilities` のみから判断しなければいけません
`status='active'` は、当該 source が解釈可能な出力を `search-core` へ返せたことを意味します。候補件数 `0` は `active` を妨げません
`status='failed'` は、当該 source が解釈可能な出力を返せなかったことを意味します。このとき `failure` を必須とし、`candidates` は空配列でなければいけません
`capabilities` は source の能力宣言であり、`search-core` は `false` の能力を仮定で補ってはいけません
`countMap` は `capabilities.providesCountMap = true` の source にのみ意味を持ちます
`countMap` が `undefined` または `null` であることは、source 全体失敗と同義ではありません。source 全体失敗かどうかは `status` でのみ判定しなければいけません
source ごとの前段絞り込み可否、`and` ネイティブ対応可否、`date-desc` ネイティブ対応可否は `capabilities` によってのみ表現しなければいけません

### 11.2 Pagefind ソース

役割:

- 本文、タイトル、説明文、日付、タグの主検索源
- 本文一致根拠の主要供給源
- `explore` モードにおける件数取得源

能力宣言:

```ts
const pagefindCapabilities: SearchSourceCapabilities = {
  providesBodyEvidence: true,
  providesCountMap: true,
  supportsTagPrefilter: true,
  supportsNativeAndSemantics: false,
  supportsNativeDateDescSort: false,
};
```

入力:

- `segmentedQuery`
- Pagefind が表現可能な範囲の前段フィルター

出力:

- `SearchSourceBatch`

規則:

- `pagefind-source` は、Pagefind 固有レスポンスを直接 `search-core` へ渡してはいけません
- `pagefind-source` は、候補集合・本文一致根拠・タグ / facet 件数・source 状態を `SearchSourceBatch` へ正規化してから返さなければいけません
- 本文一致根拠は `SearchCandidate.featureScores.bodyScore` または `SearchReason` を算出可能な情報へ変換しなければいけません
- `explore` モードでは、候補取得成功後にタグ / facet 件数取得を試行し、その結果を `countMap` として返さなければいけません
- 件数取得に失敗したが候補集合は返せる場合、`status='active'` のままとし、8.9.3 の規則に従って `source-degraded` 判定対象にしなければいけません
- 候補 `0` 件で `countMap = {}` の場合、それを件数取得失敗と同一視してはいけません
- `pagefind-source` は最終 `and` 意味論を保証してはいけません
- `pagefind-source` は最終 `date-desc` ソートを保証してはいけません

### 11.3 補助検索カタログ

役割:

- path、slug、補助キーワード、Pagefind 非搭載情報の補完
- 主検索源障害時の縮退運転経路

能力宣言:

```ts
const catalogCapabilities: SearchSourceCapabilities = {
  providesBodyEvidence: false,
  providesCountMap: false,
  supportsTagPrefilter: false,
  supportsNativeAndSemantics: false,
  supportsNativeDateDescSort: false,
};
```

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
- `url`: UI が実際に遷移に使う**遷移先 URL**。文書識別子として使ってはいけません

出力:

- `SearchSourceBatch`

規則:

- `catalog-source` は、catalog 項目群を直接 `search-core` へ渡してはいけません
- `catalog-source` は、各項目を `SearchCandidate` へ正規化し、source 状態とともに `SearchSourceBatch` へ包んで返さなければいけません
- `title`、`url`、`path` は必須です
- `path` は `/` から始まるルート相対 path でなければいけません
- `path` は `normalizeDocumentCanonicalUrl(path)` により `DocumentCanonicalUrl` へ変換可能でなければいけません
- `url` は遷移前検証の対象であり、`DocumentCanonicalUrl` 導出元として使ってはいけません
- `url` は同一 origin の内部文書 URL、またはそれと等価なルート相対 URL でなければいけません
- `url` は `http:` または `https:` の絶対 URL、もしくは `/` から始まるルート相対 URL のみを許可します
- `javascript:`, `data:`, `file:`, `blob:`, `mailto:`, `tel:` などの許可されないスキームを持つ `url` は不正とみなし破棄しなければいけません
- userinfo を含む `url` は不正とみなし破棄しなければいけません
- `normalizeDocumentCanonicalUrl(url)` が `null` を返す場合、その項目は不正とみなし破棄しなければいけません
- `normalizeDocumentCanonicalUrl(url)` が成功した場合、その値は `normalizeDocumentCanonicalUrl(path)` と必ず一致しなければいけません
- `url` と `path` の正規化結果が一致しない場合、その項目は破棄し、`catalog-path-url-mismatch` を記録しなければいけません
- `date` を持つ場合、その形式は `YYYY-MM-DD` または UTC の ISO 8601 としなければいけません
- `date` のパース失敗は項目全体失敗ではなく、`epochMs = null` へのフォールバックとして扱わなければいけません
- `keywords`、`tags` は空要素除去と重複除去を行わなければいけません
- `catalog-source` は `countMap` を返してはいけません。`countMap` が必要な場合の責務は常に `search-core` にあります

### 11.4 ソース優先順位

- 主検索源: Pagefind
- 補完検索源: 補助検索カタログ

補助検索カタログは**補完用**であり、本文一致と同等の重みを与えてはいけません。

### 11.5 ソース信頼度

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

この 3 者を同一視してはいけません。とくに `pathLabel` は表示専用、`canonicalUrl` は識別専用です。

### 12.3 統合規則

同一 `canonicalUrl` の候補は以下で統合します。

- `canonicalUrl`: 統合キーそのものを維持する
- `url`: 次の決定規則で 1 つに確定しなければいけません
  1. 候補 `url` のうち、22.2 の URL 検証を通過し、かつ `normalizeDocumentCanonicalUrl(url) === canonicalUrl` を満たすものだけを**採用候補**とする
  2. 採用候補が 0 件の場合、統合後候補は不正とし破棄しなければいけません
  3. 採用候補が複数ある場合、`matchedSources` の優先順位 `pagefind > catalog` を先に適用する
  4. 同一 source 優先度内では、query / hash を持たない `url` を優先する
  5. さらに同順位なら、絶対 URL よりルート相対 URL を優先する
  6. さらに同順位なら、origin 除去後の文字列の辞書順昇順で最小のものを採用する
- `title`: 正規化済み非空値を採用する
- `description`: 主検索源由来を優先し、同一優先度なら可視文字数が長いものを採用する
- `date`: `epochMs` が大きいものを優先する
- `tags`: 和集合を採用する
- `matchedSources`: 和集合を採用する
- `matchedFields`: 和集合を採用する
- `matchedTokens`: 和集合を採用する
- `featureScores.sourceReliabilityScore`: 最大値を採用する
- `featureScores.matchEvidenceScore`: 最大値を採用する
- `featureScores` のうち上記 2 項目以外は、統合後候補に対して `search-core` が再計算しなければいけません
- `snippet`: 主検索源由来を優先し、同一優先度なら一致区間数が多いものを採用する

### 12.4 不正候補

以下の候補は破棄します。

- `canonicalUrl` が空
- `url` が空
- `title` が空
- `normalizeDocumentCanonicalUrl(...)` が `null` を返す
- `catalog-source` において `normalizeDocumentCanonicalUrl(path) !== normalizeDocumentCanonicalUrl(url)` となる
- 同一 `canonicalUrl` の統合後に、12.3 の `url` 決定規則を満たす採用候補が 1 件も残らない

規則:

- `normalizeDocumentCanonicalUrl(...)` が `null` を返した場合、候補は破棄し、対応する issue を記録しなければいけません
- `catalog-source` で `path` と `url` の正規化結果が一致しない場合、候補は破棄し、`catalog-path-url-mismatch` を記録しなければいけません
- 統合後に採用可能な `url` が存在しない場合、統合後候補は破棄し、`invalid-result-url` を記録しなければいけません

---

## 13. 特徴量とランキング

### 13.1 特徴量

少なくとも以下の特徴量を算出しなければいけません。

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

すべての特徴量は `0.0..1.0` へ正規化しなければいけません。

### 13.3 共通正規化

フィールド一致系特徴量の算出に使うトークン集合は、10 章のクエリ正規化規則と同一の正規化規則を適用しなければいけません。

- `queryTokens`: `PreparedSearchQuery.tokens`
- `titleTokens`: タイトル全文から抽出した正規化済みトークン集合
- `bodyTokens`: 本文全文、または本文全文と等価な索引情報から抽出した正規化済みトークン集合
- `pathTokens`: path segment、slug segment、ファイル名 segment から抽出した正規化済みトークン集合
- `keywordTokens`: `keywords` から抽出した正規化済みトークン集合

検索ソースは、`titleTokenCoverageScore`、`bodyScore`、`pathScore`、`keywordScore` を仕様どおり算出するために必要な正規化済みトークン集合、またはそれと等価な一致情報を `search-core` に渡さなければいけません。

表示用 `snippet` はランキング計算用の `bodyTokens` 生成源として使ってはいけません。`snippet` は表示のための派生表現であり、順位計算へ逆流させてはいけません。

### 13.4 フィールドトークン一致関数

各 query token `q` に対して、あるフィールドトークン集合 `F` の一致値 `fieldTokenMatch(q, F)` を次のように定義します。

- `1.0`: `F` に `q` と完全一致するトークンが存在する
- `0.75`: 完全一致はないが、`F` に `q` で始まるトークンが存在する
- `0.4`: `q` の文字数が 2 以上であり、完全一致・前方一致はないが、`F` に `q` を部分文字列として含むトークンが存在する
- `0.0`: 上記のいずれでもない

文字数 1 の query token に対して、部分一致を用いてはいけません

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

検索コアは、**バージョン付きランキングプロファイル**を用いて総合スコアを算出しなければいけません。

本仕様で定義する規範プロファイル ID は次のとおりです。

- `rouault-search-v1`

重みベクトルを変更する場合は、既存プロファイルを上書きしてはならず、新しいプロファイル ID を導入しなければいけません。

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
  sourceReliabilityScore * W8;
```

`matchEvidenceScore` はこの式に加算してはいけません。

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
5. `canonicalUrl` 昇順

追加規則:

- 安定化ソートは表示専用値ではなく、内部的に安定な比較キーに対して適用しなければいけません
- `pathLabel` を安定化ソートに使ってはいけません

### 13.10 並び順モード

検索結果ページでは以下を提供します。

- `relevance`
- `date-desc`

`date-desc` は以下で並び替えます。

1. `date.epochMs` 降順（`null` は最下位）
2. `matchEvidenceScore` 降順
3. `title` 昇順
4. `canonicalUrl` 昇順

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

件数は以下で定義します。

- `allTagCounts[tag]`: `Q` においてタグ `tag` を持つ文書数
- `tagCounts[tag]`: `S(currentTags, currentMode)` においてタグ `tag` を持つ文書数

追加規則:

- `currentTags` が空集合のとき、`S(currentTags, currentMode) = Q` とします
- `allTagCounts` と `tagCounts` は、ともに 8.6.1 の `SearchCountMap` 型契約を満たさなければいけません
- key 不在は件数 `0` と同義とします
- 検索応答は、**タグ切替後の結果件数**を全タグについて事前計算して返すことを義務としません
- UI が次状態の結果件数を提示したい場合、その値は基本契約ではなく**補助的な表示情報**として扱わなければいけません

### 14.6 フィルターパネル表示規則

- 選択中タグは常に表示しなければいけません
- 未選択タグの基本表示集合は、少なくとも `tagCounts` に現れるタグ集合とします
- UI は必要に応じて `allTagCounts` に現れるタグを追加表示してよいものとします
- 未選択タグの既定並び順は `tagCounts[tag]` 降順、同件数時タグ名昇順とします
- 未選択かつ `tagCounts[tag] = 0` のタグは、非表示または無効表示としてよいものとします
- 選択済みタグは件数 `0` でも表示を維持しなければいけません
- フィルターパネルに表示する件数は、特記がない限り **現在結果集合における件数**、すなわち `tagCounts[tag]` を用いなければいけません
- UI が次状態プレビュー件数を補助表示する場合、それは `SearchResponse` の基本契約値ではないことを前提に、表示対象を限定した遅延計算または別クエリで求めなければいけません

---

## 15. URL 仕様

### 15.1 URL 状態

検索結果ページの状態は `SearchState` と `SearchStateUrl` で表現します。

- `q`: 検索語
- `tag`: 0 個以上のタグ
- `tagMode`: `or | and`
- `sort`: `relevance | date-desc`

### 15.1.1 所有権

検索結果ページの URL 状態は **feature-local URL state** とします。  
これは文書遷移そのものではなく、検索結果ページという単一文書内で復元・共有される UI 状態です。

したがって、検索結果ページの URL 状態は router core の一般責務へ取り込まず、search-page とその補助モジュールが単一に所有しなければいけません。

### 15.2 正規化規則

- `q` は `PreparedSearchQuery.normalizedQuery` と等価であり、10 章の正規化規則に従う
- `tag` は trim + 重複除去し、正規化後に**タグ名昇順**へ安定ソートする
- `tagMode` は未定義時 `or`
- `sort` は未定義時 `relevance`
- URL 状態において、タグの選択順は意味論に含めません

### 15.3 URL 生成

既定値は省略してよいものとします。

例:

- `/search/`
- `/search/?q=math`
- `/search/?tag=physics`
- `/search/?q=logic&tag=math&tag=philosophy`
- `/search/?q=logic&tag=math&tag=philosophy&tagMode=and`
- `/search/?q=logic&sort=date-desc`

### 15.4 タグページ

`/tags/<tag>/` は、単一タグ既定ビューの canonical URL です。

規則:

- この URL が表す状態は、`q=''`、`tags=[tag]`、`tagMode='or'`、`sort='relevance'` とします
- `/tags/<tag>/` はタグ自体を主語とする独立ページであり、単なる `/search/?tag=<tag>` の別入口としてのみ扱ってはいけません
- `q` が非空になった場合、またはタグが複数になった場合、または `tagMode != 'or'` となった場合、または `sort != 'relevance'` となった場合、UI は対応する `/search/?...` へ遷移しなければいけません
- `/tags/<tag>/` は検索結果項目の `canonicalUrl` と混同してはいけません

### 15.5 履歴操作

- 入力更新: `replaceState`
- タグ変更: `pushState`
- `tagMode` 変更: `pushState`
- 並び順変更: `pushState`
- `popstate`: URL から再読込して再検索

追加規則:

- 検索結果ページの URL 状態は、表示中の search-page が **単一の所有者** でなければいけません
- `q`、`tag`、`tagMode`、`sort` の解釈、URL 反映、`popstate` 再同期は search-page の責務とします
- router その他の横断機構は、検索結果ページが所有する URL 状態を独自に再解釈して履歴操作してはいけません
- History API の生操作、URL 解析、URL 再構築は search-page へ分散させず、検索結果ページ用の薄い URL state helper へ集約するのが望ましいです

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
- ただし検索実行、URL 同期、再描画後の正規状態は `normalizedQuery` を基準としなければいけません
- IME 変換中など一時的に `inputQuery !== normalizedQuery` であってもよいが、その差異は URL 状態へ保存してはいけません

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

検索要求ごとに request token を採番し、遅延応答した旧リクエスト結果を破棄しなければいけません。

---

## 17. 検索ダイアログ仕様

### 17.1 目的

- 現在文脈を大きく崩さずに目的ノートへ移動できること
- 少量入力で上位候補を高速提示できること

### 17.2 起動

検索ダイアログの起動要求は、上位統合層が受け取る外部起動要求またはグローバルショートカットから開始します。

- 外部起動要求: `open-search-dialog`
- グローバルショートカット: `Cmd+K` / `Ctrl+K`

`open-search-dialog` は、`ui-search-trigger` または同等の launcher から上位統合層へ通知される request event です。
一方、`ui-search-dialog-open-requested` は、`ui-search-dialog` 自身が開状態更新を外部へ要求する component-local request event です。
両者は同義ではなく、責務境界が異なります。

上位統合層は、必要に応じて起動元要素を保持し、`opened` の更新、重複表示抑止、close 後の focus return に利用しなければいけません。

### 17.3 起動抑止

フォーカス対象が以下のいずれかである場合、ショートカット起動してはいけません。

- `input`
- `textarea`
- `contenteditable`
- 検索ダイアログ自身の入力欄

### 17.4 出力件数

ダイアログの最大表示件数は固定しなければいけません。

既定値:

- 20 件

### 17.5 結果表示項目

- `title`
- `pathLabel`
- 必要に応じて一致理由の簡易ラベル

### 17.6 選択時動作

- Enter またはクリックで active 候補を選択しなければいけません
- 選択時、検索ダイアログは選択通知を外部へ送出しなければいけません
- 検索ダイアログ自身は遷移を内蔵してはいけません
- 上位統合層は、選択通知を受けた後、必要に応じて `navigation-adapter` を通じて遷移しなければいけません
- 選択 detail には少なくとも `url` を含め、shared `search-core` を用いる実装では `canonicalUrl` を含めてよいものとします

### 17.7 結果ランキング

ダイアログは `navigate` モードの結果を用いるため、探索整合性よりも上位候補精度を優先します。

入力欄復元契約:

- ダイアログが開いている間は `inputQuery` を表示値として保持してよい
- ダイアログを閉じた時点で `inputQuery` は破棄してよく、次回起動時に自動復元してはいけません
- 共有 URL や履歴からダイアログ入力値を復元してはいけません

---

## 18. ナビゲーション仕様

### 18.1 ルーター取得

`navigation-adapter` は、アプリケーションのルート要素または明示的注入により `app-router` を取得しなければいけません。`window` グローバル依存を前提にしてはいけません。

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

少なくとも以下を識別しなければいけません。

- `pagefind-load-failed`
- `pagefind-search-failed`
- `pagefind-filter-read-failed`
- `catalog-fetch-failed`
- `catalog-normalize-failed`
- `all-sources-failed`

追加規則:

- 上記は**ソース単位の failure** であり、`SearchDiagnostics.failures` に記録します
- 候補単位または検証単位の異常は `SearchDiagnostics.issues` に記録し、`failures` へ混在させてはいけません

### 19.2 縮退運転

- Pagefind ロード失敗時: 補助検索カタログのみで継続する
- Pagefind 検索失敗時: 補助検索カタログのみで継続する
- カタログ失敗時: Pagefind のみで継続する
- 全ソース失敗時: エラー状態とする

追加規則:

- source が継続動作しているが完全品質契約を満たしていない場合は、8.9.3 の条件に従って `source-degraded` を `diagnostics.issues` に記録しなければいけません
- source 全体停止を表す failure と、継続可能だが品質低下した `source-degraded` を混同してはいけません

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
- `issues` は少なくとも `code`、`severity`、`stage`、`count` を持たなければいけません
- `issues` は `info`、`warn`、`error` を区別しなければいけません
- `issues` の severity は 8.9.1 の割当基準および code 別既定値に従わなければいけません
- `issues` の重複判定キーは `(code, stage, source, candidateRef)` としなければいけません
- `issues` の保持件数上限到達時の抑止規則は決定的でなければいけません
- `issues` の提示順およびテスト観測順は 8.9 の並び順規則に従わなければいけません

---

## 20. アクセシビリティ要件

### 20.1 検索ダイアログ

- ダイアログは combobox パターンに従わなければいけません
- 候補一覧は listbox / option 相当の関係を持たなければいけません
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

`/search-catalog.json` は、少なくとも以下のいずれかでバージョン識別できなければいけません。

- ハッシュ付き URL
- `version` フィールド
- ビルド ID 付き URL

セッションキャッシュはこのバージョン単位で無効化しなければいけません。

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

検索ソースが返す HTML を UI へ直接渡してはいけません。

### 22.2 URL 検証

結果 `url` は遷移前に検証しなければいけません。

- `DocumentCanonicalUrl` への正規化と、遷移先 `url` の検証を混同してはいけません
- `url` の検証は、少なくとも空文字・不正 URL・許可されないスキームを排除することを目的とします
- 許可される `url` の形式は、`/` から始まるルート相対 URL、または同一 origin の `http:` / `https:` 絶対 URL に限ります
- `javascript:`, `data:`, `file:`, `blob:`, `mailto:`, `tel:` などのスキームは許可してはいけません
- userinfo を含む URL は許可してはいけません
- `catalog-source` においては、`path` を識別の正、`url` を遷移の正として扱わなければいけません
- `catalog-source` における `url` は、同一 origin 内で `path` と同一文書を指すことを検証しなければいけません
- 許可されない `url` は候補として採用してはならず、`diagnostics.issues` へ記録しなければいけません

### 22.3 診断情報

開発向け診断情報に機密情報や過剰な内部構造を含めてはいけません。

追加規則:

- `diagnostics.issues` に raw URL、origin、本文断片、未加工スニペットを含めてはいけません
- `diagnostics.issues` の `candidateRef` は不透明 ID またはハッシュ化識別子でなければいけません
- `candidateRef` は、`DocumentCanonicalUrl` が存在する場合はその値から、存在しない場合はソース内の安定入力値から生成しなければいけません
- `candidateRef` の生成には、少なくとも `(source, stableInput)` を連結した値に対する決定的ハッシュを用いなければいけません
- `candidateRef` の生成結果は同一入力に対して同一セッション内および同一ビルド内で安定でなければいけません
- `candidateRef` の生成に乱数や時刻依存値を使ってはいけません
- `diagnostics.issues.count` は raw イベント列を保持する代替ではなく、同一 issue key に集約された発生回数のみを表さなければいけません
- 一般ユーザー向け UI には、`issues` の詳細ではなく縮退の有無のみを表示しなければいけません

---

## 23. 推奨ファイル構成

```text
src/lib/search/
  search-core.ts
  search-types.ts
  search-contracts.ts
  search-url.ts
  navigation.ts
  normalize-search-result-url.ts

  pipeline/
    prepare-query.ts
    collect-source-batches.ts
    validate-candidates.ts
    merge-candidates.ts
    rank-candidates.ts
    build-explore-counts.ts
    build-diagnostics.ts

  tokenization/
    tokenizer-policy.ts
    ja-word-tokenizer.ts
    generic-whitespace-tokenizer.ts
    field-tokenizers.ts

  sources/
    pagefind-source.ts
    catalog-source.ts

  ranking/
    ranking-profiles.ts
    feature-extractors.ts
    scoring.ts
    stable-sort.ts

src/components/search/
  search-page.ts
  search-page-controller.ts

src/components/ui/search-dialog/
  search-dialog.ts
  search-dialog-controller.ts
```

原則:

- `search-core` はパイプラインのオーケストレーションだけを担い、個別段階の詳細実装を内包してはいけません
- pipeline 各段階は、入力型・出力型・失敗境界が独立にテスト可能でなければいけません
- tokenization は source / ranking / UI から直接実装詳細へ依存させず、policy module 越しに参照しなければいけません
- ranking は feature 抽出、score 計算、安定化ソートを分離しなければいけません
- UI から直接 Pagefind を呼ばない
- UI から直接カタログ検索をしない

---

## 24. テスト方針

### 24.1 単体テスト

対象:

- URL 正規化
- クエリ正規化
- tokenizer policy 選択
- tokenizer 各実装
- URL 状態 parse / build
- candidate validation
- candidate merge
- feature extraction
- score calculation
- stable sort
- タグ意味論
- `explore` 件数算出
- diagnostics 集約
- `degraded` 導出

### 24.2 プロパティベーステスト

対象:

- `normalizeDocumentCanonicalUrl(url)` の冪等性
- `buildSearchStateUrl(parseSearchStateUrl(url))` の正規化不変性
- タグ集合の順序が意味論へ影響しないこと
- `issues` 集約が入力順に依存しないこと

### 24.3 ランキング回帰テスト

対象:

- 固定 fixture に対する上位 N 件の順序
- `navigate` と `explore` のモード別差異
- `rankingProfileId` ごとの期待順位
- `tokenizerPolicyId` 差分が既知 fixture で意図どおりに現れること

規則:

- ランキング回帰テストはゴールデン fixture により管理しなければいけません
- 重みや特徴量定義を変更する場合は、fixture 更新理由を明示しなければいけません

### 24.4 結合テスト

対象:

- 検索コア + Pagefind ソース
- 検索コア + catalog ソース
- 両 source 同時統合
- `tagMode=and` / `tagMode=or`
- `relevance` / `date-desc`
- `navigate` / `explore`

### 24.5 UI テスト

対象:

- ダイアログ起動
- キーボード移動
- Enter 遷移
- Escape 閉鎖
- フィルターパネル操作
- 空状態 / エラー表示
- `popstate` 復元
- `navigate` レスポンスで count 系情報を参照しないこと
- `explore` レスポンスで count 系情報を表示できること

### 24.6 E2E テスト

対象:

- `/search/` の URL 復元
- `/tags/<tag>/` 入口
- SPA 遷移優先
- フルページ遷移フォールバック
- 縮退運転時の最小動作保証
- source 片系停止時の継続動作
- diagnostics に応じた縮退表示

### 24.7 性能回帰テスト

対象:

- 大量候補時の応答時間
- 大量タグ時の count 算出時間
- `navigate` モードの上位候補提示時間
- 旧リクエスト破棄時の競合制御

規則:

- 性能テストは中央値だけでなく p95 を記録しなければいけません
- `navigate` と `explore` を同一閾値で評価してはいけません

### 24.8 決定性テスト

対象:

- 同一入力に対する並び順の決定性
- `issues` の並び順と上限抑止の決定性
- `activeSources` と `degraded` の導出決定性

規則:

- 同一 fixture に対して、入力配列順や source 応答順の違いが最終結果へ影響してはいけません

---

## 25. 規範源と非規範記述

### 25.1 規範源の優先順位

本仕様書における規範源の優先順位は以下のとおりとします。

1. 用語の定義は 5 章を正本とする
2. データ型とデータ契約は 8 章を正本とする
3. URL の意味論と正規化契約は 9 章を正本とする
4. クエリ前処理契約は 10 章を正本とする
5. 検索ソース契約は 11 章を正本とする
6. 候補統合契約は 12 章を正本とする
7. ランキング契約は 13 章を正本とする
8. タグ意味論は 14 章を正本とする
9. URL 状態表現は 15 章を正本とする

同一概念に関して他章の説明と正本章が衝突する場合は、正本章を優先しなければいけません。

### 25.2 再掲の規則

- 同一契約を複数章へ重ねて規範記述してはいけません
- 他章で再言及が必要な場合は、原則として節番号参照に留めなければいけません
- 再掲する場合でも、正本章と意味論差分を生じさせてはいけません
- 例、図、説明文は規範本文を上書きしてはいけません

### 25.3 非規範記述

以下は理解補助のための記述であり、単独では規範ではありません。

- 0 章の要約
- 図表
- 例示
- 推奨ファイル構成
- 実装上の設計理由説明

これらが正本章と衝突する場合は、正本章を優先しなければいけません。

### 25.4 改訂規則

- 意味論変更は仕様改訂として扱わなければいけません
- 実装都合による調整を、非規範記述の更新だけで既成事実化してはいけません
- 既存契約を変更する場合は、変更対象となる正本章を直接改訂しなければいけません
