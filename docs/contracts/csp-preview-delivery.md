# CSP preview配信のauthority境界

## 状態と責務

本契約は[成果物準備](csp-preview-preparation.md)に続く無資格情報のpacket作成とtrusted側の配信adapterを所有する。
準備入口は`.github/workflows/csp-preview-delivery.yml`と`scripts/deploy/prepare-csp-preview-delivery.ts`。
配信compositionは`csp-preview-runtime.ts`、将来の固定CLIは`run-csp-preview-delivery.ts`で、現workflowには接続しない。
通常`ci-cd`、production uploaderのmain専用guard、R2同期、通常`dist/_headers`は変更しない。

| 境界                                                                              | 状態                                                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 無資格情報のcandidate test/build→generate→verify→assemble→dry-run→packet          | 実装。既存CIとローカルで検証する                                           |
| default branchの承認schema、service metadata照合、packet再計算                    | 実装。候補receiptだけでは公開できない                                      |
| reservation、結果不明時の停止、API/alias/source照合、切戻し選択                   | 条件付きjournal・試行identityを持つtransaction。模擬serviceで検証          |
| cross-run artifact取得・永続reservation・Wrangler/Pages API・実HTTPのlive adapter | 実装・transport/process/storage注入とloopbackで検証。実service接続は未実施 |
| workflow登録・main反映・credential binding・限定preview公開                       | 未実施。検証branchの追加だけでは登録済みとしない                           |

`delivery-preflight`は現在必ず非ゼロで停止する。credentialの参照・環境割当て・権限追加は含めない。
準備jobは`contents: read`だけとし、candidateのinstall/test/buildへ公開資格情報を渡さない。
trusted jobは`${{ github.workflow_sha }}`をcheckoutし、candidate checkout/package実行を行わない。
trusted lockfileのinstallは資格情報接続前にlifecycle scriptを無効にして行う。
adapterの模擬試験成功だけで「公開jobが運用可能」と表示しない。
`deliveryEnabled=false`、`journal=null`、`actionsReadApproved=false`と承認集合空を維持する。
CLIはclean trusted checkout・default branch identity・review済みpolicyを検査し、無効時はcredential getterにも到達しない。

## 固定targetと独立承認

project `rouault`、branch `csp-verify`、origin `https://csp-verify.rouault.pages.dev`だけを扱う。
これは未作成・未検証の候補であり、`main`、production origin、別project/branch、任意command/pathは入力にしない。
media originは`https://media.rouault.page`に限定し、previewからR2へuploadしない。

`.github/csp-preview-delivery.json`はtrusted default branchでレビューする非秘密のauthorityを所有する。
現在はaccount/binding不明、全gate false、承認集合空で、公開不可である。
candidate receipt、workflow output、dispatch入力から承認値を自動採用しない。

公開前に次の非秘密情報・判断が必要である。token値は入力・出力・資料へ記載しない。

- 対象account ID、既存credential bindingの所在、既存tokenの対象accountとPages権限。token有効性だけをscope確認の代用にしない。
- project実在、production branchがmainであること、preview branch/alias、共有設定・Access・公開範囲。`noindex`はアクセス制限ではない。
- Stage 0の有限inventory・互換、同一preview originのbaseline保持、対象artifactへの公開承認。
- cross-run artifactと過去attemptを読む`actions: read`の追加承認。現workflowには追加していない。
- adapterの独立レビュー、必要なdefault branch反映・登録、資格情報の利用方法の承認。
- journalの専用保存先・Object Read/Write権限・初期化と永続bindingの承認。既存production mediaのR2権限を転用しない。

各承認行はmode（`report-only`/`baseline`）、full source SHA、正常な候補CI run/attemptとworkflow bytes digest、
producer run/attemptとtrusted workflow SHA、artifact ID、GitHub serviceのZIP digest、
独立に照合するpacket/receipt/RO/baseline digest、承認参照IDを固定する。
producerのhead SHAはtrusted workflowのSHAであり、candidate source SHAとは別identityである。
承認record作成前に、レビュー側がservice metadataと実packetを照合する。
service metadataは固定repositoryのGitHub APIから取得する設計とし、候補同梱JSONで代用しない。
期限切れ、別run/attempt/workflow/repository/CI定義/SHA、digest不一致は停止する。
現状の模擬metadata合格を実serviceの確認済みとしない。
`csp-preview-github.ts`は固定repositoryのmetadata・全pagination・producer/CI attemptとjob・CI git blobを照合する。
ZIP取得は固定artifact IDの302一回と、明示したAzure host二件だけを許可する。GitHub Authorizationをredirect先へ渡さず、
ZIP digest・128MiB archive/展開総量・32MiB/file・2000 entryを検査する。ZIP64、未知extra field、symlink、重複/大文字小文字alias、traversalは拒否する。
現host集合とPages response schemaは実serviceへの接続試験前の対応profileであり、未知のredirect/応答を自動許可しない。

## packetと検証

clean checkoutで[準備入口](csp-preview-preparation.md)の全chainを完了後、次を実行する。

```powershell
node --import tsx scripts/deploy/prepare-csp-preview-delivery.ts stage
```

stagingは既存dry-runを実行し、source-owned allowlistの実検査も通す。
`.generated/csp-preview/`のbaseline/RO/receiptに、非配信用`proof/`を追加する。
proofは凍結CSP manifest/fragment、Vite graph、full source SHAのbuild stampだけである。
private content、raw console、本文/script sample、URL query、secret、任意環境は診断へ保存しない。
stdoutはSHA/buildId/digest/file数と公開不可状態だけである。

trusted verifierはbounded file scanと既存hash/resource inventory・header parser/resolverを再利用する。
baselineはCSP-free、ROは`_headers`だけ変更、Workerはdetach→set、非header bytesと全file集合が一致することを再計算する。
余剰proof/診断file、private root、Functions、`_worker.js`、`_routes.json`、Wrangler設定等を拒否する。
元のsource-owned publication検査と独立承認した全体digestを維持し、発見だけで許可を増やさない。
再配置後のpassthrough CSSもtrusted checkoutの`src/`とbytes照合する。source rootをcandidate inputで上書きしない。
承認candidateのCSSがtrusted正本と異なれば停止し、対応する正本更新をレビューする。
小fixtureの合格は構造検査であり、実WASMや全publication routeの検証済み証拠ではない。

live adapterを接続する場合、trusted runnerは承認済みpacketだけをdataとしてdownloadし、ZIP/service digestも照合する。
候補install/script/package lifecycle/Wrangler configを実行しない。
選択した`report-only/`か`baseline/`だけをisolated cwdの固定`payload/`へcopyし、copy後のdigestも照合する。
proof/receiptは公開rootへ含めない。trusted lockfileの固定Wranglerを明示account/project/branch/source SHAで起動する。
production scriptを流用してmain guardやproduction release schemaを緩めない。

## attempt・切戻し・配信後確認

transaction modelは完全な履歴と未使用承認を確認し、upload前にdurable reservationを保存する。
履歴欠損や同じ承認の過去attemptは停止する。永続化adapterは非cancel concurrencyと併用し、中断後も過去attemptを見落とさない方式をレビューする。
保存adapterのコードはあるが、実保存先は未作成・未接続である。模擬CASの合格だけで実serviceの永続性やexactly-onceを保証しない。
upload開始後のerror、API/alias/HTTP確認不能は`uncertain`とし、自動再uploadしない。
一覧0件や有限時間の未観測から未実行を推定しない。複数候補・不一致・HTTP未確認はuncertainを保持する。
解消後も再操作には新しい承認を要求する。

`schema:2`のattemptにGitHub run/attempt・random UUID marker・trusted workflow SHA、完全な事前deployment ID集合と
server時刻/digest、upload開始、service deployment IDと確認した作成/観測時刻を保存する。markerはWranglerのcommit metadataへ明示する。
reconcileは現在aliasのHTTP内容一致（`contentStatus`）と今回のservice受理確認（`operationStatus`）を別判定する。
事前集合にないID、今回marker、service作成時刻、既知receipt IDが一致し、そのdeploymentが現在aliasでなければverifiedにしない。
古い同一SHA・同一payloadだけなら`contentStatus=matches / operationStatus=unknown / status=uncertain`を保持する。
`reconcile`はuploadを実行しない。既にverifiedの承認は再実行しない。

## journalの未接続保存案

`csp-preview-journal.ts`は既存S3 SDKを使い、専用bucket候補`rouault-csp-preview-journal`の
固定key `csp-preview/rouault/csp-verify/journal-v1.json`だけをGET/PUTする。現時点でbucket作成・実PUT・binding設定は行わない。
将来のbootstrapは別承認したgeneration UUIDと`If-None-Match: *`で一度だけ作り、reserveから自動作成・復元しない。
イベント列・sequence・前hash・head hashを含む全履歴（上限8MiB/5000event）を同一objectの`If-Match: ETag`で原子的に更新する。
同一承認の重複と、未解決attemptがある間の別承認を同じCASで拒否する。履歴欠損・破損は停止する。
競合応答だけは再読取して有界で再評価し、書込応答消失はGETで自分のeventを照合する。未確認なら再PUTしない。
SDKのretryは1 attemptに固定する。管理者による過去object全体への復元をhash chainだけで検出できるとは扱わず、
将来の保存先運用では削除・巻戻しを禁止し、権限・復旧手順をレビューする。

必要な追加権限はtrusted jobの`actions: read`と専用journalのObject Read/Writeで、どちらも未承認・未設定である。
R2の権限bundleにDelete/Listが含まれる場合はその範囲も事前説明し、コードはDelete/List/CreateBucketを呼ばない。
新PAT、`actions: write`、repository code writeは要求しない。Pages tokenのscope・account確認と永続bindingも別判断とする。

## adapterの検証範囲

`csp-preview-pages.ts`は固定account/projectのpreview全件snapshot・server時刻・deploymentを読み、自由なcommit本文やenv値を保存しない。
`csp-preview-wrangler.ts`はtrusted固定versionのentryを、最小env・shellなし・private cwdで起動する。
payloadだけをcopyして起動前後に再hashし、親/candidate config探索を最小configで止める。stdout/stderrは保存せず、
bounded structured receiptのIDをPages APIで独立照合する。candidateのpackageやproofは実行・公開しない。
`csp-preview-http.ts`はalias/immutable両方の全included fileとroute/envelope、Worker/parent CSP、MIME/nosniff、
正規化・404・cache・ETag/304・資源のbytesを照合する。外部mediaは固定originのcontent-hash key/MIME/cacheへ限定する。
HTTP検査はbrowserの304合成・enforce・RO event検査を代替しない。両方not-runを残す。

自己試験では固定metadata、独立ZIP fixture、実SDK serializer、in-memory CAS、制御したlocal child、loopback HTTPを使う。
競合・応答消失・中断・古い同一SHA・欠損/変更packet・policy漏出を拒否する。実GitHub artifact download、
R2 persistence、Pages response・Wrangler upload、実alias/Access確認は未実施であり、この模擬結果へ加算しない。

Pages APIのdeployment ID・preview environment・project・branch・full source SHA・成功stage・aliasと、
aliasのbuildId、選択payload、header/body、route/redirect/404/cacheの実HTTPを照合する。
stdoutのURL抽出やreceiptだけをdeployment authorityにしない。
切戻しは独立承認した`baseline` modeで、保持digestが一致するCSP-free成果物を**同じpreview origin/branch**へ再uploadする。
production rollbackは呼ばない。旧immutable URLは残り得て、削除・Access変更は含めない。
切戻し後もalias/buildId/実HTTPを照合する。

## 受入との関係

live RO観測は管理されたbrowserのHTTP・event・限定consoleだけで、report-uri/report-to/collectorを追加しない。
全訪問者監視やserver report配送を保証しない。RO継続はenforce互換性の証拠ではない。
Pages previewの成功をproduction zoneのAnalytics許可・EU除外の確認に流用しない。
Analytics維持の合意と本番実host gateを残す。
Stage 3限定ROにはStage 0・配信先・切戻し・別公開承認と配信後確認が必要である。
Stage 2製品enforce・HTTP runner・cache等は未完のまま残る。
固定WebKit Worker WASM ROのunmet/raw exit 1、限定例外、A/B・個別試験・段階判定の区別を変更しない。

公式仕様: [GitHub artifact metadata](https://docs.github.com/en/rest/actions/artifacts)、
[workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)、
[Pages preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)、
[Pages deployment API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/list/)。

保存仕様: [R2 conditional PutObject](https://developers.cloudflare.com/r2/api/s3/api/)、[R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)。
