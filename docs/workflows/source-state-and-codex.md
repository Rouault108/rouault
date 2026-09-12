# 参照状態・local実装・Codex規則

## 1. 対象状態

ユーザーがlocal差分、diff、branch、commit、working tree、ZIP、個別ファイルを明示した場合、それを当該タスクの正本とします。複数ある場合は、明示された対象範囲と時点を優先します。

対象状態が明示されていない場合、ChatGPTの現行実装調査はGitHub最新`main`を参照します。最初に`AGENTS.md`を確認し、実装、テスト、docs、READMEの優先順位に従います。

GitHub、local HEAD、local working tree、`origin/main`、指定commit、添付ZIPを同一視しません。異なる情報源を黙って混在させず、対象branch、commit、ZIP名、対象ファイル、差異、判断の正本を明示します。

## 2. ChatGPT参照状態とCodex実装対象

ChatGPTの分析・精査はChatまたはWorkで実行できます。実行面と権限の規則は[分析・精査の実行面](analysis-and-review-surfaces.md)を正本とします。Workがlocal folderへアクセスした場合も、folderを開いたこと自体をbranch、HEAD、index、staged／unstaged、untracked、差分帰属の確認根拠とはしません。これらは本書のGit Evidenceによって確認します。

ChatGPTがGitHubを参照して作成した計画は、方針作成時の参照情報です。GitHub上のrepositoryを直接変更する指示でも、localをGitHub最新`main`へ同期する指示でもありません。

Codexの実装対象は、起動時点のlocal working treeです。現在のbranch、local HEAD、staged差分、unstaged差分、untracked files、ユーザーの既存変更を保持します。

## 3. 実装開始前のGit確認と開始差分基準

通常は次に限定します。

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
```

working treeがcleanなら、branch／HEADとcleanなstatusを開始差分基準とします。

既存local差分がある場合も、dirtyであることだけを理由に内容snapshotを要求しません。今回の許可範囲との交差と、差分帰属をpath単位で判定できるかに応じて、次の最小基準を使います。

- 既存差分pathと今回の許可範囲が交差せず、帰属をpath単位で判定できる場合: 機械可読な開始時statusと既存差分pathを記録し、対象外pathへ今回触れていないことを終了時に確認する。全patchまたは内容snapshotは要求しない
- 既存差分pathと今回の対象が交差する、またはrename、部分stage、同一file内の編集範囲などによりpathだけでは帰属を判定できない場合: 判定に必要な交差pathだけ、tracked fileの開始patchまたは既存untracked fileの開始内容を比較可能に保持する。binaryも必要な対象だけ比較可能にする
- 開始内容を保持する場合はrepository外またはworking treeへ影響しない一時領域に置き、完了適合性精査が終了するまで保持する。A0では精査後に破棄できる

開始差分基準は差分帰属の曖昧さを解消する範囲に限定します。通常実装で全既存差分を一律にsnapshotしません。R4ではPhase境界を追跡するため、`audited-mode.md`とR4 promptの開始基準を各Phaseへ適用します。cleanなtracked file全体を複製またはhash化する必要はありません。

必要な場合だけ補助情報として次を取得します。

```powershell
git diff --stat
git diff
git diff --cached
```

ユーザーの明示的依頼がない限り、次を実行または要求しません。

```text
git fetch
git pull
git push
git checkout
git switch
git reset
git rebase
git merge
git clean
git stash
git commit
git add
git restore --staged
git rm --cached
git update-index
```

indexのstaged／unstaged境界もユーザーの既存状態です。ユーザーが明示的に依頼しない限り、レビュー目的を含めてindexを変更しません。remote-tracking refも更新しません。

開始差分基準が通常のrepository権限と一時領域管理では不十分な機微情報を含む場合だけA2を発火させます。repositoryが非公開であることだけではA2を発火させません。実装中に未計画の機微情報が判明した場合、raw snapshotを作成・共有せず停止して報告します。

## 4. 参照状態との差異

GitHub参照状態とlocal working treeに差異がある場合、Codexは次を報告します。

- 現在branchとlocal HEAD
- 関連する既存local差分
- 計画が前提とした構造との差異
- 承認範囲内で計画どおり実装可能か

承認範囲内で実装可能なら、既存差分を保持して継続します。仕様、契約、owner、source of truth、変更範囲の再判断が必要なら、推測で同期・拡張せず停止して報告します。

## 5. Codexの役割

Codexは、承認済みMini Brief、Run Card、Fix Plan、Change Planに限定された実装担当です。R4 overlayでは、承認済み基本計画、承認済み全体Phase Map、現在Phase Plan、Phase ID、Phase 2以降の既完了Phase結果とGate決定、Phase開始基準に限定します。

Codexへ委ねない事項:

- 原因の再解釈
- 仕様判断
- 契約変更
- ownerまたはsource of truthの決定
- 削除、移行、非推奨化の判断
- アクセシビリティ上の意味
- UX、URL、データ、コンポーネント境界、compatibility policy

実装中にこれらの再判断が必要と判明した場合、方針外変更をせず差異を報告します。

## 6. Codexへの必須入力

実装仕様は人間が承認した計画成果物です。Chat／Workの会話履歴、途中仮説、却下案、調査履歴、未承認成果物を実装仕様として補完しません。計画が参照する仕様・Evidenceと次の必須入力は併せて渡します。成果物境界は[分析・精査の実行面](analysis-and-review-surfaces.md)に従います。

- 実装環境がlocal repositoryであること
- 実装対象が現在のlocal working treeであること
- ChatGPTが参照したbranch／commitまたは提示状態
- 承認済み基本計画
- cleanな開始状態、dirty非交差のpath-level基準、または帰属曖昧時の開始差分基準
- R4 overlayの場合だけ承認済み全体Phase Map、現在Phase Plan、Phase ID、Phase 2以降の既完了Phase結果とGate決定、Phase開始基準
- 対象ファイルと対象箇所
- 変更してよい範囲／変更してはいけない範囲
- 実際に変更する契約と維持する契約
- 未計画のfallback、compatibility shim、新旧並行経路を追加しないこと
- SuccessまたはAcceptance
- Verificationの観測対象、判定基準、必要環境
- 既知の場合だけ推奨コマンド
- 発火した場合だけ手動確認、owner、source of truth、rollback、Handoff、Gate
- out-of-scope
- 禁止するGit操作とindexを変更しないこと
- commit、push、mergeを行わないこと

## 7. Codexの報告

報告は、承認済み計画への適合と完了条件を追跡できる最小限でよく、計画時の判断過程を再記述しません。

- 開始時のbranch、HEAD、working tree要約
- cleanな開始状態、dirty非交差のpath-level基準、または帰属曖昧時の開始差分基準
- 変更ファイル
- 計画項目との対応
- R4 overlayの場合だけPhase ID、Phase開始基準、Phase完了条件への対応
- R4 overlayの場合だけ現在Phaseで追加した差分と、既存local差分／前Phase差分との分離
- 実装後変更集合: tracked staged／unstaged差分、変更・削除した既存untracked file、実装中に新規作成したuntracked fileの内容またはdiff相当表現
- indexを変更していないこと
- 実行したコマンドと結果
- 未実施検証と理由
- 未承認の実質的な計画逸脱とout-of-scope変更がないこと
- 参照状態との差異
- 未解決事項とout-of-scope

実装後の変更集合には、tracked fileのstaged／unstaged差分だけでなく、変更・削除した既存untracked fileと、実装中に新規作成したuntracked fileの内容またはdiff相当表現を含めます。通常の`git diff`と`git diff --cached`だけではuntracked fileを網羅しないため、untracked fileをstageせず別途提示します。textは内容またはdiff相当表現、binaryはpath、種類、サイズ、hash、および計画適合性を確認できる実体または確認結果を使用します。

自己申告だけを完了根拠にしません。ChatGPTは必要な開始差分基準、実装後変更集合、最終構造、必要なVerificationを承認済み計画への適合性として確認します。R4の場合だけ、さらに`shared/prompts/r4-completion-overlay.md`のPhase追跡を重ねます。
