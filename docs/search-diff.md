1. search-specification.md の修正

1-1. §17.2「起動」を置換する

理由
現状は open-search-dialog と Cmd+K/Ctrl+K だけが並んでおり、search-trigger.md の外部起動イベントと search-dialog.md の component-local request event の区別が文面上ありません。


⸻

1-2. §17.6「選択時動作」を置換する

理由
現行文言は「Enter またはクリックで選択した候補へ遷移する」ですが、search-dialog.md は明示的に「選択通知のみ、遷移しない」と定めています。これは最優先で揃えるべきです。


⸻

1-3. §17.5 の直後に「共有検索コアとの接続」を追加する

理由
SearchResultItem と UiSearchDialogItem の対応規約が暗黙です。ここを固定すると、canonicalUrl / pathLabel / url の意味が文書間で揺れません。


⸻

2. search-dialog.md の修正

2-1. 「入力契約」の query 行を修正する

理由
現状は「検索評価時は trim() 後の値を使います」と読めますが、検索の正規化正本は search-specification.md 10 章です。ここは trim() 専用ルールに見えないように直した方がよいです。確度【高】。 ￼  ￼

現行の問題点
query が UI 文書側で独自正規化規則を持っているように見えます。


⸻

2-2. 「公開イベント契約」にイベント語彙の差を明記する

理由
ui-search-dialog-open-requested と open-search-dialog が同列に読める余地を消します。


⸻

2-3. 「検索項目契約」の直後に shared search-core 統合規約を追加する

理由
現在の UiSearchDialogItem は汎用ですが、Rouault 本体では shared search-core を使う方針がすでに本文にあります。そこを API 契約側にも落とすべきです。


⸻

3. search-trigger.md の修正

3-1. 「検索ダイアログ統合契約」に event vocabulary の接続文を追加する

理由
この文書単体では整合していますが、search-dialog.md と横断すると対応表がないため、統合時に迷います。


⸻

3-2. 「グローバルショートカット統合契約」に起動経路の統一文を追加する

理由
Cmd+K/Ctrl+K が spec にあり、trigger 側はショートカット非責務です。両者の接続文があるとよいです。


⸻

4. search-field.md の修正

4-1. 必須修正ではありませんが、冒頭の自己管理表現を少しだけ補強すると安全です

理由
この文書は後段で ui-search-dialog 統合時の controlled 接続をきちんと書いているため、重大な不整合はありません。ただし冒頭だけ読むと「常に自己管理」と誤解する余地があります。


⸻

4-2. 「入力・change 契約」に検索意味論非責務を 1 行追加する

理由
現状でもほぼ書けていますが、search-specification.md との責務境界をさらに明示できます。