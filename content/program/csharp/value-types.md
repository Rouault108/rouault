---
title: '値型'
description: '本ノートは、C#における値型を、組み込み値型、列挙型、構造体、record struct、null許容値型、コピーとboxingのコストモデルから整理し、以後の参照型、継承、ジェネリクス、変換、評価、性能を読むための前提を与える。'
date: 2026-05-01
updated: 2026-05-01
genre:
  - C#
  - Programming
---

前ノートではC#における型を、値型、参照型、型パラメーター、ポインター型、`dynamic`、null許容参照型注釈などの分類軸から整理した。本ノートでは、そのうち値型を扱う。

C#における値型は変数が値そのものを直接保持する型である。値型の代入、引数渡し、戻り値、配列要素、フィールド格納では、原則として値のコピーが問題になる。これは参照をコピーして同一オブジェクトを共有する参照型とは異なる。ただし「値型は常にスタックに置かれる」という意味ではない。値型フィールドは参照型オブジェクトの内部に含まれ得るし、値型配列の要素は配列オブジェクトの内部に格納され得る。したがって値型を読む際には、型分類、コピー意味論、実行時配置、API契約を区別する必要がある。[^1][^2]

仕様上値型は非null許容値型とnull許容値型から成る。非null許容値型には組み込み数値型、`bool`、`char`、構造体、タプル型、列挙型などが含まれる。null許容値型は非null許容値型`T`に追加の`null`値を加えた`T?`であり、実体としては`System.Nullable<T>`に対応する。参照型に対する`T?`が静的解析上の注釈であるのに対し、値型に対する`T?`は別の構造体型として扱われる。[^1][^8]

本ノートの対象は、値型全体の意味論と設計上の含意である。整数型、浮動小数点型、`decimal`、`bool`、`char`を組み込み値型として整理し、列挙型、構造体、record struct、null許容値型を個別に扱う。最後にコピー、boxing、一時値、防御的コピー、ジェネリクスとの関係をコストモデルとしてまとめる。

## 6.1 組み込み値型

組み込み値型はC#言語があらかじめ定義し、専用の型名で直接表現できる基本的な値型である。ここには整数型、浮動小数点型、`decimal`、`bool`、`char`が含まれる。これらは構文上は特別に見えるが、多くは.NETの対応する構造体型への別名として定義される。たとえば`int`は`System.Int32`、`bool`は`System.Boolean`、`char`は`System.Char`を表す。ただし`nint`と`nuint`は仕様上、`System.IntPtr`および`System.UIntPtr`で表現されるネイティブサイズ整数型であり、単純な別名としてだけ扱うべきではない。[^1][^3][^4][^5]

整数型には符号付き整数型と符号なし整数型がある。`sbyte`、`short`、`int`、`long`は符号付き整数型であり、`byte`、`ushort`、`uint`、`ulong`は符号なし整数型である。`nint`と`nuint`はネイティブサイズ整数型であり、32ビットプロセスでは32ビット、64ビットプロセスでは64ビットの大きさを持つ。`nint`と`nuint`は相互運用や低水準処理に関係する型であり、通常のドメイン値を表すために不用意に用いるべきではない。[^3]

| C#型 | .NET上の表現 | 意味 |
| --- | --- | --- |
| `sbyte` | `System.SByte` | 符号付き8ビット整数 |
| `byte` | `System.Byte` | 符号なし8ビット整数 |
| `short` | `System.Int16` | 符号付き16ビット整数 |
| `ushort` | `System.UInt16` | 符号なし16ビット整数 |
| `int` | `System.Int32` | 符号付き32ビット整数 |
| `uint` | `System.UInt32` | 符号なし32ビット整数 |
| `long` | `System.Int64` | 符号付き64ビット整数 |
| `ulong` | `System.UInt64` | 符号なし64ビット整数 |
| `nint` | `System.IntPtr` | ネイティブサイズ符号付き整数 |
| `nuint` | `System.UIntPtr` | ネイティブサイズ符号なし整数 |

整数型を選ぶ際には範囲、相互運用、メモリ量、演算コスト、API契約を分けて考える。公開APIでは、単に「小さい値しか入らない」ことを理由に`byte`や`short`を選ぶと、呼び出し側で変換が増え、オーバーロード解決や数値昇格の見通しが悪くなる場合がある。通常の個数、長さ、添字、状態値には`int`が標準的な選択になりやすい。`long`は範囲が必要な場合に用いる。`uint`や`ulong`は負値を排除する契約を表現できるが、.NET API全体との整合や符号付き整数との混在に注意が必要である。

浮動小数点型には`float`と`double`がある。`float`は単精度、`double`は倍精度の二進浮動小数点数である。これらは実数を完全に表現する型ではなく、有限のビット列で近似値を表す型である。したがって、`0.1`のような十進小数を厳密に表せない場合があり、計算結果には丸め誤差が現れる。物理量、統計量、座標、機械学習、グラフィックスなどでは、性能と精度の要件に応じて`float`または`double`を選ぶ。一般的な数値計算では`double`が既定の選択になりやすい。[^4]

`decimal`は十進小数を高い精度で扱うための値型である。`decimal`は`float`や`double`より範囲は狭く、通常は演算コストも大きいが、十進表現に基づく金額、会計、固定小数点的な計算に適する。`decimal`を「より正確なdouble」と見るのは不正確である。`decimal`は二進浮動小数点ではなく、十進表現を重視する別の数値型である。数値型の選択では対象が物理量や統計量なのか、金額や十進桁を持つ業務値なのかを区別する必要がある。[^4]

```csharp
double x = 0.1 + 0.2;
decimal y = 0.1m + 0.2m;

Console.WriteLine(x); // 二進浮動小数点の丸めの影響を受ける
Console.WriteLine(y); // 十進小数として扱われる
```

`bool`は`true`または`false`のいずれかを表す値型である。C#では`bool`と整数型の間にC/C++風の暗黙変換は存在しない。`if (1)`のような記述は許されず、条件式には`bool`型の式が必要である。これは真偽値と整数を型として分離する設計であり、条件式の意図を明確にする。`bool?`を用いると三値論理を表現できるが、それは通常の`bool`ではなく、null許容値型として扱う必要がある。[^5]

`char`はUnicode UTF-16コード単位を表す16ビットの値型である。`char`は「ユーザーが認識する一文字」を常に表すわけではない。サロゲートペアや結合文字を含む文字列では、表示上の一文字が複数の`char`から成る場合がある。したがって`char`は文字データ処理の最小意味単位ではなく、.NET文字列内部のUTF-16コード単位として読むべきである。文字列処理の詳細は参照型の`string`および`ReadOnlySpan<char>`の章で扱う。[^6]

`checked`および`unchecked`文脈は整数演算および一部の数値変換におけるオーバーフロー検査を制御する。`checked`文脈では、整数演算のオーバーフローに対して`OverflowException`が発生する。定数式でオーバーフローが生じる場合はコンパイル時エラーになる。`unchecked`文脈では、結果は対象型に収まる下位ビットとして扱われ、典型的には折り返しが生じる。既定では、非定数式の整数演算はコンパイラオプションに依存し、通常は`unchecked`として扱われる。定数式は既定でchecked文脈で評価される。[^7]

```csharp
int max = int.MaxValue;

int wrapped = unchecked(max + 1);
// wrapped == int.MinValue

int failed = checked(max + 1);
// 実行時にOverflowException
```

`checked`と`unchecked`はすべての数値型に同じ意味で作用するわけではない。主な対象は整数型、`char`、列挙型に関係する組み込み演算、および整数型への明示的数値変換である。`float`、`double`、`System.Half`では、無限大やNaNが関係する。`decimal`の演算は、範囲外の結果に対してchecked/uncheckedにかかわらず例外を投げ得る。したがって`checked`を「すべての数値計算を安全にする指定」と読むべきではない。対象となる型と演算を確認する必要がある。[^7]

## 6.2 列挙型

列挙型は名前付き定数の集合を定義する値型である。列挙型は`enum`宣言によって導入され、それぞれの列挙メンバーは基底となる整数型の値に対応する。列挙型は単なる整数の別名ではなく、独立した値型である。したがって列挙型と整数型の間には明示的な変換が必要になる。ただし列挙型の値集合は、宣言された列挙メンバーの集合だけに制限されない。基底型が表せる値はキャストにより列挙型の値として作ることができる。[^9][^10]

```csharp
public enum OrderStatus
{
    None = 0,
    Created = 1,
    Paid = 2,
    Shipped = 3,
    Cancelled = 4
}
```

列挙型の基底型は整数型である。明示しない場合基底型は`int`になる。基底型として指定できるのは、`byte`、`sbyte`、`short`、`ushort`、`int`、`uint`、`long`、`ulong`であり、`char`、`nint`、`nuint`は列挙型の基底型には使えない。基底型は外部データ形式、相互運用、メモリ表現、ビットフラグの範囲に関係する。特別な理由がない限り`int`を既定として読むのが自然である。[^9][^10]

列挙メンバーの値は、明示的に指定できる。値を省略した場合、最初のメンバーは0になり、後続のメンバーは直前のメンバーの値に1を加えた値になる。途中で値を明示した場合、その後の省略値は明示値からの連番になる。列挙メンバーの宣言順序は、この省略値の決定に影響する。これは、名前空間や型メンバーの参照可能性とは異なり、宣言順序が意味を持つ例である。

```csharp
public enum ErrorCode : ushort
{
    None = 0,
    Unknown = 1,
    ConnectionLost = 100,
    Timeout,       // 101
    OutlierReading = 200
}
```

列挙型の既定値は`0`をその列挙型へ変換した値である。これは値`0`に対応する列挙メンバーが宣言されているかどうかとは独立である。したがって列挙型を設計する際には、ほとんどの場合、`None = 0`、`Unknown = 0`、`Unspecified = 0`など、0に対応する明示的なメンバーを置くべきである。0に対応するメンバーがない列挙型は、既定値や配列初期化、フィールド初期化、逆シリアライズ時に扱いにくい。[^9]

```csharp
public enum Direction
{
    North = 1,
    East = 2,
    South = 3,
    West = 4
}

Direction d = default;
// dはDirection型の値だが、宣言済みメンバーではない0を持つ
```

列挙型の値は宣言済みメンバーだけに限定されない。この性質は外部入力、数値キャスト、バイナリデータ、シリアライズされた値を扱う際に重要である。たとえば、`(OrderStatus)999`はコンパイルでき、実行時にも`OrderStatus`型の値になる。これが有効な業務状態を意味するとは限らない。外部入力から列挙型へ変換する場合には、`Enum.IsDefined`、範囲検査、明示的なswitch、または独自の検証ロジックを用いる必要がある。[^9][^10]

```csharp
OrderStatus status = (OrderStatus)999;

if (!Enum.IsDefined(status))
{
    throw new InvalidOperationException("未定義の状態です。");
}
```

フラグ列挙は複数の選択肢をビットごとの組み合わせとして表す列挙型である。通常は`[Flags]`属性を付け、各メンバーに2の冪の値を割り当てる。`[Flags]`属性は、主に文字列表現や慣用的な意味付けに関係する。属性を付けるだけでビット演算の意味が作られるわけではない。ビット演算自体は列挙型に対する`|`、`&`、`^`、`~`などの演算によって成立する。[^10]

```csharp
[Flags]
public enum FileAccessMode
{
    None = 0,
    Read = 1 << 0,
    Write = 1 << 1,
    Execute = 1 << 2,
    ReadWrite = Read | Write
}

FileAccessMode mode = FileAccessMode.Read | FileAccessMode.Write;

bool canWrite = (mode & FileAccessMode.Write) != 0;
```

フラグ列挙では`None = 0`を置くこと、各ビットを重複させないこと、合成済みの便利メンバーを必要最小限にすることが重要である。また、否定演算子`~`を使うと基底型の全ビットが反転するため、宣言されていないビットも立ち得る。公開APIでは未定義ビットを許すのか、明示的に拒否するのかを決めておく必要がある。

列挙型は状態集合や選択肢の表現に有用である。ただし状態に振る舞いを持たせたい場合列挙型だけでは不十分になることがある。列挙値ごとに処理が分岐し続ける設計では、switchの網羅性、未定義値、将来の追加、互換性を検討する必要がある。列挙型は閉じた集合を表すように見えるが、実行時値としては基底型の範囲を取り得るため、型だけで完全な閉世界性を保証するものではない。

## 6.3 構造体

構造体は`struct`宣言によって定義される値型である。構造体はフィールド、定数、メソッド、プロパティ、イベント、インデクサ、演算子、コンストラクター、静的コンストラクター、入れ子型などを持てる。クラスと同じようにメンバーを持てる一方で、継承、コピー、既定値、初期化、boxingの点でクラスとは異なる。[^11]

```csharp
public readonly struct Point
{
    public Point(int x, int y)
    {
        X = x;
        Y = y;
    }

    public int X { get; }
    public int Y { get; }

    public double DistanceFromOrigin()
        => Math.Sqrt((double)X * X + (double)Y * Y);
}
```

構造体の最も重要な性質は、代入によって値がコピーされることである。構造体変数を別の変数へ代入すると、同じオブジェクトを共有するのではなく、値の複製が作られる。値渡し引数として渡す場合や戻り値として返す場合も、概念上は同じくコピーが関係する。JIT最適化により実際の機械語レベルではコピーが省略される場合があるが、言語意味論としては値のコピーとして読む必要がある。[^1][^11]

```csharp
public struct Counter
{
    public int Value;
}

Counter a = new Counter { Value = 1 };
Counter b = a;

b.Value = 10;

Console.WriteLine(a.Value); // 1
Console.WriteLine(b.Value); // 10
```

構造体は暗黙に`System.ValueType`を継承し、さらに`object`へつながる。ただし、構造体がクラス継承階層の通常の派生型として振る舞うわけではない。構造体は常に暗黙にsealedであり、他の構造体やクラスから継承されない。構造体はインターフェイスを実装できるが、基底クラスを明示的に指定できない。したがって、構造体における多相性は、主にインターフェイス、ジェネリック制約、boxing、静的抽象メンバーなどを通じて現れる。[^11]

構造体の既定値は全フィールドをそれぞれの既定値にした値である。数値フィールドは0、`bool`は`false`、参照型フィールドは`null`、null許容値型フィールドは`HasValue == false`の値になる。構造体はどのように設計しても既定値を完全には排除できない。配列確保、フィールド初期化、`default`式、`default`リテラル、ジェネリックコードでは、コンストラクターを明示的に呼ばずに既定値が現れる。したがって構造体は既定値が有効な状態として扱えるように設計するのが原則である。[^1][^11]

```csharp
public readonly struct Money
{
    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency ?? throw new ArgumentNullException(nameof(currency));
    }

    public decimal Amount { get; }
    public string? Currency { get; }
}

Money m = default;
// Currencyはnullになり得る
```

この例では、コンストラクターは`currency`に`null`を許さないが、`default(Money)`はコンストラクターを通らない。したがって構造体の不変条件をコンストラクターだけで保証したつもりになってはならない。公開構造体では、既定値を有効な空状態として定義するか、すべてのメンバーが既定値を安全に扱えるようにする必要がある。

構造体のインスタンスコンストラクターには、確実な代入規則と既定初期化規則が強く関係する。C# 10以前では、構造体のコンストラクターは戻る前にすべてのインスタンスフィールドを確実に代入する必要があった。C# 11以降では、auto-default structsにより、明示的に代入されなかったフィールドはコンパイラによって`default`で暗黙初期化される。したがって、現代のC#では「すべてのフィールドを手動で代入しなければコンパイルできない」とは限らない。ただし、コンストラクター内で`this`やインスタンスメンバーを読む前に、どのフィールドが明示的に代入され、どのフィールドが既定値になるかを意識する必要がある。自動実装プロパティへの代入は、その隠れたバッキングフィールドへの代入として扱われる。[^11][^12]

C# 10以降では、構造体は明示的なパラメーターなしコンストラクターを宣言できる。ただし`default(S)`はそのパラメーターなしコンストラクターを呼び出さず、ゼロ初期化された値を生成する。`new S()`は、公開パラメーターなしコンストラクターが存在する場合にはそれを呼び出す。配列確保では、要素はコンストラクター呼び出しではなくゼロ初期化される。したがって、構造体にパラメーターなしコンストラクターを定義しても、既定値の存在は消えない。[^12]

```csharp
public struct Token
{
    public Token()
    {
        Value = "<generated>";
    }

    public string? Value { get; }
}

Token a = new Token(); // Value == "<generated>"
Token b = default;     // Value == null

Token[] values = new Token[1];
// values[0].Value == null
```

構造体の不変設計では`readonly struct`が有用である。`readonly struct`はインスタンスフィールドへの書き込みを制限し、その値を読み取り専用の値として扱うことを示す。これはAPI利用者に対する意味付けだけでなく、`in`パラメーターや読み取り専用文脈における防御的コピーの回避にも関係する。ただし、`readonly`は参照型フィールドが指すオブジェクトの深い不変性を保証しない。構造体が参照型フィールドを含む場合、値そのものは変更されなくても、参照先の状態は変更され得る。

```csharp
public readonly struct Range
{
    public Range(int start, int length)
    {
        Start = start;
        Length = length;
    }

    public int Start { get; }
    public int Length { get; }
}
```

構造体を可変にする場合には、コピー意味論との相互作用に注意する必要がある。可変構造体はプロパティ、インデクサ、foreach変数、`readonly`フィールド、`in`パラメーターなどの文脈で、意図しないコピーに対して変更を行う危険がある。特にプロパティから返された構造体を変更しても、元の格納場所は変更されない場合がある。構造体は小さく、不変で、値としての同一性が自然な型に向く。大きく可変で、同一性や共有状態を持つ概念には、通常はクラスを検討すべきである。

```csharp
public struct MutablePoint
{
    public int X { get; set; }
    public int Y { get; set; }

    public void Move(int dx, int dy)
    {
        X += dx;
        Y += dy;
    }
}
```

可変構造体は常に禁止されるわけではない。たとえば`Span<T>`のような低水準のメモリ範囲を表す型では、可変的な値型としての設計が重要になる。ただし、`Span<T>`は通常の構造体ではなく`ref struct`であり、寿命制約や配置制約を伴う特殊な値型である。詳細は`ref struct`およびメモリ制御の章で扱う。一般的なドメインモデルでは、可変構造体はコピーの境界が見えにくくなるため、設計上の注意が必要である。値型としての利点を得たい場合でも、不変性、サイズ、既定値、boxingの有無を確認してから採用する必要がある。

## 6.4 `record struct`

`record struct`は構造体に`record`の合成規則を加えた値型である。`record struct`は独立した第3の実行時型分類ではなく、構造体の一種である。したがって値型であり、コピー意味論を持ち、暗黙に`System.ValueType`へつながり、構造体としての制約を受ける。[^13]

```csharp
public readonly record struct Point(int X, int Y);
```

`record struct`の主な特徴は、値としての等値性に関するメンバーが合成されることである。通常の構造体でも`Equals`や`GetHashCode`を実装できるが、`record struct`では、宣言されたフィールドやプロパティに基づく等値性、`==`および`!=`演算子、`ToString`、分解、`with`式に関係するメンバーが合成される。これにより座標、範囲、識別子、単位付き値など、値として比較される小さなデータ構造を簡潔に定義できる。[^13]

```csharp
public readonly record struct CustomerId(Guid Value);

CustomerId a = new(Guid.Parse("00000000-0000-0000-0000-000000000001"));
CustomerId b = new(Guid.Parse("00000000-0000-0000-0000-000000000001"));

Console.WriteLine(a == b); // true
```

位置指定`record struct`では、主コンストラクターのパラメーターから対応する公開プロパティが合成される。`readonly record struct`の場合、合成されるプロパティは初期化後変更できない形になる。`readonly`を付けない`record struct`では、合成プロパティが可変になり得る。この差は設計上重要である。`record`と名が付いていても、`record struct`が自動的に不変になるわけではない。[^13]

```csharp
public record struct MutableSize(int Width, int Height);

MutableSize size = new(10, 20);
size.Width = 30; // 可能
```

このような可変`record struct`（mutable record struct）は、構文上は簡潔であるが値的等値性と可変性が結び付くため注意が必要である。ハッシュテーブルのキーとして使った後に値を変更すると、探索不能になる可能性がある。公開APIで`record struct`を使う場合には、`readonly record struct`を既定候補とし、可変性が必要な理由を明確にする方がよい。

```csharp
public readonly record struct Size(int Width, int Height);
```

`with`式は既存の値をコピーし、一部のメンバーだけを変更した新しい値を作る。`record class`では参照型オブジェクトのコピー的な生成として読む必要があるが、`record struct`では値型のコピーとして読む。receiverが構造体である場合、まず値がコピーされ、そのコピーに対してメンバー初期化が適用される。したがって`with`式は値型のコピー意味論と整合する。[^13]

```csharp
public readonly record struct Size(int Width, int Height);

Size original = new(10, 20);
Size resized = original with { Width = 30 };

Console.WriteLine(original); // Size { Width = 10, Height = 20 }
Console.WriteLine(resized);  // Size { Width = 30, Height = 20 }
```

`record struct`は通常の`struct`と同じく既定値を持つ。主コンストラクターや合成メンバーがあっても、`default`によってゼロ初期化された値が作られ得る。したがって`record struct`でも既定値を有効な値として扱えるかを検討する必要がある。

```csharp
public readonly record struct EmailAddress(string Value);

EmailAddress e = default;
// Valueはnullになり得る
```

この例では`EmailAddress`という型名が妥当な文字列だけを表すように見えても、`default`では`Value`が`null`になる。`record struct`は宣言の簡潔さと合成等値性を与えるが、不変条件を自動的に完全保証するものではない。強い検証を伴う値オブジェクトでは、通常の`readonly struct`として明示的にコンストラクター、検証、等値性を実装する方が適切な場合もある。

`record struct`の適用場面は小さく、値として比較され、分解や`with`式が自然なデータ構造である。座標、サイズ、範囲、識別子、単純な測定値などが典型例になる。逆にリソース所有、同一性、ライフサイクル、遅延初期化、共有状態を持つ概念には向かない。`record struct`はデータの形を簡潔に記述する道具であり、ドメイン不変条件や所有権モデルを自動で設計する機能ではない。

## 6.5 null許容値型

null許容値型は非null許容値型`T`の値に追加の`null`値を加えた型である。構文上は`T?`と書き、実体としては`System.Nullable<T>`に対応する。ここでの`T`は非null許容値型でなければならず、`int??`のようにnull許容値型をさらにnull許容値型にすることはできない。[^8]

```csharp
int? count = 10;
int? missing = null;
Nullable<int> same = count;
```

null許容値型は値が存在するかどうかを`HasValue`で表し、存在する値を`Value`で取り出す。`HasValue`が`false`のときに`Value`を読むと、`InvalidOperationException`が発生する。したがって`Value`を直接読む前には、`HasValue`、`is`パターン、`??`演算子などで値の有無を明確にする必要がある。[^8]

```csharp
int? value = GetOptionalCount();

if (value.HasValue)
{
    Console.WriteLine(value.Value);
}

if (value is int n)
{
    Console.WriteLine(n);
}

int fallback = value ?? 0;
```

null許容値型の既定値は`HasValue`が`false`である値である。これは参照型の`null`参照と似た形で扱えるが、実体としては`Nullable<T>`構造体の値である。`default(int?)`は値を持たない`int?`であり、`default(int)`は0である。したがって`T?`の既定値と`T`の既定値は異なる。

```csharp
int x = default;   // 0
int? y = default;  // HasValue == false
```

null許容値型では基礎となる値型の演算子がliftされる。lifted operatorは、通常オペランドのいずれかが`null`なら結果も`null`になる。ただし、`bool?`に対する`&`および`|`は三値論理として特別な規則を持ち、片方が`null`でも結果が`true`または`false`に決まる場合がある。また、`<`、`>`、`<=`、`>=`のような比較演算子は、片方が`null`なら結果は`false`になる。`==`では両方が`null`なら`true`、片方だけが`null`なら`false`になる。[^8]

```csharp
int? a = 10;
int? b = null;

int? sum = a + b;
bool greater = a > b;
bool isNull = b == null;

Console.WriteLine(sum.HasValue); // false
Console.WriteLine(greater);      // false
Console.WriteLine(isNull);       // true
```

この規則は通常の数値比較の直感と異なる場合がある。たとえば、`a >= null`が`false`であっても、`a < null`が`true`になるわけではない。null許容値型の比較は、順序集合に単純に`null`を追加したものではなく、演算子ごとの規則として読む必要がある。

null許容値型とboxingの関係は特殊である。`T?`の値をboxingする場合、`HasValue`が`false`なら結果は`null`参照になる。`HasValue`が`true`なら、`Nullable<T>`そのものではなく、基礎となる`T`の値がboxedされる。したがって、非nullの`int?`を`object`に代入しても、その実行時型は`System.Nullable<int>`ではなく`System.Int32`として観察される。[^8]

```csharp
int? a = 42;
object? boxedA = a;

Console.WriteLine(boxedA?.GetType()); // System.Int32

int? b = null;
object? boxedB = b;

Console.WriteLine(boxedB is null); // true
```

この性質により、`object.GetType()`や`is`演算子だけで、値がもともと`Nullable<T>`だったかを判定することはできない。型そのものがnull許容値型かを調べる場合は、`typeof(int?)`のような型情報に対して`Nullable.GetUnderlyingType`を用いる。値インスタンスから観察する場合には、boxing規則によって情報が失われる。

```csharp
bool IsNullableValueType(Type type)
    => Nullable.GetUnderlyingType(type) is not null;

Console.WriteLine(IsNullableValueType(typeof(int?))); // true
Console.WriteLine(IsNullableValueType(typeof(int)));  // false
```

パターンマッチングではnull許容値型に対して基礎となる型のパターンを使うと、値が存在する場合だけマッチする。これは`HasValue`を確認してから`Value`を取り出す処理を簡潔に書く方法として有用である。特に、`if (x is int n)`は、`x`が値を持つ場合にその値を`n`として束縛する。

```csharp
int? x = GetValue();

if (x is int n)
{
    Console.WriteLine(n);
}
else
{
    Console.WriteLine("値がありません。");
}
```

null許容値型は値が欠落し得ることを型で表すために有用である。ただし、すべての欠落可能性を`T?`で表すのが適切とは限らない。失敗理由を持つ処理、複数の状態を区別する処理、エラーと欠落を分ける必要がある処理では、専用の結果型、判別共用体的な設計、例外、`Try*`パターンなどを検討する必要がある。`T?`は「値があるかないか」を表す最小限の型であり、失敗モデル全体を表す機構ではない。

## 6.6 値型のコストモデル

値型のコストモデルはコピー、boxing、一時値、防御的コピー（defensive copy）、ジェネリクスとの関係として整理できる。値型は参照型より常に高速である、あるいは常に割り当てを避けられる、という理解は不正確である。値型は、適切に使えば割り当て削減、局所性、ジェネリック特殊化、API契約の明確化に寄与する。一方で、大きな値型、可変値型、頻繁なboxing、インターフェイス経由の呼び出し、不用意な`in`パラメーターは、性能と可読性を悪化させる場合がある。[^1][^11]

コピーは値型の基本コストである。小さな構造体であればコピーコストは無視しやすい。しかしフィールド数が多い構造体、大きな配列や複数の値を含む構造体、ネストした値型を含む構造体では、代入、引数渡し、戻り値、プロパティ取得のたびにコピーが問題になり得る。JITがコピーを省略できる場合もあるが、公開API設計では呼び出し側がどのような文脈で使うかを制御できないため、値型のサイズは重要な設計条件になる。

```csharp
public readonly struct LargeValue
{
    public readonly long A;
    public readonly long B;
    public readonly long C;
    public readonly long D;
    public readonly long E;
    public readonly long F;
    public readonly long G;
    public readonly long H;
}
```

このような大きな値型を値渡しで頻繁に受け渡すと、参照型より不利になる場合がある。`in`パラメーターはコピーを避けるために使えるが、常に高速化するとは限らない。小さな値型では参照渡しの間接性の方が不利になる場合がある。また`in`パラメーターが読み取り専用文脈を作ることで、防御的コピーが発生する場合もある。

boxingは値型を`object`、`System.ValueType`、`System.Enum`、または実装インターフェイス型として扱うときに発生し得る。boxingでは、値型の値がヒープ上のオブジェクトへコピーされ、そのオブジェクトへの参照が作られる。これは割り当てとコピーを伴う。unboxingでは、ボックス化された値が期待する値型であることを検査し、値を取り出す。boxingは変換規則であり、単なる型注釈の変更ではない。[^2][^11]

```csharp
int x = 42;

object boxed = x; // boxing
int y = (int)boxed; // unboxing
```

インターフェイス呼び出しでもboxingが問題になる場合がある。値型がインターフェイスを実装していても、その値をインターフェイス型の変数へ代入するとboxingが発生する。一方、ジェネリック制約を使うと、値型をboxedせずに操作できる場合がある。したがって、性能上重要なAPIでは、`object`や非ジェネリックインターフェイスに値型を流す経路を避け、ジェネリック型やジェネリックメソッドで型情報を保持する設計が有効になる。

```csharp
public interface IMeasurable
{
    int Measure();
}

public readonly struct Item : IMeasurable
{
    public int Measure() => 1;
}

IMeasurable m = new Item(); // boxingが発生し得る

static int Measure<T>(T value) where T : IMeasurable
{
    return value.Measure(); // ジェネリック制約によりboxingを避けやすい
}
```

一時値も値型の読解で重要である。プロパティやメソッドの戻り値として構造体が返る場合、その結果は一時値として扱われる。可変構造体に対して一時値上で変更を行おうとすると、元の格納場所を変更できないか、コンパイル時エラーになる場合がある。値型ではどの式が変数として分類され、どの式が値として分類されるかを意識する必要がある。

```csharp
public struct Position
{
    public int X { get; set; }
    public int Y { get; set; }
}

public sealed class Entity
{
    public Position Position { get; set; }
}

Entity e = new Entity();

// e.Position.X = 10; // プロパティが返す一時値に対する変更として問題になる
Position p = e.Position;
p.X = 10;
e.Position = p;
```

防御的コピーは読み取り専用文脈で可変構造体のメンバーを呼び出す際に発生し得る。`readonly`フィールド、`in`パラメーター、`readonly struct`でない値型の読み取り専用参照などでは、メンバー呼び出しが元の値を変更しないことを保証するため、コンパイラがコピーを作る場合がある。構造体メンバーに`readonly`を付ける、構造体全体を`readonly struct`にする、不変設計にすることは、この問題を減らす手段になる。

```csharp
public struct Accumulator
{
    private int _value;

    public int Value => _value;

    public void Add(int value)
    {
        _value += value;
    }
}

public readonly struct ImmutablePoint
{
    public ImmutablePoint(int x, int y)
    {
        X = x;
        Y = y;
    }

    public int X { get; }
    public int Y { get; }

    public readonly int Sum() => X + Y;
}
```

ジェネリクスとの関係では値型は重要な性能上の性質を持つ。.NETのジェネリクスは、値型の型引数に対してboxingを避けたコード生成や特殊化を行える。たとえば、`List<int>`は`int`値を要素として保持でき、`ArrayList`のように各要素を`object`としてboxingする必要がない。これは、C#におけるジェネリクスが型安全性だけでなく、値型の性能にも関係する理由である。

```csharp
var list = new List<int>();

list.Add(1);
list.Add(2);

int first = list[0]; // boxingなしで扱える
```

値型を公開APIで採用する際の原則は次のように整理できる。第一にその概念が値として自然に比較・コピーされるかを確認する。第二に既定値が有効な状態として扱えるかを確認する。第三に型のサイズが小さく、頻繁なコピーに耐えるかを確認する。第四にboxingされる経路が多くないかを確認する。第五に可変性を持たせる場合、その可変性がコピー意味論と衝突しないかを確認する。

値型は実装詳細として選ぶものではなく、意味論として選ぶべき型分類である。ドメイン上の値、測定値、識別子、座標、範囲、小さな複合値には値型が適する場合がある。オブジェクト同一性、共有状態、継承、多相的な振る舞い、ライフサイクル、リソース所有を表す概念には参照型が適する場合が多い。値型と参照型の選択は、性能だけでなく意味、契約、既定値、互換性、呼び出し側の使い方を含む設計判断である。

本ノートで扱った値型の性質は、以後の参照型、継承、ジェネリクス、変換、式評価、性能の章に接続される。特にboxing/unboxingは変換の章で、値型と`object`・インターフェイスの関係は継承とジェネリクスの章で、コピーと防御的コピーは`ref`、`in`、`out`、`Span<T>`の章で再度扱う。値型を正確に読むには、単に「値を直接持つ型」と覚えるだけでは不十分であり、既定値、コピー、boxing、初期化、API契約を同時に追う必要がある。

[^1]: Ecma International, *ECMA-334: C# Language Specification*, 7th ed., December 2023, §8 Types; Microsoft Learn, *Types - C# language specification*, updated 2025-09-12, §8.3 Value types. 値型、非null許容値型、null許容値型、既定値、単純型、構造体型、列挙型の仕様上の整理。

[^2]: Ecma International, *ECMA-335: Common Language Infrastructure (CLI)*, 6th ed., June 2012. CTS、値型、boxing、メタデータ、実行時表現に関する規範的仕様。

[^3]: Microsoft Learn, *Integral numeric types - C# reference*, updated 2026-01-20. C#の整数型、対応する.NET型、値域、`nint`および`nuint`の整理。ただし、`nint`/`nuint`の仕様上の扱いについては、単純な別名ではなく`System.IntPtr`/`System.UIntPtr`で表現される型として[^1]を優先して読む。

[^4]: Microsoft Learn, *Floating-point numeric types - C# reference*, updated 2026-01-20. `float`、`double`、`decimal`の範囲、精度、既定値、丸め、十進小数表現の整理。

[^5]: Microsoft Learn, *bool type - C# reference*, updated 2026-01-20. `bool`が`System.Boolean`の別名であり、値が`true`または`false`であること、条件式や三値論理との関係。

[^6]: Microsoft Learn, *The char type - C# reference*, updated 2026-01-20. `char`が`System.Char`の別名であり、Unicode UTF-16コード単位を表すこと、および`string`との関係。

[^7]: Microsoft Learn, *The checked and unchecked statements - C# reference*, updated 2026-01-20. `checked`/`unchecked`文脈、整数演算と変換、定数式、既定のオーバーフロー検査文脈の整理。

[^8]: Microsoft Learn, *Nullable value types - C# reference*, updated 2026-01-20. `T?`、`System.Nullable<T>`、`HasValue`、`Value`、lifted operators、boxing、pattern matchingとの関係。

[^9]: Microsoft Learn, *Enumeration types - C# reference*, updated 2026-01-14. enumが基底整数型の名前付き定数集合として定義されること、既定値、ゼロ値、フラグ列挙、`Enum.IsDefined`の整理。

[^10]: Microsoft Learn, *Enums - C# language specification*, §20. 列挙型の宣言、基底型、列挙メンバー、値の範囲、`System.Enum`、列挙型に対する演算の仕様上の整理。

[^11]: Microsoft Learn, *Structs - C# language specification*, updated 2025-12-09, §16. 構造体宣言、コピー、既定値、継承不可、boxing、コンストラクター、`readonly`構造体メンバーの仕様上の整理。

[^12]: Microsoft Learn, *Parameterless struct constructors - C# feature specifications*, updated 2023-06-23; Microsoft Learn, *Auto-default structs - C# feature specifications*, updated 2023-06-23. C# 10以降の構造体パラメーターなしコンストラクター、インスタンスフィールド初期化子、`default`式、`new()`、配列初期化、およびC# 11以降のauto-default structsとの関係。

[^13]: Microsoft Learn, *Record structs - C# feature specifications*, updated 2023-06-23. record structが値型であり、構造体と同じ制約を受けつつ、等値性、プロパティ、分解、`with`式などの合成メンバーを持つことの整理。
