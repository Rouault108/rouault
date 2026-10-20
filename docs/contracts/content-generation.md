# コンテンツ生成

## 所有者と互換面

`build/content/content-schema.ts`がnotes/memosのmetadata検証と出力型、`content-input.ts`と`content-compiler.ts`が入力読込とMarkdown/HTML変換、`generate-content.ts`が公開noteのリンク検証と保存を所有する。CLIの`codegen:content`、`validate:note-links`、Eleventyのbeforeは同じ`generateContent()`をawaitする。Veliteへの依存は持たない。

JSONの保存先は引き続き`.velite/notes.json`と`.velite/memos.json`。同期loader、記事単位のJSON形式、後段の目次・サイドバー・検索生成を維持する。JSON配列順はsource path順に固定し、記事identityや画面の並び順の正本にはしない。memos fixtureの採用条件と検索非掲載を維持する。

## 生成順序

1. 対象Markdown本文、識別子、metadataを一度取得し、metadataを検証する。下書きも変換対象に含む。
2. 検証済みmetadataと既存route関数からproduction/fixtureの分類情報を一度作る。ファイル存在・大小文字・symlink・route衝突検査は維持する。
3. 同じ入力と分類情報を記法policy、リンクカード、相対リンク、preview-sandbox、HTML注釈・契約検証へ渡す。注入情報をfallbackの分類処理より先に参照する。
4. include展開 → 純粋コメント除去・生HTML検査 → directive変換 → URL/ソース位置コピー → カード化・URL書換えの順で処理する。本文やincludeを検証だけのために再読込・再展開しない。include先のサンプルは展開時に読む。展開元refを実行内のリンク情報へ保持する。
5. 今回のnotesを既存`buildNotesCollection`で投影し、`filterPublicNotes`で公開noteを選び、収集済みリンクを検証する。投影でリンク検証用の分類情報を再生成しない。
6. 両JSONのシリアライズと両一時ファイルの書込みを終えてから、notes、memosの順で置換する。
7. EleventyのHTML・passthrough copy、hosting設定コピー、検索生成を完了する。

分類情報は共通生成結果のMapをEleventyのglobal data経由で最終ページ投影にも明示的に渡す。分類情報、URL、ソース位置、診断はJSONへ保存しない。入力群と全依存ファイルの同時点スナップショットは保証しない。独立した複数プロセスによる同じ出力先への並行生成・読込は対象外。

## 失敗と検索配信

開発サーバー稼働中の検索状態はプロセス内で一つ。初期値は利用不可で、beforeの最初に配信を閉じて試行トークンを取得する。before/afterは同じEleventyイベントobjectに結び付くトークンを参照する。configureServerは状態を初期化し直さない。

Eleventy 3.1.2はHTMLとpassthrough copyのpromiseを解決した後にafterをawaitする。記事保存後であり、hosting設定コピーと検索生成まで成功した現在の試行だけが配信を再開する。古いafterは再開できない。before/afterのエラーは開発時もそのまま伝播する。

catalogと`/search/`配下のデータのGET/HEADは、生成中・失敗中は503と`Cache-Control: no-store`を返す。成功後に対象データが欠損しても別のstatic middlewareへ渡さず503にする。検索ページ本体（`/search/`、`/search/index.html`）は制限しない。

置換前の失敗では既存JSONを変更しない。2個目の置換に失敗した場合は世代混在があり得るが、生成入口を失敗させ、後段を止め、配信を閉じる。次回は両方を全生成する。複数JSONの完全同時更新、同期loaderの世代検知、dist全体のrollbackは提供しない。cleanup失敗で元のエラーを隠さない。

## watchと再起動

通常の記事本文・metadataは既存Eleventy watcherが認識した変更を反映する。生成は既存watchループ内ですべてawaitし、独自watcher・自動停止・設定依存集合の追跡は設けない。通常の記事エラーは同じwatchプロセスで修正後の成功から回復する。

初回起動の失敗は修正後に再起動する。設定、スキーマ、コンパイラ、生成入口、Markdownプラグインを変更するときは、先に開発サーバーを停止し、build/watchの終了を確認してから編集し、再起動して全生成する。記事の追加・削除も既存watcherの認識範囲に限定し、反映されなければ再起動する。
