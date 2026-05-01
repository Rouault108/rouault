この文書は現行契約の正本ではない。現行契約は docs/contracts/、Design System 契約は docs/design-system/ を参照する。

---

# 閲覧対象コーパス仕様書

## 位置づけ

この文書は、Rouault における「閲覧対象コーパス」の意味と URL 契約、ヘッダーの切替動作を定義する。

現行実装の主な参照点は次のとおり。

- [`src/data/corpusPages.ts`](../src/data/corpusPages.ts)
- [`src/corpora.11ty.ts`](../src/corpora.11ty.ts)
- [`src/components/corpus/corpus-page.ts`](../src/components/corpus/corpus-page.ts)
- [`src/components/layout/layout-header.ts`](../src/components/layout/layout-header.ts)
- [`src/layouts/BaseLayout.11ty.ts`](../src/layouts/BaseLayout.11ty.ts)

## 1. 目的

コーパスは、個人メモ全体を「どのまとまりで読むか」を切り替えるための一次導線である。

`genre` がノート内の分類ラベルであるのに対し、コーパスはサイト全体の閲覧単位である。両者は別概念であり、相互に置き換えない。

## 2. コーパスの定義

現行設計では、コーパスは `content` 配下のノート群をトップレベルのスラッグ単位で束ねたものとする。

例:

- `content/music/...` は `music` コーパス
- `content/computer-science/...` は `computer-science` コーパス

コーパスの境界は `genre` では決めない。

ただし、`testing` 配下は内部検証用の導線として扱い、コーパス一覧やコーパス切替 UI の公開対象には含めない。

## 3. コーパスラベル

コーパスの表示ラベルは次の優先順位で決める。

1. `content/<corpus>/_config.json` の `label`
2. 同名コーパスの表示に使えるディレクトリ名から導出したラベル

`content/music/index.md` のような directory-index がある場合、その `title` はコーパスページ自体の題名として扱う。

`_config.json.label` がないコーパスは、ディレクトリ名を整形したラベルを使う。

## 4. コーパスページ

各コーパスには専用ページを持たせる。

- URL 形式: `/corpora/{corpusKey}/`
- 生成元: `corpusPages` の Eleventy pagination
- 表示内容: そのコーパスに属する公開ノート一覧

コーパスページは検索ページの代替ではなく、単一コーパス内を静かに読むための入口である。

## 5. ヘッダーの意味

ヘッダー左上のドロップダウンは、コーパス切替 UI として扱う。

役割は次のとおり。

- 現在どのコーパスを読んでいるかを示す
- 別のコーパスへ即時に切り替える
- ルーティング中も現在のコーパス状態を維持する

ヘッダーは `corpora-json` と `current-corpus-key` を受け取り、表示と同期に使う。

## 6. URL 契約

コーパス URL は canonical に `/corpora/{corpusKey}/` を使う。

この URL は以下を満たす。

- 共有可能である
- 現在の閲覧対象を復元できる
- SPA 遷移後も同じ状態に戻せる

`/tags/...` はタグページであり、コーパスページとは別物である。

## 7. データ契約

`src/data/corpusPages.ts` は次を担う。

- 公開ノートの収集
- コーパス単位へのグルーピング
- ラベル解決
- ヘッダー用ナビゲーション生成

コーパス一覧は note の `genre` から生成しない。`genre` はあくまでノートの分類タグとして残す。

## 8. 振る舞い

コーパスページは、コーパス内の公開ノートを新しい順で表示する。

空のコーパスでは空状態を表示し、別コーパスへの切り替えを促す。

ヘッダー切替では、内部的に `navigateToUrl()` を通して遷移するため、通常のリンク遷移と SPA 遷移の両方で整合する。

## 9. 非目的

この設計は次を目的としない。

- `genre` をサイト全体の一次分類に置き換えること
- タグページを廃止すること
- サイドバーの階層構造をコーパスに置き換えること
- `content/_config.json` をコーパス定義ファイルにすること

## 10. 運用メモ

- コーパス追加は、まず `content/{corpusKey}/...` にノートを置くことで発生する
- コーパス名を見やすくしたい場合は、`content/{corpusKey}/_config.json` に `label` を定義する
- `content/{corpusKey}/index.md` の `title` は、コーパスページの題名として別途設計する
- 既存の `genre` 追加は、コーパス追加とは別の変更として扱う
