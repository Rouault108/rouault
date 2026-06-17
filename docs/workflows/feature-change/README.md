# Rouault Feature Change Workflow

このディレクトリは、Rouaultで機能の追加、変更、削除、仕様変更、契約変更、移行、内部構造変更を扱うための運用入口です。

## 目的

機能変更では、既存の問題解決ワークフローのように原因を特定するだけでは不十分です。中心になるのは次です。

```text
変更要求
  ↓
現行仕様・現行実装・Rouault契約の確認
  ↓
採用仕様の決定
  ↓
Decision Record / Delete / Breaking Change Gate の要否判定
  ↓
Change Plan策定
  ↓
限定実装
  ↓
diff精査
  ↓
検証
  ↓
完了判定
```

## 対象とする変更

```text
- 機能追加
- 機能変更
- 機能削除
- 仕様変更
- UI / UX変更
- URL / routing変更
- データ形式変更
- コンポーネント境界変更
- アクセシビリティ意味変更
- 契約変更
- 中長期保守性を目的とした構造変更
```

## 日常運用

通常は `quick-start.md` を入口にしてください。

```text
1. quick-start.md で入口判定する
2. prompts/01-chatgpt-change-intake.md で変更要求を整理する
3. prompts/02-chatgpt-decision-and-change-plan.md で採用仕様、必要に応じてDecision Record / Delete / Breaking Change Gate、Change Planを作る
4. prompts/03-codex-limited-implementation.md をCodexへ渡す
5. prompts/04-chatgpt-diff-review.md で実装差分を精査する
6. prompts/05-chatgpt-completion-review.md で完了判定する
```



## 運用モード

通常は変更リスクに応じて、次の粒度で進めます。

| 運用モード | 対象 | 必須成果物 |
|---|---|---|
| R1 mini | 仕様判断済みの小変更、少数ファイル、公開契約影響なし | 簡易Change Plan、Acceptance ID、Verification ID |
| R2-lite standard | 日常的な中規模変更、変更意図と境界が明確 | 標準Change Plan、契約影響確認、テスト・手動確認 |
| R3 full | 仕様判断、削除、契約変更、移行、アクセシビリティ意味変更 | Decision Record、反対仮説レビュー、必要に応じてDelete / Breaking Change Gate |

Decision Record、Delete / Breaking Change Gate、A1/A2 Evidence保全要件が不要な場合は、省略ではなく「不要」と判断した理由をChange Planに1行で記録します。

## 問題解決ワークフローとの関係

機能変更の途中で、既存挙動の失敗、回帰、不具合、CIエラーが主要論点になった場合は、`problem-solving` に切り替えてください。

逆に、問題解決中に「既存仕様自体を変える必要がある」と判断した場合は、原因特定を終えたうえで、本ワークフローのDecision段階へ移行してください。

移行時には、最低限次を引き継ぎます。

```text
- 元のFailure ID
- 採用Cause ID
- 仕様変更が必要になった理由
- 新しいRequest ID
- Decision ID候補
- 未解決Evidence
- out-of-scope
```

## R3以上の扱い

R3以上では、通常のChange Planだけで完了扱いにしません。Decision Recordと反対仮説レビューを残し、完了判定で対応を確認します。

## 削除・破壊的変更の扱い

削除、破壊的変更、移行、非推奨化、契約変更では、Delete / Breaking Change Gateを使います。

対象例:

```text
- 公開API
- URL / routing
- DOM構造
- CSS custom property
- custom event
- 永続化形式
- import-export形式
- data contract
- アクセシビリティ属性または意味
```

## Rouault固有契約

Rouaultでは、実装都合だけで読書体験を変えないでください。少なくとも次を確認対象にします。

```text
- 没入して読む体験
- 読書体験
- 視線移動
- スクロール
- URL共有
- タブ状態
- フォーカス
- キーボード操作
- アクセシビリティ
- レスポンシブ性
- 余白
- 遷移
```
