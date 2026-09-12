# R4段階実行overlay／A1／A2例外・保全運用

R4、A1、A2は通常運用を厳密に見せるための段階ではありません。R4は実行分割、A1／A2はEvidence保全の独立した軸です。一方の発火だけを理由に他方を発火させません。

## R4段階実行overlayの発火条件

R4は独立したR段階ではありません。R1、R2-lite、R2-full、またはfeature-changeのR3で基本計画を承認した後、次の必須条件をすべて満たす場合だけ適用します。

必須条件:

- 一つのdiffとしてレビューできない
- 複数Phaseが独立したSuccess／AcceptanceとVerificationを持つ
- Phase間の順序または中間状態を管理する必要がある

次は追加の肯定的条件です。R4の有用性を強めますが、すべてを満たす必要はありません。

- 一部Phaseの完了だけで旧経路と新経路が危険に並存する
- 複数担当者または長期間の実行で独立したPhase境界が必要である
- 人間による中間承認が必要である

problem-solvingでは、全Phaseが既存仕様・契約・owner・source of truth・責務境界内に収まることをmode継続条件とします。これらの変更が必要ならR4を開始せず、R3 Handoffでfeature-changeへ移行します。

R4では最低限次を作成します。

- 承認済み基本計画への参照
- 全体Phase Map
- Phaseごとの目的、依存、最終Acceptanceへの寄与
- 現在Phaseの詳細Phase Plan
- 後続Phaseの最小限の概要
- 各Phaseの開始条件・完了条件
- Phase開始基準の取得要件
- 現在Phaseで追加された差分の識別方法
- 中間状態で許可される経路と禁止される経路
- 人間のPhase Gate
- 非自明なrollback（必要な場合だけ）
- 最終的に削除する旧経路（存在する場合だけ）

Phase 1開始前には全体Phase MapとPhase 1の詳細Phase Planを計画精査します。前Phase Gateで次Phaseの詳細Phase Planを確定し、基本計画のDecision、契約、owner、source of truth、最終Acceptanceは再設計しません。後続Phaseを十分に確定できる場合は、全Phase Plansを最初に承認しても構いません。各Phaseの実装直前に、前Phaseまでの承認済み状態を含むcleanなGit境界、またはPhase対象外を含む全既存local差分の内容同一性snapshotでPhase開始基準を確定し、終了時状態との差から現在Phase差分を分離します。dirty working treeでは全tracked staged／unstaged差分を比較可能に保持し、Phase対象外の既存untracked fileはpathと内容hashで不変性を確認します。現在Phaseで変更する既存untracked fileは開始時内容を比較可能なsnapshotとして保持します。snapshotはrepository外またはworking treeへ影響しない一時領域に置き、完了適合性精査と人間のPhase Gate終了まで保持します。A0ではGate後に破棄できます。通常のrepository権限と一時領域管理では不十分な機微情報を含む場合だけA2を発火させ、repositoryが非公開であることだけでは発火させません。Phase対象範囲だけのsnapshotを既存local差分保護の根拠にしません。実装中に新規作成したuntracked fileと変更・削除した既存untracked fileは、stageせず内容またはdiff相当表現を現在Phase差分へ含め、indexを変更しません。

各Phaseは基本計画のCause／Decision、契約、owner、source of truth、最終Acceptanceを変更しません。変更が必要になった場合はR4内で再判断せず、基本計画を再作成・再精査します。非最終Phaseの完了は現在Phaseだけの完了です。最終Phaseでは、全Phaseの完了結果一覧、各Phase Gateの決定、未完了または差し戻しPhase、Phase間依存、旧経路の終了、全体の最終状態または変更範囲、基本計画の最終Acceptanceを確認してR4全体を閉じます。Phase境界の記録は通常の適合性追跡であり、A1／A2を自動的に発火させません。

## A1の発火条件

- 後日、同じ成果物またはCI結果であることを確認する必要がある
- hash、CI run URL／ID、取得時点、保存場所のいずれかが完了判断の同一性に必要である
- 通常の会話内報告だけでは、後日の再検証に必要な同一性を失う

A1では、発火した計画成果物に次だけを追加します。独立成果物は原則として作りません。

- 保全対象
- 取得時点
- hashまたは同一性確認方法
- 保存場所またはCI run

## A2の発火条件

A2のprivate／restricted Evidenceとは、通常のrepository権限、CI権限、一時領域管理だけでは不十分で、redaction、追加のアクセス制限、保持・失効管理を必要とする情報です。repositoryが非公開であることだけではA2を発火させません。

- private／restricted Evidenceを扱う
- redaction前後の同一性を保証する必要がある
- Evidenceの保持、失効、閲覧権限を管理する必要がある
- 通常のログ、CI URL、hashだけでは監査要求を満たせない

A2では最低限次を作成します。

- Evidence inventory
- redaction方針
- 保存場所と権限
- hashまたは同一性確認方法
- 保持・失効条件
- 誰が何を検証できるか

## 非発火例

- ファイル数が多いだけ
- Evidence保全を厳格にしたいだけ
- 念のため履歴を残したいだけ
- 将来問題になるかもしれないという抽象的懸念
- 通常のdiff、テストログ、CI結果で十分な変更
- 単一責務として一括レビューできる機械的変更

旧R4 schemaやvalidatorを日常運用の正本へ置きません。実際にR4 overlayまたはA1／A2が発火した場合、対象変更に必要な項目だけを定義し、旧schemaとの互換性維持を目的とするshimや並行経路を作りません。
