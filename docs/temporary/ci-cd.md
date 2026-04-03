# Rouault CI/CD 方針

## 要約

Rouault の CI/CD は、**GitHub Actions を唯一の build / test / deploy 実行主体**とし、**Cloudflare Pages を静的成果物配信、R2 を `/media/*` 系の派生画像配信**に限定して使う構成を採るのがよいです。

ただし、**現状の Rouault は CI が実装済みであり、CD はまだ未接続**です。  
この文書は、**現在の repo 実装で何が成立しているか**と、**そこから本番 deploy へどう伸ばすか**を分けて整理します。

特に重要なのは次の 5 点です。

1. **すでに実装済みの CI を「未導入」と書かない**
2. **R2 に出す対象を `/media/*` 系の派生画像のみに固定する**
3. **CI で通した build 条件と deploy 時の build 条件を可能な限り一致させる**
4. **`/content-assets/*` は現状では development fallback として扱い、本番配信面としてはまだ前提化しない**
5. **archive / permanent URL は仕様上の概念はあるが、CI/CD が依存できる build 統合は未導入であるため、本書の必須前提に混ぜない**

---

## 1. この文書の位置付け

この文書は、Rouault の CI/CD について次の 2 つを同時に扱います。

- **現状実装で何が成立しているか**
- **次にどこをどう伸ばすか**

重要なのは、**現状の repo に未接続の deploy 基盤や archive build 統合を、いまの required check や deploy 前提に混ぜない**ことです。  
恒久リンクや過去版参照は重要ですが、現時点では **CI/CD 本体の成立条件ではありません**。

---

## 2. 現状実装の確認

## 2.1 すでに成立していること

現状の Rouault では、少なくとも次が成立しています。

- `.github/workflows/ci-cd.yml` が存在し、CI が動いている
- `.node-version` が存在し、Node バージョンを固定している
- `package.json` に `engines.node` と `engines.pnpm` が入っている
- `wrangler.jsonc` が存在する
- `build/media/media-base-url.ts` で `ROUAULT_MEDIA_BASE_URL` を解決できる
- `scripts/build-images.ts` と `build/media/image-resolver.ts` が `/media/*` 系の派生画像を扱う
- `eleventy.config.ts` は、`ROUAULT_MEDIA_BASE_URL` が未設定のときだけ `.generated/media/assets -> dist/media` を passthrough copy する
- `eleventy.config.ts` は `examples/media -> dist/example-assets` を passthrough copy する
- `eleventy.config.ts` は development server 上で `/media/`、`/content-assets/`、`/example-assets/` をローカル配信する middleware を持つ
- `scripts/upload-r2-media.ts` が存在し、`.generated/media/image-manifest.json` を起点に R2 へ upload できる
- `test` は `test:node` / `test:ssr` / `test:browser` / `test:storybook:meta` をまとめて実行する
- `test:extended` は `test:storybook:smoke` と `test:e2e` を実行する
- `vitest.config.ts` には `storybook-smoke` project が残っている
- `playwright.config.ts` の `webServer.command` は `pnpm build && pnpm exec vite preview ...` であり、E2E 実行時に build を再実行する
- `build-production` job は存在し、`ROUAULT_MEDIA_BASE_URL` と `ROUAULT_MEDIA_STRICT=1` を与えて `pnpm build` を実行している

したがって、**Rouault は「CI が未導入」の状態ではありません**。  
また、**`/media/*` の外部化に必要な基礎実装はすでにかなり入っています**。

## 2.2 現時点では前提化しないこと

現 repo の説明として、次は **まだ前提化しません**。

- Cloudflare Pages への **deploy job / deploy workflow**
- R2 upload と Pages deploy をつなぐ **CD の順序保証**
- `_headers`
- GitHub Actions 上の **本番 deploy workflow**
- `ROUAULT_BUILD_LABEL` を workflow から渡す構成
- archive manifest / `validate-archives` / `/archives/{hash}` の build 統合
- `content/_assets -> dist/content-assets` の production passthrough copy

ここで重要なのは、**`/content-assets/*` が development fallback としては存在する一方、production artifact の配信面としてはまだ固定されていない**ことです。

## 2.3 archive / permanent URL の整理

archive / permanent URL については、**仕様上の概念自体は repo に存在します**。  
たとえば `docs/router-specification.md` には `/archives/{hash}` の route policy が書かれています。

ただし、現時点で未導入なのは次です。

- archive の build 生成
- archive manifest
- CI 上の整合検証
- deploy workflow への統合

したがって、本書では **「archive の概念はあるが、CI/CD が前提にできる build 統合はまだない」**という整理を採ります。

## 2.4 現状の注意点

現状の CI には、次の技術的な注意点があります。

### 1. `test:extended` がまだ重い

`test:extended` は Storybook smoke と E2E を含みます。  
したがって、PR の必須チェックに最初から入れると、CI の重さと不安定性を引き上げやすいです。

### 2. Playwright が build を再実行する

`playwright.config.ts` の `webServer.command` は `pnpm build` を直接呼びます。  
このため、**E2E 実行時の build 条件が `build-production` job と完全一致していません**。

### 3. footer の buildLabel はまだ workflow 管理ではない

現状の buildLabel は、`vite.client.config.ts` が `git rev-parse --short HEAD` を実行して `__GIT_HASH__` を注入し、footer 側がそれを表示する構成です。  
つまり、**現時点では `ROUAULT_BUILD_LABEL` を使っていません**。

### 4. `/content-assets/*` は production 配信面としてはまだ固定されていない

`content/_assets` は development server では `/content-assets/*` として配信されます。  
一方で、現状の `eleventy.config.ts` には `content/_assets -> dist/content-assets` の passthrough copy はありません。

したがって、**`/content-assets/*` を Pages 本番配信面として文書化するのは現時点では早い**です。

---

## 3. 採用するアーキテクチャ

## 3.1 配信面の責務分離

### Cloudflare Pages

Pages には次を配信します。

- HTML
- CSS
- JS
- Pagefind index
- `_redirects`
- 将来追加する `_headers`
- `/assets/*`
- `/example-assets/*`

### Cloudflare R2

R2 には次だけを配信します。

- `.generated/media/assets/**` から作られる **`/media/*` 系の派生画像のみ**

## 3.2 この分け方を採る理由

Rouault では、派生画像は **内容ハッシュを含む不変 URL** に寄せやすく、R2 での長期キャッシュに向いています。  
一方、HTML・検索 index・クライアント bundle は、Pages 側で一括配信・一括切り戻しできる方が扱いやすいです。

また、現状実装には少なくとも次の 3 系統があります。

- `/media/` … `.generated/media/assets` 由来の派生画像
- `/content-assets/` … `content/_assets` 由来のローカル資産。現状では development fallback が主
- `/example-assets/` … `examples/media` 由来のローカル静的アセット

このうち、**最初に R2 へ外出しするのは `/media/` だけ**に固定します。  
`/example-assets/` は当面 Pages に残します。  
`/content-assets/` は、まず production build 上の責務を明確化してから扱います。

これは責務が明確で、変更面積が小さく、切り戻しも容易だからです。

## 3.3 この文書で扱わないもの

この文書では、次を **必須前提としては扱いません**。

- `/archives/{hash}` の build 生成
- 過去版 content の保存方式
- archive manifest
- `validate-archives`

これらは重要ですが、**現 repo にはまだ CI/CD が依存できる実装統合がありません**。  
先に CI/CD 本体を安定させ、その後に archive 専用の設計書または別章として導入する方が保守しやすいです。

---

## 4. 制御面の原則

## 4.1 GitHub Actions を唯一の build / deploy 実行主体にする

Rouault では、**GitHub Actions を build / test / deploy の唯一の実行主体**とします。

理由は次のとおりです。

- R2 upload と Pages deploy の順序を workflow に encode できる
- どの build が本番成果物か追跡しやすい
- Pages 側の自動 build と二重管理にならない
- 再現性と監査性が上がる

したがって、Pages を deploy する段階では、**Git integration ではなく Direct Upload 前提**で運用するのがよいです。

## 4.2 CI と CD を段階的に分ける

現状は **CI 先行**で十分です。  
まずは `main` に入る変更が常に build 可能であることを保証し、その後で deploy を接続します。

この順番にする理由は明確です。

- いまの repo には deploy job がない
- `_headers` も未導入
- buildLabel も workflow 由来ではない
- E2E の build 条件差もまだ残っている
- `/content-assets/*` の production 配信責務もまだ未確定である

先に CI を安定させてから CD を入れる方が、長期保守性が高いです。

---

## 5. CI 設計

## 5.1 目的

CI の第一目的は、**`main` に入る変更が少なくとも production 寄りの条件で build 可能であることを保証する**ことです。

現状の Rouault では Storybook smoke がまだ `test:extended` に残るため、CI は次の二層で考えます。

- **必須の軽量層**: lint / typecheck / core test / production build
- **重い確認層**: Storybook smoke / E2E / cross-browser final check

## 5.2 required status checks

`main` の branch protection では、現時点では最低限次を required にします。

- `lint`
- `typecheck-node`
- `test-core`
- `build-production`

`test-extended` は、最初から required にしなくてよいです。  
理由は、現状では Storybook smoke と E2E を抱えており、実行時間と壊れやすさの面で CI の主戦場にしにくいからです。

将来的に安定したら、段階的に required 化を再検討します。

## 5.3 production build への寄せ方

ここで重要なのは、**CI の build を本番に寄せること**です。

現状の `build-production` は、少なくとも次を満たしています。

- `ROUAULT_MEDIA_BASE_URL` を与える
- `ROUAULT_MEDIA_STRICT=1` を与える
- `pnpm build` を実行する
- `dist/` を artifact 化する

この方針は妥当です。

ただし、まだ次の差分が残っています。

- buildLabel は workflow から渡していない
- E2E 内の `pnpm build` は `build-production` job とは別経路
- Playwright の再 build に同じ環境変数が明示的に渡っていない

したがって、現時点での評価は次のとおりです。

- **`/media/*` の build 条件差はかなり縮小できている**
- **buildLabel と E2E build 条件はまだ完全一致していない**

## 5.4 現状の推奨ジョブ構成

### `lint`

- `pnpm lint`

### `typecheck-node`

- `pnpm typecheck:node`

### `test-core`

- `pnpm test`

### `test-extended`

- `pnpm test:extended`
- 当面は required にしない
- `main` 向け PR または push で重点的に回す

### `build-production`

- `pnpm build`
- `ROUAULT_MEDIA_BASE_URL` を与える
- `ROUAULT_MEDIA_STRICT=1` を与える
- `dist/` を artifact 化する

## 5.5 現時点で入れないもの

現状の Rouault では、次は CI の必須構成にまだ入れません。

- `validate-archives`
- archive manifest 整合検証
- `/archives/{hash}` 生成検証

理由は単純で、**CI/CD が依存できる実装がまだ存在しないから**です。  
未接続の前提を branch protection に混ぜると、文書だけが先行して repo と乖離します。

---

## 6. buildLabel 方針

## 6.1 現状

現状の footer buildLabel は、**workflow から渡していません**。  
`vite.client.config.ts` が `git rev-parse --short HEAD` を呼び、`__GIT_HASH__` を define し、footer 側がそれを既定値として表示する構成です。

この方式の利点は、実装が単純なことです。  
一方で、弱点もあります。

- CI が build metadata を明示的に制御していない
- deploy provenance の source of truth が workflow にない
- 将来的に artifact 再利用や multi-stage deploy を行うときに扱いづらい
- client build と SSR 側で build metadata の決定経路を統一しにくい

## 6.2 当面の扱い

**現時点では、この実装を正として文書化します。**  
つまり、現段階では buildLabel を CI/CD の必須前提にしません。

ただし、改善の方向性は明確です。  
buildLabel の provenance 改善は、**導入順序の後続 Phase で実装する項目**として扱います。

その際の方針は次です。

- `ROUAULT_BUILD_LABEL` は workflow 実行時に `GITHUB_SHA` から導出する
- build metadata の解決は env 優先・Git fallback にする
- その解決規則は client build と SSR 側で共有できる形に寄せる
- footer は buildLabel の意味づけを持たず、表示だけを担当する

したがって、**現状は Git fallback ベースの簡潔な実装を正として記述し、改善は導入順序の中で段階的に進める**、という整理を採ります。

---

## 7. CD 設計

## 7.1 本番 deploy の前提条件

本番 deploy は、少なくとも次を満たしたときだけ走らせます。

- `main` への push
- `lint` 成功
- `typecheck-node` 成功
- `test-core` 成功
- `build-production` 成功
- 必要に応じて `test-extended` 成功

初期段階では、`test-extended` を required にしない構成でも構いません。  
ただし、本番 deploy の信頼性を上げたいなら、最終的には `test-extended` を deploy 前提へ含めるのが望ましいです。

## 7.2 実行順序

deploy 順序は必ず次です。

1. **production 条件で build**
2. **R2 に `/media/*` を同期**
3. **Pages に `dist/` を deploy**

この順序は固定です。  
理由は、Pages が切り替わった時点で HTML が新しい `/media/*` URL を参照しているのに、R2 側にまだオブジェクトがない状態を避けるためです。

## 7.3 concurrency

deploy workflow には `concurrency` を付けます。

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: true
```

同じ本番環境へ重複 deploy させないためです。

## 7.4 現状の repo で追加すべきもの

CD を入れる段階で最低限必要なのは次です。

* `deploy-production` job または deploy workflow
* `cloudflare/wrangler-action` による Pages Direct Upload
* `scripts/upload-r2-media.ts` の workflow 接続
* `_headers`
* GitHub Secrets / Variables の整理

---

## 8. リポジトリに対する整理

## 8.1 すでに存在するファイル

* `.github/workflows/ci-cd.yml`
* `.node-version`
* `wrangler.jsonc`
* `scripts/upload-r2-media.ts`
* `build/media/media-base-url.ts`

## 8.2 追加が必要なファイル

* `_headers`

## 8.3 今後変更候補になるファイル

* `.github/workflows/ci-cd.yml`
* `playwright.config.ts`
* `vite.client.config.ts`
* `src/components/layout/layout-footer.ts`
* `README.md`
* 必要に応じて `eleventy.config.ts`

## 8.4 `README.md` に追記したいこと

現状の `README.md` には、CI/CD と media 配信方針の詳細はまだ十分には書かれていません。
したがって、次は **現状説明ではなく、今後の追記事項**として扱います。

* 開発環境では `/media/` をローカル配信すること
* 本番寄り build では `ROUAULT_MEDIA_BASE_URL` を与えること
* `ROUAULT_MEDIA_STRICT=1` を CI で使うこと
* `/example-assets/*` は当面 Pages 配信のままであること
* `/content-assets/*` は現状では development fallback が中心であること
* Pages deploy は GitHub Actions 主体で行う想定であること
* footer buildLabel は現状 `__GIT_HASH__` 由来であること
* `scripts/upload-r2-media.ts` は `/media/*` 系の派生画像だけを同期対象にすること
* archive / permanent URL は現時点では CI/CD 本体の必須前提に含めていないこと

---

## 9. `scripts/upload-r2-media.ts` の位置付け

`scripts/upload-r2-media.ts` の責務は、**`.generated/media/image-manifest.json` を起点に、派生画像だけを R2 に同期すること**です。

現実装の最小責務は次です。

* `.generated/media/image-manifest.json` を読む
* manifest 内の output 情報から upload 対象を決定する
* 対象ファイルを読み込む
* `Content-Type` を正しく付ける
* `Cache-Control: public, max-age=31536000, immutable` を付ける
* 既存オブジェクトが同一なら skip する
* object metadata に sha256 を持たせる

ここで重要なのは、**現実装は asset directory 全体を列挙して manifest と双方向整合を取る方式ではない**という点です。
つまり、現状の upload は **manifest 駆動**であり、余剰ファイル検出や削除同期までは行っていません。

現実装は、**S3 互換 SDK ではなく、自前の署名付きリクエスト実装**です。
このままでも運用は可能ですが、長期保守性の観点では将来的に SDK へ寄せる余地があります。

ただし、それは **deploy 基盤導入後の最適化項目**です。
いま優先すべきは、**workflow に接続して順序保証を与えること**です。

---

## 10. `_headers` 方針

`_headers` はまだ未導入ですが、Pages 配信を始める前に入れるべきです。

最小方針は次のとおりです。

* `/assets/*` … 長期 cache
* `/pagefind/*` … 長期 cache
* `/*.html` … 再検証寄り
* `/example-assets/*` … 内容に応じて長期 cache

`/content-assets/*` は、production 配信面に乗せることが確定してから `_headers` 対象へ追加します。
R2 側の `/media/*` は `_headers` ではなく、**object metadata の `Cache-Control`** で制御します。

---

## 11. 導入順序

## Phase 1. 現状文書の整合化

* この文書を現状 repo に合わせて更新する
* archive 前提を CI/CD 本体から外す
* buildLabel は現状では workflow 非管理であることを明記する
* `/content-assets/*` は現状では production 配信面として固定しない
* `scripts/upload-r2-media.ts` の責務を現実装相当に書く

## Phase 2. CI の安定化

* `lint`
* `typecheck-node`
* `test-core`
* `build-production`

まずは **`main` に入るものは常に build 可能**であることを保証します。

## Phase 3. E2E の build 条件差を縮小

* `playwright.config.ts` の `webServer.command` を見直す
* `build-production` と同じ環境変数条件で E2E を実行できるようにする
* 必要なら artifact ベースへ寄せる

## Phase 4. build metadata の provenance 改善

* `ROUAULT_BUILD_LABEL` を workflow 実行時に `GITHUB_SHA` から導出する
* build metadata の解決を env 優先・Git fallback に寄せる
* その解決規則を client build と SSR 側で共有できるようにする
* footer は buildLabel の意味づけを持たず、表示専用に寄せる

この Phase の目的は、**表示用ラベルの正本を workflow 側へ戻しつつ、build metadata の決定経路を build 系全体で揃えること**です。

## Phase 5. CD の導入

* `deploy-production` を追加する
* `scripts/upload-r2-media.ts` を workflow に接続する
* Pages Direct Upload を導入する
* `_headers` を追加する

## Phase 6. `/content-assets/*` の production 責務確定

* `content/_assets` を production artifact に含めるかを設計上確定する
* 含めるなら `eleventy.config.ts` に passthrough copy を追加する
* `_headers` と README をその前提に更新する

## Phase 7. archive 導入の準備

* archive build の方式を定義する
* archive manifest の責務を定義する
* CI 上の validate step を設計する
* deploy workflow への統合条件を決める

## Phase 8. 最適化

* `test-extended` の required 化見直し
* artifact 受け渡しの導入
* upload 実装の SDK 化検討
* Storybook smoke のさらなる縮退

---

## 12. 避けるべき構成

## 12.1 Pages の Git build と GitHub Actions build の二重運用

採りません。

理由:

* build の正本が曖昧になる
* R2 upload と Pages deploy の順序保証が崩れる
* 再現性が落ちる

## 12.2 `/media/*` と無関係な静的資産まで最初から R2 へ外出しすること

初期導入では採りません。

理由:

* 変更面積が大きい
* 切り戻しが難しい
* `/media/*` だけの外部化でまず十分な効果が出る

## 12.3 未実装の archive 基盤を required check に入れること

採りません。

理由:

* repo と文書が乖離する
* ブランチ保護の意味が曖昧になる
* CI/CD 本体の保守性を落とす

## 12.4 `/content-assets/*` を現状の production 配信面だと断定すること

採りません。

理由:

* development fallback と production artifact を混同する
* 実装と文書の責務境界が崩れる
* 今後の passthrough copy 設計を曖昧にする

---

## 13. 参考 workflow 方針

当面の方針は次です。

* CI は `.github/workflows/ci-cd.yml` を継続利用する
* `build-production` を production 寄り build の主戦場にする
* deploy は後段で追加する
* deploy 導入時は、**build -> upload-r2 -> pages deploy** の順序を workflow に encode する

CD 導入後の deploy job では、少なくとも次を environment / secrets / variables として使います。

### GitHub Secrets

* `CLOUDFLARE_ACCOUNT_ID`
* `CLOUDFLARE_API_TOKEN`
* `R2_ACCESS_KEY_ID`
* `R2_SECRET_ACCESS_KEY`

### GitHub Variables

* `CF_PAGES_PROJECT`
* `R2_BUCKET_NAME`
* `ROUAULT_MEDIA_BASE_URL`

`ROUAULT_BUILD_LABEL` は、導入する場合でも **固定 Variable にしない**方がよいです。
導入するなら、workflow 実行時に `GITHUB_SHA` から導出するのが自然です。

なお、これらの Variables / Secrets の**実在確認自体は repo 外設定**であり、この文書の repo 精査対象外です。

---

## 14. 現時点の結論

現状の Rouault は、**CI の基礎実装と `/media/*` 外部化の基盤はかなり整っています**。
一方で、**CD・buildLabel provenance・archive build 統合・`/content-assets/*` の production 責務**はまだ未完成です。

したがって、今の Rouault に対して採るべき整理は次です。

* **CI は「すでにあるもの」として文書化する**
* **CD は「これから入れるもの」として段階的に書く**
* **archive は CI/CD 本体の前提から外す**
* **`/media/*` のみ R2、`/example-assets/*` は当面 Pages、`/content-assets/*` は責務確定後に扱う**
* **buildLabel 改善は導入順序の中で行う**

この分け方が、現状実装にも長期保守にも最も整合的です。
