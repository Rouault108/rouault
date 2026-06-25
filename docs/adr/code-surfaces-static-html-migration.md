# Code Surfaces Static HTML Migration Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-21
- Contract source of truth: `docs/contracts/code-surfaces.md`
- Scope: code block、code group、static copy controlの静的HTML正本化

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/code-surfaces.md`です。

## Context

Phase 0調査では、次が確認されています。

- `src/components/ui/codeblock/codeblock.ts`は存在しない。
- `src/components/ui/code-group/code-group.ts`は存在しない。
- `src/components/ui/copy-button/copy-button.ts`は存在しない。
- `ui-code-block` / `ui-code-group` / `ui-copy-button`はstatic-first deletion targetとforbidden input tagに登録済みである。
- hydration registryは`code-block-enhancer` / `code-group-enhancer`を使い、旧Custom Elementを登録していない。
- hydration registry testとcustom element revival guardは旧code componentを戻さない契約を固定している。
- SSR targetでも旧code componentは除外されている。
- `ui-code-block-change` / `copy-error` / `copy` custom eventの現行ランタイム利用は確認されていない。
- `selected-value` / `default-selected-value` / `activation`は別文脈の利用があり、旧code group APIとしてのランタイム利用は確認されていない。
- code surface専用contract文書は存在しなかった。
- `docs/design-system/components/code-preview.md`には、存在しないcode composition文書への参照と、現行実装と矛盾するcode group変更イベント記述があった。
- `docs/contracts/markdown.md`はstatic-first final DOMとno-JS可読性を上位契約として持つ。
- 現状code groupはSSR時点からtabs semanticsとhidden inactive panelを持つ候補寄り実装であり、no-JS可読性と弱く衝突する。

## Decision

code block、code group、copy UIは旧Lit Custom Elementではなく静的HTMLを正本とします。

- 旧`ui-code-block` / `ui-code-group` / `ui-copy-button`は復元しない。
- 旧Custom Element API互換は提供しない。
- code groupはSSR / no-JS時点ではstackとして全panelを読める構造にし、enhancer後にtabs semanticsへ昇格する。
- no-JS tab controlsは操作可能UIとして表示しない。
- copy controlsはprogressive enhancement UIとし、no-JSで押せるが動かない状態を避ける。
- printでは全code group panelを読める状態にする。
- SSR generator / enhancer / CSSのDOM・属性所有権を分離する。
- Phase 3A〜3Cはreview unitであり、単独release-readyとは扱わない。

## Delete Gate

旧Custom Element APIの削除判断は、Phase 0調査結果と対応します。

| Phase 0 evidence | Gate interpretation |
| --- | --- |
| P0-1〜P0-3: 旧code component実装ファイルが存在しない | 旧実装を復元対象ではなく削除済み対象として扱う。 |
| P0-4〜P0-5: 旧tagsはdeletion target / forbidden input tag登録済み | final DOMとauthor inputに旧tagsを戻さない。 |
| P0-6〜P0-9: hydration registry / tests / revival guard / SSR targetが旧componentを除外 | runtime正本を旧Custom Elementへ戻さない。 |
| P0-10: 旧custom eventの現行ランタイム利用なし | `ui-code-block-change` / `copy` / `copy-error`を互換復元しない。 |
| P0-11: 旧code group APIとしてのランタイム利用なし | `selected-value` / `default-selected-value` / `activation`をcode surface APIとして復元しない。 |
| P0-12〜P0-14: 専用contract不在、markdown contractはstatic-firstを要求 | `docs/contracts/code-surfaces.md`を正本として追加する。 |
| P0-15: SSR tabs + hidden inactive panelはno-JS可読性と弱く衝突 | SSR stack → enhanced tabsへ移行する。 |

## Alternatives Reviewed

### 旧 Lit 互換を戻す案

棄却します。旧component実装は現行treeに存在せず、旧tagsはdeletion target / forbidden input tagとして扱われています。hydration registryも旧Custom Elementを登録していません。復元すると、静的HTML正本とLit runtime正本が二重化し、static-first deletion targetと矛盾します。

### SSR tabs + hidden inactive panel を維持する案

棄却します。SSR時点からtab semanticsとhidden inactive panelを持つ構造は、JSなしで全code exampleを読めるというstatic-first baselineと弱く衝突します。印刷時にもinactive panelが失われやすいため、SSRはstack、enhanced後にtabsへ昇格する方針を採用します。

### runtime enhancer で code group を全面再構成する案

棄却します。enhancerがDOMを全面再構成すると、SSR generatorのfinal HTML contractとruntime DOM contractが分裂します。enhancerはprogressive enhancementとして、ARIA semantics、active state、keyboard navigation、copy target同期を補う範囲に限定します。

### `copy` / `copy-error` / `ui-code-block-change` などの custom event を復元する案

棄却します。Phase 0調査で現行ランタイム利用は確認されていません。復元するとenhancerが旧Custom Element互換層になり、copy UIのprogressive enhancement contractと混ざります。外部同期イベントが必要になった場合は、旧API互換ではなく別Request / Decisionとして扱います。

## Consequences

- code surface contractの正本は`docs/contracts/code-surfaces.md`になる。
- ADRは判断経緯を保存するだけで、contractを上書きしない。
- `docs/design-system/components/code-preview.md`はcode root / copy / tab / code group contractとして`docs/contracts/code-surfaces.md`を参照する。
- `docs/references/markdown-output.md`は詳細参照であり、code surface contractを上書きしない。
- copy buttonのdetailed no-JS / enhanced / state contractはPhase 6で固定する。
- Phase 3A〜3Cはまとめてrelease-ready判定する。

## Out of Scope

- 実装コード変更。
- CSS変更。
- テスト変更。
- hydration registry変更。
- 旧Custom Element復元。
- 旧API互換追加。
