# コンテンツ生成の運用・検証

契約は[コンテンツ生成](../../contracts/content-generation.md)、検証記録は[移行検証](../../references/content-compiler-validation-2026-10-20.md)を参照する。

- `pnpm codegen:content`：metadata・本文・公開noteリンクを検証し、両JSONを保存する。
- `pnpm validate:note-links`：同じ共通入口で全生成とリンク検証を行う。
- `pnpm dev`：通常記事の変更を既存watchで反映する。エラー中の検索データは503になる。修正後のwatch成功を待つ。
- 初回起動のエラーは修正して再起動する。設定・build実装・プラグインの変更は停止と終了確認を先に行い、編集後に再起動する。追加・削除が反映されない場合も再起動する。

受入確認は次を使う。CI設定や本番公開処理は変更しない。

```sh
pnpm exec vitest run --project node test/node/content-compiler.test.ts test/node/content-generation-failure.test.ts
pnpm exec vitest run --project ssr test/ssr/dev-search-availability.test.ts test/ssr/content-compiler.test.ts test/ssr/markdown-plugin-order.test.ts test/ssr/eleventy-config.test.ts
pnpm exec tsx scripts/verify-content-watch.ts
pnpm exec tsx scripts/compare-content-artifacts.ts /path/to/baseline
```

watch検証は作業ツリーを一時directoryへコピーし、そこで記事の故障・修正・連続編集、停止後の実装変更と再起動を行う。実作業ツリーの本文は編集しない。evidence directoryを標準出力と`tmp/content-watch-evidence-path.txt`へ記録する。Nodeの世代はpackageの指定に従う。比較用baselineは移行前SHAで同じsite origin、base path、build ID/label、generatedAtを指定して生成する。`baseline/velite`にJSON、`baseline/dist`に最終成果物を置く。比較は全件記事をidentityで対応させ、配列順の相違は別に記録する。HTML、catalog、検索データはbyte単位で比較し、時刻や本文の値を丸めない。
