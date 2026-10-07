# メモmetadata

`content/memos/**/*.md`の公開frontmatterは非空の`title`、任意のISO `date` / `updated`、`license: CC BY 4.0`だけを許可する。本文はMarkdown bodyであり、frontmatterに`content`を書かない。Velite内部のslug/content処理を著者用metadataとして公開しない。

`publish`、aliases、tags、genre、private source SHA、repository URL、vault絶対path、任意keyを転記しない。Noteのkind/status/config/stampは適用しない。入力の承認はMetis側の手動importerが所有する。

本文は既存Markdown、安全性、画像、TOC、scheduler/registryを共用する。raw HTML禁止を維持する。メモ一覧はtitle昇順（日本語locale）、同名時canonical pathname昇順。excerpt、tag、検索を追加しない。

メモchromeは左sidebarなし、breadcrumbあり、見出しがある場合desktop右TOCとmobile panelあり。本文にarchive・Permanent URL action・corpus・tagsを追加しない。本文と一覧には、本文CC BY 4.0と第三者素材の権利条件が別である旨を表示する。
