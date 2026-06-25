# Theme Contract

## 1. Status

- Type: Normative
- Source of truth: `src/theme/theme-manager.ts`, `src/theme/theme-document-bootstrap.ts`, `src/theme/theme-chrome-bootstrap.ts`, `src/assets/css/tokens.css`, static header projection
- Applies to: theme preference, storage, root attributes, resolved theme, SSR document bootstrap, system theme resolution, CSS token ownership, header theme switcher projection
- Non-goals: new theme options, token value redesign, cookie / server persistence, ARIA pattern changes, runtime `initTheme()` behavior changes

## 2. Ownership

### This Layer Owns

- Theme preferenceの値集合。
- Theme preferenceの保存keyと読み取り規則。
- Document rootへ出力するtheme attributes。
- `system` preferenceから`light` / `dark` resolved themeへの解決。
- SSR document bootstrapが初期描画前にroot theme stateを適用すること。
- Runtime theme managerがstorage、system theme change、storage eventを反映すること。
- CSS tokenがroot theme stateに基づいて色tokenを所有すること。

### This Layer Must Not Own

- Header theme switcherのdisclosure / button group semantics。正本は`docs/contracts/static-header-contract.md`。
- Header geometry、focus、keyboard disclosure enhancement。
- CSS tokenの具体値変更。
- Search、router、sidebar、TOCのstate。
- Hydration trigger ownership。正本は`docs/contracts/hydration.md`。

## 3. Public Contract

### Theme Preference

Theme preferenceは利用者が選択した永続preferenceである。

- 有効値は`light`、`dark`、`system`のみである。
- 既定値は`system`である。
- 不明値、欠落値、storage読み取り失敗は`system`として扱う。
- 値集合の実装正本は`THEME_PREFERENCE_VALUES`である。

### Storage

- 保存先は`window.localStorage`である。
- Storage keyは`rouault-theme-preference`である。
- Runtimeのtheme managerはpreference適用時にstorageへ保存してよい。
- Document bootstrapはstorageを読み取るだけで、保存やevent発火を行わない。
- Storageにアクセスできない環境では`system`へ縮退する。

### Root Attributes

Theme stateはdocument rootに次の属性で反映する。

- `data-theme`: theme preference。値は`light | dark | system`。
- `data-resolved-theme`: resolved theme。値は`light | dark`。

`data-theme='system'`はpreferenceがsystemであることを表す。実際に適用される明暗は`data-resolved-theme`で表す。

### Resolved Theme

Resolved themeは表示上の明暗結果である。

- 有効値は`light`、`dark`のみである。
- 値集合の実装正本は`RESOLVED_THEME_VALUES`である。
- `ResolvedTheme`は`ThemePreference`から`system`を除外して暗黙導出しない。
- `system` preferenceは`(prefers-color-scheme: dark)`がmatchする場合`dark`、それ以外は`light`に解決する。

### Color Scheme

- `system` preferenceではrootの`color-scheme`を`light dark`にする。
- `light` preferenceでは`light`にする。
- `dark` preferenceでは`dark`にする。

### SSR Document Bootstrap

`BaseLayout.11ty.ts`はdocument bootstrapのscript bodyを直接所有しない。`src/theme/theme-document-bootstrap.ts`の`buildThemeDocumentBootstrapScript()`が生成したscript bodyを、既存のinline script escape経路へ渡す。

Document bootstrapは次を行う。

- `localStorage`からpreferenceを読み取る。
- 不明値を`system`に正規化する。
- `system`を`matchMedia('(prefers-color-scheme: dark)')`で`light | dark`に解決する。
- `data-theme`、`data-resolved-theme`、root `color-scheme`を設定する。

Document bootstrapは次を行わない。

- Storage書き込み。
- `rouault-theme-change` event発火。
- Runtime theme manager関数のinline scriptからの直接呼び出し。
- Header chrome DOMの更新。

Document bootstrapはstylesheetより前、かつclient module scriptより前に出力する。

### Runtime Theme Manager

`initTheme()`はclient runtimeのtheme同期入口である。

- 初期化は重複実行しない。
- 起動時にstored preferenceをrootへ適用する。
- `system` preferenceの場合、system theme changeを反映する。
- Storage eventで同一keyの変更を反映する。
- Runtime適用時は必要に応じてstorage保存と`rouault-theme-change` event発火を行う。

### CSS Token Ownership

- Themeによる色tokenは`src/assets/css/tokens.css`のroot tokenが所有する。
- `:root[data-theme='light']`はlight token overrideを所有する。
- `:root[data-theme='dark']`はdark token overrideを所有する。
- `:root[data-theme='system']`は`color-scheme: light dark`を所有するが、色token overrideを追加しない。
- ComponentはOS theme判定を独自に所有せず、root tokenを参照する。

### Header Projection

Header theme switcherはcurrent preferenceを表示し、preference選択button群を出力する投影である。

- SSR projectionの初期preferenceは`system`である。
- Document bootstrapはroot theme stateのみを所有する。
- Theme chrome bootstrapはroot theme stateを読んでheaderの表示状態を同期する。
- Theme switcherのDOM / ARIA semanticsはstatic header contractが所有する。

## 4. Failure Semantics

- Storageが読めない場合は`system`として適用する。
- Storage値が不正な場合は`system`として適用する。
- Runtime storage書き込みに失敗してもroot theme stateの適用は継続する。
- Document bootstrapは初期描画driftを避けるためhead内で早期に実行する。

## 5. Acceptance Criteria

- Theme preferenceは`light | dark | system`のみである。
- Resolved themeは`light | dark`のみである。
- `data-theme`と`data-resolved-theme`の意味が分離されている。
- Document bootstrapとruntime theme managerは同じroot適用結果を生成する。
- Header projectionの意味論はstatic header contractを上書きしない。
