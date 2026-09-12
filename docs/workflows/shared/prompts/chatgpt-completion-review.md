# Prompt: ChatGPT完了適合性精査

この精査は、実装後変更集合、最終構造、Verification、完了可否を一工程で確認します。承認済み計画への適合性を判定し、計画の妥当性を再審査しません。source-stateの詳細は`../../source-state-and-codex.md`を正本とし、R4の場合だけ`r4-completion-overlay.md`を併用します。

実行面と権限の正本は[分析・精査の実行面](../../analysis-and-review-surfaces.md)です。

```text
RouaultのCodex実装について、承認済み計画への適合性と完了可否を精査してください。
本精査はChatまたはWorkで実行できます。実行面によってR段階、Aレベル、Gate、精査契約を変更しないでください。
精査中は対象repositoryの実装状態をread-onlyとして扱い、実装・tests・docs・生成物・untracked files・Git状態を変更しないでください。精査レポートは対象repository外の許可された場所へ作成できます。
Blockerまたは計画逸脱を発見しても、この精査内で自動修正しないでください。下記の意味に従ってrequest-changes／re-investigate／replan-requiredを返してください。
request-changesは承認済み計画の範囲内で次のCodex実装へ戻し、修正後に完了適合性のデルタ精査を行います。計画更新や再承認を一律には要求しません。
re-investigateは原因・前提の再調査へ戻し、承認済み計画を更新する場合は必要な計画精査と人間の承認を経て実装を再開します。
replan-requiredは再計画・計画精査・人間の承認へ戻してから、次のCodex実装へ進みます。
テスト通過だけで判断せず、最初に実装後変更集合と最終構造を確認してください。
新Evidenceまたは重大な見落としがない限り、計画精査を再実行しないでください。

対象状態:
- 参照したGitHub branch／commitまたは提示状態:
- local branch／HEAD:
- 開始時status:
- Source-state入力:
  - clean／dirty非交差／帰属曖昧のいずれか
  - `source-state-and-codex.md`でその区分に必要とされる最小情報

承認済み計画:
[計画精査済みのMini Brief／Run Card／Fix Plan／Change Plan]

実装情報:
- git status --short:
- tracked fileのstaged／unstaged差分:
- untracked変更集合:
  - 新規fileの内容またはdiff相当表現
  - 変更・削除した既存untracked fileの差分
  - binaryのpath、種類、サイズ、hashと確認結果
- 最終構造:
- Codex報告:
- Verification／CI結果:
- 発火した場合だけ手動確認結果:

確認:
- 計画したChangeが実装されているか
- `source-state-and-codex.md`に従い、既存local差分と今回差分の帰属、既存差分の保持、index不変性を判定できるか
- 実装後変更集合がtracked差分と新規・変更・削除されたuntracked fileを含み、通常のgit diffだけに依存していないか
- ChangeとSuccess／Acceptance、Success／Acceptanceと必要なVerificationが対応するか
- 対象、許可範囲、禁止範囲、out-of-scopeに従っているか
- 契約、owner、source of truth、最終構造が計画と一致するか
- 未計画のfallback、compatibility shim、新旧並行経路、仕様・契約判断が混入していないか
- 今回の変更による重大な回帰、または計画前提を否定する新Evidenceがないか

Verificationの正本は観測対象、判定基準、必要環境です。コマンド文字列を契約として固定した場合を除き、同じSuccess／Acceptanceを判定できる同等手段を認めてください。
計画外に追加した検証の失敗は、今回の変更が原因、計画上の必須Verification、またはSuccess／Acceptance・契約整合を否定する場合だけBlockerにしてください。

Blockerは次に限定してください:
- Success／Acceptance未達または誤動作
- 契約、owner、source of truth、最終構造の不整合
- 未承認の実質的な計画逸脱
- 禁止範囲またはout-of-scopeへの接触
- 契約、owner、source of truth、Success／Acceptance、許可範囲を変える未計画変更
- 未計画のfallback、shim、新旧並行経路
- local既存差分の破壊、混入、またはindexの意図しない変更
- 実装後変更集合または必要な開始差分基準の不足により、適合性を実際に判定できない
- 必須Verificationが未実施または失敗し、完了を判定できない
- 計画前提を否定する新Evidenceまたは重大な回帰
- problem-solvingで処理できない仕様・契約変更の混入

承認済み計画の目的と許可範囲内にあり、契約、owner、source of truth、Success／Acceptanceを変えない付随的変更は、理由と影響を報告できれば計画逸脱とは扱わないでください。

次だけを理由にBlockerにしないでください:
- 別の設計案が考えられる
- 補助的Evidence、追加コマンド、追加スクリーンショットがあると説明しやすい
- Evidenceまたは完了報告の形式をさらに整えられる
- Acceptance外の追加検証が可能である
- 新Evidenceなしに計画時のR段階、責務境界、成果物構成を再検討できる

出力:
1. 結論: complete／request-changes／re-investigate／replan-required
2. Blocker
3. 計画適合性とChange→Success／Acceptance→Verificationの対応
4. 計画との差異、新Evidence、未検証事項
5. Source-state integrity: pass／indeterminate／fail。passでは詳細を省略し、indeterminate／failの場合だけ不足情報または破壊・混入を説明する
6. 完了可否と、その判断に必要な最小限の根拠
7. 発火した場合だけRecommended／Optional、workflow移行または独立した最終Gate
8. ユーザーが明示的に要求した場合だけコミットメッセージ案

結論の意味:
- `complete`: 指定された基本計画全体が完了した
- `request-changes`: 指定された精査範囲に修正可能なBlockerがある
- `re-investigate`: 新Evidenceにより原因または前提の再調査が必要である
- `replan-required`: 基本計画のDecision、契約、境界、Success／Acceptanceの再計画が必要である

完了報告は、各ChangeとSuccess／Acceptanceについて実装箇所、Verification、結果を追跡できる最小限で足ります。計画時のDecision、代替案、反対仮説、Evidence取得過程を再記述しないでください。
重大な見落としとは、Cause／Decision、採用機構、変更範囲、責務境界、契約、Success／Acceptance、Verificationの実現可能性を変える新事実です。
2回目以降は、前回指摘、前回版からのdiff、更新後Verificationだけを主対象としてください。RecommendedまたはOptionalだけを完了阻害理由にしないでください。commit、merge、公開の最終判断は人間が行います。
```
