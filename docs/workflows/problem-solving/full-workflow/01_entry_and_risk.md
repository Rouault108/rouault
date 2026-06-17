# 01. 入口判定とリスク段階

このファイルは、R0〜R4の入口判定、R別成果物、削除・移行・縮退のR判定の正本です。

## 1. 入口判定

問題を受け取ったら、最初にリスク段階を暫定判定します。入口判定は実装開始の許可ではなく、必要な調査粒度と成果物を決めるための初期分類です。

入口判定は、上から順に最初に一致した段階を採用するものではありません。まずR4 / R3への昇格条件を確認し、その後にR2-full、R2-lite、R1、R0へ下げます。複数条件に該当する場合は、原則として高いR段階を採用します。

Evidence作成後、重大度、再現性、原因候補、契約影響、local / CI差分を踏まえてR段階を確定します。入口時点のR段階より低くしてよいのは、Evidenceで高リスク条件が否定できた場合だけです。入口時点の不明点をN/Aで処理してR段階を下げてはいけません。

```text
暫定入口判定:

0. 一括実装するとレビュー不能か
   → R4

1. 仕様判断、契約変更、security、accessibility意味変更があるか
   → R3

2. 原因未確定で、修正対象が複数候補に分かれ、契約変更・仕様判断・安全性影響を伴い得るか
   → R3

3. 原因調査、影響範囲確認、契約確認が必要か
   → R2-full

4. R1では軽すぎるが、原因と変更境界が明確で、契約変更、削除・移行・縮退判断、generated files / lockfile実差分を伴わないか
   → R2-lite

5. 原因が明確で、少数ファイルに閉じ、契約・テスト期待値・生成物・lockfileに触れず、local / CI差分やOS / shell差分もないか
   → R1

6. 挙動に影響しない文書・誤字・コメント修正か
   → R0
```

迷った場合は、次の規則を使います。

```text
- 高リスク条件を先に確認する
- 軽く始めてよいが、根拠なく軽く扱わない
- 契約変更の可能性があるならR2-full以上
- 仕様判断、安全性、アクセシビリティ意味変更があるならR3
- 単に原因調査が必要なだけならR2-full
- 原因未確定で、修正対象が複数候補に分岐し、契約変更・仕様判断・安全性影響を伴い得るならR3
- レビュー不能ならR4
- 削除、移行、縮退を含む場合は、8.4の削除・移行・縮退分類でR段階を再判定する
- Evidence後にリスク段階を確定または昇格する
```

## 1.1 情報境界

問題解決の根拠にしてよい情報源を、入口判定時に明示します。過去の会話、ChatGPT内の記憶、未提示の推定情報は、ユーザーが明示的に許可しない限り根拠にしません。

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

補完推定を使う場合:
- 推定であることを明示する
- 後続Evidenceで検証する
- 推定だけを原因、契約、完了条件の根拠にしない
```

## 2. 重大度、リスク段階、監査保証レベル

重大度、リスク段階、監査保証レベルは別の概念です。

```text
重大度:
- どれだけ急いで対応すべきか
- ユーザー影響、開発停止、CI停止、主要画面破綻の度合い

リスク段階:
- どれだけ慎重な手順が必要か
- 原因不明度、契約影響、変更範囲、検証困難性、レビュー不能性の度合い

監査保証レベル:
- どれだけ強い証拠保全・完全性保証が必要か
- 機密情報、資格情報、外部提出、長期監査、証拠改ざん耐性の度合い
```

### 2.1 重大度

```text
blocker:
- build / typecheck / 起動 / 主要画面 / CIが壊れ、作業または利用を止める

major:
- 主要機能、主要UI、主要テスト、主要導線が壊れる

minor:
- 局所的な表示崩れ、文言、コメント、軽微な補完
```

### 2.2 監査保証レベル A0〜A2

R0〜R4は変更・レビュー・検証のリスク段階です。A0〜A2は証拠保全・監査保証レベルです。両者は独立に判定します。R4だから常にA2ではなく、R1でも資格情報漏えいが疑われる場合はA2にします。

| レベル | 使う条件                                                       | 必須事項                                                                                                                                                                                                                                            |
| ------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A0     | 通常の修正、公開可能なEvidenceだけで十分                       | Git履歴、Verification、必要最小限のEvidence                                                                                                                                                                                                         |
| A1     | CI artifact、生成物、複数成果物、後日検証が必要                | SHA-256、保存場所、実行ログ、検証コマンド、可能なら署名付きtagまたはCI attestation                                                                                                                                                                  |
| A2     | 秘密情報、個人ノート漏えい、供給網、外部提出、改ざん耐性が必要 | A2 Evidence Integrity Attestation、repository-redacted evidence index、private / restricted evidence index、保持・失効・redaction方針、必要に応じた秘密情報失効・ローテーション記録。R4-Aの場合だけClosure Manifest / Closure Attestationを追加する |

A2を使う場合、公開成果物へprivate locator、未redactファイル名、個人データ由来digest、秘密情報を記録しません。公開可能なopaque referenceだけを記録し、実locatorとdigestはprivate / restricted側で管理します。A2はR段階から独立して成立し、非R4ではClosure AttestationではなくA2 Evidence Integrity Attestationを閉鎖根拠にします。

A2共通の必須事項です。

```text
A2 Common Evidence Requirements:
- repository-redacted evidence index
- private / restricted evidence index
- redaction policy
- retention / revocation policy
- secret revocation / rotation record（該当時）
- public-safe opaque reference
- A2 Evidence Integrity Attestation

R4-Aでだけ追加するもの:
- Closure Manifest
- Closure Attestation
- 最終Manifest Anchor集合
- 外部署名またはCI attestation（必要時）
```

### 2.3 関係

```text
- blockerでも、原因が明確で単一ファイルならR1になり得る
- minorでも、DOM / ARIA契約の再定義を伴うならR3になり得る
- majorでも、契約変更がなく原因が明確ならR2-liteまたはR2-fullでよい
- 一括実装するとレビュー不能な変更はR4にする
- 監査保証A軸はR軸から独立に判定する。R4でも通常の大規模リファクタリングならA1止まりでよく、R1でも秘密情報露出ならA2にする
```

## 2.4 封じ込めトリガー

重大度がminorまたはR段階が低く見える場合でも、次のいずれかに該当する場合は、原因調査や実装より先に封じ込め要否を判断します。

```text
Containment Trigger:
- suspected-secret-exposure: token、cookie、API key、秘密設定、private repository URL等の露出疑い
- private-content-leak: 個人ノート本文、検索index、生成済みHTML / JSON、screenshot等の非公開情報露出疑い
- destructive-corruption: コンテンツ、生成物、設定、履歴を不可逆に破壊する疑い
- active-exploitation: 悪用、再現可能な攻撃、危険な入力経路の露出疑い
- supply-chain-compromise: lockfile、package manager、CI、依存関係、配布経路の侵害疑い
```

封じ込めトリガーがある場合、R段階とは独立にA1またはA2を検討します。封じ込めにより証拠が消える可能性がある場合は、`02_core_workflow.md`の最小証拠保存規則に従います。

## 3. R0〜R4の判定表

| 段階    | 使う条件                                                                           | 成果物                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 実装方法                  |
| ------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| R0      | 挙動に影響しない軽微修正                                                           | 変更理由、diff確認                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 人間が手修正              |
| R1      | 原因明確、少数ファイル、契約影響なし                                               | Mini Evidence、Mini Brief、簡略Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 人間、またはChatGPT置換案 |
| R2-lite | 日常的な中規模修正、採用原因と変更境界が明確                                       | R2-lite Run Card、またはR2-lite Brief + R2-lite Result、軽量Verification。Cause Summary相当はRun Card / Brief内包。Minimum Evidence Packet相当はRun Card / Brief内包、または単一Evidenceを別成果物化してEvidence ID参照可                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 人間、または限定Codex     |
| R2-full | 原因調査、影響範囲確認、契約確認が必要                                             | Issue Brief、Minimum Evidence Packet、Cause Summary / Matrix、Fix Plan、契約影響チェック、Verification Matrix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 人間、または限定Codex     |
| R3      | 仕様判断、契約変更、原因未確定かつ修正対象が分岐、安全性・アクセシビリティ意味変更 | R2-full成果物（Minimum Evidence Packetを含む） + Evidence Record + Contract Inventory + Decision Record + 反対仮説レビュー + ロールバック方針                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 限定実装                  |
| R4      | 一括実装するとレビュー不能                                                         | R4-S: 全体Issue Brief、全体Minimum Evidence Packet、全体Evidence Record、全体Cause Matrix、全体Contract Inventoryまたは根拠付きN/A、全体Decision Record、全体Fix Plan、R4 Phase Plan、軽量Resolution Manifest（ArtifactKey解決用、Anchor任意）、R4 Execution Ledger、各フェーズ成果物、各フェーズEvidence、各フェーズ検証、Final R4 Disposition Verification、R4 Completion Record。R4-I: R4共通構造検証を行うが、ArtifactKey解決はLightweight Resolution ManifestではなくArtifact Manifestで行い、Manifest Anchor、SHA-256検証、Manifest chain検証、R4 Completion Recordを必須にする。R4-A: R4-I相当の構造検証と完全性検証に加え、private / restricted Manifest、Closure Manifest、Closure Attestation、外部署名またはCI attestation（必要時）でclosedを導出する。R4-AのR4 Completion Recordは任意要約。A0〜A2は別途判定 | フェーズ単位実装          |

## 4. R0

R0は、次をすべて満たす場合だけ使います。

```text
- 明らかな誤字、コメント、ドキュメントの軽微修正
- ユーザー可視のUI文言、aria-label、role/name計算、検索対象、snapshot対象、visual / paint contract対象に影響しない
- 挙動、テスト、DOM、CSS、ARIA、生成物、lockfileに影響しない
- 修正後の確認が目視または単一diff確認で足りる
```

ただし、次の文書・方針の意味変更はR0にしません。誤字修正であっても、仕様、禁止事項、成功条件、責務境界の意味が変わる場合はR1以上、仕様判断を伴う場合はR3に昇格します。

```text
- 設計文書
- 仕様文書
- AGENTS.md
- ワークフロー
- テスト方針
- package manager policy
- security / sanitization方針
- accessibility方針
```

R0では、次を必須にしません。

```text
- Failure ID
- Cause ID
- Change ID
- Success ID
- Verification ID
- Minimum Evidence Packet
- 修正前失敗条件の最小再検証
```

R0の必須成果物は次だけです。

```text
R0 Record:
- R0 Record ID:
- Issue ID:
- 変更理由:
- 変更範囲:
- 変更分類:
  - Rouault実装変更有無:
  - 契約変更有無:
  - テスト・設定変更有無:
  - generated files / lockfile変更有無:
  - ワークフロー成果物更新有無:
  - 一時生成物発生有無:
- DOM / CSS / ARIA / state / routing / search / security / snapshot / visualへの影響なし確認:
- 設計・仕様・ワークフロー意味への影響なし確認:
- git diff確認:
```

## 5. R1

R1は、次をすべて満たす場合に使います。

```text
- 単一ファイルまたは少数ファイル
- 原因が明確
- 契約面に触れない、または既存契約を維持するだけである
- テスト期待値を変更しない
- snapshotを更新しない
- 削除、移行、縮退を伴わない
- 生成処理に触れない
- package manager / lockfileに触れない
- 環境依存ではない
- CIとlocalの差異がない
```

R1で必要な成果物は次です。

```text
- Mini Brief
- Mini Evidence
- 簡略Verification
- git diff確認
- 修正前失敗条件の最小再検証
```

次に該当する場合は、R1に留めずR2-lite以上へ昇格します。

```text
- local / CI差分が少しでもある
- OS / shell差分が疑われる
- 失敗ログが再現性判断に必要である
- テスト期待値は変更しないが、テスト失敗そのものを扱う
- 削除、生成物、lockfile、package manager設定に触れる可能性がある
```

### 5.1 テスト更新の分類

テストに触れる場合は、次の分類でR段階を決めます。

```text
テスト追加:
- 既存仕様または今回固定する既存契約を検証する新規テスト
- 期待値変更を伴わない
- R2-liteで扱ってよい

軽微なテスト更新:
- ファイル名、テスト名、セレクタ、既存契約に反する誤期待値の修正など、仕様変更を伴わない更新
- 旧期待値が誤りである根拠を説明できる
- 期待値変更ではなく、既存契約への追従である
- R2-liteで扱ってよい

期待値変更:
- DOM、ARIA、snapshot、visual / paint contract、state、routing、search結果などの契約上の期待値を変える更新
- 原則R2-full以上
- 仕様判断または契約変更を伴う場合はR3
```

テスト更新の分類が説明できない場合は、R2-full以上へ昇格します。

## 6. R2-lite

R2-liteは、日常的な中規模問題の標準です。

```text
条件:
- R1より大きい
- 単一ファイルまたは複数ファイルにまたがる
- 採用原因と変更境界が明確
- 契約変更を伴わない
- R1では軽すぎるが、R2-fullほどの原因調査や契約棚卸しは不要
- 必要に応じて、テスト追加または軽微なテスト更新を含み得る
- テスト更新がない中規模修正も、他条件を満たすならR2-liteで扱ってよい
- 修正内容が1つのレビュー単位として扱える
```

R2-liteでは、次を省略してよいです。

```text
- 完全なCause Matrix
- 完全なContract Inventory
- 詳細なIssue Brief
- 反対仮説レビュー
- ロールバック方針
- 詳細な再発防止案
```

R2-liteの必須成果物は、次のどちらかです。どちらを使う場合でも、F / C / CH / S / Vの対応、Scope、Do Not Change、generated files / lockfile非変更確認、軽量Verificationを必須とします。

R2-lite Run CardまたはR2-lite Briefには、Minimum Evidence Packet相当の再現情報とCause Summary相当の原因記録を内包できます。R2-liteでは、Cause Summary相当はRun Card / Brief内に内包します。Cause Summaryを別成果物として分離する必要がある場合は、R2-full以上へ昇格します。R2-liteのEvidenceは、原則としてRun CardまたはBrief内に内包します。単一のEvidenceを見やすさのために別成果物化することは許可しますが、その場合はRun Card / BriefのEvidence欄にEvidence ID、保存場所 / ファイル名、Evidence IDとの対応を必ず参照します。保存場所 / ファイル名はredaction済みで後から参照可能な成果物を指し、失効し得るCI artifactだけを保存場所にしません。Evidenceが複数種類または複数箇所に分散し、Run Card / BriefのEvidence欄と単一の別成果物Evidenceだけでは根拠を十分に追跡できない場合、または原因候補が3個以上残る場合は、R2-liteとして完了不可とし、R2-full以上へ昇格して成果物を分離します。

```text
A. R2-lite Run Card
B. R2-lite Brief + R2-lite Result
```

R2-lite Run Cardは、原則として `F1 / C1 / CH1 / S1 / V1` を中心に扱います。C2は、採用原因C1を補強する補助仮説、今回の修正対象・成功条件・契約影響を変えない保留仮説、または棄却仮説としてのみ記録します。

次の場合は、Run Cardではなく `R2-lite Brief + R2-lite Result` を使います。

```text
- Failure IDが2個以上ある
- Change IDが2個以上ある
- Success IDが2個以上ある
- Verification IDが2個以上あり、対応関係を表で追跡した方がよい
- 実装前計画と実装後結果を分離した方が誤読を防げる
```

R2-lite Briefで `F2 / CH2 / S2 / V2` を扱う場合でも、採用原因は原則として `C1` に固定します。F2もC1で説明でき、CH2はC1に対する同一修正単位内の変更であり、S2 / V2も同じ原因と変更境界に対応する必要があります。F2に別の採用原因が必要な場合、またはCH2が別の修正単位になる場合は、R2-full以上へ昇格します。

R2-lite BriefまたはR2-lite Run Cardの `generated files` / `lockfile` は、原則として「触れないことの確認欄」です。実差分が出る場合はR2-liteとして完了不可とし、差分理由、生成元、再現コマンドを説明できるかを確認したうえでR2-full以上へ昇格します。

R2-liteで扱う主要仮説は最大2個までとします。ただし、R2-liteで複数仮説を扱えるのは、採用原因を1つに固定できており、残る仮説が採用原因を補強する補助仮説、または今回の修正対象・成功条件・契約影響を変えない保留仮説である場合だけです。修正対象、成功条件、契約影響、テスト更新方針が変わり得る競合仮説が残る場合は、原因候補数が2個以下でもR2-full以上へ昇格します。原因候補が3個以上残る場合は、軽量運用ではなくR2-full以上へ昇格します。

ただし、次に該当したらR2-fullまたはR3へ昇格します。

```text
- 原因候補が3個以上残る
- 2個以下でも、修正対象、成功条件、契約影響、テスト更新方針が変わり得る競合仮説が残る
- Evidenceが複数種類または複数箇所に分散し、Run Card / BriefのEvidence欄と単一の別成果物Evidenceだけでは根拠を十分に追跡できない
- R2-lite Run CardまたはR2-lite Brief内でMinimum Evidence Packet相当とCause Summary相当を十分に説明できない
- Cause Summaryを別成果物として分離する必要がある
- 契約変更の可能性がある
- テスト期待値変更の根拠が曖昧
- snapshot差分の意味が曖昧
- localとCIの結果が異なる
- generated files / lockfileに実差分が出る
- package manager設定に触れる
- 削除、移行、縮退、旧経路削除、テスト削除の判断が必要になる
- R2-lite Brief上のgenerated files / lockfile欄で「触れないこと」を確認できず、差分理由の説明が必要になる
- security / sanitizationに関わる
- accessibility上の意味を変更する可能性がある
```

## 7. R2-full

R2-fullは、原因調査、影響範囲確認、変更境界確認、契約影響チェックが必要な標準問題に使います。

```text
条件:
- 単一ファイルまたは複数ファイルにまたがる
- 原因調査、影響範囲確認、契約影響チェックのいずれかが必要
- 必要に応じて、テスト追加、テスト更新、snapshot確認、生成物確認を含み得る
- UI、状態、データ、ビルド、生成処理、環境差分、テスト期待値のいずれかに影響し得る
- 契約変更や仕様判断を伴わない
- 契約影響がある場合でも、既存契約への追従、明確なバグ修正、契約を変えない補完に限る
- 契約変更、仕様判断、安全性・アクセシビリティ意味変更が判明した場合はR3へ昇格する
```

R2-fullでは契約影響チェックとFix Plan精査を必須とします。ただし、詳細Contract Inventoryは条件付きです。

```text
- 契約影響なし:
  - Fix Plan内の契約影響チェック欄、または簡略Contract Inventoryで、契約影響なしの根拠を記録する
- 契約影響あり、または不明:
  - 詳細Contract Inventoryを作成する
- 契約変更、仕様判断、安全性・アクセシビリティ意味変更:
  - R3へ昇格する
```

R2-fullに留めてよい例です。

```text
- 契約変更ではなく既存契約への追従である
- 期待値更新が既存契約への追従であり、旧期待値が誤りである根拠が明確
- snapshot差分の意味を説明できる
- generated files / lockfileに触れる場合でも、生成元・生成コマンド・差分理由を説明でき、生成契約やpackage manager policyを変更しない
- 単に原因調査が必要なだけで、仕様判断や契約変更に進まない
- 採用原因が明確で、主要Failureを説明できる
- 複数Cause IDがある場合でも、それぞれ対応するFailure / Change / Verificationを追跡できる
```

## 8. R3

R3は、単に変更が大きい場合ではなく、契約変更、仕様判断、安全性影響、accessibility意味変更、原因未確定かつ修正対象が複数候補に分岐する場合、または再ループにより採用原因・Fix Planの妥当性が崩れた場合に使います。

### 8.1 即R3

```text
- security / sanitizationに影響する
- accessibility上の意味を変更する
- 仕様判断が必要
- 既存契約を変更する
- ただし、既存契約への追従、明確なバグ修正、契約を変えない補完はR2-fullに留めてよい
- 静的HTML主体方針またはLit enhancement責務境界を変更する
- 同じ採用原因または同じFix Planで2回失敗した
- 原因が未確定で、修正対象が複数候補に分かれ、契約変更・仕様判断・安全性影響を伴い得る
```

### 8.2 R2-fullから開始し、必要ならR3

```text
- local / CI差分がある
- OS / shell差異が疑われる
- generated filesに触れる
- snapshot差分がある
- package manager関連の実装修正を含む
- テスト期待値の更新が必要そうである
```

調査中に仕様判断、契約変更、安全性影響が判明した場合はR3へ昇格します。

### 8.3 generated files / lockfile / package managerの扱い

generated files、lockfile、package manager設定に触れる場合は、変更理由と生成元を明示します。

```text
- 既存の生成契約に従った再生成はR2-fullで扱ってよい
- 生成元変更に対応する生成物更新はR2-fullで扱ってよい
- lockfile差分が依存関係変更、package manager変更、install policy変更を伴う場合はR3に昇格する
- package manager policyそのものを変更する場合はR3に昇格する
- 生成契約そのものを変更する場合はR3に昇格する
- 説明できないgenerated files / lockfile差分は差し戻す
- 生成物だけの手修正は禁止する
```

R2-fullに留める場合でも、Fix Plan内のgenerated files / lockfile欄、またはEvidence Record内の記録で次を説明します。

```text
- 生成元:
- 生成コマンド:
- 更新された生成物:
- lockfile差分の有無:
- 差分が意図したものと言える根拠:
```

### 8.4 削除・移行・縮退の扱い

削除、移行、縮退は、単なる差分量ではなく、契約を消すか、旧経路をどう閉じるか、検証が残るかでR段階を決めます。

```text
dead code削除:
- 参照なし、契約なし、生成対象外、テスト対象外をEvidenceで確認できる場合はR2-fullで扱ってよい
- 根拠がdiffだけ、または参照なしを確認していない場合は実施しない

契約削除:
- DOM / ARIA / state / route / search / generated file形式 / public class / custom element / CSS custom propertyなどの契約を消す場合はR3
- Decision RecordとContract Inventoryを必須にする

移行・縮退:
- 旧経路を新経路へ置き換える場合はR3以上
- 一括レビュー不能、または部分完了状態の管理が必要ならR4
- 旧経路を残す場合は残す理由、削除時期、検証責務をFix Planに書く

旧経路削除:
- 移行完了のEvidence、参照なし確認、回帰確認、ロールバック方針が必要
- 旧経路が契約を担っていた場合はR3以上

テスト削除:
- 同等以上の検証が別テストまたはVerificationで残る場合のみ可
- 仕様判断、契約変更、期待値弱体化を伴う場合はR3
- 成功条件に対応する検証を消す削除は禁止
```

R2-liteで削除してよいのは、ドキュメント内の重複行削除など、挙動・契約・検証責務を持たない軽微整理に限ります。コード、テスト、生成物、設定、公開契約に関わる削除はR2-full以上で扱います。

## 9. R4

R4の本質は、単にリスクが高いことではなく、一括実装するとレビュー不能になることです。

```text
- 設計境界を変更する
- 旧実装の削除、移行、縮退を含み、かつ一括実装するとレビュー不能、または部分完了状態の管理が必要である
- DOM、CSS、テスト、生成処理、設定が同時に変わる
- 複数の原因が絡む
- 部分完了状態を安全に管理する必要がある
- フェーズごとに成功条件を分けないと検証不能である
- 一括実装するとレビュー不能になる
```

R4へ昇格する目安です。

```text
- UI / state / routing / generated files / tests / build設定のうち3領域以上にまたがる
- 削除、移行、再構成、契約変更が同時に含まれる
- 1つのVerification Matrixだけでは成功条件を追跡しにくい
- 1コミットでレビューすると、原因修正と副次変更を分離できない
- 部分完了状態を安全に維持する必要がある
- フェーズごとのロールバック条件を定義しないと安全に進められない
```

R4では、全体成果物とフェーズ単位成果物を分けます。さらに、R4の重さは次のProfileで決めます。

```text
R4 Profile:
- R4-S structural: レビュー不能な変更を安全に分割するための構造管理。ArtifactKey解決用の軽量Resolution Manifestは必須とするが、SHA-256固定、Manifest Anchor、暗号学的完全性固定は要求しない。
- R4-I integrity: R4共通構造検証を行う。ただしArtifactKey解決にはLightweight Resolution ManifestではなくArtifact Manifestを使い、SHA-256、Manifest Anchor、Manifest chain検証を追加して後日再検証可能にする。
- R4-A audit: R4-Iにprivate / restricted Manifest、Closure Manifest、Closure Attestation、必要な外部署名またはCI attestationを追加する。

選択規則:
- 通常の大規模リファクタリングは原則R4-SまたはR4-Iにする
- CI artifactや生成物の後日検証が必要ならR4-Iにする
- A2、外部提出、改ざん耐性、機密Evidence分離が必要ならR4-Aにする
- R4-Aでない限り、Closure Manifest / Closure Attestationを必須にしない
```

```text
R4全体:
- 全体Issue Brief
- 全体Minimum Evidence Packet
- 全体Evidence Record
- 全体Cause Matrix
- 全体Contract Inventory、または根拠付きN/A
- 全体Decision Record
- 全体Fix Plan
- R4 Phase Plan
- R4 Execution Ledger
- Final R4 Disposition Verification
- R4-S / R4-IでCompletion Record
- R4-AではClosure Manifest / Closure Attestationをclosed導出の正本とし、Completion RecordはPR / commit向け要約として任意
- R4-I以上でArtifact Manifest / Manifest Anchor
  - repository-redacted / local-private / ci-private / external-restrictedを区別し、private locatorや公開不可digestを公開Manifestへ記録しない
  - Manifest / Anchor / Ledger / Closureの正規化と検証規則は `../r4-validation/08_r4_schema_and_validation.md` に従う
- R4-AでClosure Manifest / Closure Attestation

R4各フェーズ:
- Phase種別とPhase R段階は別軸として記録する。Phase種別だけを理由にR段階をR0相当へ下げない
- Phase R段階には、R0相当、R1、R2-lite、R2-full、R3を記録する
- Phase種別は、`Implementation`、`R0 Record`、`No-change`、`No-action`、`Investigation-only`、`Verification-only`、`Integration verification` のいずれかを記録する
- 許容組合せ:
  - Implementation: R1 / R2-lite / R2-full / R3
  - R0 Record: R0相当のみ
  - No-change: R0相当 / R1 / R2-lite / R2-full / R3
  - No-action: R0相当 / R1 / R2-lite / R2-full / R3
  - Investigation-only: R1 / R2-lite / R2-full / R3
  - Verification-only: R1 / R2-lite / R2-full / R3
  - Integration verification: R2-lite / R2-full / R3
- R4 PhaseのPhase R段階にR4を使わない。1つのPhaseがR4相当になる場合は、同じR4 Phase Plan内でさらに分割する
- R0 Record Phaseは、挙動・契約・テスト・生成物・lockfileに影響せず、設計、仕様、ワークフロー、禁止事項、責務境界、成功条件の意味も変更しない文書整理、記録整理、または軽微な運用メモ整理に限定する
- No-change PhaseはIssue全体を修正なしで閉じる終端Phaseに限定する。後続Phaseを持たず、未実行の後続Phaseはcancelledまたはsupersededにする
- Phase限定で変更不要と判断する場合はNo-changeではなくNo-action Phaseを使い、Issueを閉じない
- Investigation-only PhaseはEvidenceの引渡し、外部依存待ち、再現情報待ちを扱い、Dispositionごとの再開条件を記録する
- Verification-only / Integration verification Phaseは計画時点で新規Failure / Cause / Changeを所有しない。新Failureを検出した場合はDetected Failure Observation IDとして記録し、別IDのFailureを新しいImplementation Phaseへ作成して対応付ける
- フェーズ成果物は「判断リスク成果物」と「Phase種別固有成果物」を合成して決める。Implementation固有のFix Plan、実装開始ゲート、実装、最小再検証を非Implementation Phaseへ機械的に要求しない
- R4 Phase Planには計画構造だけを記録し、Phase Status、Phase Outcome / Disposition Record、Artifact実績、Evidence対応はR4 Execution Ledgerへ記録する
- Statusの正本はR4 Execution LedgerのPhase Execution Event Logとし、各RecordはRequested Status transitionだけを記録する
- 成果物間参照はArtifactKeyを選択したManifest RevisionでArtifactRef（storage class + immutable locatorを含む）へ解決し、hashとGit情報はArtifact Manifestから取得する
- Artifactの現在有効性はR4 Execution LedgerのArtifact Validation Attestationだけを正本とし、Artifact本体のヘッダーへ書き戻さない。pre-final Ledger自身はAttestationで自己証明せずFinal Verificationで再計算する
- Plan RevisionはPhase追加・分割・依存関係・成功条件・変更境界等の構造変更だけで更新し、Phase Status変更はR4 Execution LedgerのPhase Execution Event Logへappend-onlyで記録する
- necessity評価はrequired / conditional-activated / conditional-not-activated / optional-executed / optional-not-runの許容組合せに従う
- conditional-not-activatedとoptional-not-runのcancelled EventはPhase Disposition Recordを根拠にする
- Active Phase Setはfinal Plan、retire / replacement、necessity、activation、executedから導出し、実行したoptional Phaseも含める
- R4-Sでは、軽量Resolution ManifestでArtifactKeyを解決し、pre-final R4 Execution Ledgerを凍結し、Final VerificationでEvent Log、Current Status、Active Phase Set、Final State ArtifactRefを再計算する
- R4-I以上では、pre-final R4 Execution LedgerをManifest登録・anchorした後にFinal Verificationを作成する
- R4-Aでは、Final Verification登録後のClosure Input Manifest Anchor集合をClosure Manifestで固定し、Closure Manifestは`proposed-closed / proposed-not-closed`の閉鎖候補だけを記録する。実際の`closed`状態はClosure Manifest登録後の最終Manifest AnchorとClosure Attestationから導出する
- 前段Artifactへ後段Execution Event IDまたはFinal Verification ArtifactRefを書き戻さない
- Implementation Phaseはpassed / failed時にImplementation Phase Outcome Recordを作成し、outcome EventがそのArtifactRefを参照する。blocked時はPhase Transition Record、cancelled / superseded時はPhase Disposition Recordを使う
```

R4では、Codexに一括実装させません。必ずフェーズ単位で実装、精査、検証します。

### 9.1 Phase種別×Phase R段階の成果物マトリクス

R4各Phaseの成果物は、判断リスク成果物と活動固有成果物を合成します。ただし、判断リスク成果物のID対応はPhase種別の意味へ写像し、非Implementationへ`F / C / CH / S / V`を機械的に要求しません。

判断リスク成果物です。

| Phase R段階 | 共通の判断リスク成果物                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| R0相当      | 専用Record内の影響なし確認、diff確認                                                                                          |
| R1          | Mini Evidence相当、簡略契約影響確認、専用Record内の判断根拠                                                                   |
| R2-lite     | 専用Record内のEvidence、採用原因または仮説状態、軽量な追跡対応、軽量VerificationまたはDisposition確認                         |
| R2-full     | Issue Brief、Minimum Evidence Packet、Cause Summary / Matrix、契約影響チェック、活動に対応するPlan、必要なVerification Matrix |
| R3          | R2-full判断成果物 + Evidence Record + Contract Inventory + Decision Record + 反対仮説レビュー + rollback / reversal方針       |

Phase種別ごとのR2-lite追跡対応です。

| Phase種別                | R2-liteで追跡する対応                                                          |
| ------------------------ | ------------------------------------------------------------------------------ |
| Implementation           | Failure / Cause / Change / Success / Verification                              |
| No-change                | Issue / Failure / Closure condition / Closure verification                     |
| No-action                | Issue / 対象範囲 / 非変更根拠 / 後続影響                                       |
| Investigation-only       | Investigation question / Hypothesis / Evidence / HandoffまたはResume condition |
| Verification-only        | Phase Success / Verification / Detected Failure Observation                    |
| Integration verification | Integration Success / Verification / Detected Failure Observation              |

活動固有成果物です。

| Phase種別                   | 活動固有成果物                                                                                                                   | 要求しないもの                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Implementation R1           | Mini Brief、実装、最小再検証、簡略Verification、Implementation Phase Outcome Record                                              | Fix Plan                                   |
| Implementation R2-lite      | R2-lite Run Card、またはR2-lite Brief + Result、実装、最小再検証、軽量Verification、Implementation Phase Outcome Record          | R2-full Fix Plan                           |
| Implementation R2-full / R3 | Fix Plan、実装開始ゲート、実装、修正前失敗条件の最小再検証、diff精査、Verification Matrix、Implementation Phase Outcome Record   | なし                                       |
| R0 Record                   | R0 Record、影響なし確認、diff確認                                                                                                | Fix Plan、実装、最小再検証                 |
| No-change                   | No-change Completion、closure Evidence、Final R4 Disposition Verificationのno-change closure、先行変更の不存在またはrollback確認 | 実装、実装開始ゲート、実装後最小再検証     |
| No-action                   | No-action Record、対象範囲の非変更根拠、後続Phaseへの影響                                                                        | 当該Phaseでの実装、Issue終端判断           |
| Investigation-only          | Investigation Plan、Evidence取得、仮説状態、handoff / 再開条件                                                                   | Fix Plan、実装開始ゲート、実装後最小再検証 |
| Verification-only           | Verification Plan、Phase Success ID、Verification Evidence、Detected Failure Observation移管                                     | 当該Phaseでの実装修正                      |
| Integration verification    | Integration Verification Plan、統合Success、統合Evidence、Detected Failure Observation移管                                       | 当該Phaseでの実装修正                      |

R0相当の特殊Phaseは、専用Record内へR0相当確認を内包し、別のR0 Recordを重複作成しません。R3の特殊PhaseでもDecision Record等の判断リスク成果物を省略しません。

## 10. 成果物の必須度

| 成果物                                                                                           |       R0 |       R1 |                                                                   R2-lite |                    R2-full |         R3 |                                                                                                                                                                                                                      R4 |
| ------------------------------------------------------------------------------------------------ | -------: | -------: | ------------------------------------------------------------------------: | -------------------------: | ---------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| R0 Record                                                                                        |     必須 |        - |                                                                         - |                          - |          - |                                                                                                                                                                                                                       - |
| Mini Evidence                                                                                    |        - |     必須 |                                                                      任意 |                       任意 |       任意 |                                                                                                                                                                                                                    任意 |
| Minimum Evidence Packet                                                                          |        - |     任意 | Run Card / Brief内包、または単一Evidenceを別成果物化してEvidence ID参照可 |                       必須 |       必須 |                                                                                                                                                                                                                    必須 |
| Evidence Record                                                                                  |        - |     任意 |                                                                  条件付き |                   条件付き |       必須 |                                                                                                                                                                                                                    必須 |
| F / C / CH / S / V                                                                               |        - |     必須 |                                                                      必須 |                       必須 |       必須 |                                                                                                                                        R4のImplementation Phaseで必須。非Implementationは9.1のPhase種別別追跡対応を使う |
| Mini Brief                                                                                       |        - |     必須 |                                                                      任意 |                          - |          - |                                                                                                                                                                                                        フェーズ単位で可 |
| R2-lite Run Card / Brief + Result                                                                |        - |        - |                                                                      必須 |                       任意 |       任意 |                                                                                                                                                                                                        フェーズ単位で可 |
| Issue Brief                                                                                      |        - |        - |                                                                      任意 |                       必須 |       必須 |                                                                                                                                                                                                              全体で必須 |
| Cause Summary / Cause Matrix                                                                     |        - |        - |  Cause Summary相当はRun Card / Brief内包。分離が必要ならR2-full以上へ昇格 |    SummaryまたはMatrix必須 | Matrix必須 |                                                                                                                                                                                                              全体で必須 |
| 契約影響チェック                                                                                 |        - | 簡略確認 |                                                                  簡略確認 |                       必須 |       必須 |                                                                                                                                                                                                              全体で必須 |
| Contract Inventory                                                                               |        - |        - |                                           原則不要 / 契約影響ありなら昇格 | 影響あり・不明の場合に必須 |       必須 | 全体で必須。ただし全フェーズでDOM / CSS / ARIA / state / generated files / lockfile / routing / search / security / テスト期待値 / snapshot / visual・paint contractに一切触れないことを証明できる場合のみ根拠付きN/A可 |
| Decision Record                                                                                  |        - |        - |                                                                         - |                   条件付き |       必須 |                                                                                                                              全体で必須。フェーズ分割、統合、契約影響、削除・移行・縮退判断、ロールバック方針を説明する |
| Fix Plan                                                                                         |        - |     任意 |                                                                      任意 |                       必須 |       必須 |                                                                                                                           全体Fix Planは必須。各PhaseではImplementationだけに必須。非Implementationは活動固有Planを使う |
| Fix Plan精査                                                                                     |        - |     任意 |                                                                  条件付き |                       必須 |       必須 |                                                                                                                                                                                                                    必須 |
| 反対仮説レビュー                                                                                 |        - |        - |                                                                         - |                   条件付き |       必須 |                                                                                                                                                                                                                    必須 |
| R4 Phase Plan                                                                                    |        - |        - |                                                                         - |                          - |          - |                                                                                                                                                                                                  必須（計画構造の正本） |
| Artifact Manifest / Resolution Manifest                                                          |        - |        - |                                                                         - |                          - |          - |                                                                                                  R4-Sでは軽量Resolution Manifestが必須（SHA-256 / Anchor任意）。R4-I / R4-AではArtifact ManifestとManifest Anchorが必須 |
| Manifest Anchor                                                                                  |        - |        - |                                                                         - |                          - |          - |                                                                                                                                                                        R4-I / R4-Aで必須。R4-Sでは任意かつ未使用ならN/A |
| R4 Execution Ledger                                                                              |        - |        - |                                                                         - |                          - |          - |                                                                                                                                               必須（実行状態・Final State ArtifactRef・Evidence・Artifact有効性の正本） |
| Phase Transition / Outcome / Disposition Record                                                  |        - |        - |                                                                         - |                          - |          - |                                                                                                                                                                                              Status遷移種別に応じて必須 |
| Final R4 Disposition Verification                                                                |        - |        - |                                                                         - |                          - |          - |                                                                                                                                                                                                  必須（最終判定の正本） |
| R4 Completion Record                                                                             |        - |        - |                                                                         - |                          - |          - |                                                                                                                                      R4-S / R4-Iで必須。R4-Aではclosed導出の正本ではなく、PR / commit向け要約として任意 |
| Closure Manifest                                                                                 |        - |        - |                                                                         - |                          - |          - |                                                                                                                                                                                         R4-Aで必須。R4-S / R4-Iでは不要 |
| Closure Attestation                                                                              |        - |        - |                                                                         - |                          - |          - |                                                                                                                                                                                         R4-Aで必須。R4-S / R4-Iでは不要 |
| A2 Evidence Integrity Attestation                                                                | A2時必須 | A2時必須 |                                                                  A2時必須 |                   A2時必須 |   A2時必須 |                                                                                                                                                                           A2時必須。R4-AではClosure Attestationと併用可 |
| No-change / No-action / Investigation-only / Verification-only / Integration verification Record |        - | 条件付き |                                                                  条件付き |                   条件付き |   条件付き |                                                                                                                                                                            対象Phaseで必須。非R4 Investigation-onlyも可 |
| ロールバック方針                                                                                 |        - |        - |                                                                      任意 |                       任意 |       必須 |                                                                                                                                                                                                                    必須 |
| Verification                                                                                     |        - |     簡略 |                                                                      軽量 |                     Matrix |     Matrix |                                                                                                                                                       Phase種別に応じたVerification + Final R4 Disposition Verification |
| 修正前失敗条件の最小再検証                                                                       |    N/A可 |     必須 |                                                                      必須 |                       必須 |       必須 |                                                               Implementation Phaseで必須。R0 Record / No-change / No-action / Investigation-only / Verification-only / Integration verification Phaseは各専用規則に従う |
