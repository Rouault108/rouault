# Code Preview

本書は人間承認済みfull Lit removal v14の該当component契約を反映する。durable document DOMはbuild-time、interactionとephemeral stateはplain controllerが所有する。最初の起動はHydrationSchedulerだけが所有する。

実装入口: `build/rehype/native-code-preview.ts` / `src/client/post-hydrate/code-preview-enhancer.ts`。移行Decisionは[full Lit removal](../adr/full-lit-removal.md)を参照する。

## Input → native DOM mapping

現行`ui-code-preview`の公開入力を、native static DOMへ次のように投影する。これは旧HTMLElement property APIのcompatibility layerではなく、build-time output contractである。

| 旧入力                     | native target                                                                     | ownership / 意味                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `heading`                  | `[data-code-preview-header]`内のstatic heading text                               | build-timeでtrim/空判定し、文言をdurable DOMへ直接出力する。runtime metadataとして複製しない                                       |
| `controls`                 | 各native control rootの`data-code-preview-control="theme \| surface \| viewport"` | build-timeで有効tokenを正規化し、必要なnative button/menu DOMだけを生成する。rootへ旧`controls`文字列をruntime inputとして残さない |
| `preview-padding`          | root `data-preview-padding="normal \| compact \| none"`                           | build-time初期値。enhancement後もlayout projectionとして保持するが、外部mutationを制御入力として扱わない                           |
| `preview-align`            | root `data-preview-align="center \| start \| stretch"`                            | build-time初期値。static CSSのlayout inputであり、controller current stateには含めない                                             |
| `preview-theme`            | root `data-preview-theme="page \| light \| dark"`                                 | build-time初期値。enhancement後はCodePreviewControllerがcurrent stateの正本となり、この属性をread-only projectionとして更新する    |
| `preview-surface`          | root `data-preview-surface="surface \| canvas \| muted"`                          | 同上                                                                                                                               |
| `preview-viewport`         | root `data-preview-viewport="full \| tablet \| mobile"`                           | 同上                                                                                                                               |
| internal `preview-profile` | root `data-preview-profile="reader \| demo"`                                      | build/layout-owned immutable metadata。author APIにはせず、renderer/control policyの判定にだけ使う                                 |

`NoteContentKind → reader|demo`の**profile projection/resolution owner**は`build/content/note-content-contracts.ts`に維持する。固定commitの既存意味どおりmappingは`reader → reader`、`testing → demo`、`demo → demo`とし、本変更で再解釈しない。固定commitでは同fileの`injectNoteContentProfiles()`が`createNotePolicyContext()`の既存意味を用いてprojection段階で`ui-code-preview`へprofileを後付けしているが、targetではその順序を廃止する。`velite.config.ts`でnative normalizationより前に確定しているnormalized `kind`を`note-content-contracts.ts`のprofile resolverへ渡し、resolved `reader|demo`をnative lowering**前**に一度だけ確定して`normalizeRouaultStaticSurfaceHtml` / Code Preview lowererへ明示的なbuild inputとして渡す。lowererは同じresolved profileを`data-preview-profile`とprofile-dependent control output policyの双方に使うが、authoring入力の許可・拒否規則を再実装しない。`note-page-projection.ts`はnative化済みcontentへprofileを後注入しない。移行完了時には旧`injectNoteContentProfiles()`のcustom-element属性注入経路を削除し、profile projection/resolutionの第二ownerを作らない。

controls/toolbar等をauthoringで許可するかの**permission policy source of truth**は既存`build/remark/directives/policy/note-policy-context.ts` / `preview-policy.ts`に維持する。profile projection/resolution ownerとauthoring permission policy ownerは別責務であり、前者の移動を理由に後者を`note-content-contracts.ts`やlowererへ複製・移設しない。

authoring directive validationと旧component direct APIのruntime fallbackを同一contractとして扱わない。authoring/build validationが現在rejectする不正入力は引き続きlowering前にrejectする。特にCode Preview `controls`の未知tokenはauthoring側`parseEnumListAttribute()`の既存contractどおりrejectし、旧HTMLElement runtimeの`normalizeControls()`が未知tokenを無視したfallbackをcompatibility APIとして再現しない。native rendererがcanonicalizeできるのはvalidation済みintermediate inputまたは型付きtest/UI-check structured renderer inputだけである。`preview-profile`のauthor非公開性も維持し、native lowering後に旧`heading` / `controls` / `preview-*` / `preview-profile`属性を互換surfaceとして二重保持しない。

## Static output

```html
<figure
  data-code-preview-root
  data-preview-profile="demo"
  data-preview-padding="normal"
  data-preview-align="center"
  data-preview-theme="page"
  data-preview-surface="surface"
  data-preview-viewport="full"
  data-hydration-key="code-preview-enhancer"
  data-hydration-capability="interactive"
  data-hydration-trigger="visible"
  ...
>
  <header data-code-preview-header>...</header>
  <div data-code-preview-surface>...</div>
  <div data-code-preview-code>...</div>
</figure>
```

`[data-code-preview-header]`は、heading、built-in controls、toolbarのいずれも存在しない場合は生成不要としてよい。生成有無はbuild rendererが決め、runtimeでheader構造を作り直さない。上の例はenhancement対象のvariantである。hydration annotationのbuild-time predicateは、canonicalized `controls`がtrim後non-empty **または** Code Preview rootのdirect child elementに`slot="toolbar"`が存在することとする。ここでtoolbar条件は固定commitのcurrent `hasToolbarSlot()` semanticsをそのまま継承し、descendant全体の検索やtoolbar contentの非空判定を新しいhydration条件として追加しない。この条件を満たすoutputだけCode Preview native lowererが`data-hydration-key="code-preview-enhancer"`、`data-hydration-capability="interactive"`、`data-hydration-trigger="visible"`を付与する。両条件を満たさずCodePreviewControllerを必要としない静的outputには、互換目的を含めhydration annotationを付けない。

## Baseline

previewとcodeの両方が静的HTMLとして読める。

built-in controlsがJSなしでは意味を持たない場合、interactive controlはenhancer readyまで非表示にする。見出し・toolbarのstatic actionは別途native semanticsを維持する。

## State / mutation ownership

- `previewTheme` / `previewSurface` / `previewViewport`に相当するcurrent stateの正本は、enhancement成功後の`CodePreviewController`とする。
- rootの`data-preview-theme` / `data-preview-surface` / `data-preview-viewport`はcontrollerが更新する読取用projectionである。build時の値は初期stateのseedとして一度だけ読む。
- `data-preview-padding` / `data-preview-align` / `data-preview-profile`はbuild-owned immutable metadataとして扱い、controllerが継続監視しない。
- 旧custom-element property assignmentやattribute mutationを再現するMutationObserver、property shim、HTMLElement method APIを作らない。外部DOM mutationをstate変更要求として解釈しない。
- parent feature内部からstate変更が必要な場合はCode Preview feature module内のcontroller APIを使い、DOM属性書換えをcommand channelにしない。現行production consumerが存在しないため、repository外互換を想定した公開programmatic APIは本変更で新設しない。

## State change event

`ui-code-preview-state-change`は、**現行文書化済みevent contractを維持するため**native rootから発火する。production外部consumerの存在を維持理由にはしない。

- 発火元は`[data-code-preview-root]`自身。
- `bubbles: true`、`composed: true`、`cancelable: false`。
- detailは既存の`{ keys, state: { previewTheme, previewSurface, previewViewport }, userInitiated }`を維持する。
- build時初期値の読込・enhancer初期同期だけでは発火しない。
- built-in native controlsによる変更は`userInitiated: true`。
- feature controller内部の明示的programmatic更新が将来／既存内部経路で必要な場合だけ`userInitiated: false`とし、同一stateへの再設定では発火しない。
- event発火前にcontroller stateと3つのread-only projection属性を反映する。

## Internal controls

`ui-button`/`ui-dropdown`を生成せず、static native button/menu DOMを使用する。

command menuは[native command controls](note-controls.md)のnative menu/controller contractを利用し、`menu-item-select`等の旧internal custom-element protocolをCode Preview内部へ残さない。

## Visual Contract

previewとcodeを一つの外枠に束ね、子code surfaceの意味状態を変更しない。code rootの静的契約を上書きせず、`--ui-code-surface-radius-top`、`--ui-code-surface-breakout-width`、`--ui-code-preview-divider-color`等の合成tokenを渡す。stylesheet ownerは`src/assets/css/code-preview.css`。owned header/surface/codeのselectorを明示し、author preview内の同名classへ漏らさない。small-screen、print、forced-colors、reduced-motionは既存視覚契約を維持する。
