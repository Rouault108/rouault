# Code Group Enhance Root Sync Scope

## Status

Accepted.

## Context

code groupは読書面の中で複数の実装例やpackage manager例を並べるために使う。複数groupを同じ選択へ揃えたい場面はあるが、既定で全document同期にすると本文中の無関係なgroup、nested group、preview内部、通常`ui-tabs`、URL stateと責務が混ざる。

既存のcode group enhancerは、現在のgroup root直下のtabs / panels / copy buttonだけをlocal stateとして扱う。nested descendantを親group stateへ混ぜない契約は維持する必要がある。

## Decision

code group同期はauthorが`sync-scope`を明示した場合だけ有効にする。Markdown入力では`sync-scope="package-manager"`のように指定し、final DOMでは`data-code-group-sync-scope="package-manager"`として出力する。

`sync-scope`はtrim後に空なら未指定扱いにする。非空の場合は64文字以下で`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`に一致する値だけを許可する。検証ロジックは`shared/code-group/code-group-sync-scope.ts`を単一定義とし、remark payload正規化とfinal note content contractの両方から参照する。

同期範囲は`enhanceCodeGroups(root)`に渡された同一root配下に限定する。同期対象は同じ`data-code-group-sync-scope`を持ち、`data-code-group-enhanced="true"`で、選択keyに対応するdirect tabとdirect panelの両方を持つcode groupだけとする。

同期はclick、Enter、Spaceによるユーザー選択時だけ発火する。初期hydration、arrow key、Home、End、URL変更、history navigationでは発火しない。同期先ではroot selected key、enhanced marker、tab selected / active state、roving tabindex、panel active state、group copy targetだけを更新し、focus、scroll、URL、history、storage、custom event dispatchは発生させない。

`data-code-group-sync-scope`はfinal DOM契約属性であり、final source markerではない。`FINAL_SOURCE_MARKER_ATTRIBUTES`には追加しない。

## Consequences

既定のcode groupは従来どおり独立して動く。同期が必要な場所だけ、authorが明示的にscope名を共有する。

同一document内でも別enhance rootのcode groupは同期しない。これによりhydration ownershipやpreview / partial rootの境界を保てる。

nested code groupは親groupのlocal stateには混ざらない。ただしnested group自体が同一enhance root内で同じsync-scopeを持ちenhanced済みであれば、独立peerとして同期対象になり得る。

## Rejected Options

- 既定で同じkeyのcode groupをdocument全体同期する案: 無関係なgroupとURL / history責務を結合しすぎる。
- `ownerDocument`全体を同期範囲にする案: hydration root境界を壊す。
- 通常`ui-tabs`や`ui-tabs[url-sync]`と統合する案: code surface固有の読書UIと汎用tabsの責務が混ざる。
- custom eventで外部公開する案: 今回の同期はcode group内部の局所状態更新で足りる。
- 未enhanced peerへ部分的に`syncSelection`だけ適用する案: enhancer初期化契約を迂回し、ARIA semanticsやcopy targetの前提が崩れる。
