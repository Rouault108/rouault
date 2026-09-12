# 03. 成果物テンプレート

このファイルは、成果物テンプレート、R2-lite Run Card、Evidence、Intermittent Failure Evidence、Synthetic Fixture Record、R4 Phase Plan、Lightweight Resolution Manifest、Artifact Manifest、Manifest Anchor、R4 Execution Ledger、Phase Transition Record、Phase Outcome Record、Phase Disposition Record、Verification-only / Integration verification Record、Final R4 Disposition Verification、R4 Completion Record、A2 Evidence Integrity Attestation、Closure Manifest、Closure Attestation、Verification Matrixの正本です。

## 0. 共通記載規則

### 0.0 保存場所・命名規則

```text
保存場所:
- docs/problem-workflows/YYYY-MM-DD-<short-slug>/

R2-lite単一成果物:
- r2-lite-run-card.md

R2-full以上の推奨構成:
- 00_issue-brief.md
- 01_evidence.md
- 02_cause.md
- 03_fix-plan.md
- 04_verification.md
- 05_completion.md

Revision不変保存:
- artifacts/<artifact-id>/rev-0001.md
- artifacts/<artifact-id>/rev-0002.md
- artifacts/<artifact-id>/latest.md  # 任意の参照用コピー。正本ではない
- artifacts/manifests/<manifest-id>/rev-0001.json
- artifacts/manifests/<manifest-id>/rev-0002.json
- artifacts/manifests/<manifest-id>/latest.json  # 任意の参照用コピー。正本ではない
- artifacts/anchors/<manifest-anchor-id>.json     # 対象Manifestを含むcommitの外部または後続commitに保存
```

機密情報を含むEvidence、未redactログ、スクリーンショット、個人ノート本文、検索indexは、原則としてリポジトリへ保存しません。保存が必要な場合は、redaction済みであることを明示します。local-private、ci-private、external-restrictedのlocator、digest、ファイル名をrepository-redacted Manifestへそのまま記録しません。

Artifact RevisionとArtifact Manifest RevisionはRevision別ファイルへappend-onlyで保存します。固定名ファイルは索引または`latest`参照に限定し、過去Revisionの正本を上書きしません。Artifact自身のSHA-256、Git blob ID、commit SHAをArtifact本文へ埋め込みません。これらはArtifact外部のArtifact Manifestへ記録します。

### 0.0a 共通Artifactヘッダー、ArtifactKey、ArtifactRef、Artifact Manifest、Manifest Anchor

主要成果物は、個別テンプレートの先頭に次のヘッダーを持ちます。非R4ではR4固有項目を理由付きN/Aにします。個別テンプレートに同名項目がある場合、このヘッダーを正本とし、値を一致させます。

`ArtifactKey`は`Artifact ID + Artifact Revision`です。簡略表記`ART-001@rev-0003`はArtifactKeyであり、ArtifactRefそのものではありません。ArtifactKeyは選択したResolution Manifest Revisionで解決して初めてArtifactRefになります。
表の可読性のためArtifactKey簡略表記を使う場合は、同じArtifactまたは台帳内に`Resolution Manifest ID / Revision`を記録し、そのManifest Revisionから一意にArtifactRefへ展開できることを必須とします。R4-SではArtifactKey解決用の軽量Resolution Manifestを必須とし、Manifest AnchorはN/A可です。R4-I / R4-Aの完全性判断ではManifest RevisionだけでなくManifest Anchorも必須です。

用語の分担:

| 用語                            | 用途                                                                                      | 必須になるProfile |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ----------------- |
| Lightweight Resolution Manifest | ArtifactKeyをArtifactRefへ解決するためのR4-S用軽量索引。SHA-256固定とAnchorは必須ではない | R4-S              |
| Artifact Manifest               | SHA-256、storage class、訂正・失効、Manifest chainを扱う完全性Manifest                    | R4-I / R4-A       |
| Manifest Anchor                 | Artifact Manifest Revisionを固定するAnchor                                                | R4-I / R4-A       |
| Closure Manifest                | R4-Aで閉鎖候補の入力集合を固定するManifest                                                | R4-A              |
| Closure Attestation             | R4-Aでclosed / not-closedを導出するAttestation                                            | R4-A              |

```text
ArtifactKey:
- Artifact ID:
- Artifact Revision:
```

`ArtifactRef`は成果物間参照の最小単位です。repository-redactedではimmutable repository-relative pathを使い、local-private、ci-private、external-restrictedでは公開可能なopaque locator referenceを使います。実ローカルパスや機密locatorを公開Artifactへ書きません。

```text
ArtifactRef:
- ArtifactKey:
  - Artifact ID:
  - Artifact Revision:
- storage class: repository-redacted / local-private / ci-private / external-restricted
- immutable locator:
```

```text
Common Artifact Header:
- Artifact ID:
- Artifact Revision:
- Issue ID:
- R4 Phase Plan ID: <R4の場合 / N/A（非R4）>
- Created against R4 Phase Plan Revision: <作成時に準拠したRevision / N/A（非R4）>
- Qualified Phase ID: <R4のPhase成果物の場合 / N/A（非R4またはR4全体成果物）>
- Phase種別: <R4 Phaseまたは専用活動Recordの場合 / N/A（非Phase成果物）>
- Phase R段階: <対象活動のR段階 / N/A（R段階を持たない全体成果物）>
- 作成日時: <RFC 3339>
- storage class: repository-redacted / local-private / ci-private / external-restricted
- immutable locator:
- supersedes ArtifactRef: <該当なしの場合N/A（初版）>
```

Artifact本体には作成時の不変情報だけを記録します。現在のPlan Revisionに対する有効性、現在状態、hash、Git情報、後段Execution Event、後段Final Verification、登録先Manifest Revisionは書き戻しません。

```text
ManifestRef:
- Manifest ID:
- Manifest Revision:
- immutable relative path:
```

```text
Lightweight Resolution Manifest:
- Manifest ID:
- Issue ID:
- Manifest Revision:
- immutable relative path:
- Previous ManifestRef: <初版はN/A>
- Manifest Anchor ID: <R4-SではN/A可。Anchorを作成した場合だけ記録>
- Entries:
  | Resolution Entry ID | action | Artifact ID | Artifact Revision | storage class | immutable locator | SHA-256 | digest status | digest optional reason | supersedes Entry ID | reason | registered at | registered by |
  |---|---|---|---:|---|---|---|---|---|---|---|---|---|
  | LRM-001-ENTRY-0001 | add | ART-001 | rev-0001 | repository-redacted | artifacts/ART-001/rev-0001.md | N/A | not-recorded | R4-Sではdigest固定不要 | null | null | <RFC 3339> | ... |
```

Lightweight Resolution Manifest規則:

- R4-S専用のArtifactKey解決表であり、ArtifactKeyをstorage classとimmutable locatorを含むArtifactRefへ一意に解決する
- SHA-256、Git blob ID、Manifest Anchorは必須ではない。ただし、記録する場合は保存バイト列と一致している必要がある
- `digest status`は`not-recorded` / `public-digest` / `private-or-restricted-digest`のいずれかとする
- SHA-256を記録しない場合は`digest optional reason`を必須とする
- `add`は初回登録専用であり、`supersedes Entry ID`と`reason`を持たない。登録説明が必要な場合は`reason`ではなく別の`registration note`を使う
- `correct`は同じArtifactKeyの既存Entryを置換するため、`supersedes Entry ID`を必須とする
- `revoke`は既存Entryを失効させるため、`supersedes Entry ID`と失効理由を必須とする
- 同一ArtifactKeyが複数の有効Entryへ解決される、訂正鎖が循環する、またはArtifactKeyが複数locatorへ解決される場合は不整合として処理を停止する
- R4-SでAnchorなしを表す場合は`Manifest Anchor ID`を`N/A`または`null`相当として扱い、空文字列を使わない

```text
Artifact Manifest:
- Manifest ID:
- Issue ID:
- Manifest Revision:
- immutable relative path:
- Previous ManifestRef: <初版はN/A>
- Entries:
  | Manifest Entry ID | action | Artifact ID | Artifact Revision | storage class | public locator | private locator reference | SHA-256 | digest公開可否 | Git blob ID | size bytes | supersedes Entry ID | reason | registered at | registered by |
  |---|---|---|---:|---|---|---|---|---|---|---:|---|---|---|---|
  | MAN-001-ENTRY-0001 | add | ART-001 | rev-0001 | repository-redacted | artifacts/ART-001/rev-0001.md | N/A | ... | yes | ... | ... | null | null | <RFC 3339> | ... |
```

Manifest Entry action:

- `add`: ArtifactKeyを初回登録する。`supersedes Entry ID`と`reason`は持たない
- `correct`: 既存Entryを訂正する。`supersedes Entry ID`を必須とする
- `revoke`: 既存Entryを失効させる。`supersedes Entry ID`と失効理由を必須とする

Manifest Entry解決規則:

- 選択したManifest RevisionまでのEntryをappend-only順に評価する
- 同じArtifactKeyについて、最新の有効な`add`または`correct` Entryを正本とする
- `correct`は置換対象Entry IDを明示し、置換対象と同じArtifactKeyを持つ
- `revoke`されたEntryおよびそのEntryだけに依存する解決結果を使用しない
- 同順位の有効Entryが複数存在する、訂正鎖が循環する、またはArtifactKeyが複数locatorへ解決される場合はManifest不整合として処理を停止する

storage class規則:

- `repository-redacted`: public locator、SHA-256、Git blob ID、`digest_public=true`を必須とする
- `local-private`: repository-redacted Manifestには公開可能なopaque locator referenceだけを記録する。実path、未redactファイル名、digestを公開してはならない場合はprivate Manifestへ分離する
- `ci-private`: CIのrestricted locator referenceを使い、公開可能な範囲だけをrepository-redacted Manifestへ記録する
- `external-restricted`: 外部保管先のopaque referenceを使い、アクセス権限と保持期間を別のrestricted recordで管理する
- `digest_public=false`の成果物は`local-private` / `ci-private` / `external-restricted`として登録し、repository-redacted側には公開可能なopaque referenceだけを置く
- repository-redacted Manifestへ非公開digestを書いてはならない
- Git blob IDは`repository-redacted`だけで必須とし、その他は理由付きN/Aとする

Artifact Manifest規則:

- Manifest Revision自体を`artifacts/manifests/<manifest-id>/rev-XXXX.json`へ不変保存する
- Artifact保存後に外部からSHA-256等を計算し、Manifestへappend-onlyで登録する
- Artifact本文は自身のManifest Entry、hash、commit SHA、登録先Manifest Revisionを参照しない
- Manifest Entryの修正は上書きせず、新しいManifest Revisionで`correct`または`revoke` Entryを追加する
- ArtifactRefの解決結果が選択したManifest Revisionの正本Entryと一致しない場合、そのArtifactを使用しない
- repository-redacted Manifestとprivate Manifestを分離する場合、公開Manifestからprivate locatorや個人データ由来digestを推測できないようにする

Manifest正規化と検証:

- Manifest / Anchor / Ledger / Closure / Attestationの機械可読表現は`../r4-validation/08_r4_schema_and_validation.md`と`../r4-validation/schemas/`に従う
- 公開Manifestのハッシュ対象は、UTF-8、BOMなし、LF、末尾改行ありで保存された正規化JSONのバイト列とする
- JSONはRFC 8785相当の正規化JSONを基準とする。Markdown成果物は保存された生バイト列をSHA-256対象とし、CRLFやBOMが混入した場合は別digestになる
- Git blob IDは補助識別子であり、SHA-1 / SHA-256リポジトリの差異を明記する。Artifact完全性の主キーはSHA-256とManifest Anchorとする
- Manifest Revisionには単調増加する`sequence`を持たせ、append-only順序は`sequence`、同一sequence禁止、Previous ManifestRefの連鎖で検証する
- 署名を使う場合は、署名方式、key ID、公開鍵参照、失効・ローテーション規則、検証コマンドをManifest AnchorまたはClosure Attestationに記録する

```text
Manifest Anchor:
- Manifest Anchor ID:
- Manifest ID:
- Manifest Revision:
- immutable relative path:
- storage scope: repository-redacted / private / restricted
- Manifest SHA-256:
- Git commit SHA:
- signed tag / external signature:
- verified at: <RFC 3339>
- verified by:
- verification result: valid / invalid
```

Manifest Anchor規則:

- R4-AのClosure判断に使うManifest RevisionはManifest Anchorで固定する。R4-IのFinal Verification判断に使うManifest RevisionもManifest Anchorで固定する
- Git commit SHAまたは外部署名の少なくとも一方を必須とする
- Manifest Anchorは対象Manifest Revisionおよび対象Manifestを含むGit commitの外部に保存し、対象Manifest本文へAnchor IDを書き戻さない
- Git commit SHAを使うAnchorはannotated / signed tag、CI attestation、外部署名、または対象commit後の別commitに保存し、対象commit自身へ埋め込まない
- Anchor検証に失敗したManifest RevisionをClosureまたはFinal Verificationへ使用しない

対象はR0 Record、Mini Evidence、Minimum Evidence Packet、Evidence Record、Intermittent Failure Evidence、Synthetic Fixture Record、Mini Brief、R2-lite成果物、Issue Brief、Cause、Contract Inventory、Decision Record、各Transition / Outcome / Disposition Record、Fix Plan、R4 Phase Plan、R4 Execution Ledger、Verification Record、Final R4 Disposition Verification、Closure Manifest、Verification Matrix、手動確認記録です。

### 0.0b 成果物参照グラフ

後段成果物から前段成果物だけを参照し、前段成果物へ後段IDを書き戻しません。正本の参照方向は次です。

```text
R4 Phase Plan
  ↓
Phase活動Artifact
  ↓
Phase Transition / Outcome / Disposition Artifact
  ↓
Phase Execution Event Log
  ↓
Current Status / Active Phase Set導出ビュー
  ↓
pre-final R4 Execution Ledger
  ↓
Verification Input Manifest Anchor集合
  ↓
Final R4 Disposition Verification
  ↓
Closure Input Manifest Anchor集合
  ↓
Closure Manifest
  ↓
Closure Manifest登録後の最終Manifest Anchor集合
```

逆引きはExecution Event Log、Artifact Validation Attestation、Artifact Manifest、Manifest Anchor、Closure Manifestから行います。Transition / Outcome / Disposition ArtifactからExecution Event、No-change CompletionからFinal Verification、Verification Recordから自身のArtifactRef、Closure Manifestから自身の登録先Manifest Revisionを参照しません。

### 0.1 N/A記載規則

```text
N/A記載規則:
- N/Aは、対象外である理由を1行以上で説明できる場合だけ使う
- 未確認、未調査、不明をN/Aにしない
- 完了条件に関係する項目は、N/Aにする場合でもVerification、専用Phase Outcome / Disposition Record、またはOut-of-scope Failure Recordで根拠を示す
- R3では、Contract Inventory、Decision Record、Verification、ロールバック方針をN/Aにしない
- R4では、全体Decision Record、Final R4 Disposition Verification、全体ロールバック方針をN/Aにしない
- R4 Phase Plan内の「関連Phase Decision ID」は、対象PhaseのPhase R段階でDecision Recordが不要な場合に限り、理由付きでN/A可
- R4 Phase Plan内の「関連全体Decision ID」は、R4全体Decision Recordの該当Decision IDを記録し、N/Aにしない
- R4 Execution Ledgerの「根拠Evidence対応」は、`Issue={Issue ID:[Evidence ID...]}; Failure={対象ID:[Evidence ID...]}; Cause={対象ID:[Evidence ID...]}; Change={対象ID:[Evidence ID...]}; Success={対象ID:[Verification Evidence ID...]}; Verification={対象ID:[Verification Evidence ID...]}; Observation={Detected Failure Observation ID:[Evidence ID...]}; Auxiliary={Support ID:[Evidence ID...]}` の対象IDキー形式で記録する
- 同一Evidenceが複数の対象IDを裏付ける場合は、各対象ID側から同じEvidence IDを参照する
- Evidenceが存在しない種別も省略せず、`種別={N/A:[対象外理由]}` と記録する。根拠Evidence対応フィールド自体を単独のN/Aにしない
- Implementation Phaseでは、Failure / Cause / Change / Success / Verificationに対応するEvidenceを原則として記録する
- R0 Record Phaseは、Issueを含む全種別をN/Aにできるが、各種別内へR0 Record固有の対象外理由を記録する
- Observation Evidenceがない場合も`Observation={N/A:[新規失敗観測なし]}`を記録する
- No-change PhaseはNo-change Completion ArtifactRef、No-action PhaseはNo-action Record ArtifactRefをOutcomeとして記録する。Investigation-only PhaseはDispositionに応じてTransitionまたはOutcomeとして記録する。Current Status導出ビューではFinal State Artifact種別とFinal State ArtifactRefを分けて記録する
- No-change Completion、No-action Record、Investigation-only RecordにEvidenceを内包していても、R4 Execution LedgerのPhase Evidence対応表の根拠Evidence対応へ実際のEvidence IDを対象ID単位で直接記録する。Completion / Record内部だけを正本にしない
- Verification-only / Integration verification Phaseは専用Recordを作成し、Verification Evidence indexが参照するEntry内のEvidence IDをVerification種別へ記録する。既存Failure / Cause / Changeを検証する場合は対応Evidenceも対象ID単位で参照する
- R4 Execution Ledgerの「Evidence Record ArtifactKey一覧」は、Phase R段階がR3以上の場合は空配列`[]`にしない
- Evidence Record ArtifactKey一覧はJSONでは配列で表す。Evidence Recordが不要な場合は空配列`[]`とし、Evidence Record N/A理由を非空文字列で記録する。Evidence Record ArtifactKey一覧に1件以上の参照がある場合、Evidence Record N/A理由は`null`とする
- Phase R段階がR2-full以下でEvidence Recordが不要な場合は、Evidence Record N/A理由を記録する
- 関連Failure / Cause / Change / Success / Verification IDのいずれかが`null`の場合は、関連ID N/A理由へID種別ごとの理由を記録する。関連ID欄では`N/A`文字列を使わず、該当なしは`null`で表す。すべての関連IDが非`null`の場合、関連ID N/A理由は`null`にする
- 関連ID N/A理由は自由な「対象外」だけにしない。`null`になっている関連ID種別をすべて含め、`Failure: ...; Cause: ...; Change: ...; Success: ...; Verification: ...`の種別付き形式で記録する
- R4のContract Inventoryだけは、全フェーズでDOM / CSS / ARIA / state / generated files / lockfile / routing / search / security / テスト期待値 / snapshot / visual・paint contractに一切触れないことを証明できる場合のみ、根拠付きN/A可
- 上記以外の項目をR3以上でN/Aにする場合は、対象外理由と検証不要理由を明示する
```

#### 0.1a `null` / `[]` / `N/A` / 人間向け説明の使い分け

| 値              | 用途                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `null`          | JSON上の該当なし。Schemaで`null`が要求される欄に使う。                                                |
| `[]`            | 参照リストが空であることを表す。空にする場合は、対応するN/A理由欄が非空文字列で必要になる場合がある。 |
| `"N/A"`         | Markdown表またはAnchor IDなど、明示的に許可された欄に限定して使う。                                   |
| `"不要（...）"` | 人間向け説明欄だけで使う。Schema上`null`が要求される欄には使わない。                                  |

R4 Execution LedgerのPhase Evidence対応では、Evidence Record ArtifactKey一覧に1件以上ある場合、Evidence Record N/A理由は`null`です。関連Failure / Cause / Change / Success / Verification IDがすべて非`null`の場合、関連ID N/A理由も`null`です。

### 0.2 機密情報・redaction記載規則

```text
Confidentiality / Redaction Check:
- 個人ノート本文:
- ファイル名・ローカルパス:
- URL・route:
- スクリーンショット:
- 検索index・生成物:
- CIログ・実行ログ:
- API key / token / cookie:
- secret名 / private repository URL:
- ブラウザプロファイル情報:
- ChatGPT / Codexへ渡す情報:
- redact済み / 不要 / 要追加確認:
```

個人ノート本文や非公開情報は、再現に必要な最小範囲だけを使います。可能な場合は、合成データまたは匿名化データに置き換えます。

### 0.3 情報境界記載規則

```text
Information Boundary:
- 使用してよい情報源:
- 使用しない情報源:
- 過去会話・記憶を使わない確認:
- 補完推定の有無:
- 補完推定を検証するEvidence:
```

unredacted dataを残す場合は、ローカル限定の一時記録として扱います。公開成果物、commit、PR、外部AI入力には含めません。共有が必要な場合は、人間が明示的に承認します。

### 0.4 IDライフサイクル規則

```text
ID管理規則:
- Artifact IDは成果物の同一性を表し、意味を書き換えない
- 同一成果物の内容更新はArtifact Revisionを増やし、過去Revisionを上書きしない
- Artifact RevisionはRevision別ファイルで不変保存する。append-only sectionまたはGit履歴だけを正本にする運用は原則禁止する
- 固定名ファイルを正本として上書き運用しない。固定名は索引またはlatest参照に限定する
- 成果物間参照はArtifactRef（ArtifactKey + storage class + immutable locator）を使う
- hash、Git blob ID、commit SHAはArtifact外部のArtifact Manifestで管理する。R4-IのFinal Verification判断およびR4-AのClosure判断に使うManifest RevisionはManifest Anchorで固定する
- Artifact自身へ自身のhash、commit SHA、後段Execution Event IDを書き込まない
- Artifact IDだけを参照してRevisionを暗黙に選ばない
- 別成果物へ置き換える場合だけsupersedes ArtifactRefを記録し、置き換え元を削除しない
- Artifactの作成時Plan Revisionは不変情報として残し、現在のPlan Revisionに対する有効性はR4 Execution LedgerのArtifact Validation Attestationで管理する
- 一度記録したFailure ID、Cause ID、Change ID、Success ID、Verification ID、Evidence ID、Verification Evidence IDは意味を書き換えない
- 新しい失敗は新しいFailure IDとして追加する
- 棄却されたCause IDは削除せず、棄却理由とEvidence IDを残す
- 保留Cause IDは、今回の修正対象に含めない理由を残す
- 置き換えたChange IDまたはEvidence IDはsupersededとして残し、置き換え先IDを記録する
- 誤ったEvidence IDはinvalidとして残し、修正版を新しいEvidence IDで追加する
- redaction版は別Evidence IDを発行し、派生元Evidence IDを記録する
- Evidence削除は機密漏えい等の明示的例外に限定し、削除理由、承認者、代替Evidence IDを記録する
- Verification IDの意味は維持し、再実行ごとに新しいVerification Evidence IDをappend-onlyで追加する
- 各Verification Evidenceにattempt、RFC 3339 timestamp、environment、resultを記録する
- 最終判定に採用したVerification Evidence IDを明示する
- R4内IDはリポジトリ全体で一意に解決できる完全修飾IDを使う。形式は`<R4 Phase Plan ID>-<Phase ID>-<local ID>`とする
- Phase名前空間はArtifact、Failure、Cause、Change、Success、Verification、Evidence、Minimum Evidence Packet、Evidence Record、Entry、Decision、Contract、Support、Transition / Outcome / Disposition Record、Detected Failure Observation、Execution Event、Necessity Evaluation Event、Out-of-scope、Intermittent Failure Evidence、Synthetic Fixture Record、rollback Evidenceへ適用する
- Manifest ID、Manifest Entry ID、Manifest Anchor ID、Closure Manifest ID、Final Verification IDはR4全体名前空間で一意にする
- 全体成果物は`<R4 Phase Plan ID>-G-<local ID>`を使う。Final Verification、pre-final Ledger、Closure Manifestも全体名前空間に置く
- 表示上local IDを併記してもよいが、成果物間参照には完全修飾IDを使う
- Detected Failure Observation IDと移管先Implementation PhaseのFailure IDは別IDとし、対応関係を残す
```

### 0.5 R段階変更履歴

R段階を暫定判定、Evidence後、実装後で変更した場合は、主要成果物に次を記録します。R段階を変更しない場合も、重要な問題では「変更なし」と記録します。

```text
R段階変更履歴:
- 暫定R段階:
- Evidence後R段階:
- 実装後R段階:
- 昇格 / 降格 / 変更なしの理由:
- 根拠Evidence ID:
- 変更により追加または省略する成果物:
```

### 0.6 テスト更新分類

```text
テスト更新分類:
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

## 1. R0 Record

```text
R0 Record:
- Record role: Phase Outcome（R4の場合） / standalone completion（非R4）
- Common Artifact Header: 0.0aを転記
- R0 Record ID:
- Issue ID:
- R4 Phase Plan ID: <R4の場合 / N/A（理由）>
- Qualified Phase ID: <R4の場合 / N/A（理由）>
- Phase R段階: R0相当
- Phase種別: R0 Record
- Requested Phase Status transition: <R4の場合 / N/A（非R4）>
  - from: in-progress
  - to: passed
  - 根拠:

1. 変更理由
- <誤字、文言、コメント、ドキュメント補足など>

2. 変更範囲
- ファイル:
- 箇所:

2a. 変更分類
- Rouault実装変更有無: なし
- 契約変更有無: なし
- テスト・設定変更有無: なし
- generated files / lockfile変更有無: なし
- ワークフロー成果物更新有無: あり / なし
- 一時生成物発生有無: あり / なし
- 一時生成物がある場合の除去確認:

3. 挙動・契約・意味への影響なし確認
- DOM:
- CSS:
- ARIA / accessibility意味:
- state:
- routing:
- search:
- security / sanitization:
- テスト期待値:
- snapshot:
- visual / paint contract:
- 生成物:
- lockfile:
- package manager:
- 設計文書の意味:
- 仕様文書の意味:
- ワークフロー、禁止事項、責務境界、成功条件の意味:

4. git diff確認
- 意図しない差分:
- build成果物や一時ファイル:
- 改行コードや整形差分:

5. 判定
- R0として完了 / R1以上へ昇格:
```

## 2. Mini Evidence

```text
Mini Evidence:
- Common Artifact Header: 0.0aを転記

0. Evidence ID
- Evidence ID:

0a. 対応対象
- 対応Issue ID:
- 対応Failure ID:

0b. 証拠確度
- 証拠確度: A / B / C
- 確度根拠:

1. 症状
- <何が壊れているか>

2. 対象ファイル
- <file>

3. 期待結果
- <expected>

4. 実際の結果
- <actual>

5. 確認方法
- <command / diff / manual check>

6. redaction確認
- 個人ノート本文:
- ローカルパス / URL:
- ログ:
- redaction済み / 不要 / 要追加確認:
```

## 3. Minimum Evidence Packet

```text
Minimum Evidence Packet:
- Common Artifact Header: 0.0aを転記

0. Packet IDと内包Evidence
- Minimum Evidence Packet ID:
- 内包するEvidence ID一覧:

0a. 対応対象
- 対応Issue ID:
- 対応Failure ID一覧:
- 対応Success ID一覧:
- 対応Verification ID一覧:

0b. 証拠確度
- 証拠確度: A / B / C
- 確度根拠:

1. 症状
- <何が壊れているか>

2. 再現手順または再現コマンド
- <command or steps>
- cwd:
- exact command:
- command was run via:
  - pnpm / corepack pnpm / npm script / node / CI job / browser manual:
- exit code:

3. 期待結果
- <expected>

4. 実際の結果
- <actual>

5. 失敗ログの最小抜粋
- stdout:
- stderr:

6. 環境
- OS:
- terminal / shell:
- Node:
- pnpm:
- browser:
- CI / local:
- locale:
- timezone:
- environment variable delta:

7. 参照状態
- 対象ブランチ:
- HEAD commit:
- local差分の有無:
- git status:

8. 追加証拠
- full log location:
- screenshot:
- CI run:
- timestamp: <RFC 3339>
- related diff:
- viewport:
- route / URL:
- failing test name:

9. 機密情報・redaction
- 個人ノート本文:
- ローカルパス / URL:
- screenshot:
- CIログ / 実行ログ:
- 検索index / 生成物:
- ChatGPT / Codexへ渡す情報:
- redaction済み / 不要 / 要追加確認:
```

## 3.1 Evidence Record

複数のログ、スクリーンショット、CI run、関連diffを扱う場合は、Minimum Evidence Packetに加えてEvidence Recordを作ります。R3以上では必須です。1つのEvidence Recordは複数Entryを持ち、各Entryが1回の証拠取得または1つの独立した証拠単位を表します。

```text
Evidence Record:
- Common Artifact Header: 0.0aを転記

- Evidence Record ID:
- 対応対象:
  - 対応Issue ID:
  - 対応Failure ID一覧:
  - 対応Minimum Evidence Packet ID一覧:
  - 関連Cause ID一覧:
  - 関連Change ID一覧:
  - 関連Success ID一覧:
  - 関連Verification ID一覧:
- Entries:
  - Entry ID:
    - Evidence ID: <Verification Evidenceの場合はVerification Evidence ID>
    - Evidence種別: Issue / Failure / Cause / Change / Verification / Observation / Auxiliary
    - Evidence状態: active / invalid / superseded / redacted derivative
    - 派生元 / 置き換え先Evidence ID:
    - 対応する対象ID:
      - Failure ID:
      - Cause ID:
      - Change ID:
      - Success ID:
      - Verification ID:
      - Detected Failure Observation ID:
      - Issue ID:
      - Support ID:
    - attempt:
    - timestamp: <RFC 3339>
    - cwd:
    - exact command:
    - command was run via:
      - pnpm / corepack pnpm / npm script / node / CI job / browser manual:
    - exit code:
    - stdout excerpt:
    - stderr excerpt:
    - full log location:
    - screenshot:
    - CI run:
    - result: pass / fail / unavailable / informational
    - environment:
      - OS:
      - terminal / shell:
      - Node:
      - pnpm:
      - browser:
      - locale:
      - timezone:
      - environment variable delta:
    - related diff:
    - 証拠確度 / evidence confidence: A / B / C
    - 確度根拠:
    - CI artifact / 外部ログの失効可能性:
    - 失効に備えて保存したredaction済み最小抜粋:
    - 機密情報・redaction:
      - 個人ノート本文:
      - ローカルパス / URL:
      - screenshot:
      - CIログ / 実行ログ:
      - 検索index / 生成物:
      - ChatGPT / Codexへ渡す情報:
      - redaction済み / 不要 / 要追加確認:
    - unredacted data location, if any:
      - ローカル限定 / 共有承認済み / N/A:
      - 公開成果物、commit、PR、外部AI入力に含めていないこと:
- Verification Evidence indexを含む場合（Verification IDごとに繰り返す）:
  - Verification ID:
    - 対応Entry ID一覧:
    - 最終判定に採用したEntry ID:
    - 最終判定に採用したVerification Evidence ID:
```

証拠確度は次で分類します。

```text
A:
- 実行ログ、CIログ、再現済みテスト、git diffなどの直接証拠

B:
- コード読解からの高確度推定

C:
- 状況証拠、未再現の仮説、補助的推定
```

## 3.2 Intermittent Failure Evidence

Timeout、flaky、CI限定、browser / viewport依存など、単発結果で原因を断定できない間欠障害に使います。

```text
Intermittent Failure Evidence:
- Common Artifact Header: 0.0aを転記
- Intermittent Failure Evidence ID:
- 対応Issue ID:
- 対応Failure ID一覧:
- 対応Verification ID一覧:
- 試行計画:
  - 総試行回数:
  - timeout値:
  - retry設定:
  - 実行間隔:
  - 対象環境一覧:
  - 打ち切り条件:
- attempt一覧:
  - attempt:
    - Verification Evidence ID:
    - timestamp: <RFC 3339>
    - environment:
    - result: pass / fail / timeout / unavailable
    - trace / screenshot / video:
    - Evidence Record Entry ID:
- 集計:
  - 成功回数:
  - 失敗回数:
  - timeout回数:
  - 再現率:
- 相関する条件:
- 再現しなかった条件:
- flaky判定:
- 原因断定可否:
- 最終判定に採用したVerification Evidence ID:
- 機密情報・redaction:
```

## 3.3 Synthetic Fixture Record

個人ノート本文等を合成データまたは匿名化データへ置換して再現する場合に使います。

```text
Synthetic Fixture Record:
- Common Artifact Header: 0.0aを転記
- Synthetic Fixture Record ID:
- 対応Issue ID:
- 対応Failure ID一覧:
- 元データを参照したか:
- 元データの共有可否:
- 合成・匿名化方法:
- 保持した構造的特徴:
- 意図的に削除した情報:
- 実データとの差異:
- 再現に十分である根拠:
- fixture保存場所:
- repositoryへ保存可能か:
- 対応Evidence ID一覧:
- 機密情報・redaction確認:
```

## 4. Mini Brief

```text
Mini Brief:
- Common Artifact Header: 0.0aを転記

0. R段階変更履歴
- 暫定R段階:
- Evidence後R段階:
- 実装後R段階:
- 変更理由:

0a. 情報境界・redaction
- 目的: 入力として使用してよい情報源、使用しない情報源、過去会話・記憶を使わない確認を記録する
- 使用してよい情報源:
- 使用しない情報源:
- 過去会話・記憶を使わない確認:
- 個人ノート本文 / ログ / ローカルパス / URLの共有可否:
- redaction済み / 不要 / 要追加確認:

0b. 関連Evidence
- Mini Evidence ID:
- F1の根拠Evidence:
- redaction確認済みEvidenceか:

1. 問題
- 何が壊れているか:

2. 修正前失敗条件
- F1:

3. 採用原因
- C1:

4. 修正対象
- ファイル:
- 箇所:

5. 修正内容
- CH1:

6. 補助変更
- SUP1:
- N/Aの場合の理由:

7. 修正後成功条件
- S1:

8. 検証方法
- V1:

8a. 契約影響チェック
- 契約影響なしと判断する根拠:
- DOM / CSS / ARIA / state / generated files / lockfile / securityへの影響:
- R2以上への昇格要否:

9. git diff確認観点
- 意図しない差分:
- 契約影響:
- generated files / lockfile影響:

10. 機密情報・redaction
- 目的: 成果物、ログ、スクリーンショット、外部AI入力、commit / PRに含める情報の安全性を記録する
- 個人ノート本文:
- ローカルパス / URL:
- screenshot:
- CIログ / 実行ログ:
- 検索index / 生成物:
- ChatGPT / Codexへ渡す情報:
- redaction済み / 不要 / 要追加確認:

11. 残課題
- なし / あり:
```

## 5. R2-lite Run Card / R2-lite Brief

R2-liteでは、計画と結果を分けてもよいですが、日常運用では次のRun Cardに統合してよいです。複雑化した場合は、R2-lite BriefとR2-lite Resultへ分離します。

R2-lite Run CardまたはR2-lite Briefは、Cause Summary相当を内包し、Minimum Evidence Packet相当は内包または単一Evidenceの別成果物参照で扱います。Cause Summary相当はRun Card / Brief内に内包します。Cause Summaryを別成果物として分離する必要がある場合は、R2-full以上へ昇格します。単一のEvidenceを見やすさのために別成果物化することは許可しますが、その場合はRun Card / BriefのEvidence欄にEvidence ID、保存場所 / ファイル名、Evidence IDとの対応を必ず記録します。Evidenceが複数種類または複数箇所に分散し、Run Card / BriefのEvidence欄と単一の別成果物Evidenceだけでは根拠を十分に追跡できない場合、原因候補3個以上、契約影響不明、generated files / lockfile実差分、削除・移行・縮退判断がある場合は、R2-liteとして完了不可とし、R2-full以上へ昇格します。

Run Cardは原則として`F1 / C1 / CH1 / S1 / V1`を中心に扱います。C2は補助仮説、保留仮説、棄却仮説としてのみ記録します。Failure ID、Change ID、Success ID、Verification IDのいずれかが2個以上あり、対応関係を表で追跡した方がよい場合は、R2-lite Brief + R2-lite Resultを使います。
R2-lite Briefで`F2 / CH2 / S2 / V2`を扱う場合でも、F2は採用原因C1で説明できる必要があります。CH2はC1に対する同一修正単位内の変更に限定し、F2に別の採用原因が必要な場合はR2-full以上へ昇格します。

R2-lite Run Cardは、通常運用では次の最小Profileだけを必須とします。詳細Profileは、条件付き項目に該当した場合、または後から監査可能な記録が必要な場合に展開します。最小Profileで説明できない時点で、R2-fullへ昇格します。

```text
R2-lite Run Card minimum profile:
- Common Artifact Header: 0.0aを転記
- Issue / 症状:
- Evidence: Evidence ID、対応Failure ID、証拠確度、保存場所または内包確認
- F / C / CH / S / V: F1 → C1 → CH1 → S1 → V1
- Scope: 変更してよいファイル、変更してよいテスト
- Do Not Change: 契約、snapshot、generated files、lockfile、無関係なリファクタリング
- 契約影響なし根拠:
- 実装結果:
- Verification Evidence履歴:
- git diff確認:
- R2-full以上への昇格不要根拠:
```

条件付きProfileです。

```text
conditional details:
- 情報境界: 過去会話、記憶、推定情報を使う余地がある場合
- Branch hygiene: 既存差分、生成物、一時ファイルがある場合
- 機密情報・redaction: 個人ノート本文、ログ、screenshot、URL、secretが混入し得る場合
- Intermittent Failure Evidence: timeout、flaky、CIのみ、browser / viewport依存の場合
- C2: 補助仮説、保留仮説、棄却仮説を残す場合
- generated files / lockfile: 実差分が出た場合はR2-lite完了不可
- 削除・移行・縮退: 該当する場合はR2-lite完了不可
```

詳細Profileを使う場合は、該当Appendixだけを使用します。minimum profileで閉じる場合は未使用AppendixをN/Aとして本文へ貼り付けません。完全な記録が必要な場合は、次の完全テンプレートを使います。

```text
R2-lite Run Card:
- Common Artifact Header: 0.0aを転記
- 保存場所 / ファイル名:
- R段階:
- R段階変更履歴:
  - 暫定R段階:
  - Evidence後R段階:
  - 実装後R段階:
  - 変更理由:
- 情報境界:
  - 使用してよい情報源:
  - 使用しない情報源:
  - 過去会話・記憶を使わない確認:
  - 補完推定の有無:
  - 補完推定を検証するEvidence:
- Branch hygiene:
  - 作業ブランチ:
  - HEAD commit:
  - git status:
  - 既存未コミット差分:
  - 今回修正に含める差分:
  - 今回修正に含めない差分:
  - 一時ファイル / build成果物:
  - 改行コード / 整形だけの差分:
- 機密情報・redaction:
  - 個人ノート本文:
  - ローカルパス / URL:
  - screenshot:
  - CIログ / 実行ログ:
  - 検索index / 生成物:
  - ChatGPT / Codexへ渡す情報:
  - redaction済み / 不要 / 要追加確認:
- 症状:
- 再現:
  - command / 確認方法:
  - cwd:
  - 実行経路:
  - exit code:
  - ログ位置:
  - CI / local / OS差分:
- Evidence:
  - Evidence ID:
    - Verification / Fix Plan / Resultで参照する正規ID:
  - 対応Issue ID:
  - 対応Failure ID:
  - Minimum Evidence Packet相当の充足方法:
    - 内包 / 単一Evidenceを別成果物化:
  - 別成果物の場合:
    - 保存場所 / ファイル名:
    - Evidence IDとの対応:
    - 保存場所 / ファイル名はredaction済みで後から参照可能な成果物を指す。失効し得るCI artifactだけを保存場所にしない:
  - 証拠確度: A / B / C
  - 確度根拠:
  - 分散Evidenceの有無:
  - Intermittent Failure Evidence要否:
- F:
  - F1:
- C:
  - C1:
  - C1根拠:
  - Cause Summary相当を内包しているか:
  - 残る原因候補数:
  - 採用原因を1つに固定できているか:
  - C2:
    - 種別: 補助仮説 / 保留仮説 / 棄却仮説 / N/A
    - 内容:
    - C1との関係:
    - 今回の修正対象・成功条件・契約影響を変えない根拠:
    - 追加調査要否:
    - R2-full以上への昇格要否:
- CH:
  - CH1:
- S:
  - S1:
- V:
  - V1:
  - Verification初期案として十分か:
- Scope:
  - 変更してよいファイル:
  - 変更してよいテスト:
- Do Not Change:
  - 変更してはいけないファイル:
  - 変更してはいけない契約:
  - 変更してはいけないテスト期待値:
  - snapshot更新可否:
- 契約影響チェック:
  - 契約影響なしと判断する根拠:
  - 契約変更の可能性:
  - R2-full以上への昇格要否:
- generated files / lockfile:
  - 触れない確認:
  - 実差分の有無:
  - 実差分ありの場合はR2-liteとして完了不可。R2-full以上へ昇格:
- 削除・移行・縮退:
  - dead code削除:
  - 契約削除:
  - 移行・縮退:
  - 旧経路削除:
  - テスト削除:
  - R2-full以上への昇格要否:
- 実装結果:
- 検証:
  - Verification ID:
  - Verification Evidence履歴:
    - attempt:
      - Verification Evidence ID:
      - timestamp: <RFC 3339>
      - environment:
      - result:
  - 最終判定に採用したVerification Evidence ID:
  - command / 確認方法:
  - cwd:
  - 実行経路:
  - exit code:
  - ログ位置:
  - 結果:
- 実装後Branch hygiene:
  - git status:
  - 既存差分との混在:
  - 一時ファイル / build成果物:
  - generated files / lockfile差分:
  - 改行コード / 整形だけの差分:
- git diff確認:
- 範囲外失敗:
- 残る仮説の扱い:
  - C2:
  - 実装後も範囲外 / 残課題 / 棄却:
  - 理由:
- 残課題:
```

```text
R2-lite Brief:
- Common Artifact Header: 0.0aを転記

- 保存場所 / ファイル名:
- R段階:
- R段階変更履歴:
  - 暫定R段階:
  - Evidence後R段階:
  - 実装後R段階:
  - 変更理由:
- 情報境界:
  - 使用してよい情報源:
  - 使用しない情報源:
  - 過去会話・記憶を使わない確認:
  - 補完推定の有無:
  - 補完推定を検証するEvidence:
- Branch hygiene:
  - 作業ブランチ:
  - HEAD commit:
  - git status:
  - 既存未コミット差分:
  - 今回修正に含める差分:
  - 今回修正に含めない差分:
  - 一時ファイル / build成果物:
  - 改行コード / 整形だけの差分:
- 機密情報・redaction:
  - 個人ノート本文:
  - ローカルパス / URL:
  - screenshot:
  - CIログ / 実行ログ:
  - 検索index / 生成物:
  - ChatGPT / Codexへ渡す情報:
  - redaction済み / 不要 / 要追加確認:
- Evidence:
  - Evidence ID:
    - Verification / Fix Plan / Resultで参照する正規ID:
  - 対応Issue ID:
  - 対応Failure ID:
  - Minimum Evidence Packet相当の充足方法:
    - 内包 / 単一Evidenceを別成果物化:
  - 別成果物の場合:
    - 保存場所 / ファイル名:
    - Evidence IDとの対応:
    - 保存場所 / ファイル名はredaction済みで後から参照可能な成果物を指す。失効し得るCI artifactだけを保存場所にしない:
  - 証拠確度: A / B / C
  - 確度根拠:
  - 分散Evidenceの有無:
  - Intermittent Failure Evidence要否:

- F:
  - F1:
  - F2:

- C:
  - C1:
  - C1根拠:
  - Cause Summary相当を内包しているか:
  - 残る原因候補数:
  - 採用原因を1つに固定できているか:
  - C2:
    - 種別: 補助仮説 / 保留仮説 / 棄却仮説 / N/A
    - 内容:
    - C1との関係:
    - 今回の修正対象・成功条件・契約影響を変えない根拠:
    - 追加調査要否:
    - R2-full以上への昇格要否:

- CH:
  - CH1:
  - CH2:

- S:
  - S1:
  - S2:

- V:
  - V1:
  - V2:
  - Verification初期案として十分か:

- 契約影響チェック:
  - 契約影響なしと判断する根拠:
  - 契約変更の可能性:
  - DOM / CSS / ARIA / state / generated files / lockfile / routing / search / securityへの影響:
  - R2-full以上への昇格要否:

- R2-lite対応表:
  - F1 → C1 → CH1 → S1 → V1:
  - F2 → C1 → CH2 → S2 → V2:
  - F2 / CH2 / S2 / V2を使う場合もC1で説明できる根拠:

- Scope:
  - 変更してよいファイル:
  - 変更してよいテスト:
  - generated files:
    - 触れない確認:
    - 実差分の有無:
    - 実差分ありの場合はR2-liteとして完了不可。R2-full以上へ昇格:
  - lockfile:
    - 触れない確認:
    - 実差分の有無:
    - 実差分ありの場合はR2-liteとして完了不可。R2-full以上へ昇格:

- Do Not Change:
  - 変更してはいけないファイル:
  - 変更してはいけない契約:
  - 変更してはいけないテスト期待値:
  - snapshot更新可否:

- Risk:
  - DOM / CSS / ARIA:
  - Lit enhancement:
  - state / persistence:
  - generated files:
  - lockfile / package manager:
  - security / sanitization:
  - local / CI差分:

- 削除・移行・縮退:
  - dead code削除:
  - 契約削除:
  - 移行・縮退:
  - 旧経路削除:
  - テスト削除:
  - R2-full以上への昇格要否:
```

## 5.1 R2-lite Result

R2-lite Briefは計画、R2-lite Resultは実装後記録として分けます。R2-lite Run Cardに結果まで記録した場合は、別個のR2-lite Resultを省略できます。

```text
R2-lite Result:
- Common Artifact Header: 0.0aを転記
- R段階変更履歴:
  - 実装後R段階:
  - 昇格 / 降格 / 変更なしの理由:
  - 根拠Evidence ID:
- 機密情報・redaction:
  - 個人ノート本文:
  - ローカルパス / URL:
  - screenshot:
  - CIログ / 実行ログ:
  - 検索index / 生成物:
  - ChatGPT / Codexへ渡す情報:
  - redaction済み / 不要 / 要追加確認:
- 実装後Branch hygiene:
  - git status:
  - 既存差分との混在:
  - 一時ファイル / build成果物:
  - generated files / lockfile差分:
  - 改行コード / 整形だけの差分:
- 実装結果:
- 実行した検証:
  - Verification ID:
  - Verification Evidence履歴:
    - attempt:
      - Verification Evidence ID:
      - timestamp: <RFC 3339>
      - environment:
      - result:
  - 最終判定に採用したVerification Evidence ID:
  - command / 確認方法:
  - cwd:
  - 実行経路:
  - exit code:
  - ログ位置:
- 結果:
- 範囲外失敗:
- 残る仮説の扱い:
  - C2:
  - 実装後も範囲外 / 残課題 / 棄却:
  - 理由:
- 残課題:
- git diff確認:
- Evidence更新:
  - 追加Evidence ID:
  - 対応Issue ID:
  - 対応Failure ID:
  - 対応Verification ID:
  - 証拠確度の変更:
  - 確度根拠の変更:
  - redaction確認:
- Verification更新:
```

## 6. Issue Brief

```text
Issue Brief:
- Common Artifact Header: 0.0aを転記

- Issue ID:

0. 情報境界
- 使用してよい情報源:
- 使用しない情報源:
- 過去会話・記憶を使わない確認:
- 補完推定の有無:
- 補完推定を検証するEvidence:

1. 問題の要約
- <summary>

2. 症状
- <symptom>

3. 再現手順
1. ...
2. ...
3. ...

4. 期待結果
- <expected>

5. 実際の結果
- <actual>

6. 修正前に失敗している条件
- Failure ID:
- cwd:
- exact command:
- command was run via:
- exit code:
- 対象テスト:
- 対象画面:
- viewport:
- OS:
- terminal / shell:
- Node:
- pnpm:
- browser:
- locale:
- timezone:
- environment variable delta:
- 失敗ログ:
- 再現性:
- Evidence ID:

7. 修正後に満たすべき成功条件
- Success ID:
- 対応するFailure ID:
- 成功すべきコマンド:
- 成功すべきテスト:
- 期待される画面状態:
- 維持すべき契約:
- 範囲外としてよい既知失敗:
- 1つでも残れば未完了とする失敗:

8. 環境情報
- OS:
- terminal / shell:
- Node:
- pnpm:
- browser:
- CI / local:
- locale:
- timezone:
- environment variable delta:

9. 参照基準
- GitHub branch:
- GitHub commit:
- local HEAD:
- local差分の有無:
- CI run / log:

10. 重大度
- blocker / major / minor:
- 理由:

11. リスク段階
- R0 / R1 / R2-lite / R2-full / R3 / R4:
- 理由:

11a. R段階変更履歴
- 暫定R段階:
- Evidence後R段階:
- 実装後R段階:
- 昇格 / 降格 / 変更なしの理由:
- 根拠Evidence ID:
- 変更により追加または省略する成果物:

12. 不足情報
- なし / あり:

13. 機密情報・redaction
- 個人ノート本文の有無:
- screenshot / log / indexのredaction:
- 外部AIへ渡してよい情報:
```

## 7. Cause Summary

```text
Cause Summary:
- Common Artifact Header: 0.0aを転記

- C1 採用原因:
  - 説明できるFailure ID:
  - 根拠Evidence ID:
  - 証拠確度: A / B / C
  - 確度根拠:
  - 根拠:
  - 検証方法:
  - 修正対象:
  - 判定理由:

- C2 棄却または保留:
  - 根拠Evidence ID:
  - 証拠確度: A / B / C
  - 確度根拠:
  - 理由:
  - 今回の扱い:
  - R2-liteで残す場合、修正対象・成功条件・契約影響を変えない根拠:

- Cause Matrix移行判定:
  - C3以降が必要か:
  - 必要な場合はCause Matrixへ移行する:
  - 移行しない場合の根拠:
```

## 8. Cause Matrix

```text
Cause Matrix metadata:
- Common Artifact Header: 0.0aを転記
```

```text
| Cause ID | 内容 | 根拠ファイル | 根拠コード / ログ | Evidence ID | 証拠確度 | 確度根拠 | 説明できるFailure ID | 説明できない症状 | 検証方法 | 判定 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | ... | ... | ... | E1 | A / B / C | ... | F1 | ... | ... | 採用 / 棄却 / 保留 | ... |
| C2 | ... | ... | ... | E2 | A / B / C | ... | F2 | ... | ... | 採用 / 棄却 / 保留 | ... |
```

## 9. Contract Inventory

R2-fullでは契約影響チェックを必須とします。契約影響なしの場合は、Fix Plan内の契約影響チェック欄、または簡略Contract Inventoryで根拠を記録すれば足ります。契約影響あり、または不明の場合は次の詳細Contract Inventoryを作成します。契約変更、仕様判断、安全性・アクセシビリティ意味変更がある場合はR3へ昇格します。

```text
契約影響チェック:
- Common Artifact Header: 0.0aを転記
- 契約影響の有無: なし / あり / 不明
- 影響し得る契約:
- 影響なしと判断する根拠:
- 影響あり、または不明の場合のContract Inventory作成有無:
- R3昇格要否:
```

```text
Contract Inventory metadata:
- Common Artifact Header: 0.0aを転記
```

```text
| Contract ID | 種別 | 対象 | 現在の契約 | 変更可否 | 根拠 | 対応するFailure / Success | 検証 |
|---|---|---|---|---|---|---|---|
| K1 | DOM | ... | ... | 不可 | 既存test | F1 / S1 | V1 |
| K2 | ARIA | ... | ... | 条件付き可 | 仕様判断 | F2 / S2 | V2 |
```

簡略版です。

```text
簡略Contract Inventory / Fix Plan内契約影響記録:
- 契約影響の有無:
- 影響する契約:
- 変更するか:
- 変更しない場合の維持方法:
- 検証:
```

## 9.1 Decision Record

R3以上、または仕様判断・契約変更・契約削除・移行・縮退・旧経路削除を伴う場合に使います。

ただし、R3以上の場合を除き、参照なし、契約なし、生成対象外、テスト対象外をEvidenceで確認できるdead code削除は、削除・移行・縮退分類で根拠を記録できればDecision Recordを省略してよいです。

```text
Decision Record:
- Common Artifact Header: 0.0aを転記
- Decision ID:
- 判断対象:
- 採用する仕様:
- 旧仕様または旧契約:
- 変更理由:
- 代替案:
- 採用しない案と理由:
- 影響範囲:
- 移行・削除方針:
- フェーズ分割方針:
- 統合方針:
- ロールバック方針:
- 検証方法:
- 将来の見直し条件:
```

## 9.2 Out-of-scope Failure Record

範囲外失敗を完了判定から分離する場合に使います。

```text
Out-of-scope Failure Record:
- Common Artifact Header: 0.0aを転記
- Out-of-scope ID:
- 失敗内容:
- Evidence ID:
- 今回のFailure IDとの関係:
- 範囲外とする理由:
- 今回修正に含めない理由:
- 後続対応要否:
- 完了判定への影響:
```

## 9.3 No-change Completion

Issue全体を修正なしで閉じるoutcome判断にだけ使います。R4では後続Phaseを持ちません。Phase Statusの正本はR4 Execution LedgerのEvent Logであり、このRecordは遷移要求と根拠を保持します。

```text
No-change Completion:
- Common Artifact Header: 0.0aを転記
- Completion ID:
- Issue ID:
- R4 Phase Plan ID: <R4の場合 / N/A（理由）>
- Qualified Phase ID: <R4の場合 / N/A（理由）>
- Phase R段階: R0相当 / R1 / R2-lite / R2-full / R3
- Phase種別: No-change
- Record role: Phase Outcome
- Requested Phase Status transition:
  - from:
  - to: passed
  - 根拠:
- 情報境界:
  - 使用してよい情報源:
  - 使用しない情報源:
  - 過去会話・記憶を使わない確認:
  - 補完推定の有無:
  - 補完推定を検証するEvidence:
- 対象Issue / Failure ID:
- 修正しない理由:
- 根拠となるIssue / Failure Evidence ID:
- Ledger registration payload（予定）:
- 再現可否:
- 確認済み範囲:
- 未確認範囲:
- 未再現の場合の扱い:
- 「存在しない」と断定していないこと:
- GitHub現行実装との差分:
- local / CI / 環境要因の扱い:
- 既に修正済みか:
- ユーザー前提と現行仕様・現行実装の差分:
- 仕様判断または契約解釈の有無:
- 判断リスク成果物:
- Disposition: issue closed without change / closed as external responsibility
- closed as external responsibilityの場合:
  - 外部owner:
  - 責任境界:
  - 引渡し方法:
  - owner確認状態:
  - Rouault側で閉じてよい根拠:
- Issueを閉じられる根拠:
- No-change closureでretire / replace / rollback対象となる先行Phase一覧:
- 有効なRouault実装変更が残っていないこと:
- 先行Implementation Phase一覧:
- 先行Implementation Phaseの実行状態: cancelled / superseded / rollback済み / N/A
- rollback Evidence ID:
- worktree / commitにIssue対応差分が残っていない確認:
- 後続Phaseがないこと:
- 旧Plan Revisionの後続Phaseをretired / replacedにした記録:
- ユーザーへ返す説明:
- docs-only変更の要否:
  - ありの場合はNo-changeではなくR0またはR1の別変更として扱う:
- 完了条件:
- 機密情報・redaction:
  - 個人ノート本文:
  - ローカルパス / URL:
  - screenshot:
  - CIログ / 実行ログ:
  - 検索index / 生成物:
  - ChatGPT / Codexへ渡した情報:
  - redaction済み / 不要 / 要追加確認:
```

## 9.4 No-action Record

Issueを閉じず、R4内の特定Phaseまたは対象範囲だけ変更不要・適用対象外と判断する場合に使います。No-actionはR4専用です。非R4では通常のR段階成果物内で対象外範囲を記録します。

```text
No-action Record:
- Common Artifact Header: 0.0aを転記
- No-action Record ID:
- Issue ID:
- R4 Phase Plan ID:
- Qualified Phase ID:
- Phase R段階: R0相当 / R1 / R2-lite / R2-full / R3
- Phase種別: No-action
- Record role: Phase Outcome
- Requested Phase Status transition:
  - from:
  - to: passed
  - 根拠:
- 対象範囲:
- 変更しない理由:
- Issue / Failure Evidence ID:
- Ledger registration payload（予定）:
- 判断リスク成果物:
- 後続Phaseへの影響:
- 後続Phase ID一覧:
- 直接後続がない場合の理由:
- 影響する依存関係:
- Issueを閉じない確認:
- redaction確認:
```

## 9.5 Investigation-only Record

Issueを閉じず、Evidence引渡し、外部依存待ち、追加再現情報待ちを扱います。Phase Statusの正本はExecution Event Logです。

```text
Investigation-only Record:
- Common Artifact Header: 0.0aを転記
- Investigation-only Record ID:
- Issue ID:
- R4 Phase Plan ID: <R4の場合 / N/A（非R4）>
- R4 Phase Plan Revision: <R4の場合 / N/A（非R4）>
- Qualified Phase ID: <R4の場合 / N/A（非R4）>
- Phase R段階: R1 / R2-lite / R2-full / R3
- Phase種別: Investigation-only
- Record role: Phase Outcome / Phase Transition
- Requested Phase Status transition:
  - from:
  - to: passed / blocked
  - 根拠:
- blockedの場合はPhase Transition Artifactであり、Phase Outcome Artifactではない:
- 情報境界:
  - 使用してよい情報源:
  - 使用しない情報源:
  - 補完推定の有無:
  - 補完推定を検証するEvidence:
- 調査目的:
- Investigation Plan:
  - 調査質問:
  - Evidence取得方法:
  - 対象環境:
  - 調査打ち切り条件:
  - 許可する活動:
  - 禁止する変更:
- 取得したIssue / Failure Evidence ID:
- Ledger registration payload（予定）:
- 採用した仮説:
- 棄却した仮説とEvidence ID:
- 保留した仮説と理由:
- 確認済み範囲:
- 未確認範囲:
- 後続Phaseへ渡すFailure / Cause候補:
- Disposition: evidence handoff to next phase / external dependency / awaiting reproduction
- Dispositionと遷移要求の対応:
  - evidence handoff to next phase: to=passed
  - external dependency: to=blocked
  - awaiting reproduction: to=blocked
- evidence handoffの場合:
  - handoff target type: R4 Phase / workflow step / Artifact / external owner
  - handoff target IDまたはArtifactRef:
  - R4の場合のhandoff先Phase ID:
  - 非R4の場合の再開先Workflow StepまたはArtifactRef:
  - handoff条件: 必須
- external dependencyの場合:
  - handoff先Phase ID: N/A可
  - 外部依存先:
  - owner:
  - 再開条件:
  - 次回確認条件:
- awaiting reproductionの場合:
  - handoff先Phase ID: N/A可
  - 必要な追加Evidence:
  - 再開トリガー:
  - review期限、または期限なし理由:
- Issueを閉じない確認:
- 判断リスク成果物:
- 機密情報・redaction:
  - redaction済み / 不要 / 要追加確認:
```

## 9.6 削除・移行・縮退分類

削除、移行、縮退、旧経路削除、テスト削除を含む場合に記録します。R2-liteでは原則として軽微整理以外の削除を扱いません。

```text
削除・移行・縮退分類:
- 対象:
- 分類:
  - dead code削除 / 契約削除 / 移行・縮退 / 旧経路削除 / テスト削除
- 現在の参照元:
- 契約上の役割:
- 生成対象か:
- テスト対象か:
- 削除または移行してよい根拠:
- 残す検証:
- 追加する検証:
- ロールバック方法:
- R段階:
- Decision Record要否:
- Contract Inventory要否:
```

## 9.8 A2 Evidence Integrity Attestation

A2 Evidence Integrity Attestationは、R段階にかかわらずA2を採用した場合に作成する証拠保全の閉鎖根拠です。非R4ではClosure Manifest / Closure Attestationを要求せず、この成果物で公開可能Evidence、private / restricted Evidence、redaction、保持、失効、ローテーションの整合を固定します。

```text
A2 Evidence Integrity Attestation:
- Common Artifact Header: 0.0aを転記
- Attestation ID:
- Issue ID:
- R段階:
- Aレベル: A2
- 対象Evidence index:
  - repository-redacted evidence index ArtifactKey / ArtifactRef:
  - private / restricted evidence index opaque reference:
- public-safe opaque reference一覧:
- private / restricted locatorを公開Artifactへ記録していない確認:
- 公開不可digestをrepository-redacted Artifactへ記録していない確認:
- redaction policy:
- retention policy:
- revocation policy:
- secret revocation / rotation record:
  - 該当有無:
  - 失効・ローテーション実施記録:
  - 実施しない場合の根拠:
- integrity result: pass / fail / manual-review-required
- derived evidence state: preserved / not-preserved / manual-review-required
- validation evidence:
  - command / 確認方法:
  - Verification Evidence ID:
  - timestamp: <RFC 3339>
- actor:
- 人間承認:
- 備考:
```

## 10. Fix Plan

```text
Fix Plan:
- Common Artifact Header: 0.0aを転記

0. 関連成果物
- R段階:
- R段階変更履歴:
  - 暫定R段階:
  - Evidence後R段階:
  - 実装後R段階:
  - 昇格 / 降格 / 変更なしの理由:
  - 根拠Evidence ID:
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
- R4の場合のIssue ID:
- R4 Phase Plan ID:
- R4 Phase Plan Revision:

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
- R4 Phase計画参照:
  - R4 Phase Plan ArtifactRef:
  - 対象Phase完全修飾ID:
  - Plan Revision:
  - Phase R段階:
  - Phase種別: Implementation
  - 計画時点のEvidence対応:
  - 予定Artifact種別:
  - 計画Verification:
  - 実行後のStatus、Transition / Outcome / Disposition Record、実績ArtifactRef、最終EvidenceはFix Planへ書き戻さず、R4 Execution Ledgerへ記録する:

1. 問題の定義
- <problem>

2. 採用する原因仮説
- C1:

3. 棄却または保留する原因仮説
- C2:
- C3:

4. 調査打ち切り判断
- 打ち切る理由:
- 残る仮説の扱い:

5. 参照したGitHubブランチ・commit
- branch:
- commit:

6. local差分またはCI差分の扱い
- <policy>

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
- <files>

10. 各ファイルの修正内容
- CH1:
- CH2:

11. 補助変更
- SUP1:
- N/Aの場合の理由:

12. 変更してよい範囲
- <allowed>

13. 変更してはいけない範囲
- <forbidden>

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
- <allowed deletion>

15. 削除してはいけないもの
- <forbidden deletion>

16. テスト方針
- <test policy>

17. テスト更新の可否と根拠
- <test update policy>

18. snapshot更新の可否と根拠
- <snapshot policy>

19. 回帰確認項目
- <regression checks>

20. 実装直後の最小再検証
- <minimal recheck>

21. 実装後の精査観点
- <review points>

22. リスク
- <risks>

23. 代替案
- <alternatives>

24. 完了条件
- <done>

25. 残課題の扱い
- <outstanding>

26. Verification Matrix初期案
- F1 → C1 → CH1 → S1 → V1

27. ロールバック方針
- R3以上は必須

28. 再発防止要否
- 必要 / 不要:
- 理由:

29. 機密情報・redaction方針
- Evidence、ログ、スクリーンショット、検索indexの扱い:
- ChatGPT / Codexへ渡す情報:
- 公開成果物へ含めてはいけない情報:
```

## 10.1 R4 Phase Plan

R4 Phase Planは**計画構造だけ**を保持します。実行状態、Evidence対応、Transition / Outcome / Disposition Record、最終判定はそれぞれR4 Execution LedgerとFinal R4 Disposition Verificationへ分離します。

```text
R4 Phase Plan:
- Common Artifact Header: 0.0aを転記（Phase ID / Phase種別 / Phase R段階はN/A（R4全体成果物））
- R4 Phase Plan ID:
- Issue ID:
- Plan Revision:
- Previous Plan Revision:
- 構造更新理由:
- Phase実行順序:
- Phase依存関係:
- Phase間で共有する一時状態:

0. ID名前空間
- Issue ID例: ISS-001
- R4 Phase Plan ID例: R4P-001
- 全体ID例: R4P-001-G-F1 / R4P-001-G-ER1 / R4P-001-G-A1 / R4P-001-G-FV1
- Phase完全修飾ID例:
  - R4P-001-P1
  - R4P-001-P1-A1
  - R4P-001-P1-F1 / R4P-001-P1-C1 / R4P-001-P1-CH1 / R4P-001-P1-S1 / R4P-001-P1-V1
  - R4P-001-P1-MEP1 / R4P-001-P1-ER1 / R4P-001-P1-ER1-ENTRY1
  - R4P-001-P1-D1 / R4P-001-P1-K1 / R4P-001-P1-SUP1
  - R4P-001-P1-R0R1 / R4P-001-P1-NCR1 / R4P-001-P1-NAR1 / R4P-001-P1-IR1 / R4P-001-P1-IPCR1 / R4P-001-P1-VR1
  - R4P-001-P1-DFO1 / R4P-001-P1-EVT1 / R4P-001-P1-IFE1 / R4P-001-P1-SFR1
- 全IDがリポジトリ全体で一意に解決できること:

0a. Plan Revision履歴
| Plan Revision | Plan ArtifactKey | Resolution Manifest ID / Revision | Resolution Manifest Anchor ID | Previous Plan Revision | 構造更新理由 | 追加Phase | 分割元Phase | retired Phase | replaced Phase | 影響ArtifactKey一覧 | timestamp |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | R4P-001-G-A1@rev-0001 | MAN-001 / rev-0001 | ANC-001 | N/A | 初版 | R4P-001-P1,R4P-001-P2 | N/A | N/A | N/A | N/A | <RFC 3339> |

Plan RevisionとArtifact Revisionの関係:
- Plan Revisionは計画構造の意味版、Artifact Revisionはファイル内容の不変版であり、同一概念ではない
- 表記、redaction、参照補正だけの変更はArtifact Revisionだけを増やし、Plan Revisionを維持する
- Phase追加・分割、依存関係、necessity、Activation condition、成功条件、変更境界、retire / replacementを変える場合はPlan Revisionを増やし、その内容を保持する新Artifact Revisionを発行する
- 各Plan Revisionが最初に確定したPlan ArtifactKey、Resolution Manifest ID / Revision、Resolution Manifest Anchor IDをRevision履歴へ記録する
- 同じPlan Revisionを表す後続Artifact RevisionはArtifactKeyとsupersedes ArtifactRefで連鎖し、選択したResolution ManifestからArtifactRefへ解決できること、および意味変更がないことを明記する

1. 全体目的
- <何を解決するか>

2. 全体Failure / Success
- Failure ID一覧:
- Success ID一覧:

3. フェーズ計画
| Qualified Phase ID | Local Phase ID | Phase necessity | Activation condition | Skip / retirement condition | Replaces Phase ID | Phase R段階 | Phase種別 | 目的 | 対象ファイル | 必須Artifact種別 | 判断リスク成果物 | 活動固有成果物 | 関連Contract ID | Contract N/A理由 | 関連全体Decision ID | 関連Phase Decision ID | Phase Decision N/A理由 | 許可する変更 | 禁止する変更 | 成功条件 | 計画Verification | 単体でmainlineを壊さない条件 | 次Phaseへの条件 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R4P-001-P1 | P1 | required / conditional / optional | ... | ... | N/A | R2-lite | Implementation | ... | ... | R2-lite Run Card, Implementation Phase Outcome Record | R2-lite判断成果物 | Run Card、実装、最小再検証 | N/A | 契約非接触のため | R4P-001-G-D1 | N/A | Phase R2-liteでDecision Record不要のため | ... | ... | R4P-001-P1-S1 | R4P-001-P1-V1 | ... | ... |

Phase necessity規則:
- required: 最終Plan RevisionのActive Phase Setに含まれる場合、R4完了までにpassedが必須
- conditional: Activation condition成立時はnecessity評価`conditional-activated`、未成立時は`conditional-not-activated`を記録する。未成立時はStatusをcancelledへ遷移させる
- optional: 実行する場合はnecessity評価`optional-executed`、実行しない場合は`optional-not-run`を記録する。未実行時はStatusをcancelledへ遷移させる
- `conditional-not-activated`と`optional-not-run`はStatusではなく、cancelled Eventの理由となるnecessity評価である
- necessity評価はR4 Execution LedgerのPhase Necessity Evaluation Logへappend-onlyで記録する

Phase種別とPhase R段階の許容組合せ:
- Implementation: R1 / R2-lite / R2-full / R3
- R0 Record: R0相当
- No-change: R0相当 / R1 / R2-lite / R2-full / R3
- No-action: R0相当 / R1 / R2-lite / R2-full / R3
- Investigation-only: R1 / R2-lite / R2-full / R3
- Verification-only: R1 / R2-lite / R2-full / R3
- Integration verification: R2-lite / R2-full / R3

Implementationの活動固有Plan:
- R1: Mini Brief
- R2-lite: R2-lite Run Card、またはR2-lite Brief + Result
- R2-full / R3: Fix Plan
- すべてのImplementation Phase: Implementation Phase Outcome Record

Contract / Decision N/A規則:
- 関連Contract IDがある場合、Contract N/A理由は「不要（Contract IDあり）」とする
- 関連Contract IDをN/Aにする場合は契約非接触をEvidenceで説明する
- 関連全体Decision IDはR4全体Decision RecordのDecision IDを記録し、N/Aにしない
- 関連Phase Decision IDは対象PhaseのR段階でDecision Record不要の場合だけ理由付きN/A可

Plan lifecycle規則:
- Phase IDの意味を書き換えず、分割時は新しいPhase IDを発行する
- Phase追加、分割、依存関係、necessity、Activation condition、成功条件、変更境界、Phaseのretire / replacementは新しいPlan Revisionへappend-onlyで記録する
- cancelled / supersededは実行状態であり、Plan Revision履歴の用語に使わない
- Phase Status変更ではPlan Revisionを増やさない
- Plan Revision更新時は影響ArtifactRef一覧を記録する
- Artifactの現在有効性はR4 Execution LedgerのArtifact Validation Attestationだけを正本にする
- 意味変更を受けるArtifactは新Artifact Revisionを作る
- 無効になるArtifactはAttestationでsupersededまたはinvalidとし、旧Revisionを残す

No-change Phase:
- Issue全体の終端Phaseとする
- 後続Phaseを持たない
- 最終Plan RevisionのActive Phase SetでNo-change以外の未完了required Phaseを残さない
- 有効な先行Implementation差分を残さない
- 部分的な変更不要判断にはNo-actionを使う

4. フェーズ間契約
- DOM:
- CSS:
- ARIA:
- state:
- generated files:
- lockfile:
- tests:

5. R4全体ロールバック方針
- 全体として戻す条件:
- Phase単位で戻す条件:
- 戻してよいPhase:
- 戻してはいけないPhase:
- 統合後に戻す場合の手順:
- rollback後に実行するVerification:
- 再調査の戻り先:

6. 機密情報・redaction
- 公開成果物への混入防止:
```

## 10.2 R4 Execution Ledger

R4 Execution Ledgerは、Phase実行状態、Transition / Outcome / Disposition ArtifactRef、Evidence、Artifact有効性をappend-onlyで追跡する実行台帳です。現在Statusの正本はEvent Logの最新`to Status`です。Current StatusとActive Phase Setはログから再生成する導出ビューです。

Event、Attestation、Necessity Evaluationを追加するたびにLedger Artifact Revisionを増やします。新Revisionは旧Revisionの全append-only entryを保持し、過去entryを変更・削除しません。Current StatusとActive Phase Setは導出ビューであり、再生成してよい一方、正本ログではありません。

```text
R4 Execution Ledger:
- Common Artifact Header: 0.0aを転記
- R4 Execution Ledger ID:
- R4 Profile: R4-S / R4-I / R4-A
- Issue ID:
- R4 Phase Plan ID:
- Current Plan Revision:
- Previous Ledger ArtifactKey: <前Revisionがある場合>
- Resolution Manifest kind: lightweight-resolution-manifest / artifact-manifest
- Resolution Manifest ID / Revision:
- Resolution Manifest Anchor ID: （R4-SではN/A可。R4-I / R4-Aでは必須）

1. Phase Necessity Evaluation Log
| Evaluation Event ID | Qualified Phase ID | Plan Revision | necessity | Activation condition evaluation | evaluation result | Evidence ID一覧 | timestamp | actor |
|---|---|---|---|---|---|---|---|---|
| R4P-001-P1-NEV1 | R4P-001-P1 | 1 | conditional | ... | conditional-activated / conditional-not-activated | ... | <RFC 3339> | ... |

necessityとevaluation resultの許容組合せ:
- required → required
- conditional → conditional-activated / conditional-not-activated
- optional → optional-executed / optional-not-run
- evaluation resultはappend-onlyで記録し、後続評価で旧結果を削除しない

2. Phase Execution Event Log
| Event ID | Qualified Phase ID | Plan Revision | from Status | to Status | Event class | Trigger ArtifactKey一覧 | Resolution Manifest kind | Resolution Manifest ID / Revision | Resolution Manifest Anchor ID | Evidence ID一覧 | timestamp | reason | actor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R4P-001-P1-EVT0 | R4P-001-P1 | 1 | N/A | planned | initialization | R4P-001-G-A1@rev-0001 | <profile-specific manifest kind> | <profile-specific manifest id / revision> | <profile-specific anchor id or N/A> | [] | <RFC 3339> | Phase登録 | ... |
| R4P-001-P1-EVT1 | R4P-001-P1 | 1 | planned | ready | progress | ... | <profile-specific manifest kind> | <profile-specific manifest id / revision> | <profile-specific anchor id or N/A> | ... | <RFC 3339> | ... | ... |

Event class:
- `initialization`: Phase Plan ArtifactKeyをResolution Manifestで解決したTrigger ArtifactRefとして`N/A → planned`を記録する
- R4-Sの`Resolution Manifest kind`は`lightweight-resolution-manifest`、Anchor IDは`N/A`可とする
- R4-I / R4-Aの`Resolution Manifest kind`は`artifact-manifest`、Anchor IDは非空かつ`N/A`不可とする
- `progress`: `planned → ready`、`ready → in-progress`の進行遷移を記録する
- `transition`: Phase Transition ArtifactKeyをResolution Manifestで解決したTrigger ArtifactRefとして`ready → blocked`、`in-progress → blocked`、`blocked → ready`を記録する
- `outcome`: Phase Outcome ArtifactKeyをResolution Manifestで解決したTrigger ArtifactRefとして`in-progress → passed / failed`を記録する
- `retirement`: Phase Disposition ArtifactKeyをResolution Manifestで解決したTrigger ArtifactRefとして`planned / ready / in-progress / blocked → cancelled`、`passed / failed → superseded`を記録する

R4 Execution Event LogのEvidence ID一覧は、Evidenceがない場合は`[]`で記録し、`N/A`文字列を使いません。

状態分類:
- 進行状態: planned / ready / in-progress / blocked
- 実行結果: passed / failed
- 廃止状態: cancelled / superseded
- `terminal`という語は使わず、outcome event、retirement event、R4 closureで許容されるfinal statusを区別する

合法な基本遷移:
- N/A → planned
- planned → ready → in-progress → passed / failed
- ready / in-progress → blocked
- blocked → ready / cancelled
- planned / ready / in-progress / blocked → cancelled
- failed / passed → superseded

Event列整合:
- 各Phaseの最初のEventは`initialization`かつ`N/A → planned`でなければならない
- 同一Phaseの後続Eventでは、直前Eventの`to Status`と現在Eventの`from Status`が一致しなければならない
- `cancelled`または`superseded`到達後に後続Eventを追加してはならない

Event作成順序:
1. TriggerとなるPlan / Phase Transition / Outcome / Disposition Artifactを不変保存する
2. 選択Profileに応じて参照を解決する
   - R4-S: 軽量Resolution Manifestへ登録し、ArtifactKeyをArtifactRefへ解決する。Manifest AnchorはN/A可
   - R4-I / R4-A: Artifact Manifestへ登録し、Manifest Anchorで固定する
3. EventがそのArtifactRefを一方向に参照する
4. 新しいLedger Artifact Revisionを発行する
5. Current StatusとActive Phase Set導出ビューを再生成する

3. Current Status導出ビュー
| Qualified Phase ID | necessity評価 | Current Status | Latest Event ID | Replaced by Qualified Phase ID | Cancelled理由 | Latest Trigger ArtifactRef | Final State Artifact種別 | Final State ArtifactRef | 関連ArtifactRef一覧 |
|---|---|---|---|---|---|---|---|---|---|
| R4P-001-P1 | required / conditional-activated / conditional-not-activated / optional-executed / optional-not-run | planned / ready / in-progress / blocked / passed / failed / cancelled / superseded | ... | N/A | N/A | ... | Outcome / Disposition / N/A | N/A | ... |

不変条件:
- Current Statusは当該Phaseの最新Eventのto Statusと一致する
- planned / ready / in-progress / blockedではFinal State Artifact種別とFinal State ArtifactRefをN/Aとする
- passed / failedはFinal State Artifact種別=Outcomeとし、Outcome ArtifactRefを持つ
- cancelled / supersededはFinal State Artifact種別=Dispositionとし、Disposition ArtifactRefを持つ
- supersededは置換先Qualified Phase IDを必須とする
- cancelledは理由と未実行またはrollback確認を必須とする
- necessity評価`conditional-not-activated`または`optional-not-run`のPhaseはDisposition Recordを根拠にcancelledへ遷移する

4. Phase Evidence対応
| Qualified Phase ID | Validated Plan Revision | Phase R段階 | Phase種別 | 変更分類 | Verification要否 | Verification不要理由 | 根拠Evidence対応 | Evidence Record ArtifactKey一覧 | Resolution Manifest kind | Resolution Manifest ID / Revision | Resolution Manifest Anchor ID | Evidence Record N/A理由 | 関連Failure ID | 関連Cause ID | 関連Change ID | 関連Success ID | 関連Verification ID | 関連ID N/A理由 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R4P-001-P1 | 1 | R2-lite | Implementation | Rouault実装=あり; 契約=なし; テスト・設定=あり; generated files / lockfile=なし; ワークフロー成果物=あり; 一時生成物=なし | true | null | Issue={ISS-001:[R4P-001-G-E1]}; Failure={R4P-001-P1-F1:[R4P-001-P1-E-F1-1]}; Cause={R4P-001-P1-C1:[R4P-001-P1-E-C1-1]}; Change={R4P-001-P1-CH1:[R4P-001-P1-E-CH1-1]}; Success={R4P-001-P1-S1:[R4P-001-P1-EV-V1-A1]}; Verification={R4P-001-P1-V1:[R4P-001-P1-EV-V1-A1]}; Observation={N/A:[新規失敗観測なし]}; Auxiliary={R4P-001-P1-SUP1:[R4P-001-P1-E-SUP1-1]} | R4P-001-P1-ER1@rev-0001 | <profile-specific manifest kind> | <profile-specific manifest id / revision> | <profile-specific anchor id or N/A> | null | R4P-001-P1-F1 | R4P-001-P1-C1 | R4P-001-P1-CH1 | R4P-001-P1-S1 | R4P-001-P1-V1 | null |
| R4P-001-P2 | 1 | R0-equivalent | R0 Record | ワークフロー記録=あり; Rouault実装=なし; 契約=なし; テスト・設定=なし; generated files / lockfile=なし | false | 挙動影響なし確認のみ | Issue={ISS-001:[R4P-001-G-E1]}; Failure={N/A:[R0 Record Phaseのため対象外]}; Cause={N/A:[R0 Record Phaseのため対象外]}; Change={N/A:[R0 Record Phaseのため対象外]}; Success={N/A:[R0 Record Phaseのため対象外]}; Verification={N/A:[R0 Record Phaseのため対象外]}; Observation={N/A:[新規失敗観測なし]}; Auxiliary={N/A:[補助Evidenceなし]} | [] | <profile-specific manifest kind> | <profile-specific manifest id / revision> | <profile-specific anchor id or N/A> | R0 Record PhaseのためEvidence Record不要 | null | null | null | null | null | Failure: R0 Record Phaseのため対象外; Cause: R0 Record Phaseのため対象外; Change: R0 Record Phaseのため対象外; Success: R0 Record Phaseのため対象外; Verification: R0 Record Phaseのため対象外 |

Phase Evidence対応表の`Resolution Manifest kind`はProfile別に決めます。R4-Sでは`lightweight-resolution-manifest`、R4-I / R4-Aでは`artifact-manifest`を記録します。R4-I / R4-AではAnchor IDは非空かつ`N/A`不可です。Evidence Record ArtifactKey一覧が空の場合はEvidence Record N/A理由を非空で記録し、ArtifactKeyが1件以上ある場合はEvidence Record N/A理由を`null`にします。`Verification要否`はJSON化時の正本値に合わせ、`true` / `false`で記録します。Phase Evidence対応表は空にしてはいけません。関連ID N/A理由は、`null`になっているFailure / Cause / Change / Success / Verificationの種別をすべて含む形式で記録します。Phase Execution Event Logに出現するQualified Phase IDは、Phase Evidence対応表にも対応行を持たせます。



Phase ID対応に失敗した場合、R4-S / R4-IのCompletion Record、およびR4-AのClosure Attestationをcompleted / closed相当にしてはいけません。関連ID N/A理由は自由な「対象外」だけにせず、`null`になっている関連ID種別をすべて含めます。例: `Failure: R0 Record Phaseのため対象外; Cause: R0 Record Phaseのため対象外; Change: R0 Record Phaseのため対象外; Success: R0 Record Phaseのため対象外; Verification: R0 Record Phaseのため対象外`。

関連ID N/A理由は最低限、Failure / Cause / Change / Success / Verificationのいずれかの種別語を含めます。完全な種別網羅はvalidator意味制約で検証します。

Phase活動Artifactに記載した`Ledger registration payload（予定）`は計画値です。実際に登録された内容の正本はこの表だけとし、前段Artifactへ登録結果を書き戻しません。

5. Artifact Validation Attestation
Artifact Validation Attestation一覧は空にしてはいけません。`validity=valid`ではEvidence IDを1件以上記録し、`validity=superseded`では置換先ArtifactKeyまたはArtifactRefを記録します。

| Attestation ID | ArtifactKey | ArtifactRef | Created against Plan Revision | Validated against Plan Revision | 判定 | Evidence ID一覧 | timestamp | actor | superseded / invalid先ArtifactKey | superseded / invalid先ArtifactRef | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R4P-001-P1-AVA1 | ART-001@rev-0001 | ... | 1 | 2 | valid / requires-revision / superseded / invalid | ... | <RFC 3339> | ... | null | null | null |

Attestation規則:
- `valid`の場合、Evidence ID一覧は1件以上とし、reasonとsuperseded / invalid先は`null`にする
- `superseded`の場合、reasonを非空で記録し、superseded / invalid先ArtifactKeyまたはArtifactRefの少なくとも一方を記録する
- `invalid`、`requires-revision`、`manual-review-required`の場合、reasonを非空で記録する
- 現在のPlan Revisionに対するPhase成果物・Plan等の有効性の正本はこの表だけとする
- 影響なしArtifactは本体を改訂せず、valid Attestationを追加する
- 意味変更を受けるArtifactは新Artifact Revisionを作り、新旧ArtifactRefを対応付ける
- 無効Artifactは削除せず、superseded / invalid Attestationを追加する
- 当該pre-final Ledger Artifact Revision自身をこの表でvalidと自己証明しない
- pre-final Ledger自身は、R4-SではLightweight Resolution Manifest解決、R4-I / R4-AではArtifact Manifest digestを使い、Event Log再計算、Current Status再計算、Active Phase Set再計算をFinal Verificationで確認する

6. Verification-only / Integration verificationで新Failureを検出した場合
- Detected Failure Observation ID:
- Observation Evidence ID一覧:
- 元PhaseのRequested Status: failed / blocked
- 移管先Implementation Qualified Phase ID:
- 移管先Failure ID:
- Observation → Failure対応:
- 新Plan Revision:
- 元Phaseで修正していない確認:

7. Active Phase Set導出表
| Qualified Phase ID | final Planに存在 | retired / replaced | necessity | necessity評価 | executed | Active Setに含む | 理由 | final status |
|---|---|---|---|---|---|---|---|---|
| ... | yes / no | yes / no | required / conditional / optional | required / conditional-activated / conditional-not-activated / optional-executed / optional-not-run | yes / no | yes / no | ... | ... |

Active Phase Set導出規則:
- final Plan Revisionに存在し、retired / replacedではないPhaseを候補とする
- `required`はActive Setへ含める
- `conditional-activated`はActive Setへ含める
- `optional-executed`はActive Setへ含める
- `conditional-not-activated`と`optional-not-run`はActive Setへ含めず、Disposition Recordを根拠にcancelledへ遷移する

R4完了時の不変条件:
- Active required Phaseはpassed
- conditional-activated Phaseはpassed
- optional-executed Phaseはpassed
- conditional-not-activated Phaseはcancelled
- optional-not-run Phaseはcancelled
- retired / replaced Phaseはcancelledまたはsuperseded
- planned / ready / in-progress / blocked / failedが残っていない
- cancelled / superseded Phaseの差分・成果物が最終結果へ混入していない
- suspended / pendingの場合はR4完了としていない

8. pre-final freeze
- 凍結対象Plan Revision:
- pre-final Ledger ArtifactRef:
- Phase成果物のArtifact Validation Attestation完了:
- pre-final Ledger自身をAttestation対象から除外した確認:
- Active Phase Set導出完了:
- Phase Event Log完了:
- Current Status再計算用入力固定:
- Final Verification作成後、このpre-final Ledger Revisionへ書き戻さない確認:
```

## 10.3 Phase Transition / Outcome / Disposition Artifact

Phase Statusを変更する根拠Artifactを、非完了遷移、実行結果、廃止判断で分離します。Artifactから後段Execution Event IDを参照しません。

### 10.3.1 Phase Transition Record

blockedなど再開可能な非完了遷移に使います。

```text
Phase Transition Record:
- Common Artifact Header: 0.0aを転記
- Transition Record ID:
- Qualified Phase ID:
- 対象Plan Revision:
- Requested Phase Status transition:
  - from:
  - to: blocked / ready / in-progress
  - 根拠:
- Evidence ID一覧:
- 再開条件:
- owner:
- redaction確認:
```

### 10.3.2 Implementation Phase Outcome Record

Implementation Phaseの実行結果`passed / failed`を記録します。`blocked`はPhase Transition Record、`cancelled / superseded`はPhase Disposition Recordを使います。

```text
Implementation Phase Outcome Record:
- Common Artifact Header: 0.0aを転記
- Outcome Record ID:
- Qualified Phase ID:
- 対象Plan Revision:
- Requested Phase Status transition:
  - from: in-progress
  - to: passed / failed
  - 根拠:
- 使用したPlan ArtifactRef:
- 実装ArtifactRef一覧:
- Verification ArtifactRef一覧:
- Evidence Record ArtifactKey一覧:
- 最終採用Verification Evidence ID:
- git diff確認:
- generated files / lockfile確認:
- rollback状態:
- 未完了項目:
- redaction確認:
```

### 10.3.3 Phase Disposition Record

未実行取消、Plan上のretire / replacement、実行済みPhaseのcancelled / supersededに使います。

```text
Phase Disposition Record:
- Common Artifact Header: 0.0aを転記
- Disposition Record ID:
- Qualified Phase ID:
- 対象Plan Revision:
- disposition:
  - conditional-not-activated
  - optional-not-run
  - retired
  - replaced
  - cancelled-before-execution
  - cancelled-after-block
  - superseded-after-outcome
- Necessity Evaluation Event ID: <該当時>
- 置換先Qualified Phase ID: <該当時>
- Evidence ID一覧:
- rollback / 差分除去確認:
- Requested Phase Status transition:
  - from:
  - to: cancelled / superseded
  - 根拠:
- redaction確認:
```

## 10.4 Verification-only / Integration verification Record

```text
Verification-only / Integration verification Record:
- Common Artifact Header: 0.0aを転記
- Verification Record ID:
- Issue ID:
- R4 Phase Plan ID:
- R4 Phase Plan Revision:
- Qualified Phase ID:
- Record role: Phase Outcome / Phase Transition
- Requested Phase Status transition:
  - from:
  - to: passed / failed / blocked
  - 根拠:
- passed / failedの場合はPhase Outcome Artifact、blockedの場合はPhase Transition Artifactとして扱う:
- blocked RecordはPhase Outcome ArtifactRefには使わない:
- Phase R段階: R1 / R2-lite / R2-full / R3（Integration verificationはR2-lite以上）
- Phase種別: Verification-only / Integration verification
- 目的:
- 計画時点で新規Failure / Cause / Changeを所有しない確認:
- 判断リスク成果物:
- Phase開始基準:
  - base commit:
  - worktree state:
  - 既存の未コミット差分:
- 変更分類（このPhase起因）:
  - Rouault実装変更有無: なし
  - 契約変更有無: なし
  - テスト・設定変更有無: なし
  - generated files / lockfile変更有無: なし
  - ワークフロー成果物更新有無: あり / なし
  - 一時生成物発生有無: あり / なし
- 参照する既存ID:
  - Failure ID:
  - Cause ID:
  - Change ID:
  - 関連ID N/A理由:
- 成功条件:
  - Phase Success ID: 必須
  - 参照元Success ID一覧: 任意
  - 参照元SuccessとPhase Successの関係:
  - 期待結果:
  - 成功判定条件:
- Verification:
  - Verification ID:
  - 検証方法:
  - Verification Evidence参照種別: Evidence Record Entry / Direct Evidence
  - Verification Evidence参照:
    - 対応Entry ID一覧: <Evidence Recordを使う場合>
    - 直接Verification Evidence ID一覧: <Evidence Recordを使わない場合>
    - 最終判定に採用したEntry ID: <Evidence Recordを使う場合>
    - 最終判定に採用したVerification Evidence ID:
  - 判定:
- Detected Failure:
  - Detected Failure Observation ID: <検出時のみ>
  - Observation Evidence ID一覧:
  - 当該Phaseで修正しない確認:
  - Requested Status: failed / blocked
  - 移管先Implementation Qualified Phase ID:
  - 移管先Failure ID:
  - Observation → Failure対応:
  - 新Plan Revision:
  - 全体Cause Matrix / Fix Plan / Decision Record更新:
- git diff確認（Phase開始基準との差分）:
  - Phase開始基準からのRouault実装差分なし:
  - 契約差分なし:
  - テスト・設定差分なし:
  - generated files / lockfile差分なし:
  - ワークフロー成果物差分:
  - 一時ファイル / build成果物:
- Ledger registration payload（予定）:
  - 根拠Evidence対応:
  - Evidence Record ArtifactKey一覧:
  - Verification不要理由: null（Verification要）
  - 関連Success ID:
  - 関連Verification ID:
- 機密情報・redaction:
  - redaction済み / 不要 / 要追加確認:
```

## 10.5 Final R4 Disposition Verification

pre-final R4 Execution Ledgerを入力として、R4全体の終端状態を独立に検証する成果物です。作成後にpre-final Ledgerへ書き戻しません。pre-final Ledger自身はArtifact Validation Attestationによる自己証明の対象外とし、選択したR4 Profileに応じて、軽量Resolution ManifestによるArtifactKey解決、またはManifest digest / Manifest Anchorと再計算で検証します。

```text
Final R4 Disposition Verification:
- Common Artifact Header: 0.0aを転記
- Final Verification Artifact ID:
- Final Verification ID:
- Final Success ID:
- R4 Profile: R4-S / R4-I / R4-A
- mode: integration / no-change closure
- 対象R4 Phase Plan ArtifactRef:
- 対象Plan Revision:
- 対象pre-final R4 Execution Ledger ArtifactRef:
- R4-S Resolution入力（R4-Sで必須）:
  - Lightweight Resolution Manifest ArtifactRef:
  - Lightweight Resolution Manifest ID:
  - Lightweight Resolution Manifest Revision:
  - Manifest Anchor ID: N/A可
  - ArtifactKey一意解決結果:
  - revoked / superseded Entry非混入:
  - digest未記録理由の妥当性:
- R4-I / R4-A Verification Input Manifest Anchor一覧（R4-I以上で必須）:
  | Manifest Anchor ID | Manifest ID | Manifest Revision | immutable path | Manifest SHA-256 | storage scope |
  |---|---|---:|---|---|---|
  | ... | ... | ... | ... | ... | repository-redacted / private / restricted |
- 対象Final State ArtifactRef一覧:
- 対象Verification ArtifactRef一覧:
- 対象Qualified Phase ID一覧:
- 対象Artifact Validation Attestation ID一覧: <pre-final Ledger自身を除く>
- Phase成果物が対象Plan Revisionに対してvalid:
- requires-revision Artifactがない:
- superseded / invalid / revoked Artifactが対象集合へ含まれていない:
- ArtifactRef解決:
  - R4-S: Lightweight Resolution Manifest RevisionでArtifactKeyがstorage classとimmutable locatorを含むArtifactRefへ一意に解決できる
  - R4-I / R4-A: Verification Input Manifest Anchor集合でArtifactKeyがstorage class、locator、SHA-256、Git情報を含むArtifactRefへ一意に解決できる
- pre-final Ledger検証:
  - R4-S: Ledger内ArtifactKeyがLightweight Resolution Manifestで一意に解決できる
  - R4-I / R4-A: Manifest EntryのdigestとLedger実体が一致する
  - Event Log再計算結果:
  - Current Status再計算結果:
  - Active Phase Set再計算結果:
  - Final State ArtifactRef再計算結果:
  - Event classとTrigger Artifact種別の整合:
- 期待結果:
- 成功判定条件:
- 検証方法:
- Verification Evidence参照種別: Evidence Record Entry / Direct Evidence
- Verification Evidence参照:
  - 対応Entry ID一覧:
  - 直接Verification Evidence ID一覧:
  - attempt履歴:
  - 最終採用Entry ID:
  - 最終採用Verification Evidence ID:
- integration確認:
  - Active Phase Setの変更統合:
  - 統合後の回帰確認:
  - retired / replaced / cancelled / superseded成果物の非混入:
- no-change closure確認:
  - 有効な実装差分がない:
  - rollback漏れがない:
  - retired / replaced / cancelled / superseded Phaseの差分・成果物が混入していない:
  - Issueを閉じるEvidenceが揃っている:
- timestamp: <RFC 3339>
- environment:
- 実際の結果:
- 判定: pass / fail / blocked
- 未検証項目:
- コミット分割方針:
- 機密情報・redaction:
```

Profile別完了順序:

R4-S:

1. Plan Revisionを凍結する
2. Lightweight Resolution Manifestを確定し、ArtifactKeyを一意にArtifactRefへ解決できることを確認する
3. Phase Execution Event Log、Necessity Evaluation Log、Phase成果物のArtifact Validation Attestationを完了する
4. Active Phase Set、Current Status、Final State ArtifactRefを再計算する
5. pre-final R4 Execution Ledger Revisionを凍結する
6. Final R4 Disposition Verificationを作成する
7. R4 Completion Recordでpre-final Ledger、Final Verification、Lightweight Resolution Manifest、再計算結果を人間承認する

R4-I:

1. Plan Revisionを凍結する
2. Artifact Manifestを確定し、ArtifactKeyを一意にArtifactRefへ解決できることを確認する。R4-IではLightweight Resolution Manifestを使わない
3. Phase Execution Event Log、Necessity Evaluation Log、Phase成果物のArtifact Validation Attestationを完了する
4. Active Phase Set、Current Status、Final State ArtifactRefを再計算する
5. pre-final R4 Execution Ledger RevisionをArtifact Manifestへ登録する
6. pre-final Ledger登録後のManifest Revisionを不変保存し、Verification Input Manifest Anchor集合を作成する
7. Final R4 Disposition Verificationを作成する
8. Final VerificationをArtifact Manifestへ登録し、Manifest Revisionを不変保存してManifest Anchorで固定する
9. R4 Completion RecordでManifest chain、ArtifactKey解決、SHA-256一致、pre-final Ledger、Final Verificationを人間承認する

R4-A:

1. Plan Revisionを凍結する
2. Artifact Manifestを確定し、ArtifactKeyを一意にArtifactRefへ解決できることを確認する。R4-AではLightweight Resolution Manifestを使わない
3. Phase Execution Event Log、Necessity Evaluation Log、Phase成果物のArtifact Validation Attestationを完了する
4. Active Phase Set、Current Status、Final State ArtifactRefを再計算する
5. pre-final R4 Execution Ledger RevisionをArtifact Manifestへ登録する
6. pre-final Ledger登録後のManifest Revisionを不変保存し、Verification Input Manifest Anchor集合を作成する
7. Final R4 Disposition Verificationを作成する
8. Final VerificationをArtifact Manifestへ登録し、Manifest Revisionを不変保存してManifest Anchorで固定する
9. Closure Input Manifest Anchor集合を作成する
10. Closure Manifestを作成し、Closure Input Manifest Anchor一覧、Plan、pre-final Ledger、Final Verificationを参照する
11. Closure Manifestを次のManifest Revisionへ登録する
12. Closure Manifest登録後の最終Manifest Revisionを不変保存し、最終Manifest Anchor集合を作成する
13. Closure Attestationで最終Manifest Anchor集合、Closure Manifest、Final Verification、pre-final Ledger、Active Phase Setを検証し、closed / not-closedを導出する

## 10.5a R4 Completion Record

R4 Completion Recordは、R4-S / R4-IでR4全体を閉じるための人間承認付き完了記録です。R4-AではClosure Attestationがclosed導出の正本になるため、Completion RecordはPR / commit向けの要約として任意に作成できます。

```text
R4 Completion Record:
- Common Artifact Header: 0.0aを転記
- Completion Record ID:
- Issue ID:
- R4 Profile: R4-S / R4-I / R4-A
- R4 Phase Plan ArtifactRef:
- Plan Revision:
- pre-final R4 Execution Ledger ArtifactRef:
- Final R4 Disposition Verification ArtifactRef:
- R4-S Resolution Manifest（R4-Sで必須。R4-I / R4-AではN/A）:
  - Lightweight Resolution Manifest ArtifactRef:
  - Manifest ID:
  - Manifest Revision:
  - Manifest Anchor ID: N/A可
  - ArtifactKey一意解決:
  - revoked / superseded Entry非混入:
  - digest未記録理由の妥当性:
- R4-I / R4-A Artifact Manifest（R4-I以上で必須。R4-SではN/A）:
  - Artifact Manifest ArtifactRef:
  - Manifest ID:
  - Manifest Revision:
  - Manifest Anchor ID一覧:
  - Manifest chain検証結果:
  - ArtifactKey一意解決:
  - SHA-256一致確認:
- R4-S構造検証:
  - Phase Execution Event Log再計算:
  - Current Status再計算:
  - Active Phase Set再計算:
  - Final State ArtifactRef再計算:
- R4-I完全性検証（R4-Iでは必須。R4-AでCompletion Recordを作成する場合も記入）:
  - Manifest chain検証結果:
  - pre-final Ledger登録Manifest Revision:
  - Final Verification登録Manifest Revision:
  - 使用したManifest Anchor ID一覧:
  - SHA-256一致確認:
  - ArtifactKey解決確認:
  - invalid / superseded / requires-revision Artifact非混入:
  - validator result:
- R4-Aの場合:
  - Closure Manifest ArtifactRef:
  - Closure Attestation ArtifactRef:
  - derived closure state:
- 完了判定: completed / not-completed / manual-review-required
- 未検証項目:
- 人間承認:
  - approver:
  - timestamp: <RFC 3339>
  - 条件付き承認の有無:
- コミット分割方針:
- 備考:
```

## 10.6 Closure Manifest

Final Verification登録後のClosure Input Manifest Anchor集合を基準に、閉鎖関係を一方向に固定します。Closure Manifest自身を登録するManifest Revisionや最終Manifest Anchor集合は、Closure Manifest本文へ書き戻しません。

```text
Closure Manifest:
- Common Artifact Header: 0.0aを転記
- Closure Manifest ID:
- Issue ID:
- Closure Input Manifest Anchor一覧:
  | Manifest Anchor ID | Manifest ID | Manifest Revision | immutable path | Manifest SHA-256 | storage scope |
  |---|---|---:|---|---|---|
  | ... | ... | ... | ... | ... | repository-redacted / private / restricted |
- R4 Phase Plan ArtifactRef:
- Plan Revision:
- pre-final R4 Execution Ledger ArtifactRef:
- Final R4 Disposition Verification ArtifactRef:
- proposed closure disposition: proposed-closed / proposed-not-closed
- proposed closure timestamp: <RFC 3339>
- actor:
- 備考:
```

Closure完了後の外部登録:

- Closure Manifestは次のArtifact Manifest Revisionへ登録する
- そのManifest Revisionを不変保存し、最終Manifest Anchor集合を作成する
- 最終Manifest Anchor ID一覧はClosure Attestation、commit、PR、completion report等のArtifact外部記録から参照する
- Closure Manifest本文へ登録先Manifest Revisionまたは最終Manifest Anchor ID一覧を書き戻さない
- Closure Manifest単独では`closed`を確定しない。`closed / not-closed`はClosure Attestationの検証結果から導出する

## 10.7 Closure Attestation

Closure Attestationは、R4-Aでのみ、Closure Manifest登録後の最終Manifest Anchor集合を入力として、R4全体がclosedかどうかを導出する外部または後続成果物です。Closure Manifest本文へ書き戻しません。R4-S / R4-IではFinal R4 Disposition VerificationとCompletion Recordで完了を扱い、Closure Attestationを要求しません。

```text
Closure Attestation:
- Closure Attestation ID:
- Issue ID:
- R4 Phase Plan ID:
- Closure Manifest ArtifactKey:
- Closure Manifest Resolution Manifest ID / Revision:
- Closure Manifest Resolution Manifest Anchor ID:
- Final Manifest Anchor一覧:
  | Manifest Anchor ID | Manifest ID | Manifest Revision | immutable path | Manifest SHA-256 | storage scope | signature / Git commit |
  |---|---|---:|---|---|---|---|
  | ... | ... | ... | ... | ... | repository-redacted / private / restricted | ... |
- 検証したSchema:
  - artifact-manifest.schema.json:
  - r4-execution-ledger.schema.json:
  - closure-manifest.schema.json:
- 検証コマンド:
- 検証結果:
  - Manifest chain:
  - Anchor signature / Git commit:
  - Closure Manifest registration:
  - Final Verification pass:
  - Active Phase Set terminal invariant:
  - private / restricted Evidence redaction invariant:
- validation result: pass / fail / manual-review-required
- derived closure state: closed / not-closed
- 不変条件: validation resultがfailまたはmanual-review-requiredの場合、derived closure stateは必ずnot-closed
- timestamp: <RFC 3339>
- actor:
- 備考:
```

## 11. Verification

### 簡略Verification

```text
Verification:
- V1:
  - Failure ID: F1
  - Cause ID: C1
  - Change ID: CH1
  - Support ID: SUP1 / N/A
  - Success ID: S1
  - Verification Evidence履歴:
    - attempt:
      - Verification Evidence ID:
      - timestamp: <RFC 3339>
      - environment:
      - result:
  - 最終判定に採用したVerification Evidence ID:
  - 検証方法:
  - 結果:
  - 判定:
```

### 軽量Verification

```text
軽量Verification:

- V1:
  - 対応: F1 → C1 → CH1 → S1
  - Support: SUP1 / N/A
  - Verification Evidence履歴:
    - attempt:
      - Verification Evidence ID:
      - timestamp: <RFC 3339>
      - environment:
      - result:
  - 最終判定に採用したVerification Evidence ID:
  - 検証:
  - 結果: pass / fail / 未検証
  - 判定: 完了 / 未完了
```

### Verification Matrix

```text
Verification Matrix metadata:
- Common Artifact Header: 0.0aを転記
- Verification Evidence参照方式: Evidence Record Entry / Direct Evidence / 混在
```

```text
| Verification ID | Attempt | Failure ID | Failure Evidence ID | 修正前失敗条件 | Cause ID | Cause Evidence ID | 採用原因 | Change ID | Change Evidence ID / Diff Evidence ID | Support ID | 修正内容 | 修正ファイル | Success ID | Success Evidence ID | 修正後成功条件 | Verification Evidence参照種別 | Verification Evidence参照（Entry ID一覧または直接Evidence ID一覧） | 最終採用Verification Evidence ID | 検証コマンド / 確認方法 | cwd | 実行経路 | exit code | ログ位置 | timestamp | environment | 結果 | 判定 |
|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|---|---|---|---|---|
| V1 | 1 | F1 | E1 | ... | C1 | E2 | ... | CH1 | E-CH1-1 | SUP1 / N/A | ... | ... | S1 | EV-V1-A2 | ... | Evidence Record Entry / Direct Evidence | ER1-ENTRY2,ER1-ENTRY3 / EV-V1-A1,EV-V1-A2 | EV-V1-A2 | ... | ... | pnpm / corepack pnpm / npm script / node / CI job / browser manual | 0 | ... | <RFC 3339> | ... | pass / fail / 未検証 | 完了 / 未完了 |
```

Verification Matrixの必須条件です。

```text
- すべての修正前失敗条件が1行以上に対応している
- すべての成功条件が1行以上に対応し、Success Evidence IDから実証Evidenceへ辿れる
- すべての主要修正ファイルが1行以上に対応している
- すべてのChange IDが検証またはdiff確認に対応している
- Support IDがある場合、その必要性を説明できる
- 採用原因と無関係な変更がない
- 検証できていない項目は「未検証」と明示されている
- Evidence Recordを使う行は各Entry IDから実行ログ等へ辿れる。Evidence Recordを使わない行は1 attemptにつき1行とし、直接Verification Evidence ID、command / manual check、ログ位置、timestamp、environment、resultを記録する
- 同一Verificationを複数attempt実行する場合は、Evidence Recordを使うか、attemptごとに別行へ分ける。1行へ複数Evidence IDと単一timestamp / environment / resultを混在させない
- 最終採用Verification Evidence IDが参照Entryまたは直接Evidence ID一覧に存在する
- 再実行したVerificationは過去Entryを上書きせず、append-onlyのEntry indexと最終判定に採用したEvidence IDを確認できる
- 範囲外の失敗は根拠付きで分離されている
- Verificationで対応関係を説明できない変更は差し戻す
```

## 12. 手動確認記録

UI、visual / paint contract、accessibility、routing、browser / viewport依存の問題では、必要に応じて手動確認記録を残します。

```text
手動確認記録:
- Common Artifact Header: 0.0aを転記

- 対応するVerification ID:
- Verification Evidence ID:
- 自動化できない理由:
- 確認者:
- 日時:
- browser:
- viewport:
- URL / route:
- 操作手順:
- 期待状態:
- 実際の状態:
- screenshot:
- redaction status:
- 判定:
```

手動確認は、自動テストの代替ではありません。自動化できる確認は、可能な範囲でテストまたはスクリプトに移します。

手動確認をVerificationの根拠にする場合は、手動確認記録を必須にします。手動確認だけで完了判定する場合は、自動化できない理由を記録します。

## 13. ロールバック方針

R3以上では必須です。blockerではR2以下でも封じ込め段階でrevert可否を確認します。

```text
ロールバック方針:

- ロールバック条件:
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
