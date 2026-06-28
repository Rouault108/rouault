# URL Policy Contract

## 1. Status

- Type: Normative
- Source of truth: `shared/url/`、`shared/search/`、`build/content/generated-document-route-set.ts`、URL policy tests
- Applies to: RouaultのURL分類、trailing slash方針、navigation URL、search URL、generated document route、fetch target、Permanent URLとの境界
- Non-goals: 公開URL変更、redirect設計、canonical link方針、Pagefind URL設計、note slug規則、corpus key/tag encoding規則

このContractは既存URL挙動を明文化する横断Contractであり、実装済みURLのcanonicalやnormalizationを変更しない。

## 2. URL Classification

| 分類 | 例 | trailing slash | 所有Contract | 主な関数 |
| --- | --- | --- | --- | --- |
| Note permalink / note page navigation URL | `/notes/library/collection/foo` | なし | `url-policy.md`、`note-navigation.md` | note projection、`normalizeRouaultPathname()` |
| Surface URL | `/about/`、`/corpora/`、`/corpora/{corpusKey}/` | あり | `url-policy.md`、該当page/surface contract | `normalizeRouaultPathname()` |
| SearchStateUrl | `/search/`、`/search/?q=foo`、`/tags/{tag}/` | `/search/`と`/tags/{tag}/`はあり | `url-policy.md`、`search.md` | `normalizeSearchStateUrl()`、`buildSearchStateUrl()`、`buildUrlForSearchState()`、`buildTagPageUrl()` |
| SearchCanonicalPathname | `/notes/foo/` | あり | `url-policy.md`、`search.md` | `normalizeSearchCanonicalPathname()`、`createSearchCanonicalPathname()` |
| SearchRenderHref | `/notes/foo/`、`/rouault/notes/foo/` | SearchCanonicalPathnameに従う | `url-policy.md`、`search.md` | `buildSearchRenderHref()`、`buildSearchResultRenderHref()` |
| Generated document route pathname / fetch target path | `/notes/foo/`、`/notes/foo/index.html` | route/fetch都合であり公開canonicalではない | `url-policy.md`、`router.md` | `normalizeGeneratedDocumentRoutePathname()`、`buildGeneratedDocumentRouteSet()`、`resolveRouaultContentPath()` |
| Permanent URL | `/archives/{hash}` | Permanent URL Contractに従う | `permanent-url.md` | archive hash / route projection |

Surface URLの所有Contractは`url-policy.md`および該当page/surface contractである。すべてのSurface URLに常に個別Contractが存在する前提にしてはならない。

## 3. Class Contracts

### Note permalink / note page navigation URL

- Note permalink / note page navigation URLは`/notes/{slug}`であり、canonicalは末尾スラッシュなしである。
- note identity、breadcrumb、sidebar、history上の通常note遷移にはnote page navigation URLを使う。
- `SearchCanonicalPathname`、`SearchRenderHref`、Generated document route pathname、fetch target pathと同一視してはならない。

### Surface URL

- Surface URLは索引、集合面、静的surface用のURLである。
- `/about/`、`/corpora/`、`/corpora/{corpusKey}/`は末尾スラッシュありをcanonicalとする。
- `/search/`と`/tags/{tag}/`はSurface URLではなくSearchStateUrlとして扱う。
- note permalinkのslashless方針をSurface URLへ適用してはならない。

### SearchStateUrl

- SearchStateUrlは検索UI状態、タグsurfaceを表すURLである。
- `/search/`、`/search/?q=...`、`/tags/{tag}/`を扱う。
- `/tags/{tag}/`はtag SearchStateUrlとしてのcanonicalである。
- `/tags/{tag}`はtag SearchStateUrlのcanonicalではない。
- `normalizeRouaultPathname()`と`normalizeSearchStateUrl()`は`/tags/{tag}`を`/tags/{tag}/`へ補完しない。

### SearchCanonicalPathname

- SearchCanonicalPathnameは検索結果のdocument重複判定・結果識別用canonicalである。
- SearchStateUrlではなく、note permalink / note page navigation URLでもない。
- どのrouteを検索対象documentとして採用するかは、検索index生成・内部document判定側の責務であり、`normalizeSearchCanonicalPathname()`単体の責務ではない。

### SearchRenderHref

- SearchRenderHrefはSearchCanonicalPathnameから導出される検索結果hrefである。
- note permalinkではない。
- basePath付きになり得る。
- router遷移時に`normalizeRouaultUrl()`でnavigation URLへ正規化され得る。

### Generated document route pathname / fetch target path

- Generated document route pathname / fetch target pathは静的生成物、route presence、link classification、fetch都合のURLである。
- 公開note permalinkのcanonicalではない。
- `GeneratedDocumentRouteSet`はslash付きpathnameと`normalizeRouaultPathname()`後のpathnameを両方保持し得る。
- `GeneratedDocumentRouteSet`はURL意味分類ではなく、静的生成済みrouteのpresence判定集合である。
- routeSetに含まれることは、そのrouteの意味分類を変更しない。
- `resolveRouaultContentPath()`はfetch target pathを導出する関数であり、公開canonicalを定義しない。

### Permanent URL

- `/archives/{hash}`はPermanent URL Contractが所有する固定内容参照URLである。
- note permalink、SearchStateUrl、SearchCanonicalPathname、SearchRenderHref、fetch targetとは別分類である。

## 4. Forbidden Coupling

- fetch target用のtrailing slash補完をnote permalinkのcanonicalへ逆流させてはならない。
- SearchCanonicalPathnameをSearchStateUrlやnote permalinkとして扱ってはならない。
- SearchRenderHrefをnote permalinkとして扱ってはならない。
- GeneratedDocumentRouteSetのpresence判定をURL意味分類として扱ってはならない。
- routeSetに含まれることを理由にSurface URL、SearchStateUrl、note permalink、Permanent URLの分類を変更してはならない。
- `/tags/{tag}`を`/tags/{tag}/`へ補完するnormalizationを`normalizeRouaultPathname()`や`normalizeSearchStateUrl()`へ追加してはならない。
- `/archives/{hash}`を通常のnote page navigation URL、SearchStateUrl、SearchCanonicalPathname、SearchRenderHref、fetch targetと同一視してはならない。

## 5. Integration Boundaries

### Router

Routerはnavigation requestの正規化とfetch target導出を扱う。URL分類の意味論はこのContractを参照し、fetch target解決やgenerated route presence判定を公開canonical定義として扱わない。

### Search

SearchはSearchStateUrl、SearchCanonicalPathname、SearchRenderHrefを分離して扱う。検索対象documentの採用判断は検索index生成・内部document判定側が所有する。

### Note Navigation

Note navigationはslashlessなnote permalink / note page navigation URLを所有する。検索結果用URLやfetch target用URLはnote permalinkではない。

### Generated Routes

Generated document route setは静的生成済みrouteのpresence判定集合である。link classificationやfetch都合でslash付き/なしを保持し得るが、URL意味分類を所有しない。

### Permanent URL

Permanent URLは内容固定参照を所有する。通常navigation、search、generated route、fetch targetの分類へ混ぜない。

## 6. Acceptance Criteria

- 6分類とPermanent URLの境界が明文化されている。
- trailing slash方針が分類ごとに明文化されている。
- `GeneratedDocumentRouteSet`と`resolveRouaultContentPath()`が公開canonicalを定義しないことが明記されている。
- SearchStateUrl、SearchCanonicalPathname、SearchRenderHrefが分離されている。
- 既存URL挙動を変更しない。
