# 共通コンパイラ移行の検証記録（2026-10-20）

## 対象状態と承認範囲

開始HEAD（`work`）とfetch後の`origin/main`はともに`5b79cced2392842ff3c9c7a6d6f0e81d517df1f8`。開始作業ツリーはclean。専用ブランチは`verify/content-compiler-20261020`。mainへのpush/merge/公開、CI設定変更、無関係なTOC検証ブランチの取込み、追加作業スレッドは行わない。

AGENTS.mdと既存テスト手順、content/Markdown/metadata/testing契約を確認した。リポジトリに`.agents/skills`はなく、共有`/workspace/.agents`も空だった。実行環境はLinux、Node 24.19.0。依存変更は指定pnpm 11.7.0で行う。

## Decision / Change Plan（R3）

ユーザーが明示承認した改訂設計と補足を採用する。スキーマ・コンパイラ・生成入口へVeliteの責務を移し、実行内入力/分類を共有する。保存形式、同期loader、URL、公開条件、後段のTOC/sidebar/searchは維持する。検索配信は成功した現在の試行だけで再開する。設定等は停止後に編集して再起動する。

削除/migration gateの対象はVelite依存とconfig。互換比較を行ってからCLI/Eleventyを切替え、依存とconfigを撤去する。独自watcher、設定変更の自動完全検知、世代manifest、複数JSONの完全同時置換は追加しない。変更責務はbuild/content、既存Markdownプラグインへのcontext注入、dev検索配信に限定する。

## 互換比較

開始SHAの旧Veliteでnotes 55件、通常memos 3件、fixture有効memos 5件を保存した。旧本番ビルドと新本番ビルドはいずれも成功。`ROUAULT_SITE_ORIGIN=http://127.0.0.1:4173`、build ID/label=`content-compat`、generatedAt=`2026-10-20T00:00:00.000Z`を共通指定した。

移行前distの保存時点はEleventy完了後・検索emitter完了前だったため、保存した旧JSONと旧HTMLに、変更のない既存検索emitterを適用してbaselineの検索ファイルを補完した。新JSONや新HTMLからbaselineを作っていない。

| 比較対象                                                                   | 結果                    |
| -------------------------------------------------------------------------- | ----------------------- |
| notes全55件のmetadataと本文HTML                                            | identity別の全field一致 |
| 通常memos全3件 / fixture有効全5件                                          | identity別の全field一致 |
| 最終HTML全72ページ（TOC、sidebarを含む）                                   | 全byte一致              |
| 検索関連全10ファイル（catalog、manifest、data、WASM、license、検索ページ） | 全byte一致              |
| distの追加・欠損path                                                       | 0 / 0                   |

notesのJSON配列順だけはsource pathで決定的に並べるため変わる。記事形式と画面出力の差分ではなく、別項目として記録した。

canonical JSONのSHA-256（field名とidentityで整列）:

- notes：`e65baa06fa8864b435b5740aba685e8835b4bccc66c987dc570170692df52149`
- 通常memos：`3373c0dbe93d1838489667517468a0b8e7ace94a1524872442e0cefba36c855e`

機械可読の全ファイルhashは[比較証拠](content-compiler-artifact-comparison-2026-10-20.json)。実行入口は`scripts/compare-content-artifacts.ts`。

## 意図した変更

互換比較とは別に、検証済みmetadataのpolicyを常に注入すること、純粋なコメントだけを除去しコメント混在HTMLを拒否すること、独自記法URL属性の位置とinclude refを保持することをテストする。notesの未知frontmatterは従来同様除去し、memosは公開metadata以外を拒否する。

## 受入結果

実行結果は検証完了時に追記する。未実施を合格扱いしない。既存CIのskippedも合格扱いしない。

| 受入条件                                                                                                                      | 結果と証拠                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 分類・policy・preview-sandbox・リンクカード・memos相対リンク・HTML正規化/注釈・最終ページ投影・リンク検証で文書を再読込しない | 成功。`test/node/content-compiler.test.ts`で全入力を一度読み、コンパイルと両集合のページ投影後も文書read回数が入力件数のままであることを検証 |
| includeを一度だけ展開し同じ木から検証用URLを取得                                                                              | 成功。同testでサンプルreadが1回、リンク情報に展開元refが存在し、同じ出力にカードが存在することを検証                                         |
| 独自記法のURL属性・ソース位置を保持                                                                                           | 成功。単独/連続directive、frontmatter行offset、収集後の木の変更からの独立を検証                                                              |
| 初回成功まで配信しない、成功後のmiddleware設定で再初期化しない、欠損時もfallbackしない                                        | 成功。`test/ssr/dev-search-availability.test.ts`でGET/HEAD、503/no-store、正常配信、URLエンコード、検索ページ除外をHTTP検証                  |
| 古いafter・進行中afterで別試行の配信を再開しない                                                                              | 成功。`test/node/content-generation-failure.test.ts`                                                                                         |
| 初回失敗後の再起動、通常watch失敗後の修正回復                                                                                 | 成功。隔離コピー内の実Eleventy/Viteプロセスで検証                                                                                            |
| 連続編集の直列生成と最新入力の反映                                                                                            | 成功。実watchで最大同時生成数1、最新markerがJSON/最終HTMLへ到達                                                                              |
| 設定・実装変更は停止後に編集し再起動、全生成で新処理を使う                                                                    | 成功。停止/終了を確認してコピー内のコンパイラを変更し、既存記事と追加記事の両方へ新変換が適用されることを確認                                |
| シリアライズ・両一時書込み・1個目/2個目置換の故障                                                                             | 成功。実一時directoryと注入IOで保存状態を確認。失敗後にafterを渡しても後段を実行せず、次回全生成と後段成功後だけ配信再開                     |
| cleanup失敗は元のエラーを隠さない                                                                                             | 成功。元のError objectがそのままrejectされることを検証                                                                                       |

重点Nodeは19件成功（compiler 8件、failure 11件）。全体Nodeは先行実行で1,261件成功、既存の`test/node/error-handler.test.ts`のXSS escape case 1件はskipped。その後に追加したinclude受入は重点実行で成功した。全体SSRは608件成功、最終接続変更後のmiddleware/plugin-order/Eleventy再検証は17件成功。Chromium browserは982件成功、dev E2Eは45件成功。型検査（app/node）、link contract acceptance、両import boundary assertionは成功。

作業環境の`pnpm lint`はGit管理外の既存`tmp/onboarding-*.config.ts`を型付きlintの対象にして失敗した。これらの既存ファイルは保全した。`tmp/`を除く全sourceのESLintと、その後に変更した各fileのESLintで実装の問題を修正・再検証する。clean checkout上の標準`pnpm lint`の結果は最終SHAの既存CIで確認する。

ローカルのproduction E2E全browser matrixは未実施。既存CIはverifyブランチへのpushだけでは起動しない（push対象はmainのみ）。CI設定は変更せず、既存`workflow_dispatch`をverifyブランチへ要求し、最終SHAのjob結果を最終報告へ記載する。deploy jobのskippedは非公開条件として別扱いにし、テストjobのskippedをテスト成功としない。

実watchの追加故障注入も成功した。隔離コピーのテンプレート、hosting設定コピー、検索emitterへ、それぞれ明示的な故障flagを事前に接続し、稼働中に故障を発生させた。HTML/static/searchのどの失敗でも503を維持し、同じwatchプロセスでflagと記事を修正した後に全工程が成功してから200へ回復した。全9項目の実行結果は[watch証拠](content-compiler-watch-results-2026-10-20.json)。検証後のサーバー停止も完了している。

開始SHAの既存CIは[39183736938](https://github.com/Rouault108/rouault/actions/runs/39183736938)がsuccessだった。今回の最終SHAの結果とは区別する。

残る手動確認は、Windowsでの実watchとファイル置換の実機確認。Linuxでの保存故障・回復は確認済み。すべての記事追加/削除の自動反映、設定依存の完全自動検知、同一出力先の複数プロセス並行実行は設計上の保証外であり、合格を主張しない。
