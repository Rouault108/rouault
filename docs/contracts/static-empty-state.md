# Static Empty State Contract

## 位置づけ

Static empty state は、旧 `ui-empty-state` custom element を復活させずに、静的 HTML として corpus 系の空状態を出力するための契約である。

正本の renderer は `src/layouts/empty-state-html.ts` の `renderEmptyStateHtml()` とする。この renderer は `corpus-page` と `corpora-overview` の空状態だけを対象にし、search page の search empty state には適用しない。

## API

`renderEmptyStateHtml()` の入力は `variant`、`heading`、`description`、`announce` だけである。

```ts
renderEmptyStateHtml({
  variant: 'default',
  heading: '公開ノートはまだありません',
  description: 'ノートが公開されると、ここに最近更新した項目が表示されます。',
  announce: 'off',
});
```

`variant` は `'default'` のみを公開する。不正な runtime 入力は `'default'` に正規化するが、public type を `string` へ広げない。

`heading` と `description` は renderer 内で HTML text escape する。`description` が `undefined`、空文字列、空白のみの場合、`p.empty-hint__description` は出力しない。

## Markup

renderer は次の静的構造を維持する。

- wrapper は `.empty-hint[data-empty-state][data-empty-variant="default"]` を持つ。
- message wrapper は `.empty-hint__message` を持つ。
- icon wrapper は空の `.empty-hint__icon[aria-hidden="true"]` として出力する。
- actions region は空の `.empty-hint__actions[hidden]` として出力する。
- `ui-empty-state` custom element は出力しない。

## Announce

`announce` は `'off'` と `'polite'` だけを公開する。不正な runtime 入力は `'off'` に正規化するが、public type を `string` へ広げない。

`announce: 'off'` の場合、message wrapper は `data-announce="off"` だけを持つ。`aria-live` と `role="status"` は出力しない。

`announce: 'polite'` の場合、message wrapper は `data-announce="polite"` と `aria-live="polite"` を持つ。`role="status"` は出力しない。

## Search Page Boundary

search page の empty state は `src/layouts/search-page-html.ts` と post-hydrate search controller の契約に属する。`renderEmptyStateHtml()` は search variant、search-specific data attribute、search result state の文言分岐を所有しない。

## Future constraints only: trusted static HTML

将来、信頼済み静的 HTML を empty state に受け渡す場合は、信頼境界と検証方法の契約を先に定義する必要がある。この工程の API には `trustedIconHtml`、`trustedIllustrationHtml`、`trustedActionsHtml` を含めない。
