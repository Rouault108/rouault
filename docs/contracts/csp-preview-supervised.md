# 一回限りの監督付きCSP preview

## 目的と範囲

public previewを一度検証するためのlocal手順である。専用R2 journal、GitHub environment、
新workflowのmain登録を前提にしない。通常の自動配信は[既存契約](csp-preview-delivery.md)のまま無効である。
本経路はそれを空のjournalや偽のproducer証跡で迂回しない。新CI設定、main反映、本番CSP、
本番R2、Access、DNS、旧deployment削除は変更しない。

これは既存公開内容を用いる検証用preview配信であり、Stage 3の本番限定RO受入やStage 2の完成ではない。
既存の後段ゲートをsuccessへ変更せず、公開前の検証配信先について実HTTP等の証跡を集める。
browser RO観測や必要な実配信条件が未完の間は、当該配信先のCSP受入完了も宣言しない。

対象はproject `rouault`、非production branch `csp-verify`、候補origin
`https://csp-verify.rouault.pages.dev`、media `https://media.rouault.page`だけ。
hostnameは作成・検証済みとしない。projectのproduction branchがmainであることと、現在のalias所有者を
serviceから確認する。account内の同名projectだけでなく`subdomain=rouault.pages.dev`も照合する。未確認aliasを上書きせず、reviewの`previousAliasId`と一致しなければ停止する。

固定sourceは`0f6eac670e3e769f654c89f999eb75885ab0a018`、source CIは`41744799022` attempt 1。
公開済みmainの確認基準は`b61a536546f30c9df4cb7386205728d0336219d5`へ更新した。
固定sourceとこのmainの`content/`・`examples/`・`public/`・`eleventy.config.ts`・
`package.json`・`pnpm-lock.yaml`に差分はない。main側の数式診断・macro隔離とフォント検査の
変更は生成pipelineの差分として確認し、mainと旧sourceの成果物bytesが同一とは扱わない。
payloadは引き続き旧sourceの固定packetだけとし、新しいmainのbuildへ置換しない。
旧公開済みmain `a13792bd6411b4a5774fb0bf427e3bf1aa4e0d54`については、
本番CI `41731776238`で72 route・build ID・検索資産のHTTP確認が成功した証跡を保持する。
新しい監督toolのSHA/CIと、配信する旧sourceのSHA/CIを別々に固定する。
公開本文やpayloadを変更した場合はこの有限planを再レビューする。source/workflow/SHAを任意入力へ拡張しない。

## 成果物と事前検査

review済みpacketをcleanなtool checkoutの`.generated/csp-preview/`へdataとして配置する。
`proof/`とreceiptは配信rootではない。独立に保持したpacket/RO/baseline/receipt digestを
`SUPERVISED_SOURCE`へ固定し、`inspectPreviewPacket`で再計算する。candidateの自己申告receiptだけを承認にしない。
既存のhash、inventory、file集合、非header bytes一致、Worker detach→set、header制限、
private/Functions/未知file拒否を再利用する。

```sh
node --import tsx scripts/deploy/run-csp-preview-supervised.ts inspect
```

この操作は資格情報も外部通信も使わない。公開可否はfalseで、未確定条件を出力する。
2026-11-05に固定sourceをNode 24.x・指定pnpm 11.28.9・frozen lockfileで、資格情報を
渡さず再生成し、build/inventory/組立て/dry-runは成功した。ただしenvelope等に新しい
generatedAtが含まれるため、432 fileでも以前のpacket/RO/baseline digestとは一致しない。
`inspectSupervisedPacket`は`supervised-reviewed-packet-differs`で拒否した。再生成物を
以前の固定packetとして採用せず、既存の独立digestと照合条件は維持する。元のpacketを
回復するか、再生成物そのものの有限planを独立に再レビューするまで配信へ進めない。
`supervise`ではpacketのsource CIと現在のtool CIを固定GitHub APIから確認する。
workflow bytes digest、run/attempt、SHA、repository、必須jobを検査し、mainが確認済みSHAから動いていれば停止する。
public repositoryの読み取りには匿名APIを使い、新PATや`actions: write`を要求しない。
producer workflowがないため、架空のartifact IDやmain workflow実行を作って既存自動配信のauthorityへ渡さない。

## 監督とローカル記録の限界

`review.json`は固定の`.generated/csp-supervised/review.json`へ置く非秘密の確認記録である。
account、target、packetの完全identity、source/tool CI、公開済みmain、直前alias所有者、
承認ref、認証の非秘密labelと確認ref、有効な監督windowを含む。windowは最大1時間、確認応答の待機は最大5分、接続処理全体は最大10分。
token値、query、本文、script sample、生consoleは入れない。label/purposeの入力だけで実tokenのscopeを認証したとは扱わず、非秘密の権限確認を承認refへ対応付ける。review自身から生存中permitを復元しない。

`supervise`は対話TTYでだけ実行する。新しいchallenge、sourceとtoolのSHA、digest、
事前deployment ID集合・server時刻、baselineを監督者が確認して保持する。
同じ生存中processが発行したchallengeへの明示応答が必要で、保存した応答を次のprocessへ流用できない。
recordは固定marker名のfileをexclusive作成し、各段階をhash chain・sync付きで保存する。
生存中handleのinode、file集合上の位置、全bytesを照合し、削除・置換・巻戻し・改変で停止する。
一度消費したメモリー内permitは、並行呼出し・例外・record復元によって戻らない。

**これはlocal記録によるglobal exactly-onceの保証ではない。** 別machine、record全消失、
processやfilesystem全体の巻戻し、同じ権限を持つ別operatorを機械的には排除できない。
失敗・中断・記録消失や復元があれば、そのplanは再度`supervise`しない。監督者は同じ一般承認を再利用して
新challengeへ応答せず、状態不明の間は読取による照合だけを行う。この運用を守れない無人配信には使わない。
新しい承認refだけで重複を避けた扱いにもせず、同じaccount/packet/modeのservice markerを固定する。
既存markerは成功・失敗・処理中を問わず新規配信を止める。ただし一覧0件は未実行の証明ではない。

recordから再開できるのは次の読取操作だけである。

```sh
node --import tsx scripts/deploy/run-csp-preview-supervised.ts reconcile
```

`reconcile`はrecordを作り直さず、PUT/POSTやuploaderを呼ばない。recordが失われた場合もservice状態を読むが、
事前集合が不明なら、HTTP内容一致と今回のoperation確認を別々に保存し、今回成功と推定しない。
複数marker、古い同一source、別ID、別alias、時刻不整合は停止する。
receipt IDで候補を絞って重複を隠さない。raw失敗と未知状態を保持し、自動再送しない。

## 単一creation POSTと配信後確認

資格情報なしのbuild/test/packet検査を済ませてから、一時のPages認証を使う。
固定Wrangler 4.100.0は`pages project upload`のasset-onlyに限定する。
stockの`pages deploy`は8000000応答でcreation POSTを再送するため使わない。
assetのcontent-addressed upload再送と、deployment作成一回を混同しない。

creationは専用Node adapterの一回のrequestだけ。GET用transportとcreation用transportを分離し、汎用fetchへcreationをfallbackしない。proxy環境とCAを維持した専用Agentを使い、
socketを再利用せず、redirect/5xx/8000000/切断でも再送しない。
これはclient側のcreation POST回数の制約であり、Cloudflare内部処理のexactly-onceは保証しない。
project/source/marker/branchとservice ID、完全な事前snapshot、server時刻、現在aliasを照合する。
結果不明ならGETとHTTPの照合だけを行い、有限windowの未観測から新規POSTを許可しない。

HTTP verifierはalias/immutableの両方について全file、72 route、検索資産、MIME、CSP/Worker reset、
cache/ETag/304、media bytesを検査する。実serviceへの接続前はloopback結果として記録し、実Pages合格にしない。
公開URLはservice照合とHTTP確認が成功した場合だけ`verifiedUrl`へ出す。
制御したbrowserでのRO event/限定console観測、本番hostのAnalytics/EU条件、native Safari、
browserのcache合成、Stage 2の製品enforce/runnerは別の検証であり、HTTP成功から推定しない。
WebKit Worker WASM ROの既知unmet/raw exit 1は変更しない。collectorやreport先も追加しない。

## 認証・接続と切戻し

既存の広範なrouault build tokenとproduction R2は変更・削除・転用しない。
`CLOUDFLARE_API_TOKEN`やR2/AWS keyを含む環境は本経路が拒否する。
OAuth cacheからの自動取得や`wrangler login`も行わない。親Pages tokenを子へ渡さず、asset用JWTだけを渡す。
既存の適切なPages専用認証が確認できた場合だけ、承認した一時process環境の
`CSP_SUPERVISED_PAGES_TOKEN`を使う。値をchat、review、log、repoへ書かない。

利用可能な認証がなければ、新規発行の対象account、権限、期限と渡し方を具体化して別承認を求める。
案は対象accountのPages Editだけ、実行開始から1時間のTTL、R2/DNS/Account token管理権限なし。
Pages Editはprojectの作成・変更・削除を含むaccount権限であり、このtoken自身を
branch/project限定や物理的一回限りとは説明しない。toolはproject/branchを固定してさらに制限する。
OAuth loginは更新用credentialを保存するため、永続接続の別承認なしに代替採用しない。

2026-11-05のmanaged executorでは、Cloudflare API、projectのpages.dev、media hostの
接続許可がenforcedで、今回用secret bindingはreadyである。account token用verify APIは
activeを返し、projectのname/subdomain/production branchも読取で確認した。
これはPages Editの全操作を実試験した証拠ではない。user token用verify APIの401を
account tokenの失効とは扱わず、正規のaccount verify結果と区別する。

同日のpreview一覧は223件すべてを9ページで読取り、`csp-verify`のbranch/aliasと
監督付きmarkerは0件だった。Pagesの`created_on`は小数秒6桁で返されたため、
読取adapterはUTCの小数秒0〜6桁を受け付け、既存receiptと同じミリ秒へ正規化する。
完全な一覧、重複ID、server時刻、未来のdeploymentを拒否する検査は維持する。

既存immutable URL、候補alias、media rootへのPython標準clientのGETは403だった。
応答本文・診断headerを保持できていないため、拒否元やerror codeは未確定である。
公式の[Error 1010](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/)
にはPages管理zoneで標準urllib User-Agentを拒否する条件と、実アプリを明示する
User-Agentの案内がある。今回のclient条件とは整合するが、1010の実測証拠ではない。
許可済みnetwork設定だけからHTTP到達を成功扱いにせず、同じ拒否操作の反復や
proxy解除・別endpoint・旧build tokenによる回避は行わない。診断情報または明示した
client条件での正規確認が得られるまで、実HTTPゲートと配信は未完のままにする。
別machineで実行する場合もreview済みtool/packetと同じ監督手順を使う。
main workflow登録なしのlocal実行は可能な設計だが、実認証・実ネットワーク接続の成功を意味しない。

baselineは同じpreview originで生成済みのCSP-free copyと独立digestを保持する。
切戻しは自動再送ではなく、状態照合後の別承認・別baseline planで同じbranchへ一度だけuploadする。
production rollbackや旧deployment削除は呼ばない。baseline/RO/記録は検証と切戻し確認まで保持する。
既存GitHub artifactの30日保持を、Pages URLの失効期限やlocal fileの耐久性と混同しない。

公式根拠: [Pages Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、
[token権限](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)、
[TTL](https://developers.cloudflare.com/fundamentals/api/how-to/restrict-tokens/)、
[Wrangler認証保存](https://developers.cloudflare.com/workers/wrangler/commands/general/)、
[Node proxy Agent](https://nodejs.org/docs/latest-v24.x/api/http.html#built-in-proxy-support)。
