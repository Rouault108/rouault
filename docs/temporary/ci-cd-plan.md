# Rouault CI/CD 実装計画書（Codex 実行用）

## 0. 任務

Rouault に対して、現行実装と `ci-cd.md` の方針に整合する CI/CD を実装せよ。

最終目標は次のとおり。

1. `main` への変更が production 寄り条件で安定して build できること
2. `build-production` と E2E の build 条件差を縮小すること
3. `buildLabel` の provenance を workflow 主導に寄せること
4. `build -> R2 upload -> Pages deploy` の順序保証を GitHub Actions に encode すること
5. `/media/*` だけを R2 に外出しし、それ以外の静的資産は段階導入すること

---

## 1. 実装制約

以下を厳守すること。

- GitHub Actions を build / test / deploy の唯一の実行主体とする
- Cloudflare Pages は Direct Upload 前提とする
- R2 に出す対象は `.generated/media/assets/**` 由来の `/media/*` のみとする
- `/example-assets/*` は当面 Pages に残す
- `/content-assets/*` は現段階では production artifact に含めない
- archive / permanent URL 系の build 統合は今回の対象外とする
- `scripts/upload-r2-media.ts` の SDK 化は行わない
- Pages の Git integration は使わない
- 既存の CI を「未導入」とみなして作り直さない。現行 workflow を正本として拡張する

---

## 2. 現状把握（repo 事実）

以下は現行 repo の確認済み事項である。実装はこれを前提に進めること。

### 2.1 すでに存在するもの

- `.github/workflows/ci-cd.yml`
  - `lint`
  - `typecheck-node`
  - `test-core`
  - `test-extended`
  - `build-production`
- `build-production` は `ROUAULT_MEDIA_BASE_URL` と `ROUAULT_MEDIA_STRICT=1` を与えて `pnpm build` を実行している
- `playwright.config.ts` は `pnpm build && pnpm exec vite preview ...` を `webServer.command` で直接実行している
- `vite.client.config.ts` は `git rev-parse --short HEAD` により `__GIT_HASH__` を define している
- `src/components/layout/layout-footer.ts` は `__GIT_HASH__` を fallback buildLabel として使う
- `src/layouts/BaseLayout.11ty.ts` は `<layout-footer></layout-footer>` をそのまま出力している
- `eleventy.config.ts`
  - `.generated/media/assets -> dist/media` は `ROUAULT_MEDIA_BASE_URL` 未設定時のみ copy
  - `examples/media -> dist/example-assets` は常時 copy
  - `content/_assets` は dev middleware では配信するが production copy はしていない
  - `_redirects` は `eleventy.after` で `dist/` にコピーしている
- `scripts/upload-r2-media.ts` は `.generated/media/image-manifest.json` を起点に、sha256 と `Cache-Control` を付けて R2 へ upload する manifest 駆動実装である

### 2.2 現状の主要ギャップ

- deploy job / deploy workflow がない
- `_headers` がない
- E2E の build 条件が `build-production` と一致していない
- buildLabel の source of truth が workflow にない
- SSR 側の footer buildLabel 注入経路が統一されていない
- `/content-assets/*` は production 配信面として未確定

---

## 3. 今回の成果物

今回の実装で最低限そろえる成果物は次のとおり。

1. 共有 build metadata 解決モジュール
2. 共有 production build 実行経路
3. `buildLabel` を SSR / client で同一ルールにする配線
4. deploy job（または workflow）と R2 upload / Pages deploy の順序保証
5. `_headers`
6. README 更新
7. テスト更新

---

## 4. 実装方針

### 4.1 build metadata は「workflow 正本・コード共有」で扱う

buildLabel は Vite client define だけに閉じ込めてはならない。  
SSR・Eleventy・client の全てが同じ規則で build metadata を解決できるようにすること。

優先順位は次とする。

1. 明示的に渡された値
2. `process.env.ROUAULT_BUILD_LABEL`
3. Git short SHA
4. 未解決なら `undefined`

ただし、**footer 自体は意味づけを持たず表示専用**とする。  
build metadata の解決責務は footer コンポーネント外へ出すこと。

### 4.2 production build 条件は単一の実行経路に寄せる

`build-production` job と Playwright の `webServer.command` が別々に `pnpm build` を直叩きしている状態をやめること。  
共通の build 実行経路を 1 つ作り、CI と E2E がそれを使う構成に変えること。

### 4.3 deploy は同一 workflow 内の job として追加する

今回の第一段階では、**既存 `.github/workflows/ci-cd.yml` に `deploy-production` job を追加する**方針を採ること。  
理由は、同一 run 内で `build-production` artifact をそのまま使え、workflow 間 artifact 受け渡しより保守しやすいからである。

将来的に環境数や promotion 段が増えたら workflow 分離を検討してよいが、今回は不要。

---

## 5. 変更対象ファイル

### 5.1 新規追加

- `build/metadata/build-metadata.ts`
- `src/data/buildMetadata.ts`
- `_headers`

必要なら次も追加してよい。

- `scripts/run-production-build.ts`

### 5.2 既存変更

- `.github/workflows/ci-cd.yml`
- `package.json`
- `playwright.config.ts`
- `vite.client.config.ts`
- `src/layouts/BaseLayout.11ty.ts`
- `src/components/layout/layout-footer.ts`
- `build/data/clientBundle.ts` または build data 層の近接ファイル
- `eleventy.config.ts`
- `README.md`
- 関連 test 一式

---

## 6. 実装フェーズ

## Phase 1. build metadata 解決の共有化

### 目的

`buildLabel` の決定規則を 1 か所へ集約し、workflow / SSR / client が同じ値を参照できるようにする。

### 実装

1. `build/metadata/build-metadata.ts` を新設し、少なくとも次を実装する
   - `normalizeBuildLabel(value): string | undefined`
   - `resolveGitShortSha(): string | undefined`
   - `resolveBuildLabel(explicit?: string | undefined): string | undefined`

2. `resolveBuildLabel()` の規則は次とする
   - `explicit`
   - `process.env.ROUAULT_BUILD_LABEL`
   - Git short SHA
   - `undefined`

3. `vite.client.config.ts` は inline の `resolveGitHash()` を削除し、新モジュールを使って `__ROUAULT_BUILD_LABEL__` を define する
   - 既存の `__GIT_HASH__` 名は廃止してよい
   - ただしテスト破壊が大きければ一時的に alias define を残してもよい

4. `src/components/layout/layout-footer.ts` は
   - build metadata を自前で意味づけしない
   - `buildLabel` prop 優先
   - fallback は共有規則を使う
   - できればコンポーネント内の Git 直結責務を除去する

### 注意

- footer が「Git short SHA をどう作るか」を知ってはならない
- 将来 `buildLabel` が Git 以外に変わっても footer の責務が変わらない構造にすること

### 受け入れ条件

- client build define と SSR 参照が同一ルールを使う
- `ROUAULT_BUILD_LABEL` を与えるとその値が優先される
- 未指定時のみ Git fallback が働く

---

## Phase 2. SSR / Eleventy へ buildLabel を流し込む

### 目的

初期 HTML と hydration 後の UI で buildLabel が一致するようにする。

### 実装

1. `src/data/buildMetadata.ts` を追加し、build-time data として buildLabel を取得できるようにする
2. `eleventy.config.ts` で global data として `buildMetadata` を登録する
3. `src/layouts/BaseLayout.11ty.ts` の `BaseLayoutData` に `buildMetadata` を追加する
4. `<layout-footer>` 出力を次のように変更する
   - `buildMetadata.buildLabel` が存在する場合のみ `build-label="..."` を付与する
   - 未指定時は属性を出さない
5. 必要に応じて SSR テストを更新する

### 注意

- ここで重要なのは「client 側で後から出る」のではなく、**build 時点で footer 属性に確定値が入ること**
- `layout-footer` は表示専用コンポーネントであり、build metadata の決定経路の主戦場ではない

### 受け入れ条件

- `BaseLayout.11ty.ts` の出力 HTML に `build-label` が入る
- `ROUAULT_BUILD_LABEL=abcdef1` で build した場合、初期 HTML に `build abcdef1` 相当が現れる
- hydration の有無で buildLabel 表示がぶれない

---

## Phase 3. production build 実行経路の共通化

### 目的

CI の `build-production` と Playwright の E2E build を同じ実行経路に寄せる。

### 実装

1. `package.json` に production build 用 script を追加する  
   推奨:
   - `build:production`
   - `test:e2e:production`

2. 可能なら `scripts/run-production-build.ts` を作り、次を一元化する
   - `ROUAULT_MEDIA_STRICT=1`
   - `ROUAULT_BUILD_LABEL` の扱い
   - `pnpm build` の起動
   - エラー時メッセージ

3. `.github/workflows/ci-cd.yml` の `build-production` job は新しい共通 script を使う
4. `playwright.config.ts` の `webServer.command` も同じ共通 script を使う
5. `playwright.config.ts` では preview 起動前の build が workflow と同条件になるようにする

### 注意

- shell 依存の env 書式を `package.json` に直接埋めないこと
- Windows / POSIX 差異を避けるため、必要なら Node script で env を扱うこと
- ここでは artifact 再利用まで必須にしない。まず build 条件差の解消を優先する

### 受け入れ条件

- workflow と Playwright が同じ build entrypoint を使う
- `ROUAULT_MEDIA_BASE_URL` と `ROUAULT_MEDIA_STRICT=1` の条件が一致する
- buildLabel の設定経路も共通になる

---

## Phase 4. `_headers` を導入し artifact に含める

### 目的

Pages 配信時の cache policy を固定する。

### 実装

1. repo root に `_headers` を新規追加する
2. 初期内容は少なくとも次を含める
   - `/assets/*` 長期 cache
   - `/pagefind/*` 長期 cache
   - `/*.html` 再検証寄り
   - `/example-assets/*` は長期 cache
3. `eleventy.config.ts` の `eleventy.after` で `_redirects` と同様に `_headers` を `dist/_headers` へコピーする

### 注意

- `/content-assets/*` はまだ書かない
- `/media/*` は R2 object metadata 側で cache 制御するため `_headers` には書かない

### 受け入れ条件

- `pnpm build` 後に `dist/_headers` が存在する
- `_redirects` と同じ build artifact 経路に乗る

---

## Phase 5. deploy-production job の追加

### 目的

`build -> R2 upload -> Pages deploy` の順序保証を GitHub Actions に入れる。

### 実装

1. `.github/workflows/ci-cd.yml` に `deploy-production` job を追加する
2. job 条件は次とする
   - `github.event_name == 'push'`
   - `github.ref == 'refs/heads/main'`
3. `needs` は少なくとも次を含める
   - `build-production`
4. 初期段階では `test-extended` を deploy 前提に含めるかどうかを明示的に選ぶ
   - 推奨: first step では `build-production` 必須、`test-extended` は運用判断
   - ただし plan 内で理由をコメントに残すこと
5. `actions/download-artifact@v4` で `rouault-dist` を取得する
6. deploy 順序は厳守する
   1. production build artifact を使う
   2. `scripts/upload-r2-media.ts` を実行する
   3. `cloudflare/wrangler-action` で Pages Direct Upload を行う
7. `concurrency` は deploy 専用 group を設定する
   - `deploy-production`
   - `cancel-in-progress: true`

### 使用する環境変数・秘密情報

#### GitHub Secrets
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

#### GitHub Variables
- `CF_PAGES_PROJECT`
- `R2_BUCKET_NAME`
- `ROUAULT_MEDIA_BASE_URL`

### 注意

- `ROUAULT_BUILD_LABEL` を repo / org の固定 Variable にしないこと
- workflow 内で `GITHUB_SHA` から 7 桁短縮値を導出し、その run 内だけで使うこと
- 例:
  - `echo "ROUAULT_BUILD_LABEL=${GITHUB_SHA::7}" >> $GITHUB_ENV`
  - 表示値の整形は code 側で行ってよいが、正本は workflow に置くこと
- `scripts/upload-r2-media.ts` の SDK 化はしない
- Pages の Git integration は有効化しない

### 受け入れ条件

- `main` push 時のみ deploy が走る
- R2 upload が成功しない限り Pages deploy へ進まない
- Pages deploy は Direct Upload を使う
- deploy は同一 production build artifact に基づく

---

## Phase 6. README 更新

### 目的

現行の実装と運用を README に反映する。

### 追記内容

少なくとも次を README に反映すること。

- 開発時は `/media/` をローカル配信する
- production build では `ROUAULT_MEDIA_BASE_URL` を与える
- CI / deploy では `ROUAULT_MEDIA_STRICT=1` を使う
- `/example-assets/*` は当面 Pages 配信
- `/content-assets/*` は現時点では development fallback 中心
- Pages deploy は GitHub Actions 主体
- footer buildLabel は workflow から導出された値を優先し、未指定時のみ Git fallback
- `/media/*` は manifest 駆動で R2 同期する
- archive 系は現時点では CI/CD 本体の前提に含めない

---

## Phase 7. テスト更新

### 追加・更新するべきテスト

1. `test/node` または `test/ssr`
   - build metadata 解決規則
   - env 優先 / Git fallback
2. `test/ssr/base-layout.test.ts`
   - `build-label` 属性が出ること
3. `test/ssr/footer-render.test.ts`
   - buildLabel が明示入力された場合の描画
   - 未指定時の fallback
4. `test/ssr/eleventy-config.test.ts`
   - `_headers` コピー
   - `ROUAULT_MEDIA_BASE_URL` 設定時の media passthrough 挙動
5. 必要に応じて workflow 変更に伴うスモーク確認

### 注意

- archive 系テストは増やさない
- `/content-assets/*` production copy 前提のテストは増やさない
- `test:extended` required 化は今回の実装完了条件に含めない

---

## 7. 実装順序（Codex の作業手順）

以下の順で実装せよ。

1. build metadata 共通モジュール追加
2. `vite.client.config.ts` 差し替え
3. Eleventy global data 追加
4. `BaseLayout.11ty.ts` で footer 属性注入
5. 共有 production build entrypoint 追加
6. `playwright.config.ts` を共有 entrypoint 化
7. `_headers` 作成と `eleventy.config.ts` 反映
8. `ci-cd.yml` に `deploy-production` job 追加
9. README 更新
10. テスト更新

各段階で、不要な設計変更は入れず、責務境界だけを整理すること。

---

## 8. 完了条件

以下を全て満たしたら完了とする。

- `pnpm test` が通る
- `pnpm build` が通る
- `build-production` と E2E が同一 build entrypoint を使う
- `main` push でのみ deploy job が走る
- deploy job が `build -> R2 upload -> Pages deploy` の順を守る
- `_headers` が `dist/` に含まれる
- `/content-assets/*` を production 前提としていない
- archive 系が workflow 必須条件に入っていない
- buildLabel が workflow 値を優先し、SSR / client で整合する

---

## 9. 今回やらないこと

今回は次を実装しないこと。

- archive build
- archive manifest
- `validate-archives`
- `/content-assets/*` の production copy
- `scripts/upload-r2-media.ts` の SDK 化
- R2 への削除同期
- Pages Git integration
- `test-extended` の required 化

---

## 10. 実装上の補足判断

### buildLabel の表示形式

workflow から渡す値は 7 桁短縮 SHA を基本とし、表示整形は code 側で `build ${label}` のように行ってよい。  
ただし、二重整形を避けるため、どちらを正本にするかはコード内で統一せよ。

推奨:
- workflow: `abcdef1`
- UI 表示: `build abcdef1`

### deploy workflow の構成

今回は既存 `.github/workflows/ci-cd.yml` に job を追加する。  
別 workflow 化は将来の最適化項目とし、今回の目的からは外す。

### upload 実装

`scripts/upload-r2-media.ts` は現行責務のまま使う。  
manifest 駆動・skip 判定・sha256 metadata・immutable cache の挙動を維持すること。

---

## 11. 最終出力形式

実装完了後は、次を簡潔に報告せよ。

1. 変更したファイル一覧
2. 各ファイルで何を変えたか
3. `ci-cd.md` 方針との整合点
4. 未着手事項
5. リスクまたは後続 Phase 候補

コード差分の説明では、特に次を明記すること。

- build metadata の正本をどう変えたか
- E2E build 条件差をどう縮小したか
- deploy 順序をどこで保証したか
- `_content-assets/*` を今回なぜ触らなかったか