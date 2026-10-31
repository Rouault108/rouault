# CSP設計1.1照合記録（第1段階）

## 出典と照合範囲

親から正当に引き渡された設計1.1本文を照合した。元Library identityは
`libfile_fe2f0fe69ae08191a984cc021ea56448` version0。
consumer側のLibrary read / prepare_materializeは未提供であり、materializeしたとは扱わない。
初回本文の省略は、親からの3部（245–310行、311–379行、380–432行）の追補で解消した。
6.1〜6.3、6.3末尾〜6.6、7.1〜7.3が連続し、先に受領した第8章へつながることを確認した。
全章の提供本文を対象に、第1段階の実装要件と後段の未実施要件を照合する。

設計の基点`fe5ec8b0`と実装開始時のmain`790625bc`を区別する。
今回の照合対象は初回実装`a3c59ab2`、第1回補正`cddc3a95`、および第7章追補後の補正差分である。
runner、enforce、公開、CI変更、collectorはこの作業の対象外である。

## 初回候補からの補正

| 設計箇所 | 初回候補との差・対応                                                                                        | 状態                           |
| -------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 4.1/4.2  | typed policyを独立ownerへ分離。mode/version/digest/buildId、theme owner2本、route class、資源許可理由を記録 | 実装・Node検証                 |
| 5.1/5.3  | style-src / style-src-elemのself＋unsafe-inline、style-src-attrのunsafe-inlineを初期例外として明示          | 設計候補へ補正                 |
| 5.1      | base-uri / form-action / frame-ancestors / manifest-srcをnoneへ補正                                         | 実装・RO検証                   |
| 5.1.1    | 採用済みrunner profileがないためframe-srcは空集合のnone。selfや任意hostで仮の承認を作らない                 | Stage 0の採否待ち              |
| 3.2/9.1  | 最終HTMLだけでなくnavigation envelopeと展開対象template、active CSS、Vite entry/import/Workerを照合         | 実装・Node検証                 |
| 3.2/9.1  | 未承認origin・外部HTTP・未知script/src・動的Worker・nonce/on属性・javascript URLを停止                      | negative test成功              |
| 3.2/5.1  | img-src data:を追加し、既存raster/base64/32KiB検証を必須とする。SVG dataや巨大dataを自動承認しない          | negative test成功              |
| 4.2/9.1  | theme最終本文・順序・本数・改行正規化を照合。追加scriptを発見だけでhash承認しない                           | 検証継続                       |
| 5.2      | 実際のVite出力ASTからmodule Worker URLを解決し、唯一性・import.meta.url・module optionを確認                | 実装・Node検証                 |
| 8.1      | 生console・完全URL・query・fragment・検索語・sampleを保存しない。最小schemaを永続化前に検証                 | Node＋最小schema検証付きRO観測 |
| 8.2      | fixture違反とknown-legacy-preview違反をowner付きで分類する                                                  | RO観測成功                     |

本番headerを生成してdistへ自動接続するという第4章の最終形は、今回の隔離範囲を越えるため未実施。
非公開`.generated/csp/`に候補と凍結manifestだけを出す。通常build・配信用_headers・通常previewは変更しない。

## 資源検証の意味

現行fixture buildで74文書、73 navigation envelope、163資産、active CSS参照130件、
非稼働passthrough CSS56件、media alias18件、CSP候補2ルールを確認した。
非稼働CSSは文書/envelope/Vite graphから参照されず、sourceとのbytes一致を確認したpassthrough資産である。
コンパイラ入力のbare package importを、実行中のブラウザーresourceと誤分類しない。
新たに参照されたCSSはactive集合へ入り、URL/import分類・存在確認の対象になる。

画像の公開object URLとローカル物理pathの差は既存buildに存在した。
既存media manifestと物理bytesのSHA/sizeを照合し、隔離serverだけがaliasを解決する。
画像resolver、content、通常preview、R2/Pages設定は変更しない。
aliasのMIME、nosniff、ETag、200/304、未知path拒否、bytes改変拒否をNode HTTP試験で確認する。

全ての将来のdynamic fetchやauthor JSの通信先を静的解析で証明したという意味ではない。
現在のrouter/searchの既知契約をmanifestに明示し、RO fixtureは想定外HTTP(S) originを送信前に止めて失敗させる。
新しい外部資源・preview通信要件は別途承認が必要である。

## 第1段階の実行証拠

- focused Node: 14件成功（hash、policy、未知資源、Vite graph、envelope、診断最小化、media alias）。
- CSP専用Chromium/Firefox: 各10件、合計20件成功。
- system/light/dark/storage拒否で、外部client moduleを停止してもtheme・header label/iconが一致。
- home/note/memo/corpus/tag/about/search/404の共通RO、no-JS本文、soft navigationのdocument継続を確認。
- WorkerはWASMを使用し、Catalogへ落ちず検索する。JS/WASM MIMEとnosniffを確認。
- Worker対照はconnect-src/blobとscript-src/wasm-evalの両方をreportし、lexicalを継続。
- style例外は明示的な許可として分類。legacy srcdocのscript/base/frameは既知違反として残り、button JSは継続。
- 未知path・欠損asset・未登録runner URLは404＋親policy。既知文書は200を維持する。
- 文書とWorkerの条件付きGETで304でも各policyが1組だけ維持される。これはHTTP応答の確認であり、browser warm cache/旧tabの全matrix完了ではない。
- HTML/CSS/JS/WASM/mediaのMIMEとnosniffを隔離HTTPで確認。
- 正常fixtureの未説明違反は失敗条件とする。外部collectorやreport endpointは作らない。

Node/pnpmのrepo pinは24.14.1 / 11.28.9のまま。
選択executorのNodeは24.19.0であり変更していない。pnpmはworkspace内Corepack shimで11.28.9を選択した。
既存CIはNode 24.14.1を使う。CSP専用browser試験をこのCIへ追加する設定変更は行わない。
厳密に同じNode pinでのローカル専用server試験は、実行環境整備後の確認事項として区別する。

## 未実施・不足の区別

| 項目                                                | 残る理由・次のgate                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 省略された第6〜7章                                  | 提供本文の不足。特にheader/reset/配信条件の全文照合には該当部分の再引渡しが必要                         |
| CSP専用WebKit                                       | 共有ライブラリ不足。公式install-depsのdry-runもAPT設定の読取り制約・package未解決で停止。OS変更は未実行 |
| 対応hostname / runner prefix / capability profile   | Stage 0の合意未実施。未登録hostnameを対応済みとしない                                                   |
| runner/protocol/HTTP sandbox/Blob author JS         | 第6章の後段実装。現行srcdocを改修していない                                                             |
| local enforce・悪性操作の実拒否・全cache回帰        | 第8.2章の段階2。ROの継続実行を防御完了とは扱わない                                                      |
| 任意URLの404 fallback・redirect・profile reset      | 現候補は生成済みルートを対象。Cloudflare実HTTPで追加検証が必要                                          |
| production/media実効値・Transform/Cache/Functions等 | 権限内の配信観測が必要。ローカル成功では代替しない                                                      |
| 200/304の実配信合成・minify/挿入・旧tab             | 段階3以後の配信前gate。header/body/hashの一致を実応答で確認                                             |
| 切戻しartifact・公開・本番enforcement               | 段階4の別承認。自動昇格しない                                                                           |

初回検証の履歴は[初回記録](csp-stage-one-validation-2026-10-31.md)に残す。
設計本文不足による未照合は解消した。上記の第1段階対象は照合済みであり、全engine・後段の受入条件や防御導入完了までを宣言するものではない。

第7章のreset順序はCloudflareの[固定公開実装](https://github.com/cloudflare/workers-sdk/blob/3f14c760aba638b3ef4ade1a1c5b935e64ddcc64/packages/pages-shared/asset-server/handler.ts#L525)でも照合した。
実装はrule順にunset後setを行い、同名setの合成を扱う。ローカルの一致は現在のPages実応答を保証しない。
