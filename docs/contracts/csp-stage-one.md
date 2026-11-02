# CSP Stage 1: 隔離したReport-Only検証

## 範囲と正本

ヘッダー候補生成、テーマbootstrapの実出力hash検証、production buildを使った隔離browser観測を所有する。
policyは`build/security/csp-policy.ts`、inventoryは`csp-inventory.ts`、資源分類は`csp-resources.ts`が所有する。
検証入口は`build/security/csp-report-only.ts`、ローカル配信は`vite.csp-preview.config.ts`、
検証入口は`package.json`を正本とする。第1段階は防御完了を意味しない。

通常の`build` / `build:production`、`vite.preview.config.ts`、配信用`_headers`にはCSPを追加しない。
生成先は非配信の`.generated/csp/manifest.json`と`.generated/csp/report-only.headers`のみ。
本番公開、preview runner、sandbox token、外部report collectorは変更しない。
明示承認されたCI継続検証として、通常E2Eと独立したCSP matrix、raw通知能力、段階別進行判定を使う。

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

親のruleはbase path付きglobal rule、Workerは実際のhash付きentryの完全pathへ生成する。
Worker ruleはRO headerをdetachしてから専用policyをsetする。生成器はreset漏れ・順序不正・重複を拒否する。
未知pathや欠損assetのapp 404にも親policyを適用し、base path外へは拡張しない。
Cloudflare公開固定版のunset→set順序をローカルresolverで再現するが、実配信の保証とは扱わない。
runner ruleは未採用のため生成しない。将来のrunnerにはROと別にenforceのHTTP sandboxが必須となる。
path prefixをscript認可境界と見なさない。

## 観測

隔離previewは凍結manifest / fragmentの整合を起動時に確認し、同じrule集合から実HTTPの
`Content-Security-Policy-Report-Only`を返す。生成fragmentの限定的なpath/splatだけを扱い、
複数一致時のcomma結合とWorkerでのdetach/setを再現する。Cloudflare全機能のemulatorとはしない。
Cache-Controlは通常previewの既存middlewareを再利用する。隔離serverではnosniffを明示し、JS/WASM/HTML/mediaのMIMEを確認する。
凍結404本文のSHAも起動時に確認する。ViteのHTML内部rewriteを考慮し、既知HTMLは通常配信へ通して欠損URLだけを404/no-storeにする。
このローカル再現はCloudflare実HTTPの証明ではない。

`test/e2e/csp-report-only.ts`は専用Playwright configで明示実行する。
通常E2Eの既定`*.spec.ts` / `*.test.ts`には含めない。
CIの`test-csp`は`build=true`で起動し、記事・`_headers`・`_redirects`・`wrangler.jsonc`だけの変更も対象とする。
通常production E2Eのapp/event gateは変更しない。固定Playwright container・Node・pnpmを共用し、browser/OS installは追加しない。
専用試験、完全な固定case集合の結果検証、意味上のcoverage判定を別stepとする。
`csp-required`はStage 1内部限定ROの進行判定を独立して所有する。通常jobの結果と分け、既存merge gateの`ci-required`もそのsuccessを必須にする。既存公開jobも双方のsuccessを必要とするが、Stage 1成功はCSPの配信承認ではない。
skip・flaky・retry・期待された失敗・空/欠損/別engine/別SHA/runの証跡を成功にしない。
raw能力判定は従来どおり、未達なら非ゼロ相当の結果を保持する。段階判定だけが以下の完全キー限定例外を評価し、それ以外の必須未達・健全性不備・必須A不足は非ゼロ終了とする。通常CIの成功は未達を解消しない。

`scripts/ci/csp-worker-acceptance.ts`が設計1.2の固定版受入を評価する。
Chromium/FirefoxはWorker event、固定WebKitのconnectだけは単一Worker・WorkerだけのHTTP CSPを持つ隔離fixtureのnative consoleを採用する。
固定WebKitのWASM RO通知が未観測の場合は`unmet / webkit-wasm-ro-unobserved`を保持する。
同じ正常bytesの隔離enforce拒否、RO継続、通常検索成功は、この未達を成功にしない。
既存run `41254644810`のfailureを遡って変更しない。

新しい`csp-worker-observation.ts`は14条件を別context/serverで実行する。
policyなし、両許可ありRO、操作しないRO、許可を1つ/両方除くRO、対応する隔離enforce、
有界遅延/負荷と1000ms window、同Worker/別documentからのconsole模倣、不正WASM、fetch中断を区別する。
Worker listener登録後のREADYを受けて操作を始め、通常windowは250msとする。
HTTP policy/MIME/nosniff、固定fixture bytes、単一Worker request、lifetime、console canaryを確認する。
listener未登録、console切断、canary欠落、未知文言、帰属不能な別lifetime、欠損artifactは負対照で失敗する。
ログ数の重複や順序と、必要な違反種別を分け、固定の2件を要求しない。

consoleは固定版の完全な文言・expected policy・loopback originに照合する。warning、実違反、unknownを分ける。
分類できないログはunknownのまま当該受入を失敗させ、owner不明もunknownを保持する。
模倣console単独は受入を成立させない。consoleは署名された情報ではなく、不信なauthor JSを含む実画面一般への帰属保証ではない。
環境にはengine/browser/Playwright、分類器版、locale、SHA/run、window、fixture条件を関連付ける。
browser/Playwright/container/locale/観測器の変更時は対照を再実行し、版差をレビューする。

従来7条件の`csp-worker-diagnostics.ts`も追加診断として保持し、schemaの妥当性と受入判定を混同しない。
最小JSONとcoverage理由は`rouault-csp-{engine}-results`に7日保存し、通常E2Eのartifactとは分ける。
生console、完全URL、query、検索語、本文、sample、local absolute pathはJSON・assertion・trace・report・stdoutのいずれにも保存しない。
専用reporterは固定case ID/結果だけを記録し、fixture teardownでエラー本文/stack/DOM contextを最小化する。
実行wrapperもconfig読込・起動前のstdout/stderrをメモリー内で制限し、未承認の出力を保存せず非ゼロ終了にする。
自動DOM採取、trace、screenshot、videoを止め、失敗保存の対照でassertion・DOM・console・stdout・ソースの漏出を検出する。
`PLAYWRIGHT_NO_COPY_PROMPT`だけではerror-contextのエラー/ソース保存を止めないため、これを単独の保護としない。

Nodeのhash・policy・HTTP検証は既存Node suiteへ含む。
browser試験は外部client runtimeを止めたtheme bootstrapの実行、未知inlineの違反eventと継続実行、
Worker専用HTTP policy、実検索/WASMとCatalog不使用、Worker policyを狭めた対照、404・srcdocを扱う。
`securitypolicyviolation`とconsoleを初期load前から観測し、保存前に最小schemaを検証する。
保存するのはbuildId/browser/route class/directive/disposition/blocked originまたはscheme/statusと、owner/分類のみ。
生console、完全URL、query、fragment、検索語、本文、script sampleは保存しない。
RO試験の想定外HTTP(S) originはharnessで送信前に止め、試験失敗とする。
opaque srcdocのeventは親へbubbleしないためconsoleも必要である。
report-uri / report-to / 外部送信先は追加しない。全訪問者の観測や本番観測が済んだとは扱わない。

404のinline styleは設計1.1で明示した初期style例外である。
現行srcdocのhelper/author JS・base/frame等はknown-legacy-preview、権限を狭める対照はfixtureとして分類する。
Report-Onlyなので既存previewは継続実行する。違反を消すための親policy拡張は行わない。

## 設計1.4の受入軸と実使用WASM

`scripts/ci/csp-notification-registry.ts`が通知の有限case・完全キー・役割を所有する。
context、effectiveDirective、policy fingerprint/mode、disposition、API/case、fixture/bytes digest、
engine/browser、observer/経路を固定し、candidate SHA/run/buildIdと環境・artifact digestを結び付ける。
既存Document inline/srcdoc ROと、隔離Worker connect/WASM compile ROは必須Bである。
実Suzume enforceと隔離enforceの通知は診断用であり、未観測から新たな必須Bを生成しない。
役割・段階の必須集合を結果側の自己申告で変更できない。

`scripts/ci/csp-stage-acceptance.ts`は個別試験`pass/fail/not-run`、A、Bの`success/unmet`、
診断通知・健全性、段階/phase、公開承認を別に保存する。
`evaluate-csp-stage.ts`が候補の全証跡を検証し、Stage 1内部判定の終了コードをCIへ返す。
従来の`assert-csp-coverage.ts`とraw enumは保持し、WebKit未達のraw exit 1を0へ書き換えない。
16件の専用試験の成功は、証拠収集・自己試験の成功であり、実WASMのAや全段階完了とは別である。

例外`WK26.6-worker-wasm-ro`は固定WebKit 26.6 / Playwright 1.63.0 / en-US /
observer `worker-ro-1.2-v1` / 承認済みcontainer digestの隔離Worker compile ROだけに適用する。
正常小moduleと14条件のfixture/policy指紋、現candidateのSHA/run/build、稼働・負対照、
既知product policyとSuzume bytesが一致し、他の必須Bと当該段階のAが成立するときだけ、
当該一能力のunmetを残して段階1〜4で非阻害にできる。
Document・enforce・別API/fixture・native Safari・未知環境・observer故障へ拡張しない。
変更時は自動継承せず再評価する。旧runは当時の契約のfailureのままである。

`test/e2e/csp-real-wasm.ts`は実生成検索module WorkerとSuzume 0.9.11の正常578362 bytes
（SHA-256 `f0ee2d14fcbbb0559c3246263aa907987012a1ff45939484ee6b79bae1821baf`）を使う。
専用serverのHTTP fixtureだけが有限の試験headerを受理し、既存Worker bytesへAPI計測を付加する。
親は候補ROのまま、対象Worker応答だけをenforceする。正常配信用artifactと製品コードは変更しない。
新context/Workerごとに許可あり/なしを対比し、streaming自身のfulfilledとbytes試行0回をA-W1とする。
A-W2は正常bytes/importsを維持してnative streamingへ非対応MIMEを与える予定対照から、
既存glueのbytes fallbackを選ぶ。選択理由・native API別結果・digest・imports契約を保存する。
`importsSource: suzume-0.9.11-generated-glue`を保存し、importsは実glue由来の`a.{a,b,c,d,e}`関数集合、契約IDは`suzume-0.9.11-emscripten-a-abcde-v1`である。
A-W3/W4はWASM許可だけを除き、streaming拒否後のbytes再試行も記録し、いずれかの成功はfailとする。
親Documentでも同じglue/正常bytesの両APIの許可対照と拒否を独立実行する。
WASM許可とJS eval/Function/文字列timerの拒否を分け、JS許可の隔離対照も取る。
Catalogへの退避は別の機能診断として保存し、WASM成功に数えない。

wrapperはnative Promise/例外をそのまま返し、通常のHTTP scriptからAPIを呼ぶ。
automationは結果を読み取るだけで、評価関数からWASM/evalを実行してCSP証拠にしない。
streamingが取得前にCSP拒否されbytesを観測できない場合は`pre-fetch-control`と明示する。
そのdigestは同じ正常入力の対照に基づく値であり、その呼出しでbytesを測定した証拠ではない。
許可対照の実測digest、凍結Worker/実HTTP、providerの検証済みbytes/importsを別に照合する。
通常のmeasured digestと混同せず、成功経路でこの代替値を許可しない。

A計測はBroadcastChannelの最小snapshot、通知診断はconsole分類として分離する。
診断だけの切断を故障注入し、Aが独立して測定できる場合だけunavailableを記録して非阻害とする。
共通計測故障・summary欠損・未知console・誤分類・証跡不整合は停止する。
JSONには生console/完全URL/本文等を追加せず、strict schemaの漏出負対照を維持する。
実使用WASMのconsole分類は`test/e2e/support/csp-wasm-console.ts`が所有する。
case、engine、完全なscript-src通知形式、実際のPage/Worker元オブジェクト、
検証済みHTTP script URLとAPI呼出し行を照合する。取得不能な発生元はunknownのままとする。
JavaScript文字列評価の拒否とWASM通知を分け、unsafe-eval単語や他directiveのCSP文言を包括受理しない。
固定WebKitの文字列timerは、固定上流`4d05d732`の`allowEval`が生成する完全なscript-src文言を
timerの呼出し位置・native引数形・実拒否結果・HTTP policyと照合する。eval/FunctionやWASMへ流用しない。
RO endpoint未指定の設定警告は、完全な親policy・Page元・native引数形・engineごとのlevelを照合し、
通知には数えない。生存するWorkerの許可対照とDocumentでは文字列timerの結果も確定してから診断へ渡す。
製品がWASM拒否でWorkerを終了する経路では、終了後のtimer callbackを待たない。
呼出し位置付きnative拒否ログの分類と、A-J1が要求する実timer結果は別であり、ログでpendingを合格化しない。
Suzume glueは同じnative APIの例外と完全一致する既知メッセージだけを、そのglueのURL/位置で分類する。
この照合用の例外文字列は別channelのRAM内だけで扱い、Aのschema・artifact・stdoutへ保存しない。
分類前の待機は有界100msとし、console件数・文字列長・例外集合も制限する。
既知Catalog警告は許可除去case、正確なapp entry URL/行、引数形と先頭引数の一致を要求し、通知に数えない。
未知source、短縮語、画像制限等の対象外CSP、通常consoleによるnative形式の模倣は負対照で拒否する。
console自体を署名付きの情報とは扱わず、任意のauthor JSが共存する画面一般への真正性保証へ広げない。
固定WebKitの隔離RO観測・例外と実使用WASM診断は別系統であり、この分類修正でRO例外を拡張しない。

## 段階と配信phase

Stage 1は既存14 RO試験、静的整合、実検索/Catalog不使用、RO HTTPとBの健全性を要求する。
新runnerや製品全体enforceを前提にしない。
Stage 2は実WASM A-W1〜W4/D1/J1/H1/F1に加えて、製品enforce・preview・cacheを要求する。
現在これら後段製品条件は`not-run / not-implemented`であり、実WASMだけが成功してもStage 2完了にはしない。
Stage 3限定ROはStage 2から独立し、Stage 0、限定範囲のRO互換、承認済み検証配信先と切戻しを要求する。
Stage 4は製品enforce/previewを含む対応する全Aが必要である。
配信前検証と別公開承認の後にだけ着手でき、配信後の対象HTTP/redirect/404/cache/代表操作を終えるまで
当該配信先の受入完了にしない。現在のCLIは公開承認をすべてfalseで出力する。
Cloudflare・native Safari・runner・Stage 0未決をローカルPlaywright成功で代用しない。

## 判定と後段ゲート

- [設計1.2との照合と条件変更](../references/csp-stage-one-design-1.2-audit-2026-11-01.md)を参照する。
  Stage 0全体完了と、許可された検証実装の開始は別である。
  当時のrunとraw通知coverageのfailureは保持する。現在の段階判定は[設計1.4照合記録](../references/csp-stage-one-design-1.4-audit-2026-11-01.md)と以下の規則に従う。

- [提供された設計1.1との照合記録](../references/csp-stage-one-design-1.1-audit-2026-10-31.md)を参照する。
  Library materializeではなく親からの正当な本文引渡しとして照合した。第6〜7章も3部の連続した追補で受領済み。
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
