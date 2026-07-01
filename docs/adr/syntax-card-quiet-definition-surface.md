# Syntax Card quiet definition surface

## Decision Record ID

DR-SYNTAX-CARD-QUIET-DEFINITION-001

## Status

Accepted

## Request

REQ-SYNTAX-CARD-QUIET-DEFINITION-001

## Decision

Syntax Cardを、操作UIカードではなく、本文中に挿入される静的リファレンスsurfaceとして扱う。

DOM構造、Markdown構文、hydration、URL、data contractは変更しない。変更対象はCSS visual contract、CSS契約テスト、Markdown contract記述に限定する。

## R段階/Aレベル

R3/A0

R3とする理由は、Syntax Cardのvisual contractを更新し、読書surfaceとしての仕様判断を伴うためである。

A0とする理由は、private/restricted Evidence、redaction、SHA-256保存、後日監査ログ保全を必要としない通常のUI/UX変更だからである。

## 採用仕様

- `section.syntax-card[data-syntax-card="true"]`を維持する。
- `p.syntax-card__name`と`p.syntax-section__heading`を維持し、DOM heading化しない。
- `dl.syntax-field > dt.syntax-field__term + dd.syntax-field__description`を維持する。
- `syntax-card`subtreeをTOC、heading permalink、本文heading idの対象にしない。
- `syntax-field`は非interactive rowのままとする。
- `.syntax-field:hover`によるrow-level affordanceは追加しない。
- `.syntax-card:hover .syntax-card__copy-action`と`.syntax-card:focus-within .syntax-card__copy-action`のcopy action表示契約は維持する。
- no-JS baseline、static-first output、hydration非依存を維持する。
- root外枠は残すが、`--border-muted`へ弱める。
- header下罫線は標準契約から外し、`border-bottom: 0`にする。
- signature下罫線は残すが、`--border-ghost`へ弱める。
- kindは枠付きバッジではなくtext-only eyebrowとして扱う。
- requiredはwarning badgeではなくmutedな補助メタ情報として扱う。
- desktop幅でもsyntax-fieldは2カラム表ではなく、縦方向に読める定義リストとして扱う。
- forced-colorsではroot境界の視認性を維持し、text-only化したrequiredをborder対象にしない。

## 棄却案

### DOM heading化

`syntax-card__name`や`syntax-section__heading`を`h2`〜`h6`へ変更する案は棄却する。これらは本文headingではなく、カード内部labelである。TOC、heading permalink、本文heading idの対象外であることを維持する。

### `dl > div > dt/dd`再構成

`syntax-field`を`dl > div > dt/dd`形式へ再構成する案は棄却する。現行DOMで意味構造は足りており、今回の目的はCSSだけで達成できる。

### root外枠の完全削除

root外枠を完全に消す案は棄却する。Syntax Cardは本文中の独立した参照断片なので、開始・終了を示す弱い境界は必要である。

### copy action表示契機の変更

copy actionをsignature hover限定などへ変更する案は今回扱わない。これは別のinteraction contract変更であり、今回の静音化範囲を超える。

## 保留案

なし。主要案は採用または棄却済みであり、今回のChange Planに未決定の設計判断を残さない。

## 反対仮説

2カラムgrid、kind badge、required badgeを弱めると、APIリファレンスとしての一覧性と識別性が落ちる。

## 反対仮説への応答

RouaultのSyntax Cardは巨大なAPI一覧表ではなく、本文中に挿入される短い定義surfaceである。一覧性よりも、本文の読書リズム、視線移動の少なさ、UI部品感の抑制を優先する。

`kind`、`required`、`type`、`default`自体は残すため、情報は失われない。視覚表現をbadge/tableからtypographic hierarchyへ寄せる変更である。

## 契約影響

`docs/contracts/markdown.md`のSyntax Card visual contractを更新する。

変更後の契約では、root外枠を弱い境界として扱い、kindとrequiredを枠付きバッジではなく補助メタ情報として扱う。desktop幅でもsyntax-fieldを2カラム表として扱わず、縦方向に読める定義リストとして扱う。

field row hover不在契約、copy action表示契約、static-first surface契約は維持する。

## 互換性影響

DOM、Markdown構文、URL、hydration、data contract、CSS custom property、custom eventは変更しない。互換性影響はvisual contract変更に限定される。

## 削除・移行・非推奨化

削除、移行、非推奨化は行わない。migrationは不要である。

## Delete/Breaking Change Gate

Gate ID:G-SYNTAX-CARD-QUIET-CONTRACT-001

visual contract変更を伴うためGate対象とする。ただし、DOM、Markdown構文、URL、hydration、data contract、CSS custom property、custom eventは変更しない。

migrationは不要である。失敗時は対象ファイルのrevertで戻せる。

## Rouault固有契約への影響

静かな読書空間、static-first surface、field row hover不在契約に整合する。読書体験への影響は、UI部品感と視線の横移動を減らす意図的な改善として扱う。

## Acceptance

- A-SYNTAX-CARD-QUIET-001
- A-SYNTAX-CARD-QUIET-002
- A-SYNTAX-CARD-QUIET-003
- A-SYNTAX-CARD-QUIET-004
- A-SYNTAX-CARD-QUIET-005
- A-SYNTAX-CARD-QUIET-006

## Verification

- V-SYNTAX-CARD-QUIET-001
- V-SYNTAX-CARD-QUIET-002
- V-SYNTAX-CARD-QUIET-003
- V-SYNTAX-CARD-QUIET-004
- V-SYNTAX-CARD-QUIET-005
- V-SYNTAX-CARD-QUIET-006

## 未解決事項

copy action表示契機のさらなる静音化は別Requestで扱う。

## Rollback

次の対象ファイルの当該変更をrevertする。

- `src/assets/css/syntax.css`
- `test/ssr/static-css-contracts.test.ts`
- `docs/contracts/markdown.md`
- `docs/adr/syntax-card-quiet-definition-surface.md`
- `docs/adr/README.md`
- `docs/README.md`

DOM、Markdown変換、hydration、URL、data contractは変更しないため、ロールバックはCSS契約とdocs差し戻しで完結する。

## Out of scope

- Syntax CardのMarkdown構文変更
- `heading-level`属性の意味変更
- `syntax-card`subtreeのTOC対象化
- DOM heading化
- `syntax-field`のDOM再構成
- copy action表示契機の変更
- copy buttonのDOM配置変更
- hydration変更
- runtime enhancer追加
- `tokens.css`変更
- 新token追加
- Storybook/visual regression基盤の新設
