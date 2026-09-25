# Suzume license provenance

`suzume-LICENSE.txt`はCheckpoint Cで取得・検証した公式Suzume 0.9.11の
`official-sources/suzume-license.txt`をそのまま保存している。
同releaseのsource treeでlicense/noticeに該当するファイルは`LICENSE`のみ。
npm配布にLICENSE本文が含まれないため、static WASMの配布と一緒にこの本文を出力する。
MiniSearchのLICENSEは固定依存7.2.0のpackageからwriterが取得する。

ライセンス本文のhashを保つため改行変換は行わない。
