# Prompt overlay: R4 Phase完了適合性精査

R4の場合だけ、`chatgpt-completion-review.md`へ次を追加します。通常のR1〜R3では使用しません。

```text
精査範囲:
- R4 Phase <Phase ID>／基本計画全体:
- 現在Phaseは最終Phaseか:

R4承認情報:
- 承認済み基本計画:
- 承認済み全体Phase Map:
- 現在Phase Plan:
- 既完了Phaseの完了適合性精査結果とPhase Gate決定（Phase 2以降だけ）:

Phase追跡情報:
- Phase開始基準:
  - cleanなGit境界: 前Phaseまでの承認済み状態を含むbranch／HEADとcleanなstatus
  - dirty working tree: 全tracked staged／unstaged差分の開始patch
  - Phase対象外の既存untracked file: pathと内容hash
  - 現在Phaseで変更する既存untracked file: 開始時内容をdiff可能に保持したsnapshot
  - snapshotがrepository外またはworking treeへ影響しない一時領域にあり、人間のPhase Gate終了まで保持されていること
- 現在Phaseで追加された差分:
  - Phase開始基準と終了時状態との差分
  - 実装中に新規作成したuntracked fileの内容またはdiff相当表現
  - 変更・削除した既存untracked fileの差分
- 基本計画全体を閉じる場合だけ:
  - 全Phaseの完了結果一覧
  - 各Phase Gateの決定
  - 未完了または差し戻しPhaseの有無
  - Phase間依存と旧経路終了
  - 全体の最終状態または変更範囲
  - 基本計画の最終Success／Acceptance

追加確認:
- 現在Phaseだけを実装し、将来Phaseを先取りしていないか
- Phase開始条件と完了条件を満たしているか
- 現在Phase差分を既存local差分および前Phase差分から区別できるか
- 非最終Phaseでは現在Phaseだけの完了を判定しているか
- 最終Phaseで基本計画全体を閉じる場合、全Phase結果、Gate、依存、旧経路終了、最終Success／Acceptanceを確認できるか

追加Blocker:
- Phase開始基準がなく、現在Phase差分を既存local差分または前Phase差分から区別できない
- 現在Phase Plan外の将来Phaseを先取りしている
- 非最終Phaseを変更全体の完了として扱っている
- 基本計画全体を閉じるために必要な全Phase結果、Gate、依存、旧経路終了、最終Success／Acceptanceを確認できない

出力では精査範囲を先頭に示し、結論へ`phase-complete`を追加してください。
- `phase-complete`: 非最終Phaseについて現在Phaseだけが完了した。変更全体の完了を意味しない
- `complete`: 最終Phaseの完了に加え、全Phase Gate、Phase間依存、旧経路終了、基本計画の最終Success／Acceptanceが閉じ、基本計画全体が完了した

R4のPhase追跡は適合性判定のための通常記録です。A1／A2はEvidence保全が独立に発火した場合だけ重ねてください。
```
