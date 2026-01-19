export default {
  /** 解析対象とするディレクトリ */
  globs: ['src/components/**/*.ts'],
  /** 除外するディレクトリ（テストファイルなど） */
  exclude: ['src/**/*.stories.ts', 'src/**/*.test.ts'],
  /** LitElement特化のプラグインを有効化 */
  litelement: true,
  /** 出力先 */
  outdir: './',
};