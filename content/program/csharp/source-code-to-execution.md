---
title: 'ソースコードから実行まで'
description: '本ノートは、C#のソースコードがコンパイルによってアセンブリ、IL、メタデータへ変換され、CLRによってロードされ、典型的な管理実行でJITコンパイルと実行に至るまでの全体像を整理する。あわせて、コンパイル単位とプロジェクトの関係、実行ファイルの構造、dotnet build・MSBuild・Roslynから成るツールチェーン、トップレベルステートメントを用いた最小プログラムの実行モデルを通じて、C#プログラムをソースから実行までの連続した過程として把握する視点を与える。'
date: 2026-04-19
updated: 2026-05-04
genre:
  - C#
  - Programming
status: wip
---

C#のソースコードはコンパイラによって字句列、構文木、意味情報として処理され、最終的にアセンブリへ変換される。生成されるアセンブリには型やメンバーを記述するメタデータと、メソッド本体を表すILが格納される。必要に応じてこれとは別にデバッグや診断のためのシンボル情報も生成される。生成されたアセンブリはCLR（Common Language Runtime、共通言語ランタイム）によってロードされる。典型的な管理実行では、必要になったメソッド本体のILがJITコンパイルされ、プロセッサ固有のコードとして実行される。検証や事前コンパイル済みコードの扱いは、実行環境および配布形態に依存する。C#プログラムの記述、変換、実行は、ソースコード、コンパイル単位、アセンブリ、実行基盤への受け渡しから成る連続した過程として位置付けられる。[^1][^2][^3]

本ノートの対象は、C#のソースコードがコンパイル単位として扱われ、ビルド文脈の下でアセンブリおよび関連ファイルへ変換され、実行基盤へ受け渡されるまでの構造である。対象はIDEやCLIの操作手順ではなくソースコードがどの表現へ落ち、どの主体が何を決めるかという区分である。[^2][^8]

## 2.1 コンパイルの全体像

C#コンパイラはソーステキストを字句要素として扱い、そこから構文構造を構成し、さらに名前束縛、型検査、オーバーロード解決、到達可能性、確実な代入（definite assignment）などの意味規則を適用する。C#において前処理ディレクティブは、独立した前処理段階ではなく字句構造の一部に属する。ここで確定するのは、宣言と名前との対応、式の型、呼び出し候補の選択といった言語仕様上の意味である。[^1][^4]

言語仕様が与えるのはプログラムの適格性、意味規則、診断対象となる条件である。これに対して内部表現、処理順、段階分割はコンパイラ実装の問題に属する。したがって字句解析、構文解析、意味解析、ローワリング（lowering）、出力（emit）といった段階名は、実装上の観察を表す語であり、そのまま仕様の章立てに対応するものではない。[^1][^12]

コンパイル時の診断は一様ではない。言語仕様上の不適格性に由来するエラー、コンパイラが生成する警告、nullable文脈やフロー解析に基づく警告、アナライザによる診断、MSBuildやSDKによるビルド診断は発生主体と根拠が異なる。本ノートではC#プログラムとして成立しない条件を言語仕様上の問題として扱い、警告やアナライザ診断はコンパイル文脈およびツールチェーンの問題として区別する。

Roslynの実装ではソースコードは構文木とシンボル表現へ整理され、式や文に対する意味付けを経て、反復子、非同期、パターンマッチング、補間文字列、トップレベルステートメント（top-level statements）などの高水準構文がより基本的な内部表現へ変換されたうえで出力段階へ渡される。この変換はローワリングと呼ばれる。ローワリングの位置付けは、表面上の高水準構文を生成物として出力しやすい内部表現へ整理する内部変換にある。[^12]

この過程の主要な成果物はILとメタデータである。メタデータは、型、メンバー、参照、属性、ジェネリックパラメーター、制約などについての記述であり、ILはメソッド本体を表す操作列である。ソースコード上の型やメソッドはテキストとしてではなくメタデータとILの組としてアセンブリ内に格納される。コンパイル時に固定されるのはC#の意味論のうち、CLI上の表現へ外部化される部分である。[^2][^5]

典型的な管理実行ではCLRがアセンブリを読み込み、必要になったメソッド本体のILをJITコンパイルし、プロセッサ固有のコードとして実行する。ここに属するのはロード、型解決、JITコンパイル、最適化、ガベージコレクションなどの実行時サービスである。検証の有無や範囲、事前コンパイル済みコードの利用は、実行環境、信頼境界、配布形態に依存する。名前束縛やオーバーロード解決のようなC#言語固有の問題は、この段階には属さない。したがって「C#ソース→ILとメタデータ→実行時コンパイル→実行」という連鎖において、前者は言語仕様とコンパイラの問題、後者は実行基盤の問題として区分される。[^2][^3][^6]

本ノートでは、この典型的な経路を基準に記述する。配布形態や実行形態によっては、事前コンパイル済みコードを伴う場合もあるが、それらは後続のノートまたは補足で扱う。

## 2.2 コンパイル単位とプロジェクト

C#プログラムは一つ以上のコンパイル単位から成る。各コンパイル単位には`using`ディレクティブ、グローバル属性、名前空間メンバー宣言、型宣言などが含まれ、複数のコンパイル単位は一つのコンパイル対象集合として処理される。`.cs`ファイルの位置付けは物理的な保存単位であり、独立した実行単位ではない。[^1][^4]

名前空間は論理的な名前付けの構造であり、物理的なファイル配置とは独立である。ある名前空間に属する宣言は複数ファイルへ分散でき、逆に一つのファイルに複数の名前空間宣言を含めることもできる。`partial`宣言はこの性質を型定義に拡張し、同一の型を構成する複数の部分宣言をコンパイル時に一つの型として統合する。分割された部分は、同一アセンブリ内で同じ名前空間と型名を持つなど、仕様上の条件を満たす必要がある。ソースファイルの分割は可読性、責務分離、生成コードとの共存、部分的なコード生成のための編成として位置付けられる。[^4][^7]

コンパイル単位の集合は通常アセンブリの生成へ向かう。ただしソースファイル、コンパイル単位、名前空間、型、アセンブリは、それぞれ異なる粒度の概念である。ソースファイルは物理的な保存単位、コンパイル単位は言語仕様上の入力単位、アセンブリはCLI上の出力単位である。これらは運用上しばしば重なって見えるが、概念上は別物である。[^1][^2]

実務上のC#ではこのソース集合に加えて、参照、ターゲットフレームワーク、コンパイル設定、アナライザ、ソースジェネレーターの有効化などが、プロジェクトファイルとMSBuildの評価結果によって定まる。SDKスタイルプロジェクトはMSBuildの評価結果に基づいてビルドを構成し、参照解決はプロジェクト参照や`PackageReference`を含むビルド文脈の一部として処理される。コンパイル結果を一意に定める主体はソースコード単体ではなく、SDK、プロジェクト設定、復元されたパッケージ、MSBuildの評価結果を含むコンパイル文脈全体である。[^8][^9]

公開用ライブラリでは実装アセンブリと参照アセンブリという区別がある。前者は実行時に必要な本体、後者はコンパイル時のAPI面だけを表現した軽量な表現である。この区別は言語仕様ではなく、ビルドと配布の問題に属する。ただしコンパイルが何を入力とし、何を参照して成立するかを示す区分として重要である。[^11]

## 2.3 実行ファイルの構造

C#のビルド結果として得られるアセンブリは、型とリソースの論理単位であり、配置、再利用、バージョン管理、参照解決の基本単位でもある。アセンブリには、少なくともアセンブリマニフェスト、型メタデータ、IL、必要に応じてマニフェストリソースが含まれる。マニフェストはアセンブリ名、バージョン、カルチャ、公開鍵、参照先アセンブリ、エントリポイントなどを記述するメタデータである。[^2][^5]

ここでのアセンブリは論理単位であり、物理ファイル形式そのものではない。実際の出力は通常Portable Executable（PE）形式のファイルに、CLIヘッダーとメタデータストリームを持つ。したがってPEはホスト形式、CLIは共通基盤上の実装形式、アセンブリは論理単位という区分で捉えられる。[^2][^5]

メタデータは型名やメンバー名の一覧にとどまらない。型の継承関係、インターフェイス実装、メソッドシグネチャ、フィールド、属性、ジェネリックパラメーター、制約、参照先アセンブリ、カスタム属性、リソース記述など後続の検証、ロード、リフレクション、ツール解析に必要な情報を格納する。CLIではこれらの情報はメタデータ表として構成され、型やメソッドの定義だけでなく相互参照のための索引構造を伴って保持される。[^2][^5]

これに対してILはメソッド本体の操作列として位置付けられる。ローカル変数、引数、評価スタック、分岐、例外ハンドラー、メソッド呼び出し、ボックス化、アンボックス化などは、最終的にIL命令列として表現される。アセンブリの実行可能性は、自己記述的なデータとしてのメタデータと、操作列としてのILとの結合によって成立する。[^2][^5]

PDB（Program Database）はこれとは別にデバッグや診断のためのシンボル情報を保持する。.NETではPortable PDBが標準的に用いられ、ソース行との対応、ローカル変数名、シーケンスポイント、非同期メソッドや反復子の対応関係などの情報をデバッガや各種ツールへ提供する。PDBの位置付けはプログラム意味論の本体ではなく、生成コードをソースへ引き戻して観察するための補助情報にある。したがってアセンブリ本体とPDBとは区別して扱われる。[^10]

ビルド成果物には`.deps.json`や`.runtimeconfig.json`のように、アセンブリ本体とは別にホストや依存関係解決に用いられる補助ファイルが伴う。これらはCLI仕様上のアセンブリ構造そのものではないが、実際の.NETアプリケーションがどのランタイムで起動し、どの依存関係を読み込むかを定める。したがってCLI仕様上のアセンブリ構造と、.NET配布物としての構成とは区別される。[^8]

## 2.4 ツールチェーン

現代の.NET開発では、通常SDKスタイルプロジェクトを`dotnet`コマンドとMSBuildが処理し、その中でC#コンパイラが呼び出される。.NET 10以降では、ファイルベースアプリも`dotnet build`の対象に含まれる。`dotnet build`の位置付けは`csc`単体の起動ではなく、必要に応じた復元、MSBuildによる評価、参照解決、コンパイル、出力の整理を含む一連の処理の入口にある。[^8]

このツールチェーンにおいてMSBuildは、ソース群、参照群、ターゲットフレームワーク、アナライザ、ジェネレーター、条件付き設定を調停する。Roslynはその文脈の中でC#の構文解析、意味解析、診断、ローワリング、生成物出力（emit）を担うコンパイラ実装である。したがって「どのコードが受理されるか」は主としてコンパイラの問題であり、「どの入力と設定でそのコンパイラが走るか」はビルドシステムの問題である。[^8][^12]

`dotnet run`、`dotnet publish`、`dotnet test`は、ビルドと実行・配置・テストを異なる目的で包んだ操作であり、生成される成果物の形も異なり得る。たとえばpublishでは開発用ビルドとは異なる依存関係の取り込みやホストの配置が行われる。したがって観察対象が、コンパイル結果なのか配布物なのかという区別が必要である。[^8]

生成物の観察にはILDASMのような公式ツールが用いられる。ILDASMはPEファイル中のILとメタデータを表示し、アセンブリマニフェストや参照関係の確認のための手段である。実務ではILSpyのような外部デコンパイラも広く用いられるが、これらの位置付けは生成物を観察する道具であって、言語仕様そのものではない。逆アセンブル結果や逆コンパイル結果は、コンパイル結果を読むための観察資料として扱われる。[^14][^15]

さらにRoslynのAPIやアナライザ基盤の利用対象には、構文木、シンボル、型情報、フロー解析結果などが属する。ここで成立するのはテキストの読解だけではなく、生成物観察とコンパイラ情報観察という二つの経路である。前者は生成されたアセンブリの観察、後者はコンパイラ実装の観察として区別される。[^12]

## 2.5 最小プログラムの分解

.NET 6以降のSDKテンプレートで作成されるコンソールアプリケーションでは、トップレベルステートメントを用いた最小例を次のように書ける。

```csharp
Console.WriteLine("Hello, World!");
```

この記法はトップレベルステートメント（top-level statements）によるものであり、明示的な`Program`クラスや`Main`メソッドを書かずに実行可能プログラムの入口を記述する。コンパイラはトップレベルステートメントを含むコンパイル対象に対して実行入口となるメソッドを生成し、必要なメタデータとILを出力する。この生成物はソース上の公開APIではなく、実行開始を成立させるためのコンパイラ生成構造である。トップレベルステートメントの位置付けは、既存の実行モデルに対する簡略記法にある。[^13]

この最小形は少なくとも三つの層へ分解される。第一にソース上には`Console.WriteLine`という文だけが現れる。第二にコンパイラは入口点を含む実行可能アセンブリを生成する。第三に実行時にはCLRがアセンブリを読み込み、入口点から実行を開始する。[^3][^13]

トップレベルステートメントを含められるコンパイル対象は一つだけである。トップレベルステートメントが存在する場合、明示的な`Main`メソッドを書いても、その`Main`は入口点として扱われない。この制約は実行開始位置の一意性を保つためのものである。`await`および`return`の有無に応じて、生成される入口点のシグネチャは変化する。[^13][^16]

トップレベルステートメントを含められるコンパイル対象は一つだけである。トップレベルステートメントが存在する場合、明示的な`Main`メソッドを書いても、その`Main`は入口点として扱われない。この制約は、実行開始位置の一意性を保つためのものである。[^13][^16]

この最小例を逆アセンブルした結果には、アセンブリマニフェスト、型定義、メソッド定義、ローカル変数情報、IL命令列、必要に応じたPDB上の対応情報が含まれる。最小プログラムの観察は以後の章で扱う型、束縛、変換、非同期、メタデータ、状態機械変換を読むための最初の足場として位置付けられる。[^10][^14]

ファイルベースアプリは、.NET 10 SDK以降で導入された単一C#ファイルのビルド・実行形態である。明示的なプロジェクトファイルを作成せずに、`.cs`ファイルを`dotnet`コマンドからビルド、実行、公開できる。ソースファイルは通常のC#プログラムとして扱われるが、プロジェクトファイルに相当する設定の一部はSDK側で生成または解釈される。トップレベルステートメントと相性がよいが、それに限定される機能ではない。

C# 14の機能仕様では、ファイルベースアプリを支えるために、`#!`および`#:`系ディレクティブが無視可能な前処理ディレクティブとして整理された。`#!`はUnix系環境でソースファイルを直接実行するためのshebangであり、`#:`系ディレクティブはパッケージ、プロジェクト参照、SDK、MSBuildプロパティなどを指定するビルドシステム向けの指示である。これらは通常の条件付きコンパイル用ディレクティブとは役割が異なり、C#言語としては無視され、SDKやツールが必要に応じて解釈する。したがって、トップレベルステートメントは言語上の入口記述であり、ファイルベースアプリは.NET SDKによる実行形態である。[^17]

以後の議論では、短いソースの背後にもコンパイル単位、アセンブリ、メタデータ、IL、入口点、実行時コンパイル、`.runtimeconfig.json`などを含むホスト構成という複数の層があることを前提とする。`#!`および`#:`系ディレクティブの構文上の位置付け、配置制約、ビルド文脈との関係は、言語バージョンと前処理ディレクティブを扱う後続章で整理する。

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

[^17]: Microsoft Learn, *File-based apps - .NET*; *Ignored preprocessor directives - C# feature specifications*; *Preprocessor directives - C#*; *Tutorial: Build file-based C# programs*. ファイルベースアプリ、`#!`、`#:`系ディレクティブ、および.NET SDKによる単一C#ファイル実行モデルの整理。[https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps](https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/ignored-directives](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/ignored-directives) ; [https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/preprocessor-directives](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/preprocessor-directives) ; [https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/file-based-programs](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/file-based-programs)。

[^15]: GitHub, *icsharpcode/ILSpy*. .NETアセンブリブラウザ兼デコンパイラとしての外部観察ツール。[https://github.com/icsharpcode/ilspy](https://github.com/icsharpcode/ilspy)。

[^16]: Microsoft Learn, *Resolve errors and warnings related to a program entry point*; *Main() and command-line arguments - C#*. 入口点シグネチャ、`Main`、`StartupObject`、トップレベルステートメントと入口点の関係。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/entry-point-errors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/entry-point-errors) ; [https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/main-command-line](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/main-command-line)。

[^17]: Microsoft Learn, *File-based apps - .NET*; *Ignored preprocessor directives - C# feature specifications*; *Preprocessor directives - C#*; *Tutorial: Build file-based C# programs*. ファイルベースアプリ、`#!`、`#:`系ディレクティブ、および.NET SDKによる単一C#ファイル実行モデルの整理。[https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps](https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/ignored-directives](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/ignored-directives) ; [https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/preprocessor-directives](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/preprocessor-directives) ; [https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/file-based-programs](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/file-based-programs)。
