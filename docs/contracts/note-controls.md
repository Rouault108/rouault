# Note Controls

Code PreviewとVideo内のnative button/command menuの契約。durable controls DOMはbuild renderer、状態と操作結果は親feature controller、overlay positioningとdismissalはAnchoredOverlayControllerが所有する。

## Target

custom elementを削除し、native elementを直接使用する。

```html
<button type="button" class="note-control ..." ...>...</button>
```

command menu itemもnative `<button role="menuitem">`等の既存menu semanticsへ直接落とす。

## Runtime

独立hydration targetを作らない。

loading/pressed/expanded等は親feature controllerがnative attributeを更新する。

## 削除

- `src/components/ui/button/button.ts`
- Lit-specific tests
- custom element manifest entry
- Shadow DOM / `::part` contract

---

## 9.2 `ui-dropdown`

## Target

静的native menu DOM + reusable controllerへ移行する。

概念構造:

```html
<div data-command-menu>
  <button
    type="button"
    data-command-menu-trigger
    aria-haspopup="menu"
    aria-expanded="false"
    aria-controls="..."
  >
    ...
  </button>

  <div id="..." role="menu" data-command-menu-panel hidden>
    <button role="menuitem" ...>...</button>
  </div>
</div>
```

## Preserve

- AnchoredOverlayController
- Escape close
- outside pointer close
- scroll policy
- focus return
- keyboard navigation
- typeahead
- disabled semantics
- command selection semantics

## Ownership

DOMはparent static rendererが所有する。

interactionはplain `CommandMenuController`が所有する。

`ui-dropdown` / `ui-menu-item` event protocolをparent内部だけの実装詳細として維持しない。parent enhancerがcontroller callbackを直接受け取る。

stylesheet ownerは`src/assets/css/note-controls.css`。旧custom element property/method/slot/part APIは廃止し、親featureの既存操作契約を維持する。[移行Decision](../adr/full-lit-removal.md)。
