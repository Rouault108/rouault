---
title: '型の全体像'
description: '本ノートはC#における型を、値型、参照型、型パラメーター、ポインター型、関数ポインター型、dynamic、null許容参照型注釈の関係から整理し、以後の値型、参照型、継承、ジェネリクス、nullability、変換、評価を読むための前提を与える。'
date: 2026-04-30
updated: 2026-05-01
genre:
  - C#
  - Programming
---

前ノートでは宣言がどの名前を導入し、どの宣言空間に属し、どのアクセシビリティと修飾子を持つかを整理した。本ノートではその宣言によって導入される型、および式・変数・値に付与される型の全体像を整理する。

C#における型は、単なる名前の分類ではない。型は値が取り得る範囲、許される操作、代入可能性、変換、メンバー探索、オーバーロード解決、メタデータ表現、実行時の値表現に関係する。したがって型を読むことは構文を読むことではなく、プログラムの静的な制約と実行時表現の接点を読むことである。[^1][^2]

本ノートの対象は、個々の型の詳細ではなく、C#の型を読むための分類軸である。組み込み値型、列挙型、構造体、record struct、null許容値型は第6章で扱う。クラス、配列、`string`、`object`、record classは第7章で扱う。継承、インターフェイス、サブタイピングは第8章、ジェネリクスは第9章、nullabilityは第10章で扱う。本ノートでは、それらを読む前提として、型分類、型と変数、型同一性、既定値と初期化を整理する。

## 5.1 型とは何か

型は第一に、値の集合を制約する。たとえば、`bool`型の値は`true`または`false`であり、`int`型の値は定められた範囲の整数である。参照型の値は、オブジェクトへの参照または`null`であり、配列型の値は配列オブジェクトへの参照である。型を値の集合として見るとある値がその型に属するか、ある代入が可能か、ある変換が必要かを判断できる。

第二に、型は操作可能性を定める。ある式に対してどのメンバーを参照できるか、どの演算子を適用できるか、どのメソッド呼び出し候補が存在するかは式の型によって決まる。`x.Length`が許されるか、`x + y`がどの演算を意味するか、`x.M()`がどのメソッドへ束縛されるかは、名前の形だけでは決まらない。型は名前束縛、メンバー探索、オーバーロード解決の入力である。[^1]

第三に、型は静的型付けの単位である。C#では式、変数、パラメーター、戻り値、フィールド、プロパティ、配列要素などに型が関与する。コンパイラは、ある式がどの型を持つかを求め、その型に対して許される操作だけを受理する。実行時の値が偶然その操作に対応しているかではなく、静的に導かれる型に基づいてプログラムの適格性が判定される。

第四に、型は契約である。公開メソッドの戻り値型やパラメーター型は、利用者に対して「どの値を渡せるか」「どの値が返るか」「どの操作を前提にできるか」を示す。ジェネリック制約、null許容参照型注釈、インターフェイス実装、アクセシビリティは、この契約の精度を高める手段である。公開APIの型を変えることは、多くの場合、利用者のソース互換性またはバイナリ互換性に影響する。

ただし、型は仕様上の抽象であり、常に実行時表現と一対一に対応するわけではない。`dynamic`は仕様上は特別な型として扱われるが、実行時には`object`と区別できない。null許容参照型注釈の`T?`と`T`は、同じ基礎となる参照型に対する静的解析上の区別であり、実行時に別の型を作るものではない。タプル型も、構文上の型として扱われる一方で、実行時表現は主に`System.ValueTuple<...>`によって構成される。タプル要素名は値そのものの実行時表現には含まれない。ただし、公開シグネチャなどではメタデータ上に属性として保存され得るため、値表現、コンパイル時の名前解決、メタデータ表現を区別して読む必要がある。したがって、型を読む際には、仕様上の型、メタデータ上の表現、実行時の値表現を区別する必要がある。[^1][^2][^6][^9]

## 5.2 C#における型分類

C#の型は仕様上値型と参照型を主要な分類とし、文法上の`type`にはさらに型パラメーターとポインター型が含まれる。値型または参照型はジェネリック型であり得る。型パラメーターは宣言時には特定の値型または参照型そのものではなく、構築型やジェネリックメソッド呼び出しの文脈で型引数に対応する。ポインター型はunsafe文脈でのみ利用でき、通常の値型・参照型とは別の制約を持つ。[^1][^7]

値型は変数が値そのものを直接保持する型である。代入時には値がコピーされ、通常一方の変数に対する操作が他方の変数の値を変更することはない。値型には組み込み数値型、`bool`、`char`、列挙型、構造体、タプル型、null許容値型などが含まれる。`record struct`は構造体宣言にrecordの合成規則を加えた形式であり、独立した値型分類ではない。ただし、null許容値型は値型に分類されるが、`struct`制約を満たす非null許容値型とは区別して扱う必要がある。[^1][^4]

参照型は変数がオブジェクトそのものではなく、そのオブジェクトへの参照を保持する型である。代入時には参照がコピーされるため複数の変数が同一オブジェクトを指し得る。参照型にはクラス型、インターフェイス型、配列型、デリゲート型、`dynamic`、および参照型制約を持つ型パラメーターが含まれる。`object`と`string`は、C#において特別な意味を持つ定義済みクラス型である。`record class`はクラス宣言にrecordの合成規則を加えた形式であり、独立した参照型分類ではない。参照型の値には、通常、オブジェクトへの参照と`null`が含まれる。null許容参照型注釈が有効な文脈では、`T`と`T?`の注釈により、`null`を許容する意図と警告の出方が変わる。[^1][^6]

型パラメーターはジェネリック型またはジェネリックメソッドの宣言に導入される型を表す名前である。型引数が与えられるまでは特定の具体型を表さず、制約によって利用可能な操作が決まる。たとえば、`where T : IDisposable`という制約があれば、`T`に対して`Dispose`を呼び出せる。制約がない型パラメーターに対しては、任意の型に共通する操作しか前提にできない。型パラメーターの詳細はジェネリクスの章で扱う。[^1]

ポインター型は`T*`や`void*`のように、メモリアドレスを扱う型である。ポインター型はunsafe文脈でのみ利用でき、`object`から派生する通常の型体系には入らない。ポインター型にはboxingやunboxingは適用されず、ガベージコレクターはポインターが指す対象を通常の参照として追跡しない。また、データポインターの参照先型は原則として`unmanaged_type`でなければならず、参照型や参照型フィールドを含む構造体を通常のデータポインターの参照先にはできない。したがって、管理オブジェクト内部のデータへポインターで到達する場合には、固定化された範囲と寿命を明確に管理する必要がある。[^7]

関数ポインター型は`delegate*<...>`で表されるポインター型の一種であり、仕様上は`pointer_type`に含まれる`funcptr_type`として扱われる。通常のデリゲート型とは異なり、オブジェクトとしての呼び出しリストやキャプチャを持たず、unsafe文脈で用いられる低水準の呼び出し手段である。したがって、関数ポインター型は、デリゲート型の軽量版としてではなく、呼び出し規約、相互運用、低オーバーヘッド呼び出しに関係するunsafe機能として読むべきである。デリゲート型との差異は、デリゲートと相互運用のノートで扱う。[^7]

`dynamic`は静的束縛ではなく動的束縛を使うことを式へ伝える型である。仕様上、`dynamic`は`object`とほぼ同一に扱われるが、`dynamic`型の式に対する操作は実行時バインダーによって解決され得る。実行時には`dynamic`と`object`は区別できない。したがって、`dynamic`は実行時に特別な型オブジェクトを作る仕組みではなく、コンパイル時の束縛を遅延させるための型指定として理解する必要がある。[^5]

null許容参照型注釈は参照型に対する`?`注釈である。`string?`は、`string`とは別の実行時型ではない。注釈文脈と警告文脈が有効な場合コンパイラは`null`状態解析に基づいて警告を生成する。したがって、null許容参照型注釈は、実行時表現を変える型分類ではなく、静的解析とAPI契約を補強する注釈体系である。[^6]

## 5.3 特殊な型構成

配列型は要素型と次元数によって構成される参照型である。`int[]`は`int`を要素型とする単一次元配列型であり、`int[,]`は二次元配列型である。`int[][]`は配列を要素に持つ配列型であり、多次元配列ではなくジャグ配列である。配列は参照型であるため、配列変数の代入は配列オブジェクトのコピーではなく参照のコピーである。配列の共変性、境界チェック、`Span<T>`との関係は参照型およびメモリ制御の章で扱う。

タプル型は複数の要素型を順序付きで組み合わせる値型である。仕様上、タプル型は`struct_type`に含まれ、実行時表現は主に`System.ValueTuple<...>`に対応する。ただし、タプル要素名は値そのものには含まれず、コンパイル時の名前解決と、公開シグネチャなどに付与され得るメタデータ上の属性として扱われる。`(int X, int Y)`のようなタプル型は、値をまとめて返す場面や一時的な構造化に有用であるが、公開APIの長期的な意味付けやドメイン概念の表現を代替するものではない。永続的なデータ構造や公開契約を表す場合は、record、構造体、クラスなどの明示的な型宣言を検討すべきである。

匿名型は`new { Name = "Ada", Age = 36 }`のような匿名オブジェクト生成式によって作られるコンパイラ生成の参照型である。匿名型は、LINQや局所的なデータ整形に適するが、型名をソース上で明示できないため、公開APIの戻り値型やフィールド型には適さない。匿名型は、型宣言を省略するための一般的なモデリング手段ではなく、局所的な投影結果を扱うための型構成として読むべきである。

デリゲート型は呼び出し可能なメソッドシグネチャを表す参照型である。デリゲート型の値は、メソッドへの参照だけでなく、呼び出しリストやターゲットオブジェクトを含み得る。ラムダ式や匿名関数は、単独で任意の通常型を持つ式ではない。多くの場合、文脈に応じてデリゲート型または式木型へ変換される。C# 10以降のnatural typeを含む詳細は、ラムダ式、メソッドグループ、target-typed文脈の章で扱う。関数ポインター型とは異なり、デリゲート型は通常の管理オブジェクトとして扱われる。[^10]

null許容値型は非null許容値型`T`に対して、`T`の値集合に`null`を加えた型である。`int?`は`System.Nullable<int>`の省略形であり、`HasValue`と`Value`によって値の有無と値本体を表す。`T?`の基礎型`T`は、さらにnull許容値型であってはならない。すなわち、`int??`のような再帰的なnull許容値型は成立しない。[^4]

null許容参照型注釈も`T?`という構文を使うが、null許容値型とは意味が異なる。`int?`は実体として`System.Nullable<int>`に対応する値型である。一方、`string?`は`string`と同じ実行時型に対する注釈である。この二つを同じ「nullを許す型」としてまとめてしまうと、実行時表現、変換、boxing、フロー解析の違いを見落とす。したがって、本ノート群では、`T?`という表記が値型に対するnull許容値型なのか、参照型に対するnull許容参照型注釈なのかを文脈で区別する。

構築型はジェネリック型に型引数を与えて得られる型である。たとえば、`List<T>`は型パラメーターを持つジェネリック型であり、`List<int>`や`List<string>`は構築型である。型引数または包含型の型引数に型パラメーターが含まれる型は開いた型であり、型パラメーターを含まない型は閉じた型である。実行時の文脈で通常インスタンス化されるのは閉じた構築型であり、開いた型は主にコンパイル時処理、宣言、メタデータ、リフレクション、制約の文脈で現れる。[^1]

開いた型と閉じた型の区別はジェネリクスの理解に不可欠である。`Dictionary<TKey, TValue>`は、型パラメーターを含む型宣言であり、それ単体で通常のオブジェクトを生成する型ではない。`Dictionary<string, int>`は、型引数がすべて与えられた閉じた構築型であり、変数の型、フィールド型、戻り値型として具体的に使える。以後、ジェネリクスの章では、型引数、型パラメーター、構築型、制約、実行時表現をさらに分けて扱う。

## 5.4 型と変数

変数は値を保持する記憶域である。変数には型があり、その型によって保持できる値と許される代入が決まる。ローカル変数、パラメーター、フィールド、配列要素、`ref`ローカル、`out`パラメーターなどは、いずれも変数として扱われ得るが、記憶域の寿命、初期化規則、別名関係は異なる。[^3]

式にも型がある。`1 + 2`という式は`int`型の値を生成し、`customer.Name`という式は、`Name`メンバーの型に応じた値または変数として分類される。式の型は、演算子、メンバーアクセス、メソッド呼び出し、変換、パターン適用、代入の可否を決める。したがって、C#コードを読む際には、まず宣言上の型を確認し、次に各式がどの型へ束縛されるかを追う必要がある。

静的型と実行時型は区別される。静的型はソースコード上の式に対してコンパイラが与える型である。実行時型は実行時に参照が指すオブジェクトの実際の型である。たとえば、次のコードでは、変数`x`の静的型は`object`であるが、実行時に参照しているオブジェクトの型は`string`である。

```csharp
object x = "text";

Console.WriteLine(x.GetType()); // System.String
```

この区別は仮想dispatch、パターンマッチング、キャスト、`is`、`as`、リフレクションに関係する。コンパイル時に利用できるメンバーは静的型に基づいて決まり、実行時にどのoverrideが呼ばれるかは実行時型に基づいて決まる場合がある。

型と記憶域も同一ではない。値型の変数は値を直接保持するが、その値が常にスタック上に置かれるとは限らない。値型フィールドはオブジェクト内に含まれ得るし、値型配列の要素は配列オブジェクト内に連続して格納され得る。参照型の変数も変数そのものの記憶域と参照先オブジェクトの記憶域は別である。したがって、「値型はスタック」「参照型はヒープ」という説明は過度に単純であり、仕様上の型分類と実装上の配置を混同している。

式は単に値を生成するだけではない。C#仕様では式は値、変数、型、名前空間、メソッドグループ、匿名関数などとして分類される。たとえば代入の左辺には変数として分類される式が必要である。一方、メソッドグループはそれだけでは値ではなく、呼び出しやデリゲート変換の文脈で意味を持つ。値カテゴリの詳細は式と評価の章で扱うが、本ノートでは、すべての式が単純な値ではないことを確認しておけば足りる。

## 5.5 型と同一性

型同一性は、二つの型が同じ型であるかを判定する概念である。名目的に宣言されるクラス、構造体、インターフェイス、列挙型、デリゲート型は、名前や構造が似ていても、宣言が異なれば別の型である。たとえば同じフィールド構造を持つ二つの構造体は、構造が同じであっても同一型ではない。

```csharp
public readonly struct Point2D
{
    public readonly int X;
    public readonly int Y;
}

public readonly struct Size2D
{
    public readonly int X;
    public readonly int Y;
}
```

`Point2D`と`Size2D`は、どちらも二つの`int`フィールドを持つが、型としては別である。C#の通常の型システムは、構造的部分型ではなく、宣言に基づく名目的な型同一性を中心に構成される。これにより、同じ表現を持つ値でも、意味の異なる概念を別の型として区別できる。なお、タプル型には要素数と要素型を中心とする変換規則、および要素名によるアクセス規則がある。匿名型にも、プロパティ名、型、順序に基づくコンパイラ生成規則がある。ただし、これらはC#全体を構造的部分型システムにするものではない。一般のクラス、構造体、インターフェイス、列挙型、デリゲート型では、宣言に基づく名目的な型同一性が中心である。

型同一性と等値性は異なる。型同一性は二つの式や変数が同じ型を持つかという静的な問題である。等値性は、二つの値が等しいとみなされるかという操作上の問題である。`Equals`、`==`、recordの値的等値性、参照同一性、コレクションの比較は、それぞれ別の規則や実装に従う。したがって、同じ型の値であっても等しいとは限らず、異なる型の値でも変換や比較演算子によって比較できる場合がある。

代入可能性も型同一性とは異なる。派生クラスの値は基底クラス型の変数へ代入できるが、派生型と基底型は同一型ではない。`string`型の値は`object`型の変数へ代入できるが、`string`と`object`は同一型ではない。代入可能性は、同一性、暗黙変換、参照変換、boxing変換、型パラメーター変換などによって決まる。変換の体系は第13章で扱う。

表現も型同一性とは別である。異なる型が同じ実行時表現を持つ場合がある。たとえば、`dynamic`は実行時には`object`と区別できないが、静的束縛上は異なる扱いを受ける。null許容参照型注釈も、実行時型を分けずに警告と注釈の情報を与える。逆に、同じ型であっても、値の配置、JITによる最適化、boxingの有無、ジェネリック特殊化の有無によって実行時の観察結果が変わる場合がある。

ランタイム型情報は、実行時にオブジェクトの型を観察するための情報である。`object.GetType()`は、参照が指すオブジェクトの実行時型を返す。`typeof(T)`は、コンパイル時に指定された型を表す`System.Type`を取得する。両者は似ているが、前者は値から実行時型を観察し、後者は型名から型情報を取得する。リフレクションの章では、このランタイム型情報を、メタデータ、属性、ジェネリック型、null許容参照型注釈、AOT/trimming制約と結び付けて扱う。

## 5.6 既定値と初期化

すべての型には既定値がある。参照型の既定値は`null`である。数値型の既定値はゼロ、`bool`の既定値は`false`、`char`の既定値は`'\0'`である。構造体型の既定値は、各フィールドをそれぞれの既定値にした値である。null許容値型の既定値は、`HasValue`が`false`である値である。[^1][^4]

`default`式は型の既定値を生成する式である。`default(T)`は型`T`の既定値を表す。`default`リテラルは、文脈から対象型が分かる場合に、その型の既定値を表す。

```csharp
int x = default(int);
int y = default;

string? s = default;
DateTime t = default;
```

`default`式は値型のパラメーターなしコンストラクター呼び出しと常に同一視してはならない。現代のC#では構造体が明示的なパラメーターなしコンストラクターを持ち、そのコンストラクターが既定値以外を生成する場合がある。この場合でも、型の既定値を得るには`default`式または`default`リテラルを用いる。[^8]

初期化規則は変数の種類によって異なる。静的フィールド、インスタンスフィールド、配列要素はそれぞれの型の既定値で初期化される。これに対してローカル変数は宣言しただけでは読み取れない。C#コンパイラは確実な代入解析により、ローカル変数が読み取られる前に確実に代入されていることを要求する。したがって、ローカル変数については「実行時に何らかの値が置かれるか」ではなく、「言語規則上、読み取り前に代入済みと判定されるか」が問題になる。[^3]

```csharp
static int s_value; // 既定値0で初期化される

void M()
{
    int local;
    // Console.WriteLine(local); // エラー: localは確実に代入されていない

    local = 0;
    Console.WriteLine(local);
}
```

フィールド初期化とローカル変数初期化も区別される。フィールドは明示的な初期化子がなくても既定値で初期化される。ローカル変数は明示的な代入なしに読み取ることができない。これは安全性のための静的規則であり、未初期化値の読み取りを防ぐための基本的な仕組みである。

確実な代入は制御フローに基づく静的解析である。単に「どこかで代入されている」ことでは足りず、読み取り地点へ到達するすべての経路で代入済みでなければならない。

```csharp
int value;

if (DateTime.Now.DayOfWeek == DayOfWeek.Monday)
{
    value = 1;
}

// Console.WriteLine(value); // エラー: Monday以外の経路では未代入

value = 0;
Console.WriteLine(value);
```

この解析はnullabilityのフロー解析とは別の規則である。確実な代入は変数に値が代入されているかを判定する。nullable解析は参照型の式が`null`であり得るかを警告として判定する。両者は制御フロー解析に関係するが、目的と診断の性質は異なる。第10章では、nullable解析を、確実な代入とは別の静的契約として扱う。

本ノートで扱った型分類、型と変数、型同一性、既定値、初期化規則は、以後の型システム理解の入口である。C#コードを読む際には、まず式と変数の型を確認し次に値型か参照型か、静的型と実行時型が分離するか、null許容参照型注釈がどの文脈で有効か、既定値と初期化規則がどこで働くかを確認する必要がある。この順序を保つことで値型、参照型、継承、ジェネリクス、変換、評価、メタデータ表現を混同せずに読める。

[^1]: Ecma International, *ECMA-334: C# Language Specification*, 7th ed., December 2023, §8 Types; Microsoft Learn, *Types - C# language specification*, updated 2025-09-12, §8.1 General, §8.2 Reference types, §8.3 Value types, §8.5 Type parameters, §8.7 The dynamic type, §8.9 Nullable reference types. C#の型分類、値型と参照型、型パラメーター、`dynamic`、null許容参照型注釈に関する仕様上の整理。[https://ecma-international.org/publications-and-standards/standards/ecma-334/](https://ecma-international.org/publications-and-standards/standards/ecma-334/) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types)

[^2]: Ecma International, *ECMA-335: Common Language Infrastructure (CLI)*, 6th ed., June 2012. CLI、CTS、メタデータ、アセンブリ、実行時型表現に関する規範的仕様。[https://ecma-international.org/publications-and-standards/standards/ecma-335/](https://ecma-international.org/publications-and-standards/standards/ecma-335/)

[^3]: Microsoft Learn, *Variables - C# language specification*, §9 Variables, §9.3 Default values, §9.4 Definite assignment. 変数分類、既定値、確実な代入解析の仕様上の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/variables](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/variables)

[^4]: Microsoft Learn, *Nullable value types - C# reference*, updated 2026-01-20. `T?`が基礎となる値型`T`の値と追加の`null`値を表すこと、`HasValue`、`Value`、lifted operatorsに関する公式解説。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types)

[^5]: Microsoft Learn, *Types - C# language specification*, §8.7 The dynamic type. `dynamic`が`object`と同一視される点、動的束縛、実行時に`object`と区別できない点の仕様上の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types)

[^6]: Microsoft Learn, *Types - C# language specification*, §8.9 Nullable reference types. `T?`と`T`が同じ基礎となる参照型を表し、null許容参照型注釈とnullable文脈が診断に作用することの仕様上の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types)

[^7]: Microsoft Learn, *Unsafe code - C# language specification*, updated 2026-04-14, §24; *Unsafe code, pointer types, and function pointers - C# reference*, updated 2026-01-20. unsafe文脈、ポインター型、関数ポインター型、`funcptr_type`、`unmanaged_type`、`AllowUnsafeBlocks`、管理オブジェクトとポインターの関係の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/unsafe-code](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/unsafe-code)

[^8]: Microsoft Learn, *Default values of built-in types - C# reference*, updated 2026-01-20; Microsoft Learn, *Parameterless struct constructors - C# feature specifications*, updated 2023-06-23. `default`演算子、`default`リテラル、構造体の明示的なパラメーターなしコンストラクター、`default`式がそのコンストラクターを呼び出さず既定値を生成する点の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/default-values](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/default-values) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-10.0/parameterless-struct-constructors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-10.0/parameterless-struct-constructors)

[^9]: Microsoft Learn, *Attributes interpreted by the compiler: Pseudo-attributes and nullable analysis*, updated 2026-02-17; Microsoft Learn, *TupleElementNamesAttribute Class*, .NET API reference. タプル要素名がシグネチャ上では`TupleElementNamesAttribute`として符号化され得ることの公式整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/pseudo-attributes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/pseudo-attributes) ; [https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.tupleelementnamesattribute](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.tupleelementnamesattribute)

[^10]: Microsoft Learn, *Lambda expressions and anonymous functions - C# reference*, updated 2026-01-24, “Natural type of a lambda expression”. ラムダ式がCTS上の固有型を持たず、文脈に応じてデリゲート型または式木型へ変換されること、およびC# 10以降のnatural typeの整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions)
