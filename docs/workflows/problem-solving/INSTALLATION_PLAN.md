# Rouaultリポジトリ導入計画

このファイル群は、Rouaultアプリの実行時機能ではなく、開発運用資産として導入します。

## 推奨配置

```text
docs/workflows/problem-solving/
  README.md
  quick-start.md
  prompts/
  full-workflow/
  r4-validation/
  frozen-v85-reference/
```

## 導入手順

1. `docs/workflows/problem-solving/` をリポジトリへ追加する。
2. まず `quick-start.md` と `prompts/` だけを日常運用で使う。
3. `full-workflow/` は判断に迷った場合の詳細参照にする。
4. `r4-validation/` はR4/A2に該当した場合だけ使う。
5. `frozen-v85-reference/` は凍結正本として編集しない。

## CIに入れる場合

初期導入時点では、R4/A2 validatorを通常CIへ入れない方がよいです。通常CIに入れると、日常修正に不要な重さが出ます。

R4/A2を運用し始めた後、必要なら手動workflowまたは任意scriptとして次を追加します。

```bash
cd docs/workflows/problem-solving/r4-validation
python tools/validate-workflow-artifacts.py --sample-manifest samples/manifest.json
```

repo rootから実行する場合は、`--root`を明示します。

```bash
python docs/workflows/problem-solving/r4-validation/tools/validate-workflow-artifacts.py \
  --root docs/workflows/problem-solving/r4-validation \
  --sample-manifest samples/manifest.json
```

## Codexへ渡す場合

導入実装をCodexに依頼する場合は、ファイルコピーのみを依頼し、内容再設計はさせません。
