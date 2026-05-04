---
title: 'C#仕様読解と実装理解'
description: 'C#を言語仕様、CLI/.NET実行基盤、標準ライブラリ、ツールチェーン、設計資料・公式実装の層に分けて体系的に整理する。'
date: 2026-05-01
updated: 2026-05-04
genre:
  - C#
  - Programming
---

本ノート群は、C#を中・上級者向けに体系的に整理するための一連のノートである。基本構文の導入ではなく、言語仕様、CLI/.NET実行基盤、標準ライブラリ、ツールチェーン、設計資料・公式実装の関係を区別しながら、型、宣言、名前束縛、変換、評価、実行モデル、非同期、並行性、低水準制御、メタプログラミング、API設計、性能を扱う。

C#は単なる構文項目の集合ではなく、ソースコードを言語仕様上の意味規則として解釈し、コンパイラがILとメタデータへ変換し、.NET実行基盤とライブラリ群の上で実行される技術体系として読む必要がある。本ノート群ではこの層の違いを明示し、仕様上の事実、実装上の観察、設計上の含意、慣用的実践を混同しないことを基本方針とする。

## 対象読者

本ノート群はC#の基本構文を既知とし、次の事項を厳密に理解したい読者を対象とする。

- 型システム、名前束縛、変換、評価規則を仕様に沿って読みたい読者
- IL、メタデータ、CLR、JIT、AOT、トリミング（trimming）など、実行基盤との関係を把握したい読者
- ジェネリクス、null許容性（nullability）、非同期、並行性、`ref`、`Span<T>`、`unsafe`、相互運用を設計上の制約として理解したい読者
- 公開API設計、互換性、性能、アナライザ（Analyzer）、ソースジェネレーター（Source Generator）を含めてC#コードを読解したい読者

入門的な構文説明は最小限にとどめる。各章では定義、意味論、性能特性、実装上の観察点、設計上の含意、適用と限界を優先する。

## 記述方針

本ノート群では次の層を区別して扱う。

| 層 | 主な対象 | 読み方 |
| --- | --- | --- |
| 言語仕様 | 構文、型付け、名前束縛、変換、評価、確実な代入 | C#プログラムの適格性と意味を定める規範として読む |
| CLI/.NET実行基盤 | IL、メタデータ、アセンブリ、CLR、JIT、GC、AOT | コンパイル結果と実行時挙動を観察する基盤として読む |
| 標準ライブラリ | `object`、`string`、コレクション、LINQ、Task、Span、リフレクション（Reflection） | 言語機能と結び付くAPI集合として読む |
| ツールチェーン | SDK、MSBuild、Roslyn、アナライザ（Analyzer）、ソースジェネレーター（Source Generator） | ビルド文脈、診断、生成コード、再現性を決める環境として読む |
| 設計資料・公式実装 | csharplang、機能仕様（feature specifications）、Roslyn、dotnet/runtime | 標準化前後の機能差、実装先行の挙動、設計判断を追う資料として読む |

本文は安定機能を中心に構成する。新機能は必要に応じて節末の補足で扱い、プレビュー機能、仕様未確定機能、実装先行の事項は本文の主系列から分離する。言語バージョン差、TFM差、SDK差が結論に影響する場合は、それぞれを別の軸として明示する。

## 読み方

最初に第I部を読み、C#を言語仕様、コンパイル、実行基盤、ビルド文脈の関係から位置付ける。その後第II部で宣言構造と型システムの基礎を確認し、第III部で名前束縛、型推論、変換、式、制御フロー、パターンマッチングへ進む。非同期、並行性、低水準制御、メタプログラミング、API設計、性能は、必要な章を参照しながら読める構成とする。

既存の各章は、独立した参照ページとしても読める。ただし、型、束縛、変換、評価、実行基盤は相互に依存するため、厳密に読む場合は章番号順に追うのが望ましい。

## 作成済みノート

現時点で作成済みのノートは次のとおりである。

| 章 | ノート | 位置付け |
| --- | --- | --- |
| 第1章 | [C#とは何か](./csharp/what-is-csharp.md) | C#を言語仕様と.NET実行基盤の両面から位置付ける |
| 第2章 | [ソースコードから実行まで](./csharp/source-code-to-execution.md) | ソースコード、コンパイル単位、アセンブリ、IL、メタデータ、CLRの関係を整理する |
| 第3章 | [言語バージョン・ビルド文脈・互換性](./csharp/language-version-build-context-compatibility.md) | `LangVersion`、TFM、SDK、前処理ディレクティブ、nullable文脈を整理する |
| 第4章 | [宣言、修飾子、メンバー分類](./csharp/declarations-modifiers-members.md) | 宣言空間、型宣言、メンバー宣言、アクセシビリティ、修飾子、partialを整理する |
| 第5章 | [型の全体像](./csharp/types-overview.md) | 値型、参照型、型パラメーター、ポインター型、`dynamic`、null許容参照型注釈を概観する |
| 第6章 | [値型](./csharp/value-types.md) | 組み込み値型、列挙型、構造体、record struct、null許容値型、boxingとコピーを整理する |

## 参照上の注意

本ノート群では個別の章で必要に応じて一次情報を脚注に示す。入口ページである本ページでは、各章への導線と読み方を示すことを目的とし、詳細な根拠、規格番号、仕様節、実装リポジトリ、設計資料は各章に分散して記載する。

観察環境、表記規約、一次情報への導線、診断メッセージの読み方は、詳細目次の付録で扱う。

## 詳細目次

以下は参照用の詳細目次である。通常の読解では作成済みノート一覧から各章へ進み、全体の章立てや未作成章の位置付けを確認する場合に本節を参照する。対象読者、記述方針、読み方、参照上の注意は本ページ冒頭にまとめ、詳細目次では各部・各章・各節の構成を示す。作成済みの章には既存ノートへのリンクを付け、未作成の章は表題のみを示す。

### 第I部　C#の位置付けと実行基盤

#### 第1章　[C#とは何か](./csharp/what-is-csharp.md)

- **1.1 C#を「言語」として見る**
  - 言語設計の目的
  - オブジェクト指向言語としての系譜
  - 関数型・宣言的要素の導入
  - 現代C#の特徴
  - 構文集合ではなく意味規則として見る視点

- **1.2 C#を「.NET上の言語」として見る**
  - C#と.NETの関係
  - CLR / CLI / .NETライブラリ群の区別
  - C#と他のCLI言語
  - 言語仕様と実行基盤の境界
  - 言語機能とライブラリ機能の境界

- **1.3 標準化と実装**
  - ECMA-334の役割
  - ECMA-335の役割
  - Microsoft実装との関係
  - 標準化の時点差と実装先行
  - 仕様準拠と実装依存の見分け方
  - Microsoft Learn、csharplang、Roslynの位置付け

- **1.4 本ノート群の立場**
  - 基本文法を圧縮して扱う理由
  - 型・束縛・変換・評価を中核に置く理由
  - 仕様・実装・ライブラリを混同しないための視点
  - 設計指針と仕様事実を分ける方針

---

#### 第2章　[ソースコードから実行まで](./csharp/source-code-to-execution.md)

- **2.1 コンパイルの全体像**
  - 字句解析
  - 構文解析
  - 意味解析
  - ILとメタデータの生成
  - 実行基盤への受け渡し
  - コンパイル時エラーと警告

- **2.2 コンパイル単位とプロジェクト**
  - ソースファイル
  - コンパイル単位
  - 名前空間
  - partial宣言
  - アセンブリ
  - 参照解決

- **2.3 実行ファイルの構造**
  - アセンブリマニフェスト
  - メタデータテーブル
  - ILの位置付け
  - PDBの役割
  - デバッグ情報と実行意味論の区別

- **2.4 ツールチェーン**
  - SDKスタイルプロジェクト
  - `dotnet build`
  - Roslynコンパイラ
  - ILDASM / ILSpy等の位置付け
  - 観察ツールと仕様根拠の区別

- **2.5 最小プログラムの分解**
  - トップレベルステートメント
  - 暗黙の`Program`
  - エントリポイント
  - ファイルベースアプリ（.NET SDK機能との接点）
  - ビルド成果物の観察

---

#### 第3章　[言語バージョン・ビルド文脈・互換性](./csharp/language-version-build-context-compatibility.md)

- **3.1 `LangVersion`の意味**
  - `LangVersion`未指定時の言語バージョン
  - TFMから決まる既定値
  - `default`指定
  - `latest`
  - `latestMajor`
  - `preview`
  - `latest`を原則使わない理由
  - 明示固定の意義
  - 再現性と移植性
  - サポート外構成の危険

- **3.2 TFMと言語機能**
  - TFMによる既定言語バージョン
  - 言語機能とランタイム要求
  - 標準ライブラリ依存
  - 未サポート構成の問題
  - 言語だけでは成立しない機能

- **3.3 前処理ディレクティブとビルド文脈**
  - `#if` / `#elif` / `#endif`
  - `#define` / `#undef`
  - `#error` / `#warning`
  - `#line`
  - `#pragma warning`
  - ファイルベースアプリ向けディレクティブ（C# 14）
  - .NET SDK実行モデルとの関係
  - 生成コードとの関係

- **3.4 null許容文脈と警告文脈**
  - `#nullable`
  - enable / disable / restore
  - プロジェクト設定との関係
  - 警告制御の原則
  - 警告抑制と契約表現の区別

- **3.5 バージョン史の読み方**
  - C# 1〜7の基礎的変化
  - C# 8以降の転換点
  - nullable / records / patterns / async以後
  - C# 13〜14の位置付け
  - C# 15以降のプレビュー機能の扱い
  - 安定機能とプレビュー機能の区別

- **3.6 本ノート群のバージョン方針**
  - 既定の観察対象
  - バージョン差の表記規則
  - プレビュー機能の扱い
  - `LangVersion`指定の方針
  - 互換性議論の三層区分

---

### 第II部　宣言構造と型システム

#### 第4章　[宣言、修飾子、メンバー分類](./csharp/declarations-modifiers-members.md)

- **4.1 宣言空間**
  - 宣言空間の意味
  - コンパイル単位
  - 名前空間宣言
  - 型宣言
  - メンバー宣言
  - ローカル宣言

- **4.2 名前空間と型宣言**
  - namespace宣言
  - file-scoped namespace
  - class
  - struct
  - interface
  - enum
  - delegate
  - record
  - file-local type

- **4.3 メンバー宣言**
  - フィールド
  - 定数
  - メソッド
  - コンストラクター
  - ファイナライザー
  - プロパティ
  - インデクサ
  - イベント
  - 演算子
  - 入れ子型

- **4.4 アクセシビリティ**
  - `public`
  - `protected`
  - `internal`
  - `private`
  - `protected internal`
  - `private protected`
  - アクセシビリティとAPI表面
  - アクセシビリティと継承可能性

- **4.5 修飾子の体系**
  - `static`
  - `abstract`
  - `virtual`
  - `override`
  - `sealed`
  - `new`
  - `readonly`
  - `const`
  - `required`
  - `init`
  - `extern`
  - `unsafe`
  - 修飾子の併用制約

- **4.6 partialと生成コード**
  - partial type
  - partial method
  - partial property
  - partial event（C# 14）
  - partial constructor（C# 14）
  - Source Generatorとの関係
  - 手書きコードと生成コードの境界

---

#### 第5章　[型の全体像](./csharp/types-overview.md)

- **5.1 型とは何か**
  - 値の集合としての型
  - 操作可能性としての型
  - 静的型付けの意味
  - 契約としての型
  - 型と仕様上の制約

- **5.2 C#における型分類**
  - 値型
  - 参照型
  - 型パラメーター
  - ポインター型
  - 関数ポインター型
  - `dynamic`
  - null許容参照型注釈（nullable reference type annotation）

- **5.3 特殊な型構成**
  - 配列型
  - タプル型
  - 匿名型
  - デリゲート型
  - null許容値型（nullable value type）
  - null許容参照型注釈（nullable reference type annotation）
  - 構築型（constructed type）
  - 開いた型と閉じた型

- **5.4 型と変数**
  - 変数の型
  - 式の型
  - 静的型と実行時型
  - 型と記憶域
  - 型と値カテゴリ

- **5.5 型と同一性**
  - 型同一性
  - 等値性
  - 代入可能性
  - 表現
  - ランタイム型情報

- **5.6 既定値と初期化**
  - default value
  - definite assignment
  - フィールド初期化
  - ローカル変数との違い
  - `default`式と`default`リテラル

---

#### 第6章　[値型](./csharp/value-types.md)

- **6.1 組み込み値型**
  - 整数型
  - 浮動小数点型
  - `decimal`
  - `bool`
  - `char`
  - checked / unchecked文脈

- **6.2 列挙型**
  - 基底型
  - 列挙定数
  - フラグ列挙
  - 変換と注意点
  - 未定義値の扱い

- **6.3 構造体**
  - `struct`
  - コピー意味論
  - 不変設計
  - 自動実装メンバー
  - `readonly struct`
  - parameterless constructor

- **6.4 `record struct`**
  - 値としての等値性
  - 合成メンバー
  - 通常の`struct`との違い
  - 適用場面
  - mutable record structの注意点

- **6.5 null許容値型**
  - `T?`のモデル
  - `HasValue` / `Value`
  - lifted operators
  - boxingとの関係
  - pattern matchingとの関係

- **6.6 値型のコストモデル**
  - コピー
  - boxing
  - 一時値
  - defensive copy
  - ジェネリクスとの関係
  - API設計上の注意

---

#### 第7章　参照型

- **7.1 参照型の基本**
  - 参照の意味
  - オブジェクト同一性
  - `null`
  - ヒープ上の概念図
  - 参照のコピーとオブジェクトの共有

- **7.2 クラス**
  - 型定義
  - メンバー
  - アクセス修飾
  - インスタンス領域と静的領域
  - 継承可能性

- **7.3 配列**
  - 単一次元配列
  - 多次元配列
  - ジャグ配列
  - 配列共変性
  - 境界チェック
  - 配列とspanの接続

- **7.4 `string`**
  - 不変性
  - intern
  - 文字列連結
  - 書式化と補間
  - `ReadOnlySpan<char>`との関係

- **7.5 `object`と共通基盤**
  - すべての型との関係
  - `ToString`
  - `Equals`
  - `GetHashCode`
  - `GetType`
  - ランタイム型情報との接続

- **7.6 `record class`**
  - 参照型としての値的等値性
  - 合成メンバー
  - 継承との関係
  - 永続データ構造との相性
  - `with`式

---

#### 第8章　継承・インターフェイス・サブタイピング

- **8.1 サブタイピング**
  - 継承と部分型
  - 代入可能性
  - 実行時多相
  - 静的型と実行時型の分離

- **8.2 クラス継承**
  - 単一継承
  - 仮想メソッド
  - override / new
  - base呼び出し
  - sealedによる制約

- **8.3 抽象型と設計契約**
  - `abstract`
  - 抽象メンバー
  - template method的設計
  - 派生先の責務
  - 継承を公開APIに含める意味

- **8.4 インターフェイス**
  - 複数実装
  - 明示的インターフェイス実装
  - 既定実装を持つインターフェイスメンバー
  - 静的抽象メンバー
  - インターフェイス継承

- **8.5 ジェネリック数値演算への接続**
  - 静的抽象メンバーの用途
  - 数値抽象化
  - 汎用演算の設計
  - 制約設計の要点

- **8.6 varianceの導入**
  - 共変
  - 反変
  - どこで成立するか
  - インターフェイスとデリゲート
  - 配列共変との違い

---

#### 第9章　ジェネリクス

- **9.1 ジェネリクスの意味**
  - 再利用
  - 型安全
  - パフォーマンス
  - 実体化されたジェネリクス
  - C++テンプレートやJavaジェネリクスとの概念的差異

- **9.2 型パラメーターと制約**
  - `where`
  - `class` / `struct`
  - `class?`
  - `notnull`
  - `unmanaged`
  - `new()`
  - 基底型制約
  - インターフェイス制約
  - `default`制約
  - `allows ref struct`制約

- **9.3 ジェネリック型**
  - 開いた型
  - 閉じた型
  - 構築型（constructed type）
  - 入れ子のジェネリック型
  - 型引数と型パラメーターの区別

- **9.4 ジェネリックメソッド**
  - 型推論
  - オーバーロード解決との相互作用
  - 明示型引数
  - 制約検査
  - 戻り値型が推論に与えない影響

- **9.5 varianceとジェネリクス**
  - `IEnumerable<out T>`
  - `IComparer<in T>`
  - デリゲートのvariance
  - 配列共変との比較
  - API設計上の効用

- **9.6 実行時のジェネリクス**
  - メタデータ上の表現
  - リフレクションでの観察
  - 実体化とコード共有
  - 値型特殊化
  - boxing回避との関係

---

#### 第10章　nullabilityと型注釈

- **10.1 null許容参照型の設計意図**
  - `null`参照問題
  - 後方互換性
  - 注釈と警告の二層構造
  - 型システムそのものではなく静的解析としての側面

- **10.2 null状態解析（null-state analysis）**
  - maybe-null
  - not-null
  - フロー解析
  - 分岐後の状態更新
  - definite assignmentとの関係

- **10.3 注釈と演算子**
  - `string`と`string?`
  - `!`
  - `?`
  - `?.`
  - `??`
  - `??=`
  - `var`とnullability

- **10.4 API設計と属性**
  - `NotNull`
  - `MaybeNull`
  - `AllowNull`
  - `DisallowNull`
  - `NotNullWhen`
  - `MaybeNullWhen`
  - `MemberNotNull`
  - 契約の表現

- **10.5 既存コードの移行**
  - enable文脈
  - 段階的導入
  - public APIから始める戦略
  - 警告抑制の原則
  - ライブラリ境界での注意

---

### 第III部　名前束縛・型推論・変換・評価

#### 第11章　名前、スコープ、束縛

- **11.1 名前探索の基本**
  - 宣言空間
  - スコープ
  - シャドーイング
  - 曖昧性
  - 単純名と修飾名

- **11.2 namespaceとusing**
  - namespace宣言
  - file-scoped namespace
  - `using`
  - `global using`
  - alias
  - static using

- **11.3 メンバー探索**
  - インスタンスメンバー
  - 静的メンバー
  - 継承チェーン上の探索
  - 隠蔽
  - 明示的インターフェイス実装の探索

- **11.4 拡張メソッドと拡張メンバー**
  - 構文糖衣としての理解
  - 候補集合への入り方
  - 通常メソッドとの優先順位
  - 拡張プロパティと静的拡張メンバー（C# 14）
  - 拡張メンバーとしてのユーザー定義演算子（C# 14）
  - 設計上の注意
  - 新しい拡張記法（C# 14）との関係

- **11.5 束縛結果の読み方**
  - 値への束縛
  - 型への束縛
  - namespaceへの束縛
  - メソッドグループへの束縛
  - anonymous functionへの束縛
  - 診断の読み方

---

#### 第12章　オーバーロード解決と型推論

- **12.1 オーバーロード解決の全体像**
  - 候補集合
  - 適用可能性
  - better function member
  - tie-breaker
  - 診断の読み方

- **12.2 引数とパラメーター**
  - 値引数
  - `ref` / `out` / `in`
  - optional arguments
  - named arguments
  - `params`
  - extension receiver

- **12.3 型推論**
  - ジェネリックメソッドの型推論
  - 入力型推論
  - 出力型推論
  - 明示型引数
  - ラムダ式との相互作用

- **12.4 target-typed文脈**
  - target-typed `new`
  - target-typed conditional expression
  - target-typed lambda
  - `default`リテラル
  - collection expressionとの関係

- **12.5 ラムダとメソッドグループの変換**
  - delegate変換
  - expression tree変換
  - natural type
  - 戻り値型推論
  - 修飾子付きラムダパラメーター（C# 14）

- **12.6 設計上の注意**
  - 曖昧なオーバーロード
  - `null`リテラルと多重候補
  - optional argumentsの互換性問題
  - 拡張メソッドによる予期しない候補
  - API進化とオーバーロード追加

---

#### 第13章　変換と動的束縛

- **13.1 変換の体系**
  - identity conversion
  - implicit conversion
  - explicit conversion
  - standard conversion
  - user-defined conversion
  - conversionとcastの区別

- **13.2 数値変換**
  - widening
  - narrowing
  - 定数式変換
  - checked / unchecked
  - 丸めと桁落ち

- **13.3 参照変換**
  - upcast
  - downcast
  - `as`
  - `is`
  - 実行時型検査
  - インターフェイス変換

- **13.4 boxing / unboxing**
  - 変換規則としての位置付け
  - 値型と`object`
  - インターフェイスへのboxing
  - null許容値型とboxing
  - boxing回避の観点

- **13.5 `dynamic`と動的束縛**
  - 静的束縛との差
  - 実行時バインダー
  - COMやスクリプトとの親和性
  - 実行時例外
  - 乱用の危険

- **13.6 ユーザー定義変換**
  - 設計原則
  - 明示と暗黙の使い分け
  - 演算子との関係
  - 等値性との整合
  - 乱用の危険

- **13.7 span関連変換（C# 14）**
  - 配列から`Span<T>`への変換
  - 配列から`ReadOnlySpan<T>`への変換
  - `Span<T>`から`ReadOnlySpan<T>`への変換
  - 文字列と`ReadOnlySpan<char>`の関係
  - オーバーロード解決への影響

---

#### 第14章　式と評価

- **14.1 式の分類**
  - 値
  - 変数
  - namespace
  - type
  - method group
  - anonymous function
  - property accessとfield access

- **14.2 評価順序**
  - 左から右
  - 副作用
  - 一時値
  - 短絡評価
  - 例外発生位置

- **14.3 演算子**
  - 算術
  - 比較
  - 論理
  - ビット
  - 条件演算子
  - null関連演算子
  - ユーザー定義演算子

- **14.4 代入**
  - 単純代入
  - 複合代入
  - null条件付き代入（C# 14）
  - deconstruction
  - tuple assignment
  - ref assignment

- **14.5 呼び出し式**
  - 引数評価
  - オーバーロード解決との接続
  - optional / named arguments
  - `params`
  - extension invocation
  - 仮想呼び出し

- **14.6 型関連式**
  - `typeof`
  - `nameof`
  - 非束縛ジェネリック型に対する`nameof`（C# 14）
  - `sizeof`
  - `default`
  - `checked`
  - `unchecked`
  - `stackalloc`

- **14.7 オブジェクト生成と初期化**
  - object creation expression
  - target-typed `new`
  - object initializer
  - collection initializer
  - collection expression
  - anonymous object creation

- **14.8 タプルと分解**
  - tuple expression
  - tuple type
  - tuple element name
  - deconstruction
  - discard
  - API設計上の注意

- **14.9 補間文字列と定数式**
  - 補間の評価
  - interpolated string handler
  - 生文字列リテラル
  - UTF-8文字列リテラル
  - 定数式の限界

---

#### 第15章　文と制御フロー

- **15.1 ブロックとローカル変数**
  - 宣言文
  - ライフタイム
  - definite assignment
  - スコープの罠
  - local constant

- **15.2 分岐**
  - `if`
  - `switch`
  - switch expression
  - 到達不能コード
  - exhaustivenessと診断

- **15.3 反復**
  - `while`
  - `do`
  - `for`
  - `foreach`
  - 列挙子パターン
  - await foreach

- **15.4 ジャンプ**
  - `break`
  - `continue`
  - `goto`
  - `return`
  - `throw`
  - finallyとの相互作用

- **15.5 資源管理構文**
  - `using`
  - using declaration
  - `await using`
  - 展開形
  - 例外との関係
  - スコープ管理

- **15.6 同期構文**
  - `lock`
  - 展開形
  - 排他の意味
  - 可視性と設計上の注意
  - Monitorとの関係

- **15.7 反復子**
  - `yield return`
  - `yield break`
  - 列挙状態機械
  - 同期ストリーム
  - 非同期ストリームとの橋渡し

---

#### 第16章　パターンマッチング

- **16.1 パターンの基本概念**
  - パターン適用可能性
  - マッチ成功条件
  - 型検査との違い
  - パターン変数
  - フロー解析との接続

- **16.2 基本パターン**
  - declaration pattern
  - type pattern
  - constant pattern
  - var pattern
  - discard pattern
  - parenthesized pattern

- **16.3 再帰パターン**
  - positional pattern
  - property pattern
  - list pattern
  - slice pattern
  - nested pattern

- **16.4 論理パターン**
  - `and`
  - `or`
  - `not`
  - 優先順位と括弧
  - null判定との関係

- **16.5 relational pattern**
  - 範囲判定
  - guardとの比較
  - 診断精度
  - 定数式との関係

- **16.6 設計実務**
  - discriminated union的設計との相性
  - recordsとの親和性
  - visitor patternとの比較
  - 過剰パターン化の回避

---

### 第IV部　抽象化、制御、非同期・並行性

#### 第17章　メンバー意味論と型設計

- **17.1 フィールド・定数・読み取り専用性**
  - フィールド
  - `const`
  - `readonly`
  - `static readonly`
  - 表現公開の問題
  - immutable objectとの関係

- **17.2 プロパティ・インデクサ・初期化**
  - 自動実装プロパティ
  - `init`
  - `required`
  - object initializer
  - collection initializer
  - インデクサ設計
  - field-backed propertyと`field`キーワード（C# 14）

- **17.3 メソッド**
  - シグネチャ
  - オーバーロード
  - 仮想ディスパッチ
  - optional / named arguments
  - extension methodとの比較

- **17.4 コンストラクターと初期化順序**
  - インスタンスコンストラクター
  - `this(...)`
  - `base(...)`
  - static constructor
  - 初期化順序
  - primary constructors
  - partial constructors（C# 14）

- **17.5 演算子・変換演算子・等値性**
  - 演算子オーバーロード
  - 変換演算子
  - ユーザー定義複合代入演算子（C# 14）
  - `==` / `Equals` / `GetHashCode`
  - 比較可能性
  - 等値性契約
  - recordとの関係

- **17.6 型設計上の含意**
  - `class` / `struct` / `record`の選択
  - 継承を許す設計と閉じる設計
  - 不変性
  - 公開メンバーの最小化
  - バイナリ互換性との関係

---

#### 第18章　デリゲート、イベント、ラムダ、ローカル関数、式木

- **18.1 デリゲート**
  - 型としてのデリゲート
  - 呼び出しリスト
  - 例外伝播
  - 単一呼び出しと多重呼び出し
  - variance

- **18.2 イベント**
  - `event`の意味
  - add/removeアクセサ
  - 発火側と購読側
  - メモリリークの注意点
  - partial event（C# 14）

- **18.3 ラムダ式**
  - 型推論
  - キャプチャ
  - クロージャ
  - 割り当てコスト
  - static lambda
  - natural type
  - 修飾子付きラムダパラメーター（C# 14）

- **18.4 ローカル関数**
  - ラムダとの比較
  - 再帰
  - 生成コードの差
  - API表面積の制御
  - iterator / asyncとの関係

- **18.5 式木**
  - `Expression<TDelegate>`
  - 式として表現できる範囲
  - delegateとの違い
  - クエリ変換との接点
  - プロバイダー実装との関係

---

#### 第19章　例外と失敗のモデル

- **19.1 例外の基礎**
  - 例外とは何か
  - 失敗の伝播
  - 例外安全性
  - 例外と戻り値の役割分担
  - 制御フローとしての例外

- **19.2 `try` / `catch` / `finally`**
  - 制御遷移
  - フィルター
  - 再送出
  - finallyの保証
  - usingとの関係

- **19.3 リソース管理**
  - `IDisposable`
  - `IAsyncDisposable`
  - `using`
  - `await using`
  - 失敗時の後始末
  - 所有権とライフタイム

- **19.4 設計指針**
  - 例外型の階層
  - 契約違反と業務例外
  - パフォーマンスとの兼ね合い
  - ロギングとの関係
  - public APIでの例外契約

---

#### 第20章　非同期プログラミング

- **20.1 `async` / `await`の意味論**
  - 状態機械への変換
  - `await`の中断点
  - 継続
  - 同期コード様の記述との関係
  - 例外伝播

- **20.2 `Task` / `Task<T>` / `ValueTask<T>`**
  - 返り値型の選択
  - ホットタスクとコールドタスク
  - 割り当てコスト
  - `ValueTask<T>`の制約
  - 誤用しやすい点

- **20.3 例外とキャンセル**
  - 非同期例外
  - `CancellationToken`
  - タイムアウト
  - 合成時の注意
  - キャンセルと失敗の区別

- **20.4 並行実行**
  - `WhenAll`
  - `WhenAny`
  - 順次awaitとの違い
  - バックプレッシャの基本
  - fire-and-forgetの危険

- **20.5 非同期ストリーム**
  - `IAsyncEnumerable<T>`
  - `await foreach`
  - pushとpull
  - 同期反復子との比較
  - キャンセルの伝播

- **20.6 実務設計**
  - API命名
  - 同期版との併存
  - コンテキスト捕捉
  - デッドロック回避の基本
  - ライブラリコードでの設計原則

---

#### 第21章　並行性とメモリ可視性

- **21.1 並行性を三層に分けて読む**
  - C#構文としての`lock`、`volatile`、`await`
  - .NET標準ライブラリとしての`Task`、`Monitor`、`Interlocked`
  - 実行基盤としてのスレッド、スケジューリング、メモリ可視性
  - 仕様上の保証と実装上の観察を分ける視点

- **21.2 並行性の基本モデル**
  - threadとtaskの区別
  - concurrencyとparallelismの区別
  - 共有状態
  - race condition
  - data race的問題

- **21.3 排他制御**
  - `lock`
  - `Monitor`
  - reentrancy
  - lock対象の選択
  - deadlock
  - lock順序

- **21.4 メモリ可視性**
  - 共有メモリ
  - 可視性
  - 再順序化
  - `volatile`
  - memory barrier
  - `Interlocked`

- **21.5 スレッドセーフAPI設計**
  - immutable object
  - defensive copy
  - concurrent collection
  - lock-free設計の限界
  - public APIでのスレッドセーフ性の明示

- **21.6 非同期との関係**
  - asyncは並列実行そのものではない
  - `SynchronizationContext`
  - `TaskScheduler`
  - async lockの設計
  - channel / producer-consumerの基本

- **21.7 非同期・並行・並列のAPI境界**
  - CPU-boundとI/O-bound
  - `Task.Run`の位置付け
  - Parallel
  - PLINQ
  - Channel
  - async enumerableとの関係
  - cancellationとbackpressure

---

### 第V部　低水準制御とメモリ

#### 第22章　`ref`、`in`、`out`、byrefの世界

- **22.1 パラメーター受け渡しの実態**
  - 値渡し
  - 参照渡し
  - aliasing
  - 可変性
  - 呼び出し側と呼び出し先の責務

- **22.2 `ref` / `out` / `in`**
  - 意味の違い
  - 呼び出し規約
  - API設計上の選択
  - 可読性とのトレードオフ
  - definite assignmentとの関係

- **22.3 ref locals / ref returns**
  - 参照変数
  - 寿命制約
  - 安全性
  - 性能との関係
  - 返してよい参照と返してはいけない参照

- **22.4 条件付きrefとref代入**
  - 条件式でのbyref
  - aliasの切り替え
  - 典型例
  - 危険な書き方
  - 可読性の限界

- **22.5 `ref struct`**
  - stack-only制約
  - `Span<T>`の背景
  - escape analysis的理解
  - 制限事項
  - インターフェイス実装
  - `allows ref struct`制約

- **22.6 `scoped`と寿命制約**
  - `scoped` parameter
  - `scoped ref`
  - escape scope
  - API契約としての寿命制約
  - コンパイラ診断の読み方

---

#### 第23章　メモリ表現と高性能データアクセス

- **23.1 配列・スライス・連続領域**
  - `T[]`
  - `ArraySegment<T>`
  - `Span<T>`
  - `ReadOnlySpan<T>`
  - `Memory<T>`
  - `ReadOnlyMemory<T>`

- **23.2 `Span<T>`と`ReadOnlySpan<T>`**
  - byref-like型
  - slicing
  - 文字列処理
  - 一時領域の効率化
  - 暗黙変換（C# 14）
  - API設計での使いどころ

- **23.3 `stackalloc`**
  - スタック確保
  - 安全な使い方
  - spanとの連携
  - ヒープ回避
  - サイズ上限と実務上の判断

- **23.4 `Memory<T>`とasync**
  - spanを保持できない理由
  - ヒープ上に保持できる代替
  - パイプライン処理
  - 所有権と貸し出し
  - 非同期APIでの選択

- **23.5 性能測定の視点**
  - 割り当て
  - コピー
  - boxing
  - 境界チェック
  - JIT最適化
  - ベンチマークの注意

---

#### 第24章　unsafeと相互運用

- **24.1 unsafe文脈**
  - `unsafe`
  - ポインター型
  - 検証可能性
  - 使用要件
  - 安全なコードとの境界

- **24.2 ポインター操作**
  - アドレス取得
  - 間接参照
  - ポインター算術
  - `fixed`
  - GCとの関係

- **24.3 関数ポインター**
  - delegateとの違い
  - 呼び出し規約
  - 低オーバーヘッド設計
  - unmanaged呼び出し
  - API境界での注意

- **24.4 ネイティブ相互運用**
  - P/Invokeの基本
  - marshallingの入口
  - layout制御
  - blittable型
  - `LibraryImport`
  - source-generated marshalling

- **24.5 どこまでunsafeを許すか**
  - 封じ込め設計
  - テスト戦略
  - 監査可能性
  - 実務上の判断基準
  - パフォーマンスと保守性の交換

---

### 第VI部　言語・ライブラリ境界とメタプログラミング

#### 第25章　属性とメタデータ

- **25.1 属性の意味**
  - 宣言的情報
  - メタデータへの埋め込み
  - 言語機能との接続点
  - 実行時利用とコンパイル時利用

- **25.2 属性クラスの定義**
  - `Attribute`継承
  - positional / named arguments
  - `AttributeUsage`
  - 多重適用
  - 継承の扱い

- **25.3 標準属性**
  - `Obsolete`
  - `Conditional`
  - `AttributeUsage`
  - nullability関連属性
  - interop / layout関連属性
  - Analyzer関連属性

- **25.4 設計実務**
  - 属性で表すべき情報
  - 属性に入れてはいけない情報
  - コンパイラ・ランタイム・フレームワークの責務分担
  - 文字列ベース契約の危険

---

#### 第26章　リフレクションと実行時情報

- **26.1 リフレクションの基本**
  - `Type`
  - `MemberInfo`
  - `Assembly`
  - メタデータと実体の橋渡し
  - ランタイム型ハンドル

- **26.2 型の観察**
  - ジェネリック型の判定
  - 構築型（constructed type）
  - 制約情報
  - 属性取得
  - nullable注釈の観察

- **26.3 メンバーの観察と呼び出し**
  - メソッド / プロパティ / フィールド
  - invoke
  - デリゲート化
  - パフォーマンス上の注意
  - キャッシュ戦略

- **26.4 リフレクションの制約とAOT/trimming**
  - trimming
  - Native AOT
  - dynamic code generation
  - リフレクション関連警告
  - Source Generatorによる代替
  - public APIにおける動的依存の明示

- **26.5 リフレクションと設計**
  - DI
  - シリアライザ
  - プラグイン
  - ORM
  - Analyzerとは異なる用途

---

#### 第27章　LINQ、クエリ構文、プロバイダー

- **27.1 LINQを三層に分けて読む**
  - クエリ構文は言語仕様の対象である
  - 標準クエリ演算子は標準ライブラリの対象である
  - プロバイダーの翻訳結果は実装依存である
  - `IEnumerable<T>`と`IQueryable<T>`を混同しない

- **27.2 LINQの核**
  - 標準クエリ演算子
  - 遅延評価
  - パイプライン
  - 実行タイミング
  - 副作用の扱い

- **27.3 クエリ構文の変換**
  - `from`
  - `select`
  - `where`
  - `join`
  - `group`
  - `let`
  - `orderby`
  - メソッドチェーンへの脱糖衣

- **27.4 `IEnumerable<T>`と`IQueryable<T>`**
  - 実行場所の違い
  - 翻訳可能部分
  - LINQ to Objectsとの違い
  - 抽象化の境界
  - 例外発生時点

- **27.5 式木とプロバイダー**
  - プロバイダーの責務
  - 翻訳失敗の見方
  - 最適化可能性
  - 実務上の注意点
  - クエリ境界の明示

- **27.6 言語・ライブラリ・実装の接点としてのLINQ**
  - 言語仕様で決まる部分
  - 標準ライブラリで決まる部分
  - プロバイダー実装に委ねられる部分
  - 実装差を前提にした設計

---

#### 第28章　Roslyn、Analyzer、Source Generator

- **28.1 Roslynの全体像**
  - 構文木
  - セマンティックモデル
  - コンパイルオブジェクト
  - ワークスペース
  - イミュータブルモデル

- **28.2 Analyzer**
  - 診断の設計
  - ルールID
  - コードスタイルと意味解析
  - Code Fixの位置付け
  - 重大度設計

- **28.3 Source Generator**
  - コンパイル時メタプログラミング
  - Incremental Generator
  - 生成コードの設計原則
  - partialとの連携
  - 生成コードの可観測性

- **28.4 実務での導入**
  - バリデーション
  - AOT / trimmingとの相性
  - リフレクション代替としての利用
  - テスト方法
  - CIでの扱い

- **28.5 言語の未来との接点**
  - 仕様と実装の先行関係
  - csharplang / Roslynを読む方法
  - 言語提案の読み方
  - 将来機能の追跡法

---

### 第VII部　応用編：API設計、性能、コード読解

#### 第29章　公開API設計と互換性

- **29.1 可変性と不変性**
  - `class` / `struct` / `record`の選択
  - setterの設計
  - 値オブジェクト設計
  - collection exposing
  - defensive copy

- **29.2 例外・戻り値・nullの使い分け**
  - 契約の明示
  - `Try*`パターン
  - Option的設計との比較
  - nullable注釈との整合
  - 失敗モデルの一貫性

- **29.3 拡張メソッドとfluent API**
  - 露出の制御
  - discoverability
  - namespace設計
  - 拡張メンバー（C# 14）の使いどころ
  - 過剰なfluent化の回避

- **29.4 ライブラリ設計の原則**
  - 後方互換性
  - バージョニング
  - Analyzerとともに育てるAPI
  - breaking changeの分類
  - obsolete化戦略
  - AOT/trimmingとの互換性

- **29.5 公開面と非公開面**
  - 公開API表面の最小化
  - バイナリ互換性
  - ソース互換性
  - 振る舞い互換性
  - nullable契約の維持

- **29.6 AOT/trimmingを前提にしたAPI設計**
  - リフレクション依存の公開
  - 動的生成への依存
  - Source Generatorによる代替
  - Analyzerでの制約表現
  - ライブラリ利用者への診断提供

---

#### 第30章　性能とコード生成の見方

- **30.1 何がコストになるか**
  - 割り当て
  - ディスパッチ
  - boxing
  - コピー
  - 例外
  - クロージャ割り当て
  - async / 反復子状態機械

- **30.2 ILを読む**
  - 基本命令
  - call / callvirt
  - box / unbox
  - ldloc / stloc
  - 制御フロー
  - ジェネリックコードの見方

- **30.3 JIT / AOTの観点**
  - インライン化
  - 脱仮想化
  - 汎化コード
  - escapeの観点
  - Native AOT
  - ネイティブ生成の差

- **30.4 ベンチマークの作法**
  - ウォームアップ
  - デッドコード除去
  - 配置の偏り
  - 入力データの設計
  - 割り当て計測
  - 何を比較すべきか

- **30.5 最適化判断の原則**
  - 仕様上の意味を壊さないこと
  - 観測可能なコストに基づくこと
  - 局所最適化とAPI設計の衝突
  - 最適化前後の検証

---

#### 第31章　C#コード読解法

- **31.1 まず型を見る**
  - 公開API表面
  - nullability
  - generic constraints
  - 所有権の推測
  - 可変性の把握

- **31.2 次に束縛を見る**
  - オーバーロード解決
  - 拡張メソッド / 拡張メンバー
  - デリゲート / ラムダ / クロージャ
  - 動的束縛
  - usingとnamespace

- **31.3 次に制御フローを見る**
  - 例外
  - using / await using
  - iterator
  - async state machine
  - cancellation
  - synchronization

- **31.4 最後に実行モデルを見る**
  - 割り当て
  - ディスパッチ
  - boxing
  - 反復子状態機械
  - リフレクション
  - Source Generator
  - JIT / AOT

- **31.5 大規模コードベースへの適用**
  - Analyzerを使った読解
  - IDEの意味情報に基づくナビゲーション
  - grepではなく意味検索を使う場面
  - ルール化・規約化
  - コードレビューで見るべき点

---

### 付録

#### 付録A　基本構文圧縮リファレンス

- 変数宣言
- 型宣言
- メンバー宣言
- 演算子一覧
- 制御文一覧
- クラス定義の最小形
- メソッド定義の最小形
- asyncメソッドの最小形
- iteratorメソッドの最小形

#### 付録B　予約語・文脈依存キーワード・ディレクティブ一覧

- 完全予約語
- contextual keyword
- バージョン追加キーワード
- エスケープ識別子
- 主要前処理ディレクティブ
- ファイルベースアプリ用ディレクティブ（C# 14）

#### 付録C　修飾子・宣言・メンバー早見表

- 型宣言で使える修飾子
- メンバー宣言で使える修飾子
- アクセシビリティ一覧
- 継承関連修飾子
- partial関連宣言
- unsafe関連宣言

#### 付録D　式・演算子・変換早見表

- 演算子優先順位
- 代入演算子
- null関連演算子
- パターン一覧
- 標準変換一覧
- ユーザー定義変換
- checked / unchecked対象

#### 付録E　C#バージョン史と採用判断

- C# 1〜5
- C# 6〜8
- C# 9〜12
- C# 13〜14
- C# 15以降のプレビュー機能
- collection expression arguments
- union types
- union typesとパターンマッチングの関係
- プレビュー機能の扱い
- 採用判断の基準
- TFMとの対応

#### 付録F　CLI / IL / メタデータ速習

- ILの最小読解法
- メタデータテーブルの入口
- CTS / CLSの意味
- C#から見たCLIの要点
- verificationとunsafe
- genericメタデータの入口

#### 付録G　観察ツールと再現環境

- `dotnet --info`
- `dotnet build`
- コンパイラオプション
- ILDASM
- ILSpy
- SharpLab
- BenchmarkDotNet
- Roslyn API
- 環境差の記録方法

#### 付録H　執筆時の表記規約

- 型名の表記
- キーワードの表記
- `null` / `default` / `void`の扱い
- IL・CLI・CLR・CTSの表記統一
- 英語併記の原則
- 初出時の日英併記規則
- バージョン差の表記規則
- nullabilityとnull許容性の使い分け
- メタデータとmetadataの使い分け
- オーバーロード解決とoverload resolutionの使い分け
- リフレクションとreflectionの使い分け
- プロバイダーとproviderの使い分け
- Analyzer、Code Fix、Source Generatorの表記方針

#### 付録I　一次情報への導線

- C#言語仕様
- CLI仕様
- Microsoft Learnの読み方
- Roslyn / csharplangの追跡法
- .NET runtimeリポジトリの読み方
- 実装差を確認する順序
- 仕様・実装・文書が食い違う場合の判断順序

#### 付録J　診断メッセージの読み方

- コンパイルエラー
- nullable警告
- Analyzer診断
- trimming / AOT警告
- obsolete警告
- プレビュー機能に関する診断
- 診断IDの参照方法
