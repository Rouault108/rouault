# Deployment Operations

Rouault の production deploy は、GitHub Actions の `deploy-production` job から Cloudflare Pages へ direct upload する経路を正とする。

## Production Deploy Authority

- production deploy の実行主体は `.github/workflows/ci-cd.yml` の `deploy-production` job。
- `deploy-production` は `main` への `push` かつ `detect-changes.outputs.build == 'true'` の場合だけ実行する。
- `deploy-production` の job-level `if` は `!cancelled()` と direct `needs` の `result == 'success'` を明示する。これは、skipped ancestor job を含む依存チェーンで GitHub Actions の暗黙 `success()` により本番 deploy が skipped になることを避けるため。
- `workflow_dispatch` は full CI 検査に使うが、production deploy は行わない。
- Cloudflare Pages 側の Git 連携による automatic production deployment は無効にする。
- deploy URL の正本は Wrangler の structured output file と Cloudflare Pages API の照合結果であり、stdout の URL 抽出ではない。
- `cloudflare/wrangler-action` は使わず、Wrangler CLI は `package.json` と lockfile の exact version を正本にする。

この経路は source contract として `scripts/ci/assert-workflow-source-contract.ts` で固定する。

## External Action Binding

`.github/workflows/ci-cd.yml` の外部 Action は、すべて 40 桁 lowercase hex の commit SHA で実行する。tag は review 座標としてのみ扱い、実行 authority にしない。

review 済み tag、commit SHA、`action.yml` snapshot の `runs.using`、workflow uses SHA は `external-action-snapshots/README.md` と各 `tag-evidence.json` に記録する。binding 表、tag evidence、workflow SHA が一致しない場合は source contract failure とする。snapshot の `runs.using` は Node.js 24 だけを許可する。

## Release Artifact Contract

production deploy の release state / attempt manifest は、`scripts/deploy/release-state-schema.ts` の schema を正本とする。

- release state schema は extra field を拒否する。
- secret-like field name、raw environment、local absolute path は artifact に入れない。
- failed attempt の object evidence は `uploadedObjects: []` / `verifiedObjects: []` に固定する。
- successful release state では `uploadedObjects` と `verifiedObjects` の object 集合が一致することを検査する。
- media manifest は media item 単位で `variant × format` の 9 object を検査する。deployment 全体を 9 object 固定として扱わない。

## Required Repository Settings

GitHub repository には `production` environment を作成する。

`production` environment secrets:

- `CLOUDFLARE_API_TOKEN`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

`production` environment variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `CF_PAGES_PROJECT`

Repository-level variables:

- `ROUAULT_MEDIA_BASE_URL`（必須）
- `ROUAULT_SITE_ORIGIN`（必須）
- `ROUAULT_BASE_PATH`（任意）

`ROUAULT_MEDIA_BASE_URL` は production build と E2E job でも参照するため、`production` environment 専用にはしない。

`ROUAULT_SITE_ORIGIN` は `build-production` job が `pnpm build:production` を実行する前に参照する。生成済み `dist` の HTML meta、route manifest meta、route manifest JSON を同じ production URL contract で生成するため、`production` environment variable ではなく repository-level variable として設定する。

`ROUAULT_BASE_PATH` を使わない配信では、未設定または空文字でよい。

## Link Contract Build Environment

Production build では、リンク分類と route manifest の正本として次の環境変数を使う。

- `ROUAULT_SITE_ORIGIN` は必須であり、`http:` または `https:` の absolute origin だけを指定する。
- `ROUAULT_BASE_PATH` は任意であり、未指定時は空文字として扱う。指定する場合は leading slash あり・trailing slash なしの base path に正規化できる値だけを使う。
- `ROUAULT_SITE_ORIGIN` に credentials、query、hash、root 以外の pathname を含めてはいけない。
- `ROUAULT_BASE_PATH` に空白、control character、query、hash、backslash、raw `%`、encoded slash、encoded backslash、encoded dot segment、`.` / `..` segment を含めてはいけない。
- production code は `DEFAULT_SITE_URL_CONTEXT` に fallback してはいけない。
- `pnpm build:production` は正しい `ROUAULT_SITE_ORIGIN` 指定時に通り、欠落または不正値では契約どおり失敗する。

Cloudflare Pages / GitHub Actions では、production deployment の build step に `ROUAULT_SITE_ORIGIN` を明示的に渡す。`ROUAULT_BASE_PATH` を使う配信では、route manifest meta、Search render href、NavigationEnvelope artifact URL が同じ base path を使うことを確認する。

`deploy-production` job だけに `ROUAULT_SITE_ORIGIN` を渡しても、すでに upload artifact として生成された `dist` の HTML meta は変わらない。`main` push の deployable production build では、repository-level `ROUAULT_SITE_ORIGIN` が未設定なら `build-production` を失敗させる。`pull_request` / `workflow_dispatch` の production-mode build 検証では、deployable artifact ではなく契約検証として `http://127.0.0.1:4173` を明示的な CI 用 origin に使う。

## Production Runtime Artifacts

Production deploy では、次の runtime artifact が actual deployment URL で配信されることを必須契約とする。

- `/search-catalog.json`
- `/assets/internal-document-routes.json`
- `/pagefind/pagefind.js`
- `/pagefind/pagefind-entry.json`

`ROUAULT_BASE_PATH` が空でない環境では、確認 URL に base path を含める。たとえば `ROUAULT_BASE_PATH=/docs` なら `/docs/search-catalog.json` を確認する。

`search-catalog.json` は top-level array 形式であり、`{ "items": [...] }` 形式ではない。Production deploy では empty catalog と `canonicalPathname` 重複を正常扱いしない。Pagefind index が存在しても、`search-catalog.json` が欠落すると Rouault の検索 UI は正常動作しない。

`assets/internal-document-routes.json` は HTML meta から参照される route manifest であり、検索 catalog の `canonicalPathname` allowlist としても使われる。`ROUAULT_SITE_ORIGIN` と `ROUAULT_BASE_PATH` は、route manifest、HTML meta、production assertion の整合性に必要である。

Deploy 後の `verify-production-deployment` job は、deploy job の success / skipped 判定だけで完了扱いにせず、actual deployment URL へ HTTP request を送り runtime artifact を検証する。期待する Content-Type は次のとおり。

- `search-catalog.json`: JSON として妥当な Content-Type
- route manifest: `application/json` を含む Content-Type
- `pagefind/pagefind.js`: JavaScript Content-Type
- `pagefind/pagefind-entry.json`: `application/json` を含む Content-Type

手元で確認する場合は、actual deployment URL を指定して次を実行する。

```bash
ACTUAL_DEPLOYMENT_URL="https://example.pages.dev" \
ROUAULT_BASE_PATH="" \
python3 scripts/ci/verify_production_artifacts_http.py
```

fetch で個別確認する場合は、`search-catalog.json` が 200、JSON parse 可能、かつ配列として 1 件以上であることを確認する。

```js
const response = await fetch('/search-catalog.json');
const catalog = await response.json();
console.log(
  response.status,
  response.headers.get('content-type'),
  Array.isArray(catalog),
  catalog.length,
);
```

## Production Build Label

`pnpm build:production` は production build metadata として `ROUAULT_BUILD_LABEL` を必須とする。未指定の場合、production build は契約違反として失敗する。

ローカルで production build を直接実行する場合は、成果物の由来を説明できる値を指定する。通常は Git commit の短縮 SHA を用いる。

```bash
ROUAULT_BUILD_LABEL="$(git rev-parse --short HEAD)" pnpm build:production
```

`ROUAULT_BUILD_LABEL` は build artifact の人間向け診断ラベルであり、`buildId` の代替ではない。production build では、曖昧な `local` / `unknown` fallback を使わない。

GitHub Actions では `${GITHUB_SHA::7}` を `ROUAULT_BUILD_LABEL` として設定する。

## Cloudflare Pages Check

Cloudflare Pages project では次を確認する。

- Git integration 由来の automatic production deployment が無効であること。
- Pages project が wrangler/direct upload の deployment target として維持されていること。
- production deployment の source が GitHub integration ではないこと。
- `main` push 直後に Cloudflare 側で Git integration 由来の deployment が自動生成されないこと。
- GitHub Actions の `deploy-production` 実行時だけ production deployment が作成されること。

## Deployment Evidence

`deploy-production` job は人間向け provenance と、機械検証用の structured artifact を分けて記録する。deployment URL や deployment ID の正本は Wrangler structured output file を parser で正規化した `cloudflare-pages-deploy-result.json` と、そこから生成する release state artifact である。stdout や raw command output を deployment data source として扱ってはいけない。

ログと step summary には次の人間向け provenance だけを記録する。

- `GITHUB_SHA`
- `GITHUB_REF`
- `GITHUB_REF_NAME`
- `ROUAULT_BUILD_LABEL`
- Cloudflare deployment ID
- Cloudflare deployment URL

機械検証は release state artifact、release state SHA-256、R2 attempt manifest、media delivery attempt manifest、runtime verification artifact を使って行う。Cloudflare Pages 側で commit SHA が表示される場合は、GitHub Actions run の `GITHUB_SHA` と一致することを確認する。表示されない場合は、GitHub Actions の provenance ログと normalized deployment result の `deploymentId` / `deploymentUrl` から deployment を対応付ける。

## CI Gate Roles

- `prebuild-gate` は、変更分類に応じて build 前の prerequisite job が成功または正しく skipped になっていることを検証する。
- `ci-required` は、PR merge gate の required status check として扱う。
- `verify-production-deployment` は、`main` push 後の production deploy 監視 job として扱う。

`verify-production-deployment` は PR では実行されないため、branch protection の required status check へ無条件に登録しない。

## Change Record

Cloudflare Pages または GitHub environment の設定を変更した場合は、次を追記する。

```text
date:
operator:
pages project:
before production deployment source:
after production deployment source:
automatic production deployment disabled:
checked settings:
notes:
```
