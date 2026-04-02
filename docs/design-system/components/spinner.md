# Spinner

## 文書の目的

本書は、`ui-spinner` の公開契約を定義するコンポーネント契約書です。

`ui-spinner` は、**完了率や残り時間を持たない不定進捗（indeterminate progress）** を示すための部品です。Rouault においては、装飾的なアニメーションではなく、**処理中であることを静かに示す状態表示** として扱います。

本書では、公開入力、アクセシビリティ、視覚不変条件、環境適応、境界条件、および Storybook による契約確認点を定義します。

---

## 適用範囲

本書は、`ui-spinner` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約

一方で、本書は次の事項を扱いません。

- 完了率や残り時間の提示
- 通信状態や非同期処理の起点制御
- overlay、button、dialog など上位コンポーネントのレイアウト責務
- 読み込み完了後の通知設計
- retry、cancel、timeout、error などの上位状態設計
- determinate progress bar の代替
- loading region / busy state のような上位待機コンポーネントの責務

これらは、上位レイヤまたは別コンポーネントの責務です。とくに、説明文、live region 制御、複数待機状態の統合、長時間待機時の状態昇格は、必要に応じて loading region / busy state のような上位コンポーネントで扱います。

---

## 公開契約

`ui-spinner` は、`size` を property / attribute の両面で、`label` を JavaScript property として、`aria-label` を HTML attribute として公開入力に持ちます。`label` と `aria-label` は、同一のアクセシブル名入力を別経路から与えるための公開面です。内部実装は単一の SVG ですが、利用者は `ui-spinner` を契約単位として扱います。

本書における `ui-spinner` は、純粋な装飾 primitive ではなく、**ホスト要素が状態通知主体となる semantic component** として扱います。したがって、意味は内部 SVG ではなくホスト要素に集約し、ホストは常に状態通知用のアクセシビリティ契約を維持します。

`size` の既定値は `default` です。`aria-label` の既定値は `"読み込み中"` です。アクセシビリティ上のホスト属性として、`role="status"` と `aria-label` を常にホスト要素に維持します。利用者が `role` を別値へ変更しようとしても、公開契約上は `status` に正規化されます。

`ui-spinner` は **不定進捗専用** です。完了率、現在値、最小値、最大値を表す API は公開しません。したがって、百分率や段階進行を伝える用途に使用してはなりません（MUST NOT）。その場合は progress 系コンポーネントを用います。

可視文言や外側コンテナが別途 loading message を持つ場合でも、spinner 契約はホストの `role="status"` と `aria-label` を維持します。ただし、読み込み対象の説明責務や live region の詳細設計は上位レイヤが負います。

本書における `ui-spinner` は、Rouault 専用の内部 UI 部品として扱います。したがって、既定ラベル `"読み込み中"` は日本語固定の公開契約とし、locale 切替や i18n provider 経由の既定ラベル解決は本書の適用範囲に含めません。

他言語対応や文脈依存のラベル最適化が必要な場合は、利用側が `label` または `aria-label` を明示指定します。

### 入力契約

| 名前         | 種別                 | 必須   | 内容                                | 契約                                                                               |
| ------------ | -------------------- | ------ | ----------------------------------- | ---------------------------------------------------------------------------------- |
| `size`       | property / attribute | いいえ | スピナーサイズ                      | `default` / `lg`。既定値は `default` です                                          |
| `label`      | property             | いいえ | JavaScript から与えるアクセシブル名 | `trim()` 後に空なら `"読み込み中"` へ正規化されます                                |
| `aria-label` | attribute            | いいえ | HTML から与えるアクセシブル名       | 内部では `label` と同義に扱い、`trim()` 後に空なら `"読み込み中"` へ正規化されます |

`ui-spinner` は `label` 以外の別名 property を公開しません。JavaScript からは `label`、HTML からは `aria-label` を用います。

### 属性反映契約

公開入力のうち、`size` は property / attribute の両面から操作できます。アクセシブル名に関しては、**JavaScript からの正規 API は `label`** とし、`aria-label` は HTML 利用時の入力経路および解決済みアクセシブル名のホスト反映先として扱います。

したがって、`label` と `aria-label` は意味上は同一入力ですが、契約上の主 API としては `label` を優先します。実行時に観測される最終値は、常にホストの `aria-label` に反映されます。

| property | attribute    | reflect | 備考                                                                   |
| -------- | ------------ | ------- | ---------------------------------------------------------------------- |
| `size`   | `size`       | あり    | 列挙値以外は `default` に正規化されます                                |
| `label`  | `aria-label` | なし    | `label` が正規 API です。`trim()` 後に空なら既定ラベルへ正規化されます |

たとえば `label = " 保存中 "` または `aria-label=" 保存中 "` は、最終的に `aria-label="保存中"` としてホストへ反映されます。

### 固定アクセシビリティ契約

`ui-spinner` はホスト要素に対して、次を常に維持します。

| 名前         | 値             | 契約                                                           |
| ------------ | -------------- | -------------------------------------------------------------- |
| `role`       | `status`       | 利用者が別値を与えても `status` に正規化します                 |
| `aria-label` | 解決済みラベル | 未指定または `trim()` 後に空の場合は `"読み込み中"` を用います |

このため、`ui-spinner` を `progressbar`、`img`、`presentation` など別の意味役割で運用してはなりません（MUST NOT）。

### 自己修復契約

`ui-spinner` は、接続時、属性変更時、および更新時にアクセシビリティ契約を再同期します。自己修復対象は、**`role` と解決済みアクセシブル名** に限定します。

契約保証時点は、接続・入力変更・更新に伴う **update サイクル完了時** とします。したがって、利用者は一時的な中間不整合状態に依存してはなりません（MUST NOT）。

- `role` を `progressbar` などへ変更しても、update サイクル完了時には `status` へ戻ります。
- `aria-label` を空文字や空白のみへ変更しても、update サイクル完了時には `"読み込み中"` へ戻ります。
- `role` と未正規化の `aria-label` は、外部可変設定点として扱ってはなりません（MUST NOT）。

### 列挙外値・無効値の扱い

`size` は公開上 `default` と `lg` のみを契約とします。列挙外文字列が与えられた場合、`default` にフォールバックし、属性値も `default` に正規化します。

`label` / `aria-label` は文字列として受理しますが、`trim()` 後に空となる文字列は有効入力として扱いません。解決済みラベルは常に非空文字列です。

### 非公開面契約

`ui-spinner` は次を公開しません。

- custom event
- 公開 method
- slot
- `::part(...)`
- determinate progress 用の値 API

したがって、利用者は spinner 自身から状態変化通知を受けることや、公開メソッドを通じて動作制御することを期待してはなりません（MUST NOT）。

### 責務範囲

責務範囲には、SVG による不定進捗表示、ホストへのアクセシビリティ属性同期、サイズごとの寸法制御、reduced motion・forced colors・print への適応を含みます。

一方で、次の事項は責務に含めません。

- 読み込み対象の説明文表示
- overlay や region の遮蔽制御
- 周辺 UI の disabled 制御
- `aria-live`、`aria-atomic`、`aria-describedby` など live region の詳細制御
- 複数 spinner 併存時の通知統合
- 長時間待機時の retry / timeout / error / progress への昇格判断

これらは、button、dialog、overlay、page shell、data fetching 層など上位レイヤの責務です。

---

## 状態モデル

`ui-spinner` の公開状態は、**サイズ**、**アクセシブル名**、**モーション許容有無** の 3 軸で定義します。利用文脈は公開状態ではなく、関連契約で扱います。`ui-spinner` は視覚バリアントや完了率状態を持ちません。

### 1. 基本状態

最小状態は、`size="default"` かつ `aria-label="読み込み中"` の状態です。この状態では、ホスト寸法は `1em` に追従し、本文・ボタン内・インライン要素内で周囲の文字サイズに追従して表示されます。

### 2. サイズ状態

`size` は `default` と `lg` を受理します。`size` は単なる見た目差分ではなく、**利用密度と文脈の違いを表す意味階層** として扱います。

| `size` 値 | 意味                     | 想定用途                            |
| --------- | ------------------------ | ----------------------------------- |
| `default` | 行内・制御内の標準寸法   | ボタン内、文中、行内補助表示        |
| `lg`      | 領域待機向けの強めの寸法 | overlay、ページ読み込み、空状態中央 |

`default` は `1em` を基準とするため、親要素の `font-size` に追従します。`lg` は `--icon-xl` を参照し、未定義時は `32px` を用います。

### 3. アクセシブル名状態

`aria-label` が未指定、空文字列、または空白のみである場合、アクセシブル名は `"読み込み中"` に正規化されます。明示指定したラベルが存在する場合、その値をホストに維持します。

### 4. 役割固定状態

`ui-spinner` は常に `role="status"` を維持します。利用者が `progressbar` など別の role を指定しても、それを公開契約として認めません。これは、本コンポーネントが値付き進捗ではなく、状態通知用の不定進捗表示であるためです。

### 5. モーション状態

通常環境では、SVG 全体の回転アニメーションと円弧の dash アニメーションを併用します。

`prefers-reduced-motion: reduce` 環境では、連続アニメーションを停止します。この場合でも spinner 自体は不可視にせず、静的な円弧として表示を維持します。したがって、モーション停止は表示停止を意味しません。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部には、視覚表示のための SVG を持ちます。

```text
<ui-spinner role="status" aria-label="読み込み中">
  #shadow-root
    <svg aria-hidden="true" focusable="false">...</svg>
</ui-spinner>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 意味主体は常にホスト要素です。
- ホストは常に `role="status"` を持ちます。
- ホストは常に非空の `aria-label` を持ちます。
- 解決済みアクセシブル名は `trim()` 済みの文字列です。
- 内部 SVG は `aria-hidden="true"` かつ `focusable="false"` です。
- 内部 SVG に対話上の意味 role を付与しません。
- spinner 自体はフォーカス対象ではありません。
- spinner は操作主体ではなく、対話 role や押下状態を持ちません。

本コンポーネントでは、図形としての spinner と状態通知主体を分離しません。**状態通知主体は常にホスト要素** であり、内部 SVG は純粋に視覚表示のみを担います。

可視文言を併記する場合でも、spinner 自体のアクセシブル名契約は維持します。ただし、説明文・見出し・領域名など、読み込み対象をより具体的に示す責務は上位レイヤが負います。

### live region の位置付け

`role="status"` により、`ui-spinner` は状態通知の意味を持ちます。ただし、通知頻度、周囲テキストとの組み合わせ、通知単位の統合、詳細な live region 制御は上位レイヤの設計責務です。

本コンポーネントは、`aria-live`、`aria-atomic`、`aria-describedby` を公開入力としては扱いません。これらの制御は `ui-spinner` に pass-through せず、loading region や busy state を表す上位要素側で管理します。

---

## Visual Contract

`ui-spinner` の視覚契約は、**主張しすぎない連続運動** と、**文字色・文脈色に追従する静かな可視性** にあります。

### 情報順位

spinner は、本文、見出し、主要 CTA より強く主張してはなりません。状態表示として必要十分な視認性は確保しつつ、視線を奪い続ける強い装飾には依存しません。

### レイアウト

ホストは `inline-flex` です。`inline-size` と `block-size` は同一で、正方形を維持します。`vertical-align: middle` により、インライン文脈で周辺テキストと自然に揃えます。

とくに `size="default"` は、本文行内・注釈内・ボタン内で **行送りを不必要に押し広げてはなりません**。また、ベースライン近傍で視覚的に浮き過ぎたり沈み過ぎたりせず、周辺テキストの読書リズムを崩してはなりません。

### 視覚仕様

- 色は `currentColor` に追従します。
- 円は塗りなし (`fill: none`) です。
- 線端は `round` です。
- 円弧は dash アニメーションで可変長となります。
- SVG 全体は回転します。
- `default` は `1em` です。
- `lg` は `--icon-xl` を参照し、未定義時は `32px` です。

### 形状不変条件

次の事項は、視覚回帰の許容範囲を規定する不変条件です。

- 単色の円弧によって不定進捗を表現すること
- 円弧が回転またはそれに準ずる連続運動として知覚されること
- 線端は `round` を維持すること
- `default` は `1em`、`lg` は `--icon-xl` または `32px` を基準とすること
- 本文や周辺 UI より過度に主張しないこと

一方で、`viewBox` の exact 値、半径、座標、dash 値、内部要素数などは、上記不変条件を満たす限り内部実装詳細として扱います。

### 参照トークン

本コンポーネントは、主として次のトークンまたは CSS Custom Properties に依存します。

| 用途                    | トークン / 変数               |
| ----------------------- | ----------------------------- |
| 既定寸法                | `--spinner-size`              |
| 大サイズ                | `--icon-xl`                   |
| 回転時間                | `--spinner-rotation-duration` |
| dash アニメーション時間 | `--spinner-dash-duration`     |
| 線幅                    | `--spinner-stroke-width`      |
| イージング              | `--ease-in-out`               |
| 描画色                  | `currentColor`                |

### 読書文脈での扱い

本文近傍では `default` を優先し、文字サイズとの調和を崩さないことを重視します。ページ全体の待機や overlay 中央表示のように、状態の認知を少し強める必要がある場合に限って `lg` を用います。

### 採らない表現

次の表現には依存しません。

- 常時点滅
- 複数色を用いた強い注意喚起
- 影や発光による装飾的強調
- 完了率があるかのような誤認を招く表示

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、SVG の回転アニメーションと円弧の dash アニメーションを停止します。このとき、円弧の形状は静的な表示に切り替え、処理中状態は維持します。

### Forced Colors

`forced-colors: active` 環境では、ホスト色を `CanvasText` に合わせます。`forced-color-adjust: auto` を維持し、システム色との整合を優先します。

### Print

`@media print` では `:host` 自体を非表示にします。`ui-spinner` は印刷物上で意味を持ちにくい一時的状態表示であるため、印刷対象に含めません。

---

## 関連契約

### 使用文脈契約

`ui-spinner` は、次の利用プロファイルを**正式なサポート対象**とします。

| プロファイル | 位置付け                 | 推奨サイズ            | 補足                                                |
| ------------ | ------------------------ | --------------------- | --------------------------------------------------- |
| `inline`     | 文中・軽量な補助表示     | `default`             | 必要に応じて短い補助文言を併記します                |
| `control`    | button / control 内      | `default`             | 操作主体・状態遷移・説明責務は control 側が負います |
| `region`     | パネル・空状態・カード内 | `default` または `lg` | 読み込み対象が重要な場合は説明文を併記します        |
| `overlay`    | 領域全体待機             | `lg`                  | 読み込み対象を示す文言を併記します                  |

上表は代表例ではなく、互換性判断の基準となる正式サポート範囲です。

spinner 単体だけでは、何を読み込んでいるかが十分に伝わらない場合があります。その場合の説明責務は上位レイヤが負います。とくに `control` 文脈では、button 自体が loading 状態の主語であり、spinner はその内部で不定進捗表示のみを担います。

### スタイル拡張契約

`ui-spinner` は CSS Custom Properties と `color` 継承による拡張を想定します。`::part(...)`、slot、公開 method は持ちません。

本書で**安定公開面**として扱うスタイリング API は次です。

- `color`
- `font-size`
- `--spinner-size`
- `--icon-xl`
- `--spinner-rotation-duration`
- `--spinner-dash-duration`
- `--spinner-stroke-width`
- `--ease-in-out`

各値は次の制約を満たす必要があります。

- size 系変数は正の長さであること
- duration 系変数は 0 より大きい時間であること
- stroke width は 0 より大きい長さであること

`size="default"` では `--spinner-size`、`size="lg"` では `--icon-xl` を用います。`lg` では `--spinner-size` より `--icon-xl` を優先します。

列挙値である `size` の正規化はコンポーネントが担います。一方で、CSS Custom Properties の妥当性保証はトークンまたはテーマ層の責務とし、本コンポーネントは不正値の補正を公開契約としては持ちません。

利用者は、上記公開 API を通じて見た目を調整できます。ただし、内部 SVG 構造、Shadow DOM 内部 class 名、座標値、半径、dash pattern などの内部実装詳細には依存してはなりません（MUST NOT）。

### 非対話契約

`ui-spinner` は非対話コンポーネントです。したがって、次の性質を公開契約として固定します。

- フォーカス移動の対象ではありません。
- 押下、選択、切替の状態を持ちません。
- `tabindex`、`aria-pressed`、`disabled`、click 起点の意味付けを前提にしません。
- 操作主体の責務は button や上位コンポーネントが負います。

### 役割分担契約

`ui-spinner` は処理中状態を示しますが、次の責務は持ちません。

- 周辺 UI の操作不能化
- 読み込み完了後の通知
- 非同期処理キャンセル
- timeout 表示
- error 状態への遷移
- 複数 spinner 併存時の通知主体の統合
- 長時間待機時に richer state へ昇格させる判断

これらは、button、dialog、overlay、page shell、data fetching 層などの責務です。

---

## 境界条件

### 1. 既定状態

`<ui-spinner></ui-spinner>` は `size="default"`、`role="status"`、`aria-label="読み込み中"` として成立しなければなりません（MUST）。

### 2. `size="default"`

`default` は `1em` を基準とし、親要素の文字サイズに追従します。したがって、button 内や本文内で自然にスケールします。公開契約として、`size="default"` の実効幅および実効高は、ホストの実効 `font-size` と一致しなければなりません。

### 3. `size="lg"`

`lg` は `--icon-xl` を優先して参照します。`--icon-xl` が未定義の場合は `32px` を用います。

### 4. 無効な `size`

列挙外値は `default` に正規化されます。property 値だけでなく、反映された属性値も `default` であることを契約とします。

### 5. 空の `aria-label`

`aria-label=""`、空白のみの入力、または前後に余分な空白を含む入力は `trim()` 後の値で扱います。`trim()` 後に空となる場合は `"読み込み中"` に正規化されます。空のアクセシブル名を残してはなりません（MUST NOT）。

### 6. `role` 上書き試行

`role="progressbar"` などの上書き試行があっても、最終的なホスト role は `status` を維持します。利用者は role 上書きに依存してはなりません（MUST NOT）。

### 7. 外側コンテナとの role 重複

spinner を配置する外側コンテナが別途 `role="status"` を持つ設計は、重複通知や意味の衝突を招きやすいため推奨しません。少なくとも Storybook 上では、外側コンテナに同じ role を重複付与しないことを確認対象とします。

### 8. 印刷時

どのサイズ、どのラベルであっても、印刷時は非表示です。

### 9. 可視文言併記時

spinner の隣に可視文言を置くことはできます。この場合でも、spinner 自体の `role="status"` と `aria-label` 契約は維持されます。ただし、読み込み対象の具体的説明や周辺文言との関係整理は上位レイヤの責務です。

### 10. 複数 spinner 併存時

複数の `ui-spinner` が同時に存在しても、各 spinner は単体契約のみを保証します。通知統合、優先順位付け、冗長通知の回避は本コンポーネントの責務ではありません。

---

## Storybook 契約

各 Story は見本ではなく、契約確認点として扱います。将来変更時には、次の契約を維持します。

| Story                | 固定する契約                                                                      |
| -------------------- | --------------------------------------------------------------------------------- |
| `Default`            | 既定 role が `status`、既定ラベルが `"読み込み中"`、既定サイズが `1em` であること |
| `VariantStateMatrix` | `default` が行内・制御内の利用に、`lg` が領域待機に使えること                     |
| `BoundaryConditions` | 無効 `size` が `default` に正規化され、空ラベルが既定値へ戻ること                 |
| `RuntimeA11yGuard`   | 実行時の `role` / `aria-label` 改変試行に対してホストの a11y 契約を再同期すること |
| `DarkMode`           | ダーク背景上でも `currentColor` ベースで可視性を維持すること                      |

加えて、各 Story で次の詳細契約を確認します。

- 内部 SVG は `aria-hidden="true"` かつ `focusable="false"` であること
- `label` が正規 API として扱われ、`label` と `aria-label` が同一の解決済みラベルへ収束すること
- `role` / `aria-label` の自己修復対象がホストのアクセシビリティ契約に限定されること
- `default` サイズは実効 `font-size` と幅・高さが一致すること
- `lg` は `--icon-xl` に追従すること
- reduced motion では表示を消さず、動きのみを止めること
- print では非表示であること
- 外側コンテナに `role="status"` を重複付与しない構成を確認対象とすること

---

## 不変条件

`ui-spinner` は、値を持たない進行中状態を、アクセシブルに、静かに、文脈サイズへ追従させて示すための semantic component です。今後の変更でも、次の 6 点は維持します。

1. 意味主体は常にホスト要素であること。
2. `role="status"` と非空の `aria-label` を維持すること。
3. `label` を正規 API、`aria-label` をホスト反映先として扱うこと。
4. `default` が `1em` に追従すること。
5. `default` が本文行内の読書リズムを不必要に崩さないこと。
6. reduced motion で表示を消さず、動きだけを止めること。

---

## 現行実装で未対応の事項

本節は、現行の `spinner.ts` および `spinner.stories.ts` を基準として、**契約書内で将来拡張または厳密化対象として触れているが、現時点では未実装、未公開、または未強制である事項** を整理するものです。

### 1. 補助説明との関連付け

現行実装が直接扱うアクセシビリティ属性は `role` と `aria-label` に限られます。`aria-describedby`、`aria-live`、`aria-atomic` などの制御は未公開です。

### 2. サイズ段階の追加

現行実装が受理するサイズは `default` と `lg` のみです。`sm`、`xl` などの段階化は未対応です。

### 3. スタイル拡張面の公開

現行実装は `::part(...)` を公開していません。外部からの拡張は `color` 継承と CSS Custom Properties に実質的に限定されます。

### 4. determinate progress への拡張

現行実装は値付き進捗を扱いません。`value`、`min`、`max`、`aria-valuenow` など progressbar 的 API は未対応です。これは未実装であるだけでなく、現行方針としても責務外です。

### 5. 外側コンテナとの通知統合

spinner を含む button、overlay、page shell 側で、どのように loading message をまとめて通知するかは未整備です。現行 Storybook は spinner 単体契約を確認しますが、複合コンポーネントとの通知統合までは扱っていません。

### 6. アクセシブル名所有者の分離

現行実装では spinner 自体が `role="status"` と `aria-label` を保持します。可視文言や loading region 側へ意味主体を分離する設計は未対応です。

### 7. 既定ラベルの国際化

既定ラベルは日本語文字列として内部定数化されており、locale に応じた差し替えや利用側必須化は未対応です。

### 8. loading unit の導入

複数 spinner 併存時に通知主体を一元化する loading unit の概念は、現行実装および Storybook には導入されていません。

### 9. 長時間待機からの状態昇格

spinner のみで待機を表す期間の上限や、timeout / retry / error への昇格規則は未整備です。

### 10. 利用文脈プロファイルの固定

現行契約書は inline、control、region、overlay のような利用文脈プロファイルを長期固定方針として提案していますが、現行実装および Storybook はそれを正式なサポート境界としては未固定です。したがって、どの文脈が正式対象で、どの文脈が参考例に留まるかは未強制です。

### 11. `label` を正規 API、`aria-label` を投影先とする整理

現行実装は `label` property と `aria-label` attribute を相互に収束させますが、契約上はなお、どちらを主たる読み書き API とみなすかが未固定です。`label` を source of truth とし、`aria-label` を HTML 初期入力および投影先とする整理は未明文化です。

### 12. 自己修復の保証モデル

現行実装には `role` と `aria-label` の自己修復がありますが、**いつまでに** 修復されるか、**どの属性まで** を自己修復対象とするか、**中間不整合状態へ依存してよいか** までは未明文化です。これは実装には存在するが、契約としては未固定の領域です。

### 13. 公開スタイリング API の安定度格付け

現行契約書は CSS Custom Properties を公開スタイリング API として列挙していますが、Stable / Experimental / Internal のような安定度格付けは未導入です。したがって、どの変数に将来まで依存してよいかは未固定です。

### 14. CSS Custom Properties の不正値責務

`size` 列挙値はコンポーネント側で正規化されますが、`--spinner-size`、duration 系、stroke width 系などの不正値について、component 側で救済するのか、token 層で妥当性保証を持つのかは未固定です。

### 15. 形状不変条件の階層化

現行 Storybook は `viewBox="0 0 50 50"`、単一 circle、`round` linecap を確認しますが、それらのうち何が **意味不変** で、何が **内部実装詳細として可変** なのかは未整理です。視覚後退防止と内部改善余地の切り分けは未対応です。

### 16. prose 文脈における組版契約

`default` が `1em` に追従することは確認されていますが、本文行内で行送りをどの程度押し広げてよいか、ベースライン近傍でどの程度のズレを許容するかなど、読書文脈に特有の組版契約は未強制です。

### 17. 装飾モード / 通知モードの分離

新規機能候補として整理した decorative mode / announcing mode の分離は、現行実装には導入されていません。現在の `ui-spinner` は常に通知主体として振る舞い、純粋な装飾モードは未対応です。

### 18. `ui-spinner` の primitive 化

長期固定方針では `ui-spinner` を primitive 部品へ寄せることを推奨していますが、現行実装は `role="status"` と `aria-label` を自己修復するため、なお semantic component 的性質を持ちます。primitive と semantic の責務分離は未完了です。

### 19. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
