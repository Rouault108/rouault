# 分析・精査の実行面

## 1. 適用範囲と正本

本書は、RouaultでChatGPTによる分析・計画・精査を実行する実行面（surface）と、その権限を定めます。ChatとWorkを同じ論理的責務の異なる実行面として扱います。Workを新しいworkflow層またはGateとして追加しません。

R段階、Aレベル、成果物発火条件、Gate、精査重大度と完了条件は[比例性と精査](proportionality-and-review.md)、対象状態とGit Evidence、Codex入出力は[参照状態・local実装・Codex規則](source-state-and-codex.md)を正本とします。R4は基本R段階への段階実行overlayであり、[例外・保全運用](audited-mode.md)に従います。本書はこれらを再定義しません。

## 2. 責務と実行面

| 責務 | 実行面・担当 | Rouaultでの権限 |
|---|---|---|
| Evidence調査、原因分析、仕様判断、計画作成、計画精査、完了適合性精査 | ChatまたはWork | 対象repositoryをread-onlyで参照し、計画・精査成果物を作成する |
| 限定実装と実装時Verification | Codex | 対象状態を確認し、承認された変更範囲だけを実装する |
| 計画の採用、発火したGateでの承認・差し戻し、最終的な採否、commit、merge、公開の判断 | 人間 | 既存workflowで定めた承認・採否を決定する |

Projectを利用する場合は任意のcontext containerとして扱います。Projectの存在や会話の継続は、対象状態の同定、計画の承認、Gateの通過を代替しません。

これらはRouaultの運用上の権限です。Workのコード編集能力やコマンド実行能力の有無を規定するものではありません。

## 3. 実行面の独立性と選択指針

Chat／Workの選択は、基本R段階、Aレベル、R4 overlayの要否、Gate、必須成果物、精査・完了判定の意味を変更しません。実行面を切り替えるだけでは再計画や追加Gateを要求しません。

| 作業の形 | 選択の目安 |
|---|---|
| Evidenceが限定され、対話で論点を確定する。少数ファイルの判断やデルタ精査が中心 | Chat |
| 多数の実装・tests・docsを横断し、Evidence探索、多段階の分析、成果物作成をまとめて行う | Work |

この表は必須条件ではありません。R2-liteでもEvidenceが広く分散していればWorkを使えます。R3でも論点とEvidenceが限定されていればChatを使えます。利用可能な機能と、次節の利用条件を満たす範囲で選択します。

## 4. Evidenceの利用条件

Evidenceを実行面へ渡す前に、そのEvidenceに適用される組織・workspaceのdata handling policy、アクセス権限、redaction、保存・保持・失効条件、local／cloud利用条件への適合性を確認します。この利用可否（surface eligibility）はR段階とAレベルから独立した前提条件であり、新しい分類レベルやGateを追加するものではありません。CodexへEvidenceを渡す場合も適用policyを満たす必要があります。

local folderへアクセスできることだけを、処理や保存がlocal内で完結する根拠にしません。実際の製品機能、契約、設定、workspace policyを確認します。適合性を確認できないEvidenceは渡さず、許可されたEvidenceの提示方法または実行面を選びます。判断に必要なEvidenceが欠ける場合は、その不足と判定への影響を報告します。

Aレベルは既存正本に従うEvidence保全の軸です。Workの選択やrepositoryが非公開であることだけではA2を発火させません。A2が発火する場合は既存の保全要件も併せて満たします。

## 5. 対象状態とread-only境界

分析・計画・精査中は、対象repositoryの実装状態をread-onlyとして扱います。実装、tests、docs、generated files、lockfile、untracked files、index、branch、HEAD、remote-tracking refをこの責務の中で変更しません。問題を発見しても、自動修正、整形、stage／unstage、同期によって解消しません。

計画や精査レポート自体は作成・改訂できます。通常は対象repository外の許可された保存先に置きます。repositoryへの収録が必要なら、それ自体を明示された変更として扱い、精査と切り分けた承認範囲内の実装として反映します。作業用ファイルも対象working treeを変えない場所に置きます。

参照や証拠確認に用いる操作は対象状態を変更しないものに限ります。テスト等が生成物やsnapshotを更新する場合、その操作は精査中の対象repositoryでは実行せず、Codexへ必要なVerification結果を求めます。隔離したコピーで確認した結果は、対象working treeでの結果と同一視せず、参照状態と限界を示します。

Workがlocal folderを利用できる環境でも、folderを開いたことだけではGit状態を証明できません。branch、HEAD、index、staged／unstaged、untracked、差分帰属は、[source-state規則](source-state-and-codex.md)のGit Evidenceに基づき確認します。

R0の限定直接修正は既存のR0規則に従う実装行為です。本書はR0へ計画成果物や計画精査を追加せず、分析・精査から暗黙に実装へ移行する権限も与えません。

## 6. 計画成果物と実装契約

Chat／Workの会話履歴、調査過程、途中仮説、却下案、未承認成果物をCodexの実装仕様にしません。R1以上では、人間が採用した承認済み計画成果物を実装仕様として固定し、source-state規則で定めたEvidence・制約とともに渡します。R4では既存のPhase関連入力も必要です。

計画が参照する仕様・Evidenceは必要な範囲で渡せますが、会話から不足仕様や新しい変更範囲を補完しません。計画に曖昧さや対象状態との差異があれば、source-state規則に従って報告します。

計画作成と計画精査を同じtaskで行うことは禁止しません。判断密度が高い場合は、計画成果物をいったん固定し、対象状態と必要なEvidenceを添えて別のreview contextで精査することを推奨します。これはRecommendedであり、独立reviewや追加Gateを一律に必須化しません。精査結果のapprove-candidateは人間の承認を代替しません。

## 7. 精査結果の返却

計画精査は[計画精査prompt](shared/prompts/chatgpt-plan-review.md)、実装後は[完了適合性精査prompt](shared/prompts/chatgpt-completion-review.md)に従います。

Blockerや計画逸脱を発見しても、精査中に対象repositoryを修正しません。各promptで定義した意味に従い、request-changes、re-investigate、replan-requiredを返します。修正可能な実装問題はCodexへ戻し、原因・前提の問題は再調査、Decision・契約・境界等の変更は再計画へ戻します。再調査または再計画により承認済み計画を更新する場合は、必要な計画精査と人間の承認を経てから実装を再開します。完了適合性精査での承認済み計画内のrequest-changesは計画更新を要求せず、次のCodex実装で修正した後、完了適合性のデルタ精査へ戻します。

Recommended／Optionalだけを完了阻害理由にしません。R4のPhase完了・全体完了とGateの扱いも既存overlayに従い、実行面を理由に変更しません。
