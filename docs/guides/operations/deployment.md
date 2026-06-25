# Deployment Operations

Rouaultのproduction deployは、GitHub Actionsの`deploy-production` jobからCloudflare Pagesへdirect uploadする経路を正とする。

## Production Deploy Authority

- production deployの実行主体は`.github/workflows/ci-cd.yml`の`deploy-production` job。
- `deploy-production`は`main`への`push`かつ`detect-changes.outputs.build == 'true'`の場合だけ実行する。
- `deploy-production`のjob-level `if`は`!cancelled()`とdirect `needs`の`result == 'success'`を明示する。これは、skipped ancestor jobを含む依存チェーンでGitHub Actionsの暗黙`success()`により本番deployがskippedになることを避けるため。
- `workflow_dispatch`はfull CI検査に使うが、production deployは行わない。
- Cloudflare Pages側のGit連携によるautomatic production deploymentは無効にする。
- deploy URLの正本はWranglerのstructured output fileとCloudflare Pages APIの照合結果であり、stdoutのURL抽出ではない。
- `cloudflare/wrangler-action`は使わず、Wrangler CLIは`package.json`とlockfileのexact versionを正本にする。

この経路はsource contractとして`scripts/ci/assert-workflow-source-contract.ts`で固定する。

## External Action Binding

`.github/workflows/ci-cd.yml`の外部Actionは、すべて40桁lowercase hexのcommit SHAで実行する。tagはreview座標としてのみ扱い、実行authorityにしない。

review済みtag、commit SHA、`action.yml` snapshotの`runs.using`、workflow uses SHAは`external-action-snapshots/README.md`と各`tag-evidence.json`に記録する。binding表、tag evidence、workflow SHAが一致しない場合はsource contract failureとする。snapshotの`runs.using`はNode.js 24だけを許可する。

## Release Artifact Contract

production deployのrelease state / attempt manifestは、`scripts/deploy/release-state-schema.ts`のschemaを正本とする。

- release state schemaはextra fieldを拒否する。
- secret-like field name、raw environment、local absolute pathはartifactに入れない。
- failed attemptのobject evidenceは`uploadedObjects: []` / `verifiedObjects: []`に固定する。
- successful release stateでは`uploadedObjects`と`verifiedObjects`のobject集合が一致することを検査する。
- media manifestはmedia item単位で`variant × format`の9 objectを検査する。deployment全体を9 object固定として扱わない。

## Required Repository Settings

GitHub repositoryには`production` environmentを作成する。

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

`ROUAULT_MEDIA_BASE_URL`はproduction buildとE2E jobでも参照するため、`production` environment専用にはしない。

`ROUAULT_SITE_ORIGIN`は`build-production` jobが`pnpm build:production`を実行する前に参照する。生成済み`dist`のHTML meta、route manifest meta、route manifest JSONを同じproduction URL contractで生成するため、`production` environment variableではなくrepository-level variableとして設定する。

`ROUAULT_BASE_PATH`を使わない配信では、未設定または空文字でよい。

## Link Contract Build Environment

Production buildでは、リンク分類とroute manifestの正本として次の環境変数を使う。

- `ROUAULT_SITE_ORIGIN`は必須であり、`http:`または`https:`のabsolute originだけを指定する。
- `ROUAULT_BASE_PATH`は任意であり、未指定時は空文字として扱う。指定する場合はleading slashあり・trailing slashなしのbase pathに正規化できる値だけを使う。
- `ROUAULT_SITE_ORIGIN`にcredentials、query、hash、root以外のpathnameを含めてはいけない。
- `ROUAULT_BASE_PATH`に空白、control character、query、hash、backslash、raw `%`、encoded slash、encoded backslash、encoded dot segment、`.` / `..` segmentを含めてはいけない。
- production codeは`DEFAULT_SITE_URL_CONTEXT`にfallbackしてはいけない。
- `pnpm build:production`は正しい`ROUAULT_SITE_ORIGIN`指定時に通り、欠落または不正値では契約どおり失敗する。

Cloudflare Pages / GitHub Actionsでは、production deploymentのbuild stepに`ROUAULT_SITE_ORIGIN`を明示的に渡す。`ROUAULT_BASE_PATH`を使う配信では、route manifest meta、Search render href、NavigationEnvelope artifact URLが同じbase pathを使うことを確認する。

`deploy-production` jobだけに`ROUAULT_SITE_ORIGIN`を渡しても、すでにupload artifactとして生成された`dist`のHTML metaは変わらない。`main` pushのdeployable production buildでは、repository-level `ROUAULT_SITE_ORIGIN`が未設定なら`build-production`を失敗させる。`pull_request` / `workflow_dispatch`のproduction-mode build検証では、deployable artifactではなく契約検証として`http://127.0.0.1:4173`を明示的な CI 用 origin に使う。

## Production Runtime Artifacts

Production deployでは、次のruntime artifactがactual deployment URLで配信されることを必須契約とする。

- `/search-catalog.json`
- `/assets/internal-document-routes.json`
- `/pagefind/pagefind.js`
- `/pagefind/pagefind-entry.json`

`ROUAULT_BASE_PATH`が空でない環境では、確認URLにbase pathを含める。たとえば`ROUAULT_BASE_PATH=/docs`なら`/docs/search-catalog.json`を確認する。

`search-catalog.json`はtop-level array形式であり、`{ "items": [...] }`形式ではない。Production deployではempty catalogと`canonicalPathname`重複を正常扱いしない。Pagefind indexが存在しても、`search-catalog.json`が欠落するとRouaultの検索UIは正常動作しない。

`assets/internal-document-routes.json`はHTML metaから参照されるroute manifestであり、検索catalogの`canonicalPathname` allowlistとしても使われる。`ROUAULT_SITE_ORIGIN`と`ROUAULT_BASE_PATH`は、route manifest、HTML meta、production assertionの整合性に必要である。

Deploy後の`verify-production-deployment` jobは、deploy jobのsuccess / skipped判定だけで完了扱いにせず、actual deployment URLへHTTP requestを送りruntime artifactを検証する。期待するContent-Typeは次のとおり。

- `search-catalog.json`: JSONとして妥当なContent-Type
- route manifest: `application/json`を含むContent-Type
- `pagefind/pagefind.js`: JavaScript Content-Type
- `pagefind/pagefind-entry.json`: `application/json`を含むContent-Type

手元で確認する場合は、actual deployment URLを指定して次を実行する。

```bash
ACTUAL_DEPLOYMENT_URL="https://example.pages.dev" \
ROUAULT_BASE_PATH="" \
python3 scripts/ci/verify_production_artifacts_http.py
```

fetchで個別確認する場合は、`search-catalog.json`が200、JSON parse可能、かつ配列として1件以上であることを確認する。

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

`pnpm build:production`はproduction build metadataとして`ROUAULT_BUILD_LABEL`を必須とする。未指定の場合、production buildは契約違反として失敗する。

ローカルでproduction buildを直接実行する場合は、成果物の由来を説明できる値を指定する。通常はGit commitの短縮SHAを用いる。

```bash
ROUAULT_BUILD_LABEL="$(git rev-parse --short HEAD)" pnpm build:production
```

`ROUAULT_BUILD_LABEL`はbuild artifactの人間向け診断ラベルであり、`buildId`の代替ではない。production buildでは、曖昧な`local` / `unknown` fallbackを使わない。

GitHub Actionsでは`${GITHUB_SHA::7}`を`ROUAULT_BUILD_LABEL`として設定する。

## Cloudflare Pages Check

Cloudflare Pages projectでは次を確認する。

- Git integration由来のautomatic production deploymentが無効であること。
- Pages projectがwrangler/direct uploadのdeployment targetとして維持されていること。
- production deploymentのsourceがGitHub integrationではないこと。
- `main` push直後にCloudflare側でGit integration由来のdeploymentが自動生成されないこと。
- GitHub Actionsの`deploy-production`実行時だけproduction deploymentが作成されること。

## Deployment Evidence

`deploy-production` jobは人間向けprovenanceと、機械検証用のstructured artifactを分けて記録する。deployment URLやdeployment IDの正本はWrangler structured output fileをparserで正規化した`cloudflare-pages-deploy-result.json`と、そこから生成するrelease state artifactである。stdout や raw command output を deployment data source として扱ってはいけない。

ログとstep summaryには次の人間向けprovenanceだけを記録する。

- `GITHUB_SHA`
- `GITHUB_REF`
- `GITHUB_REF_NAME`
- `ROUAULT_BUILD_LABEL`
- Cloudflare deployment ID
- Cloudflare deployment URL

機械検証はrelease state artifact、release state SHA-256、R2 attempt manifest、media delivery attempt manifest、runtime verification artifactを使って行う。Cloudflare Pages側でcommit SHAが表示される場合は、GitHub Actions runの`GITHUB_SHA`と一致することを確認する。表示されない場合は、GitHub Actionsのprovenanceログとnormalized deployment resultの`deploymentId` / `deploymentUrl`からdeploymentを対応付ける。

## CI Gate Roles

- `prebuild-gate`は、変更分類に応じてbuild前のprerequisite jobが成功または正しくskippedになっていることを検証する。
- `ci-required`は、PR merge gateのrequired status checkとして扱う。
- `verify-production-deployment`は、`main` push後のproduction deploy監視jobとして扱う。

`verify-production-deployment`はPRでは実行されないため、branch protectionのrequired status checkへ無条件に登録しない。

## Change Record

Cloudflare PagesまたはGitHub environmentの設定を変更した場合は、次を追記する。

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
