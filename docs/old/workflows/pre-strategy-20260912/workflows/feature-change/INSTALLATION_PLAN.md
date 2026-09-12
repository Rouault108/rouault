# Installation Plan: Rouault Feature Change Workflow

このファイル群をRouaultリポジトリへ導入する場合の推奨手順です。

## 1. 配置先

```text
docs/workflows/feature-change/
  README.md
  quick-start.md
  INSTALLATION_PLAN.md
  prompts/
    01-chatgpt-change-intake.md
    02-chatgpt-decision-and-change-plan.md
    03-codex-limited-implementation.md
    04-chatgpt-diff-review.md
    05-chatgpt-completion-review.md
```

zipトップレベルの`README.md`は配布物説明です。Rouaultリポジトリへ導入する場合は、必要に応じて内容を既存READMEへ統合してください。

## 2. 既存problem-solvingとの関係

`docs/workflows/problem-solving/`は削除・移動・改名しないでください。

本ワークフローは、問題解決ワークフローの置換ではなく、機能変更用の並列ワークフローです。

## 3. READMEからの導線

Rouault側のワークフロー一覧に、次の導線を追加してください。

```markdown
- `docs/workflows/problem-solving/`: 不具合、回帰、CIエラー、失敗原因の特定と修正
- `docs/workflows/feature-change/`: 機能追加、仕様変更、削除、移行、契約変更
```

## 4. 導入後の確認

```bash
git status --short
find docs/workflows/feature-change -type f | sort
git diff -- docs/workflows/feature-change
git diff -- docs/workflows/problem-solving
```

Markdown lintまたはリンクチェックの既存コマンドがある場合は、プロジェクトの既存コマンドに従ってください。既存コマンドがない場合は、未実施理由を記録してください。

確認観点:

```text
- feature-change配下の想定ファイルが揃っている
- problem-solving配下を誤って変更していない
- README導線が壊れていない
- Markdownの見出し、コードフェンス、リンクが壊れていない
```

## 5. out-of-scope

この導入計画は、次を含みません。

```text
- problem-solvingワークフローの改名、削除、構造変更
- R4/A2 validatorの改造
- 既存CI設定の変更
- アプリ実装コードの変更
```
