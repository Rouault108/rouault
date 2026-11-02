# CSP preview成果物の準備

## 範囲と正本

本契約は公開権限を使わない組立て・検査・dry-runだけを所有する。
[後続の配信authorityと未接続gate](csp-preview-delivery.md)は別契約が所有する。
実装は`build/security/csp-preview-{artifact,headers,source}.ts`、入口は`scripts/prepare-csp-preview.ts`。
通常build、`dist/_headers`、Stage 1隔離、productionのmain専用authorityは変更しない。
新しいworkflow、privileged upload、Wrangler起動、R2 upload、DNS/Analytics/Access変更は含まない。

ユーザー提供の設定画面ではproject `rouault`はGit連携、production branchは`main`、Git自動配信とPages Web Analyticsは無効。
別の`rouault.page` Web Analyticsは自動設定で、EU訪問者を除くRUMを維持する意向である。
これらは提供された設定の確認であり、APIによる独立再確認や公開承認ではない。
Access画面の制限用buttonは制限が有効な証拠ではない。

候補branch `csp-verify`、origin `https://csp-verify.rouault.pages.dev`は固定した設計入力で、未作成・未検証。
media originは既存の公開画像参照で確認した`https://media.rouault.page`に限定する。
account ID・credential scopeは未知として残す。値の探索や新たな権限付与を行わない。
runtimeでtarget、branch、origin、account、command、任意の入力/出力pathを指定する機能はない。

## 実行と出力

install/build/testはdeployment credentialを持たない環境で行う。
組立て入口はCloudflare/R2/AWS等の配信credential・設定変数がある環境を拒否する。
組立て/dry-run入口はnetwork APIやdeploy/build/install commandを呼ばず、local Gitの固定した読取だけを行う。
`build:csp-preview`だけは固定した既存production buildを、URL contextと8桁buildIdを明示し、配信credentialを継承しないchildで実行する。
全baseline digestと完全なsource SHAを非公開build receiptへ記録し、組立て時に再照合する。
この検査はOSのnetwork隔離や、将来の配信資格情報の権限証明ではない。

cleanな専用検証checkoutで、対象commitのSHAとpreview用URL contextを使う。
既存依存はlockfileを固定し、同じNode/pnpmを使う。例はPowerShellである。

```powershell
$env:ROUAULT_SITE_ORIGIN = 'https://csp-verify.rouault.pages.dev'
$env:ROUAULT_MEDIA_BASE_URL = 'https://media.rouault.page'
$env:ROUAULT_BASE_PATH = ''
$env:GITHUB_SHA = git rev-parse HEAD
pnpm build:csp-preview
pnpm generate:csp-stage1
pnpm verify:csp-stage1
pnpm prepare:csp-preview
pnpm dry-run:csp-preview
```

既存出力は上書きしない。新candidateは別のclean checkoutで準備する。
候補originをビルドへ指定したことは、DNSやaliasの存在確認ではない。
本番origin/loopback用HTMLやenvelopeの再利用は拒否する。

- `dist/`: 元のCSP-free成果物。変更しない。
- `.generated/csp-preview-build.json`: clean sourceの完全SHAとbaseline digestを結ぶ非公開build receipt。
- `.generated/csp-preview/baseline/`: 同じpreview originのCSP-free切戻しcopy。
- `.generated/csp-preview/report-only/`: 配信候補copy。`_headers`以外の全bytesは元と一致する。
- `.generated/csp-preview/preparation.json`: 公開rootの外に置く最小receipt。

`assemble`は既存の検証済みCSP manifestとfragmentを読み、cache headerへRO ruleを追記する。
組立て後に全file集合・bytes/hash、headerの100 rule/2000 byte line上限、重複、comma結合、Workerのdetach→setを再検査する。
`dry-run`はcopyもreceiptも更新せず再計算・照合し、同じ最小JSONを返す。実HTTP、browser互換、Cloudflareの実装一致は未検証である。

公開route集合はsourceのpublication policyと照合し、HTML/envelopeの欠落・余剰を拒否する。
検索descriptor、Vite graph、sourceと一致する静的passthroughだけを認める。
未知file、診断JSON/report、private route、symlink、Functions、`_worker.js`、`_routes.json`等をcopy集合へ加えない。
`_redirects`は現在の有限な200 rewriteだけを扱い、外部redirectや未知規則を拒否する。
static `_headers`がredirect/Functions生成応答まで保護するとは説明しない。
mediaのnetwork到達や新しいR2 object配信は実施しない。必要な外部資源の実到達は後続ゲートで確認する。

receiptはsource SHA/buildId、policy/manifest/fragment digest、全fileの公開相対path・byte数・hash、baseline/artifact digest、未決ゲートを記録する。
query、検索語、script sample、生console、本文、local absolute path、secret、任意environmentを診断へ保存しない。
`publicationAllowed=false`、`stageAcceptance=not-evaluated`を固定し、準備成功から受入完了を生成しない。

## 将来の配信入口（設計のみ）

配信は別承認後のprivileged段階とする。account/project、非production branch、source SHA、承認済みartifact digestを固定し、
`main`・production origin・任意path/command・未確認identityを拒否する。
production uploaderのguardやrelease schemaを緩めず、候補コードのinstall/build/testとcredentialを同居させない。
配信jobは検証済み成果物だけを受け取り、候補のpackage lifecycleやscriptを資格情報付きで実行しない。
現在のGitHub environmentから別用途のcredentialを転用できるとは仮定しない。

新規`workflow_dispatch`ファイルを検証branchへ追加しただけではdefault branchで登録されない場合がある。
既存`ci-cd`のdispatchは検証に利用できるが公開しない。本段階ではworkflowを追加・変更しない。
将来は入口の差分レビュー、必要なdefault branch反映とactivation、資格情報の既存scope確認、preview公開の承認をそれぞれ得る。

公開後はWrangler structured output/Pages APIのdeployment ID・environment・branch・source SHA・aliasを照合し、
対象aliasのbuildId、HTML/envelope、header、Worker reset、route/redirect/404、cacheを実HTTPとbrowserで確認する。
古いimmutable URLは残り得る。結果不明のuploadを直ちに再試行せず、deployment ID/alias/HTTPから実行結果を確定する。
URLの推測やログのURL抽出を機械的authorityにしない。

切戻しは保持したdigestが一致する`baseline/`を**同じpreview origin/branchへ再upload**し、alias/buildId/実HTTPを再確認する。
Cloudflareのproduction rollbackをpreviewへ使用しない。旧deployment削除やAccess変更は別承認であり、本案に含まない。

## 観測と未完の条件

previewは既定でpublicであり、`noindex`はアクセス制限ではない。公開範囲は別判断が必要である。
同一Pages projectの共有設定・preview環境設定の影響を確認し、previewだけの変更が無関係なpreviewや本番へ波及しないと推測しない。
Pages上の検証成功は本番custom domainのzone/cache/Transform Rules/計測の成功を代替しない。
Analyticsは維持する方針であり、`rouault.page`の実通信先・script許可・EU除外は別の実hostゲートとして残す。

live RO観測は管理されたbrowserのHTTP/eventと限定consoleだけである。
report-uri/report-to/外部collectorや全訪問者の監視、serverへのreport配送は追加・保証しない。
RO継続はenforce互換の証拠ではない。

Stage 3限定ROはStage 2から独立だが、Stage 0の有限inventory・互換、承認済み配信先、切戻しと別公開承認が必要である。
製品enforce、HTTP preview runner、cache等のStage 2条件は未実装/未実施のまま残す。
実WASM Aの既存成功やこのdry-runでStage 2を完了にしない。
固定WebKit WASM ROのunmet/raw exit 1と完全キー限定例外は変更しない。
