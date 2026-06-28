# Permanent URL Contract

## 1. Status

- Type: Normative
- Source of truth: archive hash generation、archive route projection、permanent URL tests
- Applies to: Permanent URL、`/archives/{hash}`、hash生成、版保証
- Non-goals: 通常のnote page navigation URL、search URL state、UI patternの視覚表現

## 2. Ownership

### This Layer Owns

- Permanent URLが内容固定参照であること。
- `/archives/{hash}`のURL形式。
- Hash長、形式、hash元、衝突時の延長規則。
- 過去版と最新版の関係。

### This Layer Must Not Own

- Note page navigation URL、`slug`、`permalink`、`directory-index`。正本は`docs/contracts/note-navigation.md`。
- `SearchCanonicalPathname`と`SearchStateUrl`の検索上の意味。正本は`docs/contracts/search.md`。
- URL分類の横断意味論。正本は`docs/contracts/url-policy.md`。
- コピー UIの詳細pattern。`docs/design-system/patterns.md`が扱ってよい。

## 3. Public Contract

### Inputs

- Note content。
- Hash対象に含める正規化済みMarkdown。
- Hash対象から除外するmetadata。

### Outputs

- `/archives/{hash}`形式のPermanent URL。
- 同一内容に戻した場合に再利用されるhash。

### Events

- N/A

### DOM / URL / State Contract

- Canonical URLは最新版の通常閲覧先を表す。
- Permanent URLは特定内容の固定参照を表し、URL同期ではない。
- `/archives/{hash}`はPermanent URL Contract所有の固定内容参照URLである。
- `/archives/{hash}`はnote permalink、SearchStateUrl、SearchCanonicalPathname、SearchRenderHref、fetch targetとは別分類である。
- `/archives/{hash}`は`/{slug}`や`/notes/{slug}`へ自動正規化してはならない。
- Routerは`/archives/{hash}`から最新版へ自動redirectしてはならない。
- 過去版での「最新版はこちら」案内はUIまたは上位統合の責務である。

## 4. State Model

### Durable State

- Archive hash。
- Archive content snapshot。

### Ephemeral State

- Copy interaction state。

### Derived State

- Markdown正規化結果。
- SHA-256 digest。

### Forbidden Coupling

- `/archives/{hash}`を通常のnote page navigation URLとして扱ってはならない。
- Permanent URLの意味論、hash生成規則、版保証を`docs/design-system/patterns.md`で正本化してはならない。

## 5. Failure Semantics

- HashはSHA-256の先頭12文字を基本とする。
- Hash形式はlowercase hexadecimalとする。
- `updated_at`はhash対象から除外する。
- Markdownはhash生成前に正規化する。
- Hash衝突時は、衝突しなくなるまで使用文字数を延長する。

## 6. Integration Boundaries

### Build-time

- Archive hashとsnapshotを生成する。

### SSR

- `/archives/{hash}`はarchive contentを直接表示できる。

### Client Runtime

- Routerはarchive routeを最新版URLへ自動変換しない。

### Hydration

- Copy UIのhydrationはscheduler / registryに従う。

### Tests

- Hash生成規則変更時の検証レイヤは`docs/contracts/testing-taxonomy.md`に従う。

## 7. Acceptance Criteria

- Permanent URLが内容固定参照として通常navigation URLから分離されている。
- SHA-256先頭12文字、`updated_at`除外、衝突時延長が明記されている。
- `/archives/{hash}`が最新版へ自動redirectされない。
- Permanent URL契約がnote-navigationやpatternsに混入していない。
