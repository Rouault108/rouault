# Testing Taxonomy Contract

## 1. Status

- Type: Normative
- Source of truth: `package.json` scripts、`test/**`、test runner config
- Applies to: test placement、contract verification layer、browser test harness、fixture policy
- Non-goals: 機能別の詳細test plan

## 2. Ownership

### This Layer Owns

- `test/node/**`、`test/browser/**`、`test/ssr/**`、`test/e2e/**`の責務境界。
- CSS構造契約とcomputed style検証の分離。
- Production import boundaryとproduction CSS artifact assertionの配置。
- Browser runner、provider、selection、project mapのowner境界。
- Browser fixture lifecycle、readiness utility、CSS text取得のowner境界。
- 新規テスト追加時の判断順。
- Fixture noteの基本方針。

### This Layer Must Not Own

- 個別機能のpublic contract。
- Accessibility要求事項そのもの。正本は`docs/design-system/accessibility.md`。
- Component文書の固有契約。

## 3. Public Contract

### Inputs

- 実装変更。
- Contract / Reference / Guide変更。
- Fixture変更。

### Outputs

- 適切なtest layerへの配置。

### Events

- N/A

### DOM / URL / State Contract

- `test/node/**`はpure function、normalization、URL/path policy、parser、projection helper、state machineを担当する。
- `test/browser/**`はcustom element、enhancer、keyboard / pointer / focus、ARIA、shadow DOMを担当する。
- `test/ssr/**`はbuild-time / final DOM / static artifact / CSS structureを担当する。
- `test/e2e/**`はapp shell integration、no-JS baseline、router/history/search、主要導線を担当する。
- `pnpm test:e2e:dev`はEleventy dev server上の開発時専用経路に限定したsmokeを担当する。production build / previewで固定するfinal DOMや横断的なrouter挙動を重複検証してはならない。
- production previewは生成済み`dist/_headers`のCache-Controlを適用する。hash付きclient assetのimmutable配信と文書・可変metadataの再検証を本番と揃え、browser標準のcached reloadをVite既定のno-cache配信で代用しない。cache条件と本文幾何・座標の2 CSS px照合は独立して検証する。
- previewのnetwork応答には毎回異なる`X-Rouault-Preview-Response-Id`を付ける。reload後に同じURLの保存済み応答IDを再観測した場合もHTTP cacheの証拠とする。新しい200/304応答では必ずIDが変わることを実HTTPテストで固定し、転送量を公開しないbrowserでも座標assertionを省略しない。
- warm-cache reloadのnative対照はpreview専用headerで同URLのmoduleだけをmode-only scriptへ差し替える。通常応答と対照の双方へVaryを付け、HTTP cacheを無効化するroutingは使わない。全viewport・読書位置でappと対照の履歴・mode・字体/range・cache証明を確認し、独立したno-JS検証を維持する。
- Production import-boundary / CSS artifact / search import-boundary scriptsはnode-level verificationとして扱い、読書chromeのruntime UI挙動はbrowser / e2eで固定する。

### Browser Test Harness

- Browser unit / component testのactive runnerはVitest Browser Mode、providerはPlaywrightとする。
- Browser project mapの単一正本は`vitest.config.ts`、browser selection policyの正本は`scripts/testing/browser-test-matrix.ts`とする。
- 公開selectionは`ROUAULT_BROWSER_TEST_BROWSERS`で指定し、値は`chromium`、`firefox`、`webkit`に限定する。
- selection未指定のlocal実行はChromium + Firefox、CI実行はChromium + Firefox + WebKitとする。
- WebKitはHistory API quotaをsession単位で分離するため、内部的にgeneral、search state、URL state、navigation stateの4 projectへ展開し、この順で逐次実行する。内部project名は公開selectionではない。
- `pnpm run test:browser`は選択されたbrowserの全suiteをone-shotで実行する。
- `pnpm run test:browser -- <file>`はbrowser selectionを変えず、指定fileだけを所属projectで実行する。
- Fixture入口は`test/browser/harness/browser-fixture.ts`、cleanup hookは`test/browser/setup.ts`が所有する。fixtureはstring HTMLまたはNodeを受け、documentへmountした実HTMLElementを返す。AbortControllerとcleanupを共通harnessが管理する。
- Readiness / event utilityは`test/browser/harness/browser-test-utilities.ts`、stylesheet text取得は`test/browser/helpers/fetch-css-text.ts`が所有する。
- Test APIとassertionは`vitest`から明示importする。Lit template、Lit readiness、Open WC testing helpersは使用しない。
- Raw HTML fixtureによるparser / 非Lit custom-element upgrade contractを維持する。feature-specific readinessは共通fixtureに埋め込まず、対象のobservable stateを待つ。
- Web Test Runnerは削除済みであり、旧runner固有のconfig、wrapper、command、環境変数をcompatibility surfaceとして残さない。
- Browser harnessの変更はstatic-first / no-JS baselineを変更しない。SSR、E2Eの責務も移動しない。

## 4. State Model

### Durable State

- Test directory taxonomy。
- Fixture policy。

### Ephemeral State

- N/A

### Derived State

- 変更に対応する検証レイヤ。

### Forbidden Coupling

- `test/unit/**`と`src/**/*.test.ts`は使わない。

## 5. Failure Semantics

- Contract変更に対して検証レイヤが存在しない場合、変更の受け入れ条件が不完全である。
- Fixture noteをpublication surfaceとして使う場合、SSR artifactとno-JS baselineを壊してはならない。
- Production artifact assertionが失敗した場合、生成物ではなくsource CSS / build integrationを修正する。

## 6. Integration Boundaries

### Build-time

- Markdown、projection、NavigationEnvelope schema、Permanent URL hashはnode/ssr testsで固定する。

### SSR

- Final DOM、selector / hook / token参照、hydration budgetを固定する。
- Reading chromeのstatic DOM、hydration marker、TOC density selector、production CSS到達性を固定する。

### Production font artifacts

`pnpm build:production`のfont assertionは、生成HTMLから直接stylesheet linkされたCSSの集合で、Noto Sans JPの既存WOFF2参照検査と、`Geist Mono Variable`固有の成果物検査を行う。HTML linkとGeistのsrc URLは本番site origin / base pathおよび参照元URLを基準に解決する。HTMLの`base`要素は許可しない。

Geistは少なくとも一つの`@font-face`を必要とし、各定義でURLを含む`src`を要求する。`local()`のみ、重複descriptor、未知・不正なfamily/src構文は失敗とする。すべてのURL候補についてHTTP(S)のsame-origin、hosting base内のpathname、安全なdist内への対応、通常ファイル・非空を検査する。URLのquery / fragmentはファイルへの対応には使わない。symlinkは実体がdist内にある場合だけ許可する。ハッシュやsubset数には依存しない。

これは直接リンクされたCSSの集合に対する静的検査であり、各ページでの適用、再帰的な`@import`、ブラウザでのフォント取得・デコード・実際の描画は保証しない。未リンク・template内・importのみのCSSにある定義では合格にしない。CSS/font参照とfilesystemの回帰fixtureは`test/node/production-font-assets.test.ts`が担当し、既存のsource import/token検査は`test/ssr/static-css-contracts.test.ts`に維持する。

### Production Geist Mono browser regression

静的検査に加え、`test/e2e/geist-mono-loading.spec.ts`はproduction build / previewの代表ページ`note.markdown-basic`をno-JSで直接開き、既存のASCIIインラインコード`inline code`を画面内へスクロールして検査する。デスクトップChromium / Firefox / WebKitで、CSS先頭family、実際のweight / styleと全文字を含むunicode-rangeに対応する`@font-face`、そのCSS参照先からのsame-origin取得成功、対応するFontFaceの`loaded`を個別に要求する。別subsetの取得・loadedを代用せず、ハッシュ・不要なsubset数には依存しない。初回navigation前から通信を観測し、`fonts.load()`等で強制取得せず、runnerから同期状態をpollする。

`test/e2e/geist-mono-rendering.spec.ts`はChromium専用で、同じ子要素なしのASCII要素をCDP `CSS.getPlatformFontsForNode`で検査する。正のglyph数を持つ全使用フォントにGeistの内部名とcustom fontを要求する。CSS適用・取得・デコードと実使用は別の保証であり、Firefox / WebKitの検査を実使用の証明として扱わない。

負例はtestごとのfresh contextで実施する。取得遮断では対応URLへの介入・request failure・応答不在、HTTP 200破損では介入・200応答・対応FontFaceの`error`を確認する。どちらも文書200・一意な可視要素・CSS適用は独立した前提とする。フォールバック負例はChromiumで正常な読み込み・実使用を先に確認し、同じ要素のfamilyを変更してCSS変更・Geist使用消失・別フォントの正のglyph数を確認する。総合判定の失敗だけで負例を合格させない。

Playwrightは既存serverを再利用せず対象checkoutからproduction buildを作る。既存CI workflowを変更せず、検証ブランチへpush後に`workflow_dispatch`をそのrefで起動し、runのhead SHAと対象commitの一致、3ブラウザのproduction jobおよび新テストの実行・非skipをログで確認する。各テストは成功時にもproject / test名をログに出し、face・通信・CDPの証拠をreport attachmentへ残す。dispatchは本番deploy条件を満たさない。

保証範囲は代表ページ・対象ASCII文字・デスクトップ3エンジンの直接navigationに限る。全ページ・全文字・日本語・モバイル・全weight / style・client navigation・本番HTTP環境は対象外。CSPはこの回帰テストの対象外とし、既存の静的検査およびその保証限界を維持する。

### Client Runtime

- Observable behaviorはbrowser/e2e testsで固定する。
- Desktop nav / mobile panel current sync、search return-to-reading event bridge、focus returnはbrowser / e2eで固定する。

### Hydration

- Hydration triggerとscheduler-owned behaviorはbrowser/e2e testsで固定する。

### Tests

- `test/node/browser-test-matrix.test.ts`が公開browser selection policyを固定する。
- `test/node/testing-taxonomy-contract.test.ts`がproject map、WebKit shard、import、fixture、utility、CSS owner、および旧runner不存在を固定する。

## 7. Acceptance Criteria

- 新規テストは保証したいcontractに応じて配置されている。
- Markdown safety / output fixtureの更新先が明確である。
- Design System契約変更時の検証レイヤが明確である。
- NavigationEnvelope schema変更時の検証レイヤが明確である。
- Permanent URL hash生成規則変更時の検証レイヤが明確である。
- Browser test harnessのactive ownerが一意であり、旧runnerとの恒久併存がない。

## 観察面と集約検証

UI Checkは局所的な視覚観察だけを担う。behavior・a11y・DOM・CSSの合否は既存のSSR / browser / E2Eが所有する。

`pnpm test`はNode + SSR + Browser、`pnpm test:extended`はproduction E2E + dev E2Eを実行する。`check`のlint・型検証・note link・import boundaryと、`verify`のlink acceptance・extended coverageは維持する。
