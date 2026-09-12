# Prompt: Shared R4 Phased-execution Overlay

```text
Rouaultの承認済み基本計画が一括レビュー不能であることを確認し、段階実行のためのR4 Phase Mapと現在Phaseの詳細Phase Planを作成してください。
R4は独立したR段階ではなく、R1／R2-lite／R2-full／feature-change R3の承認済み基本計画へ重ねるoverlayです。基本計画のCause／Decision、契約、owner、source of truth、Success／Acceptanceを変更しないでください。
R4の必須条件がない場合はoverlayを適用せず、承認済み基本計画を通常経路で実装してください。
problem-solvingでは、全Phaseが既存仕様・契約・owner・source of truth・責務境界内に収まる場合だけ継続してください。これらの変更が必要なら、Phase Mapを作らずR3 Handoffでfeature-changeへ移行してください。

入力:
- 対象状態:
- workflow mode: problem-solving／feature-change
- 基本R段階: R1／R2-lite／R2-full／R3（feature-changeのみ）
- 承認済み基本計画: Mini Brief／Run Card／Cause Analysis＋Fix Plan／Decision Analysis＋Change Plan／Decision Record＋Change Plan
- 基本計画の計画精査結果:
- R4 overlayの必須条件と追加の肯定的条件:
- 対象契約と維持する境界:
- Phase候補:
- 現在Phase ID:
- 承認済み全体Phase Map（Phase 2以降だけ）:
- 既完了Phaseの完了適合性精査結果とPhase Gate決定（Phase 2以降だけ）:
- 制約:
- AレベルとEvidence保全要件（A1／A2が独立に発火した場合だけ）:

出力:
1. R4 overlay発火可否と理由
2. 承認済み基本計画の識別と固定事項
3. workflow mode継続可否
4. 全体Phase Map
   - Phase ID
   - 目的
   - Phase間依存
   - 最終Success／Acceptanceへの寄与
   - 人間のPhase Gate
   - 中間状態の要約
5. 現在Phaseの詳細Phase Plan
   - Phase ID
   - 対象ファイル／責務
   - 開始条件
   - Phase開始基準の取得要件
     - 前Phaseまでの承認済み状態を含むcleanなGit境界を使用できる場合: branch／HEADとcleanなstatus
     - dirty working treeから開始する場合: branch／HEAD、機械可読な全status、全tracked staged／unstaged差分の内容同一性を比較できるsnapshot
     - Phase対象外の既存untracked file: pathと内容hashで不変性を確認する
     - 現在Phaseで変更する既存untracked file: 開始時内容をdiff可能なsnapshotとして保持し、binaryは開始時内容を比較可能な形式で保持する
     - snapshotはrepository外またはworking treeへ影響しない一時領域に保持し、Phase実装差分へ含めない
     - snapshotは完了適合性精査と人間のPhase Gate終了まで保持し、A0ではGate後に破棄できる
     - snapshotが通常のrepository権限と一時領域管理では不十分な機微情報を含む場合だけA2を発火させ、redaction、権限、保存場所を定義する。repositoryが非公開であることだけでは発火させない
     - Phase対象範囲に限定したdiffは補助情報として取得してよいが、既存local差分保護の唯一の根拠にしない
     - 前Phaseまでに承認済みとなった状態
   - 現在Phaseで追加された差分の識別方法
     - cleanなGit境界では開始HEADとの差分
     - dirty working treeでは全既存local差分の開始snapshotと終了時のlocal差分状態との差分
     - 実装中に新規作成したuntracked fileは内容またはdiff相当表現を取得し、通常のgit diffだけに依存しない
     - 変更・削除した既存untracked fileを差分として含め、binaryはpath、種類、サイズ、hashと確認結果を記録する
     - indexを変更せず、新規または変更されたuntracked fileをstageしない
   - Change
   - Success／Acceptance
   - Verification
   - 完了条件
   - 許可範囲／禁止範囲／out-of-scope
   - Codex限定実装条件
6. 後続Phaseの概要
   - Phase ID
   - 目的
   - 依存
   - 詳細化するPhase Gate
7. 中間状態で許可する経路／禁止する経路
8. 旧経路の削除Phase（存在する場合だけ）
9. 非自明なrollback（必要な場合だけ）
10. AレベルとEvidence保全（A1／A2が独立に発火した場合だけ）

一つのPhaseへ複数の独立Cause／Decisionを詰め込まないでください。Phase Planは承認済み基本計画の部分実装であり、新しい仕様判断または契約判断を含めません。
Phase 1開始前には、全体Phase MapとPhase 1の詳細Phase Planを計画精査してください。後続Phaseは目的、依存、最終Acceptanceへの寄与が分かる概要で足ります。前Phase Gateで次Phaseの詳細Phase Planを確定し、差分だけを計画精査してください。後続Phaseを十分に確定できる場合は、全Phase Plansを最初に承認しても構いません。
Codexには承認済み基本計画、承認済み全体Phase Map、現在Phaseの詳細Phase Plan、Phase 2以降では既完了Phaseの結果とGate決定、Phase開始基準を渡します。各Phaseの実装直前に、前Phaseまでの承認済み状態を含むcleanなGit境界、またはPhase対象外を含む全既存local差分の内容同一性snapshotのいずれかでPhase開始基準を確定してください。既存untracked fileは、Phase対象外ならpathと内容hash、現在Phaseで変更するなら開始時内容snapshotで追跡します。snapshotはrepository外またはworking treeへ影響しない一時領域に置き、Phase Gate終了まで保持します。A0ではGate後に破棄できます。通常のrepository権限と一時領域管理では不十分な機微情報を含む場合だけA2を発火させ、repositoryが非公開であることだけでは発火させません。Phase対象範囲だけのsnapshotを既存local差分保護の根拠にしてはいけません。開始基準と終了時状態の比較に加え、実装中に新規作成したuntracked file、変更・削除した既存untracked fileの内容またはdiff相当表現をstageせず取得し、現在Phaseで追加された差分を分離します。各Phase完了時には、`chatgpt-completion-review.md`と`r4-completion-overlay.md`を併用し、承認済み全体Phase Map、Phase開始基準、現在Phase差分、既完了Phaseの結果とGate決定を渡します。次Phaseへ進む前に人間がPhase Gateを判断します。
非最終Phaseのphase-completeは現在Phaseだけの完了を意味します。最終Phaseでは、全Phaseの完了結果一覧、各Phase Gateの決定、未完了または差し戻しPhaseの有無、Phase間依存、旧経路終了、全体の最終状態または変更範囲、基本計画の最終Success／Acceptanceを確認し、精査範囲を基本計画全体としてcompleteを判定してください。Phase境界の記録はR4の適合性追跡であり、A1／A2のEvidence保全とは別です。
```
