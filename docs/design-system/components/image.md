# Image

## 文書の位置付け

本書は、`ui-image` の公開契約、状態モデル、アクセシビリティ、視覚契約、および将来拡張時にも破綻しにくい責務境界を定義するものです。

`ui-image` は、記事中の画像・図版を、**平時は本文に静かに従属させ、必要時のみ拡大して精読可能にする**ための単一図版コンポーネントです。単に `<img>` を描画するのではなく、**空状態、読み込み、読み込み失敗、拡大モード、Lightbox の開閉、キャプションの意味付け、フォーカス復帰、スクロールロック**までを契約として扱います。

本書は、現行実装をそのまま説明することよりも、**長期的に設計がきれいで保守しやすい契約**を優先します。したがって、一部の節では、現行実装とは異なるものの、将来的に採るべき望ましい契約を先に定義します。現行実装との差分は末尾に明記します。

---

## 適用範囲

本書は、`ui-image` の次の事項を対象とします。

- 公開入力契約
- 公開状態契約
- 公開メソッド契約
- 状態モデル
- DOM / アクセシビリティ
- 視覚契約
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装との差分

一方で、本書は次の事項を扱いません。

- 画像ファイル生成そのもの
- CDN 配信、キャッシュ、署名 URL の管理
- 画像最適化パイプライン全体
- コンテンツ管理系の入力 UI
- 図版番号、参照番号、脚注との自動連携
- 画像著作権管理、クレジット管理、ライセンス管理
- ギャラリー、カルーセル、スライドショー
- アップロード、トリミング、画像編集 UI
- ページ全体のレイアウトシステム

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 役割と責務境界

`ui-image` は、**単一図版 primitive** です。役割は次の 3 点に限定します。

- 画像の提示
- 画像の意味付け
- 必要時の拡大読取

したがって、`ui-image` は **単一画像を、意味と最低限の対話を伴って表示する責務**を持ちますが、複数画像の遷移、画像群の管理、出典・番号の組み立て、編集責務は持ちません。

この責務境界により、`ui-image` は本文の中に静かに置ける最小単位として保たれます。

---

## 公開契約

### 設計原則

公開契約では、**モード**と**状態**を分離します。

- モードは「どの振る舞い系を採用するか」を表します
- 状態は「現時点で何が起きているか」を表します

この分離は重要です。たとえば、拡大モードであることと、今この瞬間に開けることは同じではありません。利用者は、**1 つの prop にモードと状態の両方の意味を読み込んではなりません**（MUST NOT）。

### 公開入力

`ui-image` は、`src`、`alt`、`caption`、`zoomable`、`width`、`height`、`loading` を公開入力として扱います。

ただし、長期的な契約上の意味は次のように解釈します。

- `src` は画像リソース参照です
- `alt` は画像内容の代替テキストです
- `caption` は補助説明です
- `zoomable` は**拡大モードを採るかどうか**です
- `width` / `height` は**表示寸法指定ではなく、intrinsic size hint と aspect-ratio の決定材料**です
- `loading` はサムネイル画像の読み込み優先度です

### 入力契約

| 名前         | 種別                   | 必須  | 内容              | 契約                                                  |
| ---------- | -------------------- | --- | --------------- | --------------------------------------------------- |
| `src`      | property / attribute | いいえ | 画像 URL          | 空文字または空白のみは未指定として扱います                               |
| `alt`      | property / attribute | いいえ | 代替テキスト          | 意味のある画像では必須です。装飾画像のみ空文字を許可します                       |
| `caption`  | property / attribute | いいえ | 補助説明            | 空文字または空白のみの場合は `figcaption` を描画しません                 |
| `zoomable` | property / attribute | いいえ | 拡大モード採用可否       | `true` は拡大モード、`false` は静的モードです。開閉可能性そのものは表しません      |
| `width`    | property / attribute | いいえ | intrinsic 幅ヒント  | `height` と組で有効な場合のみアスペクト比固定に使います。表示ピクセル寸法の強制ではありません |
| `height`   | property / attribute | いいえ | intrinsic 高さヒント | `width` と組で有効な場合のみアスペクト比固定に使います。表示ピクセル寸法の強制ではありません  |
| `loading`  | property / attribute | いいえ | サムネイル読み込み優先度    | `lazy` / `eager`。列挙外値は `lazy` にフォールバックします           |

### `zoomable` 契約

`zoomable` は、**この画像が拡大 UI 系を採用するかどうか**を表します。これは capability ではありますが、即時の availability を保証しません。

したがって、`zoomable=true` は次を意味します。

- サムネイル面を対話要素として扱います
- Lightbox 系 UI を持ち得ます
- 読み込み完了かつ非エラー時には拡大可能です

一方で、`zoomable=true` は次を意味しません。

- 常にクリック可能であること
- 常に即時 open できること
- `src` 未指定や error 中でも Lightbox を開けること

### `width` / `height` 契約

`width` と `height` は、長期的には **intrinsic dimension hint** として扱います。利用者は、これらを CSS の表示寸法指定と同一視してはなりません（MUST NOT）。

両方が有効な場合に限り、主として次の目的に使います。

- レイアウト安定化
- アスペクト比確定
- 読み込み前の面積予約

### 公開状態

長期的に安定した契約として、`ui-image` は次の状態概念を持つものとして扱います。

| 状態名        | 意味                            |
| ---------- | ----------------------------- |
| `empty`    | `src` が未指定であり、画像リソースを持たない状態   |
| `loading`  | `src` はあるが、まだ読み込み完了していない状態    |
| `loaded`   | 画像が利用可能で表示できる状態               |
| `error`    | `src` はあるが、読み込みまたはデコードに失敗した状態 |
| `expanded` | Lightbox が開いている状態             |
| `canOpen`  | 拡大モードであり、かつ現時点で open 可能な状態    |

ここで重要なのは、``** と **``** を分離すること**です。`src` 未指定は通信失敗やデコード失敗ではありません。長期的には、これらを同一の意味として扱いません。

### 公開メソッド

`ui-image` は、Lightbox の開閉を外部から制御するため、次の公開メソッドを持ちます。

| 名前                | 種別     | 契約                                                              |
| ----------------- | ------ | --------------------------------------------------------------- |
| `openLightbox()`  | method | `canOpen=true` の場合にのみ展開します。`canOpen=false` の場合は no-op とします      |
| `closeLightbox()` | method | 展開中の Lightbox を閉じます。復帰先が存在し、かつフォーカス可能な場合に限り trigger へフォーカスを戻します |

両メソッドは idempotent でなければなりません。すなわち、既に open / closed の状態で重ねて呼び出しても壊れてはなりません（MUST）。

### 属性反映契約

公開入力のうち、`src`、`alt`、`caption`、`zoomable`、`width`、`height`、`loading` は property と attribute の両面から操作できます。

| property   | attribute  | reflect | 備考                                     |
| ---------- | ---------- | ------- | -------------------------------------- |
| `src`      | `src`      | なし      | 文字列です                                  |
| `alt`      | `alt`      | なし      | 文字列です                                  |
| `caption`  | `caption`  | なし      | 文字列です                                  |
| `zoomable` | `zoomable` | あり      | 長期的には標準 boolean attribute に寄せるのが望ましいです |
| `width`    | `width`    | なし      | 数値として解釈します                             |
| `height`   | `height`   | なし      | 数値として解釈します                             |
| `loading`  | `loading`  | あり      | `lazy` / `eager` 以外は `lazy` に正規化します    |

### 入力正規化契約

`ui-image` は、外部入力をそのまま内部利用するのではなく、一定の正規化を行ったうえで状態判定に用います。

- `src` は前後空白を除去して解釈します
- `caption` は前後空白を除去して解釈します
- `width` / `height` は整数へ切り捨てて評価します
- `width` / `height` の 0 以下、非数、非有限値は無効値として破棄します
- `loading` の列挙外値は `lazy` に正規化します

列挙外値または無効値は、エラー通知ではなく、既定値または未指定相当へ正規化します。

### 責務範囲

責務範囲には、次を含みます。

- 画像サムネイルの描画
- 空状態、読み込み中、読み込み失敗の表示
- キャプションの意味付け
- 拡大モードの提供
- Lightbox の開閉
- 開閉時のスクロールロック
- フォーカス制御
- 必要なアクセシビリティ属性の付与

一方で、レスポンシブ画像配信、`srcset` / `sizes` 制御、ピンチズーム、ズーム倍率変更 UI、ギャラリー遷移、番号付け・出典・クレジット構築は責務に含めません。

---

## 状態モデル

### 状態分解

`ui-image` の状態は、次の 3 軸で読み分けます。

- リソース状態: `empty` / `loading` / `loaded` / `error`
- モード状態: `zoomable` / `static`
- 展開状態: `collapsed` / `expanded`

この分解により、たとえば `zoomable + loading + collapsed`、`static + loaded + collapsed` のように状態を明確に記述できます。

### 1. `empty` 状態

`src` が未指定、または空白のみである場合は `empty` です。`empty` は `error` と異なります。`empty` は「リソースが存在しない状態」であり、「取得に失敗した状態」ではありません。

長期的には、`empty` と `error` は表示面を共通化してもよいですが、意味論は分離しなければなりません（MUST）。

### 2. `loading` 状態

`src` があり、読み込み完了前で、かつ失敗していない場合は `loading` です。この状態ではプレースホルダーを表示し、`figure.root` に `aria-busy="true"` を付与します。

### 3. `loaded` 状態

画像の読み込み完了後は `loaded` です。この状態ではプレースホルダーを除去し、`aria-busy="false"` へ遷移します。

### 4. `error` 状態

`src` は存在するが、読み込みまたはデコードに失敗した場合は `error` です。`error` では、読み込み失敗を示すフォールバック面を表示し、拡大はできません。

`error` の文言は、画像内容の説明である `alt` と分離して扱うのが望ましいです。

### 5. `zoomable` モード

`zoomable=true` の場合、サムネイル面は対話要素として描画します。ただし、このことは open 可能性そのものを保証しません。`canOpen` は `loaded` と非 `error` を前提に判定されます。

### 6. `static` モード

`zoomable=false` の場合、サムネイル面は静的フレームとして描画します。Lightbox は存在しません。

### 7. `expanded` 状態

`expanded=true` の場合、Lightbox は表示中です。開いた直後は dialog へフォーカスを移し、文書全体へスクロールロックをかけます。

### 8. 再初期化

`src` が変化した場合、リソース状態は再初期化されます。展開中であれば Lightbox は閉じます。利用者は、`src` 差し替え後も前状態が維持されるものとして扱ってはなりません（MUST NOT）。

---

## DOM / アクセシビリティ

ルートは `figure.root` です。モードとリソース状態により、サムネイル面と Lightbox 面が分岐します。

```text
<ui-image>
  #shadow-root
    <figure class="root" aria-busy="...">
      [button.trigger]
        <div class="media-shell">
          [div.placeholder]
          [img.thumbnail-image] | [div.empty-or-error-fallback]
        </div>
      [div.static-frame]
        <div class="media-shell">
          [div.placeholder]
          [img.thumbnail-image] | [div.empty-or-error-fallback]
        </div>
      [figcaption.caption]
      [div.lightbox]
        <div class="lightbox-dialog" role="dialog" aria-modal="true">
          [button.close]
          <img class="lightbox-image">
        </div>
    </figure>
</ui-image>
```

上記は **長期的に望ましい DOM 契約**です。現行実装では close ボタンを持ちませんが、dialog として一般化するには close affordance を含む方が保守しやすいです。

### DOM 存在条件契約

- `zoomable=true` の場合、サムネイル面は `button.trigger` として描画します
- `zoomable=false` の場合、サムネイル面は静的フレームとして描画し、`button.trigger` は生成しません
- `zoomable=true` でも、`canOpen=false` の間は trigger は `disabled` でよいです
- `caption` が空でない場合にのみ `figcaption.caption` を描画します
- Lightbox DOM は、長期的には `zoomable=true` の場合に常に存在させ、開閉は `aria-hidden` と状態クラスで制御するのが望ましいです
- `aria-controls` を用いる場合、その参照先は実在しなければなりません（MUST）

### アクセシビリティ契約

- 画像全体は `figure` / `figcaption` の関係で意味づけます
- 読み込み中は `figure.root` の `aria-busy` で表現します
- `zoomable=true` の場合、サムネイル面はネイティブ `button` を用います
- trigger には `aria-haspopup="dialog"`、`aria-expanded`、`aria-controls` を付与します
- Lightbox dialog は `role="dialog"`、`aria-modal="true"` を持ちます
- close ボタンを持つ場合、その accessible name は「閉じる」等の明示名を持たなければなりません（MUST）
- `caption` は accessible description として扱います

### Accessible Name / Description 解決順序

`ui-image` では、画像の名称と説明を別契約として扱います。

| 要素           | accessible name  | accessible description |
| ------------ | ---------------- | ---------------------- |
| trigger      | `alt`。空なら「画像を拡大」 | `caption`              |
| static image | `alt`            | `caption`              |
| dialog       | `alt`。空なら「画像」    | `caption`              |
| close button | 固定ラベル            | なし                     |

`caption` は accessible name を構成しません。`caption` をもって `alt` の代替と見なしてはなりません（MUST NOT）。

### キーボード契約

Lightbox 展開中は、少なくとも次を満たします。

- `Escape` で close できること
- `Tab` / `Shift+Tab` によって dialog 内のフォーカスを循環できること
- 開いた直後の初期フォーカス先が明確であること
- close 後のフォーカス復帰先が明確であること

長期的には、dialog 内に close ボタンを含む一般的なフォーカストラップを前提とする方が望ましいです。現行の「dialog 自身のみが focusable」という暫定契約には依存しません。

### フォーカス復帰契約

Lightbox close 後は、**同一インスタンスの trigger が依然として存在し、かつフォーカス可能である場合に限り** trigger へ戻します。存在しない場合、disabled になった場合、またはコンポーネント自体が文書から外れた場合は no-op を許容します。

したがって、本コンポーネントのフォーカス復帰契約は、**常に戻すこと**ではなく、**戻せる場合に戻すこと**です。

---

## 視覚契約

`ui-image` の視覚契約は、本文に対して画像を**静かに置くこと**と、必要時に**精読モードへ遷移できること**にあります。

### 平時の表示面

サムネイル領域は `.media-shell` により構成します。境界線、角丸、背景面を持ちますが、平時は過度に主張しません。プレースホルダーは `loading` 時のみ表示し、画像は読み込み完了時に自然に出現します。

### アスペクト比契約

`width` と `height` の両方が有効な場合、`.media-shell` に `aspect-ratio` を与えます。これにより、画像読み込み前から面積を予約し、CLS を抑制します。

両寸法が有効でない場合でも、`loading` / `empty` / `error` では最小高さを確保し、面が潰れないようにします。

### キャプション契約

キャプションは画像本体より一段弱いトーンで表示します。本文補助であり、主本文の視線誘導を奪わないことを優先します。

### モード別の視覚契約

- `zoomable` モードでは、静かなボタンとして見せます
- `static` モードでは、単なる表示面として見せます
- `zoomable` であることは、派手な affordance ではなく、フォーカス、カーソル、開閉時の関係性で示します

### Lightbox の視覚契約

Lightbox は全画面固定配置で、暗い scrim と blur により背景から切り離します。拡大画像は viewport 内に収まるよう `object-fit: contain` で描画します。トランジションは、演出ではなく、読書状態から精読状態への移行を認知可能にするための最小限とします。

### `empty` / `error` フォールバック契約

空状態および読み込み失敗状態では、画像面を消さず、意味のあるフォールバック面を表示します。

ただし、長期的には ``** と **``** の意味を文言上でも分離する**のが望ましいです。

- `empty`: 画像未指定
- `error`: 画像を読み込めませんでした

エラー文言は `alt` の再掲ではなく、失敗状態そのものを示す文言とします。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途           | トークン                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| 境界線幅         | `--border-width`                                                                          |
| 境界線色         | `--border-ghost`                                                                          |
| 背景面          | `--bg-fill-neutral`                                                                       |
| 角丸           | `--radius-md`                                                                             |
| 余白           | `--space-*`                                                                               |
| ミュート文字色      | `--fg-muted`                                                                              |
| 文字サイズ        | `--text-sm`                                                                               |
| 行間           | `--line-height-normal` / `--line-height-relaxed`                                          |
| フォーカスリング     | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| モーダル z-index | `--z-modal`                                                                               |
| スクラム透過率      | `--opacity-scrim`                                                                         |
| ブラー量         | `--blur-md`                                                                               |
| 遷移時間         | `--duration-slower`                                                                       |
| イージング        | `--ease-in` / `--ease-out`                                                                |
| 入場スケール       | `--scale-enter`                                                                           |
| 明度補正         | `--brightness-dimmed`                                                                     |
| アイコンサイズ      | `--icon-xl`                                                                               |

---

## 環境別の振る舞い

### Dark Mode

ダークモードでは、平時の発光感を抑え、hover、focus、Lightbox では精読性を優先します。

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、サムネイル、Lightbox、dialog の transition を極小化します。動きによる意味付けには依存しません。

### Forced Colors

`forced-colors: active` 環境では、余計な背景や境界を外し、システム色へフォールバックします。

### Print

印刷時は Lightbox を描画しません。filter や transform も無効化し、平時の図版表示のみを対象とします。

### 本文文脈

`ui-image` の既定表示モードは **inline** です。すなわち、本文列内に自然に収まる表示を既定とします。

長期的には `breakout` / `full-bleed` のような派生モードを別契約として持ち得ますが、既定で本文幅を越えてはなりません（MUST NOT）。

---

## 関連契約

### キャプション関連付け契約

`caption` が空でない場合にのみ `figcaption.caption` を描画します。`caption` は単なる視覚補足ではなく、対話要素または画像本体の説明参照先としても機能します。

### Lightbox 開閉契約

長期的に望ましい close policy は次のとおりです。

- `closeLightbox()` の呼び出しで close します
- バックドロップクリックで close します
- close ボタンで close します
- `Escape` で close します
- `src` 変更で close します
- `zoomable=false` への変更で close します
- 展開中インスタンスの切断で close します

一方で、**dialog 内容面のクリックは close 契機に含めません**。これは、Lightbox 内に close ボタンや補助 UI を追加しても破綻しないためです。

### スクロールロック契約

Lightbox 展開中は、文書全体の `body` と `html` に対してスクロールロックをかけます。複数インスタンス時は参照カウントで管理します。

長期的には、overlay 系が増える場合、共通 overlay manager へ委譲できる構造が望ましいです。

### イベント契約

現時点では、`ui-image` は `open`、`close`、`load`、`error` のカスタムイベントを公開契約に含めません。外部からの制御は公開メソッドにより行います。

ただし、この非公開は恒久禁止ではなく、将来外部統合要件が明確になった場合に限り、別契約として追加できます。

### スタイル拡張契約

`ui-image` は `::part(...)` を公開しない前提を取れます。したがって、安定した拡張面は、ホスト要素、公開 prop / attr、公開 method、CSS Custom Properties に限ります。内部 class 名や Shadow DOM 構造には依存してはなりません（MUST NOT）。

### 内部生成 ID 契約

dialog ID や caption ID は内部生成です。これらの文字列値は mount ごとの安定を保証しません。外部コードや E2E テストは、内部生成 ID 文字列そのものに依存してはなりません（MUST NOT）。

---

## 境界条件

### `src` 未指定

`src` が空文字または空白のみの場合、長期契約上は `empty` として扱います。`error` とは区別します。

### `loading` 不正値

`loading="invalid"` のような列挙外値は `lazy` にフォールバックします。

### `alt=""`

`alt` が空文字でも描画は継続します。この場合、trigger の accessible name は「画像を拡大」、dialog の accessible name は「画像」にフォールバックします。

### `caption` 未指定

`caption` が空文字または空白のみの場合、`figcaption` は描画しません。`aria-describedby` も出力しません。

### `zoomable=false`

`zoomable=false` の場合、`button.trigger` は描画せず、静的フレームとして表示します。Lightbox も存在しません。

### `width` / `height` の一部または全部が無効

有効な `width` と `height` が揃わない場合、アスペクト比固定は行いません。ただし、`loading` / `empty` / `error` では最小高さを確保します。

### `src` の途中差し替え

`src` 差し替え時は状態を再初期化し、展開中であれば close します。

### 展開中の失敗

展開中にリソースが不正となった場合、Lightbox は close できます。ただし、長期的にはサムネイルと Lightbox のリソース戦略を分離できる設計が望ましいです。

### 複数インスタンスの同時利用

複数の `ui-image` が同一文書に存在しても、スクロールロックは参照カウントで管理し、最後の 1 件が close された時点で解除します。

---

## Storybook 契約

各 Story は見本ではなく、契約確認点として扱います。将来変更時には、少なくとも次を維持します。

| Story                            | 固定する契約                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `Default`                        | `loading` から `loaded` への遷移、`aria-busy`、zoomable trigger の対話属性、dialog の意味付け    |
| `VariantStateMatrix`             | `zoomable` / `static`、caption 有無、`empty` / `loading` / `loaded` / `error` の分岐 |
| `LoadingAndErrorStates`          | `loading` placeholder、`error` fallback、trigger の可用性分岐                         |
| `LightboxKeyboardAndFocusReturn` | open 時の初期フォーカス、Tab 循環、Escape close、close 後復帰                                  |
| `BackdropCloseAndScrollLock`     | open 中のスクロールロック、backdrop close、close 後復元                                      |
| `EnvironmentAndProseContracts`   | dark / reduced-motion / forced-colors / print / inline 文脈の視覚契約                |
| `BoundaryConditions`             | 列挙外値正規化、`alt=""`、`src` 未指定、寸法無効値の扱い                                           |

---

## 設計上の維持原則

`ui-image` の要点は、画像を単に表示することではありません。**通常時は本文に従属し、必要時のみ拡大して主役になれること**にあります。

したがって、今後の変更でも次の点は崩しません。

1. モードと状態を混同しません。
2. `empty` と `error` を同一視しません。
3. `alt` と `caption` を混同しません。
4. `width` / `height` を表示寸法指定と同一視しません。
5. close 後のフォーカス復帰とスクロールロック解除を崩しません。
6. 本文既定表示は `inline` とし、`breakout` は opt-in に限ります。

---

## 将来拡張の原則

本節は現行実装の説明ではなく、将来追加を検討する場合の設計指針です。追加機能は、画像コンポーネントを多機能化するためではなく、**読書の没入を壊さずに精読性、意味づけ、性能、対話一貫性を補強する場合に限って**採用します。

### 追加検討の優先順位

長期的な設計のきれいさと保守性を基準にした場合、追加検討の優先順位は次の順を基本とします。

1. `srcset` / `sizes` / `<picture>` 対応
2. 明示的な close affordance と一般化された dialog 契約
3. expanded 用高解像度ソース
4. `breakout` / `full-bleed` の opt-in layout mode
5. 公開状態の readonly 化
6. 必要性が確定した場合に限る公開イベント

この優先順位は、**見た目の派手さ**ではなく、**既存責務を汚さずに完成度を高められるか**を基準にしています。

### 最優先で検討する価値がある拡張

#### 1. `srcset` / `sizes` / `<picture>` 契約

現行公開面は単一 `src` ですが、画像密度や viewport に応じた最適配信は価値があります。これは装飾ではなく、**転送最適化と表示品質の両立**です。

本文中に多数の画像が置かれる構成では、単一 `src` のままだと、モバイルでは過大画像、デスクトップでは粗い画像のどちらかに寄りやすくなります。したがって、この拡張は単なる機能追加ではなく、**画像 primitive としての完成度を上げるための基礎機能**です。

採用する場合は、次を満たします。

- `src` 単独利用を引き続き正規入力として維持します
- `alt`、`caption`、`empty` / `error`、Lightbox 契約を崩しません
- thumbnail と expanded の読み込み戦略を分けて定義できます
- Storybook で画像選択条件とフォールバック順序を検証可能にします

#### 2. 明示的な close affordance

Lightbox に close ボタンを追加すること自体に価値がありますが、より本質的なのは、**Lightbox を一般的な dialog 契約として完成させること**です。

現行の背景クリックと `Escape` だけの close モデルは簡潔ですが、可発見性が弱く、dialog としての一般化にも限界があります。close affordance を採用する場合は、単なるボタン追加ではなく、次を同時に固定します。

- 一般化されたフォーカストラップ
- 初期フォーカス先の再定義
- close 後のフォーカス復帰規則
- backdrop click と dialog 内容 click の明確な分離

したがって、この拡張の目的は、**見た目の補強**ではなく、**対話契約の完成**です。

#### 3. expanded 用高解像度ソース

現行は thumbnail と Lightbox が同一 `src` を共有する前提ですが、長期的には、**通常時は軽く、精読時のみ高精細**という二層構成が価値を持ちます。

この拡張は、ギャラリー化ではなく、単一図版の読取品質を保つためのものです。特に図表やスクリーンショットのように、拡大時の判読性が重要なケースで有効です。

採用する場合は、次のいずれかの契約へ寄せます。

- `lightbox-src` のような expanded 専用入力を持ちます
- responsive source 契約の中で expanded 用ソースを選択できるようにします

単一図版 primitive としては、前者の方が責務境界を保ちやすいです。

### 条件付きで価値がある拡張

#### 4. `breakout` / `full-bleed` 表示モード

画像を本文幅より大きく見せる要求がある場合、明示的な layout mode 契約は価値があります。ただし、これは既定動作にしてはなりません。**既定は **`` とし、`breakout` や `full-bleed` は opt-in に限ります。

この拡張の価値は、画像を派手に見せることではなく、**本文グリッドとの関係を曖昧な実装依存にしないこと**にあります。

採用する場合は、次を満たします。

- 既定は本文列内表示のままとします
- `inline` / `breakout` / `full-bleed` のように mode を明示します
- キャプションと本文の接続関係を崩しません
- Storybook で `.prose` 文脈との差分を確認可能にします

#### 5. 公開状態の readonly 化

見た目の機能追加ではありませんが、長期的な保守性には価値があります。`busy`、`error`、`expanded`、`canOpen` などの状態を readonly property として公開すると、外部統合やテストが Shadow DOM 内部構造へ依存せずに済みます。

この拡張の価値は、**契約書で定義している状態概念と、実装の観測面を一致させること**です。

ただし、外部統合要件が弱い段階では必須ではありません。UI primitive としての純度を優先する場合は、後回しにできます。

#### 6. `load` / `error` / `open` / `close` の公開イベント

外部統合要件が明確になった場合のみ、カスタムイベントを別契約として追加できます。分析、同期、上位制御には有用ですが、安易に追加すると image が stateful controller 化しやすくなります。

採用する場合は、次を満たします。

- イベント名、発火契機、detail 形状を文書化します
- 冪等な open / close 契約と整合させます
- 上位レイヤが内部状態に過度に依存しない設計を維持します

必要性が明確になるまでは公開しません。

### 追加しない方がよい機能

次の方向は採りません。

- ギャラリー、カルーセル、スライドショー責務を内包すること
- ダウンロード、共有、コピーなどのアクション群を Lightbox へ常設すること
- ピンチズームや自由ズーム UI を内包すること
- キャプションへリッチテキスト編集責務を持ち込むこと
- アップロード、トリミング、編集 UI を内包すること
- 図版番号、出典、クレジット集約を image 単体へ持ち込むこと

これらは、単一図版 primitive としての責務境界を壊しやすく、Rouault の「没入して読む」設計にも反しやすいです。

---

## 現行実装との差分

本節は、現行の `image.ts` および `image.stories.ts` と、上記の長期契約との差分を整理するものです。

### 1. `empty` と `error` の未分離

現行実装では、`src` 未指定を `error` 相当として扱います。長期契約では、`src` 未指定は `empty` として分離するのが望ましいです。

### 2. `zoomable` の attribute 意味論

現行実装の `zoomable` は、未指定時も `true`、`false` / `0` / `off` / `no` のみ `false` とする独自変換です。長期契約では、標準 boolean attribute に寄せる方が望ましいです。

### 3. `aria-controls` と dialog 実在性

現行実装では、状態によって Lightbox DOM が存在しない場合があります。その一方で、trigger 側は `aria-controls` を維持します。長期契約では、参照先は常に実在させる方が望ましいです。

### 4. close policy

現行実装では、画像クリックも close に含まれます。長期契約では、dialog 内容面のクリックは close 契機から外し、backdrop / close button / Escape に限定する方が望ましいです。

### 5. close ボタン未実装

現行 Lightbox は明示的な close ボタンを持ちません。長期契約では、可発見性と一般化されたキーボード操作のため、close affordance を持つ方が望ましいです。

### 6. フォーカストラップの前提依存

現行実装の `Tab` / `Shift+Tab` 処理は、dialog 自身のみが focusable であることを前提にしています。長期契約では、一般化された dialog 内トラップへ移行するのが望ましいです。

### 7. error 文言と `alt` の混在

現行実装では、`alt` が空でない場合、エラーフォールバック文言として `alt` を再掲します。長期契約では、error 文言は `alt` と分離するのが望ましいです。

### 8. prose breakout の未整合

Storybook は breakout 的な文脈を示唆しますが、現行実装は基本的に inline 幅に留まります。長期契約では、既定を `inline` とし、`breakout` は opt-in の別モードとして定義する方が望ましいです。

### 9. 公開状態の不足

現行実装は `busy`、`error`、`expanded`、`canOpen` を公開状態として持ちません。長期契約では、少なくとも概念としては分離済みであり、将来的に readonly property 等として公開可能です。

### 10. trigger の accessible name 生成規則

長期契約では、trigger の accessible name は `alt` を基礎に扱う前提で整理していますが、現行実装では `alt` が空でない場合に `${alt}を拡大` という接尾辞付きラベルを生成します。たとえば `alt="サンプル画像"` の場合、trigger の `aria-label` は `サンプル画像を拡大` になります。

これは実装としては妥当ですが、**「画像そのものの名称」と「操作要素としての名称」をどう分けるか**が契約としてまだ固定し切れていません。長期契約では、trigger の名称規則を次のいずれかへ明示的に寄せる必要があります。

- 画像名をそのまま用い、操作性は `aria-haspopup` 等で表します
- `〜を拡大` のように操作目的まで含めたラベルを正式契約とします

現行実装は後者ですが、その方針が本文の契約として明示されていませんでした。

### 11. フォーカス復帰条件の未厳密化

長期契約では、close 後は「同一インスタンスの trigger が依然として存在し、かつフォーカス可能な場合に限り」復帰すると定義しています。一方、現行実装は `requestAnimationFrame` 内で `trigger.focus()` を無条件に試行しており、disabled 化や再描画に伴う非フォーカス可能状態を事前判定していません。

結果として、現行実装では **契約上の条件分岐を明示的に実装しているのではなく、ブラウザの no-op に一部依存している** 状態です。長期的には、復帰先の存在と可用性を明示判定したうえで focus を試行する方が望ましいです。

### 12. `empty` 状態のライブリージョン未分離

現行実装では、`src` 未指定時も `.error-fallback` を描画し、`role="status"` と `aria-live="polite"` を付与します。これは読み込み失敗時の通知契約と同じ扱いです。

長期契約では `empty` と `error` を意味論として分離していますが、現行実装では **表示面だけでなく、音声通知面でも未分離** です。今後 `empty` を正式状態として採用する場合は、少なくとも次のどちらかを固定する必要があります。

- `empty` ではライブリージョンを用いず、静的な空状態として扱います
- `empty` 専用文言と通知方針を定義し、`error` とは別契約にします

### 13. 本節の扱い

本節に記載した差分は、直ちにすべて実装しなければならないという意味ではありません。ただし、将来修正する場合は、**実装、Storybook、契約書の 3 点を同時に更新し、半端な中間状態を公開契約にしません**。

