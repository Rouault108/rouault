# CSP設計1.4の実装と受入条件

## 入力と基点

設計1.4は親スレッドから1〜944行を連続した4部として受領した提供本文である。
今回の新添付IDは`libfile_ec3307ff9ff88191b3e176273258a0f1`。
親の正規取得による照合値は120212 bytes、944行、SHA-256
`06b76d0f5a27a5e9e831de2f5f2a200ba41b7b2769ad5fd99f5432a3e06c5b2f`。
この実装環境でLibrary materializeや原bytesの独立再計算を行ったとは扱わない。
区切り1〜300/301〜500/501〜700/701〜944の連続性と全13章を確認した。

実装基点は検証枝`e5ce845af2e420097c42606d5d5b8bc062945ed3`。
作業開始時にremote main `8947d3f5e556b010710dab39c87610fdbabed5da`と現行AGENTSを再確認した。
mainは既に検証枝の祖先であり、新たなmergeは不要だった。
旧CI `41289967875`と提供JSONのraw coverage exit 1は、当時の契約の結果として保持する。

## 受入条件の対照

| 項目 | 設計1.2検証 | 設計1.4実装 |
| --- | --- | --- |
| 個別専用試験 | 固定14件 | 既存14件を維持し実Suzume収集と独立性故障注入を加えた16件。収集成功はA合格ではない |
| B通知能力 | Worker connect/WASM、未達はraw exit 1 | raw enumとexitを維持。既存Document ROも有限完全キーのregistryで明示 |
| 段階判定 | 必須raw coverageと同じ | 必須A/B・健全性・段階/phase・公開承認から別算出 |
| 固定WebKit Worker WASM RO | unmet、公開ゲート停止 | unmetを保存。完全キーと14条件・同一候補・固定環境が一致し、他の必要条件が成立する場合だけ段階1〜4で限定例外 |
| enforce通知 | 明示的な役割なし | 診断専用。未観測を必須Bへ自動追加せず、RO例外を適用しない |
| 実使用WASM | 小module compileと通常RO検索 | 実生成Worker/Suzume bytes/glueによるstreaming/bytes両APIの許可・拒否、親Document対照、JS評価拒否を追加 |
| 診断故障 | 必須observerの負対照 | A/Bとの独立性と最小summaryを検証。共通故障・不明・欠損は停止 |
| 公開 | 必須CI依存と別承認 | 既存依存を維持。技術判定だけではCSP公開・本番受入を許可しない |

完全キー・固定case・必要artifactは`csp-notification-registry.ts`、
Aと段階の必要集合は`csp-stage-acceptance.ts`を正本とする。
役割自己申告、キー差替え、未知console、別SHA/run、指紋変更、欠損、別unmet、
streaming失敗後のbytes成功、imports/digest/分岐理由欠損を自己試験で拒否する。
合成fixtureのpassを実browser測定へ加算しない。

## 実使用APIの証拠

製品コード・依存APIは変更しない。CSP専用serverの実HTTP Worker応答だけへ計測を追加する。
正常Suzume 0.9.11 WASMは578362 bytes、SHA-256
`f0ee2d14fcbbb0559c3246263aa907987012a1ff45939484ee6b79bae1821baf`。
正常glueは12466 bytes、SHA-256
`8b07ad2c426ea641f04ed8914b60178f9942bf70bc041381b1656173e6941e34`。
許可/拒否は新context/Workerで、同じbytes/imports/資源を用いWASM許可だけを変更する。

streamingのnative Promise成功とbytes試行0をA-W1に要求する。
bytes側は同じbytes/importsを保ちnative MIME対照で既存glueのfallbackを選び、
予定理由とAPI別の実結果を記録する。拒否後fallbackの成功はA-W3を失敗させる。
CSPが入力取得前に拒否した場合の`pre-fetch-control`は正常対照由来の値であり、
当該呼出しの実測hashと偽らない。許可対照のmeasured hash・実HTTP・元Worker指紋を別照合する。
Catalog fallback、通知の有無、AのAPI判定を分離する。

保存するのは固定ID、hash、環境、schema化したAPI結果・分類・健全性・判定だけである。
生console、完全URL、query、検索語、本文、source/sample、local absolute pathは保存しない。
新規依存・install・browser/container更新・collectorは追加しない。

## CIの具体的変更

`test-csp`のbuild起動条件、3engine、固定container、Node/pnpm、retry 0、
既存`csp-required`/`ci-required`/公開依存を維持する。
`verify-csp-coverage` stepは`evaluate-csp-stage.ts`へ接続し、Stage 1内部判定を終了コードにする。
raw coverageは従来validatorで再計算し、未達とexit 1を別fieldに保持する。
`continue-on-error`、期待失敗の成功化、skipによる免除は使わない。
専用artifactの固定allowlistにDocument、Worker binding、WASM、故障対照、registry、受入表を追加する。
source contract/needsと負対照もこの具体的構造に合わせる。

Stage 1隔離ガードは通常`dist/_headers`にCSPが入ると失敗する。
このCI接続は後段のCSP製品公開を暗黙に解禁するものではない。

## 残る段階

Stage 0の有限origin・実資源・互換性判断、HTTP preview runnerと契約、
製品全体enforce/禁止操作/cache、承認済み検証配信先、切戻し、公開承認、配信後実応答は未完である。
対応するA行をnot-runとして保存し、Stage 2〜4完了を宣言しない。
限定ROのStage 3はStage 2から独立だが、Stage 0と限定RO自身の検証配信・切戻しが必要である。
native Safari、実Cloudflare、全訪問者の通知完全性も未測定のままとする。

最終candidate SHA/runと実browser結果は当該Actions artifact/noticeに結び付ける。
この文書の期待値やローカル自己試験を、未実行engineの実測へ読み替えない。
