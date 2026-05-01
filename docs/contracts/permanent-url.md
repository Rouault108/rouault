# Permanent URL Contract

## 1. Status

- Type: Normative
- Source of truth: archive hash generation、archive route projection、permanent URL tests
- Applies to: Permanent URL、`/archives/{hash}`、hash 生成、版保証
- Non-goals: 通常の note page navigation URL、search URL state、UI pattern の視覚表現

## 2. Ownership

### This Layer Owns

- Permanent URL が内容固定参照であること。
- `/archives/{hash}` の URL 形式。
- Hash 長、形式、hash 元、衝突時の延長規則。
- 過去版と最新版の関係。

### This Layer Must Not Own

- Note page navigation URL、`slug`、`permalink`、`directory-index`。正本は `docs/contracts/note-navigation.md`。
- `DocumentCanonicalUrl` と `SearchStateUrl` の検索上の意味。正本は `docs/contracts/search.md`。
- コピー UI の詳細 pattern。`docs/design-system/patterns.md` が扱ってよい。

## 3. Public Contract

### Inputs

- Note content。
- Hash 対象に含める正規化済み Markdown。
- Hash 対象から除外する metadata。

### Outputs

- `/archives/{hash}` 形式の Permanent URL。
- 同一内容に戻した場合に再利用される hash。

### Events

- N/A

### DOM / URL / State Contract

- Canonical URL は最新版の通常閲覧先を表す。
- Permanent URL は特定内容の固定参照を表し、URL 同期ではない。
- `/archives/{hash}` は `/{slug}` や `/notes/{slug}` へ自動正規化してはならない。
- Router は `/archives/{hash}` から最新版へ自動 redirect してはならない。
- 過去版での「最新版はこちら」案内は UI または上位統合の責務である。

## 4. State Model

### Durable State

- Archive hash。
- Archive content snapshot。

### Ephemeral State

- Copy interaction state。

### Derived State

- Markdown 正規化結果。
- SHA-256 digest。

### Forbidden Coupling

- `/archives/{hash}` を通常の note page navigation URL として扱ってはならない。
- Permanent URL の意味論、hash 生成規則、版保証を `docs/design-system/patterns.md` で正本化してはならない。

## 5. Failure Semantics

- Hash は SHA-256 の先頭 12 文字を基本とする。
- Hash 形式は lowercase hexadecimal とする。
- `updated_at` は hash 対象から除外する。
- Markdown は hash 生成前に正規化する。
- Hash 衝突時は、衝突しなくなるまで使用文字数を延長する。

## 6. Integration Boundaries

### Build-time

- Archive hash と snapshot を生成する。

### SSR

- `/archives/{hash}` は archive content を直接表示できる。

### Client Runtime

- Router は archive route を最新版 URL へ自動変換しない。

### Hydration

- Copy UI の hydration は scheduler / registry に従う。

### Tests

- Hash 生成規則変更時の検証レイヤは `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- Permanent URL が内容固定参照として通常 navigation URL から分離されている。
- SHA-256 先頭 12 文字、`updated_at` 除外、衝突時延長が明記されている。
- `/archives/{hash}` が最新版へ自動 redirect されない。
- Permanent URL 契約が note-navigation や patterns に混入していない。
