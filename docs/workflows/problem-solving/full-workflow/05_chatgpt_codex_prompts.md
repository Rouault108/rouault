# 05. ChatGPT / Codex用プロンプト集

このファイルは、ChatGPT / Codexへ渡すプロンプトの正本です。ただし、R判定、テンプレート、Rouault固有契約、完了条件は各正本ファイルに従います。

## 1. 位置づけ

このファイルは、ChatGPTやCodexに作業を依頼するためのプロンプト集です。

```text
- ChatGPTには、調査、整理、設計精査、置換案作成、diff精査を依頼する
- Codexには、限定された実装作業だけを依頼する
- Codexには設計判断をさせない
- Codexの自己確認は参考情報であり、証拠にしない
- 最終判断は人間が行う
- ChatGPT / Codexへ渡す情報は、再現と判断に必要な最小範囲に限定し、個人ノート本文や非公開情報は可能な限りredactする
```

## 2. ChatGPT: 初動整理プロンプト

```text
Rouaultで次の問題が発覚しました。

以下の情報だけを使い、まず入口判定、重大度、リスク段階、必要成果物を整理してください。
原因はまだ断定しないでください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、Evidenceで検証可能な形にする

入力:
- 症状:
- 再現手順または再現コマンド:
- 期待結果:
- 実際の結果:
- 失敗ログ:
- 環境:
- GitHub branch / commit:
- local差分:
- CI run / log:
- 既知の範囲外問題:
- redaction済み情報 / 共有不可情報:

出力:
1. 問題の仮定義
2. 重大度
3. リスク段階
3a. 監査保証レベル A0 / A1 / A2
3b. Containment Trigger該当有無
4. R段階の理由
4a. R段階変更履歴の初期案
4b. Aレベルの理由
5. 必要成果物
6. 不足情報
7. 次に行うべき確認
8. 原因断定を避けるべき点
9. 機密情報・redaction上の追加確認
```

## 3. ChatGPT: 原因整理プロンプト

```text
Rouaultの問題について、以下のEvidenceと現行実装情報から原因仮説を整理してください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、Evidenceで検証可能な形にする

条件:
- 原因を断定しすぎない
- Failure IDと対応させる
- 採用、棄却、保留を分ける
- 採用原因で説明できない症状を明示する
- 修正対象ファイルを導けない仮説は採用しない
- local / CI / GitHub差分がある場合は差分自体を原因候補に入れる
- 契約変更の可能性がある場合は明示する
- 個人ノート本文や非公開情報を根拠にする場合は、必要性とredaction要否を明示する

入力:
- R0 Record、Mini Evidence、Mini Brief、Issue Brief、R2-lite Run Card、またはR2-lite Brief:
- Evidence:
- Intermittent Failure Evidenceがある場合はその内容:
- 関連ファイル:
- 関連ログ:
- 既存テスト:
- GitHub / local / CI差分:
- redaction済みEvidence:

出力:
- R0の場合:
  - 原因整理が不要ならR0のまま完了できるか
  - 原因整理が必要ならR1以上への昇格要否
- R1の場合:
  - Mini Brief内のC1に記録する採用原因
  - F1 → C1 → CH1 → S1 → V1 が説明できるか
  - 契約影響なし、またはR2以上への昇格不要を説明できるか
- R2-liteなら、R2-lite Run CardまたはR2-lite Brief内のC欄に記録するCause Summary相当
  - 採用原因を1つに固定できているか
  - C1 / C2ごとに根拠Evidence ID、証拠確度、確度根拠を明示できるか
  - C2がある場合の種別: 補助仮説 / 保留仮説 / 棄却仮説
  - C2とC1の関係
  - C2が修正対象・成功条件・契約影響を変えない根拠
  - Cause Summary相当をRun Card / Brief内で十分に説明できるか
  - 別成果物としてCause Summaryを分離する必要がある場合のR2-full以上への昇格要否
  - C3以降が必要な場合のCause Matrix移行要否
  - 競合仮説が残る場合のR2-full以上への昇格要否
- R2-fullなら、Cause SummaryまたはCause Matrixを作成する
  - 原因候補が複数残る、説明できない症状がある、影響範囲が広い場合はCause Matrixを使う
- R3以上ならCause Matrixを必須にする
- 調査打ち切り可否
- Fix Planへ進んでよいか
- 追加調査が必要な場合、その理由
```

## 3.1 ChatGPT: No-change / No-action / Investigation-only判定プロンプト

```text
Rouaultの問題について、Evidenceから次を判定してください。
- Issue全体を修正なしで閉じるNo-change
- 対象Phaseだけ変更不要とするNo-action
- Evidence引渡し、外部依存待ち、追加再現待ちを扱うInvestigation-only

Phase種別とPhase R段階を別々に判定し、判断リスク成果物と活動固有成果物のマトリクスを適用してください。Implementation固有成果物を非Implementationへ要求しないでください。

入力:
- Issue ID:
- R4 Phase Plan ID / Plan Revision（R4の場合）:
- 対象Phase ID / Phase Status:
- Evidence:
- GitHub現行実装:
- local / CI差分:
- 再現可否:
- 既知の範囲外問題:
- redaction済み情報 / 共有不可情報:

出力:
- Phase種別: No-change / No-action / Investigation-only
- Phase R段階:
- Phase Outcome / Disposition Record種別 / ArtifactRef:
- 対象Issue / Failure ID:
- Issueを閉じられるか:
- 根拠Evidence ID:
- R4 Execution Ledgerの`4. Phase Evidence対応`へ直接記録するEvidence対応:
- 判断リスク成果物:
- No-changeの場合:
  - Disposition: issue closed without change / closed as external responsibility
  - Issue全体の終端である根拠
  - 後続Phaseがないこと
  - cancelled / superseded Phase
  - 先行Implementation差分の不存在またはrollback確認
  - Final R4 Disposition Verification: no-change closure
- No-actionの場合:
  - 対象範囲
  - Issueを閉じない確認
  - 後続Phase ID一覧、直接後続がない場合の理由、依存関係
- Investigation-onlyの場合:
  - Disposition: evidence handoff to next phase / external dependency / awaiting reproduction
  - handoffの場合のPhase ID / 条件
  - external dependencyの場合の依存先 / owner / 再開条件 / 次回確認条件
  - awaiting reproductionの場合の必要Evidence / 再開トリガー / review期限
- 確認済み範囲 / 未確認範囲
- Decision Record要否
- redaction確認
```

## 4. ChatGPT: Fix Plan作成プロンプト

```text
Rouaultの次のImplementation Phaseについて、Fix Planを作成してください。
No-change、No-action、Investigation-only、Verification-only、Integration verificationにはFix Planを作らず、各専用Record内の活動固有Planを使ってください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、Evidenceで検証可能な形にする

前提:
- 静的HTMLを主体とする
- Litはenhancementとして扱う
- UIの成立条件をLit実行後に依存させない
- 長期保守性を最優先する
- 既存互換性や最小差分は優先しない
- 根拠のない削除、テスト回避、仕様不明な暫定対応は禁止
- DOM / CSS / ARIA / data属性 / slot / event名 / CustomEvent detailを契約として扱う
- state / URL / storage / preference / cacheも契約として扱う
- generated files / lockfile / package manager設定を根拠なく変更しない
- security / sanitizationに関わる変更では安全側に倒す
- 個人ノート本文、ログ、スクリーンショット、検索index、生成物は最小化し、外部AI投入前にredactする

入力:
- Issue Brief、R2-lite Run Card、またはR2-lite Brief:
- Cause SummaryまたはCause Matrix:
- Minimum Evidence Packet:
- Evidence Record:
- Intermittent Failure Evidence:
- Synthetic Fixture Record:
- R2-lite Evidence:
  - Evidence配置: 内包 / 別成果物:
  - Evidence ID:
  - 別成果物の保存場所 / ファイル名:
  - Evidence IDとの対応:
- R4 Phase Evidence:
  - R4 Execution Ledgerの `4. Phase Evidence対応` を正本として参照:
  - Issue ID:
  - R4 Phase Plan ID / Plan Revision:
  - Phase単位Fix Planの場合の対象Qualified Phase ID / Plan Revision / Phase R段階:
  - Phase種別: Implementation
  - 計画時点のEvidence対応:
  - 予定Artifact種別:
  - 計画Verification:
  - R4 Execution Ledgerの `4. Phase Evidence対応` の根拠Evidence対応:
  - R4 Execution Ledgerの `4. Phase Evidence対応` のEvidence Record ArtifactKey一覧:
  - R4 Execution Ledgerの `4. Phase Evidence対応` のEvidence Record N/A理由:
  - R4 Execution Ledgerの `4. Phase Evidence対応` の関連ID N/A理由:
- 契約影響チェック / Contract Inventory:
- Decision Record（R3以上の場合）:
- R4 Phase Plan（R4の場合）:
- R4 Execution Ledgerの`4. Phase Evidence対応`（R4の場合）:
- No-change Completion（対象Phaseの場合）:
- No-action Record（R4対象Phaseの場合）:
- Investigation-only Record（対象Phaseの場合）:
- Verification-only / Integration verification Record（対象Phaseの場合）:
- 対象Phase IDとPhase R段階（R4のフェーズFix Planの場合）:
- 対象Phaseの必須成果物（R4のフェーズFix Planの場合）:
- 削除・移行・縮退分類:
- Branch hygiene:
- 対象ファイル:
- 既存テスト:
- 既知の範囲外問題:
- redaction済み情報 / 共有不可情報:

出力:
0. 関連成果物
- R段階:
- R段階変更履歴:
- 情報境界:
  - 使用してよい情報源:
  - 使用しない情報源:
  - 過去会話・記憶を使わない確認:
  - 補完推定の有無:
  - 補完推定を検証するEvidence:
- Issue Brief / R2-lite Run Card / R2-lite Brief:
- Evidence:
  - 0a. Evidence対応を参照:
- Cause Summary / Cause Matrix:
- Contract Inventory:
- Decision Record:
- R4 Phase Plan:
0a. Evidence対応
- Minimum Evidence Packet ID:
- Evidence Record ArtifactKey一覧:
- Evidence Record要否:
- Evidence Record N/A理由:
- Intermittent Failure Evidence ID:
- Synthetic Fixture Record ID:
- R2-lite Evidence:
  - Evidence配置: 内包 / 別成果物:
  - Evidence ID:
  - 別成果物の保存場所 / ファイル名:
  - Evidence IDとの対応:
- R3以上でEvidence Recordを省略していないか:
- R4 Phase Evidence:
  - R4 Execution Ledgerの `4. Phase Evidence対応` を正本として参照:
  - 全体Fix Planで個別Phase Evidenceを重複管理しない:
  - Phase単位Fix Planの場合だけCommon Artifact Header、Issue ID、R4 Phase Plan ArtifactRef、対象Qualified Phase ID、Plan Revision、Phase R段階、Phase種別=Implementation、計画時点のEvidence、予定Artifact種別、計画Verificationを記録し、実行後Status / Transition・Outcome・Disposition / Artifact実績はLedgerへ記録:
1. 問題の定義
2. 採用する原因仮説
3. 棄却または保留する原因仮説
4. 調査打ち切り判断
5. 参照したGitHubブランチ・commit
6. local差分またはCI差分の扱い
7. Branch hygiene
- 作業ブランチ:
- 既存未コミット差分:
- 今回修正に含める差分:
- 今回修正に含めない差分:
- generated files / lockfile差分の扱い:
8. 契約影響チェック / Contract Inventory
- 契約影響の有無:
- 影響なしの場合の根拠:
- 影響あり、または不明の場合のContract Inventory:
- K1:
- R3昇格要否:
8a. Decision Record / R4 Phase Planとの対応
- R3以上の場合のDecision ID:
- R4の場合のQualified Phase ID:
- R4の場合のPhase R段階:
- 関連全体Decision ID:
- 関連Phase Decision ID:
- 対象Phaseの必須成果物との対応:
9. 修正対象ファイル
10. 各ファイルの修正内容
11. 補助変更
12. 変更してよい範囲
13. 変更してはいけない範囲
13a. 削除・移行・縮退分類
- dead code削除:
- 契約削除:
- 移行・縮退:
- 旧経路削除:
- テスト削除:
- R段階:
- 根拠:
- Decision Record要否:
- Contract Inventory要否:
14. 削除してよいもの
15. 削除してはいけないもの
16. テスト方針
17. テスト更新の可否と根拠
18. snapshot更新の可否と根拠
19. 回帰確認項目
20. 実装直後の最小再検証
21. 実装後の精査観点
22. リスク
23. 代替案
24. 完了条件
25. 残課題の扱い
26. Verification Matrix初期案
27. ロールバック方針
28. 再発防止要否
29. 機密情報・redaction方針
- Evidence、ログ、スクリーンショット、検索indexの扱い:
- ChatGPT / Codexへ渡す情報:
- 公開成果物へ含めてはいけない情報:
```

## 5. ChatGPT: Fix Plan精査プロンプト

```text
このFix Planを精査してください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、Evidenceで検証可能な形にする

観点:
- 原因と修正が対応しているか
- 修正前失敗条件と修正内容が対応しているか
- 修正後成功条件が検証可能か
- 調査打ち切り条件を満たしているか
- 対象ファイルに漏れがないか
- 変更境界が明確か
- Support IDが便乗変更になっていないか
- Support IDに対応しない補助変更を許可していないか
- R2-full以上ではMinimum Evidence Packetが作成されているか
- Minimum Evidence Packet ID、内包Evidence ID一覧、対応Issue ID、対応Failure ID、証拠確度、確度根拠、redaction確認が記録されているか
- Cause SummaryまたはCause Matrixが根拠Evidence ID、証拠確度、確度根拠を持ち、Failure IDと対応しているか
- Evidence、Cause、Fix Plan、Verification Matrixの対応が崩れていないか
- R3以上ではEvidence Recordが作成され、Minimum Evidence Packet、Cause Matrix、Fix Plan、Verification Matrixと対応しているか
- Evidence RecordにEvidence Record ID、対応Issue ID、対応Failure ID、対応Minimum Evidence Packet ID、関連Cause ID、関連Change ID、関連Success ID、関連Verification IDが記録されているか
- Evidence Recordの各EntryにEntry ID、Evidence ID、対応対象ID、attempt、timestamp、environment、result、ログまたはdiffが記録されているか
- Evidence IDが不変で、誤記録がinvalid / superseded、redaction版が派生IDとして履歴に残っているか
- Evidence RecordのVerification Evidence indexがEntry ID参照を正本とし、詳細を二重記載していないか
- Evidence Recordに機密情報・redaction欄があり、個人ノート本文、ローカルパス / URL、screenshot、CIログ / 実行ログ、検索index / 生成物、ChatGPT / Codexへ渡す情報の扱いが記録されているか
- R2-fullでは契約影響チェックがあり、契約影響あり・不明の場合にContract Inventoryが作成されているか
- R3ではContract InventoryとDecision Recordが必須成果物として作成されているか
- R4では、選択したR4 Profileに応じて必須成果物が作成されているか
  - R4-S: 全体Decision Record、全体Fix Plan、R4 Phase Plan、Lightweight Resolution Manifest、R4 Execution Ledger、Final R4 Disposition Verification、R4 Completion Record
  - R4-I: R4共通構造成果物を持つ。ただしArtifactKey解決はLightweight Resolution ManifestではなくArtifact Manifestで行い、Manifest Anchor、SHA-256検証、Manifest chain検証、R4 Completion Recordを必須にする
  - R4-A: R4-I相当の構造検証・完全性検証に加え、private / restricted Manifest、Closure Manifest、Closure Attestation、必要な外部署名またはCI attestationを必須にする。R4 Completion Recordは任意要約であり、closed導出の正本ではない
- R0〜R4の変更リスク軸とA0〜A2の監査保証軸が分離されているか
- R4 Phase PlanにIssue ID、R4 Phase Plan ID、Plan Revision、Previous Plan Revision、構造変更履歴、Phase necessity、Activation condition、ID名前空間があるか
- Plan Revisionは構造変更だけで更新され、Phase Status変更はR4 Execution LedgerのExecution Event Logへappend-onlyで記録されているか
- Phase種別とPhase R段階が直交し、判断リスク成果物と活動固有成果物のマトリクスに従っているか。非ImplementationへFix Planや実装後最小再検証を機械的に要求していないか
- R1 ImplementationはMini Brief、R2-lite ImplementationはRun CardまたはBrief + Result、R2-full / R3 ImplementationはFix Planを使っているか
- R4 Phase Planが計画構造だけを持ち、実行状態・Transition / Outcome / Disposition・EvidenceはR4 Execution Ledgerへ分離されているか
- Current StatusがPhase Execution Event Logの最新to Statusと一致しているか
- 初期StatusがN/A → planned Eventで作られ、進行EventはTransition、outcome EventはOutcome、retirement EventはDisposition ArtifactRefをTriggerとして参照しているか
- 各Transition / Outcome / Disposition RecordがPhase Statusを正本化せずRequested Status transitionだけを記録しているか
- necessity評価がrequired / conditional-activated / conditional-not-activated / optional-executed / optional-not-runの許容組合せに従い、conditional-not-activatedとoptional-not-runがcancelled Eventで終端しているか
- ArtifactKeyとArtifactRefが区別され、R4-Sでは軽量Resolution Manifest、R4-I / R4-AではManifest RevisionとManifest Anchorでstorage classとimmutable locatorを含むArtifactRefへ一意に解決されているか
- Artifactの現在有効性がLedgerのArtifact Validation Attestationだけを正本としているか
- Implementation Phaseのpassed / failedにImplementation Phase Outcome Recordがあり、outcome Eventから参照されているか。blocked / cancelled / supersededは別Recordを使っているか
- Final R4 Disposition Verificationが独立ArtifactとしてSuccess、期待結果、Evidence、実際の結果、pass / failを記録しているか
- No-change PhaseがIssue全体の終端で、後続Phaseがなく、先行Implementation差分が残らず必要なrollbackが完了し、部分的な変更不要判断にNo-actionを使っているか
- R4では全体Minimum Evidence Packetと全体Evidence Recordが作成され、全体Cause Matrix / 全体Fix Plan / R4 Phase Planと対応しているか
- R4では各Phaseの根拠EvidenceおよびEvidence Record要否がPhase R段階とPhase種別に従って記録されているか
- Phase種別がImplementation / R0 Record / No-change / No-action / Investigation-only / Verification-only / Integration verificationのいずれかであり、R4 Phase内にR4がネストされていないか
- R4では、根拠Evidence対応が `Issue / Failure / Cause / Change / Success / Verification / Observation / Auxiliary` の全種別を含み、IssueはIssue ID、AuxiliaryはSupport IDをキーにしているか
- Evidence IDが対象IDなしで単に列挙されていないか。1つのEvidenceが複数IDを裏付ける場合は各対象ID側から参照されているか
- No-change Completion、No-action Record、Investigation-only RecordにLedger registration payloadがあり、実登録結果の正本はR4 Execution Ledgerの`4. Phase Evidence対応`だけになっているか
- Evidenceがない種別も省略されず、`種別={N/A:[対象外理由]}` と記録されているか。根拠Evidence対応フィールド自体が単独のN/Aになっていないか
- Evidence Recordを作成するPhaseでは、Evidence Record ArtifactKey一覧が記録されているか
- Resolution Manifest ID / Revisionが記録されているか
- R4-SではResolution Manifest Anchor IDがN/A可、R4-I / R4-Aでは非空かつN/A不可になっているか
- Phase R段階、Phase種別、ArtifactRef一覧、判断リスク成果物、活動固有成果物、変更分類、Verification要否、Phase内のFailure / Cause / Change / Success / Verification IDと対応しているか
- Evidence Recordが複数Entryを持つ形式で記録され、各EntryにEntry ID、Evidence ID、対象ID、attempt、timestamp、environment、resultがあるか
- Evidence Record ArtifactKey一覧を空配列`[]`にしたPhaseについて、Phase R段階がR2-full以下であり、Evidence Record N/A理由が非空で記録されているか。Evidence Record ArtifactKey一覧が1件以上あるPhaseでは、Evidence Record N/A理由が`null`になっているか
- R4 Execution Ledgerの`4. Phase Evidence対応`が機密情報・redaction欄ではなく独立した対応表として記録されているか
- Phase Execution Event Logに出現するQualified Phase IDが、Phase Evidence対応表にも存在するか。対応に失敗している場合、Completion / Closureを成立させていないか
- R0 Record Phaseは、Phase Outcome / Disposition Record種別 / ArtifactRefでR0 Recordを参照し、挙動・契約・テスト・生成物・lockfileに影響せず、設計、仕様、ワークフロー、禁止事項、責務境界、成功条件の意味も変更しない変更に限定されているか
- No-change Phaseは終端PhaseとしてNo-change Completionを参照し、No-action PhaseはIssueを閉じずNo-action Recordを参照し、Investigation-only PhaseはDisposition別必須事項を満たしているか
- Verification-only / Integration verification Phaseは計画時点で新規Failure / Cause / Changeを所有せず、Phase Success IDとVerificationを持ち、新Failure検出時はDetected Failure Observation IDと別IDの移管先Failure IDを対応付けて新しいImplementation Phaseへ移管しているか
- Verification-only / Integration verification RecordにPhase開始基準と、このPhase起因の差分が6区分で記録されているか
- Verification-only / Integration verification Phaseで新しいFailureを検出した場合、Detected Failure Observation ID、failed / blocked、新Plan Revision、移管先Implementation Phase ID、移管先Failure IDが記録されているか
- Implementation PhaseでFailure / Cause / Change / Verificationに対応するEvidenceが欠落していないか
- 関連ID欄で`N/A`文字列が使われていないか。関連IDに`null`が含まれる場合、関連ID N/A理由が、`null`になっている `Failure / Cause / Change / Success / Verification` の種別をすべて含む形式で記録されているか。すべての関連IDが非`null`の場合、関連ID N/A理由が`null`になっているか

- Artifact自身に自身のhash、commit SHA、後段Execution Event IDが書かれていないか
- R4-SではLightweight Resolution Manifest RevisionがRevision別ファイルへ不変保存され、ArtifactKeyからstorage class・immutable locatorへ一意に解決できるか
- R4-I / R4-AではArtifact Manifest RevisionがRevision別ファイルへ不変保存され、ArtifactKeyからstorage class・locator・SHA-256等へ解決できるか
- Manifest Entryに一意なEntry ID、add / correct / revoke、supersedes Entry IDがあり、正本Entryを一意に選べるか
- R4-I / R4-Aで判断に使うManifest RevisionがManifest Anchorで固定されているか。R4-Sでは軽量Resolution Manifestが確定しているか
- local-private / ci-private / external-restrictedの実locatorや非公開digestがrepository-redacted Manifestへ漏れていないか
- Completion / Outcome ArtifactとExecution Event、No-changeとFinal Verificationに循環参照がないか
- blockedはPhase Transition Artifact、passed / failedはPhase Outcome Artifact、cancelled / supersededはPhase Disposition Artifactで根拠付けられているか
- Active Phase Setが導出表と規則から一意に再計算でき、実行したoptional Phaseもpassedになっているか
- Final Verificationが参照するPhase成果物にvalid Attestationがあり、requires-revision / superseded / invalidを含まないか
- pre-final Ledger自身をAttestationで自己証明せず、R4-SではLightweight Resolution Manifest解決とEvent Log、R4-I / R4-AではManifest digestとEvent Logを使い、Current Status、Active Phase Set、Final State ArtifactRefを再計算しているか
- R4-Sでは軽量Resolution Manifest、pre-final Ledger、Final Verification、R4 Completion Recordの順で完了しているか
- R4-Iではpre-final LedgerをManifest登録・anchor後にFinal Verificationを作成し、Final VerificationをManifest登録・anchor後にR4 Completion Recordで人間承認しているか
- R4-AではFinal VerificationをManifest登録・anchor後にClosure Manifestを作成しているか
- R4-AではClosure Manifest登録後の最終Manifest Revisionが別のManifest Anchor集合で固定されているか
- R4-AではClosure Manifestが`proposed closure disposition`だけを保持し、Closure Attestationがderived closure stateを導出しているか
- R4-I / R4-AではVerification Input Manifest Anchor集合がPlan、Phase成果物、pre-final Ledgerを解決できるか。R4-AではClosure Input Manifest Anchor集合がさらにFinal Verificationを解決できるか
- R4-AではClosure Manifest本文へ登録先Manifest Revisionまたは最終Manifest Anchor ID一覧を書き戻していないか
- R4完了時にrequired / conditional-activated / optional-executedがpassed、conditional-not-activated / optional-not-runがcancelledであり、planned / ready / in-progress / blocked / failedが残っていないか
- Final R4 Disposition Verificationがintegration / no-change closureのいずれかで実施され、No-change closureでは有効差分なし、rollback漏れなし、取消Phase混入なしを確認しているか
- 共通ArtifactヘッダーにArtifact ID / Revision、Issue ID、Created against Plan Revision、Qualified Phase ID、storage class、immutable locatorが記録されているか
- Artifact IDが不変で、同一成果物の更新はArtifact Revisionを増やし、Revision別ファイルで過去Revisionを保存し、R4-SではLightweight Resolution Manifestへ、R4-I / R4-AではhashとGit情報をArtifact Manifestへ登録しているか
- R4全体Minimum Evidence Packet / Evidence Recordが複数Failure / Cause / Change / Success / Verification IDを扱えるか
- Verification MatrixがEvidence Record Entryまたは直接Verification Evidence IDのどちらかで完結し、複数attemptを単一行の単一timestamp / resultへ混在させていないか
- R4 Execution LedgerのEvidence Record ArtifactKey一覧は、Phase R段階がR3以上の場合に空配列`[]`になっていないか
- R4 Execution LedgerでPhase R段階がR2-full以下のEvidence Record ArtifactKey一覧を空配列にする場合、Evidence Record N/A理由が記録されているか
- Implementation Phaseでは修正前失敗条件の最小再検証があるか
- R0 Record Phaseでは最小再検証がN/Aで、挙動影響なし確認とgit diff確認があるか
- No-change Phaseでは再現確認または現行状態確認がCompletionに記録されているか
- Investigation-onlyではDisposition別にhandoff target type / ID、外部依存先 / owner / 再開条件、または必要Evidence / 再開トリガーが記録され、非R4でもhandoff可能か
- Verification-only / Integration verification Phaseでは、最小再検証ではなくPhase Success IDの成功条件に対するVerificationがあるか
- Verification再実行時に過去Evidenceを上書きせず、attempt、timestamp、environment、result、最終採用Evidence IDが記録されているか
- R4では全体Contract Inventoryが作成されているか、または根拠付きN/A条件を満たしているか
- R4 Phase Planで関連Contract IDまたは関連Phase Decision IDをN/Aにする場合は、Contract N/A理由またはPhase Decision N/A理由が記録されているか。関連全体Decision IDがN/Aになっていないか
- 実装開始ゲートを満たせるか
- 長期保守性に反する暫定対応がないか
- 不要な互換処理が混入していないか
- 最小差分志向に引きずられて長期保守性を損ねていないか
- 静的HTML主体、Litはenhancementという方針を壊していないか
- テスト回避がないか
- テスト更新の根拠が明確か
- snapshot更新の根拠が明確か
- 削除、移行、縮退、旧経路削除、テスト削除の分類とR段階が明確か
- 実装者が誤解しそうな曖昧表現がないか
- DOM / CSS / ARIA / state / Lit enhancement契約を壊す可能性がないか
- security / sanitization上の退行がないか
- GitHub現行実装に基づいているか
- local working treeまたはCIログの実態を無視していないか
- 環境依存、timeout、flaky、CIのみ再現の前提を見落としていないか
- Verification Matrixで失敗条件、修正、成功条件、検証、Evidence ID、実行情報が対応しているか
- Evidence、ログ、スクリーンショット、検索index、Codex入力に不要な個人ノート本文や非公開情報が含まれていないか

出力:
1. 致命的問題
2. 重要な修正点
3. 軽微な修正点
4. 昇格すべきリスク段階
5. Fix Planへの具体的な追記案
6. 実装開始可否
7. 機密情報・redaction上の問題
```

## 6. ChatGPT: 反対仮説レビュープロンプト

```text
このFix Planが誤っていると仮定してください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、Evidenceで検証可能な形にする

原因誤認、対象漏れ、テスト不足、設計逸脱、削除・移行・縮退リスク、契約破壊、間欠障害、環境依存、localとGitHubの差分、CI差分、performance、security / sanitization、機密情報保護の見落としの観点から、破綻点を列挙してください。

そのうえで、Fix Planに追加すべき補強策を提示してください。

出力:
1. 原因誤認の可能性
2. 対象漏れの可能性
3. 契約破壊の可能性
4. テスト不足の可能性
5. 環境依存の見落とし
6. security / sanitization上の見落とし
7. 反証のために必要な確認
8. Fix Planの補強案
9. R段階の見直し要否
10. 機密情報・redaction上の見落とし
```

## 7. ChatGPT: コピーペースト置換案プロンプト

```text
上記Fix Planに基づき、各ファイルごとにコピーペーストで置換できる修正案を出してください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、Evidenceで検証可能な形にする

条件:
- ファイル名を明示
- 置換前の目印を示す
- 置換後コードを完全に示す
- 省略しない
- 方針外の変更を含めない
- Support IDに該当する補助変更は明示する
- 変更理由をファイルごとに説明する
- 実装直後に実行すべき最小再検証を示す
- 実装後に実行すべき回帰確認を示す
- 修正前に失敗していた条件がどの修正で解消されるか示す
- 修正後の成功条件との対応を示す
- Verificationに反映できる形で出力する
- 個人ノート本文や非公開情報をコードコメント、テストfixture、ログ出力へ混入させない
```

## 8. Codex: 限定実装プロンプト

```text
Rouaultの次のFix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / R2-lite Briefに従って実装してください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、実装差分に混入させない

入力:
- R段階:
- Issue Brief、R2-lite Run Card、またはR2-lite Brief:
- Cause SummaryまたはCause Matrix:
- Fix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / R2-lite Brief:
- R2-liteでCodexを使う場合、修正対象、変更許可範囲、禁止範囲、Do Not Change、F/C/CH/S/V、Verification初期案、Evidence配置、別成果物Evidenceを使う場合の保存場所 / ファイル名、Evidence IDとの対応、Branch hygiene、機密情報・redaction確認、ChatGPT / Codexへ渡す情報の範囲が明記されていること:
- 契約影響チェックまたはContract Inventory:
- Decision Record（R3以上の場合）:
- R4 Phase Plan（R4の場合）:
- R4 Execution Ledgerの`4. Phase Evidence対応`（R4の場合）:
- 対象Phase IDとPhase R段階（R4の場合）:
- 対象Phaseの必須成果物（R4の場合）:
- 削除・移行・縮退分類:
- Verification Matrix初期案:
- redaction済み情報 / 共有不可情報:

目的:
- ...

修正前の失敗条件:
- F1:
- F2:

修正後の成功条件:
- S1:
- S2:

採用する原因:
- C1:

修正対象:
- ...

変更してよい範囲:
- ...

変更してはいけない範囲:
- ...

補助変更:
- SUP1は許可:
- Fix Planで明記されたSupport IDに対応する補助変更のみ許可:
- Support IDに対応しない補助変更は禁止:
- 必要性に気付いた場合は未解決事項として報告し、実装差分には含めない:

禁止:
- 方針外の設計変更
- 根拠のない削除
- テスト回避
- 暫定的なtry/catch握りつぶし
- snapshotやDOM期待値の安易な更新
- 既存挙動の無根拠な互換維持
- 静的HTML主体方針を壊す変更
- Litを必須実行経路にする変更
- data属性、ARIA、CSS custom properties、slot、event名の無根拠な変更
- state / storage / URL stateの無根拠な変更
- security / sanitizationの弱体化
- lockfileの無根拠な変更
- 生成物の無根拠な変更
- shell差異を無視した実装
- Support IDに対応しない補助変更
- Support IDに対応しない便乗リファクタリング
- Fix Planに明記されていない削除、移行、縮退、旧経路削除、テスト削除
- 個人ノート本文や非公開情報の不要な引用、ログ出力、fixture化
- 不要な互換処理
- 最小差分志向に引きずられた暫定処理

実装条件:
- 変更はFix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / R2-lite Briefに列挙された範囲に限定する
- R2-lite Run Card / Briefに修正対象、変更許可範囲、禁止範囲、Do Not Change、F/C/CH/S/V、Verification初期案、Evidence配置、別成果物Evidenceを使う場合の保存場所 / ファイル名、Evidence IDとの対応、Branch hygiene、機密情報・redaction確認、ChatGPT / Codexへ渡す情報の範囲が不足する場合は実装せず、Fix Plan不足として報告する
- R4の場合は、1回の依頼では単一Phaseだけを対象にする
- R4の場合は、対象Phase ID、Phase R段階、対象Phaseの必須成果物、許可する変更、禁止する変更を入力に明記する
- R4の場合は、対象Phase外の差分を出さない
- 補助変更はFix Planに明記されたSupport IDに対応するものだけに限定する
- 迷った場合は実装せず、未解決事項として記録する
- Fix Planに明記された範囲で、必要なテストを追加または更新する
- 削除、移行、縮退、旧経路削除、テスト削除は、Fix Planと削除・移行・縮退分類で明記されている場合だけ行う
- テスト期待値、snapshot、DOM期待値、paint contract期待値の更新は、Fix Planに明記されている場合だけ行う
- Fix Planに明記されていないテスト弱体化、skip、期待値緩和は行わない
- 修正前に失敗していた検証が通ることを確認する
- 実行した検証コマンドと結果を記録する
- Verificationに反映できる形で、失敗条件、修正内容、成功条件、検証結果の対応を記録する
- Evidenceやテストfixtureに個人ノート本文や非公開情報を追加しない

出力:
- 変更ファイル一覧
- 各変更とFix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / Briefの対応
- Support IDに対応する補助変更
- Support IDに対応しない補助変更を行っていないこと
- 実行したコマンド
- 各コマンドのcwd、実行経路、exit code
- 成功した検証
- 失敗した検証
- 未解決事項
- 方針外変更がないことの自己確認
- 個人ノート本文や非公開情報を混入させていないことの自己確認

重要:
- 上記の自己確認は参考情報であり、完了証拠ではない
- 完了判断は、git diff、検証ログ、Verification、必要に応じた手動確認記録で行う
```

## 9. Codex後の実装差分精査プロンプト

```text
この実装差分を精査してください。

情報境界:
- この入力に明示された情報だけを根拠にする
- ユーザーが許可していない過去会話、ChatGPT内の記憶、未提示の推定情報を根拠にしない
- 推定を使う場合は推定として明示し、Evidenceで検証可能な形にする

入力:
- Issue Brief、R2-lite Run Card、またはR2-lite Brief
- Cause MatrixまたはCause Summary
- Fix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / Brief
- 契約影響チェックまたはContract Inventory
- Decision Record（R3以上の場合）
- R4 Phase Plan（R4の場合）
- 対象Phase ID、Phase R段階、対象Phaseの必須成果物（R4の場合）
- 削除・移行・縮退分類
- Verification Matrixまたは軽量Verification
- Minimum Evidence Packet
- Evidence Record（R3以上の場合）
- R4 Execution Ledgerの`4. Phase Evidence対応`（R4の場合）
- R2-lite Evidence（Evidence配置、Evidence ID、別成果物の保存場所 / ファイル名を含む。R2-liteの場合）
- R2-lite Evidence配置 / 別成果物の保存場所 / ファイル名 / Evidence IDとの対応（R2-liteの場合）
- git diff --stat
- git diff
- 実行した最小再検証コマンドと結果
- 実行した回帰確認コマンドと結果

観点:
- Fix Planへの適合
- 修正前失敗条件との対応
- 採用原因との対応
- 修正後成功条件との対応
- Support IDの妥当性
- Support IDに対応しない補助変更の有無
- 方針外変更の有無
- 不要な互換処理の有無
- 最小差分志向に引きずられた暫定処理の有無
- 対象漏れ
- 未実装箇所の有無
- 長期保守性
- 型安全性
- テスト妥当性
- snapshot更新の妥当性
- 削除、移行、縮退、旧経路削除、テスト削除の根拠
- R3以上でDecision Recordと実diffが一致しているか
- R4でR4 Phase Planのフェーズ境界を越えた差分が混入していないか
- Contract Inventoryの各Contract IDに対応する検証があるか
- 静的HTMLとLit enhancementの責務分離
- DOM / CSS / ARIA / state契約の破壊
- security / sanitization上の退行
- CIで落ちる可能性
- 環境依存前提の見落とし
- 生成物やlockfile差分が意図されたものか
- Verificationに対応しない変更がないか
- R2-full以上では、実装差分がMinimum Evidence Packet、Cause Summary / Cause Matrix、Fix Plan、Verification Matrixと対応しているか
- R3以上では、Evidence Recordが実装後の検証結果、関連diff、関連Change ID、関連Success ID、関連Verification IDと対応しているか
- R4では、対象PhaseのCurrent Status、Validated Plan Revision、Phase R段階、Phase種別、Final State Artifact種別 / ArtifactRef、ArtifactRef一覧、Verification不要理由、根拠Evidence対応、Evidence Record ArtifactKey一覧、Resolution Manifest（R4-SではAnchor N/A可、R4-I / R4-AではAnchor必須）、関連ID N/A理由がR4 Execution Ledgerに反映されているか
- Phase Status変更がPlan RevisionではなくR4 Execution LedgerのPhase Execution Event Logに記録されているか
- R4では、対象Phaseの根拠Evidence対応とEvidence Record ArtifactKey一覧が、Issue ID、ArtifactRef一覧、判断リスク成果物、活動固有成果物、変更分類、Verification要否（JSONでは`true` / `false`） / 不要理由、関連Failure / Cause / Change / Success / Verification IDと対応しているか
- R4では、Verification要否が`true`のPhaseでVerificationがあり、`false`のPhaseにはVerification不要理由があるか。Verification-only / Integration verification PhaseではPhase Success ID、Verification Evidence index、Phase開始基準、Detected Failure移管規則があるか
- 実行した検証コマンドと結果がVerification ID、Verification Evidence index、最終判定に採用したVerification Evidence IDに対応しているか
- R2-liteの場合、Evidence配置が 内包 / 別成果物 のいずれかで明示され、別成果物Evidenceを使う場合はredaction済みで後から参照可能な保存場所 / ファイル名とEvidence IDとの対応がRun Card / Briefに記録されているか。失効し得るCI artifactだけを保存場所にしていないか
- Evidence、ログ、スクリーンショット、fixture、検索index、生成物に個人ノート本文や非公開情報が混入していないか
- 個人ノート本文、ローカルパス、URL、秘密情報が差分に混入していないか

出力:
1. 合格 / 差し戻し / 要追加修正
2. 方針適合性
3. 未実装または対象漏れ
4. 方針外変更
5. 契約破壊リスク
6. テスト・Verification不足
6a. Evidence / Evidence Record / Verification対応の不足
7. 追加修正案
8. 次に実行すべき検証
9. 未実装確認
10. Support IDに対応しない補助変更の有無
11. Decision Record / R4 Phase Planとの整合性
12. Contract InventoryとVerificationの対応
13. 機密情報混入の有無
```
