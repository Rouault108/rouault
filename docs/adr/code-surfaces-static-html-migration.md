# Code Surfaces Static HTML Migration Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-21
- Contract source of truth: `docs/contracts/code-surfaces.md`
- Scope: code block、code group、static copy control の静的 HTML 正本化

この文書は decision record です。現在の contract を再定義する正本ではありません。現行 contract の正本は `docs/contracts/code-surfaces.md` です。

## Context

Phase 0 調査では、次が確認されています。

- `src/components/ui/codeblock/codeblock.ts` は存在しない。
- `src/components/ui/code-group/code-group.ts` は存在しない。
- `src/components/ui/copy-button/copy-button.ts` は存在しない。
- `ui-code-block` / `ui-code-group` / `ui-copy-button` は static-first deletion target と forbidden input tag に登録済みである。
- hydration registry は `code-block-enhancer` / `code-group-enhancer` を使い、旧 Custom Element を登録していない。
- hydration registry test と custom element revival guard は旧 code component を戻さない契約を固定している。
- SSR target でも旧 code component は除外されている。
- `ui-code-block-change` / `copy-error` / `copy` custom event の現行 runtime 利用は確認されていない。
- `selected-value` / `default-selected-value` / `activation` は別文脈の利用があり、旧 code group API としての runtime 利用は確認されていない。
- code surface 専用 contract 文書は存在しなかった。
- `docs/design-system/components/code-preview.md` には、存在しない code composition 文書への参照と、現行実装と矛盾する code group 変更イベント記述があった。
- `docs/contracts/markdown.md` は static-first final DOM と no-JS 可読性を上位契約として持つ。
- 現状 code group は SSR 時点から tabs semantics と hidden inactive panel を持つ候補寄り実装であり、no-JS 可読性と弱く衝突する。

## Decision

code block、code group、copy UI は旧 Lit Custom Element ではなく静的 HTML を正本とします。

- 旧 `ui-code-block` / `ui-code-group` / `ui-copy-button` は復元しない。
- 旧 Custom Element API 互換は提供しない。
- code group は SSR / no-JS 時点では stack として全 panel を読める構造にし、enhancer 後に tabs semantics へ昇格する。
- no-JS tab controls は操作可能 UI として表示しない。
- copy controls は progressive enhancement UI とし、no-JS で押せるが動かない状態を避ける。
- print では全 code group panel を読める状態にする。
- SSR generator / enhancer / CSS の DOM・属性所有権を分離する。
- Phase 3A〜3C は review unit であり、単独 release-ready とは扱わない。

## Delete Gate

旧 Custom Element API の削除判断は、Phase 0 調査結果と対応します。

| Phase 0 evidence | Gate interpretation |
| --- | --- |
| P0-1〜P0-3: 旧 code component 実装ファイルが存在しない | 旧実装を復元対象ではなく削除済み対象として扱う。 |
| P0-4〜P0-5: 旧 tags は deletion target / forbidden input tag 登録済み | final DOM と author input に旧 tags を戻さない。 |
| P0-6〜P0-9: hydration registry / tests / revival guard / SSR target が旧 component を除外 | runtime 正本を旧 Custom Element へ戻さない。 |
| P0-10: 旧 custom event の現行 runtime 利用なし | `ui-code-block-change` / `copy` / `copy-error` を互換復元しない。 |
| P0-11: 旧 code group API としての runtime 利用なし | `selected-value` / `default-selected-value` / `activation` を code surface API として復元しない。 |
| P0-12〜P0-14: 専用 contract 不在、markdown contract は static-first を要求 | `docs/contracts/code-surfaces.md` を正本として追加する。 |
| P0-15: SSR tabs + hidden inactive panel は no-JS 可読性と弱く衝突 | SSR stack → enhanced tabs へ移行する。 |

## Alternatives Reviewed

### 旧 Lit 互換を戻す案

棄却します。旧 component 実装は現行 tree に存在せず、旧 tags は deletion target / forbidden input tag として扱われています。hydration registry も旧 Custom Element を登録していません。復元すると、静的 HTML 正本と Lit runtime 正本が二重化し、static-first deletion target と矛盾します。

### SSR tabs + hidden inactive panel を維持する案

棄却します。SSR 時点から tab semantics と hidden inactive panel を持つ構造は、JS なしで全 code example を読めるという static-first baseline と弱く衝突します。印刷時にも inactive panel が失われやすいため、SSR は stack、enhanced 後に tabs へ昇格する方針を採用します。

### runtime enhancer で code group を全面再構成する案

棄却します。enhancer が DOM を全面再構成すると、SSR generator の final HTML contract と runtime DOM contract が分裂します。enhancer は progressive enhancement として、ARIA semantics、active state、keyboard navigation、copy target 同期を補う範囲に限定します。

### `copy` / `copy-error` / `ui-code-block-change` などの custom event を復元する案

棄却します。Phase 0 調査で現行 runtime 利用は確認されていません。復元すると enhancer が旧 Custom Element 互換層になり、copy UI の progressive enhancement contract と混ざります。外部同期イベントが必要になった場合は、旧 API 互換ではなく別 Request / Decision として扱います。

## Consequences

- code surface contract の正本は `docs/contracts/code-surfaces.md` になる。
- ADR は判断経緯を保存するだけで、contract を上書きしない。
- `docs/design-system/components/code-preview.md` は code root / copy / tab / code group contract として `docs/contracts/code-surfaces.md` を参照する。
- `docs/references/markdown-output.md` は詳細参照であり、code surface contract を上書きしない。
- copy button の detailed no-JS / enhanced / state contract は Phase 6 で固定する。
- Phase 3A〜3C はまとめて release-ready 判定する。

## Out of Scope

- 実装コード変更。
- CSS 変更。
- テスト変更。
- hydration registry 変更。
- 旧 Custom Element 復元。
- 旧 API 互換追加。
