const config = {
  // 解析対象とするディレクトリ
  globs: ['src/components/**/*.ts'],
  // 除外するディレクトリ
  exclude: [
    'src/**/*.stories.ts',
    'src/**/*.test.ts',
    'node_modules/**',
    'dist/**',
  ],
  // LitElement 特化のプラグインを有効化
  litelement: true,
  // 出力先
  outdir: './',
};

export default config;
