# コンテンツ集合

登録の実装正本は`build/content/content-collections.ts`。初期集合は`notes`と`memos`の二つであり、`content/notes/`、`content/memos/`だけを文書入力とする。fixtureにも同じ二集合を設ける。`_assets`と`_generated`は文書集合ではない。未登録directoryをNoteとして採用しない。

identityはcollection IDとcollection-relativeな`.md`付きpathの二要素。文字列keyは`contentIdentityKey`が作るJSON配列である。source pathの移動はidentityの変更として扱う。

routeの唯一の所有者は`content-route-registry.ts`。公開採用は`publication-snapshot.ts`が所有し、Velite、link lowering、route scanner、Eleventyは同じ登録とroute関数を消費する。notesのdraftは採用しない。memosにはNote metadata/config/stampを適用しない。

本文のcanonicalはslashless、directory indexは末尾`/index`を除く。root index、leaf/indexの同一URL、大小文字・Unicode NFCで同一になるpath、symlink、範囲外pathを拒否する。memosのleafと配下本文は同居できる。notesの階層制約は既存note navigation契約を維持する。

memosのhome、tags、corpora、search掲載とarchiveは集合として禁止する。個別metadataで解除できない。notesの個別掲載方針は既存契約を維持する。

notes移行の許可canonical差分はゼロ。`scripts/validate-content-migration.ts`が設計基点の全既存本文とconfigを照合する。包括的redirect、新旧root並行読取、未登録rootへのfallbackは設けない。

root consumerの移行区分は次のとおり。

| consumer                                                                                             | 採用範囲とowner                                                      |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Velite、source/current URL、link lowering、document route manifest、Eleventy本文                     | 登録されたnotes/memos。collection configとroute registryを消費       |
| notes loader、note navigation/config、note stamp、通常search/home/tags/corpora、note source link検査 | notesだけ。`content/notes/`とnotes用fixtureへ限定                    |
| 画像build                                                                                            | 両集合の公開採用済み本文だけ。画像の既存`content/_assets/`経路を維持 |
| examples展開、link card cache、font/client/media生成                                                 | 文書集合から独立した既存所有者を維持                                 |

旧rootの全notes本文55件とconfig6件をbyte単位で保存し、URL変更の許可集合を空とする。合成memos fixtureはnotesのfixture schemaや通常探索面へ登録しない。Veliteのschema/変換errorはstrict buildで停止し、文書の黙示的な欠落を成功と扱わない。
