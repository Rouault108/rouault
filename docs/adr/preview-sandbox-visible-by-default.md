# Preview Sandbox Visible By Default

- Status: Accepted
- Date: 2026-06-30
- Decision ID: D-PREVIEW-SANDBOX-VISIBLE-BY-DEFAULT-001

## Decision

`ui-preview-sandbox`の既定activationは`visible`とする。通常のMarkdown由来previewは`data-hydration-trigger="visible"`を持ち、`activation-policy`未指定のdefault visibleではSSR/build outputに`activation-policy="visible"`を追加しない。authorが`activation-policy="visible"`を明示した場合は維持する。

`activation-policy="eager"`は`data-hydration-trigger="initial"`、`activation-policy="manual"`は`data-hydration-trigger="interaction"`を持つ。`eager`はclient hydration sessionのinitial phaseでpreviewを構築する契約であり、SSR時点でiframe `srcdoc`を生成する契約ではない。

## Breaking Change

従来クリック待ちだった通常の軽量previewは、viewport到達時に自動でpreview表示される。旧挙動を維持するauthoringでは`activation-policy="manual"`を明示する。

manual placeholderは「準備中」表示ではなく操作可能なnative buttonにする。focusだけではpreviewを起動しない。

## Compatibility

client runtimeではLitの`reflect: true`により`activation-policy="visible"`がDOMへ反映される可能性がある。これはSSR/build output契約とは分ける。

component単体利用では、列挙外`activationPolicy`はruntime上visible扱いにする。ただしproperty自体を`visible`へ書き換えることは要求しない。manual previewに`data-hydration-trigger="visible"`または`initial`が渡されても、robustnessとして即時preview生成しない。

## Manual-only Capabilities

manual-only capabilityは`allow-forms`、`allow-downloads`、`allow-pointer-lock`、`allow-popups`に限定する。これらがあり`activation-policy`未指定なら`activation-policy="manual"`へ正規化する。`activation-policy="visible"`または`eager`との併用はbuild errorとする。

`allow-js`単独ではmanualを強制しない。`allow-js`と`activation-policy`未指定、`visible`、`eager`、`manual`の併用は許可する。`allow-js`はmanual-only capabilityの判定を弱めないが、manual時のbutton文言を「プレビューを実行」系にする根拠になる。

## Out of Scope

- SSR時点でiframe `srcdoc`を生成してfirst paintから完全表示する変更。
- reader noteでpreview-sandboxを許可する変更。
- `testing/sandbox`以外のnote content policy変更。
- allow-jsの安全モデル全体の再設計。
- CSP、network policy、外部リソース遮断の導入。
- `ui-code-preview`全体のレイアウト再設計。
- code tab、copy button、syntax highlightingの変更。
- preview-sandbox以外のhydration trigger契約変更。
- scheduler全体のtrigger意味論変更。

## Rollback

通常previewをクリック待ちに戻す場合は、Markdown/rehype出力のdefault mappingを`interaction`へ戻し、manual-only capability正規化とmanual UI契約を再評価する。rollback時もSSR時点でiframe `srcdoc`を生成しない契約、reader note policy、`build/rehype/preview-sandbox.ts`のsnippet/template変換責務は維持する。
