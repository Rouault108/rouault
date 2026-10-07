---
title: '言語バージョン・ビルド文脈・互換性'
description: 'C#の言語バージョン、TFM、SDK選択、前処理ディレクティブ、null許容文脈を整理し、互換性判断の前提を示す。'
date: 2026-04-23
updated: 2026-05-04
genre:
  - C#
  - Programming
status: wip
---

前ノートで見たようにC#プログラムの意味は、ソースコードだけではなくコンパイル単位、参照、アセンブリ、実行基盤との関係の中で定まる。本ノートではそのうち言語バージョン、TFM、SDK、ビルド設定がどのように受理可能な構文と実行可能性を制約するかを整理する。

C#のコードがどの規則で受理され、どの機能が利用可能であり、どの層で互換性上の制約が現れるかは、単一の要因では決まらない。少なくとも、選択された言語バージョン、ターゲットフレームワークモニカー（Target Framework Moniker、TFM）、SDKとコンパイラのバージョン、プロジェクトファイルで与えられるコンパイル設定、前処理ディレクティブ、null許容文脈、およびソースが生成コードとして扱われるか否かの組み合わせとして決まる。したがって、ある構文が「C#として書ける」ことと、その構文が実際のビルド文脈で安全かつ再現可能に利用できることとは区別しなければならない。[^1][^2][^3][^4][^5]

本ノートではまず`LangVersion`が何を制御し、何を制御しないかを明らかにする。次にTFMとライブラリ・ランタイム要件との関係を整理し、前処理ディレクティブを字句構造およびビルド文脈の一部として位置付ける。さらに、`#nullable`とプロジェクト設定・生成コードの関係、C#のバージョン史を読む際の観点、本ノート群におけるバージョン差の扱いを定める。対象はIDEの操作手順ではなく、バージョン管理と互換性判断の前提となる概念区分である。[^1][^3][^4][^6][^7][^8]

## 3.1 `LangVersion`の意味

`LangVersion`は、C#コンパイラがどの言語構文およびどのバージョンまでの言語機能を受理するかを制御する設定である。ここで制御されるのは、構文受理と一部の言語機能規則であって、対象ランタイムの実際の能力、参照されるライブラリのAPI集合、あるいはSDK選択そのものではない。したがって、`LangVersion`は言語面の入口であるが、ビルド全体の互換性を単独で保証する設定ではない。[^1][^3]

`LangVersion`を省略した場合、コンパイラはターゲットとするTFMに基づいて既定の言語バージョンを選ぶ。現行の公式対応表では、`.NET 11.x`はC# 15、`.NET 10.x`はC# 14、`.NET 9.x`はC# 13、`.NET 8.x`はC# 12、`.NET 7.x`はC# 11、`.NET 6.x`はC# 10に対応する。ただし、2026年05月04日現在、`.NET 11`およびC# 15はプレビュー段階にあるため、本ノート群の安定版の既定対象はC# 14および`.NET 10`とする。`.NET 10`は長期サポート（Long Term Support、LTS）リリースであり、C# 14を含むため、安定版の観察基準として扱いやすい。これに対して、`LangVersion`へ`default`または`latestMajor`を明示した場合は、対象TFMではなく、使用中のコンパイラがサポートする最新のリリース済みメジャーバージョンが選ばれる。したがって、**設定を省略すること**と、**`default`または`latestMajor`を明示すること**とは同一ではない。通常のプロジェクトでは、`default`や`latestMajor`を明示するのではなく、`LangVersion`を省略してTFMに整合する既定値を用いる方が望ましい。[^1][^2][^3][^16][^17]

`LangVersion`には`preview`、`latest`、`latestMajor`（または`default`）、および数値バージョンを指定できる。`preview`は、使用中のコンパイラがサポートする最新のプレビュー版C#構文を受理する。`latest`は、使用中のコンパイラがサポートする最新のリリース済みバージョンを受理する。もっとも、`latest`はインストールされたコンパイラに依存して結果が変わるため、公式文書でも非推奨とされる。再現性を要する環境で重要なのは**`latest`で追随すること**ではなく、**TFMに整合する既定の言語バージョンを用いるか、必要に応じて数値で固定すること**である。[^2][^3]

数値での固定には二つの意義がある。第一にビルド環境が更新されても言語受理範囲を変えないことで、ソース互換性上の変動を局所化できる。第二にライブラリや教育用資料のように「どのバージョンまでを前提に書かれているか」を明示できる。ただし数値固定は新しいSDK上での既定の言語バージョン追随を止めるため、採用時には更新計画とセットで管理する必要がある。[^2][^3]

また実際にどの言語バージョンが選択されているかを調べるには、`#error version`を用いる方法がある。この特殊なディレクティブは、コンパイラバージョンと現在選択されている言語バージョンを含む診断を生成する。言語バージョンの観察は推測ではなくコンパイラ出力で確認できる。[^2][^6]

さらにSDK選択は`global.json`によって制御できる。`global.json`が定めるのはどの`.NET SDK`でCLIコマンドを実行するかであり、プロジェクトが対象とするランタイムバージョンとは独立である。したがって**TFMは対象フレームワークおよびAPI集合の軸**、**`LangVersion`は言語受理の軸**、**`global.json`はSDK選択の軸**として分けて理解する必要がある。[^4]

## 3.2 TFMと言語機能

TFMは、アプリケーションまたはライブラリがどの対象フレームワーク、実行環境、またはAPI集合を対象とするかを表す識別子である。たとえば`net10.0`、`net8.0`、`netstandard2.1`、`net481`は、それぞれ異なる実行環境またはAPI面を指す。TFMは単なる文字列ではなく、参照解決、利用可能API、既定の言語バージョン、条件付きコンパイル記号、出力物の分離に関与するビルド文脈の中心である。[^1][^5][^9]

C#の言語機能はすべてがコンパイラだけで完結するわけではない。公式のバージョン史でも、C# 8.0は.NET Coreを明確な対象とする最初の主要なC#リリースと説明されている。たとえば既定実装を持つインターフェイスメンバーはCLR側の拡張を必要とする。また、インデックスと範囲、および非同期ストリームは、対象TFM側に対応するライブラリ型が存在するかどうかに左右される。代表的には、.NET Core 3.0や.NET Standard 2.1で整備された型と結び付く。null許容参照型は主にコンパイラによる静的解析として機能するが、ライブラリ側にnull許容性注釈が付与されているほど有効に働く。したがって言語バージョンだけを引き上げても、対象ランタイムやライブラリが追随していなければ、その機能が対象TFM上でコンパイル・実行・ライブラリ利用のすべてにおいて期待どおり機能するとは限らない。[^8][^10]

このため公式文書は、既定より新しい言語バージョンをTFMへ対応付けずに利用することを**非対応**と明示する。現行の対応表においてC# 15は`.NET 11`以降、C# 14は`.NET 10`以降、C# 13は`.NET 9`以降に対応する。`LangVersion`を明示すれば、コンパイラが対応している限り、TFMの既定より新しいC#構文を受理させることはできる。しかし、その構成は公式にはサポートされない。さらに、その機能が必要とするライブラリ型やランタイム挙動が対象TFMに存在するとは限らない。[^1][^2]

互換性判断では次の順序で見るのが有効である。第一に対象TFMが何であるかを見る。第二にそのTFMに対してコンパイラが選ぶ既定言語バージョンを確認する。第三に問題の機能がコンパイラだけで閉じるのか、ライブラリ型やCLR挙動を必要とするのかを切り分ける。第四に必要なら数値で`LangVersion`を固定し、ビルドの再現性を`global.json`で補強する。互換性問題はしばしば「言語の問題」に見えるが、実際には言語・ライブラリ・ランタイム・SDKの交点に現れる。[^1][^2][^4][^8]

複数TFMを同時に対象とする場合、コードベースは一つでもビルド文脈は単一ではない。`TargetFrameworks`プロパティに複数のTFMを列挙した場合、参照解決、出力先、暗黙に定義される条件付きコンパイル記号はターゲットごとに変化する。したがってマルチターゲット化されたプロジェクトでは、言語差よりも先に、各ターゲットごとに何が定義され何が参照できるかを確認すべきである。[^5][^9]

## 3.3 前処理ディレクティブとビルド文脈

C#の前処理ディレクティブは、CやC++におけるマクロプリプロセッサとは同一ではない。言語仕様上前処理ディレクティブは字句構造に属し、独立した一行を占め`#`で始まる。仕様ではC#には独立した前処理段階がなく、前処理ディレクティブは字句解析の一部として処理されると明記する。したがって、C#の`#if`や`#define`をテキスト置換を行う一般的マクロ機構とみなすのは不正確である。[^6][^7]

ただし現行の前処理ディレクティブ文書には、ファイルベースアプリを対象とする`#!`および`#:`も含まれる。これらは通常のプロジェクトベースの条件付きコンパイル機構ではない。C#コンパイラは、言語機能としては`#:`または`#!`で始まるディレクティブを無視する。ただし、プロジェクトベースのコンパイルでこれらが出現した場合は警告が生成される。ファイルベースアプリでは、ビルドシステムが必要に応じてこれらを解釈する。したがって本節が主として扱うのは、`.csproj`を持つ通常のプロジェクト文脈で用いられる`#if`、`#define`、`#nullable`、`#pragma warning`などの前処理ディレクティブである。[^6]

条件付きコンパイルの中心は`#if`、`#elif`、`#else`、`#endif`であり、ここで参照できるのは「定義されているか否か」で評価される記号である。C#では`#define`で記号を定義できても、その記号へ数値や文字列を代入することはできない。またC#コンパイラ自体はソース中で利用できるマクロや記号を定義しない。プロジェクト全体での記号定義には`DefineConstants`コンパイラオプションが用いられ、これは各ファイル先頭の`#define`より広いスコープを持つ。したがって`#if DEBUG`のような分岐は可能であるが、C/C++的な関数様マクロや数値マクロは成立しない。[^3][^6]

SDKスタイルプロジェクトでは、ビルドシステムがTFMに応じた条件付きコンパイル記号を暗黙に供給する。既定では`NETFRAMEWORK`、`NETSTANDARD`、`NET`のようなバージョンなし記号、`NET10_0`や`NETSTANDARD2_0`のようなバージョン付き記号、さらに`NET10_0_OR_GREATER`のような下限記号が生成される。OS固有TFMを対象とする場合には、`WINDOWS`、`ANDROID`、`IOS`などのプラットフォーム記号も供給される。これらはC#言語仕様が組み込みで与えるものではなく、SDKスタイルプロジェクトのビルドシステムが条件付きコンパイルのために与える記号である。[^3][^6][^9]

この区別は運用上重要である。たとえば`net10.0`というTFMを対象にしていることと、ソース中で`#if NET10_0_OR_GREATER`が真になることは密接に関係するが両者は同一概念ではない。前者はMSBuildとNuGetが解釈するターゲット識別子であり、後者は条件付きコンパイルのためにビルドシステムが供給し、コンパイラが評価する論理記号である。したがって互換性の説明では、「TFM」と「条件付きコンパイル記号」を混同しない記述が必要である。[^6][^9]

`#error`と`#warning`は利用者定義の診断をコンパイル時に発生させる。`#error version`だけは特別に扱われ、コンパイラバージョンと言語バージョンを報告するための観察手段になる。`#line`はコンパイラが報告する行番号とファイル名を再対応付けし、`#line hidden`はデバッガのステップ実行から当該領域を隠す。これらは手書きコードの通常制御ではなく、**生成元ソースと生成先C#コードとの対応付け**のための仕組みとして読むべきである。[^2][^6]

`#pragma warning`は警告の有効化・無効化・復元をファイル内の局所範囲で制御する。`disable`は次の行から効力を持ち、`restore`はその次の行から元に戻る。ここでの原則は警告を一律に消すことではなく、**なぜその警告がここだけで問題にならないのか**を説明可能な最小範囲へ局所化することである。警告制御をプロジェクト全体設定より前にファイル内pragmaへ落とすのは、あくまで局所的・一時的・生成コード隣接的な事情がある場合に限るべきである。[^6]

## 3.4 null許容文脈と警告文脈

null許容参照型（nullable reference types）は、参照型に対する注釈と静的フロー解析によって、`null`安全性を高める機能群である。ここで重要なのは、null許容文脈（nullable context）が**注釈文脈**と**警告文脈**の二つのフラグから成ることである。仕様ではnull許容注釈の有無やnull許容文脈の状態は、診断メッセージを除き、プログラムのコンパイル時・実行時の挙動を変えないとされる。したがって、null許容参照型は実行意味論を直接変更する機構ではなく、**型注釈を伴う静的契約記述と診断体系**として読むべきである。ただしnull許容注釈は実行時の値表現を変えない一方で、コンパイラがメタデータ上に注釈情報を出力する場合がある。そのため実行意味論とは別に、リフレクション、アナライザ、外部ツールから観察されるAPI契約としての側面を持つ。[^11][^12]

プロジェクト単位では、`<Nullable>`プロパティでnull許容文脈を設定できる。指定値は`enable`、`disable`、`warnings`、`annotations`であり、`enable`は両方のフラグを有効にする。公式文書では、値未設定時の既定は`disable`である一方、`.NET 6`以降のテンプレートは既定で`enable`を設定して提供される。したがって、**言語仕様上の文脈概念**、**コンパイラオプションの既定**、**プロジェクトテンプレートが実際に生成する値**は区別して読む必要がある。[^3][^12]

ソースファイル内部では、`#nullable`ディレクティブがプロジェクト設定より優先される。`#nullable enable`、`disable`、`restore`に加え、`annotations`と`warnings`を個別に制御する形式がある。効力は別の`#nullable`で上書きされるか、ファイル末尾に達するまで継続する。したがって、`#nullable`は単なる装飾ではなく、**ファイル局所の解析契約を上書きするディレクティブ**として扱うべきである。[^6][^12]

さらにプロジェクト単位の`<Nullable>`設定には、生成コードに対する例外がある。公式文書では、プロジェクト全体の`<Nullable>`設定は生成コードとして扱われるファイルにはそのまま適用されず、そのようなソースではnull許容文脈は既定で無効になると説明される。生成コードと見なされる条件には、`.editorconfig`での`generated_code = true`指定、先頭コメントの`<auto-generated>`印、`TemporaryGeneratedFile_`接頭辞、`.designer.cs`・`.generated.cs`・`.g.cs`・`.g.i.cs`といった接尾辞が含まれる。ソースジェネレーターや生成コード側がnull許容解析を必要とする場合は、`#nullable`によって明示的に有効化する。[^3]

この設計から導かれる実務上の原則は三つある。第一に、公開APIを含むコードでは、可能な限りプロジェクト単位で`<Nullable>enable</Nullable>`を採用し、型注釈と警告を分離しない。第二に、移行中のコードや生成コードでは、`#nullable restore`を用いてプロジェクト既定へ戻す構成を優先し、ファイル末尾まで`disable`を引きずらない。第三に、警告の抑制は`!`や`#pragma warning`で局所化し、根本的にはフロー解析・属性注釈・API契約の明示で解決する。null許容参照型は警告を基礎とする静的解析機能である以上、抑制の容易さよりも契約記述の精度を優先すべきである。[^6][^11][^12][^13]

## 3.5 バージョン史の読み方

C#のバージョン史は、機能の一覧としてではなく、**互換性判断のための層を見分ける軸**として読む必要がある。ある機能がどのバージョンで導入されたかだけを見ても、その機能が対象TFMで安全に使えるとは限らない。構文だけで閉じる機能、ライブラリ型を必要とする機能、CLRの挙動に依存する機能、SDKやアナライザの支援を前提にする機能を区別する必要がある。[^8]

初期のC# 1.0〜7.xでは、ジェネリクス、匿名メソッド、LINQ、ラムダ式、`async`/`await`、パターンマッチングといった基礎的抽象化が段階的に導入された。この期間のバージョン差は、主に言語の表現力、型付け、束縛、制御フローの拡張として整理できる。ただし`async`/`await`のように、言語変換とライブラリ型が密接に結び付く機能もあるため、導入バージョンだけでなく、利用する標準ライブラリと実行基盤も確認する必要がある。[^8]

C# 8.0以降では、言語機能の一部がライブラリ注釈やCLR拡張との関係をより明示的に持つようになった。既定実装を持つインターフェイスメンバーはCLR側の拡張を必要とし、インデックスと範囲、および非同期ストリームは対象TFM側のライブラリ型に依存する。null許容参照型は主にコンパイラの静的解析として実装されるが、ライブラリ側のnull許容性注釈が整っているほど有効に働く。したがってC# 8.0以後のバージョン差は、構文差だけでなく、**実行基盤・標準ライブラリ・静的解析との結び付き**として読む必要がある。[^8][^10][^11][^13]

C# 9.0〜14で導入されたレコード、トップレベルステートメント、グローバルusing、ファイルスコープ名前空間、レコード構造体、プライマリコンストラクター、コレクション式、拡張メンバーなども、単なる糖衣構文として一括すべきではない。等値性、初期化、名前束縛、API表面積、生成コード、ライブラリ型のどこに影響するかを切り分けて読む必要がある。たとえばレコードは等値性と合成メンバーに関わり、トップレベルステートメントは入口点生成に関わり、拡張メンバーは名前探索と候補集合に関わる。[^8]

また、バージョン史を読む際には、**ECMA標準へ反映済みの機能**、**リリース済みだが標準本文への反映に時点差がある機能**、**機能仕様段階の機能**、**プレビュー機能**を分ける必要がある。機能仕様文書は、提案された仕様変更が最終化されてECMA仕様へ取り込まれるまで公開される設計文書であり、完成実装との差異は言語設計会議（Language Design Meeting、LDM）ノートに記録されうる。したがって、バージョン史を読むとは、単に「いつ入ったか」を見ることではなく、**規範性の所在がどこにあるか**を併読することである。[^14][^15]

## 3.6 本ノート群のバージョン方針

本ノート群では、特記なき限り、安定版としてのC# 14および`.NET 10`を既定の観察対象とする。`.NET 10`はLTSリリースであり、C# 14を含むため、本ノート群の安定した基準として扱う。2026年05月04日現在、`.NET 11`およびC# 15はプレビュー段階にあるため、本文の主系列ではなく、プレビュー機能または将来バージョンの補足として扱う。`.NET 11.x`における既定言語バージョンがC# 15であることは、言語バージョン対応表上の事実であるが、`.NET 11`が安定リリース済みであることを意味しない。[^1][^2][^16][^17]

ただし、C#の多くの機能はバージョン差をまたいで読まれるため、バージョン差の表示規則を明示する。言語機能の差は`[C# 13+]`のように記し、TFMまたはライブラリ依存の差は`[net9.0+]`、`[netstandard2.1+]`のように記す。プレビュー段階の事項は本文の主系列から外し、節末コラムまたは脚注へ分離する。機能仕様にのみ依拠する場合は、その旨を明記し、ECMA標準本文と同一の規範性を持つものとしては扱わない。[^1][^14][^15]

また、`LangVersion`の扱いに関する本ノート群の基本方針は次のとおりである。通常のサンプルでは`LangVersion`を明示せず、TFMに整合する既定の言語バージョンを用いる。特定バージョンの制約を議論する節では、必要に応じて数値固定を明示する。`preview`は、仕様未確定または実装先行の話題を扱う補助的文脈に限って現れる。したがって、本文中に`latest`を前提とする記述は置かない。[^2][^3]

最後に、互換性を議論するときは次の三区分を常に保つ。第一に、どの言語バージョンで構文および意味規則が受理されるか。第二に、どのTFMとライブラリ集合でその機能が実用上成立するか。第三に、どのSDK・ビルド設定でその結果が再現可能か。この三区分を保つことにより、以後のノートで型、束縛、変換、パターン、非同期、低水準制御を扱う際にも、バージョン差と実装差を混同せずに記述できる。[^1][^2][^4][^8]

[^1]: Microsoft Learn, _Language versioning - C# reference_, updated 2026-02-04, “Defaults”, “C# language version reference”. TFMごとの既定言語バージョン、対応するC#バージョン、およびTFMより新しい言語バージョンの非対応扱いの整理。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-versioning

[^2]: Microsoft Learn, _Configure language version - C# reference_, updated 2026-01-20, “Edit the project file”, “C# language version reference”. `LangVersion`の設定方法、`latest`非推奨、`#error version`、TFMと既定の言語バージョンの対応関係。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version

[^3]: Microsoft Learn, _Compiler Options - language feature rules - C# reference_, updated 2024-09-27, “DefineConstants”, “LangVersion”, “Nullable”. `latest`、`default`、数値指定、`DefineConstants`、`Nullable`各値、生成コードにおけるnull許容文脈の例外。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language

[^4]: Microsoft Learn, _global.json overview - .NET CLI_, updated 2026-03-09, “global.json schema”, “Matching rules”. SDK選択がランタイム対象指定とは独立であること、CIにおける固定とroll-forwardの考え方。https://learn.microsoft.com/en-us/dotnet/core/tools/global-json

[^5]: Microsoft Learn, _Target frameworks in SDK-style projects - .NET_, updated 2026-04-17, “Target frameworks”, “OS-specific TFMs”. TFMの意味、API集合、OS固有TFM、マルチターゲット時の基本的な見方。https://learn.microsoft.com/en-us/dotnet/standard/frameworks

[^6]: Microsoft Learn, _Preprocessor directives - C# reference_, updated 2026-01-20, “File-based apps”, “Nullable context”, “#if”, “#define”, “#line”, “#pragma warning”. 条件付きコンパイル、ファイルベースアプリ向けディレクティブ、null許容文脈、診断制御の整理。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/preprocessor-directives

[^7]: Microsoft Learn, _Lexical structure - C# language specification_, updated 2025-12-09, §6.5.1 General. 前処理ディレクティブが独立した前処理段階ではなく字句解析の一部として処理されることの確認。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/lexical-structure

[^8]: Microsoft Learn, _The history of C#_, accessed 2026-05-04, sections for C# 8 through C# 14. バージョン史の整理と、C# 8以降で顕在化したCLR・ライブラリ依存、およびC# 9〜14の主要機能群。https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history

[^9]: Microsoft Learn, _Target frameworks in SDK-style projects - .NET_, updated 2026-04-17; _Preprocessor directives - C# reference_, updated 2026-01-20, “Target framework symbols”. TFMとSDKが供給する条件付きコンパイル記号との差異、`NET10_0_OR_GREATER`等の位置付け。https://learn.microsoft.com/en-us/dotnet/standard/frameworks ; https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/preprocessor-directives

[^10]: Microsoft Learn, _The history of C#_, accessed 2026-05-04, C# 8.0 section. 既定実装を持つインターフェイスメンバー、範囲とインデックス、非同期ストリーム、null許容参照型と実行基盤・ライブラリとの関係。https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history

[^11]: Microsoft Learn, _Types - C# language specification_, updated 2025-09-12, §8.9.3–§8.9.5. null許容参照型、nullable context、診断と実行時挙動の関係。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types

[^12]: Microsoft Learn, _Preprocessor directives - C# reference_, updated 2026-01-20, “Nullable context”; _Compiler Options - language feature rules - C# reference_, updated 2024-09-27, “Nullable”. `#nullable`の優先関係、`restore`の意味、`<Nullable>`の各値と既定値。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/preprocessor-directives ; https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language

[^13]: Microsoft Learn, _Attributes interpreted by the compiler: Nullable static analysis_, updated 2026-01-14. nullableフロー解析と属性注釈の関係。https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis

[^14]: Microsoft Learn, _Feature specifications - C#_. feature specificationが設計文書であり、実装との差異が言語設計会議ノートに記録されうることの説明。https://learn.microsoft.com/en-us/dotnet/csharp/specification/feature-spec-overview

[^15]: GitHub, _dotnet/csharplang_ repository; _C# Language Design Meetings_. C#言語設計の公式リポジトリであり、言語設計会議ノートおよび提案の参照先。https://github.com/dotnet/csharplang ; https://github.com/dotnet/csharplang/blob/main/meetings/README.md

[^16]: Microsoft Learn, _What's new in .NET 11_, updated 2026-04-14, “This article describes new features in .NET 11. It was last updated for preview 3.”, “.NET 11 is currently in preview. The final release is expected in November 2026.” .NET 11が2026年05月04日現在プレビュー段階であることの確認。https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview

[^17]: Microsoft Learn, _What's new in .NET 10_, updated 2025-11-07, “.NET 10 ... is supported for three years as a long-term support (LTS) release”, “C# 14”. .NET 10がLTSリリースであり、C# 14を含むことの確認。https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview
