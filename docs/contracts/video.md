# Video

本書は人間承認済みfull Lit removal v14の該当component契約を反映する。durable document DOMはbuild-time、interactionとephemeral stateはplain controllerが所有する。最初の起動はHydrationSchedulerだけが所有する。

実装入口: `build/rehype/native-video.ts` / `src/client/post-hydrate/video-controller.ts`。移行Decisionは[full Lit removal](../adr/full-lit-removal.md)を参照する。

## Static output

```html
<figure
  data-video-root
  data-hydration-key="video-enhancer"
  data-hydration-capability="interactive"
  data-hydration-trigger="visible"
  ...
>
  <div data-video-player>
    <video controls playsinline ...>
      <source ... />
      <track ... />
    </video>

    <div data-video-enhanced-controls hidden>...</div>

    <div data-video-live-region class="sr-only" aria-live="polite"></div>
  </div>

  <figcaption>...</figcaption>
</figure>
```

## no-JS baseline

native `<video controls>`で、

- play / pause
- seek
- volume
- captions等ブラウザが提供する基本操作

へ到達できる。

## Hydration target

固定commitにはVideoについて一意に継承できるcurrent hydration directiveがないため、`video-enhancer`は本target contractで`data-hydration-capability="interactive"` / `data-hydration-trigger="visible"`を明示採用する。これは「current equivalent」の推測ではなく、本移行で必要なtarget決定である。ここで`visible`は単なる「IntersectionObserverで画面内に入った時だけ」を意味せず、固定commitのHydrationSchedulerが所有する既存`visible` policy、すなわちviewport近傍のIntersectionObserver判定に加えてtarget内`focusin`による先行起動とIntersectionObserver非対応時のfallback実行を含む。HydrationSchedulerだけがこの初回起動判定を所有し、VideoController自身が独自observerやinteraction起動経路を持たない。native `<video controls>`はscheduler起動前も有効であり、enhancement完了までは取り除かない。

`visible`を採用する理由は、最初のユーザー操作を起動ownerにせず、custom controlsのlistener/state同期を完了した後にatomicにnative controlsから切り替えるためである。これは一般的なperformance tuningではなく、本書のatomic enhancementを一意に実装可能にするためのtarget hydration contractとする。

## Atomic enhancement

1. static custom controls DOMの存在と必要要素を検証
2. controllerをattach
3. media event listenerをattach
4. initial stateを同期
5. custom controlsをunhide
6. 最後にnative `controls`を外す
7. 途中失敗した場合はnative controlsを残す

## Runtime state source

再生状態の一次source of truthは`HTMLVideoElement`とする。

controllerはmedia eventから派生UIを更新する。

## Preserve

- current playback UX
- `EMPTY/LOADING/PAUSED/PLAYING/BUFFERING/ENDED/ERROR`相当state
- fullscreen
- skip
- progress
- floating controls
- captions
- tracks
- focus
- keyboard
- long press / double tap等、現行contractで維持対象のinteraction

## Remove

- `<ui-video>`
- Lit reactive state
- Shadow DOM
- HTMLElement public instance methods

`playVideo()`、`pauseVideo()`、`retry()`および実装済みシーク操作はinternal VideoControllerへ移す。未実装の公開`seekTo()`契約を新規実装しない。

repository searchでproduction外部consumerが存在しないことをDelete Gateで確認する。

## 維持・変更・既存未対応の区分

| 区分                       | 今回の確定範囲                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 実装済み機能の移植         | 固定commitのvideo.tsとvideo.browser.test.tsが観測する状態機械、play/pause/retry、seek/skip、volume/mute、fullscreen、字幕toggle、valid trackの描画、captionとのaria-describedby、pointer/keyboard、長押し/ダブルタップ、controlsの表示規則            |
| 意図的変更                 | native video controlsをno-JS baselineとすること、同一media要素を保つatomic enhancement、Shadow DOMと旧HTMLElement APIの廃止、native track子要素への入力投影、fullscreen対象をnative player rootへ変更すること                                         |
| 既存未対応として今回対象外 | chapters UI、initialTime、公開seekTo、新規aspectRatio/title/ariaLabel/captionsPolicy入力、player全体の新しいrole/naming体系、公開ui-video-\*イベント、正規化エラーコード、入力能力ベース分岐、mutedとvolume=0分離、手動再生ミュート方針の既存差分解消 |
| 今回新規実装する機能       | Lit撤去に必要なnative renderer、controller接続、no-JS baselineとatomic enhancementのみ。上行の未対応機能は含めない                                                                                                                                    |

未対応項目を「維持済み」「検証済み」と記載しない。契約書には適用範囲と既存の未対応事項を残し、本変更のAcceptanceから除外したことを明記する。これは既存採用仕様の撤回ではなく、今回実装する範囲の限定である。旧custom-element API形式自体の廃止はDelete Gateで扱い、将来の代替API決定は本変更に含めない。

## Static media input contract

- `src`、`poster`、autoplay/loop/muted/playsinline、width/height、captionは現行実装の正規化をbuild adapterへ移す。既存のdangerous URL拒否を維持する。
- 旧`tracks: Track[]`はbuild/test/UI-check用rendererの構造化入力に移す。rendererが正規化したnative `<track>`を`<video>`の直下へ出力し、runtimeで本文track DOMを作り直さない。
- 旧`slot="tracks"`の低レベル入力を使うfixtureは、同じtrack内容をrendererのnative子要素入力へ移す。構造化入力と子要素入力を併用した場合は従来どおり自動重複除去をしない。これは新しいMarkdown属性・directiveの追加ではない。
- property代入を前提としたfixtureはrenderer呼出時の入力へ移し、非Lit要素への擬似property APIを作らない。実運用consumerでruntime track更新が必要と判明した場合は、未計画APIを加えず差異を報告する。
- 読者がenhance前に開始した再生・現在時刻・音量・字幕状態は同一HTMLVideoElementから引き継ぐ。初期化だけを理由にload、時刻reset、強制pause、ミュートや字幕の再初期化を行わない。
- custom controlsのnative button/rangeをkeyboard到達点とし、既存shortcutをplayer内で受理する。figure自体を新しい対話widgetにしない。native controlsの内部focus中は切替を延期し、controls除去でfocusを消失させない。
- attach途中の失敗時はlistener等を解除し、custom controlsをhiddenへ戻す。成功済みcontrollerのabort時も接続中mediaにはnative controlsを戻す。単にcontrols属性だけ残した二重操作状態を成功扱いにしない。

## Visual Contract

本文に埋め込まれた動画の低主張性を維持する。動画はobject-fit: contain、正規width/heightからaspect-ratioを投影し、それ以外は既存16/9を使う。中央再生面、半透明floating controls、長押し2xとskip indicator、caption、focus-visibleを維持する。主要操作の実効hit領域は既存40px以上を保つ。stylesheet ownerは`src/assets/css/video.css`。未実装のaspectRatio/title入力、chapters UI等は上記の対象外区分に従い、今回の維持済み機能として扱わない。
