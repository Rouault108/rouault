# Static Choice Menu Contract

## 位置づけ

Static choice menuは、search pageの`tagMode` / `sort`を所有する単一選択UI primitiveである。native `<select>`、旧`ui-select`、`role="listbox"` / `role="option"`によるcustom selectは使わない。

## DOM 契約

- 各menuは`details` / `summary` / panel / `button type="button"` item / `input type="hidden"`で構成する。
- hidden inputは`form[data-search-page-form]`の内側に出力し、既存の`new FormData(form)`で`name="tagMode"` / `name="sort"`を読める位置に置く。
- hidden inputはdisabledにしない。runtime unavailable / disabled stateでも`name`と`value`を保持する。
- summaryは`aria-expanded`を持ち、controllerが`details.open`と同期する。
- summaryのアクセシブル名は表示ラベルIDとcurrent label IDを参照する`aria-labelledby`で所有する。`aria-label`と二重指定しない。
- panelは`role="group"`に留め、custom selectのlistbox / option意味論を持たせない。
- 各menuは単一選択であり、常にexactly one itemだけが`data-selected="true"` / `aria-pressed="true"`を持つ。

## Interaction 契約

- static choice menuのopen / closeはsearch page controllerが所有する。
- summary click / Enter / Spaceはcontroller経由で開閉し、`details.open`と`aria-expanded`を同期する。
- `ArrowDown` / `ArrowUp`はmenuを開き、item focusを移動する。
- `Escape`はmenuを閉じ、triggerへfocus restoreする。
- `Tab`は自然なフォーカス移動を許容し、開いているmenuを閉じる。
- item activation後はhidden input、trigger label、selected item stateを同期し、URL更新と検索を実行し、menuを閉じてtriggerへfocus restoreする。
- 同一検索ページ内の`tagMode` / `sort` menuは同時に複数開かない。ヘッダーのcorpus / theme menuとの相互排他はこの契約に含めない。
- menu外をpointer操作した場合、開いているsearch choice menuは閉じる。
- typeahead navigationとpointer modality trackingはこの契約に含めない。

## State 復元

初期SSR、runtime state同期、browser back / forward復元では、次を一致させる。

- hidden input value
- trigger current label
- selected itemの`data-selected` / `aria-pressed`
- summary `aria-expanded="false"`（復元時）

## No-JS

no-JS時、button itemはhidden inputを更新できない。ただしsearch pageは検索・フィルタ機能にJavaScriptを要求しているため、この劣化は許容する。
