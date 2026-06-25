# Footer

## 概要

Rouaultのfooterは、本文終端にサイト名、著作権、任意のbuild label、補助ナビゲーションを静かに置くためのstatic shell UIです。旧`layout-footer` custom elementやLit runtimeではなく、`src/layouts/footer-html.ts`が静的HTMLを出力し、`src/assets/css/footer.css`が視覚契約を担います。

footerは情報の意味づけを所有しません。サイト名、著作権文言、build label、補助リンク、補助ナビゲーションのラベルは上位が供給します。

## 公開 API

```ts
export interface FooterLinkItem {
  readonly href: string;
  readonly label: string;
  readonly external?: boolean;
}

export interface FooterRenderOptions {
  readonly id?: string;
  readonly meta: {
    readonly eyebrow?: string;
    readonly siteName: string;
    readonly siteUrl?: string;
    readonly description?: string;
    readonly copyrightText: string;
    readonly buildLabel?: string;
  };
  readonly links?: readonly FooterLinkItem[];
  readonly a11y?: {
    readonly navLabel?: string;
  };
}
```

`renderFooterHtml()`の実行時防御は、`meta.siteName`、`meta.copyrightText`、optional text、`links`配列と各link要素を対象にします。`options` / `options.meta`自体の完全な`unknown`正規化はこのcontractの範囲外です。

## Text 正規化

- `meta.siteName`と`meta.copyrightText`は必須です。非文字列、未指定、trim後空文字は明示エラーです。
- `meta.eyebrow`、`meta.description`、`meta.buildLabel`、`a11y.navLabel`、`id`はtrim後空文字なら未指定として扱います。
- `a11y.navLabel`が未指定またはtrim後空文字の場合、`"補助ナビゲーション"`を使います。
- `links[].label`はtrim後空文字なら当該linkを描画しません。
- `links`自体や各要素に型境界外入力が混入しても、無効要素を除外し、有効なlinkだけを描画します。

## URL 許可規則

`links[].href`は次だけを許可します。

- `http://` / `https://`で始まり、`new URL()`でparse可能でhostを持つWeb URL
- `mailto:` / `tel:`で始まり、scheme後payloadが1文字以上あるaction URL
- `/`、`./`、`../`、`#`、`?`で始まる内部参照

次は無効値です。

- `javascript:`、`data:`、`vbscript:`
- `//example.com`のようなprotocol-relative URL
- `https:example.com`、`http:/example.com`のような曖昧なWeb URL
- `https://`、`https:///path`、`http://?q=1`のようにhostを持たないWeb URL
- trim後の値にASCII空白、ASCII制御文字、DEL / C1制御文字、backslashを含むURL
- schemeなし裸パス
- 許可していないscheme

`siteUrl`はsiteName link専用です。`http://` / `https://`と内部参照だけを許可し、`mailto:` / `tel:`は許可しません。

`mailto:` / `tel:`のrenderer側検証はscheme後payloadの存在確認に限定します。メールアドレス形式、電話番号形式、RFCレベルの完全な妥当性検証はfooter rendererの責務ではありません。

rendererはURLを自動percent-encodingしたり補正したりしません。空白やbackslashを含むURLは、呼び出し側が事前に正規化しない限り無効値として除外します。

## NormalizedFooterLink

renderer内部ではlinkを次の正規化済み型として扱います。

```ts
type FooterLinkKind = 'internal-document' | 'external-web' | 'external-action';

interface NormalizedFooterLink {
  readonly href: string;
  readonly label: string;
  readonly kind: FooterLinkKind;
  readonly external: boolean;
}
```

`NormalizedFooterLink`は`FooterLinkItem`をそのまま拡張しません。`renderFooterLink()`は正規化済み`kind` / `external`だけを参照し、`href`や未正規化の`FooterLinkItem.external`から外部表示条件を再解釈しません。

`external`はbooleanが明示された場合はその値を尊重し、未指定なら`kind === 'external-web'`のとき`true`になります。

## External 契約

siteName linkとnav linkのexternal契約は分離します。

- `siteUrl`がexternal-webの場合、siteName linkは`data-link-kind="external-web"`、`data-external="true"`、`rel="noreferrer"`を持ちます。
- siteName linkはexternal-webであってもnav link用の外部記号を表示しません。
- siteName linkはexternal-webであっても、原則として`aria-label="...（外部サイト）"`を持ちません。
- nav linkは`kind === 'external-web' && external === true`の場合に限り、`data-external="true"`、外部サイトaria-label、CSS外部記号を持ちます。
- `links[].external: false`が明示されたexternal-web nav linkは`rel="noreferrer"`を持ちますが、`data-external="true"`、外部サイトaria-label、外部記号を持ちません。
- `mailto:` / `tel:`は`external-action`です。`external: true`が明示されても外部サイト扱いせず、`data-external="true"`、外部サイトaria-label、外部記号、`rel="noreferrer"`を持ちません。
- `target="_blank"`は自動付与しません。

## DOM / Accessibility

現行DOMは次を正とします。

```html
<footer id="..." class="ui-footer" data-footer data-layout-footer>
  <div class="ui-footer__inner">
    <div class="ui-footer__meta">
      <div class="ui-footer__brand">
        <p class="ui-footer__eyebrow">...</p>
        <p class="ui-footer__site">Rouault</p>
        <p class="ui-footer__description">...</p>
      </div>
      <div class="ui-footer__subline">
        <div class="ui-footer__legal">
          <p class="ui-footer__copyright">...</p>
          <p class="ui-footer__build">...</p>
        </div>
        <nav class="ui-footer__nav" aria-label="補助ナビゲーション">
          <div class="ui-footer__nav-list">
            <span class="ui-footer__nav-item"><a href="/search/">検索</a></span>
          </div>
        </nav>
      </div>
    </div>
  </div>
</footer>
```

ルートはネイティブ`<footer>`です。`role`は手動付与せず、暗黙の`contentinfo` landmarkを利用します。視覚順序、DOM順序、読み上げ順序は一致させます。

`·` separatorはCSS pseudo-elementによる視覚装飾です。DOM要素、リンクラベル、navの明示的accessible name、テキスト抽出上の契約には含めません。ただしCSS generated contentが支援技術から常に完全に無視されるとは断定しません。将来、読み上げからの厳密な除外が必要になった場合は、DOM separator + `aria-hidden="true"`を別契約として検討します。

## Visual Contract

footerは上段にbrand情報、下段にlegal / build / navを置きます。下段はbaseline inline wrapとし、著作権、build、補助リンクを`·`で控えめに区切ります。狭幅時は情報を隠さず折り返し、長いbuild labelや長いlink labelには`overflow-wrap: anywhere`を適用します。

CSS selectorは`.ui-footer[data-footer]`起点にします。`--space-5` / `--space-7`には依存しません。

### Public Tokens

| Token                            | 内容                      |
| -------------------------------- | ------------------------- |
| `--footer-bg`                    | 背景                      |
| `--footer-fg`                    | 基本文字色                |
| `--footer-fg-strong`             | siteNameなどの強い文字色 |
| `--footer-fg-muted`              | 補助文字色                |
| `--footer-border`                | 上端境界線色              |
| `--footer-border-width`          | 上端境界線幅              |
| `--footer-max-inline-size`       | innerの最大幅            |
| `--footer-padding-block`         | root縦余白               |
| `--footer-padding-inline`        | root横余白               |
| `--footer-gap`                   | brandとsublineの間隔   |
| `--footer-separator-gap`         | `·` separatorの左右間隔  |
| `--footer-link-underline-offset` | link underline offset     |
| `--footer-build-fg`              | build文字色              |
| `--footer-build-opacity`         | 既定build文字色のalpha |

`--footer-build-fg`が指定された場合は完全なbuild文字色として優先します。`--footer-build-opacity`は、`--footer-build-fg`が未指定で`--_footer-fg-muted`から既定build文字色を導出する場合にだけ反映します。

relative color syntax対応環境では、`--footer-build-opacity`をbuild文字色のalphaとして反映します。非対応環境では`--footer-build-fg`またはmuted foreground fallbackを優先し、`.ui-footer__build`要素全体の`opacity`は使いません。

## Forced Colors / Print

`@media (forced-colors: active)`では、背景、文字、境界線、link、focus outlineをsystem colorへ写像します。

`@media print`では画面用footerを`display: none !important`で非表示にします。印刷用の終端情報が必要な場合は、画面用footerに条件分岐を積み増さず別契約で扱います。

## Test Contract

SSR HTML契約は`test/ssr/footer-render.test.ts`、CSS構造契約は`test/ssr/static-css-contracts.test.ts`を正本とします。

CSS契約テストは構造smoke testです。余白値、font-size、宣言順、整形、quote種別の完全一致は固定しません。

Storybookはdocs / smoke / 手動確認の補助であり、契約正本ではありません。
