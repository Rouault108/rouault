# 日本語表記ガイド

## 方針

Rouaultの日本語本文、公開コピー、docs、contentでは、和文中の半角英数字と日本語文字の境界に原則として半角スペースを入れない。

読書面では、対応ブラウザーに限りCSSの`text-autospace`で表示上の和欧間・和数字間アキを扱う。本文Markdown、docs、contentに和欧間アキ目的のU+0020を入れない方針は維持する。

## 保持する表記

英語正式名称、書名、論文名、規格名、製品名、ライセンス名、引用、外部由来表記は保持する。

コード、コマンド、URL、ファイルパス、識別子、frontmatter key、Markdown記法そのものは保持する。

コード、コマンド、URL、ファイルパス、識別子、数式、楽譜などの記号的表示では、表示上の自動アキも抑制する。

数値と単位の内部スペースは保持する。

Markdown表のpipe delimiter周辺padding spaceは保持する。

## inline code span周辺

inline code spanと和文助詞・説明文の境界にある説明用スペースは、Markdown構文を壊さない範囲で原則削除する。
