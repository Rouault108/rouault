# Accessible Top Scroll Rail for Wide Tables

## Status

- Decision ID: D-TABLE-TOP-SCROLL-RAIL-ACCESSIBLE-REGION-001
- Request ID: REQ-TABLE-TOP-SCROLL-RAIL-001
- R段階: R3
- Aレベル: A0
- Status: Accepted

## Context

Markdown static table surfaceは`data-table-root`を横スクロール可能なstatic-first領域として出力する。Phase2評価では、PCマウス操作時に横溢れ表の途中から横位置を変えにくい摩擦が残った。

この変更はMarkdown authoring APIやSSR table構造を変更せず、runtime enhancementとして横溢れ表だけに上部補助scroll railを追加する。

## Decision

横溢れしている`[data-table-root]`の直前に、runtime enhancementとして`[data-table-scroll-rail]`を追加する。railはnative overflow scroll containerであり、非semanticな飾りではなくaccessible auxiliary scroll regionとして扱う。

railは`role="region"`、accessible name、`tabindex="0"`を持ち、`aria-controls`で対応するtable rootの`id`を参照する。captionあり表ではcaption text由来のaccessible nameを使い、captionなし表または正規化後に空文字のcaptionでは「直後の表の横スクロール補助」を使う。

rootに既存`id`がある場合は上書きしない。rootに`id`がない場合はruntimeで一意な`id`を付与する。runtime生成`id`はabort時、overflow解消時、rail削除時のいずれでも削除しない。これは、再overflow化や別signalでの再enhance時に`aria-controls`の参照先を安定させるためである。

coarse pointer環境ではrailを表示しない。PCマウス向けの補助UIをtouch操作面へ持ち込まず、視覚・Tab順序上のノイズにしないためである。

## Rationale

native overflow scroll containerを使うことで、既存のtable root scroll契約を保ったまま、上部にも同じ横scroll操作面を提供できる。railをaccessible auxiliary scroll regionとして公開することで、Tab到達可能なscroll領域であることを支援技術にも説明できる。

非semantic / `aria-hidden`案は棄却した。railはfocus可能でscroll操作可能なUIであり、支援技術から隠すとkeyboard focusや操作対象の説明と矛盾する。

pointer-only custom drag surface案は棄却した。独自dragはkeyboard、支援技術、forced-colors、reduced motion、native scroll慣性の契約を増やし、static table surfaceの責務を不必要に広げる。

Phase3A sticky headerを先行しない。今回の摩擦は表途中から横位置を変えにくい点であり、header固定は視認性の別問題である。sticky headerはcaptionやtable geometryの設計影響が大きいため、このDecisionの範囲外とする。

Library wide table viewへ進まない。wide viewはroute、dialog、focus復帰、URL、content projectionの契約を追加する別機能であり、Markdown static table surfaceの局所的なruntime enhancementとして扱えない。

`role="region"`にはlandmark過多のリスクがある。ただしrailはfocus可能な独立scroll regionであり、captionまたはfallbackにより対象表を文脈化できるため、補助scroll領域として名前付きregionにする。

## Consequences

top railはsemantic table subtreeへ挿入しない。table rootをwrapperで包まず、row hover、row selection、row navigation、interactive grid化、sort / filter、sticky header、Library wide table viewを意味しない。

Phase1の`data-overflow`、`data-fade-left`、`data-fade-right`は引き続きruntime state属性であり、Markdown authoring APIではない。Phase3Bのtop railはこれらとは別のruntime enhancementである。

## Breaking Change Gate

non-breaking additive change。Markdown authoring API、`column-widths`構文、SSR table出力構造、routing、URL契約は変更しない。
