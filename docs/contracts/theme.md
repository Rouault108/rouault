# Theme Contract

## 1. Status

- Type: Normative
- Source of truth: `src/theme/theme-manager.ts`, `src/theme/theme-document-bootstrap.ts`, `src/theme/theme-chrome-bootstrap.ts`, `src/assets/css/tokens.css`, static header projection
- Applies to: theme preference, storage, root attributes, resolved theme, SSR document bootstrap, system theme resolution, CSS token ownership, header theme switcher projection
- Non-goals: new theme options, token value redesign, cookie / server persistence, ARIA pattern changes, runtime `initTheme()` behavior changes

## 2. Ownership

### This Layer Owns

- Theme preference の値集合。
- Theme preference の保存 key と読み取り規則。
- Document root へ出力する theme attributes。
- `system` preference から `light` / `dark` resolved theme への解決。
- SSR document bootstrap が初期描画前に root theme state を適用すること。
- Runtime theme manager が storage、system theme change、storage event を反映すること。
- CSS token が root theme state に基づいて色 token を所有すること。

### This Layer Must Not Own

- Header theme switcher の disclosure / button group semantics。正本は `docs/contracts/static-header-contract.md`。
- Header geometry、focus、keyboard disclosure enhancement。
- CSS token の具体値変更。
- Search、router、sidebar、TOC の state。
- Hydration trigger ownership。正本は `docs/contracts/hydration.md`。

## 3. Public Contract

### Theme Preference

Theme preference は利用者が選択した永続 preference である。

- 有効値は `light`、`dark`、`system` のみである。
- 既定値は `system` である。
- 不明値、欠落値、storage 読み取り失敗は `system` として扱う。
- 値集合の実装正本は `THEME_PREFERENCE_VALUES` である。

### Storage

- 保存先は `window.localStorage` である。
- Storage key は `rouault-theme-preference` である。
- Runtime の theme manager は preference 適用時に storage へ保存してよい。
- Document bootstrap は storage を読み取るだけで、保存や event 発火を行わない。
- Storage にアクセスできない環境では `system` へ縮退する。

### Root Attributes

Theme state は document root に次の属性で反映する。

- `data-theme`: theme preference。値は `light | dark | system`。
- `data-resolved-theme`: resolved theme。値は `light | dark`。

`data-theme='system'` は preference が system であることを表す。実際に適用される明暗は `data-resolved-theme` で表す。

### Resolved Theme

Resolved theme は表示上の明暗結果である。

- 有効値は `light`、`dark` のみである。
- 値集合の実装正本は `RESOLVED_THEME_VALUES` である。
- `ResolvedTheme` は `ThemePreference` から `system` を除外して暗黙導出しない。
- `system` preference は `(prefers-color-scheme: dark)` が match する場合 `dark`、それ以外は `light` に解決する。

### Color Scheme

- `system` preference では root の `color-scheme` を `light dark` にする。
- `light` preference では `light` にする。
- `dark` preference では `dark` にする。

### SSR Document Bootstrap

`BaseLayout.11ty.ts` は document bootstrap の script body を直接所有しない。`src/theme/theme-document-bootstrap.ts` の `buildThemeDocumentBootstrapScript()` が生成した script body を、既存の inline script escape 経路へ渡す。

Document bootstrap は次を行う。

- `localStorage` から preference を読み取る。
- 不明値を `system` に正規化する。
- `system` を `matchMedia('(prefers-color-scheme: dark)')` で `light | dark` に解決する。
- `data-theme`、`data-resolved-theme`、root `color-scheme` を設定する。

Document bootstrap は次を行わない。

- Storage 書き込み。
- `rouault-theme-change` event 発火。
- Runtime theme manager 関数の inline script からの直接呼び出し。
- Header chrome DOM の更新。

Document bootstrap は stylesheet より前、かつ client module script より前に出力する。

### Runtime Theme Manager

`initTheme()` は client runtime の theme 同期入口である。

- 初期化は重複実行しない。
- 起動時に stored preference を root へ適用する。
- `system` preference の場合、system theme change を反映する。
- Storage event で同一 key の変更を反映する。
- Runtime 適用時は必要に応じて storage 保存と `rouault-theme-change` event 発火を行う。

### CSS Token Ownership

- Theme による色 token は `src/assets/css/tokens.css` の root token が所有する。
- `:root[data-theme='light']` は light token override を所有する。
- `:root[data-theme='dark']` は dark token override を所有する。
- `:root[data-theme='system']` は `color-scheme: light dark` を所有するが、色 token override を追加しない。
- Component は OS theme 判定を独自に所有せず、root token を参照する。

### Header Projection

Header theme switcher は current preference を表示し、preference 選択 button 群を出力する投影である。

- SSR projection の初期 preference は `system` である。
- Document bootstrap は root theme state のみを所有する。
- Theme chrome bootstrap は root theme state を読んで header の表示状態を同期する。
- Theme switcher の DOM / ARIA semantics は static header contract が所有する。

## 4. Failure Semantics

- Storage が読めない場合は `system` として適用する。
- Storage 値が不正な場合は `system` として適用する。
- Runtime storage 書き込みに失敗しても root theme state の適用は継続する。
- Document bootstrap は初期描画 drift を避けるため head 内で早期に実行する。

## 5. Acceptance Criteria

- Theme preference は `light | dark | system` のみである。
- Resolved theme は `light | dark` のみである。
- `data-theme` と `data-resolved-theme` の意味が分離されている。
- Document bootstrap と runtime theme manager は同じ root 適用結果を生成する。
- Header projection の意味論は static header contract を上書きしない。
