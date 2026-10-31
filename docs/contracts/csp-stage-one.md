# CSP Stage 1: 隔離したReport-Only検証

## 範囲と正本

ヘッダー候補生成、テーマbootstrapの実出力hash検証、production buildを使った隔離browser観測を所有する。
policyは`build/security/csp-policy.ts`、inventoryは`csp-inventory.ts`、資源分類は`csp-resources.ts`が所有する。
検証入口は`build/security/csp-report-only.ts`、ローカル配信は`vite.csp-preview.config.ts`、
検証入口は`package.json`を正本とする。第1段階は防御完了を意味しない。

通常の`build` / `build:production`、`vite.preview.config.ts`、配信用`_headers`にはCSPを追加しない。
生成先は非配信の`.generated/csp/manifest.json`と`.generated/csp/report-only.headers`のみ。
CI workflow、本番公開、preview runner、sandbox token、外部report collectorは変更しない。

## 生成と検証

1. `ROUAULT_SITE_ORIGIN`を設定して`pnpm build:production`を実行する。
2. `pnpm generate:csp-stage1`で最終HTML・CSS・Worker実ファイルを棚卸しする。
3. `pnpm verify:csp-stage1`で凍結manifestと現在出力、header fragment、配信隔離を検証する。
4. `pnpm test:csp-stage1`でbuildから独立したROサーバーとbrowser観測を実行する。
   `--project chromium-csp`等でbrowserを選べる。ローカルの4173番ポートを専有し、既存serverは再利用しない。

既存配信headerにCSPが含まれる場合は第1段階の隔離違反として検証を失敗させる。
fragmentの各行は2,000文字、既存`dist/_headers`との合計rule数は100を上限とする。

HTML parserが得た実行script本文をUTF-8 SHA-256でhash化する。HTMLの改行正規化を反映し、
escape後の承認済みtheme document / chrome bootstrapと本文・順序・本数を照合する。
未知scriptを新しいhashとして自動承認しない。固定nonceは使わない。
`template`内のpayloadとJSON scriptは実行scriptの集合へ含めず、未知MIME/importmapは保守的に拒否する。
hash改変、script追加・欠落、凍結後の資源変更はnegative testで失敗する。

## ポリシーと棚卸し

親文書は`default-src 'none'`から、same-origin scriptと承認済みhash2本、same-origin CSS/font/connect/Workerを明示する。
`script-src-attr 'none'`と`object-src 'none'`を置く。scriptの`unsafe-inline` / `unsafe-eval`は許可しない。
style属性はShiki、KaTeX、layout custom property、CSSOMによる更新と別に評価し、
設計1.1の初期例外に合わせ`style-src` / `style-src-elem`はselfとunsafe-inline、
`style-src-attr`はunsafe-inlineを明示する。style制約の強化は別段階とする。
`base-uri` / `form-action` / `frame-ancestors` / `manifest-src`はnoneとする。
runner profileは未採用のため`frame-src`も空集合のnoneとし、採用済みrunner許可を装わない。
画像のdata許可は既存PNG/JPEG/GIF/WebP・base64・32KiB検証を通るものだけとする。
画像・mediaの外部許可は明示された`ROUAULT_MEDIA_BASE_URL`のHTTPS originだけから生成する。
棚卸しで見つけた外部originを自動許可しない。

manifest（schema 2）はmode/version/digest/buildId、hash owner、route class、資源のorigin/pathname/種類/理由を記録する。
query、fragment、本文、script sample、local absolute pathは記録しない。
最終HTMLとnavigation envelope、実際に展開するinert HTML/CSS template、参照されるCSSのurl/importを分類する。
Vite manifestのentry/chunk/importと、出力JSのmodule Worker/URL assetを照合する。
未知script/src、Worker、外部HTTP、未承認origin、nonce/on属性、javascript URL、不正data画像は検証失敗とする。
未参照のpassthrough CSSはsourceとのbytes一致を確認した非稼働資産として記録し、実行資源と混同しない。
同一originの画像URLがmedia objectを指す場合、既存media manifest・物理bytes・SHAを照合する。
ローカル出力の物理pathと公開object URLの差は、隔離serverだけが検証済みaliasで解決する。
通常preview、製品の画像resolver、配信artifactは変更しない。
dynamic fetch / CSSOM / srcdocの集合は静的棚卸しだけでは完結しないためbrowser観測とsource確認を併用する。
現在の通常bundle・CSS/font・検索artifactはsame-origin、検索Workerは検証済みWASM bytesをBlob URLへ変換し、
`Suzume.create({ wasmPath })`がそのURLをfetch・compileする。
Worker応答だけに`script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' blob:`を置き、親へ拡張しない。

親のruleは生成HTMLが存在するルート群、Workerは実際のhash付きentryの完全pathへ生成し、重複一致を拒否する。
`/*`に親policyを付けてWorker応答にも合成させる方式は使わない。
この候補のcoverageは生成済み文書ルートに限定する。任意の未知URLに対する404 fallback、
新しいルート群、redirectの応答は未確定であり、本番配信前の追加gateである。
path prefixをscript認可境界と見なさない。

## 観測

隔離previewは凍結manifest / fragmentの整合を起動時に確認し、同じrule集合から実HTTPの
`Content-Security-Policy-Report-Only`を返す。生成fragmentの限定的なpath/splatだけを扱い、
複数一致時のcomma結合を再現する。Cloudflare全機能のemulatorとはしない。
Cache-Controlは通常previewの既存middlewareを再利用する。隔離serverではnosniffを明示し、JS/WASM/HTML/mediaのMIMEを確認する。
このローカル再現はCloudflare実HTTPの証明ではない。

`test/e2e/csp-report-only.ts`は専用Playwright configで明示実行する。
通常E2Eの既定`*.spec.ts` / `*.test.ts`には含めず、既存CI設定は変更しない。
Nodeのhash・policy・HTTP検証は既存Node suiteへ含む。
browser試験は外部client runtimeを止めたtheme bootstrapの実行、未知inlineの違反eventと継続実行、
Worker専用HTTP policy、実検索/WASMとCatalog不使用、Worker policyを狭めた対照、404・srcdocを扱う。
`securitypolicyviolation`とconsoleを初期load前から観測し、保存前に最小schemaを検証する。
保存するのはbuildId/browser/route class/directive/disposition/blocked originまたはscheme/statusと、owner/分類のみ。
生console、完全URL、query、fragment、検索語、本文、script sampleはattachmentへ保存しない。
RO試験の想定外HTTP(S) originはharnessで送信前に止め、試験失敗とする。
opaque srcdocのeventは親へbubbleしないためconsoleも必要である。
report-uri / report-to / 外部送信先は追加しない。全訪問者の観測や本番観測が済んだとは扱わない。

404のinline styleは設計1.1で明示した初期style例外である。
現行srcdocのhelper/author JS・base/frame等はknown-legacy-preview、権限を狭める対照はfixtureとして分類する。
Report-Onlyなので既存previewは継続実行する。違反を消すための親policy拡張は行わない。

## 後段ゲート

- [提供された設計1.1との照合記録](../references/csp-stage-one-design-1.1-audit-2026-10-31.md)を参照する。
  Library materializeではなく親からの正当な本文引渡しとして照合する。省略された第6〜7章の全文照合は未確認。
- 各対象browserで違反event、Worker RO対応とnegative controlを確認する。起動失敗は未実施扱いとする。
- 実際のproduction origin / media設定、全配信資源、動的機能を再棚卸しする。
- 将来の配信承認後、Cloudflare実HTTPで最終URL・status・raw headerの本数/結合・hashを確認する。
  通常document、clean URL、index.html alias、404 fallback、hash付きWorker、検索資源、cache再検証を含める。
- ROの既知違反を解消し、previewの契約/fixturesを更新してからenforce採否を決める。
  将来の初回iframe load後ACTIVATEでは、author JSが後から登録するDOMContentLoaded/load listenerは
  既発火のため動かない。readyState分岐を含むfixturesとStage 0の採否が必要で、人工event再発火で偽装しない。
- runner/許可resourceは原則redirectさせない。必要時は最終URLとpolicyを検証する。
  [CSP3 URL照合](https://www.w3.org/TR/CSP3/#match-url-to-source-expression)ではredirect後のpath照合を認可境界として保証しない。

Cloudflare公式[Headers](https://developers.cloudflare.com/pages/configuration/headers/)を2026-10-31に照合した。
複数ruleは合成され、同名headerはcommaで結合される。redirectがheaderより優先し、Functions応答は
`_headers`の対象外となる。将来Functionsや別のheader注入層を追加する場合はその応答側で別途検証する。
このためローカル成功を実配信確認の代用にしない。
