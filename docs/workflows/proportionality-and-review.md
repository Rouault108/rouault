# 比例性・成果物発火・精査規則

この文書は、problem-solvingとfeature-changeに共通するR段階、R4段階実行overlay、Aレベル、成果物発火条件、計画精査、完了適合性精査、デルタ精査の正本です。

## 1. 比例性の原則

確認済みの変更内容と影響を扱える、最も低いR段階を採用します。

- 不明点だけを理由にR段階を上げない
- 不明点が仕様、契約、owner、source of truth、変更範囲、AcceptanceまたはSuccessを左右する場合だけ追加調査または昇格する
- 契約の確認、既存契約内の変更、契約自体の変更を区別する
- 論理的な判断を省略せず、R1／R2-liteでは単一成果物へ圧縮する
- 発火しない成果物や項目を長い`N/A`一覧として出力しない
- Optionalな改善を今回の必須範囲へ昇格しない
- 長期保守性という抽象理由だけで変更範囲を広げない

## 2. R段階

| R段階 | 判定基準 | 既定成果物 |
|---|---|---|
| R0 | 挙動・契約影響なし。誤字、コメント、履歴整理のみ | 限定直接修正＋対象状態とdiffの確認 |
| R1 | 原因または仕様が確定済み。一責務、少数ファイル、限定的影響 | Mini Brief |
| R2-lite | 複数ファイルまたは複数検証層にまたがるが、原因／Decision、owner、境界が明確 | Run Card |
| R2-full | 原因調査、実質的な複数案、横断的影響、または契約の解釈・競合がDecision、変更範囲、Acceptance／Successを左右する | 分離した分析と計画 |
| R3 | 仕様、公開・永続契約、owner、source of truth、コンポーネント境界、URL、データ形式、アクセシビリティ上の意味、削除、移行、非推奨化を実際に変更 | problem-solving: Handoff Record／feature-change: Decision Record＋Change Plan |

R4はR段階ではありません。R1、R2-lite、R2-full、またはfeature-changeのR3で承認済みとなった基本計画を、一括レビュー不能な場合にPhaseへ分解する段階実行overlayです。基本計画のCause／Decision、契約、owner、source of truth、Success／Acceptanceを変更しません。

R0では計画成果物と計画精査を作りません。対象状態を確認し、許可範囲を限定して直接修正し、修正後のdiffと対象状態だけを確認します。対象fileまたは編集箇所に既存差分が重なる場合は、既存変更を保持できる最小限の開始状態を確認します。差分帰属を判定できなければ直接修正せずR1へ昇格します。挙動または契約への影響が判明した時点でもR1以上へ昇格します。

### R段階を上げる肯定的条件

- 一責務としてレビューできない
- 実装可能で実質的に異なる候補が複数ある
- ownerまたはsource of truthを一意に決められない
- 公開・永続契約を変更する
- 削除、移行、非推奨化、破壊的変更を伴う
- アクセシビリティ上の意味または主要UX契約を変える

単に既存契約内であることを確認するだけではR2-fullへ上げません。契約解釈が未確定、契約間に競合がある、または確認結果がDecision、変更範囲、Acceptance／Successを変える場合に限ります。

ファイル数だけではR段階を決めません。小さなdiffでも契約変更ならR3になり得ます。大きな機械的renameでも、仕様と境界が確定していればR2-liteになり得ます。

## 3. Aレベル

| Aレベル | 判定基準 |
|---|---|
| A0 | 通常のdiff、テストログ、CI結果で十分 |
| A1 | 後日検証のため、hash、保存場所、取得時点、CI runなどの同一性保証が必要 |
| A2 | private／restricted Evidence、redaction、保持・失効、完全性証明が必要 |

Aレベルは変更リスクではなくEvidence保全の軸です。R段階と独立に判定します。A0は計画成果物への記載を省略できます。A1またはA2が発火した場合だけ、計画成果物にAレベル、保全対象、取得時点、同一性確認方法、保存場所を記載します。A2では加えてredaction、権限、保持・失効条件を記載します。A2のprivate／restricted情報は、通常のrepository権限と一時領域管理では不十分な機微情報を指し、repositoryが非公開であることだけではA2を発火させません。

## 4. 条件付き項目の発火条件

### 原因階層

Trigger／Direct Mechanism／Systemic／Escape Causeを詳細化するのは、複数の因果層が修正戦略または再発防止を左右する場合だけです。単一の直接原因で十分なら、原因と不変条件を一段で記録します。

### owner

現在／目標ownerを詳細化するのは、ownershipが原因、争点、変更対象のいずれかである場合です。既存owner内の変更なら「owner変更なし」と一文で足ります。

### source of truth

現在／目標source of truthを詳細化するのは、重複、移動、統合、追加、削除がある場合です。既存正本を維持する変更なら「正本変更なし」と一文で足ります。

### 複数案比較

実装可能で実質的に異なる候補が2案以上ある場合だけ行います。存在しないOptionを形式的に作りません。

### 反対仮説

次の場合だけ詳細化します。

- feature-change R3
- 採用Decisionに重大な不確実性がある
- 反対案が実装可能で、Acceptanceまたは契約判断を変える

### rollback

復旧が非自明、データ・URL・永続形式の移行がある、または実施後の取消しが高コストな場合だけ詳細化します。通常のコード差分はGit diffで戻せるため、独立項目を必須にしません。

### 手動確認

自動テストで観測できない視覚、読書体験、フォーカス遷移、実ブラウザー差、支援技術上の意味がAcceptanceに含まれる場合だけ要求します。

### Decision Record

R3で必須です。R2-fullでは、採用判断が長期的な制約となり、通常のChange Planだけでは理由が失われる場合に限り作成します。

### Delete／Breaking Change Gate

削除、互換性破壊、契約削除、migration、deprecationがある場合だけ作成します。

### Handoff Record

problem-solvingで確認した原因に対し、既存仕様・契約・owner・source of truth・境界内では修正できない場合だけ作成します。

### R4段階実行overlay／A1／A2成果物

`audited-mode.md`の各肯定的条件を独立に満たす場合だけ使用します。R4 overlayは実行分割の軸、A1／A2はEvidence保全の軸であり、相互に昇格条件としません。A1／A2の保全項目は発火した計画成果物へ重ね、形式的・予防的理由では独立成果物を増やしません。

## 5. 最小成果物

### R1 Mini Brief

必須:

- 対象状態
- 問題またはRequest
- 原因またはDecision
- 対象ファイルと対象箇所
- 変更理由
- 変更してよい範囲／変更してはいけない範囲
- 実際に影響する契約
- SuccessまたはAcceptance
- Verification
- out-of-scope
- Codexへ渡す限定実装条件

### R2-lite Run Card

R1に加えて必須:

- Evidence要約
- Repair Strategy CheckまたはDecision Check
- 関連するowner／source of truthの確認
- 変更間の追跡関係
- 必要なテスト層
- 必要な場合だけ手動確認

### R2-full

- problem-solving: Cause AnalysisとFix Planを分離
- feature-change: Decision AnalysisとChange Planを分離
- 複数案、原因階層、契約表は発火条件を満たす項目だけ記載

### R3

- problem-solving: Handoff Recordを作成し、feature-changeへ移行
- feature-change: Decision RecordとChange Plan
- Delete／Breaking Change Gateは対象変更がある場合だけ追加

### R4段階実行overlay

- R1、R2-lite、R2-full、またはfeature-change R3の基本計画を計画精査で承認した後にだけ適用する
- `shared/prompts/r4-phased.md`で全体Phase Mapを作り、Phaseごとの目的、依存、最終Acceptanceへの寄与を固定する
- Phase 1開始前には、全体Phase Mapと現在Phaseの詳細Phase Planを計画精査する。後続Phaseは最小限の概要でよく、前Phase Gateで次Phaseの詳細Phase Planを確定する
- 後続Phaseを十分に確定できる場合は、全Phase Plansを最初に承認してもよいが必須としない
- problem-solvingでは、全Phaseが既存仕様・契約・owner・source of truth・責務境界内に収まる場合だけ継続する
- problem-solvingでこれらの変更が必要なら、Phase Mapを作る前にR3 Handoffでfeature-changeへ移行する
- 各Phaseは承認済み基本計画の一部だけを実装し、独立したChange、Success／Acceptance、Verification、開始条件、完了条件を持つ
- 各Phaseの実装直前に、前Phaseまでの承認済み状態を含むcleanなGit境界、またはPhase対象外を含む全既存local差分の内容同一性snapshotでPhase開始基準を確定し、終了時状態との比較から現在Phaseで追加された差分を既存local差分および前Phase差分から分離する
- dirty working treeでは、Phase対象外の既存untracked fileはpathと内容hashで不変性を確認し、現在Phaseで変更する既存untracked fileは開始時内容を比較可能なsnapshotとして保持する
- Phase開始snapshotはrepository外またはworking treeへ影響しない一時領域に保持し、実装差分へ含めず、完了適合性精査と人間のPhase Gate終了まで保持する。A0ではGate後に破棄できる
- snapshotが通常のrepository権限と一時領域管理では不十分な機微情報を含む場合だけA2を発火させ、redaction、権限、保存場所を定義する。repositoryが非公開であることだけでは発火させない
- Phase対象範囲だけのsnapshotを既存local差分保護の根拠にしない
- 実装後変更集合にはtracked staged／unstaged差分、変更・削除した既存untracked file、実装中に新規作成したuntracked fileの内容またはdiff相当表現を含め、indexを変更しない
- Codexには承認済み基本計画、承認済み全体Phase Map、現在Phaseの詳細Phase Planを渡す
- Phase 2以降では既完了Phaseの完了結果とGate決定を引き継ぐ
- 非最終Phaseの完了は現在Phaseだけの完了であり、変更全体の完了を意味しない。最終Phaseでは全Phaseの完了結果、各Phase Gate、未完了または差し戻しPhase、Phase間依存、旧経路終了、全体の最終状態または変更範囲、基本計画の最終Acceptanceを閉じる
- Evidence保全の厳格さだけを理由にR4 overlayを適用しない。必要な保全はA1／A2で扱う

## 6. 追跡関係

IDは追跡に有用な範囲で使用します。R1／R2-liteでは一つの表または一行へ圧縮して構いません。

problem-solving:

```text
Failure → Cause → Change → Success → Verification
```

feature-change:

```text
Request → Decision → Change → Acceptance → Verification
```

IDごとに独立した長文節を作る必要はありません。

## 7. Verificationの扱い

Verificationの正本は、観測対象、判定基準、必要な環境です。コマンド文字列自体を契約として固定した場合を除き、同じSuccess／Acceptanceを判定できる同等手段への置換を認めます。

計画時には、実装完了を判定できる観測契約があれば足ります。ログ名、保存場所、スクリーンショット名、コマンドオプションなどは、判断、検証可能性、またはA1／A2要件を左右するときだけ固定します。推奨コマンドは既知の場合だけ記載し、コマンド未確定だけを計画Blockerにしません。Codex完了報告では、実際に実行したコマンド、作業ディレクトリ、結果を記録します。

計画外に追加した検証の失敗は、次のいずれかに該当する場合だけ今回のBlockerとします。

- 今回の変更が原因である
- 承認済み計画上の必須Verificationである
- Success／Acceptanceまたは契約整合を否定する

## 8. 精査の役割分離

### 8.1 計画精査

計画精査を、変更妥当性を判断する中心的な精査とします。実装開始前に`shared/prompts/chatgpt-plan-review.md`を使用し、次を確定します。

- CauseまたはDecisionが対象状態とEvidenceに十分支えられている
- 採用修正戦略または変更機構がFailureまたはRequestへ直接対応する
- owner、source of truth、責務境界、契約影響が実装を一意に導ける
- 対象、許可範囲、禁止範囲、out-of-scopeが矛盾しない
- Success／Acceptanceが変更目的を表し、Verificationで判定可能である
- Codexへ未決の仕様、契約、owner、削除、移行判断を委ねていない
- 最も低いR段階と条件付き成果物が選ばれている

計画精査のBlockerは、そのまま実装すると採用機構、変更範囲、契約、Success／Acceptanceの再決定、誤実装、契約違反、または完了判定不能を招く事項に限定します。

- CauseまたはDecisionを選べるEvidenceが不足または矛盾している
- 採用機構がFailureまたはRequestを解決しない
- owner、source of truth、契約、変更境界が未決または競合している
- 必要なHandoff、Gate、R段階変更が欠落している
- Success／Acceptanceが欠落、矛盾、または検証不能である
- 実装対象、許可範囲、禁止範囲が実行可能な粒度にない
- 仕様・契約上の判断がCodexへ残されている

指摘を修正しても採用機構、変更範囲、契約、Success／Acceptance、Verificationの実現可能性が変わらない場合、原則としてBlockerにしません。

Evidence取得方法の細部、報告形式、ログ名、保存形式、補助的な追加確認は、それがCause／Decision、変更範囲、Verificationの実現可能性、またはA1／A2要件を左右する場合だけ計画Blockerにします。

計画精査でBlockerが解消し、人間が採用した成果物を承認済み計画とします。以後は新Evidenceまたは重大な見落としがない限り、この計画を実装と完了適合性精査の基準として固定します。

重大な見落としとは、Cause／Decision、採用機構、変更範囲、責務境界、契約、Success／Acceptance、Verificationの実現可能性のいずれかを変更する新事実です。単なる表現改善、補助Evidence、別設計案は含みません。

### 8.2 完了適合性精査

実装後は`shared/prompts/chatgpt-completion-review.md`で、必要な開始差分基準、実装後変更集合、最終構造、Verification、完了可否を一工程で確認します。承認済み計画への適合性と完了条件の充足を確認する精査であり、計画精査を再実行する場ではありません。cleanな通常実装はbranch／HEADとcleanなstatusを基準とします。dirtyでも既存差分pathと今回範囲が非交差で帰属が明確ならstatusとpath-level確認に留め、交差または帰属不明の場合だけ必要なpathの開始内容を保持します。R4では`shared/prompts/r4-completion-overlay.md`を併用し、Phase開始基準、現在Phase差分、全体Phase Map、既完了Phaseの結果とGate決定を条件付き入力として使用します。

完了適合性精査のBlockerは、次に限定します。

- 誤動作またはSuccess／Acceptance未達
- 計画した契約、owner、source of truth、最終構造との不整合
- 未承認の実質的な計画逸脱
- 禁止範囲への接触またはout-of-scope混入
- 契約、owner、source of truth、Success／Acceptance、許可範囲を変える未計画変更
- 未計画のfallback、compatibility shim、新旧並行経路
- local既存差分の破壊または計画変更への混入
- indexの意図しない変更
- 新規または変更されたuntracked fileの内容が実装後変更集合に含まれず、指定された精査範囲への適合性を判定できない
- 開始差分基準の不足により、今回差分と既存local差分の帰属、既存差分の保持、または計画適合性を実際に判定できない
- R4でPhase開始基準またはPhase追跡情報がなく、現在Phase差分を既存local差分または前Phase差分から区別できない
- 必須Verificationが未実施または失敗し、完了を判定できない
- 新EvidenceがCause、Decision、修正機構、契約前提を否定する
- 今回の変更により重大な回帰が生じた
- problem-solvingで処理できない仕様・契約変更が実装へ混入した

承認済み計画の目的と許可範囲内にあり、契約、owner、source of truth、Success／Acceptanceを変えない付随的変更は、理由と影響を報告できれば計画逸脱とは扱いません。

次だけを理由に完了Blockerとしません。

- 承認済み計画とは異なる別設計案が考えられる
- 補助的なEvidence、追加コマンド、追加スクリーンショットがあると説明しやすい
- Evidenceや完了報告の表現・保存形式をさらに整えられる
- Acceptance外の将来条件も追加検証できる
- 新Evidenceなしに計画時のR段階、責務境界、成果物構成を再検討できる

次を満たせば完了可能です。

- Blockerがない
- CauseまたはDecisionとChangeが対応する
- ChangeとSuccessまたはAcceptanceが対応する
- SuccessまたはAcceptanceと必要なVerificationが対応する
- 実際に変更した契約と実装が整合する
- owner／source of truthを変更した場合、最終構造が承認済み計画と一致する
- Source-state integrityがpassであり、必要な場合は開始差分基準からlocal既存差分と実装後変更集合を区別でき、indexが意図せず変更されていない
- 新規または変更されたuntracked fileの内容をstageせず精査できる
- R4ではPhase開始基準を各Phaseへ適用して現在Phase差分を区別でき、全体閉鎖時には全Phase結果とGate決定を追跡できる
- 未承認の実質的な計画逸脱とout-of-scope変更がない
- 新Evidenceによる再調査条件がない

独立した最終Gateは、R4段階実行overlayのPhase移行、R4全体の閉鎖、外部CIまたは手動確認が後から確定する場合、独立承認者が必要な場合、またはユーザーが明示した場合だけ追加します。R1／R2-liteでは原則として完了適合性精査へ統合します。

完了報告は、各ChangeとSuccess／Acceptanceについて、実装箇所、Verification、結果を追跡できる最小限の完成度で足ります。計画時のDecision、代替案、反対仮説、Evidence取得過程を再記述する必要はありません。

### 8.3 RecommendedとOptional

Recommendedは完了可能だが、承認済み計画の達成度または今回の変更で新たに生じた保守性を改善する合理性が高い事項です。

- 追跡関係の軽微な欠落
- 計画意図を弱めるがSuccess／Acceptanceを否定しない実装上の問題
- 今回の変更で新たに生じた非必須の検証不足

Optionalは表現改善、将来リファクタリング、別設計案です。今回の計画を拡張しません。RecommendedまたはOptionalだけで完了不可としません。

## 9. デルタ精査

計画精査、完了適合性精査のいずれも、2回目以降は次に限定します。

- 前回Blocker／Recommendedへの対応
- 前回版からのdiff
- 残存する追跡不整合
- 新たに確認された計画不適合またはSuccess／Acceptance未達
- 新Evidenceにより既存判断または完了判定が変わる点

新Evidenceまたは重大な見落としがない限り、採用済みCause／Decision、修正戦略、責務境界、R段階、成果物構成、Success／Acceptanceを再設計しません。

テストまたはCI通過だけを完了根拠にしません。RecommendedまたはOptionalだけを完了阻害理由にしません。
