# Quick Start: Rouault 機能変更の薄い運用フロー

このファイルは、Rouaultで機能の追加、変更、削除、仕様変更、契約変更、移行、内部構造変更を行うときの日常運用入口です。

## 0. 目的

Rouaultで機能変更が必要になったときに、ChatGPTを主体として次を完了します。

```text
変更入力
  ↓
入口判定
  ↓
現行仕様・現行実装・契約確認
  ↓
採用仕様の決定
  ↓
Decision Record / Delete / Breaking Change Gate の要否判定
  ↓
Change Plan策定
  ↓
Codexによる限定実装
  ↓
ChatGPTによる差分精査
  ↓
検証
  ↓
完了判定・コミット整理
```

本ワークフローは、不具合原因を特定するためのものではありません。失敗、回帰、CIエラー、期待結果と実際の結果のずれが主題の場合は、`problem-solving`ワークフローを使います。

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
- 既存テスト
- デザイン意図、UX意図、削除理由、移行理由

使ってはいけない情報:
- ユーザーが許可していない過去会話
- 根拠未確認の推定
- 未redactの個人ノート本文、秘密情報、ローカルパス、非公開URL
```

## 2. 問題修正か機能変更かを判定する

最初に、依頼を次のどちらとして扱うかを決めます。

| 分類 | 使うワークフロー | 典型例 |
|---|---|---|
| 問題修正 | `problem-solving` | テスト失敗、CI失敗、回帰、不具合、期待結果と実際の結果のずれ |
| 機能変更 | `feature-change` | 追加、変更、削除、仕様変更、契約変更、移行、内部構造変更 |

混在している場合は、次の順に扱います。

```text
1. 既存の失敗が主因なら problem-solving で原因特定する
2. 既存仕様を変える必要が採用されたら feature-change へ移行する
3. 仕様変更後に発生した失敗は、再び problem-solving で扱う
```

`problem-solving`から`feature-change`へ移行する場合は、次を橋渡し情報として残します。

```text
- 元のFailure ID
- 採用Cause ID
- 仕様変更が必要になった理由
- 新しいRequest ID
- Decision ID候補
- 未解決Evidence
- out-of-scope
```

## 3. ID体系を固定する

機能変更では、次のID体系を使います。

| ID | 意味 |
|---|---|
| Request ID | 何を変更したいか |
| Decision ID | どの仕様・方針を採用するか |
| Change ID | どのファイル・範囲を変更するか |
| Acceptance ID | 何を満たせば受け入れるか |
| Verification ID | どう検証するか |

問題修正ワークフローの`Failure / Cause / Change / Success / Verification`を無理に使わないでください。機能変更では、原因ではなく採用判断が中心です。

## 4. 変更種別を判定する

| 種別 | 説明 | 注意点 |
|---|---|---|
| add | 新機能追加 | 既存契約を壊さないか確認する |
| change | 既存機能変更 | 互換性、URL、UX、アクセシビリティ、テスト影響を確認する |
| remove | 機能削除 | Delete / Breaking Change Gateを使う |
| refactor | 内部構造変更 | 外部挙動を変えるなら`change`として扱う |
| contract-change | 公開契約変更 | 原則R3以上。Decision RecordとDelete / Breaking Change Gateを使う |
| migration | データ・設定・URLなどの移行 | 旧形式、移行失敗時、ロールバックを確認する |
| deprecation | 非推奨化 | 削除予定、警告、移行先を明示する |

## 5. R段階を暫定判定する

| 段階 | 使う場面 | 日常運用での扱い |
|---|---|---|
| R0 | 誤字、コメント、docsのみ、挙動影響なし | diff確認で完了可 |
| R1 | 仕様判断済みの小規模変更、少数ファイル | 簡易Change Planで進める |
| R2-lite | 変更意図と境界が明確な日常的中規模変更 | Request / Decision / Change / Acceptance / Verification中心で進める |
| R2-full | 複数案比較、影響範囲確認、契約確認が必要 | Change Brief / Decision / Change Planを分離 |
| R3 | 仕様判断、契約変更、削除、移行、アクセシビリティ意味変更 | Decision Recordと反対仮説レビューを必須化 |
| R4 | 一括レビュー不能、複数Phaseが必要 | Phase分割し、必要に応じてR4/A2検証の仕組みを使う |

迷ったら高めに置き、Evidenceで下げます。根拠なく軽く扱わないでください。



## 5.1 運用モードを選ぶ

R段階を暫定判定した後、日常運用では次の粒度を選びます。安全性を下げるためではなく、不要な成果物を明示的に「不要」と判定するための整理です。

| 運用モード | 対象 | 必須成果物 | 不要にできる成果物 |
|---|---|---|---|
| R1 mini | 仕様判断済みの小変更、少数ファイル、公開契約影響なし | Request ID、Decision ID、Change ID、Acceptance ID、Verification ID、簡易Change Plan | Decision Record、Delete / Breaking Change Gate、A1/A2 Evidence保全要件。ただし不要理由を記録する |
| R2-lite standard | 日常的な中規模変更、変更意図と境界が明確 | 標準Change Plan、契約影響確認、テストコマンド、必要な手動確認 | R3成果物が不要な場合は不要理由を記録する |
| R3 full | 仕様判断、削除、契約変更、移行、アクセシビリティ意味変更 | Decision Record、反対仮説レビュー、標準Change Plan、必要に応じてDelete / Breaking Change Gate | Delete / Breaking Change GateやA1/A2 Evidence保全要件が不要な場合は、削除・破壊的変更・A1/A2に該当しない根拠を明示する |

成果物を作らない場合は、単に省略してはいけません。Change Planに次の形式で不要理由を残します。

```text
- Decision Record: 不要。理由: R1 miniであり、採用仕様は既存仕様の範囲内、公開契約影響なし。
- Delete / Breaking Change Gate: 不要。理由: 削除、互換性破壊、契約変更、移行、非推奨化を伴わない。
- A1/A2 Evidence保全要件: 不要。理由: A0であり、通常Evidenceで十分。
```

## 6. Aレベルを別軸で判定する

| Aレベル | 使う場面 |
|---|---|
| A0 | 通常Evidenceで十分 |
| A1 | SHA-256、保存場所、CIログなど後日検証性が必要 |
| A2 | private / restricted Evidence、redaction、保持・失効、Evidence Integrity Attestationが必要 |

R段階は変更リスク、Aレベルは証拠保全・監査保証です。混同しないでください。

A1/A2では、Evidenceの保存場所、ハッシュ、redaction方針、保持・失効条件、後日検証方法をChange Plan以降にも引き継ぎます。

## 7. 現行仕様・現行実装・契約を確認する

採用仕様を決める前に、最低限次を確認します。

```text
- 現行仕様
- 現行実装
- 現行テスト
- README / docs / contracts / ADR
- URL / routing 影響
- DOM構造 / CSS custom property / custom event 影響
- 永続化形式 / import-export / data contract 影響
- アクセシビリティ影響
- 没入して読む体験への影響
- 読書体験、視線移動、スクロール、URL共有、タブ状態への影響
- フォーカス、キーボード操作、レスポンシブ性、余白、遷移への影響
```

現行確認が不十分なまま、Codexへ仕様判断を渡してはいけません。

## 8. 採用仕様を決める

ChatGPTで、採用案、棄却案、保留案を分けます。

最低限必要な項目です。

```text
- Request ID
- 採用Decision ID
- R段階 / Aレベル
- R/A判定理由
- 棄却案と理由
- 保留案と不足情報
- 採用仕様
- 変更しない範囲
- 互換性影響
- 削除または移行の有無
- 反対仮説
- 反対仮説を退けるEvidence
```

R3以上では、Decision Recordを残します。

## 8.1 R3 Decision Record

R3以上では、Change Planとは別にDecision Recordを残します。Decision Recordが未作成のまま、Codexへ実装を依頼してはいけません。

必須項目です。

```text
- Decision Record ID
- 対象Request ID
- R段階 / Aレベル
- R/A判定理由
- 採用仕様
- 棄却案
- 保留案
- 反対仮説
- 反対仮説を退けるEvidence
- 契約影響
- 削除・移行・非推奨化の扱い
- 互換性影響
- Rouault固有契約影響
- rollback方針
- Acceptance ID
- Verification ID
- 未解決事項
- out-of-scope
```

R3 Decision Recordは、仕様判断、契約変更、削除、移行、アクセシビリティ意味変更を、通常の実装作業から分離して記録するための成果物です。

## 8.2 Delete / Breaking Change Gate

次に該当する場合は、Delete / Breaking Change Gateを通します。

```text
- 機能削除
- 互換性を破る仕様変更
- URL / routing の破壊的変更
- DOM構造、CSS custom property、custom event の契約変更または削除
- 永続化形式、import-export、data contract の変更または削除
- アクセシビリティ属性または意味の変更
- migration / deprecation を伴う変更
```

必須項目です。

```text
- Gate ID
- 対象Request ID
- 対象Decision ID
- 対象契約
- 削除または破壊的変更の理由
- 参照検索Evidence
- 既存テスト影響
- URL / routing 影響
- DOM / CSS custom property / custom event 影響
- data contract / persistence / import-export 影響
- アクセシビリティ属性または意味への影響
- Rouault固有契約への影響
- 代替手段
- deprecation要否
- migration要否
- migration失敗時の扱い
- rollback可能性
- Acceptance ID
- Verification ID
- Gate通過可否
```

Gate通過可否が未判断の場合、Codexへ削除または破壊的変更を依頼してはいけません。

本ワークフローでは`Delete / Breaking Change Gate`を正式名称とします。略称を使う場合は、同一文脈内で`Delete Gate`としてもよいですが、成果物名、見出し、Change Plan、プロンプト入力欄では正式名称を使います。


## 9. Change Planを作る

Codexへ渡す前に、ChatGPTでChange Planを作ります。

最低限必要な項目です。

```text
- Request ID
- Decision ID
- Change ID
- R段階 / Aレベル
- R/A判定理由
- R3以上の必須成果物
- Delete / Breaking Change Gateの要否と結果
- A1/A2 Evidence保全要件
- Decision Record / Delete / Breaking Change Gate / A1/A2 Evidence保全要件が不要な場合の不要理由
- 変更対象ファイル
- 変更してよい範囲
- 変更してはいけない範囲
- Acceptance ID
- Verification ID
- テストコマンド
- 手動確認項目
- out-of-scope
- ロールバック方針
```

## 10. Codexに渡す条件

Codexは実装担当であり、設計判断者ではありません。

Codexへ渡してよい条件です。

```text
- Change Planがある
- 採用仕様が明確
- R段階 / Aレベルが明確
- R3以上の場合、Decision Recordがある
- 削除・破壊的変更の場合、Delete / Breaking Change Gateの通過結果がある
- A1/A2の場合、Evidence保全要件が明確
- 変更対象ファイルと禁止範囲が明確
- 受け入れ条件と検証条件が明確
- out-of-scopeが明確
```

Codexに渡してはいけない状態です。

```text
- 採用仕様が未決定
- R段階 / Aレベルが未判断
- 変更範囲未確定
- 契約変更の要否が未判断
- 削除判断が未判断
- 移行方針が未判断
- R3以上なのにDecision Recordがない
- 削除・破壊的変更なのにDelete / Breaking Change Gateが未通過
- 何をもって完了か不明
```

## 11. 実装後はChatGPTで差分精査する

実装後、最初にテスト結果を信じ切らず、diffを確認します。

```text
確認すること:
- Change Planに対応する差分か
- Change Plan外の変更がないか
- 変更禁止範囲に触れていないか
- Request / Decision / Change / Acceptance / Verification が対応しているか
- R段階 / Aレベルに応じた必須成果物が揃っているか
- R3以上の場合、Decision Recordと反対仮説レビューに対応しているか
- 削除・破壊的変更の場合、Delete / Breaking Change Gateに対応しているか
- 採用仕様を超えた仕様変更がないか
- 削除対象外の互換性を壊していないか
- URL / UX / アクセシビリティ / data contract の副作用がないか
- Rouault固有契約を壊していないか
- 手動確認項目が未実施の場合、その理由が完了判定に持ち越されているか
- R段階またはAレベルを上げるべき実diffがないか
```

## 12. 完了判定

完了にしてよい条件です。

```text
- RequestとDecisionが対応している
- DecisionとChangeが対応している
- ChangeとAcceptanceが対応している
- AcceptanceとVerificationが対応している
- out-of-scopeが明示されている
- テスト・CI・差分精査が完了している
- 手動確認項目が設定されている場合は実施済み、または未実施理由が記録されている
- 未検証項目が完了条件に残っていない
- R3以上の場合、Decision Recordが存在し、Changeと対応している
- 削除・破壊的変更の場合、Delete / Breaking Change Gateが完了している
- 削除、移行、互換性影響がある場合は扱いが記録されている
- rollback方針が記録されている
- deprecation方針が必要な場合に記録されている
- migration失敗時の扱いが必要な場合に記録されている
- A1/A2の場合、Evidence保全要件が満たされている
- コミットメッセージに採用判断と変更意図が反映されている
```

## 13. R4/A2を使う条件

通常はR4/A2を使いません。次の場合だけ、Phase分割と追加の検証成果物を使います。

```text
- 一括レビュー不能
- 複数Phaseへ分割しないと破綻する
- 外部監査、証拠保全、private / restricted Evidenceが必要
- Closure AttestationまたはA2 Evidence Integrity Attestationが必要
- 後日、Phaseごとの状態遷移と成果物完全性を機械検証したい
```

feature-change内にR4/A2専用validatorは含めません。既存のR4/A2検証の仕組みを使う場合は、対象Phase、Evidence保存場所、A2 redaction方針、検証コマンドをChange Planに明示します。

## 14. 終了基準

この運用フローは、次を満たしたら終了します。

```text
- 採用仕様が実装に反映されている
- Change Plan外へ逸脱していない
- 変更禁止範囲に触れていない
- 必要なテスト、CI、手動確認が完了している
- R3以上のDecision Recordが必要な場合に記録済み
- Delete / Breaking Change Gateが必要な場合に完了済み
- 互換性、削除、移行、アクセシビリティ、URL、UX影響が処理済みまたはout-of-scopeに記録済み
- A1/A2 Evidence保全要件が必要な場合に満たされている
- コミットメッセージにDecisionとChangeの意図が反映されている
```
