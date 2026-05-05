---
title: '宣言、修飾子、メンバー分類'
description: '本ノートは、C#における宣言空間、名前空間、型宣言、メンバー宣言、アクセシビリティ、修飾子、partial宣言を整理し、以後の型システム・名前束縛・メンバー意味論を読むための前提を与える。'
date: 2026-04-30
updated: 2026-05-04
genre:
  - C#
  - Programming
status: wip
---

第II部では、C#プログラムを型、宣言、メンバー、名前束縛の構造として読む。本ノートではその入口として、宣言がどの名前を導入し、どの宣言空間に属し、どのアクセシビリティと修飾子を持ち、どの種類のメンバーを構成するかを整理する。

C#における宣言は単に構文上の見出しではない。宣言は名前を導入し、型またはメンバーを定義し、後続の名前探索、型検査、オーバーロード解決、メタデータ生成、公開API表面に影響する。したがって宣言の読み方は、型システム、束縛、変換、評価を理解するための前提である。[^1][^2]

本ノートの対象は宣言の形と分類である。各メンバーの詳細な意味論、初期化順序、仮想ディスパッチ、等値性、イベント発火、プロパティ設計、演算子設計は後続のノートで扱う。本ノートではどの宣言がどこに現れ、どの名前を作り、どの修飾子を持てるかを中心に記述する。

## 4.1 宣言空間

C#プログラムは宣言によって構成される。宣言は名前空間、型、メンバー、ローカル変数、型パラメーター、パラメーター、ラベルなどを導入する。言語仕様上宣言は所属する宣言空間に名前を定義する。したがって、同じテキスト上に同じ識別子が現れるかどうかではなく、同じ宣言空間に同じ名前が導入されるかどうかが問題になる。[^2]

宣言空間は名前の重複可否を判定する単位であり、スコープはその名前を参照できるプログラムテキストの範囲である。両者は関係するが同一概念ではない。スコープと名前探索の詳細は、後続の名前束縛のノートで扱う。

宣言空間は名前の衝突を判定する単位である。同一宣言空間に同じ名前を導入することは原則としてコンパイル時エラーになる。ただし、同名の名前空間宣言は一つの論理名前空間へ集約され、同名のメソッドはシグネチャが異なればオーバーロードとして共存できる。また、同名かつ同種の`partial`型宣言は一つの型定義へ統合される。[^2][^11]

コンパイル単位はC#コンパイラへの言語仕様上の入力単位である。一つのC#プログラムは一つ以上のコンパイル単位から成り、通常は複数の`.cs`ファイルが一つのプロジェクト内でまとめてコンパイルされる。複数のコンパイル単位に含まれるトップレベルの名前空間メンバー宣言は、単一のグローバル名前空間へ寄与する。したがって、`.cs`ファイルは物理的な保存単位であり、それ自体が独立した名前空間や実行単位を構成するわけではない。[^3]

名前空間宣言は名前空間の宣言空間へ型や入れ子名前空間を導入する。名前空間は開いた構造であり、同じ完全修飾名を持つ複数の名前空間宣言は同じ宣言空間へ寄与する。したがって次の二つの宣言は、同じ`Example.Model`名前空間へ別々の型を追加する。

```csharp
namespace Example.Model
{
    public sealed class Customer { }
}

namespace Example.Model
{
    public sealed class Order { }
}
```

型宣言は、新しい型とその型の内部宣言空間を作る。`class`、`struct`、`interface`、`enum`、`delegate`はいずれも型宣言である。ただし、各型宣言が許すメンバーの種類は同一ではない。たとえば、クラスはフィールド、定数、メソッド、プロパティ、イベント、インデクサ、演算子、コンストラクター、ファイナライザー、入れ子型を宣言できるが、列挙型の主要な宣言対象は列挙メンバーである。[^2][^4]

メンバー宣言は、型の宣言空間へメンバーを導入する。クラス、構造体、インターフェイスでは、メンバーの許可範囲、既定アクセシビリティ、継承との関係が異なる。基底クラスのメンバーは派生型のメンバー探索に関与するが、派生型自身の宣言空間へ直接追加されるわけではない。このため、派生型は基底型と同名のメンバーを宣言できる。その場合、overrideではなく隠蔽になることがある。[^2][^4]

ローカル宣言は、メソッド本体、アクセサ本体、ラムダ式、ローカル関数、ブロック、`switch`ブロック、反復文、`using`文、パターンなどによって形成されるローカル変数宣言空間へ名前を導入する。ローカル宣言空間では、外側のローカル変数やパラメーターと同じ名前を入れ子のローカル宣言空間で再宣言できない場合がある。これは、型メンバーの隠蔽とは異なる規則である。[^2]

宣言順序は、一般には名前探索の可否を決定しない。名前空間、型、メソッド、プロパティ、イベント、インデクサ、演算子、コンストラクターなどは、テキスト上の出現順に依存せず参照できる。一方で、フィールド初期化子の実行順序、ローカル変数の使用前宣言、列挙メンバーの省略値の決定には、宣言順序が意味を持つ。したがって宣言順序が意味論に関与する場面は限定して読む必要がある。[^2]

## 4.2 名前空間と型宣言

名前空間は、プログラム要素を論理的に編成し、外部へ提示する名前の階層を構成する。名前空間自体には`public`、`internal`、`private`、`protected`などのアクセシビリティを指定できない。名前空間名はアクセス制限の対象ではなく、アクセス制限は名前空間内に宣言される型や型メンバーに適用される。[^3][^10]

ブロック形式の名前空間宣言は、`namespace N { ... }`の形で本体を持つ。これに対して、ファイルスコープ名前空間（file-scoped namespace）は`namespace N;`の形で、そのファイル内の後続の名前空間メンバー宣言をその名前空間に属させる。ファイルスコープ名前空間は、入れ子の波括弧を減らすための構文であり、型の意味やメタデータ上の名前を別概念へ変えるものではない。[^3][^7]

```csharp
namespace Example.Model;

public sealed class Customer
{
    public required string Name { get; init; }
}
```

この宣言は、`Example.Model.Customer`という型を導入する。ここで`namespace Example.Model;`は、ファイル内の後続の型宣言が属する名前空間を定める。名前空間は物理ディレクトリと一致する必要はないが、実務上はディレクトリ構成、アセンブリ境界、公開APIの見通しと整合させることが多い。

`class`宣言は参照型を定義する。クラスはインスタンス状態、静的状態、コンストラクター、継承、仮想メンバー、インターフェイス実装、入れ子型を持てる。クラスの詳細な意味論は、参照型、継承、メンバー意味論のノートで扱う。本ノートでは、クラスが最も広いメンバー分類を受け入れる型宣言であることを押さえる。[^4]

`struct`宣言は値型を定義する。構造体は値としてコピーされる型であり、クラスとは継承可能性、既定コンストラクター、フィールド初期化、boxing、`readonly struct`、`ref struct`などの点で異なる。構造体にもフィールド、メソッド、プロパティ、イベント、インデクサ、演算子、コンストラクター、入れ子型などを宣言できるが、ファイナライザーは宣言できない。[^5]

`interface`宣言は、実装型が満たすべきメンバー集合を表す。現代のC#では、インターフェイスは単なるインスタンスメソッド集合に限られない。プロパティ、イベント、インデクサ、既定実装、静的メンバー、静的抽象メンバー、分散型パラメーターなどを持ち得る。ただし、インターフェイスの設計上の意味は、クラス継承とは異なる。詳細は継承・インターフェイスのノートで扱う。[^6]

`enum`宣言は、名前付き定数の集合として列挙型を定義する。列挙型は値型であり、基底となる整数型を持つ。列挙メンバーは列挙型の宣言空間へ導入され、メンバー名と値の対応を形成する。列挙値の安全な扱い、未定義値、フラグ列挙は値型のノートで扱う。

`delegate`宣言は、呼び出し可能なメソッドシグネチャを表す参照型を定義する。デリゲート型は、メソッド、ラムダ式、匿名関数、イベント、非同期処理と密接に関係する。ここでは、デリゲートが型宣言であり、単なる関数ポインター構文ではないことを確認すれば足りる。詳細はデリゲート、イベント、ラムダ式のノートで扱う。

`record`は、`record class`または`record struct`として、クラスまたは構造体に値的等値性、`with`式、分解、印字向けメンバーなどの合成規則を加える宣言形式である。修飾なしの`record`は`record class`を表す。したがってrecordをクラス・構造体とは完全に独立した第3の実行時型分類として読むべきではない。参照型のrecordと値型のrecord structでは、コピー、同一性、等値性、継承可能性が異なる。これらは後続の型分類のノートで扱う。[^4][^5]

ファイルローカル型（file-local type）は、`file`修飾子を付けたトップレベル型である。`file`は通常のアクセシビリティ修飾子ではなく、その型を宣言したソースファイル内に可視性を制限するための修飾子である。`file`型は、主にソースジェネレーター（Source Generator）が生成する補助型の名前衝突を避けるために有用である。`file`修飾子は入れ子型には使えず、`public`や`internal`などのアクセシビリティ修飾子と組み合わせることもできない。[^8]

```csharp
file sealed class GeneratedHelper
{
    public static string Normalize(string value) => value.Trim();
}
```

この型は、同一ファイル内では参照できるが、同じコンパイル対象の別ファイルからは名前で参照できない。公開APIに現れる型ではなく、生成コードやファイル局所の補助実装を閉じ込めるための型として読むべきである。

ファイルローカル型と同じ名前の型が別ファイルに存在しても、それだけでは名前衝突にならない。同一ファイル内では、名前探索においてファイルローカル型が別ファイルの同名型より優先される。この性質により、ソースジェネレーターは生成した補助型の名前を外部の同名型から分離できる。

また、ファイルローカル型は、ファイル外から到達し得る公開API表面へ漏れ出してはならない。具体的には、ファイルローカル型を、より広い可視性を持つ非ファイルローカル型のメンバーの戻り値型、パラメーター型、フィールド型として公開することはできない。これは、ファイル外から参照できない型が、ファイル外から到達可能なシグネチャに現れることを防ぐためである。[^8]

## 4.3 メンバー宣言

メンバー宣言は、型の内部に名前、状態、操作、初期化、変換、入れ子型を導入する。メンバーは、ソースコード上の分類であると同時に、コンパイル後には主としてメタデータ上の型・メンバー定義、属性、アクセシビリティ、シグネチャとして外部化される。メソッド本体、コンストラクター本体、アクセサ本体などの実行可能部分はILとして表現される。したがってメンバー宣言は、実行時のオブジェクト構造と公開API表面の双方に関わる。[^4][^9]

フィールドは、型またはインスタンスに属する変数である。`static`フィールドは型に属し、インスタンスフィールドは各インスタンスに属する。フィールドは実装の状態を直接表すため、公開APIとして露出させると表現公開の問題を生じやすい。フィールド、`readonly`、`static readonly`、不変設計の詳細は後続のメンバー意味論のノートで扱う。

定数は、コンパイル時に評価可能な値を名前に結び付けるメンバーである。`const`で宣言される値は変数ではなく、定数式として扱われる。定数は便利である一方、公開APIで用いる場合にはバイナリ互換性や値のインライン化に注意が必要である。定数は、フィールドと似た構文位置に現れるが、意味論上は異なる。

メソッドは、型またはインスタンスに属する計算や操作を定義するメンバーである。メソッド宣言は、名前、型パラメーター、パラメーターリスト、戻り値型、修飾子、本体から成る。オーバーロード解決、仮想ディスパッチ、拡張メソッド、ローカル関数、ラムダ式との違いは後続のノートで扱う。

コンストラクターは、型のインスタンスを初期化するための特殊なメンバーである。インスタンスコンストラクターは型名と同じ名前を持つが、通常のメソッドではなく、戻り値型を持たない。静的コンストラクターは型そのものの初期化に用いられる。コンストラクターは継承されず、初期化順序、`this(...)`、`base(...)`、フィールド初期化子と結び付く。

ファイナライザーは、クラスインスタンスが破棄される前に実行され得る後始末のためのメンバーである。ただし、ファイナライザーの実行時期は決定的ではなく、リソース管理の通常手段ではない。実務上の資源管理は`IDisposable`や`IAsyncDisposable`を中心に設計する。ファイナライザーは構造体やインターフェイスには宣言できない。

プロパティは、フィールドのような構文で読み書きされるが、実体としてはアクセサを持つメンバーである。`get`、`set`、`init`アクセサにより、読み取り、書き込み、初期化時書き込みを制御する。プロパティは、API表面では状態として見えるが、実装上は計算、検証、遅延評価、通知などを含み得る。

インデクサは、型のインスタンスを配列のような構文で索引付けするメンバーである。構文上は`this[...]`で宣言され、プロパティと同様にアクセサを持つ。インデクサはコレクション的な型に適するが、例外、範囲、計算量、可変性の契約を明確にしなければならない。

イベントは、購読と解除のためのメンバーである。フィールド風イベントはコンパイラが補助的な格納域と`add`/`remove`を生成する。一方で、明示的なイベントアクセサを持つイベントでは、購読管理を実装者が制御する。イベントはデリゲート型と密接に関係するが、デリゲートフィールドそのものではない。

演算子は、ユーザー定義型に対して演算子構文の意味を与えるメンバーである。算術演算、比較、変換演算子などを型に合わせて定義できる。ただし、演算子は構文上短く見えるため、等値性、順序、例外、暗黙変換との整合性を崩すとAPIの理解を難しくする。演算子設計は後続のメンバー意味論と変換のノートで扱う。

入れ子型は、型の内部に宣言される型である。入れ子型は、外側の型の論理的一部として名前付けされるが、インスタンスメンバーのように外側のインスタンスへ自動的に結合されるわけではない。入れ子型は、補助型の名前空間汚染を避けるために有用だが、過度に用いると公開APIの見通しを悪化させる。

## 4.4 アクセシビリティ

アクセシビリティは、型またはメンバーへのアクセスが許されるプログラムテキストの範囲を定める。これは、名前が存在するかどうか、メンバーが継承されるかどうか、実行時に実体があるかどうかとは別の概念である。特に、基底クラスの`private`メンバーは派生型のメンバー集合に含まれ得るが、派生型からアクセスできるわけではない。[^2]

`public`は、含んでいる型自体がアクセス可能である範囲において、外部からアクセス可能な宣言を表す。ただし、`internal`型の中に`public`メンバーを宣言しても、そのメンバーのアクセシビリティ領域は外側の`internal`型によって制限される。メンバーのアクセシビリティは、包含する型のアクセシビリティを超えられない。[^2][^10]

`internal`は、同一アセンブリ内からアクセス可能な宣言を表す。C#における`internal`の境界は、名前空間ではなくアセンブリである。したがって、同じ名前空間に属していても別アセンブリであればアクセスできず、異なる名前空間でも同じアセンブリであればアクセスできる。

`private`は、宣言を含む型の内部にアクセスを限定する。型メンバーでアクセシビリティを省略した場合、多くの文脈では`private`が既定になる。`private`は実装詳細を閉じ込めるための基本手段であり、公開API表面を最小化するうえで最初に検討すべき選択である。

`protected`は、宣言を含む型およびその派生型からアクセス可能なメンバーを表す。ただし、派生型であれば任意の基底型インスタンスを通じてアクセスできるわけではない。protectedアクセスには、派生型のインスタンスを通じたアクセスであることなどの制約がある。[^2]

`protected internal`は、`protected`と`internal`の和に相当する。すなわち、同一アセンブリ内から、または派生型からアクセスできる。これは「同一アセンブリ内か派生型」の意味であり、「同一アセンブリ内の派生型だけ」ではない。

`private protected`は、`protected`と`internal`の積に相当し、同一アセンブリ内で、宣言を含む型自身またはその派生型のプログラムテキストからのアクセスに限定する。直感的には、「同じアセンブリ内で、かつ包含型またはその派生型からアクセス可能」という範囲である。`protected internal`より狭い。[^2]

トップレベル型、すなわち名前空間またはコンパイル単位に直接宣言される型は、通常`public`または`internal`を指定でき、既定は`internal`である。クラスメンバーの既定は`private`である。構造体メンバーも既定は`private`である。構造体は継承をサポートせず、常に暗黙にsealedであるため、構造体で新たに導入されるメンバーには`protected`、`protected internal`、`private protected`を指定できない。[^2][^5][^10]

インターフェイスメンバーは、既定では`public`として扱われる。ただし、現代C#ではインターフェイスメンバーに明示的なアクセス修飾子を指定できる。`private`インターフェイスメンバーは、実装型に要求される契約ではなく、インターフェイス内の既定実装を補助するための実装詳細として位置付けられ、実装本体を持つ必要がある。[^6]

アクセシビリティはAPI設計の主要な道具である。`public`は利用者の依存対象になる。`protected`は派生型の依存対象になる。`internal`はアセンブリ内の実装協調に使えるが、テストや`InternalsVisibleTo`と結び付くと境界が曖昧になりやすい。`private`は実装変更の自由度を最大化する。公開APIでは、必要最小限のアクセシビリティを選ぶことが保守性と互換性の前提になる。

また、アクセシビリティと継承可能性は同一ではない。`public`クラスであっても`sealed`であれば継承できない。`protected`メンバーは派生型に対する拡張点になるが、同時に基底型の実装変更を難しくする。したがって公開型において`public`、`protected`、`virtual`、`abstract`を付けることは、単に「見える」範囲を広げるだけでなく、将来の互換性制約を増やす設計判断である。

## 4.5 修飾子の体系

修飾子は宣言の性質を指定する語である。ただしすべての修飾子が同じ分類に属するわけではない。アクセシビリティを定めるもの、静的・インスタンスの所属を定めるもの、継承と仮想ディスパッチに関与するもの、初期化と不変性に関わるもの、外部実装やunsafe文脈を示すものがある。したがって修飾子は一覧として覚えるより、どの意味軸に属するかで分類して読むべきである。

`static`は、メンバーまたは型がインスタンスではなく型そのものに属することを示す。静的フィールド、静的メソッド、静的プロパティ、静的コンストラクターは、インスタンスごとではなく型単位で扱われる。静的クラスはインスタンス化できず、静的メンバーだけを含む。`static`は記憶域、呼び出し構文、初期化時期、ジェネリック型の閉じた型ごとの状態に影響する。

`static`メンバーは、通常のインスタンス仮想ディスパッチ対象にはならない。ただし、インターフェイスでは`static abstract`や`static virtual`メンバーを宣言できる。これはインスタンスディスパッチではなく、型パラメーター制約を通じた静的多相性に関係する機能であり、通常のインスタンス仮想呼び出しとは区別される。[^6]

`abstract`は、型またはメンバーが未完成の抽象を表すことを示す。抽象クラスは直接インスタンス化できず、抽象メンバーは派生型で実装される必要がある。抽象メンバーは本体を持たず、暗黙に仮想的な拡張点になる。ただし、`abstract`と`virtual`を同じメンバーへ同時に指定することはできない。

`virtual`は、派生型でoverride可能なインスタンスメンバーを示す。`override`は、基底型の仮想メンバーを上書きすることを示す。`sealed override`は、overrideしたメンバーをさらに派生型でoverrideできないように閉じる。これらは、メソッド呼び出しの静的な形ではなく、実行時ディスパッチと継承設計に関与する。[^4]

`new`は、継承メンバーを隠蔽することを明示する修飾子である。これはオブジェクト生成式の`new`とは別である。派生型で基底型と同じ名前のメンバーを宣言し、それがoverrideではない場合、基底メンバーを隠蔽する。`new`修飾子は隠蔽を発生させるのではなく、隠蔽が生じる宣言に対して意図を明示する。`new`を省略しても、条件を満たせば隠蔽自体は成立し、通常は警告の対象になる。隠蔽とoverrideは、名前が同じでも意味が異なる。

`readonly`は、フィールドまたは構造体などに読み取り専用性を与える。`readonly`フィールドは、宣言時またはコンストラクター内など限られた位置でのみ代入できる。`readonly struct`は、インスタンス状態の変更を制限し、値型の防御的コピーやAPI設計にも関係する。ただし、`readonly`は参照先オブジェクトの深い不変性を保証するものではない。

`const`は、コンパイル時定数を宣言するためのキーワードである。厳密には任意の宣言へ付ける一般修飾子ではなく、定数宣言を構成する。`const`値はコンパイル時定数式でなければならず、実行時に値を差し替えるための仕組みではない。変更され得る値、参照型の不変オブジェクト、バージョンをまたぐ公開値には、`static readonly`を検討することが多い。

`required`は、オブジェクト初期化時に設定を要求するメンバーを表す。`required`は、コンストラクターとオブジェクト初期化子の設計に関係する。これは実行時に自動検証を挿入する一般機構ではなく、コンパイル時の初期化契約を表すための言語機能である。

`init`は、修飾子というよりプロパティまたはインデクサのアクセサ種別である。`set`が通常の代入可能性を与えるのに対し、`init`はプロパティまたはインデクサへの代入をオブジェクト初期化時に制限する。これはプロパティまたはインデクサに対する代入可能な時期を初期化時に制限する機構であり、参照先オブジェクトの深い不変性を保証するものではない。[^15]

`extern`は、メンバーの実装がC#本体として与えられないことを示す。外部実装、相互運用、ランタイム提供の実装などと関係する。`extern`メンバーは本体を持たないため、通常のC#メソッド本体と同じ観察対象ではない。相互運用やunsafeとの関係は後続のノートで扱う。

`unsafe`は、ポインター型、固定バッファー、ポインター演算など、検証可能性から外れる可能性のあるコード文脈を許可する。`unsafe`は、型、メンバー、ブロックなどに現れ得るが、使用にはコンパイラオプション側の許可も必要になる。`unsafe`は性能目的の万能手段ではなく、境界を限定して監査可能にすべき機能である。

修飾子には併用制約がある。たとえば、`abstract`メンバーは実装本体を持たず、`sealed`メソッドは`override`と結び付く。`static`メンバーはインスタンスの仮想ディスパッチ対象にならない。`readonly struct`にはインスタンスフィールドの制約がある。`partial`メンバーにも、宣言部と実装部の一致規則がある。修飾子は独立したフラグの集合ではなく、宣言種別ごとの文法と意味規則に従って組み合わされる。

## 4.6 `partial`と生成コード

`partial`は、一つの型またはメンバーの定義を複数の宣言へ分割するための仕組みである。`partial`型は、`class`、`struct`、`interface`、およびrecord形式で利用できる。列挙型とデリゲート宣言には`partial`を付けられない。`partial`型の各部分は同一のコンパイル対象に含まれていなければならず、コンパイル時に一つの型へ統合される。既にコンパイル済みの型を別コンパイルで後から拡張する機構ではない。[^11]

```csharp
public partial class Customer
{
    public required string Name { get; init; }
}

public partial class Customer
{
    public string DisplayName => Name.Trim();
}
```

この二つの宣言は、同一コンパイル対象内で一つの`Customer`型へ統合される。各部分のメンバーは、最終的な型のメンバー集合へ加わる。属性、XMLドキュメントコメント、型パラメーター、基底型、実装インターフェイスなどには統合規則があるため、単純なテキスト連結として理解すべきではない。[^11]

`partial`型の典型的な用途は、手書きコードと生成コードの分離である。UIデザイナー、シリアライザ、正規表現、ロギング、メトリクス、相互運用、AOT/trimming対応のための生成コードなどでは、利用者が宣言した型の別部分をツールが生成することがある。ここで重要なのは、生成された部分も同じコンパイル対象として扱われることである。生成コードは実行時に型へ動的に追加されるのではない。[^11][^12]

`partial`メソッド（partial method）は、`partial`型内で宣言部と実装部を分離できるメンバーである。歴史的には、戻り値`void`、アクセシビリティなし、`out`パラメーターなしなどの制約を満たす`partial`メソッドは、実装部が存在しなければコンパイル時に削除され得た。現代の`partial`メンバー（partial member）では、公開メソッド、戻り値を持つメソッド、プロパティ、インデクサなど、より広い対象に対して宣言部と実装部の対応を表現できる。ただし、制約を満たさない`partial`メンバーには実装部が必要になる。[^12]

[C# 13+] `partial`プロパティ（partial property）および`partial`インデクサ（partial indexer）は、C# 13以降で導入された`partial`メンバーである。これらは、宣言部でAPI表面を示し、別の部分でアクセサ実装を与える用途に適する。`partial`プロパティおよび`partial`インデクサの実装部は自動実装構文にはできず、少なくとも一つのアクセサ実装を持つ必要がある。これは、宣言部と実装部の構文上の区別を保つためである。[^13]

```csharp
public partial class Settings
{
    public partial string Name { get; set; }
}

public partial class Settings
{
    private string _name = "";

    public partial string Name
    {
        get => _name;
        set => _name = value.Trim();
    }
}
```

[C# 14+] `partial`イベント（partial event）および`partial`コンストラクター（partial constructor）は、C# 14で導入された`partial`メンバーである。`partial`イベントは、宣言部と実装部を分け、実装部で`add`/`remove`アクセサを与える。`partial`コンストラクターは、宣言部でコンストラクターシグネチャを示し、実装部で本体を与える。いずれも、ソースジェネレーターや相互運用コード生成との相性を高めるための拡張である。[^14]

`partial`イベントの定義宣言は、構文上はフィールド風イベントに似た形で書かれる。しかし、`partial`イベント全体は通常のフィールド風イベントではない。コンパイラはバッキングフィールドや既定の`add`/`remove`アクセサを生成せず、実装宣言側で`add`/`remove`アクセサを明示しなければならない。[^14]

`partial`コンストラクターは、`partial`型のメンバーとしてのみ宣言でき、定義宣言と実装宣言を一つずつ持つ。定義宣言にはコンストラクター初期化子を置けず、`this(...)`または`base(...)`は実装宣言側に置く。[^14]

```csharp
public partial class Notifier
{
    public partial event System.EventHandler Changed;
}

public partial class Notifier
{
    private System.EventHandler? _changed;

    public partial event System.EventHandler Changed
    {
        add => _changed += value;
        remove => _changed -= value;
    }

    protected void OnChanged() => _changed?.Invoke(this, System.EventArgs.Empty);
}
```

`partial`と生成コードを用いる設計では、手書きコードと生成コードの境界を明確にする必要がある。手書き側には安定した宣言、ドキュメント、利用者が読むべきAPI表面を置く。生成側には反復的・機械的・環境依存的な実装を置く。生成コードへ手で修正を加える設計は避けるべきであり、生成元となる属性、`partial`宣言、設定ファイル、Analyzer診断によって契約を表現するのが望ましい。

また、ソースジェネレーターが補助型を生成する場合、ファイルローカル型は名前衝突の回避に有効である。`partial`は利用者の型へメンバーを接続する仕組みであり、`file`型は生成コード内部の補助実装を閉じ込める仕組みである。両者は同じ生成コード文脈で現れ得るが、役割は異なる。

本ノートで扱った宣言、アクセシビリティ、修飾子、`partial`の規則は、以後の型システム、継承、ジェネリクス、名前束縛、メンバー探索、ソースジェネレーターの理解に接続される。C#コードを読む際には、まず宣言がどの宣言空間へ何を導入し、どのアクセシビリティで公開され、どの修飾子によって意味が制約されているかを確認する必要がある。

[^1]: Ecma International, *ECMA-334: C# Language Specification*, 7th ed., December 2023. C#言語の構文、意味規則、宣言、型、メンバー、適合実装に関する規範的標準。[https://ecma-international.org/publications-and-standards/standards/ecma-334/](https://ecma-international.org/publications-and-standards/standards/ecma-334/)

[^2]: Microsoft Learn, *Basic concepts - C# language specification*, updated 2025-12-09, §7.3 Declarations, §7.4 Members, §7.5 Accessibility. 宣言空間、メンバー分類、アクセシビリティ領域、宣言順序の仕様上の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/basic-concepts](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/basic-concepts)

[^3]: Microsoft Learn, *Namespaces - C# language specification*, updated 2025-09-12, §14.2 Compilation units, §14.3 Namespace declarations. コンパイル単位、名前空間宣言、名前空間の開放性、グローバル名前空間の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/namespaces](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/namespaces)

[^4]: Microsoft Learn, *Classes - C# language specification*, updated 2025-12-09, §15.2 Class declarations, §15.3 Class members, §15.4–§15.13. クラス宣言、クラスメンバー、`partial`型、フィールド、メソッド、プロパティ、イベント、演算子、コンストラクター、ファイナライザーの仕様上の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

[^5]: Microsoft Learn, *Structs - C# language specification*, updated 2025-12-09, §16.2 Struct declarations. 構造体宣言、`readonly struct`、`ref struct`、構造体メンバーの制約。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/structs](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/structs)

[^6]: Microsoft Learn, *Interfaces - C# language specification*, updated 2025-10-23, §19 Interface declarations. インターフェイス宣言、インターフェイス修飾子、アクセシビリティ、分散型パラメーター、静的抽象メンバー、インターフェイスメンバーの仕様上の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/interfaces)

[^7]: Microsoft Learn, *File scoped namespaces - C# feature specifications*, 2023-06-23. ファイルスコープ名前空間（file-scoped namespace）の構文と、通常の名前空間宣言との意味的対応。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-10.0/file-scoped-namespaces](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-10.0/file-scoped-namespaces)

[^8]: Microsoft Learn, *The file keyword - C# reference*, updated 2026-01-26; *File local types - C# feature specifications*, updated 2025-01-29. `file`修飾子、file-local type、アクセシビリティ修飾子との関係、公開シグネチャへの漏出制約、ソースジェネレーターにおける用途。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/file](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/file) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-11.0/file-local-types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-11.0/file-local-types)

[^9]: Ecma International, *ECMA-335: Common Language Infrastructure (CLI)*, 6th ed., June 2012. 型、メンバー、メタデータ、IL、アセンブリ表現の規範的仕様。[https://ecma-international.org/publications-and-standards/standards/ecma-335/](https://ecma-international.org/publications-and-standards/standards/ecma-335/)

[^10]: Microsoft Learn, *Access Modifiers - C# Programming Guide*, updated 2025-12-17. C#のアクセス修飾子、トップレベル型とメンバーの既定アクセシビリティ、`file`との関係の公式解説。[https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/access-modifiers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/access-modifiers)

[^11]: Microsoft Learn, *Partial type - C# Reference*, updated 2026-01-26; *Partial Classes and Members - C# Programming Guide*, updated 2025-11-19. `partial`型、同一コンパイル対象での統合、生成コードとの分離、属性・コメント・メンバー統合の公式解説。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-type](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-type) ; [https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods)

[^12]: Microsoft Learn, *Partial member - C# Reference*, updated 2026-01-26. `partial`メンバーの宣言部・実装部、実装省略可能な`partial`メソッド、ソースジェネレーターとの関係、シグネチャ一致規則。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-member](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-member)

[^13]: Microsoft Learn, *All partial properties and indexers - C# feature specifications*, updated 2024-10-31. C# 13の`partial`プロパティおよび`partial`インデクサ、定義宣言と実装宣言、自動実装構文の制約。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-13.0/partial-properties](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-13.0/partial-properties)

[^14]: Microsoft Learn, *What's new in C# 14*, updated 2025-11-19; *Partial Events and Constructors - C# feature specifications*, updated 2025-08-12. C# 14における`partial`イベントと`partial`コンストラクター、定義宣言と実装宣言、コンストラクター初期化子、フィールド風イベントではないpartial eventの整理。[https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/partial-events-and-constructors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/partial-events-and-constructors)

[^15]: Microsoft Learn, *init - C# Reference*, updated 2025-03-20. `init`アクセサによる初期化時代入、`set`との違い、不変設計との関係。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/init](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/init)
