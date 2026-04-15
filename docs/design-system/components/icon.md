# Icon

## 文書の目的

本書は、Rouault における現行のアイコン戦略を、実装を根拠に整理するものです。

この文書が扱うのは、次の 3 点です。

- どのアイコン資産を正規ルートとして使うか
- `ui-icon` がどのようにアイコン名を解決し、アクセシビリティを扱うか
- どのケースで `ui-icon` ではなく inline SVG を使うか

本書は将来の理想論ではなく、**現在のコードベースで成立している契約**を優先します。

---

## 現行戦略の要約

Rouault の現行アイコン戦略は、次のように整理できます。

1. **標準アイコンは Lucide に統一する**
   - 利用可能な名前は `src/icons/catalog.ts` で定義します。
   - 実体は `@iconify-json/lucide` から生成した subset を使います。

2. **描画は `ui-icon` に集約する**
   - `ui-icon` は `iconify-icon` を内部で使うラッパーです。
   - 利用側は `name` だけを与えるのを基本とします。

3. **重い分岐や意味の強い装飾は文字列カタログではなくコンポーネント側で持つ**
   - たとえば `ui-checkbox` のチェックマークのような固定 glyph は inline SVG を使います。
   - この種の glyph は、再利用性よりも self-contained な描画と制御の単純さを優先します。

4. **ノート由来のアイコン指定は bare name に限定する**
   - `lucide:` プレフィックスは受け付けません。
   - `none` は明示的な無効値として扱います。

---

## 資産レイヤー

### 1. アイコン名カタログ

`src/icons/catalog.ts` は、プロジェクトで許可する Lucide アイコン名の単一ソースです。

- `ICON_NAMES` は `as const` の配列です。
- `IconName` は `ICON_NAMES` から導出されます。
- `isIconName()` は実行時の検証に使います。

このカタログに存在しない名前は、原則としてプロダクト内で使用しません。

### 2. 生成済み subset

`scripts/generate-icon-subset.ts` が `@iconify-json/lucide` から必要分だけを抽出し、`src/generated/lucide-subset.ts` を生成します。

この仕組みにより、実行時に必要な Lucide データを絞り込み、不要なアイコン資産を持ち込まない構造にしています。

### 3. 登録層

`src/icons/register.ts` は、`iconify-icon` のコレクション登録を 1 回だけ行います。

- `iconify-icon` 本体を読み込みます。
- 生成済み subset を `addCollection()` に渡します。
- `globalThis` 上のフラグで多重登録を防ぎます。

この層は副作用専用です。利用者が直接触るべき API ではありません。

---

## `ui-icon` の契約

`src/components/ui/icon/icon.ts` が `ui-icon` の実装本体です。

### 入力

`ui-icon` は次の属性を受け付けます。

- `name`
- `icon`
- `aria-label`

`name` が正規の入力です。`icon` は後方互換のための deprecated エイリアスです。新規実装では `name` を使ってください。

### 解決規則

1. `name` があればそれを使います。
2. `name` がなければ `icon` を参照します。
3. どちらもない場合、要素は非表示になります。

実装上は、解決後の名前に `lucide:` プレフィックスを付けて `iconify-icon` に渡します。

### アクセシビリティ

`aria-label` が与えられた場合のみ、`ui-icon` は意味を持つ画像として振る舞います。

- `role="img"` を付与します。
- 内部 glyph の `aria-hidden` を解除します。
- `aria-label` を glyph に設定します。

`aria-label` がない場合は、装飾的なアイコンとして扱います。

- `role` は付けません。
- 内部 glyph は `aria-hidden="true"` になります。

### ホスト表示

`name` が空の場合、ホストは `display: none` に折り畳まれます。

`name` がある場合は、ホストに次の既定表示を与えます。

- `display: inline-flex`
- `align-items: center`
- `justify-content: center`
- `line-height: 1`

これにより、アイコン単体でも周辺テキストと自然に揃います。

---

## 使い分け

### `ui-icon` を使う場面

次のようなケースでは `ui-icon` を使います。

- ナビゲーション
- 状態表示
- ボタン内部の補助 glyph
- 一覧・メタ情報・見出し補助
- 同じアイコンを複数コンポーネントで再利用する場合

この層では、見た目の一貫性と運用の単純さを優先します。

### inline SVG を使う場面

次のようなケースでは inline SVG が適します。

- あるコンポーネントにしか存在しない固定 glyph
- 実体の変更が少ない control glyph
- 外部登録を経由せずに描画を完結させたい場合

現行実装では `ui-checkbox` のチェックマークがこのパターンです。

### 使わない場面

次のような使い方は避けます。

- 文字列のまま意味を推測させる
- `lucide:` プレフィックスを利用者側で直接書く
- `ui-icon` を空要素のまま意味付きで残す
- アイコンだけで必須情報を伝える

---

## コンテンツ側のアイコン

ノートや sidebar 由来のアイコン設定は、`src/data/notes.ts` で検証されます。

- 許可値は `IconName` または `none` です。
- `lucide:` プレフィックスはエラーになります。
- 設定がない場合は、継承結果または未指定として扱います。

このため、コンテンツ編集者は `src/icons/catalog.ts` にある bare name だけを使います。

---

## 実装上の境界

### 1. 直接 import の境界

`ui-icon` は登録層で定義された custom element です。

テストでは、`ui-icon` を直接 import する旧来の経路や、`src/lib/icons.ts` 系のレガシー runtime を残さないことを確認しています。

### 2. SSR の境界

`ui-icon` は component manifest 上で `ssr: none` として扱われます。

つまり、アイコンは SSR の主経路ではなく、クライアント側で登録・描画される前提です。

### 3. 生成資産の境界

`src/generated/lucide-subset.ts` は自動生成物です。

- 手編集しません
- カタログ変更後は生成をやり直します
- 生成結果はリポジトリに含めます

---

## 運用ルール

| 項目           | ルール                                             |
| -------------- | -------------------------------------------------- |
| 標準アイコン   | Lucide を使う                                      |
| 許可名         | `src/icons/catalog.ts` にある `IconName` を使う    |
| 利用部位       | 再利用する glyph は `ui-icon` に集約する           |
| 固定 glyph     | コンポーネント内に閉じるなら inline SVG を検討する |
| 装飾/意味      | 意味を持たせる場合は `aria-label` を与える         |
| コンテンツ設定 | bare name のみを受け付ける                         |
| 非表示         | 名前がないアイコンは描画しない                     |
| 生成物         | subset は自動生成で維持する                        |

---

## 既知の現状

README には技術ロゴとして Devicon / Simple Icons の記述がありますが、現行の実装ではそこへ接続する runtime はまだありません。

したがって、**現在の実装上の正規ルートは Lucide + `ui-icon` + 必要箇所の inline SVG** です。
