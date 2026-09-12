# Validator sample set

このディレクトリは、`tools/validate-workflow-artifacts.py` の自己検査用サンプルです。

- `valid/`: Schema検証とvalidator意味制約の両方に通る最小サンプルおよびlifecycleサンプル
- `invalid/`: Schema違反、またはSchema通過後のvalidator意味制約違反を起こす最小サンプル
- `manifest.json`: 各サンプルの期待結果

実行例:

```bash
python tools/validate-workflow-artifacts.py --sample-manifest samples/manifest.json
```

重要なのは、次のinvalidサンプルです。これらはJSON Schemaだけでは検出しにくい意味制約違反をvalidatorが検出するためのサンプルです。

```text
invalid/r4-execution-ledger-related-reason-missing-null-kind.json
invalid/r4-execution-ledger-event-phase-without-evidence-map.json
invalid/r4-execution-ledger-invalid-necessity-result.json
invalid/r4-execution-ledger-invalid-status-transition.json
invalid/r4-execution-ledger-initialization-wrong-transition.json
invalid/r4-execution-ledger-missing-initialization.json
invalid/r4-execution-ledger-broken-status-chain.json
invalid/r4-execution-ledger-retirement-wrong-transition.json
```

## v83 completion modeサンプル

`valid/*lifecycle-passed.json` は通常の完了終端、`valid/*lifecycle-superseded.json` は置換終端の正常例です。`superseded`終端は、terminal eventの`reason`に置換markerと置換先R4P-\* Phase IDまたは `Issue incomplete: <ID>` 形式の具体参照を含む場合だけ通します。置換先Phase IDはLedger内に存在し、completion modeでは完了済みである必要があります。このsuperseded根拠検証はstructural modeでも必須です。

```text
valid/r4-s-execution-ledger.lifecycle-passed.json
valid/r4-s-execution-ledger.lifecycle-superseded.json
valid/r4-i-execution-ledger.lifecycle-passed.json
valid/r4-i-execution-ledger.lifecycle-superseded.json
invalid/r4-execution-ledger-completion-required-cancelled.json
invalid/r4-execution-ledger-completion-active-terminal.json
invalid/r4-execution-ledger-completion-superseded-without-grounding.json
```

`manifest.json` の各sampleは任意で `mode` を持つ。省略時は `structural` として検証する。`completion` 指定時は、R4 Completion / Closure前提の終端status不変条件まで検証する。

## v85追加サンプル

```text
invalid/r4-execution-ledger-completion-superseded-marker-only.json
invalid/r4-execution-ledger-necessity-evaluation-revision-regression.json
invalid/r4-execution-ledger-necessity-evaluation-timestamp-regression.json
invalid-manifest-mode.json
```

`invalid-manifest-mode.json`は通常の`manifest.json`には含めない。次のコマンドが非0終了し、mode誤記をmanifest-errorとして出力することを確認するためのサンプルである。

```bash
python tools/validate-workflow-artifacts.py --sample-manifest samples/invalid-manifest-mode.json
```

追加invalidサンプル:

```text
invalid/r4-execution-ledger-completion-superseded-self-replacement.json
invalid/r4-execution-ledger-completion-superseded-missing-replacement.json
invalid/r4-execution-ledger-completion-superseded-generic-issue-incomplete.json
invalid/r4-execution-ledger-event-plan-revision-regression.json
invalid/r4-execution-ledger-event-timestamp-regression.json
invalid/r4-execution-ledger-current-plan-revision-overflow.json
invalid/r4-execution-ledger-current-plan-revision-overflow-phase-map.json
invalid/r4-execution-ledger-current-plan-revision-overflow-attestation.json
```
