# Code Surfaces Contract

## 1. Status

- Type: Normative
- Source of truth: Markdown transform pipeline、SSR generator、post-hydrate enhancer、code surface CSS
- Applies to: code block、code group、static copy control、code preview に組み込まれる code root
- Non-goals: 旧 Lit Custom Element API 互換、copy state machine の完全復元、Phase 3A〜3C の単独 release-ready 判定

## 2. Ownership

### This Layer Owns

- code surface の静的 HTML 正本構造。
- code group の no-JS baseline と enhanced tabs への昇格契約。
- no-JS tab controls、no-JS copy controls、print の基本方針。
- SSR generator / enhancer / CSS の DOM・属性所有権。
- 旧 `ui-code-block` / `ui-code-group` / `ui-copy-button` API を提供しないこと。

### This Layer Must Not Own

- Markdown parser 全体の安全境界。`docs/contracts/markdown.md` を参照する。
- `ui-code-preview` 自身の preview state、built-in controls、toolbar contract。`docs/design-system/components/code-preview.md` を参照する。
- copy button の detailed enhanced state contract。Phase 6 で別途固定する。
- hydration trigger ownership。`docs/contracts/hydration.md` を参照する。

## 3. Public Contract

### Static HTML Authority

code surface の正本は、旧 Lit Custom Element ではなく静的 HTML です。

- 単独 code block root は `figure[data-code-block-root]` とする。
- code body は `pre[data-code-block] > code[data-lang]` を基本構造とする。
- code group root は `section[data-code-group]` とする。
- copy source は `template[data-code-copy-source]` とする。
- copy control は `button.static-copy-control` とする。

旧 `ui-code-block`、`ui-code-group`、`ui-copy-button` は final DOM の正本ではありません。これらの tag、property、attribute、custom event を互換 API として提供しません。

### Single Code Block

- `figure[data-code-block-root]` は filename、language、caption、intent、copy control、code body を束ねる読書単位です。
- `pre[data-code-block]` は code body の scroll / overflow と syntax highlight の対象です。
- Shiki token、line number、line highlight、diff add/remove、wrap は静的 HTML と CSS の組み合わせで成立させます。
- overflow accessibility は enhancer が補助してよいですが、code 本文の存在と可読性は JS に依存してはなりません。

### Code Group

code group は SSR / no-JS 時点で stack として出力し、enhancer 実行後に tabs UI へ昇格します。

#### SSR / no-JS

- 全 panel を読める状態で出力します。
- `role="tablist"`、`role="tab"`、`role="tabpanel"` は付与しません。
- inactive panel を `hidden` で隠すことを主要方針にしません。
- 各 panel は label または heading で識別できる必要があります。
- `data-code-group-tab` は enhancer 用識別子であり、SSR / no-JS 時点の tab semantics ではありません。
- copy source は各 panel 内に維持します。

#### Enhanced

- enhancer は root に `data-code-group-enhanced="true"` または同等の enhanced state を付与します。
- enhancer は tablist / tab / tabpanel semantics、keyboard navigation、active panel state を付与します。
- inactive panel の非表示は enhanced state と CSS selector の組み合わせで行います。
- group copy control が存在する場合、enhancer は active panel の copy source を参照できる状態へ同期します。

## 4. No-JS Controls

### Tab Controls

- tab controls は SSR DOM に存在してよいですが、no-JS 時点では操作可能 UI として表示しません。
- default CSS では tab controls を `display: none` 相当へ退行させます。
- `inert`、`aria-hidden`、`tabindex="-1"` による no-JS tab control 制御は主要方針にしません。
- enhancer 初期化後にのみ tab controls を操作可能 UI として表示します。

### Copy Controls

- copy は JS と Clipboard API に依存する progressive enhancement です。
- SSR / no-JS では copy control を操作可能 UI として表示しない、または disabled とします。
- no-JS でも code 本文と copy source の読解を妨げてはなりません。
- success / error / reset state、`data-copy-enhanced`、clipboard fallback の詳細契約は Phase 6 の責務です。

## 5. Print Contract

- print では code group の全 panel を読める状態にします。
- enhanced state で隠れている inactive panel も print media では表示対象に戻します。
- tab controls や copy controls は印刷上の主内容ではありません。
- beforeprint / afterprint による DOM 変更は最後の手段とし、CSS で成立する方針を優先します。

## 6. DOM / Attribute Ownership

### SSR Generator Owned

- stable id。
- `data-code-block-root`、`data-code-block`、`data-code-group`。
- `data-code-group-tab`、`data-code-group-panel`、`data-code-group-value`。
- panel label / heading。
- initial selected value を表す data 属性。
- `template[data-code-copy-source]`。
- copy target id、status id、`aria-describedby` の参照整合。
- hydration annotation。

### Enhancer Owned

- `data-code-group-enhanced` または同等の enhanced state。
- tabs ARIA semantics。
- active tab / active panel state。
- keyboard navigation。
- active panel と group copy target の同期。
- code block overflow accessibility の補助状態。

### CSS Owned

- SSR stack 表示。
- no-JS tab controls / copy controls の退行表示。
- enhanced tabs の visible / hidden state。
- print all panels。
- syntax highlight、line number、highlight、diff、wrap、forced-colors、light / dark 表示。
- layout / breakout の視覚制御。

CSS は final DOM の意味状態を再定義しません。CSS state contract と copy button state contract は混同しません。

## 7. Old Custom Element API Removal

次は提供しません。

- `ui-code-block`
- `ui-code-group`
- `ui-copy-button`
- `selected-value`
- `default-selected-value`
- `activation`
- `ui-code-block-change`
- `copy`
- `copy-error`
- MutationObserver による runtime code group 再構成
- `ui-copy-button` の loading threshold
- 旧 `ui-copy-button` の状態アイコン機械

これらは旧 Lit component 間の runtime 契約であり、静的 HTML 正本化後の読解体験の正本ではありません。

## 8. Phase Boundary

Phase 3A、Phase 3B、Phase 3C は review unit です。いずれも単独では release-ready ではありません。

- Phase 3A: SSR stack DOM。
- Phase 3B: enhancer による tabs semantics / active state。
- Phase 3C: visibility / print CSS。

code group SSR stack / enhanced tabs 移行の release-ready 判定は、Phase 3A〜3C の結合完了後に行います。

## 9. Integration Boundaries

### Markdown

Markdown output は code surface の静的 HTML 構造を生成します。詳細な directive family 一覧は `docs/references/markdown-output.md` を参照できますが、code surface の DOM / state contract は本書を正本とします。

### Code Preview

`ui-code-preview` は code root の公開属性や選択状態を所有しません。preview と code root の合成時も、code block / code group / copy / tab contract は本書に従います。

### Hydration

hydration trigger は scheduler / registry が所有します。code surface enhancer は progressive enhancement として実行され、旧 Custom Element を registry へ戻しません。

## 10. Acceptance Criteria

- code surface の静的 HTML 正本構造が存在する。
- code group は no-JS で全 panel を読める stack として成立する。
- enhanced tabs は enhancer と CSS の責務として成立する。
- no-JS tab controls は操作可能 UI として表示されない。
- no-JS copy controls は操作不能状態を押せる UI として見せない。
- print では全 panel を読める。
- SSR generator / enhancer / CSS の DOM・属性所有権が分離されている。
- 旧 Custom Element API が復元されていない。
