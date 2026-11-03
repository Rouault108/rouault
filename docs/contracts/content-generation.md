# コンテンツ生成

## 所有者と互換面

`build/content/content-schema.ts`がnotes/memosのmetadata検証と出力型、`content-input.ts`と`content-compiler.ts`が入力読込とMarkdown/HTML変換、`generate-content.ts`が公開noteのリンク検証と保存を所有する。CLIの`codegen:content`、`validate:note-links`、Eleventyのbeforeは同じ`generateContent()`をawaitする。Veliteへの依存は持たない。

memosのsourcePathはnested `index.md`を含む元のsource identityを保持し、canonical URLの末尾index除去と混同しない。

JSONの保存先は引き続き`.velite/notes.json`と`.velite/memos.json`。同期loader、記事単位のJSON形式、後段の目次・サイドバー・検索生成を維持する。JSON配列順はsource path順に固定し、記事identityや画面の並び順の正本にはしない。memos fixtureの採用条件と検索非掲載を維持する。

## 生成順序

1. 対象Markdown本文、識別子、metadataを一度取得し、metadataを検証する。旧globの採用条件を維持し、先頭underscoreのfileと、dot始まりのfile/directoryを読込前に除外する。underscore始まりのdirectory配下は従来どおり採用する。下書きも変換対象に含む。
2. 検証済みmetadataと既存route関数からproduction/fixtureの分類情報を一度作る。ファイル存在・大小文字・symlink・route衝突検査は維持する。
3. 同じ入力と分類情報を記法policy、リンクカード、相対リンク、preview-sandbox、HTML注釈・契約検証へ渡す。注入情報をfallbackの分類処理より先に参照する。
4. include展開 → 純粋コメント除去・生HTML検査 → directive変換 → URL/ソース位置コピー → カード化・URL書換えの順で処理する。本文やincludeを検証だけのために再読込・再展開しない。include先のサンプルは展開時に読む。展開元refを実行内のリンク情報へ保持する。
5. 今回のnotesを既存`buildNotesCollection`で投影し、`filterPublicNotes`で公開noteを選び、収集済みリンクを検証する。投影でリンク検証用の分類情報を再生成しない。
6. 両JSONのシリアライズと両一時ファイルの書込みを終えてから、notes、memosの順で置換する。
7. EleventyのHTML・passthrough copy、hosting設定コピー、検索生成を完了する。

分類情報は共通生成結果のMapをEleventyのglobal data経由で最終ページ投影にも明示的に渡す。分類情報、URL、ソース位置、診断はJSONへ保存しない。入力群と全依存ファイルの同時点スナップショットは保証しない。独立した複数プロセスによる同じ出力先への並行生成・読込は対象外。

## 数式の診断

共通コンパイラーはparseとrunに同じVFileを渡し、不正TeXの非fatal診断を記事やリンクと別の`diagnostics`として返す。通常の本文とincludeを診断のために再読込・再展開しない。診断のために原稿、記事identity、HTML、heading ID、公開hashを変更しない。

コンパイラーは同じVFileから診断を回収した時点で呼出元のreporterへ一度通知する。同一文書の数式後の変換や契約検査が失敗しても、生成済み警告を通知して元の例外を伝播する。後続文書やリンク検査が失敗しても、既出通知は取り消さない。`compileContentInputs`は入力順に診断を集約し、再度表示しない。同じ式でも別の発生箇所は別診断とし、位置不明の複数件もまとめて消さない。

`codegen:content`、`validate:note-links`、Eleventyのbeforeは共通reporterを指定し、警告をstderrへ表示する。低レベルのコンパイルAPIは既定で表示しない。診断の戻り値を入口で再度表示しない。watchでは生成試行ごとに再報告し、修正後の試行では警告が消える。プロセス全体をまたぐ重複除去は行わない。

表示は相対source label、取得できた行・列、source/ruleId、安全に分類した短い理由を一行にまとめる。式全文、絶対path、stack、制御文字を警告へ流さない。通常本文の行はfrontmatterを含む原稿位置へ補正し、inline式または数式ブロックの開始位置として扱う。KaTeXの式内offsetを文書の列へ直接足さない。include由来の式は展開元refを保持し、元の原稿位置を保証できない場合は行・列を推測しない。

不正TeXの警告だけなら終了コード0を維持し、escaped error表示、JSON保存、後段の生成を続ける。予期しないrenderer例外、記法の安全検査、schema、リンク、保存の失敗は従来どおり伝播する。KaTeX自身の`strict: "warn"`によるUnicode・フォント警告は別経路として維持する。

memo importの見出し索引・中間展開・asset discoveryでは診断を新たに表示しない。確定して取り込まれたMarkdownは通常のコンテンツ生成で診断する。importは複数の検証buildを実行するため、操作全体で一度だけの表示は保証しない。外部private Metis handlerへの構造化診断の返却とstrict callbackの統合は別の対応範囲である。

## 失敗と検索配信

開発サーバー稼働中の検索状態はプロセス内で一つ。初期値は利用不可で、beforeの最初に配信を閉じて試行トークンを取得する。before/afterは同じEleventyイベントobjectに結び付くトークンを参照する。configureServerは状態を初期化し直さない。

Eleventy 3.1.2はHTMLとpassthrough copyのpromiseを解決した後にafterをawaitする。記事保存後であり、hosting設定コピーと検索生成まで成功した現在の試行だけが配信を再開する。古いafterは再開できない。before/afterのエラーは開発時もそのまま伝播する。

catalogと`/search/`配下のデータのGET/HEADは、生成中・失敗中は503と`Cache-Control: no-store`を返す。成功後に対象データが欠損しても別のstatic middlewareへ渡さず503にする。検索ページ本体（`/search/`、`/search/index.html`）は制限しない。

置換前の失敗では既存JSONを変更しない。2個目の置換に失敗した場合は世代混在があり得るが、生成入口を失敗させ、後段を止め、配信を閉じる。次回は両方を全生成する。複数JSONの完全同時更新、同期loaderの世代検知、dist全体のrollbackは提供しない。cleanup失敗で元のエラーを隠さない。

## watchと再起動

通常の記事本文・metadataは既存Eleventy watcherが認識した変更を反映する。生成は既存watchループ内ですべてawaitし、独自watcher・自動停止・設定依存集合の追跡は設けない。通常の記事エラーは同じwatchプロセスで修正後の成功から回復する。

初回起動の失敗は修正後に再起動する。設定、スキーマ、コンパイラ、生成入口、Markdownプラグインを変更するときは、先に開発サーバーを停止し、build/watchの終了を確認してから編集し、再起動して全生成する。記事の追加・削除も既存watcherの認識範囲に限定し、反映されなければ再起動する。
