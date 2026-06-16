# Rouault 問題解決ワークフロー ファイル群 v85

## 目的

このファイル群は、Rouaultで問題が発覚した際に、原因誤認、対象漏れ、方針外変更、テスト回避、契約破壊、検証漏れを防ぎつつ、問題規模に応じて効率よく修正を完了するための標準手順です。

軽微な問題では過剰な成果物を要求せず、中規模以上では `Failure / Cause / Change / Success / Verification` の対応関係を保ちます。Rouaultの基本方針である静的HTML主体、Lit enhancement、個人ノート保護、DOM / CSS / ARIA / state等の契約保全を前提にします。

## 設計上の主要原則

```text
- 最初に高リスク条件を確認し、R0〜R4の暫定段階を決める
- Evidence作成後にR段階を確定または昇格する
- R1以上では Failure / Cause / Change / Success / Verification の対応を説明できるようにする
- R2-liteは、採用原因と変更境界が明確な日常的中規模修正に限定する
- R2-lite Run Cardは原則 F1 / C1 / CH1 / S1 / V1 を中心に扱い、複数IDの追跡が必要な場合はR2-lite Brief + Resultへ分離する
- R2-full以上ではIssue Brief、Evidence、Cause、Fix Plan、Verificationを分離して追跡する
- R3ではContract Inventory、Decision Record、反対仮説レビュー、ロールバック方針を必須にする
- R4ではIssue ID、R4 Phase Plan ID、Plan Revision、Phase ID名前空間を持つ全体成果物を作成し、フェーズ単位で実装、精査、検証する
- R0〜R4は「変更・レビュー・検証のリスク段階」、A0〜A2は「証拠保全・監査保証レベル」として分離する
- Phase種別とPhase R段階を直交させ、判断リスク成果物と活動固有成果物を分離する
- R4をR4-S / R4-I / R4-AのProfileに分け、構造分割、完全性固定、外部監査を段階的に適用する
- Statusの正本はExecution Event Log、Artifactの論理キーはArtifactKey、解決済み参照はArtifactRef、Artifact有効性の正本はArtifact Validation Attestationとする
- R4-S / R4-I / R4-AのManifest / Ledger / Closureは人手記入だけで完了扱いにせず、`08_r4_schema_and_validation.md` と `schemas/` の機械可読契約およびvalidator意味制約に照合する
- No-change Completion、No-action Record、Investigation-only Recordを分離し、Issue終端、Phase限定の変更不要判断、後続作業へのEvidence引渡しを区別する
- Evidence IDとVerification Evidence IDはappend-onlyかつ不変とし、誤記録はinvalid / supersededとして履歴を残す
- 個人ノート本文、ローカルパス、URL、秘密情報、未redactログ、スクリーンショット、検索indexは必要最小限にし、共有前にredactする
- CodexはFix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / Briefに限定された実装だけに使う
- R0〜R4とA0〜A2を分離し、変更リスクと証拠保全レベルを独立に判定する
- suspected-secret-exposure / private-content-leak / destructive-corruption / active-exploitation / supply-chain-compromise を封じ込めトリガーとして追加する
- R4ではArtifactKey短縮表記をArtifactRefと呼ばず、R4-SはLightweight Resolution Manifest、R4-I / R4-AはArtifact ManifestとManifest Anchorで解決する
- Manifest / Anchor / Ledger / Closureの正規化規則を `08_r4_schema_and_validation.md` に分離する
- Closure Manifestの`closed`自己宣言を廃止し、`proposed-closed`からClosure Attestation成立によってclosedへ導出する
- 現行Rouaultの `docs/contracts/`、`docs/design-system/`、`docs/references/`、`docs/guides/`、`docs/adr/` の正本関係に契約優先順位を合わせる
- R4-Sは軽量Resolution Manifest付き構造検証、R4-IはManifest / Anchor検証、R4-AはClosure Attestation検証を必須とし、A2は非R4でもEvidence Integrity Attestationで閉じる
```

## 定義の正本

このファイル群では、同じ概念を複数ファイルで参照します。運用時の定義ドリフトを避けるため、次を正本とします。

| 定義                                                                                                                                                                                                                                                                                                                                                                                                                                                | 正本ファイル                                 | 備考                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| R0〜R4の入口判定、R別成果物、削除・移行・縮退のR判定                                                                                                                                                                                                                                                                                                                                                                                                | `01_entry_and_risk.md`                       | 他ファイルのR判定記述と衝突した場合はこのファイルを優先する                                                                                         |
| 標準フロー、実装開始ゲート、再現性・Evidence作成方針                                                                                                                                                                                                                                                                                                                                                                                                | `02_core_workflow.md`                        | 実装後順序の詳細は `06_completion_commit.md` を正本とする                                                                                           |
| 成果物テンプレート、R2-lite Run Card、Evidence、Intermittent Failure Evidence、Synthetic Fixture Record、A2 Evidence Integrity Attestation、Lightweight Resolution Manifest、Artifact Manifest、Manifest Anchor、R4 Execution Ledger、Implementation Phase Outcome Record、Verification-only / Integration verification Record、Final R4 Disposition Verification、R4 Completion Record、Closure Manifest、Closure Attestation、Verification Matrix | `03_templates.md`                            | 成果物の項目名はこのファイルを正本にする。R4 Completion RecordはR4-S / R4-Iの完了記録であり、R4-Aでは任意要約である                                 |
| Rouault固有契約、標準Verification Set、performance候補                                                                                                                                                                                                                                                                                                                                                                                              | `04_rouault_policy_overlay.md`               | DOM / CSS / ARIA / state / generated files / search / security等の契約観点の正本                                                                    |
| ChatGPT / Codexへ渡すプロンプト                                                                                                                                                                                                                                                                                                                                                                                                                     | `05_chatgpt_codex_prompts.md`                | プロンプト内容は上記正本に従属する                                                                                                                  |
| 実装後順序、完了条件、再ループ、ロールバック、コミット前確認                                                                                                                                                                                                                                                                                                                                                                                        | `06_completion_commit.md`                    | 実装後順序と完了判定の正本                                                                                                                          |
| 人間、ChatGPT、Codexの役割分担                                                                                                                                                                                                                                                                                                                                                                                                                      | `07_roles.md`                                | Codex利用境界の正本                                                                                                                                 |
| R4 / A2機械可読契約、正規化、Schema、検証CLI契約                                                                                                                                                                                                                                                                                                                                                                                                    | `08_r4_schema_and_validation.md`、`schemas/` | R4 Lightweight Resolution Manifest / Artifact Manifest / Ledger / ClosureおよびA2 Evidence Integrity Attestationの構造制約とvalidator意味制約の正本 |

正本同士が矛盾する場合は、修正を開始せず、矛盾をIssue BriefまたはR2-lite Run Cardに記録してから、該当ファイルを更新します。

## ファイル構成

| ファイル                         | 用途                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `00_README.md`                   | ファイル群の全体説明                                 |
| `01_entry_and_risk.md`           | 最初に読む入口判定、重大度、リスク段階、R別成果物    |
| `02_core_workflow.md`            | 問題解決の標準フロー                                 |
| `03_templates.md`                | 成果物テンプレート                                   |
| `04_rouault_policy_overlay.md`   | Rouault固有の契約・設計チェックリスト                |
| `05_chatgpt_codex_prompts.md`    | ChatGPT / Codexに渡すためのプロンプト集              |
| `06_completion_commit.md`        | 完了条件、再ループ、ロールバック、コミット前整理     |
| `07_roles.md`                    | 人間、ChatGPT、Codexの役割分担                       |
| `08_r4_schema_and_validation.md` | R4 / A2の機械可読契約、正規化、Schema、検証CLI契約   |
| `schemas/`                       | R4 / A2主要成果物のJSON Schema雛形                   |
| `tools/`                         | JSON Schema検証とvalidator意味制約を実行する最小実装 |
| `samples/`                       | validator確認用の正常/異常最小JSONサンプル           |

## v85更新要点

```text
- superseded終端eventの置換先R4P-* Phase IDが自Phaseでないことを検証する
- superseded終端eventの置換先R4P-* Phase IDがLedger内に存在することを検証する
- completion modeでは、置換先Phaseの最終statusがpassedまたはgrounded supersededであることを検証する
- Issue incomplete参照を単なる語句ではなく `Issue incomplete: <ID>` 形式へ限定する
- Phase Execution Event Logの同一Phase内でplan_revisionまたはtimestampが逆行した場合はvalidatorで拒否する
- Ledger内の各plan_revision系fieldがcurrent_plan_revisionを超えた場合はvalidatorで拒否する
- superseded置換先、Issue incomplete参照、event chronology、current_plan_revision上限のinvalidサンプルを追加する
```

最小検証は次で実行します。

```bash
python -m pip install -r tools/requirements.txt
python tools/validate-workflow-artifacts.py --sample-manifest samples/manifest.json
python tools/validate-workflow-artifacts.py --schema schemas/r4-execution-ledger.schema.json --file samples/valid/r4-s-execution-ledger.lifecycle-passed.json --mode completion
```

## 推奨運用

最初は必ず `01_entry_and_risk.md` を読み、R0〜R4の暫定段階を決めます。Evidence作成後、`02_core_workflow.md` でR段階を確定または昇格します。

```text
01_entry_and_risk.md
  ↓
高リスク条件を先に確認して暫定R段階を決定
  ↓
02_core_workflow.md
  ↓
Evidence後にR段階を確定または昇格
  ↓
03_templates.md
  ↓
必要に応じて 04_rouault_policy_overlay.md
  ↓
必要に応じて 05_chatgpt_codex_prompts.md
  ↓
06_completion_commit.md
  ↓
必要に応じて 07_roles.md
  ↓
R4では 08_r4_schema_and_validation.md と schemas/
```

## 成果物の保存場所と命名規則

R1以上で成果物を残す場合は、原則として次の場所に保存します。リポジトリへコミットするかどうかは、機密情報、作業規模、運用方針に応じて判断します。

```text
docs/problem-workflows/YYYY-MM-DD-<short-slug>/
```

推奨ファイル名です。過去Artifact Revisionの正本はRevision別に保存し、固定名ファイルは索引またはlatest参照に限定します。

```text
00_issue-brief.md
01_evidence.md
02_cause.md
03_fix-plan.md
04_verification.md
05_completion.md
artifacts/<artifact-id>/rev-0001.md
artifacts/<artifact-id>/rev-0002.md
artifacts/manifests/<manifest-id>/rev-0001.json
artifacts/manifests/<manifest-id>/rev-0002.json
```

R2-liteでは、次の単一ファイルに統合してよいです。

```text
r2-lite-run-card.md
```

保存しない場合でも、最終回答、Issue、Pull Request、または作業メモ上で、R段階、Evidence、原因、変更、Verification、完了条件を追跡できる状態にします。個人ノート本文、ローカルパス、URL、秘密情報、未redactログは、原則としてコミット対象にしません。

## 最重要原則

R1以上の修正では、次の対応関係を常に説明できる必要があります。

```text
Failure ID
  ↔ Cause ID
  ↔ Change ID
  ↔ Success ID
  ↔ Verification ID
```

補助変更がある場合は、次で管理します。

```text
Support ID
  ↔ 対応するChange ID
  ↔ 補助変更の必要性
  ↔ 検証または差分確認
```

この対応で説明できない変更は、原則として実装しません。

## R0での例外

R0では、`Failure / Cause / Change / Success / Verification` を必須にしません。

R0は、誤字、コメント、ドキュメントの軽微修正など、挙動・契約・テスト・生成物・lockfileに影響しない変更だけに限定します。

ユーザー可視のUI文言、ARIA名、検索対象、snapshot、visual / paint contractに影響する文言変更はR0にしません。設計文書、仕様文書、AGENTS.md、ワークフロー、テスト方針、package manager policyなど、運用・契約・実装判断に影響する文書の意味変更もR0にしません。

R0で必要なのは次だけです。

```text
- 変更理由
- 変更範囲
- 挙動影響なしの確認
- git diff確認
```

## v79までの主な補強点

v79までに、R4-S / R4-I / R4-AのProfile分離、Manifest / Ledger / Closure / A2の機械可読契約、`null` / `[]` / `N/A`の使い分け、JSON Schema制約、validator意味制約を整理しています。

```text
- R4-SではLightweight Resolution Manifest Revision、R4-I / R4-AではArtifact Manifest RevisionをRevision別ファイルへ不変保存する
- ArtifactKeyとArtifactRefを分離し、storage classとimmutable locatorを明示する
- Manifest Entryへadd / correct / revokeと一意な正本選択規則を追加する
- R4-AではManifest AnchorでClosure判断に使うManifest Revisionの完全性を固定する
- repository-redacted / local-private / ci-private / external-restrictedを分離する
- 前段RecordにはLedger registration payloadだけを記録し、実登録結果を書き戻さない
- Current StatusへFinal State Artifact種別 / ArtifactRefを追加する
- necessity評価をrequired / conditional-activated / conditional-not-activated / optional-executed / optional-not-runへ統一する
- pre-final Ledger自身をAttestationで自己証明せず、R4-SではLightweight Resolution Manifest解決、R4-I / R4-AではManifest digestとFinal Verification再計算で検証する
- R4-SではLightweight Resolution ManifestでArtifactKeyを解決し、Final VerificationとR4 Completion Recordで完了を扱う
- R4-IではArtifact ManifestでArtifactKeyを解決し、Final VerificationをManifestへ登録・anchorしたうえでR4 Completion Recordで完了を扱う
- R4-AではFinal VerificationをManifestへ登録・anchorしてからClosure Manifestを作成し、Closure Manifest登録後の最終Manifest Revisionを別のManifest Anchorで固定する
- A2 Evidence Integrity Attestationで非R4のA2証拠保全を閉じられるようにする
- R4をR4-S / R4-I / R4-Aへ分け、Closure Manifest / Closure AttestationをR4-Aへ限定する
- Closure Attestation Schemaで`fail`または`manual-review-required`から`closed`を導出できないようにする
- R4 / A2主要成果物のSchema雛形を追加する
- R4-S用にLightweight Resolution ManifestテンプレートとSchemaを追加する
- Artifact Manifest / Lightweight Resolution Manifest Schemaで`correct`は`supersedes_entry_id`必須、`revoke`は`supersedes_entry_id`と`reason`必須、`add`は`supersedes_entry_id`と`reason`を持たないことを必須にする
- R4-Sの`manifest_anchor_id`は`null`または`N/A`、または非空Anchor IDに限定し、空文字列を禁止する
- `repository-redacted`では`digest_public=true`を必須とし、非公開digestはprivate / restricted側だけで扱うことを明確化する
- Lightweight Resolution Manifest / Artifact Manifest / Manifest Anchor / Closure Manifest / Closure Attestationの用語を整理する
- JSON Schema validatorではDraft 2020-12の`format: date-time` assertionを有効化し、RFC 3339同等の時刻検証を必須にする
- R4-AではClosure Attestationをclosed導出の正本とし、R4 Completion Recordは任意要約に限定する
- R4 Execution Ledgerの関連ID欄では`N/A`文字列を禁止し、該当なしは`null`に統一する
- Evidence Record N/A理由とVerification不要理由は、Schema上も常時fieldを持ち、該当しない場合は`null`に統一する
- Phase Evidence対応表のVerification要否はJSON Schema上のbooleanに合わせ、`true` / `false`を正本値にする
- R4 Execution Ledgerの`phase_evidence_map`と`artifact_validation_attestations`は空配列を禁止し、少なくとも1件以上を要求する
- `related_ids_na_reason`は、`null`になっている関連ID種別をすべて含むことをvalidator意味制約として明記し、テンプレート例も追加する
- `phase_execution_event_log`と`phase_evidence_map`のQualified Phase ID対応をvalidator意味制約として明記し、失敗時はCompletion / Closure不可とする
```

## v79最終補強点

- `phase_necessity_evaluation_log`をSchema上もrequired + `minItems: 1`にする
- R4 Execution Event LogのEvidence ID空欄は`N/A`ではなく空配列`[]`で表す
- Closure / A2系SchemaのID、locator、actor、method等に`minLength: 1`を追加する
- `related_ids_na_reason`に最低限の種別語patternを追加し、完全な種別網羅はvalidator意味制約で検証する
