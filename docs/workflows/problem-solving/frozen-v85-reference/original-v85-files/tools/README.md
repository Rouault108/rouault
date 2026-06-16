# Rouault workflow validator tools

このディレクトリは、v80で追加しv85でCompletion / Closureゲート検証とmanifest mode検証まで補強した最小validator実装です。

## セットアップ

```bash
python -m pip install -r tools/requirements.txt
```

## サンプル一括検証

```bash
python tools/validate-workflow-artifacts.py --sample-manifest samples/manifest.json
```

## 個別検証

```bash
python tools/validate-workflow-artifacts.py \
  --schema schemas/r4-execution-ledger.schema.json \
  --file samples/valid/r4-s-execution-ledger.min.json \
  --mode structural

python tools/validate-workflow-artifacts.py \
  --schema schemas/r4-execution-ledger.schema.json \
  --file samples/valid/r4-s-execution-ledger.lifecycle-passed.json \
  --mode completion
```

このvalidatorは完全な本番実装ではありません。JSON Schema検証に加えて、R4 Execution Ledgerの関連ID理由、Phase ID対応、necessity / evaluation_resultの許容組合せ、status基本遷移、event_class別の許容遷移、PhaseごとのEvent列整合、主要ID重複を最小限検証します。`--mode completion`では、R4 Completion / Closure入力としての終端status不変条件も検証します。

`--schema` / `--file` にはroot相対パスまたは絶対パスを指定できます。root外の絶対パスを指定した場合も、表示用パスは絶対パスのまま出力し、`Path.relative_to()`由来のTracebackを発生させません。

## v82追加のEvent列検証

validatorは、`phase_execution_event_log`を`qualified_phase_id`ごとにグルーピングし、次を検証します。

```text
- 各Phaseの最初のeventは event_class=initialization かつ N/A -> planned である
- 同一Phaseの後続eventでは、直前eventの to_status と現在eventの from_status が一致する
- cancelled / superseded 到達後に後続eventを追加しない
- event_class別の許容遷移は initialization / progress / transition / outcome / retirement ごとに検証する
```

## v83追加のValidation mode

```text
structural:
  Schema、Phase ID対応、necessity/result組合せ、status遷移、event_class、PhaseごとのEvent列整合を検証する。
  planned / ready / in-progress / blocked / failed で終わる途中Ledgerも、構造的に正しければ許容する。

completion:
  structuralの全検証に加え、R4 Completion / Closure入力としての不変条件を検証する。
  required / conditional-activated / optional-executed は passed 終端を要求する。
  conditional-not-activated / optional-not-run は cancelled 終端を要求する。
  planned / ready / in-progress / blocked / failed 終端は拒否する。
  superseded 終端は、terminal eventのreasonに superseded by / replacement / replaced by のいずれかを含み、かつ置換先R4P-* Phase IDまたはIssue incomplete参照を含む場合のみ許容する。
```

## v85追加の検証

```text
manifest mode:
  samples/manifest.json の mode は structural / completion のみ許可する。
  誤記はmanifest-errorとして扱い、サンプル検証を継続しない。

superseded grounding:
  structural / completion の両modeで、superseded終端eventのreasonに置換根拠を要求する。
  根拠は、superseded by / replacement / replaced by のmarkerに加え、置換先R4P-* Phase IDまたは `Issue incomplete: <ID>` 形式の具体参照を含む必要がある。置換先Phase IDは自Phase以外でLedger内に存在する必要があり、completion modeでは置換先Phaseが完了済みである必要がある。

necessity evaluation order:
  phase_necessity_evaluation_logの正本順序はJSON配列順とする。
  同一Qualified Phase IDに複数評価がある場合、completion modeでは配列上の最後の評価を最新評価として採用する。
  同一Phaseの評価eventでは、plan_revisionとtimestampが逆行してはならない。
```

plan revision / chronology:
同一PhaseのPhase Execution Event Logでは、plan_revisionとtimestampが逆行してはならない。Ledger内の各plan_revision系fieldはcurrent_plan_revisionを超えてはならない。
