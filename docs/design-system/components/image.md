# Image

## 文書の位置付け

本書は、Rouault の **note 本文における図版の長期契約**を定義します。

現在の note 本文では、図版の正本は `ui-image` ではありません。正本は `figure[data-image]` を root とする静的 DOM です。拡大表示は `image-lightbox-enhancer` が補助的に付与する対話機能であり、図版の意味論そのものを所有してはなりません。

> 重要: `ui-image` は note 本文の最終 DOM 契約ではありません。`ui-image` を残す場合でも、Storybook、互換検証、non-note 面のためのコンポーネントとして整理します。note 本文の出力契約・CSS 契約・テスト契約は static-first 前提で固定します。

---

## 適用範囲

本書は次を対象とします。

- note 本文の静的図版 DOM 契約
- `zoomable=true/false` の意味
- `image-lightbox-enhancer` の ownership
- JS 無効時を含む読書面の成立条件
- アクセシビリティ契約
- テストで固定すべき観測面

本書は次を対象外とします。

- 画像編集 UI
- アップロード UI
- CDN / キャッシュ / 署名 URL の運用
- ギャラリー、カルーセル、スライドショー
- ピンチズームや自由倍率ズーム
- `ui-image` Web Component 自体の長期 API 保証

---

## 基本原則

### 原則 1: 図版本体は静的 DOM

note 本文の図版は、build-time に `figure[data-image] > picture > source* + img` へ正規化しなければなりません。

### 原則 2: caption は JS なしで読める

図版キャプションは `figcaption` として静的に存在しなければなりません。拡大 UI の有無で caption の意味論が変わってはなりません。

### 原則 3: enhancer は補助のみ

`image-lightbox-enhancer` は、拡大表示、focus return、scroll lock、dialog orchestration を担ってよいですが、画像本体や caption の可読性を JS に依存させてはなりません。

### 原則 4: `zoomable=false` は完全静的

`zoomable=false` の note 本文図版には hydration directive を付与してはなりません。

---

## note 本文の正本 DOM 契約

### 静的 root

note 本文の図版は、少なくとも次の構造を満たさなければなりません。

```html
<figure data-image="true" data-image-zoomable="true">
  <button
    type="button"
    data-image-zoom-trigger="true"
    aria-label="画像を拡大して表示: サンプル画像"
  >
    <span class="sr-only">画像を拡大して表示</span>
  </button>
  <picture>
    <source type="image/avif" srcset="/assets/sample.avif 1200w" />
    <img src="/assets/sample.webp" alt="サンプル画像" loading="lazy" />
  </picture>
  <figcaption>サンプル画像の説明</figcaption>
</figure>
```

`zoomable=true` の場合は、図版 root に次の directive を付与してよいものとします。

```html
<figure
  data-image="true"
  data-image-zoomable="true"
  data-hydration-key="image-lightbox-enhancer"
  data-hydration-capability="progressive"
  data-hydration-trigger="visible"
  data-image-lightbox-src="/..."
  data-image-lightbox-srcset="/..."
  data-image-lightbox-sizes="100vw"
  data-image-lightbox-sources="[...]"
></figure>
```

### `zoomable=false`

`zoomable=false` の場合、最終 DOM は静的図版のみで成立しなければなりません。

- `data-hydration-key`
- `data-hydration-capability`
- `data-hydration-trigger`
- `button[data-image-zoom-trigger]`

これらは存在してはなりません。

---

## 公開意味契約

### `src`

本文 inline 面で読む画像リソースです。note 本文では build-time に解決され、`img[src]` および必要な `<source>` 群へ反映されます。

### `alt`

画像内容の代替テキストです。意味のある画像では必須です。装飾画像のみ空文字を許可します。

### `caption`

補助説明です。空の場合は `figcaption` を描画しません。

### `zoomable`

図版に拡大補助 UI を付けるかどうかを表します。`zoomable=true` は **拡大 UI を持ち得る** ことを意味し、JS が常に利用可能であることを保証しません。

### `loading`

inline 面の `img[loading]` へ反映する読み込み優先度です。note 本文では `lazy` / `eager` を正規化して使います。

---

## enhancer の ownership

`image-lightbox-enhancer` が所有してよい責務は次に限ります。

- 拡大 trigger への click handler 付与
- dialog 生成
- expanded 用 `picture` / `img` の構築
- close button / backdrop click / native close への応答
- focus return
- scroll lock

逆に、次は所有してはなりません。

- 図版本体の意味論
- caption の正本管理
- note 本文での画像可読性
- `zoomable=false` 図版の表示成立

---

## アクセシビリティ契約

### 必須

- 図版 root は `figure[data-image]` であること
- 画像本体は `img` を含むこと
- caption がある場合は `figcaption` で表現すること
- 拡大 trigger はネイティブ `button` であること
- trigger のアクセシブルネームは拡大動作を説明すること

### JS 無効時

JS 無効時でも、画像本体と caption は読めなければなりません。

### dialog 有効時

dialog は補助 UI です。画像の正本は依然として本文中の `figure[data-image]` にあります。

---

## CSS 契約

note 本文の図版スタイルは、`ui-image` selector ではなく、少なくとも次の static selector を正本として記述します。

- `figure[data-image]`
- `figure[data-image] > picture`
- `figure[data-image] img`
- `figure[data-image] > figcaption`
- `figure[data-image] > [data-image-zoom-trigger]`
- `figure[data-image] dialog[data-image-lightbox-dialog]`

component 側 document style に依存して note 本文図版を成立させてはなりません。

---

## テストで固定すること

### build / projection

- note 最終 DOM に `ui-image` が出現しないこと
- `figure[data-image]` が出力されること
- `zoomable=true` のときだけ `data-hydration-key="image-lightbox-enhancer"` が付くこと
- `zoomable=false` では hydration directive が付かないこと
- caption がある場合に `figcaption` が出力されること

### browser / hydration

- trigger クリックで dialog が開くこと
- close button / backdrop / native close で閉じること
- close 後に trigger へ focus が戻ること
- open 中だけ scroll lock が有効であること
- JS 無効でも画像本体と caption が読めること

---

## 実装メモ

現行実装では `build/rehype/rouault-components.ts` が `img` / `figure(img + figcaption)` を `figure[data-image]` へ正規化し、`src/client/post-hydrate/image-lightbox-enhancer.ts` が dialog を付与します。この構成は本書の契約と整合します。

今後 `ui-image` を残す場合でも、その位置付けは note 本文の正本ではなく、互換・検証・non-note 用コンポーネントです。note 本文の契約は、本書の static-first モデルを正本とします。
