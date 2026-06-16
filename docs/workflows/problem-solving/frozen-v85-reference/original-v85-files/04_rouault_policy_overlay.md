# 04. Rouault Policy Overlay

このファイルは、Rouault固有契約、標準Verification Set、performance検証候補の正本です。

## 1. 位置づけ

このファイルは、Rouault固有の設計原則とチェックリストです。中核ワークフローではありません。該当する問題種別だけ参照します。

## 2. Rouaultの基本原則

```text
- 静的HTMLを主体とする
- Litはenhancementとして扱う
- UIの成立条件をLit実行後に依存させない
- 長期保守性を最優先する
- 既存互換性や最小差分は優先しない
- 根拠のない削除をしない
- テスト回避をしない
- 仕様不明な暫定対応をしない
- DOM / CSS / ARIA / data属性 / slot / event名 / CustomEvent detailを暗黙の契約として扱う
- state / URL / storage / preference / cacheも契約として扱う
- generated files / lockfile / package manager設定を根拠なく変更しない
- security / sanitizationに関わる変更では安全側に倒す
- 個人ノート本文、ログ、スクリーンショット、検索index、生成物の機密情報を最小化し、外部共有前にredactする
- API key、token、cookie、secret、private repository URL、ローカル絶対パスを公開成果物へ混入させない
```

## 2.1 個人ノート・機密情報保護

Rouaultは個人的なノートを読むアプリケーションであるため、問題解決時のEvidenceにも非公開情報が混入し得ます。

```text
- Evidence、ログ、スクリーンショット、検索index、生成物に個人ノート本文や非公開情報が含まれていないか確認する
- ChatGPT / Codex / GitHub issue / commit message / CIログへ貼る前に、不要な本文・パス・個人情報・秘密情報を最小化またはredactする
- API key、token、cookie、secret名、private repository URL、ブラウザプロファイル情報、ローカル絶対パスをログ、fixture、commit message、PR説明へ混入させない
- 問題再現に本文が必要な場合は、可能な限り最小の合成データまたは匿名化データで再現し、必要に応じて `03_templates.md` のSynthetic Fixture Recordへ記録する
- 非公開ノート本文を原因説明に使う場合は、引用範囲を最小化し、公開成果物へ混入させない
- screenshotをEvidenceにする場合は、ノート本文、ファイル名、個人識別情報、URL、ローカルパスを確認する
- 検索index、生成済みJSON、HTML出力、CI artifactに本文が含まれる場合は、共有範囲を限定する
- CI artifactや外部ログが失効する可能性がある場合は、redaction済みの最小抜粋だけをEvidenceへ保存する
```

```text
- 機密情報を含むEvidenceを外部AIへ渡す必要がある場合は、人間が共有可否を判断する
- Codexへ渡すFix Planには、再現に不要な本文や秘密情報を含めない
- commit messageやPR説明に個人ノート本文を引用しない
- unredacted dataの保存場所はローカル限定とし、公開成果物、commit、PR、外部AI入力に含めない
- local-private / ci-private / external-restricted Artifactは、repository-redacted Manifestへ実path、未redactファイル名、個人データ由来digestを記録しない
- private Manifestまたはrestricted attestationへ実locatorとdigestを保存し、公開Manifestではopaque referenceだけを使う
```

## 3. 契約として扱うもの

```text
- DOM構造
- data属性
- class名
- CSS custom properties
- ARIA属性
- role
- label
- focus order
- slot
- event名
- CustomEvent detail
- URL / route
- localStorage / sessionStorage key
- URL state
- scroll position
- selected note / selected route
- theme / reading preference
- cache
- generated fileの形式
- package manager設定
- scriptの入出力
```

契約へ触れる場合は、契約変更なのか、既存契約への追従なのかを分けて扱います。契約変更、仕様判断、アクセシビリティ意味変更、安全性判断を伴う場合は原則としてR3に昇格します。既存契約への追従、明確なバグ修正、契約を変えない補完であれば、R2-fullに留めてよいです。

### 3.1 契約根拠の優先順位

契約の根拠が衝突する場合は、次の順に確認します。

```text
1. 安全性、機密保護、法的・公開範囲上の制約
2. ユーザーが今回のIssueで明示した最終判断。ただし安全・機密保護には優越しない
3. `docs/contracts/` の機能契約
4. `docs/design-system/` のDesign System契約
5. 現行の型、schema、生成契約、custom-elements manifest等の機械可読契約
6. `docs/references/` の詳細参照。ただしContractを上書きしない
7. `docs/guides/` の運用・執筆案内。ただしContractを上書きしない
8. 既存テストが固定している外部可視の挙動
9. 現行実装のDOM / CSS / ARIA / state / routing / search契約
10. snapshot / visual / paint contract
11. `docs/adr/` の設計判断経緯。現在の挙動を再定義する根拠にはしない
12. `docs/old/`、`docs/temporary/`。現行契約の正本として扱わない
```

上位根拠と下位根拠が矛盾する場合はR3に昇格し、Decision Recordで採用する根拠、棄却する根拠、移行またはテスト更新の扱いを明示します。ADR、guides、references、tests、実装がContractと衝突する場合は、Contractを更新する明示的なDecision Recordがない限りContractを優先します。今回の成功条件が上位原則と衝突する場合もR3に昇格します。

### 3.2 契約変更の許可条件・禁止条件

契約変更を許可する条件です。

```text
- 変更理由がFix Planに明記されている
- 旧契約が誤りまたは廃止対象である根拠がある
- 変更後契約が明文化されている
- 既存テストまたは新規テストで検証できる
- 影響範囲が列挙されている
- Verification上でFailure / Cause / Change / Success / Verificationの対応を説明できる
```

契約変更を禁止する条件です。

```text
- 失敗回避のためだけにDOM期待値を弱める
- ARIAの意味を説明できないまま変える
- data属性やevent名を無根拠に変える
- Lit enhancement後だけ成立するUIにする
- snapshot更新だけで契約変更を済ませる
- storage keyやURL stateを無根拠に変える
- 既存テストの削除だけで契約変更を済ませる
- security / sanitization上の検証を弱める
```

## 4. UI / DOM / CSS / ARIA

```text
- 静的HTMLが単独で成立するか
- DOM階層が意図せず変わっていないか
- data属性を壊していないか
- ARIA属性を壊していないか
- role / label / focus orderを壊していないか
- CSS custom propertiesを壊していないか
- responsive / dark mode / forced-colors / reduced motionを確認したか
- paint contractを弱めていないか
```

判定です。

```text
- 契約変更の可能性がある場合はR2-full以上
- ARIA、focus order、アクセシビリティ上の意味を変更する場合はR3
- 期待値を弱めるだけのDOM / paint contract更新は禁止
```

## 5. Lit enhancement

```text
- Litが必須実行経路になっていないか
- property / attribute / eventの責務が混ざっていないか
- enhancement前後で意味が変わらないか
- 初期HTMLとenhancement後DOMの契約が対応しているか
- Web Component化が目的化していないか
```

```text
- Lit enhancementの責務境界に触れる場合はR3
- 既存のenhancement契約に合わせるだけならR2-fullでよい
- UI成立をLit実行後に移す変更は禁止
```

## 6. state / persistence

```text
- localStorage / sessionStorageのkeyを壊していないか
- URL stateを壊していないか
- scroll positionを壊していないか
- selected note / selected routeを壊していないか
- theme / reading preferenceを壊していないか
- cacheの形式や無効化条件を壊していないか
- index versionとの整合性があるか
```

```text
- 状態契約を変更する場合はContract Inventoryに追加
- storage keyやURL stateを無根拠に変える変更は禁止
```

## 7. build / typecheck / lint

```text
- エラーの発生箇所と実原因を分けたか
- 型を弱めていないか
- lint回避コメントを安易に追加していないか
- 生成物または設定差分が関係していないか
- localとCIで同じ前提か
```

```text
- package manager設定、lockfile、OS / shell差異に触れる場合はR2-full以上
- package manager policy自体を変更する場合はR3
- lintやtypecheckを通すためだけに型安全性を弱める変更は禁止
```

## 8. test / snapshot / visual

```text
- 修正前失敗条件に対応するテストを確認したか
- テスト期待値更新の根拠があるか
- snapshot差分の意味を説明できるか
- visual差分を範囲外扱いにする根拠があるか
- テスト削除後も同等以上の検証が残るか
```

```text
- snapshot更新の意味が曖昧な場合はR3
- テストを通すためだけの期待値更新は禁止
- flaky扱いによる無根拠なskipは禁止
```

## 9. generated files / lockfile / package manager

```text
- 生成元と生成物の関係が明確か
- 生成物だけを手修正していないか
- lockfile差分が意図したものか
- package manager設定を壊していないか
- install / build / CIで再現可能か
```

```text
- 既存の生成契約に従った再生成、または生成元変更に対応する生成物更新はR2-fullで扱ってよい
- 生成契約やpackage manager policyを変更する場合はR3
- lockfile差分が依存関係変更、package manager変更、install policy変更を伴う場合はR3
- 生成物だけを手修正する変更は禁止
- lockfile差分を説明できない場合は差し戻す
- 説明できないgenerated files差分は差し戻す
```

## 9.1 標準Verification Set

問題種別ごとに、次を標準検証候補として使います。すべてを機械的に実行する必要はありませんが、実行しない場合は理由をVerificationまたはFix Planへ記録します。

```text
build / typecheck:
- `pnpm typecheck`
- `pnpm build`
- production条件が関係する場合は `ROUAULT_BUILD_LABEL=<label> pnpm build:production`
- 関連scriptの単体実行
- CI差分が主題の場合はCI job名、Node / pnpm / OS / shell差分をEvidenceへ記録する

lint:
- `pnpm lint`
- 対象ファイルの型安全性確認

test:
- 失敗していたテスト
- 関連テストファイル
- `pnpm test:node`
- `pnpm test:ssr`
- `pnpm test:browser`
- `pnpm test:storybook:meta`
- R2以上で通常の回帰確認が必要な場合は `pnpm check`
- R4または統合確認が必要な場合は原則 `pnpm verify`。時間・環境制約で未実行の場合は未検証として扱い、完了条件に含めない

browser / visual / paint contract:
- 失敗していたbrowser test
- 対象routeの手動確認
- viewport / theme / reduced motion / forced-colorsの必要範囲
- timeout / flakyの場合はIntermittent Failure Evidence
- 必要に応じてtrace / screenshot / video確認

routing / search / index:
- 生成コマンド
- 対象fixture
- 生成物差分
- 関連テスト
- note link契約が関係する場合は `pnpm validate:note-links`
- search import境界が関係する場合は `pnpm assert-search-import-boundary`
- production import境界が関係する場合は `pnpm assert-production-import-boundary`
- link contractが関係する場合は `pnpm assert-link-contract-acceptance`

package manager / lockfile:
- package manager policy上corepack経由が必要な場合は、corepack経由の実行確認
- policy上の実行経路、Node、package manager、lockfile、install policyの整合確認
- lockfile差分確認
- package manager設定差分確認

security / sanitization:
- 入力境界の確認
- sanitization経路の確認
- regression testまたは安全側の手動確認

performance:
- 初期表示、hydration / enhancement開始、主要interactionの体感または計測
- bundle sizeまたはchunk sizeの差分
- 生成処理時間、検索index生成時間、画像・フォント読み込み影響
- layout shiftの有無
- performance問題では、測定条件、対象route、計測方法、許容条件をVerificationに記録
```

## 10. OS / shell / CI差分

```text
- OS固有のpath区切りを見落としていないか
- shell固有構文を前提にしていないか
- 環境変数の扱いがshell依存になっていないか
- localのみ、CIのみの失敗を区別したか
- CIログとlocalログの差分を原因候補に入れたか
```

```text
- OS / shell差異が原因または修正対象に含まれる場合はR2-full以上
- OS / shell方針そのものを変更する場合はR3
- Bash、POSIX、GNU coreutils前提を暗黙に持ち込まない
```

## 11. content / note data

```text
- ノート本文の読み込みが壊れていないか
- Markdown / HTML変換の契約が維持されているか
- frontmatterの扱いが壊れていないか
- frontmatter schema変更時の互換性があるか
- slug、tag、metadataの生成または解釈が壊れていないか
- 目次生成が壊れていないか
- 内部リンクが壊れていないか
- 既存ノートデータが読めるか
- Markdown拡張記法の扱いが変わっていないか
```

```text
- Markdown / HTML変換、unsafe HTML、外部リンクの安全性に関わる場合はR3
- 既存ノートデータを読めなくする変更は、明示的な仕様判断なしに行わない
- content / note dataの読み取り契約、frontmatter schema、slug生成、Markdown / HTML変換結果を変更する場合はContract Inventoryに追加する
```

## 12. routing / navigation

```text
- route生成が壊れていないか
- deep linkが壊れていないか
- 戻る / 進む操作が壊れていないか
- hash navigationが壊れていないか
- scroll restorationが壊れていないか
```

URL契約を変える場合はContract Inventoryを作成します。deep link、history、scroll restoration、selected routeの意味が変わる場合はR3に昇格します。

## 13. search / index

```text
- 検索インデックス生成が壊れていないか
- 日本語検索の正規化が壊れていないか
- generated indexと元データの対応が維持されているか
- 検索結果の並びやフィルタ条件が意図せず変わっていないか
- 古い生成済みindexとの関係を説明できるか
```

```text
- generated indexの形式を変える場合はR3
- 検索正規化、rank、filter、index schema、元データと生成物の対応を変更する場合はContract Inventoryに追加する
- 元データと生成物の対応を説明できない変更は禁止
```

## 14. performance

```text
- 初期表示が悪化していないか
- Lit enhancementのコストが過剰になっていないか
- layout shiftが増えていないか
- bundle sizeが意図せず増えていないか
- 画像・フォント読み込みが表示体験を壊していないか
- 検索index生成時間が悪化していないか
- 静的HTML生成時間が悪化していないか
- 対象routeのinteraction latencyが悪化していないか
```

performance問題では、次をVerification候補にします。すべてを常に実行する必要はありませんが、完了条件に関わる項目は未測定のまま完了扱いにしません。

```text
- 対象route:
- 測定環境:
- 測定方法:
- baseline:
- 修正後:
- 許容条件:
- bundle size / chunk size差分:
- generated files / index生成時間:
- 初期表示または主要interaction確認:
- layout shift確認:
- 実行ログまたはスクリーンショット位置:
```

## 15. security / sanitization

```text
- HTML injectionの危険が増えていないか
- unsafe HTMLの扱いが明確か
- 外部リンクの扱いが適切か
- ユーザー生成コンテンツ相当の入力を安全に扱っているか
- Markdown / HTML変換後の危険な属性やスクリプトを許していないか
```

```text
- security / sanitizationに関わる場合は原則R3
- 安全性を弱める変更は禁止
- 安全性影響が未評価のまま実装しない
```
