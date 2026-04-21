# Markdown Overview

## 概要

本書は、Rouault における Markdown 変換系の全体方針、責務分担、規範文書の所在、および Source of Truth を示す overview です。

本書は overview であり、個別ディレクティブ属性、出力 DOM の詳細契約、安全規約の許可一覧、既知制約の詳細正本は本書に置きません。これらは後述の各正本文書が所有します。

---

## 1. 文書の目的

本書の目的は、Rouault における Markdown 変換系について次を固定することです。

- 変換系全体の設計原則
- remark 層と rehype 層の責務境界
- 実装上の Source of Truth
- authoring grammar、出力 DOM 契約、安全規約の ownership
- 規範源の優先順位
- 改訂時の基本ルール

---

## 2. 非目的

本書は次を目的としません。

- 個別ディレクティブの属性一覧を正本として保持すること
- インライン記法の完全仕様を本書で維持すること
- 出力 DOM の細部を本書で網羅すること
- 危険属性検査の許可・禁止一覧を本書で保持すること
- 実装メモや暫定運用メモを本書へ混在させること

---

## 3. 設計原則

### 3.1 CommonMark 優先

著者入力はできる限り CommonMark ベースに寄せます。Rouault 固有の UI は Markdown 本体へ暗黙に混ぜ込まず、明示的拡張として扱います。

### 3.2 明示的拡張

Rouault 固有の UI は独自ディレクティブにより導入します。著者入力が標準 Markdown か Rouault 独自構文かを曖昧にしてはなりません。

### 3.3 build-time normalization

最終出力は Rouault の Web Components および契約済み DOM へ build-time で正規化します。実行時に曖昧な解釈を残してはなりません。

### 3.4 build-time rejection

危険入力、契約違反入力、曖昧入力は build-time で拒否します。実行時裁量を増やす方向の設計は採用しません。

### 3.5 責務分離

authoring grammar、出力 DOM 契約、安全規約、テスト固定範囲は別文書として所有します。同一契約を複数文書へ重ねて正本化してはなりません。

### 3.6 契約優先

内部実装の都合で意味論を変えてはなりません。意味論変更は仕様改訂として扱い、正本文書を先に更新しなければなりません。

---

## 4. システム全体像

Rouault の Markdown 変換系は、大きく次の 2 層で構成します。

1. remark 層
   - 著者入力の制約付け
   - 独自構文の展開
   - authoring grammar の検証
2. rehype 層
   - 出力 DOM の正規化
   - Web Components への収束
   - 最終安全検査
   - 出力不変条件の保証

この分離により、「著者が何を書けるか」と「最終 DOM がどうでなければならないか」を切り分けます。

---

## 5. 実装上の Source of Truth

実装上の SoT は、`velite.config.ts` におけるプラグイン順序です。

1. `remarkMath`
2. `remarkGfm`
3. `remarkExpandExampleIncludes`
4. `remarkDisallowRawHtml`
5. `remarkRouaultDirectives`
6. `remarkLinkCards`
7. `remark-rehype`
8. `rehypeKatex`
9. `rehypeRouaultComponents`
10. `rehypeHeadingIds`
11. `rehypePreviewSandbox`
12. `rehypeShikiCodeBlocks`
13. `rehypeStaticCodeGroups`
14. `rehypeAnnotateLinkKinds`
15. `rehypeInlineCodeTranslateNo`
16. `rehypeOrderedListContracts`
17. `rehypeDisallowDangerousProps`

規則:

- authoring grammar に関わる意味論変更は、remark 層の正本と実装順序の双方を整合させなければなりません。
- 出力 DOM に関わる意味論変更は、rehype 層の正本と実装順序の双方を整合させなければなりません。
- 本文リンクの種別注釈は rehype 層で確定し、その詳細な出力属性契約は `docs/markdown/markdown-output-contract.md` を参照しなければなりません。
- 安全規約は後段検査へ押し込むだけでなく、可能なものは前段で早期拒否してよいものとします。
- 実装順序の変更は意味論変更を伴いうるため、単なるリファクタリングとして扱ってはなりません。

## 6. 文書群と ownership

Markdown 変換系に関する文書群の ownership は次のとおりとします。

| 文書                                                      | 役割                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `docs/markdown-overview.md`                               | 全体方針、責務分担、SoT、規範文書の所在を定義する overview      |
| `docs/markdown-authoring-specification.md`                | authoring grammar の正本                                        |
| `docs/markdown-output-contract.md`                        | 出力 DOM 契約の正本                                             |
| `docs/markdown-safety-and-test-policy.md`                 | safety policy、trust boundary、既知制約分類、test policy の正本 |
| `docs/markdown/translation-toc-static-first-migration.md` | breaking change の移行メモ。正本ではなく補助文書                |

規則:

- 著者入力として何を書けるかは `docs/markdown-authoring-specification.md` が所有します。
- 最終出力 DOM がどうでなければならないかは `docs/markdown-output-contract.md` が所有します。
- 危険入力、trust boundary、既知制約の分類、テスト固定範囲は `docs/markdown-safety-and-test-policy.md` が所有します。
- 本書は overview に留まり、詳細契約の正本になってはなりません。

---

## 7. 他文書との関係

Markdown 文書群は、Rouault の他仕様書と次の関係を持ちます。

| 文書                           | 関係                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `docs/foundations.md`          | 見た目やトークンの基礎契約を所有し、Markdown 文書は表示コンポーネントの存在を前提とする |
| `docs/accessibility.md`        | アクセシビリティ要求の正本を所有し、Markdown 出力コンポーネントはこれに従う             |
| `docs/router-specification.md` | ルーティングと URL の意味論を所有し、Markdown 文書はそれを再定義しない                  |
| `docs/search-specification.md` | 検索スニペットや `<mark>` の意味論を所有し、必要に応じて参照する                        |

規則:

- Markdown 文書群は UI 表示仕様、router URL 仕様、検索仕様を再定義してはなりません。
- 必要な場合は ownership を持つ文書を参照しなければなりません。
- 同一概念を複数文書が別意味で定義してはなりません。

---

## 8. 規範源の優先順位

Markdown 文書群における規範源の優先順位は次のとおりとします。

1. authoring grammar は `docs/markdown-authoring-specification.md` を正本とする
2. 出力 DOM 契約は `docs/markdown-output-contract.md` を正本とする
3. safety、trust boundary、既知制約分類、test policy は `docs/markdown-safety-and-test-policy.md` を正本とする
4. 本書の要約、図表、説明文は単独では規範ではない

同一概念について本書の記述と正本文書が衝突する場合、正本文書を優先しなければなりません。

---

## 9. 再掲の規則

- 同一契約を複数文書へ重ねて規範記述してはなりません。
- overview での再掲は、原則として節番号参照または要約に留めなければなりません。
- 例、図、説明文は正本文を上書きしてはなりません。
- 正本文書にない意味論を overview 側で先行導入してはなりません。

---

## 10. 改訂規則

- authoring grammar の意味論変更は `docs/markdown-authoring-specification.md` を直接改訂しなければなりません。
- 出力 DOM 契約の意味論変更は `docs/markdown-output-contract.md` を直接改訂しなければなりません。
- safety policy、trust boundary、既知制約分類、test policy の意味論変更は `docs/markdown-safety-and-test-policy.md` を直接改訂しなければなりません。
- 本書のみを更新して意味論変更を既成事実化してはなりません。
- 実装変更を先に行う場合でも、最終的には正本文書との整合を必須とします。

---

## 11. 保守上の判断基準

Markdown 文書群の保守では、次を優先します。

1. 短期互換より長期的明確性
2. 実装都合より ownership と責務分離
3. 実装メモの併記より正本章の明示
4. 暗黙挙動より build-time 契約
5. 実行時の救済より入力時の拒否

これに反する変更は、個別最適としてではなく仕様レベルの再検討として扱わなければなりません。
