# Corpus Guide

この文書はcorpusの作成・運用手順である。Corpusの意味とURL契約は`docs/contracts/corpus.md`を正本とする。

## 作り方

- corpusとして扱うcontent groupを決める。
- `corpusKey`はURLに使われるため、安定した短いkeyにする。
- 表示labelは`_config.json.label`を使う。入力仕様は`docs/contracts/content-config.md`を参照する。

## 運用

- corpusを増やしたら、一覧、header switcher、corpus pageが生成されることを確認する。
- genreやtagの分類をcorpus keyに流用しない。
- URLは`/corpora/{corpusKey}/`になるため、公開後のkey変更は移動として扱う。
