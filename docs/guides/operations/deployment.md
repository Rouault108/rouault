# Deployment Operations

Rouault の production deploy は、GitHub Actions の `deploy-production` job から Cloudflare Pages へ direct upload する経路を正とする。

## Production Deploy Authority

- production deploy の実行主体は `.github/workflows/ci-cd.yml` の `deploy-production` job。
- `deploy-production` は `main` への `push` かつ `detect-changes.outputs.build == 'true'` の場合だけ実行する。
- `deploy-production` の job-level `if` は `!cancelled()` と direct `needs` の `result == 'success'` を明示する。これは、skipped ancestor job を含む依存チェーンで GitHub Actions の暗黙 `success()` により本番 deploy が skipped になることを避けるため。
- `workflow_dispatch` は full CI 検査に使うが、production deploy は行わない。
- Cloudflare Pages 側の Git 連携による automatic production deployment は無効にする。

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

- `ROUAULT_MEDIA_BASE_URL`

`ROUAULT_MEDIA_BASE_URL` は production build と E2E job でも参照するため、`production` environment 専用にはしない。

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

`deploy-production` job は次をログと step summary に記録する。

- `GITHUB_SHA`
- `GITHUB_REF`
- `GITHUB_REF_NAME`
- `ROUAULT_BUILD_LABEL`
- Cloudflare deployment URL
- Wrangler command output

Cloudflare Pages 側で commit SHA が表示される場合は、GitHub Actions run の `GITHUB_SHA` と一致することを確認する。表示されない場合は、GitHub Actions の provenance ログと Wrangler output から deployment を対応付ける。

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
