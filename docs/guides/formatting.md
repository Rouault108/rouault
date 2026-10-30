# 整形

整形の正本は`biome.json`、lintは`eslint.config.mjs`、型検査は`tsconfig*.json`である。
Biome 2.6.4はformatterだけに使う。Biomeのlinter・assistは無効とし、ESLintの一般検査、型付き安全検査、Web Components検査とtscは維持する。

```powershell
pnpm format    # Biomeで整形して書き込む
pnpm lint:fix  # ESLintで修正し、Biomeで整形する
pnpm lint      # ESLintの検査
pnpm typecheck # アプリ・Node.jsの型検査
```

整形を検査だけ行う場合は`pnpm exec biome format .`を使う。これは既存CIへ新しいgateを追加するものではない。

## 対象と所有者

TS/JS、CSS、JSON/JSONC、YAML、HTML、MarkdownはBiomeが担当する。既存のVCS ignoreに加え、次は自動整形しない。

- `src/generated/**`、`.generated`、`.velite`、`dist`、`custom-elements.json`等の生成物はgeneratorが所有する。
- `pnpm-lock.yaml`はpnpmが所有する。
- `shared/search/suzume-provider-config.json`、`test/fixtures/search/canonical-v3.json`は既存のfingerprint資産として保持する。
- SVGはこの移行前のformatterの対象外なので、新たな対象へ拡大しない。
- `examples/snippets/markdown-basic/core.md`は意図した入力記法を持つ例示原本として保持する。Biome 2.6.4では`H~2~O`後の二空白による改行が失われるため、ファイルを整形対象から除外する。テスト・コンパイルからは除外せず、sub/supと`br`の出力契約を検査する。

MarkdownはfrontmatterとGFMを認識し、段落改行を維持する。`formatEmbeds:false`で例示コードの行番号・highlight注釈・コピー内容を保ち、別設定の`analyzeEmbeds:false`で資料内コードへ新しいlintを持ち込まない。資料の表はセルpaddingや配置指定なしのseparator長が変わってもよい。検査は必要な列・行・値を保持する。

HTML formatterはexperimental機能を明示して使い、`whitespaceSensitivity:strict`とする。これは外部CSSでの`white-space`指定まで推測する設定ではない。`pre`以外の要素で空白・改行をデータとして保持する必要がある場合は、要素直前の`<!-- biome-ignore format: 保持する理由 -->`等で明示する。整形後も表示内容・inline間の空白・フォーム値を保っていることを確認する。既存の正常なHTMLへ一律に抑止コメントを加えない。

例外を追加する前に、意味のある差と空白だけの差、generatorや資産の所有範囲を確認する。表示を合わせるために例示原本の記法を書き換えない。

## Editor

VS Codeでは`biomejs.biome`と`dbaeumer.vscode-eslint`を推奨する。対象言語のdefault formatterはBiomeだけを選び、Prettierなど別のformatterを同じファイルの保存時に重ねない。
ESLintのfixAllは維持できるが、Biomeのimport整理やlintを追加で有効にしない。必要に応じて`pnpm lint:fix`を使い、個人のeditor設定とリポジトリの正本を混同しない。グローバル設定や各開発者の`.vscode`設定をこの移行で変更する必要はない。
