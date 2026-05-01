# Corpus Guide

この文書は corpus の作成・運用手順である。Corpus の意味と URL 契約は `docs/contracts/corpus.md` を正本とする。

## 作り方

- corpus として扱う content group を決める。
- `corpusKey` は URL に使われるため、安定した短い key にする。
- 表示 label は `_config.json.label` を使う。入力仕様は `docs/contracts/content-config.md` を参照する。

## 運用

- corpus を増やしたら、一覧、header switcher、corpus page が生成されることを確認する。
- genre や tag の分類を corpus key に流用しない。
- URL は `/corpora/{corpusKey}/` になるため、公開後の key 変更は移動として扱う。
