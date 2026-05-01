---
title: 'ソースコードから実行まで'
description: '本ノートは、C#のソースコードがコンパイルによってアセンブリ、IL、メタデータへ変換され、CLRによってロード、検証、JITコンパイル、実行に至るまでの全体像を整理する。あわせて、コンパイル単位とプロジェクトの関係、実行ファイルの構造、dotnet build・MSBuild・Roslynから成るツールチェーン、top-level statementsを用いた最小プログラムの実行モデルを通じて、C#プログラムをソースから実行までの連続した過程として把握する視点を与える。'
date: 2026-04-19
updated: 2026-04-30
genre:
  - C#
  - Programming
---

C#のソースコードは、コンパイラによって字句列、構文木、意味情報として処理され、最終的にアセンブリへ変換される。生成されるアセンブリには、型やメンバーを記述するメタデータと、メソッド本体を表すILが格納される。必要に応じて、これとは別にデバッグや診断のためのシンボル情報も生成される。生成されたアセンブリは、CLR（Common Language Runtime、共通言語ランタイム）によるロード、検証、JITコンパイル、実行の対象となる。C#プログラムの記述、変換、実行は、ソースコード、コンパイル単位、アセンブリ、実行基盤への受け渡しから成る連続した過程として位置付けられる。[^1][^2][^3]

本ノートの対象は、C#のソースコードがコンパイル単位として扱われ、ビルド文脈の下でアセンブリおよび関連ファイルへ変換され、実行基盤へ受け渡されるまでの構造である。対象はIDEやCLIの操作手順ではなく、ソースコードがどの表現へ落ち、どの主体が何を決めるかという区分である。[^2][^8]

## 2.1 コンパイルの全体像

C#コンパイラは、ソーステキストを字句要素として扱い、そこから構文構造を構成し、さらに名前束縛、型検査、オーバーロード解決、到達可能性、確実な代入（definite assignment）などの意味規則を適用する。C#において、前処理ディレクティブは独立した前処理段階ではなく、字句構造の一部に属する。ここで確定するのは、宣言と名前との対応、式の型、呼び出し候補の選択といった、言語仕様上の意味である。[^1][^4]

言語仕様が与えるのは、プログラムの適格性、意味規則、診断対象となる条件である。これに対して、内部表現、処理順、段階分割はコンパイラ実装の問題に属する。したがって、字句解析、構文解析、意味解析、ローワリング（lowering）、出力（emit）といった段階名は、実装上の観察を表す語であり、そのまま仕様の章立てに対応するものではない。[^1][^12]

コンパイル時の診断は、一様ではない。言語仕様上の不適格性に由来するエラー、コンパイラが生成する警告、nullable文脈やフロー解析に基づく警告、アナライザによる診断、MSBuildやSDKによるビルド診断は、発生主体と根拠が異なる。本ノートでは、C#プログラムとして成立しない条件を言語仕様上の問題として扱い、警告やアナライザ診断は、コンパイル文脈およびツールチェーンの問題として区別する。

Roslynの実装では、ソースコードは構文木とシンボル表現へ整理され、式や文に対する意味付けを経て、反復子、非同期、パターンマッチング、補間文字列、トップレベルステートメント（top-level statements）などの高水準構文が、より基本的な内部表現へ変換されたうえで出力段階へ渡される。この変換はローワリングと呼ばれる。ローワリングの位置付けは、表面上の高水準構文を、生成物として出力しやすい内部表現へ整理する内部変換にある。[^12]

この過程の主要な成果物は、ILとメタデータである。メタデータは、型、メンバー、参照、属性、ジェネリックパラメーター、制約などについての記述であり、ILはその操作列である。ソースコード上の型やメソッドは、テキストとしてではなく、メタデータとILの組としてアセンブリ内に格納される。コンパイル時に固定されるのは、C#の意味論のうちCLI上の表現へ外部化される部分である。[^2][^5]

実行時には、CLRがアセンブリを読み込み、必要なメタデータを参照しながらメソッド本体をJITコンパイルし、プロセッサ固有のコードへ変換する。ここに属するのは、ロード、型解決、検証、JIT最適化、ガベージコレクション管理などである。名前束縛やオーバーロード解決のようなC#言語固有の問題は、この段階には属さない。したがって、「C#ソース→ILとメタデータ→実行時コンパイル→実行」という連鎖において、前者は言語仕様とコンパイラの問題、後者は実行基盤の問題として区分される。[^2][^3][^6]

本ノートでは、管理実行における典型的な経路として、アセンブリのロード後にJITコンパイルを経て実行へ至る流れを基準に記述する。配布形態や実行形態によっては、事前コンパイル済みコードを伴う場合もあるが、それらは後続のノートまたは補足で扱う。

## 2.2 コンパイル単位とプロジェクト

C#プログラムは、一つ以上のコンパイル単位から成る。各コンパイル単位には`using`ディレクティブ、グローバル属性、名前空間メンバー宣言、型宣言などが含まれ、複数のコンパイル単位は一つのコンパイル対象集合として処理される。`.cs`ファイルの位置付けは物理的な保存単位であり、独立した実行単位ではない。[^1][^4]

名前空間は論理的な名前付けの構造であり、物理的なファイル配置とは独立である。ある名前空間に属する宣言は複数ファイルへ分散でき、逆に一つのファイルに複数の名前空間宣言を含めることもできる。`partial`宣言はこの性質を型定義に拡張し、一つの型定義を複数ファイルへ分割したうえで、コンパイル時に一つの型として統合する。ソースファイルの分割は、可読性、責務分離、生成コードとの共存、部分的なコード生成のための編成として位置付けられる。[^4][^7]

コンパイル単位の集合は、通常、アセンブリの生成へ向かう。ただし、ソースファイル、コンパイル単位、名前空間、型、アセンブリは、それぞれ異なる粒度の概念である。ソースファイルは物理的な保存単位、コンパイル単位は言語仕様上の入力単位、アセンブリはCLI上の出力単位である。これらは運用上しばしば重なって見えるが、概念上は別物である。[^1][^2]

実務上のC#では、このソース集合に加えて、参照、ターゲットフレームワーク、コンパイル設定、アナライザ、ソースジェネレーターの有効化などをプロジェクトファイルが定める。SDKスタイルプロジェクトはMSBuildの評価結果に基づいてビルドを構成し、参照解決はプロジェクト参照や`PackageReference`を含むビルド文脈の一部として処理される。コンパイル結果を一意に定める主体はソースコード単体ではなく、プロジェクト設定を含むコンパイル文脈全体である。[^8][^9]

公開用ライブラリでは、実装アセンブリと参照アセンブリという区別がある。前者は実行時に必要な本体、後者はコンパイル時のAPI面だけを表現した軽量な表現である。この区別は言語仕様ではなく、ビルドと配布の問題に属する。ただし、コンパイルが何を入力とし、何を参照して成立するかを示す区分として重要である。[^11]

## 2.3 実行ファイルの構造

C#のビルド結果として得られるアセンブリは、型とリソースの論理単位であり、配置、再利用、バージョン管理、参照解決の基本単位でもある。アセンブリには、少なくともアセンブリマニフェスト、型メタデータ、IL、必要に応じてマニフェストリソースが含まれる。マニフェストは、アセンブリ名、バージョン、カルチャ、公開鍵、参照先アセンブリ、エントリポイントなどを記述するメタデータである。[^2][^5]

ここでのアセンブリは論理単位であり、物理ファイル形式そのものではない。実際の出力は通常、Portable Executable（PE）形式のファイルにCLIヘッダーとメタデータストリームを持つ。したがって、PEはホスト形式、CLIは共通基盤上の実装形式、アセンブリは論理単位という区分で捉えられる。[^2][^5]

メタデータは、型名やメンバー名の一覧にとどまらない。型の継承関係、インターフェイス実装、メソッドシグネチャ、フィールド、属性、ジェネリックパラメーター、制約、参照先アセンブリ、カスタム属性、リソース記述など、後続の検証、ロード、リフレクション、ツール解析に必要な情報を格納する。CLIでは、これらの情報はメタデータ表として構成され、型やメソッドの定義だけでなく、相互参照のための索引構造を伴って保持される。[^2][^5]

これに対してILは、メソッド本体の操作列として位置付けられる。ローカル変数、引数、評価スタック、分岐、例外ハンドラー、メソッド呼び出し、ボックス化、アンボックス化などは、最終的にIL命令列として表現される。アセンブリの実行可能性は、自己記述的なデータとしてのメタデータと、操作列としてのILとの結合によって成立する。[^2][^5]

PDB（Program Database）は、これとは別にデバッグや診断のためのシンボル情報を保持する。今日の.NETではPortable PDBが標準的であり、ソース行との対応、ローカル変数名、シーケンスポイント、非同期メソッドや反復子の対応関係などの情報をデバッガや各種ツールへ提供する。PDBの位置付けはプログラム意味論の本体ではなく、生成コードをソースへ引き戻して観察するための補助情報にある。したがって、アセンブリ本体とPDBとは区別して扱われる。[^10]

ビルド成果物には、`.deps.json`や`.runtimeconfig.json`のように、アセンブリ本体とは別にホストや依存関係解決に用いられる補助ファイルが伴う。これらはCLI仕様上のアセンブリ構造そのものではないが、実際の.NETアプリケーションがどのランタイムで起動し、どの依存関係を読み込むかを定める。したがって、CLI仕様上のアセンブリ構造と、.NET配布物としての構成とは区別される。[^8]

## 2.4 ツールチェーン

現代の.NET開発では、通常、SDKスタイルプロジェクトを`dotnet`コマンドとMSBuildが処理し、その中でC#コンパイラが呼び出される。`dotnet build`の位置付けは、`csc`単体の起動ではなく、必要に応じた復元、MSBuildプロジェクトの評価、参照解決、コンパイル、出力の整理を含む一連の処理の入口にある。ビルドとは、コンパイルそのものに加えて、コンパイルを成立させる文脈の構成を含む操作である。[^8]

このツールチェーンにおいて、MSBuildは、ソース群、参照群、ターゲットフレームワーク、アナライザ、ジェネレーター、条件付き設定を調停する。Roslynは、その文脈の中でC#の構文解析、意味解析、診断、ローワリング、生成物出力（emit）を担うコンパイラ実装である。したがって、「どのコードが受理されるか」は主としてコンパイラの問題であり、「どの入力と設定でそのコンパイラが走るか」はビルドシステムの問題である。[^8][^12]

`dotnet run`、`dotnet publish`、`dotnet test`は、ビルドと実行・配置・テストを異なる目的で包んだ操作であり、生成される成果物の形も異なり得る。たとえば、publishでは、開発用ビルドとは異なる依存関係の取り込みやホストの配置が行われる。したがって、観察対象がコンパイル結果なのか、配布物なのかという区別が必要である。[^8]

生成物の観察には、ILDASMのような公式ツールが用いられる。ILDASMはPEファイル中のILとメタデータを表示し、アセンブリマニフェストや参照関係の確認のための手段である。実務ではILSpyのような外部デコンパイラも広く用いられるが、これらの位置付けは生成物を観察する道具であって、言語仕様そのものではない。逆アセンブル結果や逆コンパイル結果は、コンパイル結果を読むための観察資料として扱われる。[^14][^15]

さらに、RoslynのAPIやアナライザ基盤の利用対象には、構文木、シンボル、型情報、フロー解析結果などが属する。ここで成立するのは、テキストの読解だけではなく、生成物観察とコンパイラ情報観察という二つの経路である。前者は生成されたアセンブリの観察、後者はコンパイラ実装の観察として区別される。[^12]

## 2.5 最小プログラムの分解

最小のコンソールアプリケーションは、今日では次のように書ける。

```csharp
Console.WriteLine("Hello, World!");
```

この記法はトップレベルステートメント（top-level statements）によるものであり、明示的な`Program`クラスや`Main`メソッドを書かなくても、実行可能プロジェクトとしての入口を表現する。ここで与えられるのは、実行入口の省略ではなく、その簡略な記述様式である。コンパイラは、これを入口点を持つ形へ変換し、ソース上の簡潔さを生成物側で吸収する。[^13]

この最小形は、少なくとも三つの層へ分解される。第一に、ソース上には`Console.WriteLine`という文だけが現れる。第二に、コンパイラはそれを暗黙の型と入口点を持つ実行可能アセンブリとして編成し、必要なメタデータとILを生成する。第三に、実行時にはCLRがそのアセンブリを読み込み、入口から実行を開始する。トップレベルステートメントの位置付けは、既存の実行モデルに対する簡略記法にある。[^3][^13]

トップレベルステートメントは、明示的な`Program`クラスや`Main`メソッドをソース上に書かずに、実行可能プロジェクトの入口を記述する構文である。コンパイラは、トップレベルステートメントを含むコンパイル対象に対して、実行入口となるメソッドを生成する。そのシグネチャは、`await`および`return`の有無に応じて変化する。[^13][^16]

トップレベルステートメントを含められるコンパイル単位はプロジェクト内で一つだけであり、同時に明示的な`Main`を持っていても、トップレベルステートメントが存在する場合にはそちらが入口点として優先される。ここでの制約は、実行開始位置の一意性を保つためのものである。暗黙の`Program`型は、ソース上のAPI面ではなく、入口点を保持するためのコンパイラ生成の器として位置付けられる。[^13][^16]

この最小例を逆アセンブルした結果には、アセンブリマニフェスト、型定義、メソッド定義、ローカル変数情報、IL命令列、必要に応じたPDB上の対応情報が含まれる。最小プログラムの観察は、以後のノートで扱う型、束縛、変換、非同期、メタデータ、状態機械変換を読むための最初の足場として位置付けられる。[^10][^14]

ファイルベースアプリは、トップレベルステートメントによる低儀式的な入口記述を、.NET SDKの実行モデルへ接続する機能である。これは、単一のC#ソースファイルを、明示的なプロジェクトファイルなしに`dotnet`ホストからビルドおよび実行する形態であり、C#言語の構文規則だけで完結する機能ではない。ソースファイルは通常のC#プログラムとして扱われるが、プロジェクトファイルに相当する設定の一部は、SDK側で生成または解釈される。

C# 14以降のファイルベースアプリでは、Unix系環境での直接実行に用いる`#!`、およびパッケージ、SDK、プロパティなどを指定する`#:`系ディレクティブが導入される。これらはC#の通常の前処理ディレクティブとは同列ではなく、ファイルベースアプリにおいてビルドシステムが扱う指示として位置付けられる。したがって、トップレベルステートメントは言語上の入口記述であり、ファイルベースアプリは.NET SDKによる実行形態である、という区別が必要である。[^17]

以後の議論では、短いソースの背後にも、コンパイル単位、アセンブリ、メタデータ、IL、入口点、実行時コンパイル、ホスト構成という複数の層があることを前提とする。本ノート群全体の出発点は、C#を表面構文だけで読むのではなく、どの段階でどの情報が固定され、どの段階でどの責務が現れるかを追跡することにある。[^1][^2][^3]

[^1]: Ecma International, *ECMA-334: C# Language Specification*, 7th ed., December 2023. C#言語の適格性、意味規則、コンパイル単位、名前空間、型宣言などの規範的定義。[https://ecma-international.org/wp-content/uploads/ECMA-334_7th_edition_december_2023.pdf](https://ecma-international.org/wp-content/uploads/ECMA-334_7th_edition_december_2023.pdf)。

[^2]: Ecma International, *ECMA-335: Common Language Infrastructure (CLI)*, 6th ed., June 2012, Partition I–III. CLI、IL、メタデータ、アセンブリ、PE上のCLI表現に関する規範的定義。[https://ecma-international.org/wp-content/uploads/ECMA-335_6th_edition_june_2012.pdf](https://ecma-international.org/wp-content/uploads/ECMA-335_6th_edition_june_2012.pdf)。

[^3]: Microsoft Learn, *Managed Execution Process*. コンパイルからIL生成、JITコンパイル、実行までの管理実行過程の整理。[https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process)。

[^4]: Microsoft Learn, *6 Lexical structure - C# language specification*; *Namespaces - C# language specification*. 字句構造、前処理ディレクティブ、コンパイル単位、`using`、名前空間に関する仕様準拠文書。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/lexical-structure](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/lexical-structure) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/namespaces](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/namespaces)。

[^5]: Microsoft Learn, *Metadata and Self-Describing Components*; *Assemblies in .NET*; *Assembly manifest*. メタデータ、自己記述性、アセンブリ、マニフェストの位置付け。[https://learn.microsoft.com/en-us/dotnet/standard/metadata-and-self-describing-components](https://learn.microsoft.com/en-us/dotnet/standard/metadata-and-self-describing-components) ; [https://learn.microsoft.com/en-us/dotnet/standard/assembly/](https://learn.microsoft.com/en-us/dotnet/standard/assembly/) ; [https://learn.microsoft.com/en-us/dotnet/standard/assembly/manifest](https://learn.microsoft.com/en-us/dotnet/standard/assembly/manifest)。

[^6]: Microsoft Learn, *Common Language Runtime (CLR) overview*; *Managed Execution Process*. CLRが担う実行時サービスと管理実行過程の整理。[https://learn.microsoft.com/en-us/dotnet/standard/clr](https://learn.microsoft.com/en-us/dotnet/standard/clr) ; [https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process)。

[^7]: Microsoft Learn, *Partial type - C# reference*; *Partial Classes and Members*. `partial`による型定義分割と、同一プロジェクト内の複数ファイルへの分散の整理。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-type](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-type) ; [https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods)。

[^8]: Microsoft Learn, *.NET project SDK overview*; *dotnet build*. SDKスタイルプロジェクト、MSBuild、`dotnet build`、関連成果物の位置付け。[https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview) ; [https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build)。

[^9]: NuGet documentation, *PackageReference in project files*; Microsoft Learn, *MSBuild reference for .NET SDK projects*. `PackageReference` とMSBuild設定による参照解決およびビルド文脈の構成。[https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files) ; [https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props)。

[^10]: Microsoft Learn, *Symbols in .NET*. PDBとシンボル情報の役割、ソースとバイナリの対応付け。[https://learn.microsoft.com/en-us/dotnet/core/diagnostics/symbols](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/symbols)。

[^11]: Microsoft Learn, *Reference assemblies - .NET*. 実装アセンブリと参照アセンブリの区別。[https://learn.microsoft.com/en-us/dotnet/standard/assembly/reference-assemblies](https://learn.microsoft.com/en-us/dotnet/standard/assembly/reference-assemblies)。

[^12]: GitHub, *Roslyn Overview*. RoslynのAPI層と従来型コンパイラパイプラインとの対応、構文木・意味解析・診断の位置付け。[https://github.com/dotnet/roslyn/blob/main/docs/wiki/Roslyn-Overview.md](https://github.com/dotnet/roslyn/blob/main/docs/wiki/Roslyn-Overview.md)。

[^13]: Microsoft Learn, *Top-level statements - programs without Main methods - C#*; *General structure of a C# program*. トップレベルステートメント、入口点規則、暗黙の`Program`に関する整理。[https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/top-level-statements](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/top-level-statements) ; [https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/)。

[^14]: Microsoft Learn, *How to: View assembly contents*; *Ildasm.exe (IL Disassembler)*. ILDASMによるILおよびアセンブリマニフェストの観察。[https://learn.microsoft.com/en-us/dotnet/standard/assembly/view-contents](https://learn.microsoft.com/en-us/dotnet/standard/assembly/view-contents) ; [https://learn.microsoft.com/en-us/dotnet/framework/tools/ildasm-exe-il-disassembler](https://learn.microsoft.com/en-us/dotnet/framework/tools/ildasm-exe-il-disassembler)。

[^15]: GitHub, *icsharpcode/ILSpy*. .NETアセンブリブラウザ兼デコンパイラとしての外部観察ツール。[https://github.com/icsharpcode/ilspy](https://github.com/icsharpcode/ilspy)。

[^16]: Microsoft Learn, *Resolve errors and warnings related to a program entry point*; *Main() and command-line arguments - C#*. 入口点シグネチャ、`Main`、`StartupObject`、トップレベルステートメントと入口点の関係。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/entry-point-errors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/entry-point-errors) ; [https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/main-command-line](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/main-command-line)。

[^17]: Microsoft Learn, *File-based apps - .NET*; *Preprocessor directives - C# reference*; *Tutorial: Build file-based C# programs*. ファイルベースアプリ、`#!`、`#:`系ディレクティブ、および.NET SDKによる単一C#ファイル実行モデルの整理。
