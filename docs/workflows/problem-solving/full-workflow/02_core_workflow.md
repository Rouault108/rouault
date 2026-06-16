# 02. コアワークフロー

このファイルは、標準フロー、実装開始ゲート、Evidence作成方針の正本です。実装後の詳細順序、完了条件、再ループ、ロールバック、コミット前確認は `06_completion_commit.md` を正本とします。

## 1. 基本方針

Rouaultで問題が発覚した場合、症状から直接実装に進みません。

R1以上では、次の対応を固定します。

```text
Failure ID
  ↔ Cause ID
  ↔ Change ID
  ↔ Success ID
  ↔ Verification ID
```

補助変更が必要な場合は、Support IDで管理します。

```text
Support ID
  ↔ 対応するChange ID
  ↔ 補助変更の必要性
  ↔ 検証または差分確認
```

Support IDで説明できない便乗変更は行いません。

IDのライフサイクルは次を原則とします。

```text
ID管理規則:
- 一度記録したFailure ID、Cause ID、Change ID、Success ID、Verification ID、Evidence ID、Verification Evidence IDは意味を書き換えない
- 新しい失敗は新しいFailure IDとして追加する
- 棄却されたCause IDは削除せず、棄却理由とEvidence IDを残す
- 置き換えたChange IDはsupersededとして扱い、置き換え先のChange IDを記録する
- Success IDを変更する場合は、対応するFailure IDと契約影響を再確認する
- 誤ったEvidenceは削除や上書きをせずinvalidまたはsupersededとして残し、修正版を新しいEvidence IDで追加する
- redaction版は元Evidenceを置換せず、別Evidence IDを発行して派生元Evidence IDを記録する
- Evidence削除は機密漏えい対応など明示的な例外に限定し、削除理由、承認者、代替Evidenceを記録する
- Verification IDの意味は維持し、再実行ごとに新しいVerification Evidence IDをappend-onlyで追加する
- 各Evidenceにattempt、RFC 3339 timestamp、environment、resultを記録し、最終判定に採用したVerification Evidence IDを明示する
- R4ではIssue ID、R4 Phase Plan ID、Plan Revision、Phase IDを親子関係として記録し、Phase内IDは`P1-F1`等の名前空間でR4 Phase Plan内一意にする
- IDの意味を誤って記録した場合は、旧IDをinvalid / supersededとして残して新IDを発行する
```

## 1.1 R軸とA軸の扱い

R0〜R4は変更リスク、A0〜A2は証拠保全・監査保証レベルです。標準フローでは、入口判定でR段階を暫定決定し、初動トリアージでAレベルを暫定決定します。Aレベルは、R段階を上げ下げする根拠ではなく、Evidence、Manifest、redaction、保持・失効、Anchor、Attestationの必要度を決める根拠です。

```text
- R段階: 実装前の調査粒度、成果物、レビュー分割、検証範囲を決める
- Aレベル: 証拠保全、完全性、redaction、private / restricted保管、A2 Evidence Integrity Attestation、R4-Aの場合のClosure Attestationを決める
- R4かつA0 / A1: レビュー不能な大規模変更だが、R4-SまたはR4-Iで足りる
- R1 / R2かつA2: 変更は小さいが、A2 Evidence Integrity Attestationとprivate / restricted Evidence分離が必要
```

## 2. 標準フロー

```text
0. 暫定入口判定
  ↓
1. 初動トリアージ
  ↓
2. 封じ込め要否の判断
  ↓
2a. 封じ込め前の最小証拠保存
  ↓
2b. 必要な場合のみ封じ込め実施
  ↓
2c. 封じ込め結果をEvidenceへ引き継ぐ
  ↓
3. Evidence作成
  ↓
4. 重大度判定
  ↓
5. リスク段階の確定または昇格
  ↓
6. 成果物の粒度決定
  ↓
7. 修正前失敗条件と修正後成功条件の固定
  ↓
8. GitHub現行実装とlocal / CI実態の確認
  ↓
9. 原因仮説の整理
  ↓
10. 調査打ち切り条件の確認
  ↓
10a. 調査結果によるDisposition分岐
  - Issue全体を修正なしで閉じる → No-change Completion → 完了確認へ進み、Implementation経路へ合流しない
  - 対象Phase / 対象範囲だけ変更しない → No-action Record（R4専用）→ Ledgerへ反映して次のR4 Phaseへ進む
  - Evidence引渡し、外部依存待ち、再現情報待ち → Investigation-only Record → handoffまたはsuspendし、現在経路を終了する
  - 実装修正が必要 → 続行
  ↓
11. 影響範囲と契約面の確認（Implementation経路のみ）
  ↓
12. Phase種別・R段階に応じてMini Brief / R2-lite Run Card / R2-lite Brief / Fix Plan / 専用活動Recordを作成
  ↓
13. Fix Plan精査（R2-full以上は必須）・反対仮説レビュー（R3以上は必須）
  ↓
14. 実装開始ゲート確認
  ↓
15. 実装
  ↓
16. 修正前失敗条件の最小再検証
  ↓
17. git diffベースの実装差分精査
  ↓
18. 実装後R段階再判定
  ↓
18a. R段階変更履歴を更新
  ↓
19. R2-liteの場合はRun CardまたはR2-lite Resultへ実装後記録を反映し、Verification更新と対応させる
  ↓
20. Verification更新
  ↓
20a. R4 Implementation Phaseでは、passed / failed時にImplementation Phase Outcome Record、blocked時にPhase Transition Record、cancelled / superseded時にPhase Disposition Recordを作成し、対応EventからArtifactRefを参照
  ↓
21. 回帰確認・広範囲テスト
  ↓
22. 失敗が残る場合は再ループ
  ↓
23. 再発防止・残課題・ロールバック方針の整理
  ↓
24. 完了条件確認
  ↓
25. コミット前最終確認
  ↓
26. コミット方針整理
```

0の暫定入口判定は、調査粒度を決めるための初期分類です。5のリスク段階判定は、Evidence、重大度、再現性、原因候補、契約影響、local / CI差分を踏まえた確定または昇格判断です。

### 2.1 R別ショートフロー

軽微な問題で完全版フローを過剰適用しないため、実運用では次のショートフローを使います。

```text
R0:
- R0 Record
- 手修正
- git diff確認
- 完了

R1:
- Mini Evidence
- Mini Brief
- 手修正またはChatGPT置換案
- 修正前失敗条件の最小再検証
- git diff確認
- 簡略Verification

R2-lite:
- R2-lite Run Card、またはR2-lite Briefを作成
  - Evidenceは原則としてRun Card / Briefに内包する
  - 単一のEvidenceを見やすさのために別成果物化する場合は、Run Card / BriefのEvidence欄にEvidence ID、保存場所 / ファイル名、Evidence IDとの対応を記録する
  - 別成果物Evidenceの保存場所 / ファイル名はredaction済みで後から参照可能な成果物を指し、失効し得るCI artifactだけを保存場所にしない
  - Minimum Evidence Packet相当は、Run Card / Brief内に内包、または単一Evidenceを別成果物化してEvidence IDで参照する
  - Run CardまたはBrief内のC欄にCause Summary相当を内包する
  - Cause Summary相当をRun Card / Brief内で十分に説明できない場合、または別成果物として分離する必要がある場合はR2-full以上へ昇格
  - 採用原因を1つに固定でき、残る仮説が修正対象・成功条件・契約影響を変えない場合だけ主要仮説2個まで可
  - Evidenceが複数種類または複数箇所に分散し、Run Card / BriefのEvidence欄と単一の別成果物Evidenceだけでは追跡困難な場合、原因候補3個以上、または競合仮説が残る場合はR2-full以上へ昇格
- 実装
- 修正前失敗条件の最小再検証
- git diff精査
- 実装後R段階再判定
- R2-lite Run CardまたはR2-lite Resultを更新
- 軽量Verification
- 必要な回帰確認
- 完了条件確認

R2-full:
- Issue Brief
- Minimum Evidence Packet、必要に応じてEvidence Record
- Cause SummaryまたはCause Matrix
- 契約影響チェック
- 契約影響あり、または不明の場合はContract Inventory
- Fix Plan
- Fix Plan精査
- 実装開始ゲート
- 実装
- 修正前失敗条件の最小再検証
- git diff精査
- 実装後R段階再判定
- Verification Matrix
- 回帰確認
- 完了条件確認

R3:
- Issue Brief
- Minimum Evidence Packet
- Evidence Record
- Cause Matrix
- Contract Inventory
- Decision Record
- Fix Plan
- Fix Plan精査
- 反対仮説レビュー
- ロールバック方針
- 実装開始ゲート
- 実装
- 修正前失敗条件の最小再検証
- git diff精査
- 実装後R段階再判定
- Verification Matrix
- 回帰確認
- 完了条件確認

R4:
- 全体Issue Brief
- 全体Minimum Evidence Packet
- 全体Evidence Record
- 全体Cause Matrix
- 全体Contract Inventory、または根拠付きN/A
  - 全フェーズでDOM / CSS / ARIA / state / generated files / lockfile / routing / search / security / テスト期待値 / snapshot / visual・paint contractに一切触れないことを証明できる場合のみ、根拠付きN/A可
- 全体Decision Record
  - フェーズ分割、統合、契約影響、削除・移行・縮退判断、ロールバック方針を説明する
- 全体Fix Plan
  - 全体の変更境界、フェーズ分割方針、フェーズ間契約、統合Verification、コミット分割方針を説明する
- R4 Phase Plan
  - 計画構造、Phase necessity、Activation condition、成功条件、変更境界、依存関係、Plan Revisionを明記する
  - Phase種別とPhase R段階を直交させ、判断リスク成果物と活動固有成果物を合成する
  - R4 Phase内にR4をネストしない。R4相当のPhaseは同じPhase Plan内で再分割する
- Resolution Manifest / Artifact Manifest / Manifest Anchor
  - R4-SではLightweight Resolution ManifestをRevision別ファイルで不変保存し、ArtifactKeyからstorage classとimmutable locatorを含むArtifactRefを解決する
  - R4-I / R4-AではArtifact Manifest RevisionをRevision別ファイルで不変保存し、ArtifactKeyからArtifactRef、digest、storage classを解決する
  - Entryのadd / correct / revoke、正本選択、private locator非公開を管理する。Manifest Anchorによる完全性固定はR4-I / R4-Aで必須、R4-SではN/A可とする
  - 正規化、SHA-256、署名、Anchor、Schema検証は `../r4-validation/08_r4_schema_and_validation.md` と `../r4-validation/schemas/` に従う
- R4 Execution Ledger
  - Phase Necessity Evaluation Log、Phase Execution Event Log、Current Status、Final State ArtifactRef、Evidence対応、Artifact Validation Attestationを明記する
  - pre-final Ledger自身はAttestationで自己証明せず、R4-SではLightweight Resolution Manifest解決とFinal Verificationの再計算、R4-I / R4-AではManifest digestとFinal Verificationの再計算で検証する
  - Phase StatusはEvent Logへappend-onlyで記録し、各RecordにはRequested Status transitionだけを残す
- 全体Fix Plan精査
  - 全体Decision Record、全体Contract Inventoryまたは根拠付きN/A、R4 Phase Plan、各Phase R段階と矛盾していないことを確認する
- フェーズ単位の判断リスク成果物と活動固有成果物を作成し、Evidence記録、実装または専用Record、Phase種別に応じた再検証、diff精査、Verificationを行う
  - Implementation Phaseでは、修正前失敗条件の最小再検証を必須とする
  - R0 Record Phaseでは、最小再検証をN/Aとし、挙動影響なし確認とgit diff確認を必須とする
  - No-change Phaseでは、Issue全体を閉じられる再現確認または現行状態確認、有効な先行実装差分が残っていないこと、必要なrollback完了を記録し、終端Phaseとして後続Phaseを持たない
  - No-action Phaseでは、対象Phaseで変更しない理由と後続Phaseへの影響を記録し、Issueを閉じない
  - Investigation-only Phaseでは、調査目的に対応するEvidence取得を必須とし、Dispositionに応じてhandoff先、外部依存、または再現待ちの再開条件を記録する
  - Verification-only / Integration verification Phaseでは、Phase Success IDの成功条件に対するVerificationを必須とする。新FailureはDetected Failure Observation IDとして記録し、別IDのFailureを新しいImplementation Phaseへ作成して対応付ける
  - 各フェーズの成果物とEvidenceはPhase R段階およびPhase種別に従う
- フェーズ間契約確認
- Final R4 Disposition Verification（integration / no-change closure）
- R4-Sの場合はCompletion RecordでFinal VerificationとPhase終端不変条件の採用を記録する
- R4-I以上の場合はArtifact Manifest / Manifest Anchorで対象Revisionを固定する
- R4-Aの場合だけClosure ManifestとClosure Attestationを作成する
  - Closure Manifestは`proposed-closed / proposed-not-closed`を記録する。Closure Manifest単独ではclosedを確定しない
  - Closure AttestationはClosure Manifest登録後の最終Manifest Anchor集合を検証し、closed / not-closedを導出する
- Phase終端不変条件と完了条件確認
```

R4のPlan Revisionと実行状態は分離します。

```text
Plan Revisionで更新するもの:
- Phase追加・分割
- 依存関係
- success / activation / change boundary
- Phaseのretire / replacement
- 表記・redaction・参照補正だけの変更はPlan Revisionを増やさずArtifact Revisionだけを増やす

R4 Execution LedgerのPhase Execution Event Logで記録するもの:
- N/A → planned → ready → in-progress → passed / failed
- blockedと再開
- cancelled / superseded
- Trigger ArtifactRef、Evidence、timestamp、理由、actor

Artifactの現在有効性:
- Artifact本体へ書き戻さない
- R4 Execution LedgerのArtifact Validation Attestationだけを正本にする
```

R4完了時の終端不変条件です。

```text
- 最終Plan RevisionのActive Phase Setだけを完了対象にする
- Active required Phaseはすべてpassed
- conditional-activated Phaseはpassed
- optional-executed Phaseはpassed
- conditional-not-activated PhaseはDisposition Record + cancelled
- optional-not-run PhaseはDisposition Record + cancelled
- retired / replaced PhaseはExecution Ledgerでcancelledまたはsuperseded
- planned / ready / in-progress / blocked / failedを残さない
- suspended / pendingの場合はR4完了としない
- failed Phaseには後継PhaseまたはIssue未完了判定がある
- cancelled / superseded Phaseの差分や成果物が最終統合へ混入していない
- No-change closureでは旧required PhaseをActive Phase Setから除外し、差分不存在またはrollbackを確認する
```

実装後順序の正本は `06_completion_commit.md` です。ここでは要約だけを示します。

```text
実装
→ 修正前失敗条件の最小再検証
→ git diff精査
→ 実装後R段階再判定
→ R2-liteの場合はRun CardまたはR2-lite Resultへ実装後記録を反映し、Verification更新と対応させる
→ Verification更新
→ 回帰確認
→ 必要なら広範囲テスト
```

### 2.2 封じ込めトリガーがある場合

`01_entry_and_risk.md` のContainment Triggerに該当する場合は、次を通常フローに先行させます。

```text
1. 証拠が消えない最小範囲で、redaction前提の時刻、場所、再現条件、該当commit / CI runを記録する
2. 秘密情報や個人ノート本文を公開成果物へ貼らず、必要ならprivate / restricted Evidenceへ分離する
3. tokenやcookie等の失効・ローテーションが必要な場合は、人間の承認で即時実施する
4. 封じ込めにより再現性が失われる場合は、封じ込め前後の差分をEvidence IDで分ける
5. A1 / A2の要否を決め、A2ならrepository-redacted evidence index、private / restricted evidence index、A2 Evidence Integrity Attestationを作成する。R4-Aの場合だけClosure Manifest / Closure Attestationを追加する
```

封じ込めはテストskip、失敗の握りつぶし、危険な変更の隠蔽として使いません。封じ込め後も、原因、影響範囲、Verification、再発防止は通常のR段階に従って整理します。

## 3. 初動トリアージ

この段階では原因を断定しません。

```text
重大度:
- blocker
- major
- minor

影響範囲:
- 単一ファイル
- 複数ファイル
- 設計横断
- 環境依存
- CI依存
- 生成処理依存
- テスト依存
- 仕様依存

再現性:
- 常時再現
- 条件付き再現
- 未再現
- CIのみ
- localのみ
- OS依存
- browser / viewport依存
- timeout / flaky / 間欠障害

失敗種別:
- build
- typecheck
- lint
- unit test
- browser test
- visual / paint contract
- accessibility
- runtime
- state / persistence
- data generation / script
- lockfile / dependency
- generated file
- routing / navigation
- content / note data
- search / index
- performance
- security / sanitization
- documentation
```


再現性がtimeout、flaky、CIのみ、browser / viewport依存などの間欠障害である場合は、`03_templates.md` のIntermittent Failure Evidenceを使います。単発ログだけで原因断定せず、再現回数、試行回数、環境、timeout値、retry有無、trace / screenshot有無を記録します。

## 4. 封じ込め判断

blockerまたはmajorの場合は、原因調査の前に封じ込め要否を判断します。

```text
封じ込め判断:
- main / CI / build / releaseを止めているか
- 直近変更のrevertで安全に戻せるか
- 問題箇所を一時的に切り離せるか
- 生成処理や公開物の破損拡大を止める必要があるか
- 恒久修正と分けるべきか
- 封じ込め後に恒久修正へ戻る導線があるか
```

許可される封じ込めです。

```text
- 安全なrevert
- feature isolation
- 問題のある生成物やスクリプトの一時停止
- 壊れたリリース経路の停止
- CI上の破損拡大を防ぐ最小措置
```

禁止される封じ込めです。

```text
- 原因不明のままテストをskipする
- 失敗を握りつぶす
- 暫定try/catchでエラーを隠す
- 仕様不明のまま期待値を変える
- 根拠なく旧挙動へ戻す
```

封じ込めを行った場合も、恒久修正のBriefまたはFix Planへ必ず戻ります。

封じ込め実施時は、次を記録します。

```text
Containment Record:
- 実施内容:
- 実施理由:
- 変更対象:
- 恒久修正に含めるか:
- 恒久修正へ戻る導線:
- 封じ込め後の確認方法:
- 封じ込めにより失われたEvidence:
- Evidenceへの引き継ぎ先:
```

### 4.1 封じ込め前の最小証拠保存

blocker / majorで封じ込めを行う場合、可能な限り次を保存してから実施します。

```text
Pre-containment Evidence:
- 対象branch:
- HEAD commit:
- git status:
- cwd:
- 失敗コマンドまたは失敗操作:
- 実行経路:
  - pnpm / corepack pnpm / npm script / node / CI job / browser manual:
- exit code:
- stdout / stderrの最小抜粋:
- CI run URLまたはログ位置:
- local / CI:
- OS:
- terminal / shell:
- Node:
- pnpm:
- browser:
- locale:
- timezone:
- environment variable delta:
- revertまたは一時停止の対象:
```

緊急性が高く、証拠保存より先に封じ込める場合は、保存できなかった項目と理由を記録します。封じ込め後は、Containment Recordとともに恒久修正のEvidenceへ引き継ぎます。

## 5. Evidence作成

R0ではEvidence作成を省略できます。

R1ではMini Evidenceで足ります。R1で使うMini Evidenceの正式テンプレートは `03_templates.md` を正本とします。

R2-liteでは、Minimum Evidence Packet相当をR2-lite Run CardまたはR2-lite BriefのEvidence欄に内包するか、単一Evidenceを見やすさのために別成果物化してEvidence IDで参照します。別成果物化した場合は、Run Card / BriefのEvidence欄に保存場所 / ファイル名とEvidence IDとの対応を記録します。保存場所 / ファイル名はredaction済みで後から参照可能な成果物を指し、失効し得るCI artifactだけを保存場所にしません。Evidenceが複数種類または複数箇所に分散し、Run Card / BriefのEvidence欄と単一の別成果物Evidenceだけでは根拠を十分に追跡できない場合、または原因候補が3個以上残る場合は、R2-liteとして完了不可とし、Minimum Evidence Packetを分離してR2-full以上へ昇格します。R2-full以上ではMinimum Evidence Packetを作成します。R3以上ではMinimum Evidence Packetに加えてEvidence Recordを必須で作成します。Evidence Recordは複数Entryを持つ形式とし、各EntryへEntry ID、Evidence ID、対応対象ID、attempt、timestamp、environment、result、ログまたは関連diff、証拠確度、確度根拠、機密情報・redactionを記録します。CI artifactや外部ログが失効する可能性がある場合は、redaction済みの最小抜粋をEvidenceに保存します。

Mini EvidenceとMinimum Evidence Packetの正式テンプレートは `03_templates.md` を正本とします。ここでは、次だけを要求します。

```text
Evidence作成の必須事項:
- R1ではMini Evidenceを作成する
- R2-full以上ではMinimum Evidence Packetを作成する
- R3以上ではMinimum Evidence Packetに加えてEvidence Recordを必須で作成する
- Evidence IDを記録する
- 対応Issue IDと対応Failure IDを記録する
- Minimum Evidence PacketではPacket ID、内包Evidence ID一覧、証拠確度、確度根拠を記録する
- Evidence Recordは複数Entryを持つ形式とし、各EntryへEntry ID、Evidence ID、対応対象ID、attempt、timestamp、environment、result、ログまたは関連diff、証拠確度、確度根拠、機密情報・redactionを記録する
- 失敗条件、期待結果、実際の結果、環境、参照状態を記録する
- redaction確認を記録する
- CI artifactや外部ログが失効する可能性がある場合は、redaction済み最小抜粋を保存する
```

### 5.1 機密情報・個人ノート保護

Rouaultでは、Evidence、ログ、スクリーンショット、生成物、検索index、CIログに個人ノート本文や非公開情報が含まれる可能性があります。外部AI、GitHub issue、commit message、CIログへ貼る前に、必要最小限へ縮約し、不要な情報をredactします。

```text
機密情報確認:
- 個人ノート本文、ファイル名、ローカルパス、URL、個人識別情報が含まれていないか
- API key、token、cookie、secret名、private repository URL、ブラウザプロファイル情報が含まれていないか
- 失敗再現に必要な最小抜粋だけか
- 合成データまたは匿名化データで再現できないか
- screenshotに非公開本文や個人情報が写っていないか
- 検索indexや生成物に本文が混入していないか
- ChatGPT / Codexへ渡す入力がredact済みか
- unredacted dataを保存する場合は、公開成果物、commit、PR、外部AI入力から除外されているか
```

問題再現に本文が不可欠な場合でも、引用範囲を最小化し、公開成果物へ混入させません。

## 6. GitHub現行実装とlocal / CI実態の確認

### 6.0 情報境界

問題解決に使う情報源を明示し、未許可の過去会話やChatGPT内の記憶を根拠にしません。

```text
使用してよい情報源:
- 現在の依頼文
- 添付ファイル
- GitHub現行実装
- local working tree
- CIログ
- 実行ログ
- 明示された設計文書、README、仕様文書

使用してはいけない情報源:
- ユーザーが許可していない過去会話
- ChatGPT内の記憶
- 未提示のローカル事情の推定
- 根拠を確認していない外部情報
```

設計上の一次情報と実行上の一次情報を分けます。

```text
設計上の一次情報:
- GitHubリポジトリの現在の対象ブランチ
- 対象commit
- 公式に管理されている設計文書
- README
- 設定ファイル
- 既存テスト

実行上の一次情報:
- 実際に失敗しているlocal working tree
- CIログ
- 実行ログ
- スクリーンショット
- OS / shell / Node / pnpm / browserの実環境
```

参照優先順位です。

```text
1. GitHubリポジトリの現在の対象ブランチ
2. local working treeまたはCIログ
3. GitHubが参照できない場合のみ、添付zipまたはローカルソース
4. どちらも参照できない場合は「参照できませんでした」と明示する
```

GitHub、local、CIが食い違う場合は、差分そのものを原因候補として扱います。

### 6.1 Branch hygiene

実装開始前に、作業ブランチとworking treeを確認します。

```text
Branch hygiene:
- 修正用ブランチで作業しているか
- 既存の未コミット差分が今回修正と混ざっていないか
- 既存差分がある場合、その扱いを明示したか
- 一時ファイル、build成果物、生成物が混入していないか
- 改行コード、パス区切り、整形だけの差分が混入していないか
- lockfileやgenerated filesの差分が今回の修正対象として説明できるか
```

既存差分が今回修正と混ざる場合は、実装前に次を決めます。

```text
- 既存差分を退避する
- 今回修正に含める
- 今回修正の範囲外として扱う
- 判断不能な場合は実装を開始せず、差分の扱いを先に確定する
```

## 7. 原因調査

R1では、採用原因を1つだけ明示できれば足ります。

R2-liteでは、R2-lite Run CardまたはR2-lite Brief内のC欄にCause Summary相当を記録します。Cause Summary相当をRun Card / Brief内で十分に説明できない場合、または別成果物としてCause Summaryを分離する必要がある場合は、R2-full以上へ昇格します。R2-liteで複数仮説を残せるのは、採用原因を1つに固定できており、残る仮説が採用原因を補強する補助仮説、または今回の修正対象・成功条件・契約影響を変えない保留仮説である場合だけです。

Cause Summaryの正式テンプレートは `03_templates.md` を正本とします。ここでは、採用・棄却・保留をFailure IDとEvidence IDに対応させ、証拠確度、検証方法、修正対象、判定理由を記録することだけを要求します。

R2-fullでは、Cause SummaryまたはCause Matrixを作成します。原因候補が複数残る、説明できない症状がある、影響範囲が広い場合はCause Matrixを使います。R3以上ではCause Matrixを必須にします。


### 7.1 調査予算

調査は無制限に続けません。R段階ごとに、次を目安にします。

```text
R1:
- 原因確認は1仮説まで
- 1仮説で説明できない場合はR2-lite以上へ昇格する

R2-lite:
- 主要仮説は最大2個まで
- 採用原因は1つに固定する
- 残る仮説は、採用原因を補強する補助仮説、または今回の修正対象・成功条件・契約影響を変えない保留仮説に限る
- 修正対象、成功条件、契約影響、テスト更新方針が変わり得る競合仮説が残る場合はR2-full以上へ昇格する
- 原因候補が3個以上残る場合はR2-full以上へ昇格する

R2-full:
- Cause SummaryまたはCause Matrixを作る
- 採用原因に関係しない仮説は残課題または範囲外に分離する
- 契約変更、仕様判断、安全性影響が見えた場合はR3へ昇格する

R3以上:
- Cause Matrixを使う
- 反対仮説レビューを行う
- 修正方針に影響しない仮説は明示的に残課題化する
```

採用する原因は、次を満たす必要があります。

```text
- 症状を説明できる
- 修正前失敗条件と対応している
- 関連ファイル、ログ、テスト、設定上の根拠がある
- 代替仮説より説明力が高い
- 検証方法がある
- 修正後成功条件と対応している
- 修正対象ファイルを導ける
```

## 8. 調査打ち切り条件

Fix Planへ進んでよい条件です。

```text
1. 採用原因で主要Failureを説明できる
2. 修正対象ファイルを列挙できる
3. 修正後成功条件を検証できる
4. 残る仮説を範囲外、保留、または残課題に分離できる
```

調査を打ち切ってはいけない条件です。

```text
- 採用原因で説明できないFailure IDが残っている
- 原因候補が複数あり、修正対象が変わり得る
- 契約変更の可能性が未評価である
- テスト期待値変更の根拠が未確定である
- localとCIの差分が原因候補として残っている
- security / sanitizationへの影響が未評価である
```

## 8.1 No-change Completion

調査の結果、Issue全体を修正なしで閉じることが妥当な場合だけNo-change Completionを使います。R4内では終端Phaseであり、後続Phaseを持ちません。未実行の後続PhaseはPlan上でretired / replacedとし、R4 Execution Ledgerでcancelled / supersededへ遷移させます。

```text
No-change Completionを使える例:
- 現行GitHub実装では既に修正済みで、Issue全体として追加変更が不要
- local working tree固有の問題で、Rouault本体のIssueとして閉じられる
- ユーザーの前提誤認であり、現行仕様・現行実装と矛盾せず、追加作業が不要
- 外部責任範囲としてIssueを閉じる根拠とownerが確定している
```

No-change Completionでは、修正しない理由、Issue Evidence、確認済み範囲、未確認範囲、判断リスク成果物、終端根拠、先行差分の不存在またはrollback、後続Phaseがないことを記録します。R4の実行状態とEvidenceはR4 Execution Ledgerへ記録します。`awaiting reproduction`や未確定の外部依存はNo-changeにせずInvestigation-onlyで扱います。

仕様判断、契約解釈、security / sanitization、accessibility意味判断を伴う場合は、Phase種別がNo-changeでもR3とし、Decision Record等のR3成果物を作成します。

## 8.2 No-action Record（R4専用）

Issueを閉じず、特定のPhaseまたは対象範囲だけ変更不要・適用対象外と判断する場合はNo-action Record（R4専用）を使います。No-actionは終端判断ではなく、後続Phaseを許可します。

```text
No-action Record（R4専用）の必須事項:
- 対象Phase / 対象範囲
- 変更しない理由
- Issue / Failure Evidence
- 後続Phaseへの影響
- 後続Phase ID一覧、直接後続がない場合の理由、依存関係
- Issueを閉じない確認
```

## 8.3 Investigation-only Record

調査結果を後続Phaseへ引き渡す、外部依存の解消を待つ、または追加再現情報を待つ場合はInvestigation-only Recordを使います。

```text
Disposition別必須事項:
- evidence handoff to next phase:
  - handoff先Phase ID
  - handoff条件
- external dependency:
  - handoff先Phase ID: N/A可
  - 外部依存先 / owner
  - 再開条件
  - 次回確認条件
- awaiting reproduction:
  - handoff先Phase ID: N/A可
  - 必要な追加Evidence
  - 再開トリガー
  - review期限、または期限なし理由
```

## 9. 実装開始ゲート

この実装開始ゲートは、R1以上のImplementation Phaseに適用します。No-change、No-action、Investigation-only、Verification-only、Integration verificationには実装開始ゲートを適用せず、各専用Recordの活動開始条件を使います。


非Implementation Phaseの活動開始条件です。

```text
- Common Artifact Headerと対象Plan Revisionが確定している
- 判断リスク成果物がPhase R段階に応じて揃っている
- Phase種別固有の目的、許可活動、禁止活動、成功またはDisposition条件が決まっている
- Investigation-onlyはInvestigation Plan、Verification-only / Integration verificationはVerification Planを持つ
- No-changeは先行差分の不存在またはrollback方針を確認している
- Codexへ実装修正を依頼しない
```

R0では、`01_entry_and_risk.md` のR0条件を満たし、R0 Recordで次を確認できれば実装に進んでよいです。

```text
- 変更理由
- 変更範囲
- 挙動、契約、テスト、生成物、lockfileへの影響がないこと
- git diff確認方法
```

R1以上では、以下を満たすまで実装に進みません。R2-liteでCodexを使う場合も、Run CardまたはBriefが下記のうち修正対象、変更許可範囲、禁止範囲、Do Not Change、F/C/CH/S/V、Verification初期案、Evidence配置、別成果物Evidenceを使う場合の保存場所 / ファイル名、Evidence IDとの対応、Branch hygiene、機密情報・redaction確認、ChatGPT / Codexへ渡す情報の範囲を満たしている必要があります。不足する場合は、R2-liteであっても別途Fix Planを作成します。

R段階ごとの軽量化規則です。

```text
- R1では、契約影響チェックはMini Brief内の「契約影響なし」確認で足りる
- R2-liteでは、契約影響チェックはR2-lite Run CardまたはR2-lite Brief内の契約影響チェック欄で足りる
- R2-full以上では、Fix Plan内の契約影響チェックを必須とする
- R2-full以上で契約影響あり、または不明の場合は詳細Contract Inventoryを必須とする
```

```text
- 重大度が決まっている
- リスク段階が決まっている
- 必要な成果物が作成されている
- 修正前失敗条件が固定されている
- 成功条件が検証可能である
- 採用原因仮説が明示されている
- GitHub branch / commitが明示されている
- local working treeまたはCIログとの差分が確認されている
- Branch hygieneを確認済みである
- 作業ブランチと既存差分の扱いが明確である
- 修正対象ファイルが列挙されている
- 変更してはいけないファイルが列挙されている
- 契約影響チェックが完了している
- R2-full以上で契約影響あり、または不明の場合はContract Inventoryがある
- テスト更新、snapshot更新、lockfile変更の可否が決まっている
- 範囲外失敗の扱いが決まっている
- 範囲外失敗がある場合はOut-of-scope Failure Recordで管理されている
- Verification初期案がある
- Evidence、ログ、スクリーンショット、外部AI投入情報のredaction要否が確認されている
- 実装直後の最小再検証方法が決まっている
- R3ではContract Inventoryが作成済みであり、N/Aにしていない
- R3ではContract Inventoryの各Contract IDが、Decision Record、Fix Plan、Verification初期案と対応している
- R3以上ではDecision Record、反対仮説レビュー、ロールバック方針がある
- R4では全体Contract Inventoryが作成済み、または根拠付きN/Aである
  - 全フェーズでDOM / CSS / ARIA / state / generated files / lockfile / routing / search / security / テスト期待値 / snapshot / visual・paint contractに一切触れないことを証明できる場合のみ、根拠付きN/A可
- R4では全体Decision Recordが作成済みである
- R4では全体Fix Planが作成済みである
- R4では全体Fix Plan精査が完了している
- R4ではR4 Phase Plan、R4 Execution Ledger、選択Profileに応じたManifest系成果物が作成済みである
  - R4-S: 軽量Resolution Manifestが作成済みであり、ArtifactKeyを一意にArtifactRefへ解決できる。Manifest AnchorはN/A可
  - R4-I: Artifact Manifest、Manifest Anchor、SHA-256検証、Manifest chain検証が作成済みである
  - R4-A: R4-I成果物に加え、private / restricted Manifest、Closure Manifest、Closure Attestation、必要な外部署名またはCI attestationが作成済みである
- R4 Phase PlanにIssue ID、R4 Phase Plan ID、Plan Revision、Previous Plan Revision、ID名前空間、Phase necessity、Activation condition、フェーズ境界、Phase R段階、Phase種別、判断リスク成果物、活動固有成果物、計画Verification、ロールバック条件が明記されている
- R4 Execution LedgerにPhase Necessity Evaluation Log、Phase Execution Event Log、Current Status導出ビュー、Final State ArtifactRef、ArtifactRef一覧、Verification不要理由、Evidence対応、Artifact Validation Attestationが明記されている
- R4 Phase Planで関連Contract IDまたは関連Phase Decision IDをN/Aにする場合は、Contract N/A理由またはPhase Decision N/A理由が記録されている。関連全体Decision IDはN/Aにしていない
```


## 9.1 実装後の重要な順序

実装後順序の正本は `06_completion_commit.md` です。ここでは、Verificationや広範囲テストへ進む前に修正前失敗条件と実diffを確認する原則だけを示します。

```text
実装
→ 修正前失敗条件の最小再検証
→ git diff精査
→ 実装後R段階再判定
→ R2-liteの場合はRun CardまたはR2-lite Resultへ実装後記録を反映し、Verification更新と対応させる
→ Verification更新
→ 回帰確認
→ 必要なら広範囲テスト
```

## 10. 実装直後の最小再検証

通常の実装修正では、広範囲テストより先に、修正前失敗条件を最小再検証します。R4特殊Phaseは次の専用規則に従います。

```text
R0 Record Phase:
- 最小再検証はN/A
- 挙動影響なし確認とgit diff確認を必須とする

No-change Phase:
- 最小再検証はPhase R段階と終端判断に応じて要否を決める
- Issue全体を閉じられる再現確認または現行状態確認を記録する

No-action Phase:
- 対象範囲で変更不要とするEvidence確認を行う
- Issueを閉じず、次Phaseへの影響を記録する

Investigation-only Phase:
- 最小再検証という名称は使わず、調査目的に対応するEvidence取得を必須とする
- Dispositionに応じてhandoff、外部依存、または再現待ちの再開条件を記録する

Verification-only / Integration verification Phase:
- Phase開始時のbase commit、worktree state、既存未コミット差分を記録し、このPhase起因の差分だけを判定する
- 修正前失敗条件の最小再検証ではなく、Phase Success IDの成功条件に対するVerificationを必須とする
- Verification Evidenceはappend-onlyで追加し、最終判定に採用したEvidence IDを明示する
- 新しいFailureを検出した場合は当該Phaseで実装修正を開始せず、Detected Failure Observation IDを記録してPhase Statusをfailedまたはblockedにする
- R4 Phase Planを新しいPlan Revisionへ更新し、移管先Implementation Phaseで別IDのFailure IDを発行してObservationと対応付ける
```

Implementation Phaseの判定は次です。

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


## 11. Artifact Revision、Manifest chain、R4台帳の不変性

```text
- Artifact RevisionとManifest RevisionはRevision別ファイルで保存する
- ArtifactKeyは選択したManifest RevisionでArtifactRefへ解決する
- Artifact Manifest Entryはadd / correct / revokeをappend-onlyで記録する
- local-private / ci-private / external-restrictedの実locatorや非公開digestをrepository-redacted Manifestへ記録しない
- R4-I / R4-AではClosure判断またはFinal Verification判断に使うManifest RevisionをManifest Anchorで固定する
- R4 Phase Planは計画構造、R4 Execution Ledgerは実行状態とEvidence、Final R4 Disposition Verificationは最終判定を正本とする。Closure ManifestはR4-Aの閉鎖候補関係だけを正本とする
- Plan Revision更新時は影響Artifactを判定し、validate / revise / supersede / invalidateのいずれかを記録する
- 非R4 Investigation-onlyのhandoffはworkflow step / Artifact / external ownerを対象にできる
```

## 12. pre-final Ledger凍結・Profile別完了順序

R4の完了順序はR4 Profileで分岐します。Closure Manifest / Closure AttestationはR4-Aだけで作成します。

R4-S:
1. Plan Revisionを凍結します。
2. Lightweight Resolution Manifestを確定し、ArtifactKeyを一意にArtifactRefへ解決できることを確認します。Manifest AnchorはN/A可です。
3. Phase Event、Necessity Evaluation、Phase成果物のArtifact Validation Attestationを完了します。
4. Current Status、Final State ArtifactRef、Active Phase Setを再計算します。
5. pre-final R4 Execution Ledgerを不変保存します。
6. Final R4 Disposition Verificationを作成します。
7. R4 Completion RecordでFinal Verification、pre-final Ledger、Lightweight Resolution Manifest、再計算結果を人間承認します。

R4-I:
1. Plan Revisionを凍結します。
2. Artifact Manifestを確定し、ArtifactKeyを一意にArtifactRefへ解決できることを確認します。R4-IではLightweight Resolution Manifestを使わず、Artifact ManifestがArtifactKey解決の正本になります。
3. Phase Event、Necessity Evaluation、Phase成果物のArtifact Validation Attestationを完了します。
4. Current Status、Final State ArtifactRef、Active Phase Setを再計算します。
5. pre-final R4 Execution LedgerをArtifact Manifestへ登録します。
6. pre-final Ledger登録後のManifest Revisionを不変保存し、Verification Input Manifest Anchor集合を作成します。
7. Final R4 Disposition Verificationを作成します。
8. Final VerificationをArtifact Manifestへ登録し、Manifest Revisionを不変保存してManifest Anchorで固定します。
9. R4 Completion RecordでManifest chain、ArtifactKey解決、SHA-256一致、pre-final Ledger、Final Verificationを人間承認します。

R4-A:
1. Plan Revisionを凍結します。
2. Artifact Manifestを確定し、ArtifactKeyを一意にArtifactRefへ解決できることを確認します。R4-AではLightweight Resolution Manifestを使わず、Artifact ManifestがArtifactKey解決の正本になります。
3. Phase Event、Necessity Evaluation、Phase成果物のArtifact Validation Attestationを完了します。
4. Current Status、Final State ArtifactRef、Active Phase Setを再計算します。
5. pre-final R4 Execution LedgerをArtifact Manifestへ登録します。
6. pre-final Ledger登録後のManifest Revisionを不変保存し、Verification Input Manifest Anchor集合を作成します。
7. Final R4 Disposition Verificationを作成します。
8. Final VerificationをArtifact Manifestへ登録し、Manifest Revisionを不変保存してManifest Anchorで固定します。
9. Closure Input Manifest Anchor集合を作成します。
10. Closure Manifestを作成し、Closure Input Manifest Anchor一覧、Plan、pre-final Ledger、Final Verificationを参照します。
11. Closure Manifestを次のManifest Revisionへ登録します。
12. Closure Manifest登録後の最終Manifest Revisionを不変保存し、最終Manifest Anchor集合を作成します。
13. Closure Attestationで最終Manifest Anchor集合、Closure Manifest、Final Verification、pre-final Ledger、Active Phase Setを検証し、closed / not-closedを導出します。

前段Artifactへ後段ID、登録先Manifest Revision、最終Manifest Anchor ID一覧を書き戻しません。