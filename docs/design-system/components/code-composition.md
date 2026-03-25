# Code Composition

## 概要

本書は、`ui-code-block`、`ui-code-group`、`ui-code-preview` を組み合わせて用いる際の **合成契約・authoring 契約・運用契約** を定義します。

個別文書だけでは、各コンポーネントの責務は明確でも、次の論点が空白になりやすくなります。

- URL 同期を誰が担うか
- built-in controls の状態変化をどこで永続化するか
- Markdown / CMS / Storybook がどのような DOM を出力すべきか
- wrapper や余計な要素混在をどこで禁止するか
- 契約違反を CI で落とすのか、本番で退行させるのか

本書は、その空白を埋めるための上位契約です。

---

## 1. 適用範囲

本書は、次の事項を対象とします。

- 3 コンポーネントの正規組み合わせ
- authoring 規約
- URL 同期・永続化・分析イベントの責務分担
- 公開イベントの接続規約
- 共通 CSS トークン
- lint / CI / Storybook / 統合テスト規約
- 契約違反の重大度分類
- runtime 退行とビルド時検証の役割分担

一方で、本書は次の事項を扱いません。

- 各コンポーネント単体の詳細 API
- sandbox 実行や iframe 通信
- 実際の router 実装詳細
- 具体的な localStorage key 名
- 分析基盤やイベント収集ベンダー固有仕様

---

## 2. 位置付け

- `codeblock.md` は **単体コード片の基底契約**
- `code-group.md` は **複数コード片の比較契約**
- `code-preview.md` は **preview と code の複合表示契約**
- `code-composition.md` は **それらを実アプリへ接続する上位契約**

という分担に固定します。

### 契約

- 下位文書は上位文書の責務を吸収してはなりません。
- URL 同期や永続化の都合で、下位コンポーネントへ ad hoc な公開属性を追加してはなりません。
- authoring 上の都合で、下位コンポーネントの正規入力を文書外で曖昧にしてはなりません。

---

## 3. 正規組み合わせ

### 3.1 単体コード片

```html
<ui-code-block filename="button.ts" lang="ts">
  <pre><code>...</code></pre>
</ui-code-block>
```

#### 用途

- 単一コード片の提示
- 比較 UI を必要としない例示
- preview を伴わない本文

### 3.2 比較コード片

```html
<ui-code-group aria-label="実装比較">
  <ui-code-block group-key="react" tab-label="React" copy-label="React 版" lang="tsx">
    <pre><code>...</code></pre>
  </ui-code-block>
  <ui-code-block group-key="lit" tab-label="Lit" copy-label="Lit 版" lang="ts">
    <pre><code>...</code></pre>
  </ui-code-block>
</ui-code-group>
```

#### 用途

- 同一題材の複数実装比較
- ファイル名より比較軸が重要な場合

### 3.3 preview + 単体コード片

```html
<ui-code-preview heading="Button プレビュー" controls="theme viewport">
  <div slot="preview">...</div>
  <ui-code-block layout="inline" filename="button.ts" lang="ts">
    <pre><code>...</code></pre>
  </ui-code-block>
</ui-code-preview>
```

### 3.4 preview + 比較コード片

```html
<ui-code-preview heading="Button 実装比較" controls="theme surface viewport">
  <div slot="preview">...</div>
  <ui-code-group aria-label="Button 実装比較">
    <ui-code-block group-key="react" tab-label="React" copy-label="React 版" lang="tsx">
      <pre><code>...</code></pre>
    </ui-code-block>
    <ui-code-block group-key="lit" tab-label="Lit" copy-label="Lit 版" lang="ts">
      <pre><code>...</code></pre>
    </ui-code-block>
  </ui-code-group>
</ui-code-preview>
```

---

## 4. authoring 契約

### 4.1 直接子原則

- `ui-code-group` の比較対象は **host 直下の `ui-code-block`** とします。
- `ui-code-preview` の code root は **既定スロットの直接子** とします。
- Markdown 変換器、CMS、Storybook decorator は、この直接子原則を破ってはなりません。

#### 禁止例

```html
<ui-code-group>
  <div>
    <ui-code-block group-key="a">...</ui-code-block>
  </div>
</ui-code-group>
```

```html
<ui-code-preview>
  <div slot="preview">...</div>
  <div>
    <ui-code-block layout="inline">...</ui-code-block>
  </div>
</ui-code-preview>
```

### 4.2 無関係要素混在禁止

- `ui-code-group` の直下には、比較対象以外の要素を置いてはなりません。
- `ui-code-preview` の既定スロットには、code root 以外の要素を混在させてはなりません。
- 補助操作は `toolbar` に置きます。

### 4.3 `layout="inline"` の適用

- `ui-code-preview` 直下に置く `ui-code-block` は、authoring 上 `layout="inline"` を原則とします。
- これは runtime 必須条件ではないが、**lint 上は必須**とします。

### 4.4 明示ラベル原則

次の場合、`tabLabel` を明示しなければなりません。

- 比較軸が `filename` / `lang` では表現できない場合
- `filename` が人間向け比較ラベルに適さない場合
- 多言語比較やフレームワーク比較など、意味上の軸を強調したい場合

### 4.5 copy 文脈の明示

次の場合、`copyLabel` を明示しなければなりません。

- タブラベルと copy 文脈が異なる場合
- コピー後の通知やログに人間向け文脈が必要な場合

---

## 5. 責務分担

### 5.1 `ui-code-block`

担当する責務:

- コード本文の表示
- copy 値の取得
- コード片単体のメタデータ提示

担当しない責務:

- URL 同期
- preview controls 状態
- group の選択管理
- アプリ全体の永続化

### 5.2 `ui-code-group`

担当する責務:

- stable key による選択状態管理
- タブ UI の成立
- active item に応じた copy 文脈同期

担当しない責務:

- URL ルーティング
- localStorage 永続化
- preview controls 状態
- analytics 送信

### 5.3 `ui-code-preview`

担当する責務:

- preview 面と code 面の複合表示
- `preview--` による preview 面の状態表現
- built-in controls の UI 提供
- `ui-code-preview-state-change` による状態変化通知

担当しない責務:

- group 選択状態の所有
- URL ルーティング
- localStorage 永続化
- analytics 送信

### 5.4 上位オーケストレーション層

上位オーケストレーション層とは、ページコンテナ、ルートコンポーネント、記事レンダラー、または router と接続された管理層を指します。

担当する責務:

- URL 同期
- localStorage などへの永続化
- analytics 送信
- deep link 復元
- 初期状態の注入
- lint / CI の最終判断基準の運用

---

## 6. URL 同期・永続化契約

### 6.1 原則

- URL 同期は **上位オーケストレーション層のみ** が担います。
- `ui-code-group` と `ui-code-preview` は、URL 文字列や history API を直接扱ってはなりません。
- 永続化も同様に、コンポーネント内部責務へ含めません。

### 6.2 group 選択の同期

上位層は `ui-code-group-change` を購読し、必要に応じて次を行います。

- URL query / hash への反映
- 記事再訪時の初期選択復元
- analytics 送信

#### 推奨

- URL 上の値は `groupKey` と同値とします。
- index ベースの deep link は禁止します。

### 6.3 preview 状態の同期

上位層は `ui-code-preview-state-change` を購読し、必要に応じて次を行います。

- URL query / hash への反映
- preview surface / theme / viewport の復元
- analytics 送信

#### 推奨

- URL へ反映するのは `previewTheme`、`previewSurface`、`previewViewport` のみとします。
- `heading` や `controls` は URL 同期対象に含めません。

### 6.4 初期状態の注入

- 初期選択は `selectedValue` または `defaultSelectedValue` により `ui-code-group` へ注入します。
- preview 初期状態は `preview--` 属性により `ui-code-preview` へ注入します。
- URL 由来と永続化由来が競合する場合の優先順位は、アプリ全体方針で固定しなければなりません。

#### 推奨優先順位

1. URL
2. 明示的なサーバー出力
3. 永続化ストア
4. コンポーネント既定値

## 6.5 Client Delivery Contract

`ui-code-block`、`ui-code-group`、`ui-code-preview` を含むページを production 配信する場合、HTML は解決可能な client module entry を参照しなければなりません。

### 契約

- production HTML は `/src/-.ts`、`/src/-.tsx`、`/src/-.js` のようなソースパスを直接参照してはなりません。
- production HTML は、build 生成物として実在する client bundle を参照しなければなりません。
- No-JS 縮退と client bundle 配送失敗は別概念です。
- client bundle 配送失敗は runtime / build 契約違反であり、No-JS の許容退行として扱ってはなりません。
- CI は、`dist/**/*.html` に `/src/` module URL が残存しないことを検証しなければなりません。

---

## 7. イベント接続契約

### 7.1 group

```ts
groupEl.addEventListener('ui-code-group-change', (event) => {
  const { value, userInitiated } = event.detail;
  syncGroupSelectionToUrl(value);
  if (userInitiated) {
    emitAnalytics('code_group_changed', { value });
  }
});
```

### 7.2 preview

```ts
previewEl.addEventListener('ui-code-preview-state-change', (event) => {
  const { state, userInitiated } = event.detail;
  syncPreviewStateToUrl(state);
  if (userInitiated) {
    emitAnalytics('code_preview_state_changed', state);
  }
});
```

### 契約

- コンポーネントは analytics API を直接呼びません。
- URL 同期と analytics はイベント購読側の責務です。
- イベントの購読単位は、記事全体ではなく各コンポーネント単位であるべきです。

---

## 8. 共通 CSS トークン契約

共通トークンは、個別コンポーネント固有変数の乱立を防ぐために定義します。

### 8.1 共通トークン

- `--ui-code-surface-radius-top`
- `--ui-code-surface-radius-bottom`
- `--ui-code-surface-padding`
- `--ui-code-surface-breakout-width`
- `--ui-code-surface-breakout-margin`
- `--ui-code-header-display`
- `--ui-code-tablist-border`
- `--ui-code-panel-padding`
- `--ui-code-preview-divider-color`

### 契約

- まず共通トークンを優先し、どうしても足りない場合のみ個別コンポーネント変数を追加します。
- 共通トークンは視覚合成専用であり、意味状態ではありません。
- 共通トークンの追加・削除は、3 文書横断の変更として扱わなければなりません。

---

## 9. 契約違反の重大度分類

### 9.1 ビルド失敗にすべき違反

次は **CI で失敗** させます。

- `ui-code-group` 配下の `groupKey` 重複
- `ui-code-group` の直接子原則違反
- `ui-code-preview` の code root 直接子原則違反
- `ui-code-preview` の code root 複数
- `ui-code-preview` の canonical story における `preview` 面欠落
- `ui-code-group` / `ui-code-preview` の canonical story における無関係要素混在

### 9.2 警告でよい違反

次は **lint warning** とします。

- `ui-code-preview` 直下の `ui-code-block` に `layout="inline"` がない
- `tabLabel` 欠落だが `filename` / `lang` でフォールバック可能
- `copyLabel` 欠落
- `controls` に未知トークンがある

### 9.3 runtime 退行でよい違反

次は **runtime 退行** を許してよいです。

- `ui-code-preview` で片側面が欠落し、部分描画で情報保持できる場合
- `ui-code-group` で child が 1 件しかなく、単一表示へ退行する場合
- `copyable=false` により copy UI が disabled になる場合

---

## 10. テスト契約

### 10.1 Storybook

最低限、次の story 群を持ちます。

- `ui-code-block`: standalone / inline / copy disabled / forced colors / print
- `ui-code-group`: controlled / uncontrolled / duplicate key invalid / single item fallback
- `ui-code-preview`: block root / group root / controls combinations / partial render
- 合成 story: preview + group + external URL sync mock

### 10.2 統合テスト

最低限、次を自動テストします。

- `groupKey` による deep link 復元
- `ui-code-preview-state-change` からの URL 更新
- `ui-code-group-change` からの URL 更新
- URL からの初期状態注入
- child 再順序付け後の選択維持
- No-JS 時にコード本文が残ること
- production build 後の HTML が `/src/-.ts` を参照しないこと
- production build 後の HTML が build 生成済み client bundle を参照すること

### 10.3 snapshot 依存の禁止

- 内部 DOM 形状への過度な snapshot 依存は禁止します。
- テストは、公開属性、イベント、アクセシブルロール、本文の存在に依存すべきです。

---

## 11. 実装上の禁止事項

- `ui-code-preview` が子へ `embedded` を付与すること
- `ui-code-group` が `label` を解釈すること
- `ui-code-group` が index を stable key の代わりに使うこと
- URL 同期のために各コンポーネントへ router 依存を注入すること
- wrapper 越し child を「たまたま動く」ことに依存して本番投入すること
- 共通トークンではなく個別変数を無秩序に追加すること

---

## 12. 補足

本書の要点は次の 6 点です。

1. 3 コンポーネントの責務を維持したまま、実アプリの接続責務を上位層へ固定すること
2. URL 同期と永続化をコンポーネント内部へ押し込まないこと
3. authoring 規約を runtime 契約と切り分けて明文化すること
4. 重大違反・軽微違反・runtime 退行を明確に区別すること
5. 共通 CSS トークンにより視覚合成の散逸を防ぐこと
6. Storybook と統合テストで「静かな劣化」を早期検知すること

これにより、個別コンポーネントの文書だけでは取りこぼしていた実運用上の空白を埋め、長期保守性の高い code 系 UI 群として再構成できます。
