# 08. R4 Schema and Validation

このファイルは、R4 / A2の機械可読契約、正規化、Schema、検証CLI契約の正本です。Markdownテンプレートは人間が読むための正本ですが、R4-S / R4-I / R4-AおよびA2完了判定では本ファイル、`schemas/` の構造制約、validatorの意味制約に照合します。

## 1. 位置づけ

R0〜R4は変更・レビュー・検証のリスク段階です。A0〜A2は証拠保全・監査保証レベルです。R4は一括実装するとレビュー不能な変更を分割するための段階であり、暗号学的監査を常に要求する段階ではありません。暗号学的保証、private Manifest、外部署名、Closure Attestationの要否・強度はAレベルとR4 Profileで決めます。

```text
R軸:
- R0: 挙動影響なし
- R1: 原因明確・小規模
- R2-lite: 日常的中規模、原因と変更境界が明確
- R2-full: 原因調査・影響確認・契約確認が必要
- R3: 仕様判断、契約変更、安全性、アクセシビリティ意味変更
- R4: 一括レビュー不能。フェーズ分割が必要

A軸:
- A0: 通常Evidenceで十分
- A1: SHA-256、保存場所、CIログ、後日検証が必要
- A2: private / restricted Evidence、Evidence Integrity Attestation、redaction、保持、失効が必要。R4-Aの場合だけClosure Attestationを追加する
```

## 1.1 R4 Profile

```text
R4-S structural:
- Phase Plan、軽量Resolution Manifest、Execution Ledger、Phase成果物、Final R4 Disposition Verification、Completion Recordを要求する
- 軽量Resolution ManifestはArtifactKey解決用であり、Manifest Anchor、SHA-256固定、Closure Attestationは必須ではない
- 状態遷移、Active Phase Set、Final State ArtifactRefの再計算は必須

R4-I integrity:
- R4共通構造検証を行う
- ただしArtifactKey解決にはLightweight Resolution ManifestではなくArtifact Manifestを使う
- SHA-256、Manifest Anchor、Manifest chain検証、digest一致、Anchor妥当性を追加する

R4-A audit:
- R4-Iにprivate / restricted Manifest、Closure Manifest、Closure Attestation、必要な外部署名またはCI attestationを追加する
- Closure Attestationのvalidation_resultがpassで、derived_closure_stateがclosedの場合だけclosedとする
```

## 1.1a Manifest用語

| 用語 | 用途 | 主な制約 |
|---|---|---|
| Lightweight Resolution Manifest | R4-SでArtifactKeyをArtifactRefへ解決する軽量索引 | SHA-256とAnchorは任意。ArtifactKeyの一意解決は必須 |
| Artifact Manifest | R4-I / R4-AでArtifactの完全性、訂正、失効、chainを管理するManifest | SHA-256、storage class、`correct` / `revoke`規則、Manifest chainを検証する |
| Manifest Anchor | R4-I / R4-AでArtifact Manifest Revisionを固定するAnchor | Manifest SHA-256、immutable path、Git commit SHAまたは署名情報を持つ |
| Closure Manifest | R4-AでClosure入力集合を固定するManifest | `closed`を自己宣言せず、proposed dispositionだけを記録する |
| Closure Attestation | R4-AでClosure Manifest、Ledger、Final Verification、Anchor集合を検証するAttestation | `pass + closed`だけがclosed導出条件になる |


## 1.2 Schemaとvalidatorの責務

```text
JSON Schemaで検証するもの:
- 必須field
- 型
- enum
- pattern
- 条件付き必須項目
- fail / manual-review-requiredからclosedを導出しない基本不変条件

validatorで検証するもの:
- Manifest chainの連結性
- Previous ManifestRefとsequenceの単調増加
- ArtifactKeyの一意解決
- SHA-256と保存バイト列の一致
- Ledger状態遷移
- Current Status、Active Phase Set、Final State ArtifactRefの再計算
- R4-AのClosure Manifest / Final Verification / Ledgerの相互整合
- repository-redacted Artifactへのprivate locator、未redactファイル名、公開不可digest漏えい検査
- phase_evidence_map と artifact_validation_attestations の参照先ArtifactKeyが、選択ProfileのManifestで解決できること
- related_ids_na_reason が、nullになっている関連ID種別（Failure / Cause / Change / Success / Verification）をすべて含むこと
- phase_execution_event_logに出現するqualified_phase_idが、phase_evidence_mapに少なくとも1件存在すること
- phase_evidence_mapにだけ存在するqualified_phase_idがある場合、R4 Phase Planに存在するPhaseであること
- 上記2つのQualified Phase ID対応検証が失敗した場合、R4-S / R4-IのCompletion Record、およびR4-AのClosure Attestationをcompleted / closed相当にしてはならない
```

Schemaだけでvalidator意味制約を満たしたと見なしてはいけません。Schemaがpassしても、validator意味制約がfailまたはmanual-review-requiredなら完了扱いにしません。

`format: date-time` は注釈ではなく検証条件として扱います。validatorはJSON Schema Draft 2020-12のformat assertionを有効化し、RFC 3339として時刻文字列を検証します。format assertionを利用できない実装では、同等のRFC 3339検証をvalidator意味制約で必ず実施します。

### 1.2.1 R4 Execution Ledgerの対応関係validator条件

`r4-execution-ledger.schema.json`は配列要素の構造を検証します。ただし、配列間の照合はvalidator意味制約として必ず実施します。

```text
- phase_necessity_evaluation_logが存在し、空配列でないこと
- phase_evidence_map は空配列にしない。Schema上も minItems: 1 とする
- artifact_validation_attestations は空配列にしない。Schema上も minItems: 1 とする
- phase_execution_event_log に出現する qualified_phase_id は、phase_evidence_map に少なくとも1件存在しなければならない
- phase_evidence_map にだけ存在する qualified_phase_id は、R4 Phase Planに存在するPhaseでなければならない
- これらのPhase ID対応検証に失敗した場合は、Completion / Closureを成立させない
- related_ids_na_reason は、nullになっている関連ID種別をすべて含まなければならない
  - 例: Failure: R0 Record Phaseのため対象外; Verification: Verification-only phaseでは対象外
- R4 Execution Event Logのevidence_idsは、Evidenceがない場合は空配列`[]`で表し、`N/A`文字列を使わない
```

## 1.3 A2 Evidence Integrity Attestationの完了validator条件

A2 Evidence Integrity Attestation Schemaは、失敗やmanual-review-requiredも記録できる構造制約です。ただし、`pass`を名乗る記録については、完了条件の一部をSchemaでも拘束します。最終的なA2完了扱いは、Schema passに加えて、validatorが少なくとも次をすべて満たす場合だけです。

```text
- integrity_result == pass
- derived_evidence_state == preserved
- private_locator_leak_check == pass
- non_public_digest_leak_check == pass
- human_approval.approved == true
- human_approval.approver が空でない
- repository-redacted evidence indexにprivate locator、未redactファイル名、公開不可digest、秘密情報が含まれない
```

Schemaがpassしても、この完了validator条件を満たさないA2 Attestationは完了根拠にしてはいけません。

## 2. 正規化規則

```text
text artifact:
- UTF-8
- BOMなし
- LF
- 末尾改行あり
- SHA-256対象は保存された生バイト列

json artifact:
- UTF-8
- BOMなし
- LF
- RFC 8785相当の正規化JSON
- object keyは辞書順
- 不要な空白を含めない
- 数値表現は正規化JSONの規則に従う

markdown artifact:
- SHA-256対象は保存されたMarkdownファイルの生バイト列
- 表示上の等価性ではなく保存バイト列を正本にする
```

CRLF、BOM、末尾改行欠落、formatter差分はdigestを変えます。digest差分を正規化で吸収してはいけません。必要なら新しいArtifact Revisionとして登録します。

## 3. Manifest chain規則

```text
- Manifest Revisionは `sequence` を持つ
- `sequence` は同一Manifest ID内で単調増加する
- Previous ManifestRefは直前Revisionを指す
- Entryはappend-onlyであり、既存Entryを上書きしない
- add / correct / revoke以外のactionを使わない
- correctは同じArtifactKeyの既存Entryをsupersedesする
- revokeは対象Entryと理由を必須にする
- 同一ArtifactKeyが複数の有効Entryへ解決される場合は不整合とする
```

ArtifactKey短縮表記はArtifactRefではありません。ArtifactKeyは、Resolution Manifest ID / Revisionで解決して初めてArtifactRefになります。R4-Sでは軽量Resolution Manifestによる解決で足りますが、R4-I / R4-AではResolution Manifest ID / Revisionに加えてManifest Anchorで固定します。

### 3.1 Lightweight Resolution Manifest規則

```text
- R4-S専用のArtifactKey解決表である
- ArtifactKey、storage class、immutable locator、登録日時、登録者を必須にする
- SHA-256、Git blob ID、Manifest Anchorは必須ではない
- SHA-256を記録しない場合はdigest optional reasonを必須にする
- digest statusはnot-recorded / public-digest / private-or-restricted-digestのいずれかにする
- correctはsupersedes entry IDを必須にする
- revokeはsupersedes entry IDとreasonを必須にする
- 同一ArtifactKeyが複数の有効ArtifactRefへ解決される場合は不整合とする
- manifest_anchor_idでAnchorなしを表す場合はnullまたはN/Aを使い、空文字列を使わない
```


## 4. Anchorと署名

```text
Manifest Anchor:
- Manifest ID
- Manifest Revision
- Manifest SHA-256
- immutable path
- storage scope
- Git commit SHAまたは署名情報
```

Git blob IDは補助識別子です。Git SHA-1リポジトリとGit SHA-256リポジトリの差異を明示します。Artifact完全性の主キーはSHA-256とManifest Anchorです。

署名を使う場合は次を記録します。

```text
- signature algorithm
- key ID
- public key reference
- signature valueまたは署名ファイルlocator
- revoked key listまたは失効確認方法
- verification command
```

## 5. Ledger状態機械

```text
status:
- planned
- ready
- in-progress
- blocked
- passed
- failed
- cancelled
- superseded
```

許可遷移です。

```text
N/A -> planned
planned -> ready
ready -> in-progress
in-progress -> passed
in-progress -> failed
ready -> blocked
in-progress -> blocked
blocked -> ready
planned -> cancelled
ready -> cancelled
in-progress -> cancelled
blocked -> cancelled
passed -> superseded
failed -> superseded
```

`failed`はR4完了状態にできません。後継Phaseで解決し、旧Phaseをsupersededにするか、Issue未完了として扱います。

## 6. Closure状態遷移

Closure Manifestはclosedを自己宣言しません。状態は次で導出します。

```text
R4-S:
1. Lightweight Resolution Manifestを確定する
2. pre-final R4 Execution Ledgerを凍結する
3. Final R4 Disposition Verificationを作成する
4. R4 Completion Recordで人間承認する

R4-I:
1. Artifact Manifestを確定し、ArtifactKey解決の正本にする
2. pre-final R4 Execution LedgerをArtifact Manifestへ登録し、Anchorする
3. Final R4 Disposition Verificationを作成する
4. Final VerificationをArtifact Manifestへ登録し、Anchorする
5. R4 Completion Recordで人間承認する

R4-A:
1. Artifact Manifestを確定し、ArtifactKey解決の正本にする
2. pre-final R4 Execution LedgerをArtifact Manifestへ登録し、Anchorする
3. Final R4 Disposition Verificationを作成する
4. Final VerificationをArtifact Manifestへ登録し、Anchorする
5. Closure Manifestを作成し、proposed closure dispositionを記録する
6. Closure ManifestをArtifact Manifestへ登録し、最終Manifest Anchor集合を作る
7. Closure Attestationが最終Manifest Anchor集合、Closure Manifest、Final Verification、Ledger、Active Phase Setを検証する
8. Closure Attestationのvalidation_resultとderived closure stateでclosed / not-closedを導出する
```

## 7. 検証CLI契約

実装する場合は、次のCLI入口を推奨します。

```bash
pnpm workflow:validate
pnpm workflow:append
pnpm workflow:anchor
pnpm workflow:close
```

最低限、`workflow:validate`は次を検証します。

```text
- JSON Schema妥当性
- R4-Sの軽量Resolution ManifestによるArtifactKey解決
- R4-I / R4-AのManifest chain
- ArtifactKey解決
- SHA-256一致
- private / restricted情報がrepository-redacted Manifestへ漏れていないこと
- Ledgerの状態遷移
- Current StatusとActive Phase Setの再計算
- Final Verification対象Artifactのvalid性
- R4-A Closure Attestationのvalidation_resultとderived closure state
- A2 Evidence Integrity Attestationのintegrity result、derived evidence state、漏えい検査、人間承認
```

validator未整備の場合、R4-I / R4-Aは`closed`として扱わず、`manual-review-required`または`proposed-closed`に留めます。R4-Sは人間承認によるCompletion Recordで閉じられますが、状態遷移、Active Phase Set、Final State ArtifactRefの再計算を省略してはいけません。A2ではEvidence Integrity Attestationが`pass / preserved`であり、漏えい検査がすべて`pass`、人間承認がtrueでない限り完了扱いにしません。


## 1.2.2 v79補強

Closure / A2系SchemaでもID、locator、actor、method等の空文字列はSchemaで拒否します。`related_ids_na_reason`はSchemaで最低限の種別語を要求し、完全な種別網羅はvalidator意味制約で検証します。


## 7.1 v82最小validator実装

このファイル群には、実運用前の破綻検出用として `tools/validate-workflow-artifacts.py` を同梱する。これは本番validatorの完全実装ではなく、次を確認する最小実装である。

```text
- `schemas/*.schema.json` によるJSON Schema Draft 2020-12検証
- `format: date-time` のformat assertion
- R4 Execution Ledgerの関連ID N/A理由の種別網羅
- Phase Necessity Evaluation Log / Phase Execution Event Log / Phase Evidence MapのQualified Phase ID対応
- necessity / evaluation_result の許容組合せ
- Phase Execution Event Logのstatus基本遷移
- event_class=initialization / progress / transition / outcome / retirement の許容遷移制約
- PhaseごとのEvent列整合
- 主要IDの重複検出
- Closure / A2系Schemaの基本的な正常/異常サンプル検証
```

実行例:

```bash
python -m pip install -r tools/requirements.txt
python tools/validate-workflow-artifacts.py --sample-manifest samples/manifest.json
python tools/validate-workflow-artifacts.py --schema schemas/r4-execution-ledger.schema.json --file samples/valid/r4-s-execution-ledger.min.json
```

`--sample-manifest` は、正常系サンプルがvalidになり、異常系サンプルがinvalidになることをまとめて確認する。Schemaを通過するがvalidator意味制約に違反するサンプルも含めるため、Schemaだけの合格を完了条件としては扱わない。

validatorは、少なくとも次の組合せだけを許可する。

```text
necessity=required    -> evaluation_result=required
necessity=conditional -> evaluation_result=conditional-activated / conditional-not-activated
necessity=optional    -> evaluation_result=optional-executed / optional-not-run
```

validatorは、少なくとも次のstatus遷移を許可し、それ以外を拒否する。

```text
N/A -> planned
planned -> ready
ready -> in-progress
in-progress -> passed / failed
ready / in-progress -> blocked
blocked -> ready / cancelled
planned / ready / in-progress -> cancelled
failed / passed -> superseded
```

validatorは、`phase_execution_event_log`を`qualified_phase_id`ごとにグルーピングし、各Phaseの最初のeventが`event_class=initialization`かつ`N/A -> planned`であること、後続eventの`from_status`が直前eventの`to_status`と一致すること、`cancelled`または`superseded`到達後に後続eventがないことを検証する。

`event_class`別の許容遷移は次だけを許可する。

```text
initialization: N/A -> planned
progress: planned -> ready, ready -> in-progress
transition: ready -> blocked, in-progress -> blocked, blocked -> ready
outcome: in-progress -> passed, in-progress -> failed
retirement: planned / ready / in-progress / blocked -> cancelled, passed / failed -> superseded
```



## 7.2 v83 structural / completion mode

`tools/validate-workflow-artifacts.py` は、R4 Execution Ledger検証に `--mode structural` と `--mode completion` を持つ。

```text
structural:
  Ledgerの途中状態を許容する。Schema、format、Phase ID対応、necessity/result組合せ、status遷移、event_class、PhaseごとのEvent列整合、主要ID重複を検証する。

completion:
  structuralの検証に加えて、R4-S / R4-IのCompletion Record、およびR4-AのClosure Attestation入力として成立するかを検証する。
```

completion modeでは、Phaseごとの最終statusと`phase_necessity_evaluation_log.evaluation_result`の対応を検証する。`required`、`conditional-activated`、`optional-executed`は`passed`終端を要求する。`conditional-not-activated`、`optional-not-run`は`cancelled`終端を要求する。`planned`、`ready`、`in-progress`、`blocked`、`failed`で終わるPhaseはCompletion / Closure不可とする。

`superseded`終端は例外的な置換終端であり、structural modeでも根拠を必須とする。terminal eventの`reason`には、`superseded by`、`replacement`、`replaced by`のいずれかのmarkerに加え、置換先`R4P-*` Phase IDまたは`Issue incomplete: <ID>`形式の具体参照を含める。置換先Phase IDは自Phase以外で、同一Ledger内に存在しなければならない。completion modeでは、置換先Phaseの最終statusが`passed`またはgrounded `superseded`でなければならない。


## 7.3 v85 superseded replacement / event chronology / plan revision ceiling

`superseded`根拠検証は、completion mode固有ではなくstructural modeでも実行する。`superseded`終端eventの`reason`は、単に`replacement`等のmarkerを含むだけでは不十分であり、置換先`R4P-*` Phase IDまたは`Issue incomplete: <ID>`形式の具体参照を含む必要がある。

置換先Phase IDを使う場合、validatorは次を検証する。

```text
- 置換先Phase IDが自Phase IDと異なること
- 置換先Phase IDがphase_evidence_map上に存在すること
- completion modeでは、置換先Phaseの最終statusがpassedまたはgrounded supersededであること
```

`Issue incomplete`で閉じる場合、単なる語句ではなく `Issue incomplete: <ID>` 形式を使う。

`phase_necessity_evaluation_log`はappend-only配列として扱う。正本順序はJSON配列順であり、同一Qualified Phase IDに複数評価がある場合、completion modeでは配列上の最後の評価を最新評価として採用する。同一Phaseの評価eventは、`plan_revision`と`timestamp`が逆行してはならない。逆行が検出された場合は、structural modeでも不正とする。

`phase_execution_event_log`もQualified Phase IDごとのappend-only状態遷移列として扱う。同一Phaseのevent列では、`plan_revision`と`timestamp`が逆行してはならない。

Ledger内の`phase_necessity_evaluation_log[*].plan_revision`、`phase_execution_event_log[*].plan_revision`、`phase_evidence_map[*].validated_plan_revision`、`artifact_validation_attestations[*].validated_against_plan_revision`、`artifact_validation_attestations[*].created_against_plan_revision`は、top-level `current_plan_revision` を超えてはならない。
