---
title: 'C#'
description: "C#の概要"
date: 2026-04-15
genre:
  - C#
  - Programming
---

## 1. はじめに

C#は、Microsoftによって設計された汎用プログラミング言語であり、今日では業務システム、Webアプリケーション、デスクトップアプリケーション、クラウドサービス、ゲーム開発など、広範な領域で利用されている[^1][^3]。しかし、C#を単に「.NETで使われる主要言語」とだけ説明すると、その技術的な位置づけを十分には捉えられない。より重要なのは、C#が独立した言語仕様を備える一方で、実際の運用においては.NET/CLIという実行基盤の上に位置づけられている、という二層的構造である[^1][^2][^4]。

初学者向けの解説では、しばしば構文要素や主要キーワードの一覧が説明の中心となる。しかし、そのような叙述だけでは、C#がどのような抽象化の層を経て実行されるのか、また、なぜ中間言語、メタデータ、アセンブリ、ランタイムといった概念が不可欠なのかが見えにくい。本稿は、C#を文法項目の集合としてではなく、成立史、規格、コンパイル過程、実行過程、および言語進化が連続する構造として記述することを目的とする[^2][^5]。

## 2. C#の成立と設計思想

C#は2000年代初頭、Microsoftの.NET構想と密接に結びつきながら登場した。C#言語仕様の導入部では、この言語がシンプル、モダン、汎用的なオブジェクト指向な言語として設計され、ソフトウェア工学上の堅牢性を重視することが明示されている[^3]。具体的には、強い型検査、未初期化変数の検出、配列境界検査、自動ガベージコレクションといった機構を通じて、安全性と生産性を両立させる設計が採られた[^3]。

この設計思想は、C#を単なる「C系構文の業務言語」とみなす理解が不十分であることを示している。むしろC#は、C系言語に親しんだ開発者の移行容易性を保ちながら、管理された実行環境の上で部品指向的開発を行うために設計された言語である[^3]。したがって、C#の成り立ちを説明する際には、機能追加の系譜を列挙するよりも、言語安全性と実行基盤との協調関係を中心に据えるほうが妥当である。

## 3. C#の二つの規格

C#には[**ECMA-334**](https://ecma-international.org/publications-and-standards/standards/ecma-334/)と[**ECMA-335**](https://ecma-international.org/publications-and-standards/standards/ecma-335/)の二つの規格が存在する。ECMA-334ではC#言語そのものの構文、意味規則、型、文、式、宣言などを規定[^1]し、ECMA-335はCLI（Common Language Infrastructure、共通言語ランタイム）の仕様を定める。CLIは、複数の高級言語で書かれたプログラムを、共通の型体系と実行基盤のもとで扱うための枠組みである[^2]。

## 4. C#プログラムのコンパイルと実行

C#のソースコードは、通常、コンパイラによって直接ネイティブ機械語へ変換されるのではない。まず、**CIL（Common Intermediate Language）** と呼ばれる CPU 非依存の中間命令列と、プログラムの構造を記述するメタデータへ変換される。一般には IL と略称されることが多いが、規格上の用語としては CIL が用いられる[^2][^5]。

メタデータには、型、メソッド、フィールド、属性、参照関係などに関する情報が格納される。したがって、.NET におけるコンパイル成果物は、単なる命令列ではなく、その命令列を解釈し運用するための構造情報を併せ持つ[^5][^6]。これらは通常、`.dll` または `.exe` といったアセンブリの中に配置され、実行時にはランタイムがそれをロードし、必要に応じて検証し、JIT などの仕組みによって対象環境向けのネイティブコードへ変換する[^5][^7]。

この過程から分かるのは、C#プログラムの実行を理解するうえで、ソースコードから機械語への単純な一段階変換を想定してはならないということである。C#は、ソース、CIL、メタデータ、アセンブリ、ランタイムという複数の層を媒介として実行される。そのため、言語仕様だけでなく、実行形式の設計思想を併せて捉える必要がある[^2][^5]。

## 5. メタデータとアセンブリの意義

.NET の実行モデルにおいて、とりわけ重要なのはメタデータの存在である。C/C++ の伝統的な開発モデルでは、型宣言やインターフェースに関する情報が、ヘッダファイルや別形式の記述に分散しがちであった。これに対して .NET では、アセンブリ内部のメタデータが、型やメンバーの定義、可視性、属性、依存関係を自己記述的に保持する[^6]。これにより、コンパイラ、ランタイム、リフレクション API、各種ツールは、外部の補助的記述に依存することなく、当該部品の構造を把握できる[^5][^6]。

アセンブリは、そのような CIL とメタデータをまとめる基本単位であり、同時に配置、再利用、バージョン管理、ロード境界の単位でもある[^7]。アセンブリにはマニフェストが含まれ、アセンブリ名、バージョン、カルチャ、参照アセンブリ、公開型などが記録される[^7][^8]。この点に鑑みれば、アセンブリは単なるファイル拡張子の問題ではなく、.NET における部品性の制度的基盤であるといえる。

## 6. CLI から見た C#

CLI の観点から見た場合、C#は多言語実行環境を構成する諸言語の一つとして位置づけられる。CLI は、**CTS（Common Type System）** によって型の共通的意味を規定し、**CLS（Common Language Specification）** によって、言語間相互運用における最小公約数を示す。また、**VES（Virtual Execution System）** は、ロード、検証、実行などに関わる仮想実行系の要件を定める[^2]。

この構造が意味するのは、C#が .NET の中心的言語であるとしても、それは .NET の全体と同一ではないということである。むしろ C#は、CLI が構想する多言語環境のなかで、比較的汎用性が高く、開発者人口も多い代表的実装の一つとして機能してきた[^2][^3]。そのため、C#の理解は、単独言語としての理解にとどまらず、共通実行基盤の設計思想に接続される。

## 7. C#の展開と現代的特徴

成立当初の C#は、オブジェクト指向言語として比較的理解しやすい構文体系を備えていたが、その後の発展は著しい。ジェネリクスの導入は型抽象化を強化し、LINQ はクエリ的記述を言語内部へ取り込み、`async/await` は非同期処理の記述様式を大きく変えた。さらに、パターンマッチ、nullable 参照型、record などの導入は、C#が関数型的発想や宣言的記述を部分的に吸収しながら、より高水準な抽象化へ向かってきたことを示している[^9]。

しかし、このような機能追加を単なる「便利機能の増加」として捉えるだけでは不十分である。むしろ重要なのは、C#が既存の型システムと実行基盤の枠組みを維持しつつ、記述力を継続的に拡張してきた点にある。すなわち C#の進化とは、構文的表現力の拡張であると同時に、.NET 実行基盤との整合性を保ったまま抽象化の密度を高める過程でもあった[^4][^9]。

## 注および参考文献

[^1]: Ecma International, *ECMA-334: C#language specification*, 7th ed., December 2023. Available from: [https://ecma-international.org/publications-and-standards/standards/ecma-334/](https://ecma-international.org/publications-and-standards/standards/ecma-334/). 

[^2]: Ecma International, *ECMA-335: Common Language Infrastructure (CLI)*, 6th ed., June 2012. Available from: [https://ecma-international.org/publications-and-standards/standards/ecma-335/](https://ecma-international.org/publications-and-standards/standards/ecma-335/). 

[^3]: Microsoft Learn, *Introduction - C#language specification*. Available from: [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/introduction](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/introduction). 

[^4]: Microsoft Learn, *C#standard specification*. Available from: [https://learn.microsoft.com/en-us/dotnet/csharp/specification/overview](https://learn.microsoft.com/en-us/dotnet/csharp/specification/overview). 

[^5]: Microsoft Learn, *Managed Execution Process - .NET*. Available from: [https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process). 

[^6]: Microsoft Learn, *Metadata and Self-Describing Components - .NET*. Available from: [https://learn.microsoft.com/en-us/dotnet/standard/metadata-and-self-describing-components](https://learn.microsoft.com/en-us/dotnet/standard/metadata-and-self-describing-components). 

[^7]: Microsoft Learn, *Assemblies in .NET*. Available from: [https://learn.microsoft.com/en-us/dotnet/standard/assembly/](https://learn.microsoft.com/en-us/dotnet/standard/assembly/). 

[^8]: Microsoft Learn, *Assembly contents - .NET*. Available from: [https://learn.microsoft.com/en-us/dotnet/standard/assembly/contents](https://learn.microsoft.com/en-us/dotnet/standard/assembly/contents). 

[^9]: dotnet/csharplang, *Language-Version-History.md*. Available from: [https://github.com/dotnet/csharplang/blob/main/Language-Version-History.md](https://github.com/dotnet/csharplang/blob/main/Language-Version-History.md). 
