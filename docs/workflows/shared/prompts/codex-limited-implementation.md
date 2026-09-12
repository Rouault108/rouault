# Prompt: Codex限定実装

次の文面へ、承認済みMini Brief、Run Card、Fix Plan、Change Planを貼り付けて使用します。R4 overlayでは、承認済み基本計画、承認済み全体Phase Map、現在Phase Plan、Phase ID、Phase 2以降の既完了Phase結果とGate決定、Phase開始基準を貼り付けます。

```text
Rouaultのlocal repositoryで、以下の承認済み計画に限定して実装してください。
実装仕様は以下の承認済み計画成果物です。Chat／Workの会話履歴、途中案、却下案、未承認成果物から仕様や変更範囲を補完しないでください。計画が参照する仕様・Evidenceとsource-state入力は併せて確認してください。
実装対象の正本は、開始時点のlocal working treeです。参照したGitHub branch／commitは方針作成時の参照情報であり、localを同期する指示ではありません。

開始時に実行するGit確認:
- git branch --show-current
- git rev-parse HEAD
- git status --short

開始差分基準:
- working treeがcleanなら、branch／HEADとcleanなstatusを記録する
- dirtyでも既存差分pathと今回の許可範囲が交差せず、帰属をpath単位で判定できる場合は、機械可読なstatusと既存差分pathだけを記録し、全patchまたは内容snapshotを作成しない
- 既存差分pathと今回の対象が交差する、またはpathだけでは帰属を判定できない場合だけ、判定に必要な交差pathの開始patchまたは既存untracked fileの開始内容を比較可能に保持する。binaryも必要な対象だけ比較可能にする
- 開始内容を保持する場合はrepository外またはworking treeへ影響しない一時領域に置き、完了適合性精査が終了するまで保持する。A0では精査後に破棄できる
- dirtyであることだけを理由に全既存差分またはcleanなtracked file全体を複製・hash化しない

R4 overlayでは、通常実装の軽量基準ではなく、`r4-phased.md`で定めたPhase開始基準を各Phase実装直前に適用し、前Phaseまでの承認済み状態を含めてください。Phase対象範囲に限定したdiffは補助情報として取得して構いませんが、既存local差分を保持した唯一の根拠にしないでください。Phase開始snapshotは人間のPhase Gate終了まで保持してください。

開始差分基準が通常のrepository権限と一時領域管理では不十分な機微情報を含み、承認済み計画でA2が発火している場合は、redaction、権限、保存場所に従ってください。repositoryが非公開であることだけではA2を発火させません。A2未発火のまま機微情報が判明した場合は、raw snapshotを作成・共有せず停止して報告してください。

禁止するGit操作:
- fetch、pull、push
- checkout、switch、reset、rebase、merge
- clean、stash、commit
- git add、git restore --staged、git rm --cached、git update-index
- remote-tracking refの更新

承認済み計画:
[Mini Brief／Run Card／Fix Plan／Change Planを貼り付ける。R4 overlayでは、承認済み基本計画、承認済み全体Phase Map、現在Phase Plan、Phase ID、Phase 2以降の既完了Phase結果とGate決定、Phase開始基準を貼り付ける]

実装条件:
- 対象ファイルと許可範囲だけを変更する
- R4 overlayでは現在Phase Planだけを実装し、将来Phaseを先取りしない
- 既存local差分を保持する。差分帰属に曖昧さがある場合だけ開始差分基準と終了時状態を比較し、今回追加した差分を分離する
- R4 overlayでは現在Phase差分を既存local差分／前Phase差分から分離する
- indexを変更しない。ユーザーの明示的依頼なしにgit add、git restore --staged、git rm --cached、git update-indexを実行しない
- 実装中に新規作成したuntracked file、変更した既存untracked file、削除した既存untracked fileはstageせず、内容またはdiff相当表現を完了精査へ渡す
- 通常のgit diff／git diff --cachedだけでuntracked fileを網羅したとみなさない
- 計画で定めたownerとsource of truthに従う
- 未計画のfallback、compatibility shim、新旧並行経路を追加しない
- out-of-scope、変更禁止範囲、採用していないOptional改善へ触れない
- テスト期待値を実装へ合わせるだけの変更をしない
- generated files、lockfile、docsを変更する場合は計画に明示された範囲に限定する
- 仕様、契約、owner、source of truth、削除、移行、アクセシビリティ上の意味を再判断しない
- 計画前提とlocal構造が異なり、上記の再判断が必要な場合は推測で実装せず報告する
- commit、push、mergeを行わない

検証:
- 計画に記載されたVerificationを実行する
- 実行したコマンド、cwd、exit code、結果を報告する
- 実施できない検証は理由を明示する

報告:
承認済み計画への適合と完了条件を追跡できる最小限にしてください。計画時のDecision、代替案、Evidence取得過程を再記述しないでください。

1. 開始時のbranch、HEAD、working tree要約
2. cleanな開始状態、dirty非交差のpath-level基準、または帰属曖昧時の開始差分基準
3. 変更ファイルと対象箇所
4. ChangeとSuccess／Acceptanceの対応
5. R4 overlayの場合だけPhase ID、開始条件、完了条件、既完了Phase結果／Gate決定への対応
6. 実装後変更集合: tracked staged／unstaged差分、変更・削除した既存untracked file、実装中に新規作成したuntracked fileの内容またはdiff相当表現。binaryはpath、種類、サイズ、hashと確認結果
7. Source-state integrity: pass／indeterminate／fail。passの場合は詳細を省略し、indeterminate／failの場合だけ重複path、index変更、不足する開始基準を説明する。R4では現在Phase差分と既存local差分／前Phase差分の分離も示す
8. Verification結果
9. 計画で発火したowner／source of truth／Gate／rollbackへの対応
10. 未計画のfallback、shim、並行経路を追加していないこと
11. 既存local差分を保持し、indexを変更していないこと
12. 計画との差異、未解決事項、out-of-scope
13. commit、push、mergeを行っていないこと
```
