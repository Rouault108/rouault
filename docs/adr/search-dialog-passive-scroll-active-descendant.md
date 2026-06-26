# Search Dialog Passive Scroll And Active Descendant

## Status

- Accepted
- Decision ID: `D-SEARCH-DIALOG-PASSIVE-SCROLL-OWNS-VIEWPORT-001`

## Decision

検索結果リストでは、passive scroll時のviewport正本を`scrollTop`とする。

`aria-activedescendant`を設定する場合、その参照先optionはDOM上に存在しなければならない。virtualized listでは、active optionがpassive scroll中に仮想化描画範囲を強制的に引き戻してはならない。

virtualized listのpassive scrollによりactive optionが現在の視覚viewport外へ出た場合、controllerはactive状態を解除し、inputの`aria-activedescendant`を外す。active解除後のArrowDownは現在の視覚viewport内の先頭候補から、ArrowUpは末尾候補から再開する。activeがない状態のEnterは先頭候補を暗黙選択しない。

keyboard navigationでactive optionを移動した場合だけ、必要に応じてactive optionをviewport内へscroll into viewしてよい。

## Rejected Alternatives

- virtualized listでもactive optionを常にDOM上へ保持するため、active indexをvisible rangeへ混ぜる案。
- passive scroll後にactive optionへ自動でscroll backする案。
- `aria-activedescendant`がDOM外IDを指す状態を一時的に許容する案。
- activeがないEnterで先頭候補を暗黙選択する既存挙動を維持する案。

## Counter Hypotheses

- active optionを常に保持したほうがkeyboard利用者にとって状態が安定する可能性がある。
- passive scrollでactiveを解除すると、直前のkeyboard選択状態を失うことが意図せず感じられる可能性がある。
- DOM外`aria-activedescendant`を短時間だけ許容しても実害が小さい可能性がある。

これらは、passive scroll時の閲覧意図とARIA参照先のDOM存在契約を優先するため採用しない。

## Contract Impact

- `docs/contracts/search.md`のStatic Global Search Dialog DOM契約を更新する。
- passive scroll中のviewport正本は`scrollTop`になる。
- active change originを区別し、keyboard navigation由来だけscroll into viewを許可する。
- `aria-activedescendant`同期は、参照先optionがDOM上に存在する場合だけ設定する。
- selection modelはactiveなしEnterで選択通知を発火しない。

## Remaining Work

- 非virtualized listにおけるoffscreen active解除契約は今回対象外とする。必要な場合は別Requestで扱う。
- passive scroll中のactive row属性更新は、まずrange再描画で扱う。既存DOM内のactive rowだけを更新する最適化は必要になった時点で別途検討する。

## Rollback

この判断を戻す場合は、search contract、selection model、virtualizer、static DOM controller、browser/node testsを同時に旧契約へ戻す。特に`aria-activedescendant`がDOM外IDを指さない契約を変更する場合は、アクセシビリティ上の影響を再確認する。
