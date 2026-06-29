# Image Preview Surface Trigger

## Status

- Type: ADR
- Status: Accepted
- Scope: note本文画像のLightbox trigger DOM

## Context

Rouaultの本文画像は読解対象であり、`img`自体をbutton内へ入れると本文DOMの意味論が曖昧になる。一方で、`zoomable=true`画像は右上の小さなtriggerだけでなく、画像面全体から拡大表示を開ける必要がある。

## Decision

`zoomable=true`画像は、`figure[data-image]`直下にpreview frameを置き、その中へ本文画像`img`と全面overlay buttonを順に配置する。

```html
<figure data-image="true" data-image-zoomable="true">
  <div data-image-preview-frame="true" class="image-preview-frame">
    <img>
    <button hidden type="button" data-image-zoom-trigger="true" aria-haspopup="dialog"></button>
  </div>
  <figcaption></figcaption>
</figure>
```

triggerはSSR時点では`hidden`であり、image lightbox enhancerがdialog、必須DOM、`showModal()`、event listener登録を完了した後だけ表示する。`zoomable=false`画像は`figure[data-image] > img`を維持し、preview frame、trigger、Lightbox hydration key、dialogを生成しない。

## Consequences

- `img`はbuttonに包まれず、本文中の画像として独立する。
- 画像面全体がpointer triggerになり、右上の丸いiconはbutton本体ではなく装飾的affordanceになる。
- no-JSまたはenhancer初期化失敗時はtriggerが表示されず、通常の画像読解を妨げない。
- caption付きfigureでは、enhance後も`figcaption`を最後のdirect childとして維持する。
- JS有効かつenhancer初期化成功後は、画像面全体がoverlay triggerになるため、サムネイル画像上のnative context menu、drag、直接画像保存操作は従来より使いにくくなる可能性がある。今回の主要契約は画像面からLightboxを開くことであり、画像保存/drag操作は主要契約に含めない。
