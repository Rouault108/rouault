# Static Empty State Contract

## 位置づけ

Static empty stateは、旧`ui-empty-state` custom elementを復活させずに、静的HTMLとしてcorpus系の空状態を出力するための契約である。

正本のrendererは`src/layouts/empty-state-html.ts`の`renderEmptyStateHtml()`とする。このrendererは`corpus-page`と`corpora-overview`の空状態だけを対象にし、search pageのsearch empty stateには適用しない。

## API

`renderEmptyStateHtml()`の入力は`variant`、`heading`、`description`、`announce`だけである。

```ts
renderEmptyStateHtml({
  variant: 'default',
  heading: '公開ノートはまだありません',
  description: 'ノートが公開されると、ここに最近更新した項目が表示されます。',
  announce: 'off',
});
```

`variant`は`'default'`のみを公開する。不正なruntime入力は`'default'`に正規化するが、public typeを`string`へ広げない。

`heading`と`description`はrenderer内でHTML text escapeする。`description`が`undefined`、空文字列、空白のみの場合、`p.empty-hint__description`は出力しない。

## Markup

rendererは次の静的構造を維持する。

- wrapperは`.empty-hint[data-empty-state][data-empty-variant="default"]`を持つ。
- message wrapperは`.empty-hint__message`を持つ。
- icon wrapperは空の`.empty-hint__icon[aria-hidden="true"]`として出力する。
- actions regionは空の`.empty-hint__actions[hidden]`として出力する。
- `ui-empty-state` custom elementは出力しない。

## Announce

`announce`は`'off'`と`'polite'`だけを公開する。不正なruntime入力は`'off'`に正規化するが、public typeを`string`へ広げない。

`announce: 'off'`の場合、message wrapperは`data-announce="off"`だけを持つ。`aria-live`と`role="status"`は出力しない。

`announce: 'polite'`の場合、message wrapperは`data-announce="polite"`と`aria-live="polite"`を持つ。`role="status"`は出力しない。

## Search Page Boundary

search pageのempty stateは`src/layouts/search-page-html.ts`とpost-hydrate search controllerの契約に属する。`renderEmptyStateHtml()`はsearch variant、search-specific data attribute、search result stateの文言分岐を所有しない。

## Future constraints only: trusted static HTML

将来、信頼済み静的HTMLをempty stateに受け渡す場合は、信頼境界と検証方法の契約を先に定義する必要がある。この工程のAPIには`trustedIconHtml`、`trustedIllustrationHtml`、`trustedActionsHtml`を含めない。
