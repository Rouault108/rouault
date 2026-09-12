# 06. 完了条件・再ループ・コミット整理

このファイルは、完了条件、再ループ、ロールバック、コミット前確認、実装後順序の正本です。

## 1. 実装後の判定順序

```text
1. 修正前失敗条件の最小再検証
2. git diff精査
3. 実装後R段階再判定
4. R段階変更履歴を更新
5. R2-liteの場合はRun CardまたはR2-lite Resultへ実装後記録を反映し、Verification更新と対応させる
6. Verification更新
6a. R4 Implementation Phaseでは、passed / failed時にImplementation Phase Outcome Recordを作成してoutcome Eventを追加し、blocked時はPhase Transition Recordを作成する
7. 影響範囲に応じた回帰確認
8. 完了条件確認
9. コミット前最終確認
10. コミット方針整理
```

R0では、最小再検証をN/Aにできます。その場合は、diff確認で挙動影響がないことを確認します。

## 1.1 未実装確認

git diff精査では、差分の妥当性だけでなく、必要な変更が漏れていないかも確認します。

```text
未実装確認:
- Fix Planに列挙された全対象ファイルが変更済みか
- 変更不要とされた対象に根拠があるか
- テスト追加・更新が必要なのに漏れていないか
- 削除・移行・縮退分類が必要なのに漏れていないか
- ドキュメント更新が必要なのに漏れていないか
- 削除予定の旧経路が残っていないか
- 成功条件に対応する検証が不足していないか
- Support IDに対応しない補助変更が混入していないか
- Verificationに反映できない変更が混入していないか
```

## 1.2 実装後R段階再判定

git diff精査後、実diffが当初のScopeと一致しているかを見てR段階を再判定します。

```text
- 実diffが当初Scopeを超えた場合は、R段階を再判定する
- 契約、generated files、lockfile、package manager、security、accessibility、削除、移行、縮退、旧経路削除、テスト削除に新たに触れた場合は、R2-fullまたはR3へ昇格する
- 一括レビュー不能な差分になった場合はR4へ昇格し、フェーズ分割または差分分割を行う
- R2-liteでgenerated files / lockfileの実差分が出た場合はR2-full以上へ昇格する
- Verificationに対応しない差分が残る場合は、差し戻し、Fix Plan更新、またはR段階昇格を行う
```

## 2. 最小再検証の判定

```text
pass:
- 採用原因と修正方針は暫定的に妥当
- git diff精査へ進む

same fail:
- 採用原因が誤っている可能性が高い
- Cause Matrixへ戻る

different fail:
- 修正により別の失敗が顕在化した可能性がある
- 失敗分類を行い、Fix PlanまたはCause Matrixへ戻る

unverified:
- 検証不能な理由を記録する
- 完了条件にはできない
```

未検証項目の扱いです。

```text
- 完了条件に含む項目なら未完了
- 範囲外にするならOut-of-scope Failure Recordで根拠が必要
- 手元で検証不能だがCIで確認可能ならCI検証項目にする
- CIでも検証不能なら、テストまたは確認手段を追加する
```

手動確認をVerificationの根拠にする場合は、`03_templates.md` の手動確認記録を残します。手動確認だけで完了判定する場合は、自動化できない理由を記録します。

## 3. 失敗が残った場合の再ループ条件

```text
- 修正前失敗条件が残る
  → Cause Matrixへ戻る

- 採用原因で説明できない症状が残る
  → Cause Matrixへ戻る

- 成功条件の一部が未達
  → Fix Planへ戻る

- 新規回帰が出た
  → 影響範囲・契約面確認へ戻る

- DOM / CSS / ARIA / state / Lit enhancement契約破壊が疑われる
  → Contract Inventoryへ戻る

- security / sanitization上の退行が疑われる
  → R3へ昇格し、Cause MatrixとContract Inventoryへ戻る

- テスト更新の妥当性が説明できない
  → Fix Planのテスト方針へ戻る

- snapshot差分の意味が説明できない
  → Fix Planのsnapshot方針へ戻る

- localとCIで差が出る
  → GitHub / local / CI差分確認へ戻る

- timeout / flaky / 間欠障害が残る
  → Intermittent Failure Evidenceを作成または更新する

- 環境依存が疑われる
  → 環境依存調査へ戻る

- Verificationに対応しない変更がある
  → git diff精査、Fix Plan、または変更差し戻しへ戻る

- Support IDに対応しない補助変更がある
  → git diff精査または変更差し戻しへ戻る
```

再ループ管理です。

```text
- 同じ採用原因で1回失敗したらCause SummaryまたはCause Matrixへ戻る
- 同じ採用原因または同じFix Planで2回失敗したらR3へ昇格し、反対仮説レビューを必須にする
- R2-liteで原因候補が3個以上残る場合はR2-full以上へ昇格し、Cause SummaryまたはCause Matrixを必須化する
- R2-lite Run CardまたはR2-lite Brief内でMinimum Evidence Packet相当またはCause Summary相当を説明できない場合はR2-full以上へ昇格する
- 検証不能な成功条件がある場合はFix Planへ戻す
```

## 4. テスト更新の許可条件

まず、テストへの変更を分類します。

```text
- テスト追加:
  - 既存仕様または今回固定する既存契約を検証する新規テスト

- 軽微なテスト更新:
  - ファイル名、テスト名、セレクタ、既存契約に反する誤期待値など、仕様変更を伴わない更新
  - 旧期待値が誤りである根拠を説明できる
  - 期待値変更ではなく、既存契約への追従である

- テスト追加と軽微なテスト更新:
  - 上記条件を満たす場合はR2-liteで可

- 期待値変更:
  - DOM、ARIA、snapshot、visual / paint contract、state、routing、search結果などの契約上の期待値変更
  - 原則R2-full以上
  - 仕様判断または契約変更を伴う場合はR3
```

許可条件です。

```text
- 既存契約への追従として期待値を更新する場合は、旧期待値が誤りである根拠がFix Planに明記されている
- 仕様変更または契約変更として期待値を更新する場合は、R3へ昇格し、Decision RecordとContract Inventoryで変更理由、旧契約、変更後契約、検証方法を説明している
- テストが実装詳細ではなく契約を検証している
- テスト削除の場合は、同等以上の検証が別テストで残る
- 削除、移行、縮退、旧経路削除の場合は、削除・移行・縮退分類でR段階と根拠が記録されている
- snapshot更新の場合は、差分の意味が説明できる
- Verification上でテスト更新と成功条件の対応が説明できる
```

禁止するテスト変更です。

```text
- テストを通すためだけの期待値更新
- DOM構造テストの無根拠な弱体化
- paint contract失敗の無根拠な範囲外扱い
- flaky扱いによる無根拠なskip
- 仕様不明なままのsnapshot更新
- 成功条件と対応しないテスト削除
- security / sanitization上の検証弱体化
- Codexが自己判断で行ったテスト弱体化
```

## 4.1 No-change Completionの完了条件

Issue全体を修正なしで閉じる終端判断では、次を満たします。

```text
- No-change Completionが作成済み
- 判断リスク成果物とPhase種別固有成果物が成果物マトリクスに従って作成済み
- 修正しない理由がIssue / Failure Evidence IDと対応している
- R4の場合、No-changeが終端Phaseで後続Phaseを持たない
- 既存の後続PhaseはPlan Revisionでretired / replacedとし、Execution Ledgerでcancelled / superseded Eventを持つ
- 有効な先行Implementation差分が残っておらず、先行Implementation Phaseはcancelled / superseded / rollback済みである
- worktreeまたはcommitにIssue対応差分が残っていない
- R4の場合、Final R4 Disposition Verificationがno-change closure modeでpassしている
- Dispositionがissue closed without changeまたはclosed as external responsibilityである
- closed as external responsibilityの場合は外部owner、責任境界、引渡し方法、owner確認状態、Rouault側で閉じてよい根拠がある
- awaiting reproductionや未確定の外部依存をNo-changeにしていない
- Issueを閉じられる根拠が明示されている
- 仕様判断または契約解釈を伴う場合はR3成果物がある
- redaction確認が済んでいる
```

## 4.2 No-action Recordの完了条件

```text
- No-action Recordが作成済みで、R4専用である
- 対象Phase / 対象範囲だけ変更不要である根拠がEvidenceと対応している
- Issueを閉じないことが明示されている
- 後続Phaseへの影響、後続Phase ID一覧、直接後続がない場合の理由、依存関係が記録されている
- 判断リスク成果物とPhase種別固有成果物が成果物マトリクスに従って作成済み
```

## 4.3 Investigation-only Recordの完了条件

```text
- Investigation-only Recordが作成済み
- 非R4の場合はR4 Phase Plan ID / Phase IDが理由付きN/Aである
- 調査目的に対応するEvidenceが取得済み
- 判断リスク成果物とPhase種別固有成果物が成果物マトリクスに従って作成済み
- evidence handoffの場合はhandoff target type、target IDまたは参照、handoff条件がある。非R4ではworkflow step / Artifact / external ownerを指定できる
- external dependencyの場合は外部依存先、owner、再開条件、次回確認条件がある
- awaiting reproductionの場合は必要Evidence、再開トリガー、review期限または期限なし理由がある
- Issueを閉じないことが明示されている
- redaction確認が済んでいる
```

## 4.4 Implementation Phase Outcome Recordの完了条件

```text
- Implementation Phase Outcome Recordが作成済み
- Common Artifact Header、Outcome Record ID、Qualified Phase ID、対象Plan Revisionがある
- Requested Phase Status transitionがある
- 使用したPlan ArtifactRefがある
- 実装ArtifactRef、Verification ArtifactRef、Evidence Record ArtifactKeyが必要に応じて記録されている
- passedの場合は最終採用Verification Evidence IDがある
- Outcome RecordのRequested transitionはpassed / failedだけである
- outcome EventがOutcome Record ArtifactRefをTrigger ArtifactRefとして参照している
```

## 4.4a Phase Transition / Disposition Recordの完了条件

```text
- blocked等の非完了遷移はPhase Transition Recordを根拠にする
- cancelled / supersededはPhase Disposition Recordを根拠にする
- conditional-not-activated / optional-not-runではNecessity Evaluation Event IDと根拠Evidenceがある
- Transition / Disposition Artifactは後段Execution Event IDを参照しない
- Execution EventがTrigger ArtifactRefとしてTransition / Disposition ArtifactRefを参照する
- blocked時はFinal State ArtifactRefがN/Aである
```

## 4.5 Verification-only / Integration verification Recordの完了条件

```text
- Verification Recordが作成済み
- Common Artifact Headerが対象Issue、Created against Plan Revision、Qualified Phase IDと一致している
- Phase Success IDとVerification IDがある
- Verification Evidence参照と最終採用Verification Evidence IDがある
- Phase開始基準からRouault実装差分がない
- passの場合は成功条件を満たす
- 新Failure検出時はDetected Failure Observation IDと移管先Failure IDが対応し、元Phaseで修正していない
- failed / blockedの場合はR4全体を完了扱いにしていない
- redaction確認が済んでいる
```

## 4.6 共通Artifactヘッダーの完了条件

```text
- 主要成果物にArtifact ID、Artifact Revision、Issue ID、作成日時、storage class、immutable locatorがある
- R4 Phase成果物はR4 Phase Plan ID、Created against Plan Revision、Qualified Phase ID、Phase種別、Phase R段階を持つ
- 非R4またはR4全体成果物のR4固有項目は理由付きN/Aである
- Artifact IDは不変で、同一成果物の更新はArtifact Revisionを増やしている
- 過去Artifact RevisionとManifest RevisionはRevision別ファイルで保存されている
- R4-SではArtifactKey、storage class、immutable locatorをLightweight Resolution Manifestへ登録し、SHA-256またはGit blob IDを記録しない場合はdigest optional reasonがある
- R4-I / R4-AではArtifactKey、locator、digest、Git情報はstorage class規則に従ってArtifact Manifestへ登録されている
- 別成果物への置換はsupersedes ArtifactRefでRevision固定して追跡できる
- R4 Execution LedgerのArtifactRef一覧からPhase成果物へ辿れ、ArtifactKeyが選択したManifest Revisionで一意に解決できる
```

## 4.6a Artifact Manifest / Manifest Anchorの完了条件

```text
- Manifest RevisionがRevision別ファイルへ不変保存されている
- Previous ManifestRefからRevision chainを辿れる
- 各EntryにManifest Entry ID、action、ArtifactKey、storage class、locator、登録日時、登録者がある
- correct Entryはsupersedes Entry IDを持ち、revoke Entryは失効理由を持つ
- 同じArtifactKeyの正本Entryを一意に選べ、訂正鎖の循環や同順位Entryがない
- repository-redactedではSHA-256とGit blob IDを検証できる
- local-private / ci-private / external-restrictedでは実locator、未redactファイル名、公開不可digestがrepository-redacted Manifestへ漏れていない
- R4-AのClosure判断に使うManifest RevisionにvalidなManifest Anchorがある。R4-IのFinal Verification判断に使うManifest RevisionにもvalidなManifest Anchorがある
- Manifest AnchorがManifest ID / Revision / path / SHA-256 / Git commit SHAまたは外部署名を固定している
- invalidなManifest AnchorをClosureまたはFinal Verificationに使用していない
```

## 4.6b A2 Evidence Integrity Attestationの完了条件

```text
- repository-redacted evidence indexとprivate / restricted evidence indexが分離されている
- public-safe opaque referenceだけで非公開Evidenceを参照している
- private locator、未redactファイル名、公開不可digest、秘密情報が公開Artifactへ漏れていない
- redaction policy、retention policy、revocation policyが記録されている
- secret失効・ローテーションが必要な場合、人間承認と実施記録がある
- A2 Evidence Integrity Attestationのintegrity resultがpassである
- derived evidence stateがpreservedである
- private_locator_leak_checkがpassである
- non_public_digest_leak_checkがpassである
- human_approval.approvedがtrueである
- human_approval.approverが空でない
- validation_evidenceから漏えい検査と完全性検証の根拠へ辿れる
- failまたはmanual-review-requiredをA2完了として扱っていない
```

## 4.7 Intermittent Failure Evidenceの完了条件

```text
- 試行計画、総試行回数、timeout値、retry設定、打ち切り条件がある
- runner内retryと独立試行を区別している
- 各attemptにVerification Evidence ID、timestamp、environment、resultがある
- 再現率と相関条件がある
- 最終判定に採用したVerification Evidence IDがある
- Evidence Recordを使う場合はEntry IDと対応している
```

## 4.8 Synthetic Fixture Recordの完了条件

```text
- 元データの共有可否と保存・破棄方針がある
- 保持した構造的特徴と意図的に削除した情報がある
- 実データとの差異がある
- fixtureが再現に十分であるVerificationとEvidence IDがある
- repository保存可否とredaction確認がある
```

## 5. R別完了条件

R1〜R3の通常完了条件はImplementation Phaseを前提とします。非Implementation Phaseは、該当する4.xの専用完了条件と、`01_entry_and_risk.md` の判断リスク成果物だけを適用し、Fix Plan、実装開始ゲート、実装、実装後最小再検証を要求しません。

### R0

```text
- 変更理由が記録されている
- 挙動、契約、テスト、生成物、lockfileへの影響がない
- 設計、仕様、ワークフロー、禁止事項、責務境界、成功条件の意味を変更していない
- git diffで意図しない差分がない
- build成果物や一時ファイルが混入していない
- 個人ノート本文や非公開情報が差分に混入していない
```

### R1

```text
- Mini Evidenceが作成済み
- Mini Briefが更新済み
- Mini Briefの契約影響チェックで、契約影響なし、またはR2以上への昇格不要が確認されている
- F1 → C1 → CH1 → S1 → V1 を説明できる
- 修正前に失敗していた条件が成功している
- git diffで方針外変更がない
- 簡略Verificationがpassまたは根拠付き範囲外になっている
```

### R2-lite

```text
- R2-lite Run Card、またはR2-lite Brief + R2-lite Resultが更新済み
- R段階変更履歴が更新済み
- Branch hygieneが更新済み
- 機密情報・redaction確認が更新済み
- Cause Summary相当はRun Card / Brief内に内包されている
- Cause Summary相当を別成果物として分離する必要がある場合は、R2-liteとして完了せず、R2-full以上へ昇格済み
- Minimum Evidence Packet相当は、Run Card / Brief内に内包されている、または単一Evidenceとして別成果物化され、Run Card / BriefのEvidence欄からEvidence IDで参照されている
- Evidence配置が 内包 / 別成果物 のいずれかで明示されている
- Evidence配置が別成果物の場合、別成果物の保存場所 / ファイル名が記録され、Run Card / BriefのEvidence IDと対応している
- 別成果物の保存場所 / ファイル名は、redaction済みで後から参照可能な成果物を指し、失効し得るCI artifactだけを保存場所にしていない
- Run Card / Brief内包Evidence、または別成果物として作成したEvidenceに、Evidence ID、対応Issue ID、対応Failure ID、証拠確度、確度根拠が記録されている
- Evidenceが複数種類または複数箇所に分散し、Run Card / BriefのEvidence欄と単一の別成果物Evidenceだけでは根拠を十分に追跡できない場合は、R2-liteとして完了せず、R2-full以上へ昇格済み
- C2がある場合、種別、C1との関係、修正対象・成功条件・契約影響を変えない根拠、昇格要否が記録されている
- F / C / CH / S / Vが対応している
- R2-lite Briefを使う場合、R2-lite対応表でF / C / CH / S / Vの対応が説明されている
- Scope外の変更がない
- Do Not Changeに反する変更がない
- generated files / lockfileに触れていないことを確認済み
- generated files / lockfileに実差分が出た場合は、R2-liteとして完了せず、R2-full以上へ昇格済み
- 修正前に失敗していた検証が成功している
- 軽量Verificationがpassまたは根拠付き範囲外になっている
- 必要な回帰確認が済んでいる
```

### R2-full

```text
- Issue Brief、Minimum Evidence Packet、Cause SummaryまたはCause Matrix、Fix Plan、Verification Matrixが更新済み
- R段階変更履歴がIssue BriefまたはFix Planに記録されている
- Fix Plan精査が完了している
- 契約影響チェックが完了している
- 契約影響あり、または不明の場合はContract Inventoryがある
- Fix Planに列挙された対象がすべて処理済み
- 方針上必要な未実装が残っていない
- 方針外変更がない
- Support IDで説明できない補助変更がない
- 修正前に失敗していた検証が成功している
- 成功条件がすべて満たされている
- 主要な回帰確認が成功している
- Verification Matrixで全変更を説明できる
```

### R3

```text
- R2-full完了条件を満たしている
- Evidence Recordが更新済みである
- Minimum Evidence PacketがMinimum Evidence Packet IDと内包Evidence ID一覧を持つ
- Evidence RecordがEvidence Record ID、対応Issue ID、対応Failure ID一覧、対応Minimum Evidence Packet ID一覧、関連Cause / Change / Success / Verification ID一覧を持ち、Minimum Evidence Packet、Cause Matrix、活動に対応するPlan、Verification Matrixと対応している
- Evidence Recordの各EntryにEntry ID、Evidence ID、Evidence状態、対応対象ID、attempt、RFC 3339 timestamp、environment、result、ログまたは関連diffが記録されている
- Verification Evidence indexはEntry ID参照を正本とし、詳細を二重管理していない
- Contract Inventoryが更新済みである
- Contract Inventoryの各Contract IDが、Decision Record、Fix Plan、Verification Matrixと対応している
- Contract InventoryをN/Aにしていない
- 反対仮説レビューが完了している
- DOM / CSS / ARIA / state / Lit enhancement契約を壊していない
- security / sanitization上の退行がない
- accessibility上の意味変更が検証されている
- テストを弱めていない
- snapshot更新の根拠が明確
- 削除、移行、縮退、旧経路削除、テスト削除の根拠とR段階が明確
- 範囲外失敗がOut-of-scope Failure Recordで根拠付きに分離されている
- Decision Recordが更新済みである
- 仕様判断、契約変更、security / sanitization、accessibility意味変更、反対仮説レビュー後の採用方針、削除・移行・縮退判断がDecision Recordで説明されている
- ロールバック方針が記録されている
- 再発防止要否が整理されている
```

### R4

R4完了時は、選択Profileに応じたResolution Manifest / Manifest chain / Closure chainと、終端不変条件について、次をすべて満たします。

```text
- 全体Issue BriefにIssue IDがある
- Artifact本文に自身のhash、commit SHA、後段Execution Event ID、登録先Manifest Revisionがない
- Artifact RevisionとManifest RevisionがRevision別ファイルへ不変保存されている
- ArtifactKeyとArtifactRefが区別され、R4-SではLightweight Resolution Manifest Revision、R4-I / R4-AではArtifact Manifest Revisionでstorage classとimmutable locatorを含むArtifactRefへ一意に解決できる
- R4-SではLightweight Resolution Manifest Entry、R4-I / R4-AではArtifact Manifest Entryに一意なEntry IDとadd / correct / revokeがあり、訂正鎖・失効・正本選択を一意に解決できる
- R4-I / R4-Aでは、Final VerificationまたはClosure判断に使用するManifest RevisionがManifest Anchorで固定され、Manifest SHA-256、Git commit SHAまたは外部署名を検証できる
- repository-redacted / local-private / ci-private / external-restrictedのstorage class規則に従い、private locator、未redactファイル名、公開不可digestがrepository-redacted Manifestへ漏れていない
- Artifactの現在有効性はArtifact本文ではなくArtifact Validation Attestationで管理されている
- blockedはTransition Artifact、passed / failedはOutcome Artifact、cancelled / supersededはDisposition Artifactを根拠にする
- Current Status導出ビューがLatest Trigger ArtifactRefとFinal State Artifact種別 / ArtifactRefを区別している
- Event classがinitialization / progress / transition / outcome / retirementのいずれかで、Trigger Artifact種別と一致している
- necessity評価がrequired / conditional-activated / conditional-not-activated / optional-executed / optional-not-runの許容組合せに従っている
- R4 Phase PlanにR4 Phase Plan ID、Issue ID、Plan Revision、Previous Plan Revision、Plan ArtifactRef、構造更新理由があり、計画構造だけを正本としている
- R4 Execution Ledgerがあり、Phase Necessity Evaluation Log、Phase Execution Event Log、Current Status導出ビュー、Final State ArtifactRef、Evidence対応、Artifact Validation Attestationを管理している
- Phase活動ArtifactのLedger registration payloadは予定値であり、実登録結果の正本はExecution Ledgerだけである
- Current Statusは各Phaseの最新Eventのto Statusと一致している
- R4 IDは完全修飾され、リポジトリ全体で一意に解決できる
- Phase追加、分割、依存関係、成功条件、retire、replacementがPlan Revision履歴にappend-onlyで残っている
- Phase Status変更がR4 Execution LedgerのPhase Execution Event Logにappend-onlyで残っている
- Plan Revision更新時に影響ArtifactRefをArtifact Validation Attestationでvalid / requires-revision / superseded / invalidとして処理し、Artifact本体へ現在有効性を書き戻していない
- pre-final Ledger自身をArtifact Validation Attestationで自己証明していない
- Final Verificationで、R4-Sではpre-final LedgerのLightweight Resolution Manifest解決、Event Log、Current Status、Active Phase Set、Final State ArtifactRefを再計算し、R4-I / R4-Aではpre-final LedgerのManifest digest、Event Log、Current Status、Active Phase Set、Final State ArtifactRefを再計算している
- Final Verification対象のPhase成果物が対象Plan Revisionに対してvalidである
- requires-revision / superseded / invalid ArtifactがFinal Verification対象集合にない
- R4-Sでは軽量Resolution ManifestでArtifactKeyを解決し、Final R4 Disposition Verificationが軽量Resolution Manifest Revisionを入力としてpassし、pre-final Ledger、Final Verification、R4 Completion Recordの順で完了している
- R4-Iではpre-final LedgerをManifest登録・anchorした後にFinal Verificationを作成し、Final VerificationをArtifact Manifestへ登録してManifest Anchorで固定した後にR4 Completion Recordで人間承認している
- R4-AではFinal VerificationをArtifact Manifestへ登録し、そのManifest RevisionをManifest Anchorで固定した後にClosure Manifestを作成している
- R4-AではClosure ManifestがClosure Input Manifest Anchor一覧、Plan ArtifactRef、pre-final Ledger ArtifactRef、Final Verification ArtifactRefを一方向に参照している
- R4-AではClosure Manifest本文に登録先Manifest Revisionまたは最終Manifest Anchor ID一覧を書き戻していない
- R4-AではClosure Manifest登録後の最終Manifest Revisionが別のManifest Anchorで固定されている
- R4-AではClosure Attestationが最終Manifest Anchor集合を検証し、derived closure stateとしてclosed / not-closedを導出している
- R4-I / R4-AではVerification Input Manifest Anchor集合からPlan、Phase成果物、pre-final Ledgerを解決できる
- R4-AではClosure Input Manifest Anchor集合からPlan、pre-final Ledger、Final Verificationを解決できる
- Phase種別とPhase R段階が直交し、許容組合せに従っている
- Phase種別はImplementation / R0 Record / No-change / No-action / Investigation-only / Verification-only / Integration verificationのいずれかである
- 判断リスク成果物とPhase種別固有成果物のマトリクスに従っている
- No-change PhaseはIssue全体の終端で後続Phaseを持たず、有効な先行Implementation差分が残らない
- Phase限定の変更不要判断はNo-action Recordを使い、Issueを閉じていない
- Investigation-onlyはDisposition別必須事項を満たしている
- R4 Execution LedgerのPhase Evidence対応表にVerification要否とVerification不要理由がある
- R4 Execution LedgerのPhase Necessity Evaluation Logが存在し空でないこと
- R4 Execution LedgerのPhase Evidence対応表とArtifact Validation Attestation一覧が空ではない
- Phase Execution Event Logに出現するQualified Phase IDがPhase Evidence対応表にも存在する
- Phase Execution Event LogとPhase Evidence対応表のQualified Phase ID対応に失敗した場合、R4-S / R4-IのCompletion Record、およびR4-AのClosure Attestationをcompleted / closed相当にしてはならない
- 関連IDに`null`がある場合、関連ID N/A理由が該当ID種別をすべて含んでいる
- 根拠Evidence対応はIssue / Failure / Cause / Change / Success / Verification / Observation / Auxiliaryの全種別を含む
- Evidence IDは不変で、invalid / superseded / redacted derivativeが履歴に残る
- Verification-only / Integration verification Phaseで新Failureを検出した場合、Detected Failure Observation IDと移管先Failure IDを対応付け、元Phaseで修正していない
- R0 Recordはstate、routing、search、security、snapshot、visual、設計・仕様・ワークフロー意味への影響なしを確認している
- 全体Contract Inventory、全体Decision Record、全体Fix Plan、全体Cause Matrix、Final R4 Disposition Verification、ロールバック方針が整合している
- Final R4 Disposition Verificationはintegrationまたはno-change closure modeでpassしている
- R4-S / R4-IではR4 Completion Recordがcompletedで、人間承認がある
- R4-AではClosure Manifestが`proposed closure disposition`だけを保持し、Closure Manifest単独でclosedを自己宣言していない
- R4-AではClosure Attestationのvalidation_resultがpassで、derived closure stateがclosedである
- R4-AでR4 Completion Recordを作成する場合、それはclosed導出の正本ではなくPR / commit向け要約であり、Closure Attestationの結果を上書きしない
- Active Phase Set導出表があり、final Plan、retire / replacement、necessity、necessity評価、executedから一意に再計算できる
- required Phaseはすべてpassedである
- conditional-activated Phaseはすべてpassedである
- optional-executed Phaseはすべてpassedである
- conditional-not-activated PhaseはPhase Disposition Record + cancelledである
- optional-not-run PhaseはPhase Disposition Record + cancelledである
- planned / ready / in-progress / blocked / failedがActive Phase Setに残っていない
- failed履歴を持つPhaseはsupersededとなり、後継PhaseまたはIssue未完了判定を参照している
- cancelled / superseded Phaseの差分・成果物が最終結果へ混入していない
- suspended / pending状態をR4完了としていない
- 一時生成物は完了前に除去または正式成果物化されている
- コミット分割方針が説明できる
```

## 5.1 R4 Schema / validator完了条件

R4を完了扱いにするには、文書の目視確認だけでは不足です。次を満たします。

```text
- `08_r4_schema_and_validation.md` の正規化規則とSchema規則に従っている
- R4-SではLightweight Resolution ManifestによるArtifactKey解決を確認し、Phase Execution Event LogからCurrent Status、Active Phase Set、Final State ArtifactRefを再計算している
- R4-S / R4-I / R4-Aでは`schemas/r4-execution-ledger.schema.json`の必須項目を満たしている。R4-Sでは`schemas/lightweight-resolution-manifest.schema.json`、R4-I / R4-Aでは`schemas/artifact-manifest.schema.json`、R4-Aでは`schemas/closure-manifest.schema.json`の必須項目を満たしている
- R4-Sでは軽量Resolution ManifestによるArtifactKey解決を検証している。R4-I / R4-AではManifest chain、Previous ManifestRef、sequence、Entry add / correct / revoke、ArtifactKey解決を機械的または同等手順で検証している
- R4-AではClosure Manifest登録後の最終Manifest Anchor集合をClosure Attestationで検証している
- R4-Aでvalidator未整備の場合は、R4をclosedとして扱わず、暫定的に`proposed-closed`または`manual-review-required`として残す。R4-S / R4-IはR4 Completion Recordの人間承認で完了扱いにできるが、再計算・Manifest検証を省略してはならない
```

## 6. 再発防止

R2以上では、必要に応じて再発防止を検討します。

```text
- 追加すべきテスト:
- 追加すべき型制約:
- 追加すべきlint / script:
- 更新すべき設計文書:
- 更新すべきチェックリスト:
- 今後のレビュー観点:
```

R3以上では、再発防止の要否を明示します。

## 6.1 標準Verification Set

問題種別ごとの標準Verification Setは `04_rouault_policy_overlay.md` を正本とします。ここでは重複管理を避けるため、実行方針だけを定めます。

```text
- 問題種別に応じて `04_rouault_policy_overlay.md` の標準Verification Setから候補を選ぶ
- timeout / flaky / CIのみ再現では `03_templates.md` のIntermittent Failure Evidenceを併用する
- 合成または匿名化fixtureを使う場合はSynthetic Fixture Recordを作成する
- Verification Matrixで複数attemptを扱う場合はEvidence Recordを使うか、1 attemptにつき1行に分ける
- performance問題では測定条件、baseline、修正後、許容条件を記録する
- すべてを機械的に実行する必要はない
- 実行しない項目は、範囲外または不要とする根拠をVerification、Fix Plan、またはOut-of-scope Failure Recordに記録する
- 完了条件に関係する項目は、未実行のまま完了扱いにしない
```

## 6.2 ロールバック方針

R3以上では、実装前またはFix Plan作成時にロールバック方針を定義します。blockerでは、R2以下でも封じ込め段階でrevert可否を確認します。

```text
ロールバック条件:
- 修正前失敗が解消せず、新規回帰が増えた
- 成功条件に対応しない大規模差分が出た
- 変更境界外の差分が多数混入した
- 原因仮説が棄却された
- テスト更新の妥当性が説明できない
- security / sanitization上の退行が出た
- Verificationに対応しない差分が残る
- Support IDに対応しない便乗変更が残る
```

```text
ロールバック方針:
- 戻す対象commitまたは差分:
- 戻してよいファイル:
- 戻してはいけないファイル:
- 戻した後に実行する検証:
- 再調査の戻り先:

R4全体ロールバック方針:
- 全体として戻す条件:
- Phase単位で戻す条件:
- 戻してよいPhase:
- 戻してはいけないPhase:
- 統合後に戻す場合の手順:
- rollback後に実行するVerification:
- 再調査の戻り先:
```

## 7. コミット前最終確認

```text
確認コマンド:
- git status
- git branch --show-current
- git rev-parse HEAD
- git diff --stat
- git diff
```

確認観点です。

```text
- 意図しないファイルが含まれていないか
- Fix Plan対象外のファイルが混入していないか
- Support IDに対応しない補助変更が混入していないか
- lockfile差分が意図したものか
- 生成物差分が意図したものか
- build成果物や一時ファイルが混入していないか
- 改行コードの不要な差分がないか
- パス区切りなどOS固有差分が混入していないか
- 方針外の整形差分が混入していないか
- Verificationに対応しない差分がないか
- 削除・移行・縮退分類に対応しない削除がないか
- R3以上でDecision Recordと実diffが一致しているか
- R4でR4 Phase Planのフェーズ境界を越えた差分が混入していないか
- Contract Inventoryの各Contract IDに対応する検証があるか
- 個人ノート本文、ローカルパス、URL、秘密情報が差分、ログ、スクリーンショット、commit message案に混入していないか
```

## 8. コミット方針整理

```text
コミット前整理:

入力:
- R0: R0 Record
- R1: Mini Evidence / Mini Brief / 簡略Verification
- R2-lite: R2-lite Run Card、またはR2-lite Brief + R2-lite Result
- R2-full以上: Issue Brief / Evidence / Cause SummaryまたはCause Matrix / Fix Plan / Verification
- R3以上: Contract Inventory / Decision Record / ロールバック方針
- R4共通: 全体成果物 / R4 Phase Plan / R4 Execution Ledger / 各Phase Transition・Outcome・Disposition成果物 / Final R4 Disposition Verification / R4全体ロールバック方針
- R4-S: R4共通入力 + Lightweight Resolution Manifest + R4 Completion Record
- R4-I: R4共通入力 + Artifact Manifest / Manifest Anchor / SHA-256検証 / Manifest chain検証 + R4 Completion Record
- R4-A: R4共通入力 + Artifact Manifest / Manifest Anchor / SHA-256検証 / Manifest chain検証 + private / restricted Manifest / Closure Manifest / Closure Attestation / 最終Manifest Anchor集合。R4 Completion Recordは任意要約であり、closed導出の正本ではない
- No-change: No-change Completion
- No-action: No-action Record
- Investigation-only: Investigation-only Record
- 共通: 削除・移行・縮退分類（該当する場合）
- 共通: git diff --stat
- 共通: git diff
- 共通: 実行した検証コマンドと結果

No-changeの場合の出力:
- コード変更: なし
- Issue終端: closed without change / closed as external responsibility
- cancelled / superseded Phase:
- コミット: 不要 / docs-only変更として別R0またはR1へ分離
- ユーザーへ返す説明:

No-action / Investigation-onlyの場合の出力:
- Issue終端: なし
- Final State Artifact種別 / ArtifactRef:
- Disposition:
- 後続Phase ID一覧、外部依存の再開条件、または再現待ちトリガー:
- 取得したEvidence:

通常変更の場合の出力:
- 変更概要
- 修正した問題
- 採用した原因
- 主な変更ファイル
- Support IDに対応する補助変更
- 実行した検証
- 成功した検証
- 失敗した検証
- 範囲外と判断した失敗とOut-of-scope ID
- 残課題
- 再発防止策
- ロールバック要否
- コミット分割方針
- コミットメッセージ案
- 機密情報・redaction確認
```

コミットメッセージは、次の形式を基本とします。

```text
fix: resolve <problem summary>
refactor: simplify <target>
test: cover <behavior>
docs: clarify <policy or workflow>
```
