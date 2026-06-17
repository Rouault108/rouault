# R4 / A2 JSON Schemas

このディレクトリは、R4 / A2主要成果物の機械可読Schema雛形です。R4-SのArtifactKey解決にはLightweight Resolution Manifestを使い、R4-I / R4-Aの完全性固定にはArtifact ManifestとManifest Anchorを使います。

現時点ではMarkdownテンプレートを完全置換するものではなく、完了判定で最低限検証すべき構造を固定するための契約です。

## Schema対象

- `lightweight-resolution-manifest.schema.json`
- `artifact-manifest.schema.json`
- `r4-execution-ledger.schema.json`
- `closure-manifest.schema.json`
- `closure-attestation.schema.json`
- `a2-evidence-integrity-attestation.schema.json`

## 責務分離

JSON Schemaは、必須field、型、enum、pattern、条件付き必須項目を検証します。validatorはDraft 2020-12の`format` assertionを有効化し、`format: date-time`をRFC 3339として検証します。format assertionを利用できない実装では、同等のRFC 3339検証をvalidator意味制約で必ず実施します。

次はJSON Schemaだけでは完結しないため、`08_r4_schema_and_validation.md` のvalidator意味制約で検証します。

```text
- Manifest chainの連結性
- sequenceの単調増加
- R4-Sの軽量Resolution ManifestによるArtifactKeyの一意解決
- R4-Sの軽量Resolution Manifestで、Anchorなしを表す値がnullまたはN/Aに限定されていること
- R4-I / R4-AのArtifactKeyの一意解決
- SHA-256と保存バイト列の一致
- Ledger状態遷移
- Current Status、Active Phase Set、Final State ArtifactRefの再計算
- R4-A Closure Attestationの入力集合と導出結果の整合
- repository-redacted Artifactへのprivate locator、未redactファイル名、公開不可digest漏えい検査
- A2 Evidence Integrity Attestationの完了validator条件（pass / preserved / 漏えい検査pass / 人間承認true）
- phase_evidence_map と artifact_validation_attestations の参照先ArtifactKeyが、選択ProfileのManifestで解決できること
- related_ids_na_reasonが、nullになっている関連ID種別（Failure / Cause / Change / Success / Verification）をすべて含むこと
- phase_execution_event_logとphase_evidence_mapのqualified_phase_id対応が成立すること
```

## ArtifactKey表記

Markdown本文では、簡略表記として `ART-001@rev-0003` を許可します。JSON Schema入力では、ArtifactKeyを次のobject表現へ正規化します。

```json
{
  "artifact_id": "ART-001",
  "artifact_revision": "rev-0003"
}
```

validatorは、Markdown由来の簡略表記をJSON検証前にobject表現へ正規化するか、Schema入力ではobject表現だけを受け付けます。`ART-001@rev-0003` の文字列をそのままJSON Schema入力に入れてはいけません。

## action reasonの扱い

Manifest Entryの`reason`は`correct` / `revoke`用の変更理由です。`add`では`supersedes_entry_id`と`reason`を持ちません。初回登録の説明が必要な場合は、Schema外の説明欄、または将来導入する`registration_note`相当の別fieldで扱います。

Schemaがpassしても、validator意味制約がfailまたはmanual-review-requiredなら完了扱いにしません。

## R4 Execution Ledger Profile制約

`r4-execution-ledger.schema.json`では、top-levelの`resolution_manifest`、`phase_execution_event_log[*].resolution_manifest`、`phase_evidence_map[*].resolution_manifest`のすべてにProfile別制約を適用します。R4-Sでは`manifest_kind=lightweight-resolution-manifest`、R4-I / R4-Aでは`manifest_kind=artifact-manifest`かつ`manifest_anchor_id`は非空・`N/A`不可です。

`phase_evidence_map`では、`evidence_record_artifact_keys`が空の場合に`evidence_record_na_reason`を必須にし、1件以上ある場合は`evidence_record_na_reason=null`とします。
`phase_evidence_map`自体は空配列にしてはいけません。Schema上も`minItems: 1`を要求します。

`artifact_validation_attestations`では、`validity=valid`の場合にEvidence IDを1件以上要求し、`validity=superseded`の場合は置換先ArtifactKeyまたはArtifactRefの少なくとも一方を要求します。
`artifact_validation_attestations`自体は空配列にしてはいけません。Schema上も`minItems: 1`を要求します。
`phase_evidence_map`では、関連Failure / Cause / Change / Success / Verification IDのいずれかが`null`の場合、`related_ids_na_reason`を非空文字列で必須にします。すべての関連IDが非`null`の場合、`related_ids_na_reason`は`null`にします。

`artifact-manifest.schema.json`では、R4-I / R4-Aの完全性固定の正本として、Issue ID、Manifest参照、Artifact ID、Entry ID、public locator、registered_byなどの空文字列を許容しません。

## v79補足: `null` / 空配列 / N/A理由の運用

`phase_evidence_map`では、`evidence_record_artifact_keys`が1件以上ある場合、`evidence_record_na_reason`は`null`です。`evidence_record_artifact_keys`が空配列`[]`の場合、`evidence_record_na_reason`は非空文字列です。`phase_r_stage=R3`では、`evidence_record_artifact_keys`は1件以上でなければなりません。

`related_failure_id`、`related_cause_id`、`related_change_id`、`related_success_id`、`related_verification_id`のいずれかが`null`の場合、`related_ids_na_reason`は非空文字列です。関連ID欄で`N/A`文字列を使ってはいけません。すべて非`null`の場合、`related_ids_na_reason`は`null`です。
`related_ids_na_reason`は、`null`になっている関連ID種別をすべて含む形式で記録します。例: `Failure: R0 Record Phaseのため対象外; Verification: Verification-only phaseでは対象外`。この種別網羅性はvalidator意味制約で検証します。

`R4 Execution Ledger`、`Artifact Manifest`、`Lightweight Resolution Manifest`では、ID、actor、locator、reason等の意味を持つ文字列は原則として空文字列を許容しません。JSON Schemaの`format: date-time`はFormatCheckerまたは同等のRFC 3339検証を有効にして検証します。

`phase_evidence_map.verification_required`はJSON Schema上booleanです。Markdown表でも原則として`true` / `false`を記録します。旧表現の`要` / `不要`を受け取る場合、validatorはJSON Schema検証前に`要 -> true`、`不要 -> false`へ正規化しなければなりません。

## v79補足: R4-A / A2補強

- `phase_necessity_evaluation_log`は必須であり、空配列にしてはいけません。Schema上もrequired + `minItems: 1`を要求します。
- R4 Execution Event Logの`evidence_ids`は、Evidenceがない場合は空配列`[]`で表します。`N/A`文字列は使いません。
- `related_ids_na_reason`には、最低限`Failure|Cause|Change|Success|Verification`のいずれかの種別語を含めます。nullになっている全種別の網羅はvalidator意味制約で検証します。
- Closure / A2系Schemaでも、ID、locator、actor、method、verification evidence ID等の意味を持つ文字列は空文字列を許容しません。

## v82補足: validatorとサンプルセット

`tools/validate-workflow-artifacts.py` は、`schemas/` のJSON Schema検証に加えて、R4 Execution Ledgerのvalidator意味制約を最小限実装する。`samples/manifest.json` は各サンプルの期待結果を宣言し、正常系と異常系の両方を一括検証する。

このvalidatorは仕様文書の完全な本番実装ではない。目的は、Markdown精査だけでは見落としやすい次の破綻を機械的に検出することである。

```text
- JSON Schema違反
- format: date-time違反
- `related_ids_na_reason`にnull関連ID種別が含まれない状態
- Event Logに存在するQualified Phase IDがPhase Evidence Mapに存在しない状態
- Necessity Evaluation Logに存在するQualified Phase IDがPhase Evidence Mapに存在しない状態
- necessity / evaluation_result の不正組合せ
- Phase Execution Event Logの不正status遷移
- event_class=initialization / progress / transition / outcome / retirement の不正遷移
- PhaseごとのEvent列不整合
- 主要ID重複
```

### v82 Event列整合制約

Phase Execution Event Logは単発eventではなく、`qualified_phase_id`ごとの状態遷移列として検証します。各Phaseの最初のeventは`event_class=initialization`かつ`N/A -> planned`でなければなりません。後続eventでは、直前eventの`to_status`と現在eventの`from_status`が一致しなければなりません。`cancelled`または`superseded`へ到達した後に後続eventを追加してはいけません。

`event_class`別の許容遷移は次を正本とします。

```text
initialization: N/A -> planned
progress: planned -> ready, ready -> in-progress
transition: ready -> blocked, in-progress -> blocked, blocked -> ready
outcome: in-progress -> passed, in-progress -> failed
retirement: planned / ready / in-progress / blocked -> cancelled, passed / failed -> superseded
```

## v83補足: structural / completion mode

`tools/validate-workflow-artifacts.py` は、R4 Execution Ledger検証に `structural` と `completion` の2 modeを持つ。`structural` は途中状態のLedgerを許容し、Schema、Phase ID対応、status遷移、event_class、PhaseごとのEvent列整合を検証する。`completion` はR4 Completion / Closure入力として使う場合の追加ゲートであり、Phase最終statusとnecessity評価の対応、active / incomplete終端の拒否、`superseded`終端の根拠記録を検証する。

completion modeの終端status規則は次を正本とする。

```text
required                  -> passed
conditional-activated     -> passed
optional-executed         -> passed
conditional-not-activated -> cancelled
optional-not-run          -> cancelled
planned / ready / in-progress / blocked / failed 終端 -> completion不可
superseded終端 -> terminal eventのreasonに superseded by / replacement / replaced by のいずれかを含み、かつ置換先R4P-* Phase IDまたはIssue incomplete参照を含む場合のみ許容
```

## v85補足: superseded置換先、event chronology、current_plan_revision上限

`superseded`終端eventの根拠検証は、`structural` / `completion` の両modeで必須とする。`reason`には、`superseded by`、`replacement`、`replaced by` のいずれかのmarkerに加え、置換先`R4P-*` Phase IDまたは`Issue incomplete: <ID>`形式の具体参照を含める。

置換先Phase IDを使う場合、validatorは自Phase参照を拒否し、置換先Phase IDが同一Ledger内に存在することを検証する。completion modeでは、置換先Phaseの最終statusが`passed`またはgrounded `superseded`でなければならない。

`phase_necessity_evaluation_log`と`phase_execution_event_log`の正本順序はJSON配列順とする。同一Qualified Phase IDの複数行では、`plan_revision`と`timestamp`が逆行してはならない。

Ledger内の各plan_revision系fieldは、top-level `current_plan_revision` を超えてはならない。対象は、necessity evaluation、execution event、phase evidence map、artifact validation attestationのplan revision fieldである。
