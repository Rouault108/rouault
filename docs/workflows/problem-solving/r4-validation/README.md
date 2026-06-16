# R4 / A2 validation pack

このディレクトリは、R4 / A2の例外時だけ使う補助資産です。日常的なR0〜R3修正では使いません。

## 使う条件

```text
- 一括レビュー不能なR4変更
- PhaseごとのExecution Ledgerが必要
- Artifact Manifest / Manifest Anchorが必要
- A2 Evidence Integrity Attestationが必要
- R4-A Closure Manifest / Closure Attestationが必要
```

## 実行

```bash
python -m pip install -r tools/requirements.txt
python tools/validate-workflow-artifacts.py --sample-manifest samples/manifest.json
```

## 個別検証

```bash
python tools/validate-workflow-artifacts.py   --schema schemas/r4-execution-ledger.schema.json   --file samples/valid/r4-s-execution-ledger.lifecycle-passed.json   --mode completion
```

## 注意

このvalidatorは、R4/A2成果物の補助検証です。ChatGPT/Codexの日常運用フローの入口ではありません。
