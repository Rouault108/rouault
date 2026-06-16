# Quick Start: Rouault 問題解決の薄い運用フロー

このファイルは日常運用の入口です。詳細版は `full-workflow/`、R4/A2の機械検証は `r4-validation/` を参照します。

## 0. 目的

Rouaultで問題が発生したときに、ChatGPTを主体として次を完了します。

```text
問題入力
  ↓
入口判定
  ↓
Evidence作成
  ↓
原因特定
  ↓
修正方針策定
  ↓
Codexによる限定実装
  ↓
ChatGPTによる差分精査
  ↓
検証
  ↓
完了判定・コミット整理
```

## 1. 情報境界を固定する

最初に、ChatGPTへ渡してよい情報を明示します。

```text
使ってよい情報:
- 現在の依頼文
- 添付ファイル
- GitHub現行実装
- local差分
- CIログ
- 実行ログ
- README / docs / contracts / ADR

使ってはいけない情報:
- ユーザーが許可していない過去会話
- 根拠未確認の推定
- 未redactの個人ノート本文、秘密情報、ローカルパス、非公開URL
```

## 2. R段階を暫定判定する

| 段階 | 使う場面 | 日常運用での扱い |
|---|---|---|
| R0 | 誤字、コメント、挙動影響なし | diff確認で完了可 |
| R1 | 原因明確、小規模、少数ファイル | 簡易Run Cardで進める |
| R2-lite | 原因と変更境界が明確な日常的中規模修正 | F1/C1/CH1/S1/V1中心で進める |
| R2-full | 原因調査、影響範囲、契約確認が必要 | Issue Brief / Cause / Fix Planを分離 |
| R3 | 仕様判断、契約変更、安全性、アクセシビリティ意味変更 | Decision Recordと反対仮説レビューを必須化 |
| R4 | 一括レビュー不能、複数Phaseが必要 | `r4-validation/` を例外的に使う |

迷ったら高めに置き、Evidenceで下げます。根拠なく軽く扱わないでください。

## 3. Aレベルを別軸で判定する

| Aレベル | 使う場面 |
|---|---|
| A0 | 通常Evidenceで十分 |
| A1 | SHA-256、保存場所、CIログなど後日検証性が必要 |
| A2 | private / restricted Evidence、redaction、保持・失効、Evidence Integrity Attestationが必要 |

R段階は変更リスク、Aレベルは証拠保全・監査保証です。混同しないでください。

## 4. ChatGPTに原因特定を依頼する

原因特定時の出力は、最低限次を要求します。

```text
- Failure ID
- Cause ID候補
- 採用 / 棄却 / 保留
- 採用原因を支えるEvidence
- 採用原因で説明できない症状
- 修正対象ファイル候補
- 契約影響
- 次に確認すべき不足情報
```

原因が確定するまで、Codexに実装させません。

## 5. 修正方針を作る

Codexへ渡す前に、ChatGPTでFix PlanまたはRun Cardを作ります。

最低限必要な項目です。

```text
- 対象Failure ID
- 採用Cause ID
- 変更対象ファイル
- 変更してよい範囲
- 変更してはいけない範囲
- 期待するSuccess ID
- Verification ID
- テストコマンド
- out-of-scope
- ロールバック方針
```

## 6. Codexに渡す条件

Codexは実装担当であり、設計判断者ではありません。

Codexへ渡してよい条件です。

```text
- Fix PlanまたはR2-lite Run Cardがある
- 変更対象ファイルと禁止範囲が明確
- 成功条件と検証条件が明確
- 仕様判断、契約変更、削除判断をCodexに委ねない
```

Codexに渡してはいけない状態です。

```text
- 原因未確定
- 変更範囲未確定
- 契約変更の要否が未判断
- 失敗を再現できていない
- 何をもって完了か不明
```

## 7. 実装後はChatGPTで差分精査する

実装後、最初にテスト結果を信じ切らず、diffを確認します。

```text
確認すること:
- Fix Planに対応する差分か
- 便乗変更がないか
- 変更禁止範囲に触れていないか
- Success IDに対応しているか
- Verification IDに対応する検証があるか
- R段階を上げるべき実diffがないか
- Rouault契約を壊していないか
```

Rouault固有契約は `full-workflow/04_rouault_policy_overlay.md` を参照します。

## 8. 完了判定

完了にしてよい条件です。

```text
- 修正前Failureが再現しない、または再現不能理由が記録されている
- 採用CauseとChangeが対応している
- ChangeとSuccessが対応している
- SuccessとVerificationが対応している
- out-of-scopeが明示されている
- テスト・CI・差分精査が完了している
- 未検証項目が完了条件に残っていない
```

## 9. R4/A2を使う条件

通常はR4/A2を使いません。次の場合だけ `r4-validation/` を使います。

```text
- 一括レビュー不能
- 複数Phaseへ分割しないと破綻する
- 外部監査、証拠保全、private / restricted Evidenceが必要
- Closure AttestationまたはA2 Evidence Integrity Attestationが必要
- 後日、Phaseごとの状態遷移と成果物完全性を機械検証したい
```

R4/A2に該当しない場合は、`quick-start.md` と `prompts/` だけで進めます。

## 10. 終了基準

この運用フローは、次を満たしたら終了します。

```text
- P0級の未解決問題がない
- 完了条件が満たされている
- Codex差分がFix Plan外へ逸脱していない
- 必要なテストとCIが通っている
- コミットメッセージに原因と修正意図が反映されている
```

R4/A2 validatorの改善余地は、通常修正の完了を妨げません。R4/A2対象時だけ別途扱います。
