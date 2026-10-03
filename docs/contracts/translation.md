# Translation

本書は人間承認済みfull Lit removal v14の該当component契約を反映する。durable document DOMはbuild-time、interactionとephemeral stateはplain controllerが所有する。最初の起動はHydrationSchedulerだけが所有する。

実装入口: `build/rehype/native-translation.ts` / `src/client/post-hydrate/translation-overlay-enhancer.ts`。移行Decisionは[full Lit removal](../adr/full-lit-removal.md)を参照する。

## Static output

canonical DOMは`details/summary`とする。

```html
<details
  data-translation-overlay
  data-surface="popover"
  data-hydration-key="translation-overlay-enhancer"
  data-hydration-capability="interactive"
  data-hydration-trigger="visible"
>
  <summary lang="fr">...</summary>
  <div data-translation-content lang="ja">...</div>
</details>
```

## no-JS baseline

native disclosureとして原文と訳文へ到達できる。

## Enhancement

- popover/drawer visual positioning
- Escape close
- focus return
- outside pointer policy
- one-open-at-a-time orchestration
- `translation-toggle` event

同一DOMを使用し、fallback DOM→hydrated DOMの破壊的置換は行わない。

## Open / focus handoff

- 開閉の正本は`HTMLDetailsElement.open`とする。controllerは別の正規open stateを保持せず、native toggleを観測してpositioningと通知を同期する。
- summaryはnative disclosure triggerを維持し、buttonへ置換しない。訳文は通常のdisclosure contentとし、旧dialog role／aria-modal／aria-haspopup=dialogは移植しない。popover/drawerは視覚presentationであり、新たなmodalやfocus trapを導入しない。
- enhancer起動前に読者が開いたdetailsのopenとsummaryのfocusを保持し、初期化のために一旦閉じたり再生成したりしない。
- document単位のorchestratorを、各enhancerの初期open通知より先に起動する。初回reconciliationで複数openなら、focusを内包するroot、なければDOM順最初のopen rootを残す。他のrootは未enhanceでもnative openを閉じてよい。
- start ownerはtranslation feature moduleとする。`translation-overlay-enhancer.ts`の公開activation入口は、root/controller登録より先に`ownerDocument`単位のsingleton orchestratorをensureする。singleton registryはfeature-localな`WeakMap<Document, ...>`等で所有し、component lifecycleや`src/client.ts`へdocument-global orchestrationを戻さない。
- 以後、読者が開いたrootを優先し他を閉じる。閉じられる側からfocusを奪わない。Escape時だけ起点summaryへfocusを戻す。outside pointer時はクリック先のfocusを奪わない。
- `translation-toggle`はroot自身からbubbles/composed trueで通知し、detail `{ open, surface }`を維持する。初期open継承は1回通知し、同一状態の重複通知とreconciliation loopを防ぐ。
- SPAで旧rootが破棄された場合、listenerを解除し、旧summaryへのfocus復帰を行わない。
- plain-text入力、言語、空訳文時に開けない入力規則を維持する。空訳文はbuild時に非interactiveな原文として出力し、空の操作可能disclosureを生成しない。これは削除するcomponent instance APIの再現ではなくnative出力規則である。

## Remove

- `<ui-translation>`
- LitElement lifecycle
- `openTranslation()`等のHTMLElement instance API
- hydrated button/dialogへのDOM置換contract

## 入力とCSS

`::translation-overlay`のplain-text original/translated、lang/target-lang、popover/drawerを維持する。通常`::translation`の静的対訳出力は既存契約のままである。stylesheet ownerは`src/assets/css/translation.css`。disclosureの同一DOMを使い、enhancement前のreading flowを保つ。
