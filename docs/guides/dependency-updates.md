# 依存更新

安定版のうち、Node・TypeScript・peer依存の対応範囲に入る新しい版を優先する。既存のminor系列だけに固定する運用にはしない。実際に採用した直接依存は原則exact指定とし、`pnpm-lock.yaml`と合わせて再現性を保つ。exact指定は将来の意図した更新を妨げるものではない。

## 更新単位

分野ごとに小さな組へ分け、公式registryの配布版、engine・peer条件、公式release notesと移行案内を確認する。ESLint系では`eslint`、`@eslint/js`、`typescript-eslint`、`eslint-plugin-wc`を一緒に評価する。各packageの版番号が一致するとは限らない。parser・plugin等の内部依存は`typescript-eslint`に任せ、別の固定値や版番号一致検査を追加しない。

更新するpackageと版を明示し、全依存を一括でlatestへ変更しない。以下の`<version>`は確認した採用版へ置き換える。

```powershell
pnpm add -D --save-exact eslint@<version> @eslint/js@<version> typescript-eslint@<version> eslint-plugin-wc@<version>
pnpm install --resolution-only --strict-peer-dependencies
pnpm install --frozen-lockfile --strict-peer-dependencies
```

`add`だけをpeer互換性の証明にしない。明示したresolution-only検査で依存全体を解決し、manifest・lockfileの差分を確認する。必要な更新に伴う推移依存と無関係な変更を区別し、空の検証用作業コピーでもfrozen installを確認する。peer override、force install、frozenの解除で不整合を隠さない。

## 検査と採用

ESLintのrecommended・strict presetは更新に追従する。rule名だけでなく、有効scope・severity・options・既存例外を比較し、新しい指摘が意図した検査強化かを確認する。指摘を消すためだけにruleやテストを無効化しない。Biomeは整形のみ、tscは型検査を引き続き担当する。

変更に対応する回帰テスト、lint、アプリ・Nodeの型検査、Node・SSR・browserテスト、production build、note link・import境界・link契約の既存検査を行う。`pnpm lint:fix`後に整形と修正が収束することも確認する。実行環境の制限による未実施項目を成功に数えない。

専用検証ブランチへ保存した最終SHAを、既存の`ci-cd.yml`の`workflow_dispatch`で検証する。branchへのpushだけではE2Eが実行されるとは限らないため、event・branch・head SHAとdev／production E2E全matrixの完了を確認する。検証ブランチの公開jobのskipは公開成功ではない。mainへの取り込み・公開は検証結果を示した後の別承認とし、mainが進んだ場合は差分を再評価する。

最新版TypeScript等がpeer対応を先行した場合は、対応範囲内の版を一時維持し、保留理由と上流の対応確認条件を記録する。その依存だけを保留し、他の互換な更新まで止めない。新しいbot・workflow・恒久的な全rule snapshotを追加することは更新の前提にしない。
