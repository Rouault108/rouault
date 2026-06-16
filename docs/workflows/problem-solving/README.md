# Rouault 問題解決ワークフロー 運用入口

このディレクトリは、Rouaultで問題が発覚した後、ChatGPTを主体として原因特定、修正方針策定、Codexによる限定実装、差分精査、検証、完了判定まで進めるための運用資産です。

## 最初に読むもの

```text
quick-start.md
```

日常運用では `quick-start.md` だけを入口にします。必要になった時だけ、詳細文書やR4/A2 validatorへ移動します。

## 構成

| パス | 用途 |
|---|---|
| `quick-start.md` | 日常運用の薄い入口。R判定、ChatGPT/Codexの使い分け、完了までの最短手順 |
| `prompts/` | ChatGPT / Codexへ渡す短縮プロンプト |
| `full-workflow/` | v85から抽出した詳細手順。迷った場合の参照先 |
| `r4-validation/` | R4 / A2だけで使うSchema、validator、samples |
| `frozen-v85-reference/` | v85完全版の凍結参照。通常は編集しない |

## 運用原則

```text
- ChatGPTは調査、原因整理、修正方針策定、Codexプロンプト作成、差分精査を担当する
- CodexはFix PlanまたはRun Cardで限定された実装だけを担当する
- 人間が最終判断、採否、コミット、マージを行う
- R4/A2 validatorは例外時だけ使う
- 軽微な問題にR4/A2の重い成果物を要求しない
```
