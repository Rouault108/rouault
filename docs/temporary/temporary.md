## 気になる点

### 1. build-time と runtime の境界がディレクトリ構造に十分反映されていません【高】

ここが現状の最大の構造問題です。

[事実]

* ルート直下 `lib/` に Markdown / rehype / remark / content navigation / SSR helper がある
* `src/lib/` に router / search / theme / toc がある
* `src/data/` に projection がある

この分け方自体に一定の意図はありますが、**名前だけでは ownership boundary が分かりにくい**です。
特に新規参加者や未来の自分にとって、`lib/` と `src/lib/` の差は直感的ではありません。

[分析]
長期保守性の観点では、少なくとも次のどちらかに寄せた方が良いです。

* **build-time 系を `build/` ないし `pipeline/` に明示分離する**
* あるいは `src/` 配下へ統合し、`src/build` / `src/runtime` / `src/content-pipeline` のように責務名で切る

現状の `lib/` と `src/lib/` の並立は、**知っている人には分かるが、構造として自己説明的ではない**です。

### 2. static-first と Web Components の二重経路がまだ高コストです【高】

これは現状の Rouault を象徴する問題です。

[事実]

* `lib/rehype/static-code-groups.ts`
* `src/assets/css/code-surfaces.css`
* `src/client/post-hydrate/code-block-enhancer.ts`
* `src/client/post-hydrate/code-group-enhancer.ts`
* `src/components/ui/codeblock/codeblock.ts`
* `src/components/ui/code-group/code-group.ts`

が並立しています。

[分析]
つまり現在は、**静的 HTML と Lit component が同一責務を別経路で共有している**状態です。
この方針自体は間違いではありません。むしろ no-JS baseline を重視するなら必要です。
ただし、現状の問題は **「静的経路が canonical なのか」「component 経路が canonical なのか」がまだ揺れていること**です。

率直に言うと、ここはまだ**実装が設計に従い切っていない**です。
長期保守性を本気で優先するなら、コードブロック系は次のどちらかに明確化すべきです。

* **静的 HTML を正本にし、Lit は enhancer に徹する**
* 逆に **Lit component を正本にし、SSR 出力はその厳密な写像に限定する**

今はその中間で、**二つの正本を保守している負債**が残っています。

### 3. Eleventy / layout 層では文字列組み立てが依然として強く、出力契約と escape 規約が分散しています【中〜高】

[事実]

* `src/layouts/BaseLayout.11ty.ts` は HTML 全体をテンプレート文字列で返しており、`escapeAttribute()` を自前で持ちながら、description、script src、attribute 値などを手で組み立てている
* `src/layouts/NoteLayout.11ty.ts` は `escapeAttr()`、`escapeHtml()`、`escapeJsonForScript()` を自前で持ち、pagefind メタ、genre filter、sidebar / toc 用 `application/json` script、各種 attribute を文字列構築している
* `src/index.11ty.ts`、`src/corpora.11ty.ts`、`src/corpora-index.11ty.ts`、`src/tags.11ty.ts`、`src/search.11ty.ts`、`src/lib/not-found-page.ts` でも、程度の差はあるがページや component bridge の出力を文字列組み立てで行っている
* 一方で SSR 変換層は完全に未整理というわけではなく、`src/ssr/target-definitions.ts`、`src/ssr/targets.ts`、`lib/ssr/html-transform.ts` により、対象タグ定義・変換本体・document style 注入点は一定程度分離されている
* ただし `src/ssr/server-entry.ts` には、`DOCUMENT_STYLE_DEFINITIONS`、light-element bridge、タグ別 SSR 分岐、属性直列化などの知識が依然として集中している

[分析]

問題は、単にテンプレート文字列を使っていること自体ではありません。  
本質的には、**出力文脈ごとの escape 規約と描画責務が複数ファイルへ分散していること**です。

現状の Rouault では、少なくとも次の文脈がファイルごとに個別処理されています。

* HTML attribute 値
* HTML 本文テキスト
* `script[type="application/json"]`
* JSON を属性へ埋め込む bridge
* pagefind 用メタデータ
* fallback markup / not-found markup

この状態は今すぐ破綻しているわけではありませんが、長期保守性の観点では、**メタデータや hydration contract が増えるたびに「どの文脈にどの escape を使うべきか」を局所判断し続ける構造**になっています。  
そのため、変更時の確認点が増えやすく、見落としにも弱いです。

また、元の記述では `server-entry.ts` をかなり未抽象化なモジュールとして捉えていましたが、現状はそこまで単純ではありません。  
SSR 側にはすでに target 定義と変換骨格の分離があり、問題は「SSR adapter registry がまだ存在しない」ことよりも、**既にある分離の上に special case 実装が `server-entry.ts` へ残存していること**だと見る方が正確です。

したがって、この問題は次のように整理して扱うのが良いです。

* **Eleventy / page / layout 層**  
  文字列組み立てと escape 規約の分散がまだ強く、変更耐性の主要な懸念がある
* **SSR 層**  
  骨格の分離は始まっているが、adapter 実装と document style 知識の集中がまだ残っている

長期保守性を本気で優先するなら、今後は「文字列組み立てを全面禁止する」よりも、少なくとも次の 2 点を進めた方が良いです。

* **出力文脈ごとの escape / serialization helper を正規化すること**
* **`server-entry.ts` に残っているタグ別 special case を、既存の target 定義系に沿ってさらに分離すること**

つまり現状の問題は、単純な「テンプレート文字列の多用」ではなく、**テンプレート文字列・escape・SSR bridge の責務が複数地点へ散っていること**です。

### 4. テストの一部が実装依存です【高】

これは明確に改善余地があります。

[事実]
`test/ssr/code-group-no-js-contract.test.ts` は、DOM や出力 HTML ではなく、`src/components/ui/code-group/code-group.ts` のソース文字列を `toContain(...)` で検証しています。

[分析]
これは**契約を固定しているように見えて、実際には実装表現を固定している**テストです。
長期保守性の観点では、こうしたテストはリファクタリング耐性を下げます。
契約として守りたいなら、**最終 HTML・shadow DOM・アクセシビリティ tree・no-JS fallback の観測結果**で固定すべきです。

Rouault のテスト文化自体は強いですが、**一部は「仕様テスト」ではなく「実装監視」になっている**ので、その峻別は必要です。

### 5. 文書量に対して、現実のコンテンツ量はまだ小さいです【高】

[事実]

* `docs/` は 80 ファイル超
* `content/*.md` は 28 ファイル
* その多くが `content/testing/` 以下の fixture です

[分析]
これは悪いことではありません。むしろ基盤先行の開発として自然です。
ただし現状は、**実コンテンツを読むための道具というより、読むための基盤を設計している段階**にまだ近いです。

率直に言うと、今の Rouault は
**「かなり優秀な基盤」 > 「実際に日常運用される読書アプリ」**
という重心です。

これ自体は戦略として成立しますが、今後どこかで**実ノート群での dogfooding を増やし、設計を実運用圧で削る段階**が必要です。

### 6. 文書体系は豊富ですが、維持コストも高いです【中〜高】

`docs/old/` が残り、現行文書にも「暫定」記述が多く、README でも「未整理」とされています。

[分析]
これは透明性としては良いのですが、長期的には
**文書が設計を支える** から
**文書の整合維持が設計負債になる**
へ反転しやすいです。

Rouault のような文書主導プロジェクトでは、今後は

* 正本
* 互換文書
* 履歴資料
* 検討メモ

をさらに明確に分離した方が良いです。

## 現在の Rouault を一言で言うと

**かなり優秀な「静的読書アプリ基盤」であり、同時にまだ「基盤設計そのもの」がプロジェクトの主要対象でもある**、という状態です。

もう少し踏み込んで言うと、

* **美意識は強い**
* **契約意識も強い**
* **安全性への配慮も強い**
* **ただし実装コストの高い境界がまだ残っている**
* **プロダクト完成度より、設計の整合性が主戦場になっている**

という講評になります。

私はこの方向性自体にはかなり好意的です。
ただし、長期保守性を本気で取りに行くなら、次の 3 点は早めに固定した方がよいです。

## 優先度順の提言

**第 1 優先**
**build-time / runtime / projection の ownership boundary をディレクトリ構造ごと再定義すること。**
`lib/` と `src/lib/` の曖昧さは、今のうちに消した方が良いです。

**第 2 優先**
**コードブロック系の canonical path を 1 本に定めること。**
静的経路を正本にするのか、component 経路を正本にするのかを明文化し、それ以外は adapter に落とすべきです。

**第 3 優先**
**契約テストと実装監視テストを分離すること。**
特にソース文字列監視型のテストは減らし、観測可能な出力契約へ寄せるべきです。

## 最終評価

**Rouault はかなり良いです。**
ただしそれは「もう完成している」という意味ではなく、**将来ちゃんと強いものになれる設計上の芯がすでにある**という意味です。

逆に言えば、今後の失敗パターンは明確です。
それは **このまま二重経路と文書負債を抱えたまま、局所修正で延命すること** です。

Rouault は、局所最適を積み上げるより、**大きく整理し直してでも ownership を揃える**方が向いています。
このプロジェクトは、その痛みに耐えるだけの基礎設計と思想をすでに持っています。

次に必要であれば、今回の講評をそのまま **「強み / 問題 / 改修優先度 / 対象ファイル」** の実装計画に落とします。
