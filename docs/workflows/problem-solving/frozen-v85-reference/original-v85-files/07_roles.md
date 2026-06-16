# 07. 役割分担

このファイルは、人間、ChatGPT、Codexの役割分担とCodex利用境界の正本です。

## 1. 基本方針

Rouaultの問題解決では、ChatGPTとCodexを使ってよいですが、最終判断は人間が行います。

```text
- ChatGPT: 問題整理、原因仮説、Fix Plan、精査、置換案、diffレビュー
- Codex: Fix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / Briefに限定された実装作業
- 人間: 設計判断、実行環境での確認、機密情報の共有可否判断、状態変更承認、Closure承認、最終判断、コミット
```

Codexの自己確認は参考情報であり、証拠ではありません。必ずgit diff、検証ログ、Verification、必要に応じて手動確認記録で裏付けます。機密情報の共有可否は人間が判断し、ChatGPTやCodexに渡す情報は必要最小限にします。

## 2. 役割表

| 工程                                  | 主担当          | 補助          | 注意                                                                             |
| ------------------------------------- | --------------- | ------------- | -------------------------------------------------------------------------------- |
| 問題の言語化                          | 人間            | ChatGPT       | 症状と原因を混同しない                                                           |
| 入口判定                              | ChatGPT         | 人間          | R0〜R4を過小評価しない                                                           |
| 初動トリアージ                        | ChatGPT         | 人間          | この段階では原因断定しない                                                       |
| 封じ込め要否判断                      | 人間            | ChatGPT       | テストskipや握りつぶしは禁止                                                     |
| Evidence作成                          | 人間            | ChatGPT       | 実行ログ、CIログ、git diffを優先。間欠障害では試行回数、timeout値、trace等を残す |
| 機密情報・redaction確認               | 人間            | ChatGPT       | 個人ノート本文、ローカルパス、URL、秘密情報の共有可否を判断する                  |
| Branch hygiene確認                    | 人間            | ChatGPT       | 既存差分と今回修正を混ぜない                                                     |
| 重大度判定                            | ChatGPT         | 人間          | blockerでもR1になり得る                                                          |
| リスク段階判定                        | ChatGPT         | 人間          | minorでもR3になり得る                                                            |
| Cause Summary / Cause Matrix          | ChatGPT         | 人間          | 採用、棄却、保留を分ける                                                         |
| 契約影響チェック / Contract Inventory | ChatGPT         | 人間          | R2-fullでは契約影響チェック必須。契約変更なら原則R3                              |
| 削除・移行・縮退分類                  | ChatGPT         | 人間          | コード、テスト、生成物、契約の削除はR2-full以上で根拠を残す                      |
| 設計判断                              | 人間 + ChatGPT  | -             | Codexに設計判断をさせない                                                        |
| Fix Plan作成                          | ChatGPT         | 人間          | 変更境界と禁止事項を明記する                                                     |
| Fix Plan精査                          | ChatGPT         | 人間          | 反対仮説レビューを必要に応じて行う                                               |
| 小規模実装                            | 人間            | ChatGPT置換案 | R0/R1中心                                                                        |
| 中〜大規模実装                        | 人間またはCodex | ChatGPT       | Codexは限定実装のみ                                                              |
| 最小再検証                            | 人間            | ChatGPT       | 修正前失敗条件を先に確認する                                                     |
| git diff精査                          | ChatGPT         | 人間          | 未実装確認も含める                                                               |
| Verification作成                      | ChatGPT         | 人間          | F/C/CH/S/Vを対応させる                                                           |
| テスト結果の解釈                      | ChatGPT         | 人間          | 範囲外扱いには根拠が必要                                                         |
| 手動確認                              | 人間            | ChatGPT       | UI、visual、accessibilityで必要に応じて記録                                      |
| コミット前最終確認                    | 人間 + ChatGPT  | -             | 一時ファイル、生成物、lockfile差分を確認                                         |
| 最終判断                              | 人間            | ChatGPT       | 未検証項目を完了扱いしない                                                       |
| コミットメッセージ作成                | ChatGPT         | 人間          | 責務が複数なら分割を検討                                                         |

## 2.1 承認権限の境界

ChatGPTとCodexは、候補の生成、整合性確認、欠落検出、Schema検証案の作成、diffレビューを補助できます。ただし、次は人間だけが承認します。

```text
人間だけが承認するもの:
- R段階またはAレベルの最終確定
- 原因確定
- 仕様判断、契約変更、契約削除
- secret失効、証拠削除、redaction不可逆処理
- Phase Status遷移Eventの確定
- cancellation / superseded / retirement
- Final R4 Disposition Verificationの採用
- Closure Manifestの採用
- Closure Attestationによるclosed確定
- 例外受容、未検証項目の範囲外化
```

ChatGPTが出力してよいものは、承認案、検証案、欠落指摘、修正案です。ChatGPTの記述だけをExecution Ledger、Closure Attestation、最終判定の承認者として扱いません。

## 3. Codex利用時の境界

Codexに任せてよいことです。

```text
- Fix Planで列挙された範囲の実装
- R2-liteの場合は、修正対象、変更許可範囲、禁止範囲、Do Not Change、F/C/CH/S/V、Verification初期案、Evidence配置、別成果物Evidenceを使う場合のredaction済みで後から参照可能な保存場所 / ファイル名とEvidence IDとの対応、Branch hygiene、機密情報・redaction確認、ChatGPT / Codexへ渡す情報の範囲が明記されたRun Card / Briefに限定された実装
- 既存テストの実行
- Fix Planに明記されたテスト追加または更新
- Fix Planに明記されたSupport IDに対応する補助変更
- Fix Planに明記され、削除・移行・縮退分類で許可された削除または移行
- 実行したコマンド、cwd、実行経路、exit code、stdout / stderr抜粋の記録
- Fix Planで許可された匿名化fixtureまたは合成データの追加
```

Codexに任せないことです。

```text
- 仕様判断
- 契約変更の是非判断
- テスト期待値の自己判断による弱体化
- snapshot更新の自己判断
- generated files / lockfile / package manager policyの自己判断変更
- security / sanitization方針の自己判断変更
- Support IDに対応しない補助変更
- Support IDに対応しない便乗リファクタリング
- Fix Plan、またはFix Plan相当条件を満たすR2-lite Run Card / Briefに明記されていない削除、移行、縮退、旧経路削除、テスト削除
- 個人ノート本文や非公開情報の不要な引用、ログ出力、fixture化
- redaction判断
```

R4では、Codexに一括実装させません。必ずフェーズ単位で実装、精査、検証します。

## R4特殊Phaseの実装境界

```text
- Codexへ実装を依頼できるのはImplementation Phaseだけ
- Investigation-onlyではEvidence取得補助だけを許可します。仕様判断やDisposition決定は人間だけが承認します。ChatGPTはDisposition案、根拠整理、欠落指摘、再開条件案の作成に限定します
- Verification-only / Integration verificationでは検証実行補助だけを許可し、新Failure検出時に同じPhaseで修正させない
- No-changeの終端判断 / R4 No-actionの対象外判断をCodexへ委任しない
```

## Artifactと状態の責務

- 人間またはChatGPTは、ArtifactKeyを選択したManifest RevisionでArtifactRefへ解決します。R4-IではFinal Verification判断に使うManifest Revisionを、R4-AではClosure判断に使うManifest RevisionをManifest Anchorで固定します。
- Statusの正本はR4 Execution LedgerのEvent Logであり、CodexはStatusを直接書き換えません。Manifest Entryのcorrect / revoke、Manifest Anchor、Final Verification、Closure ManifestもCodexへ委任しません。
- Codexの実装結果はImplementation Phase Outcome Recordの入力となりますが、outcome / retirement Eventの承認は人間だけが行います。ChatGPTは承認案、整合性確認、欠落指摘、Schema検証案の作成に限定します。
