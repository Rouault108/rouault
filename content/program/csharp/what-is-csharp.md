---
title: 'C#とは何か'
description: 'C#を言語仕様と.NET実行基盤の両面から位置付け、標準・実装・設計資料の役割を区別する。'
date: 2026-04-19
updated: 2026-05-04
genre:
  - C#
  - Programming
---

C#はECMA-334によって規定されるプログラミング言語である。実務では通常.NETを対象として用いられるため、C#の理解には言語仕様だけでなく、共通実行基盤、ライブラリ、コンパイラおよびランタイム実装との関係も含めて捉える必要がある。[^1][^5]

本ノートではC#をまず言語として位置付け、次に.NET上の主要言語としての性格を整理する。あわせて言語標準、共通基盤、公式ドキュメント、現行実装、設計途上の資料がそれぞれどのような根拠を与えるかを区別し、以後のノートを読むための前提を定める。[^1][^2][^4][^6][^9]

## 1.1 C#を「言語」として見る

C#はECMA-334によって標準化された静的型付きプログラミング言語である。C#言語仕様はプログラムの表現、構文、意味規則、および適合実装に課される制約を定める。したがってあるソースコードが構文的に適格であるか、ある式がどの型を持つか、ある変換や束縛が成立するかといった問題の第一の根拠は言語仕様にある。[^1]

C#は単純性、現代性、汎用性、オブジェクト指向性を設計目標として掲げる。これに加えて強い型検査、配列境界検査、未初期化変数の検出、自動ガベージコレクション、移植性、国際化、および広い実行環境への適用可能性が重視される。したがってC#は低水準制御を完全に排除する言語ではないが、Cやアセンブリ言語と同一の設計目標を採る言語でもない。[^3]

C#の初期的な中核はオブジェクト指向にあるが、その性格はクラスと継承だけには還元されない。型安全性、保守性、可読性、記述性を支える仕組みが初期段階から組み込まれており、言語仕様はこれらを一貫した規則体系として与える。[^1][^3]

現代のC#はオブジェクト指向を中核としつつ、複数の抽象化様式を統合した汎用言語として発展している。ラムダ式、クエリ式（query expression）、パターンマッチング、`async`/`await`は宣言的・関数型的な記述を広げる。これに対して`ref`、`in`、`out`、関数ポインター、`unsafe`は、実行時コストやメモリ表現をより直接に扱うための手段を与える。したがって現代のC#は単なるオブジェクト指向言語としてではなく、高水準の抽象化と限定的な低水準制御とを併せ持つ静的型付き言語として位置付けられる。[^1][^6][^9][^10]

## 1.2 C#を「.NET上の言語」として見る

実務で用いられるC#は、多くの場合.NETを対象とする。ただし、C#言語仕様そのものはCLI専用言語として定義されているわけではない。Microsoftの主要実装では、C#のコードは.NETの実行基盤上で動作し、.NETのライブラリ群を利用し、.NETのツールチェーンによってビルドおよび実行される。[^5]

この関係を理解するには、CLI（Common Language Infrastructure）、CTS（Common Type System）、CLS（Common Language Specification）、ランタイム実装、ライブラリ群を区別する必要がある。CLIはECMA-335が定義する共通言語基盤であり、複数の高水準言語で記述されたプログラムを共通の実行基盤上で扱うための枠組みを与える。また、共通中間言語（Common Intermediate Language。以下ではILと表記する）、メタデータの形式と意味、共通型システム、仮想実行系、言語間相互運用のための規則を含む。

CTSはその基盤上で型をどのように表現し、相互に関係付けるかという共通規則を定める。CLSは、CLI上で複数言語から利用される公開APIが従うべき相互運用上の規則集合を定める。たとえばあるC#の型が他の.NET言語から利用しやすいかという問題は、CLSとの関係で捉えられる。

.NETにおけるランタイムは、この共通基盤を具体的な実行系として実装し、アセンブリの読み込み、JITコンパイル、ガベージコレクションなどを担う。検証の有無や範囲は実行環境や配布形態に依存する。これに対して.NETのライブラリ群は、`object`、`string`、コレクション、例外、I/O、非同期処理などのAPIを提供する。したがって.NET向けC#を理解するには、コンパイラによるCLI上の形式への変換、ランタイムによる実行、ライブラリによる機能提供という三層を区別する必要がある。[^2][^5]

この区分により、言語、コンパイラ、実行基盤、ライブラリの責務は分離される。構文の適格性、式の意味、名前束縛、オーバーロード解決、型付けは、言語仕様が規定し、コンパイラが実装する。生成されたILとメタデータを含むアセンブリの読み込み、検証、JITコンパイル、実行は、実行基盤が担う。ライブラリは、その上で利用可能な型と操作の集合を提供する。構文や束縛を定める主体はランタイムではなく、言語仕様とそれを実装するコンパイラである。[^1][^2][^5][^7][^8]

C#が他の.NET言語と相互運用可能である理由もこの共通基盤にある。異なる言語で記述された型が相互に参照・呼び出し・継承されるのは、各コンパイラが共通の型規則とメタデータ規則に従って同一の基盤を対象とするためである。この意味でC#は独立した言語仕様を持つ一方で、共通実行基盤を前提として実用化されている主要言語でもある。[^2]

## 1.3 標準化と実装

C#の理解においてECMA-334とECMA-335の混同は避けなければならない。ECMA-334はC#言語そのものの標準であり、プログラムの表現、構文、意味規則、適合実装の制約を定める。ECMA-335はCLIの標準であり、共通型システム、メタデータ、仮想実行系、言語間相互運用の基盤を定める。前者はC#ソースコードの適格性と意味を扱い、後者はその結果が置かれる共通基盤の表現と実行を扱う。[^1][^2]

ただし現代のC#は標準文書だけで完結しているわけではない。本ノート群では少なくとも次の四つの層を区別して扱う。[^1][^2][^4][^7][^8][^9]

第一に**規範的根拠としての標準**がある。標準化済みの言語規則はECMA-334に、共通実行基盤およびメタデータの規則はECMA-335に求める。[^1][^2]

第二に**説明的整理としての公式ドキュメント**がある。Microsoft LearnのC#言語リファレンスは、用語整理、導入、関連概念の接続に有用である。一方、Microsoft Learn上の言語仕様ページは、規範的仕様本文への導線として位置付けられる。したがって公式ドキュメントは入口として有用である。ただし、仕様上の根拠を確認する際には、言語リファレンス、仕様本文、機能仕様を区別する必要がある。[^4]

第三に**実装上の観察対象としてのコンパイラとランタイム**がある。どの構文が現行実装で受理されるか、どの診断が出るか、どのILやメタデータが生成されるか、実行時にどのようなコード生成や最適化が行われるかを確認するには、Roslynと.NETランタイムの実装を観察する必要がある。ここで得られるのは実装上の事実であり、標準本文そのものではない。[^7][^8]

第四に**設計過程を追跡する資料としての機能仕様とcsharplang**がある。機能仕様は、まだECMA標準へ取り込まれていない、あるいは時点差のある機能の仕様説明を与える。csharplangリポジトリはC#言語設計の公式リポジトリであり、新機能の提案、議論、採択、仕様化がここで行われる。したがって、進行中の機能や実装先行の機能を追う場合には、これらが重要な参照先になる。[^6][^9][^10]

これらの層は同一の規範性や安定性を持たない。標準、公式ドキュメント、現行実装、設計途上の提案は、それぞれ参照目的が異なる。C#のように継続的に進化する言語では、この区別を保ったまま読むことが前提になる。[^1][^4][^6][^9]

## 1.4 本ノート群の立場

本ノート群は基本構文の解説を圧縮し、型、束縛、変換、評価、実行モデルを中核に置く。関心の中心は`if`や`for`の表面的な記法そのものではなく、ある式がどの型を持つか、どの名前に束縛されるか、どの変換が適用されるか、どのようなILとメタデータが生成されるか、実行時にどのような制約やコストが現れるかにある。[^1][^2][^5][^7][^8]

この立場ではコードが書けることと、そのコードがどの規則に従って解釈されるかを追跡できることとを区別する。型、オーバーロード解決、ボックス化（boxing）、状態機械変換、メタデータ表現、実行時コストは、いずれも表面構文の背後にある規則の問題である。本ノート群では各論点について、言語仕様、CLI/.NET実装、.NETライブラリ群という層の違いを意識しながら記述する。[^1][^2][^5][^7][^8]

以後のノートでは、型システム、名前束縛、ジェネリクス、null許容性（nullability）、非同期、メモリ制御、メタデータを、この区分に従って扱う。仕様上の事実、実装上の観察、設計上の含意を混同しないことを以後の記述全体の基本方針とする。[^1][^6][^9]

[^1]: Ecma International, *ECMA-334: C# Language Specification*, 7th ed., December 2023, Foreword; §1 Scope; §5 Conformance. C#プログラムの表現、構文、意味規則、適合実装の制約を与える規範的標準。[https://ecma-international.org/publications-and-standards/standards/ecma-334/](https://ecma-international.org/publications-and-standards/standards/ecma-334/)

[^2]: Ecma International, *ECMA-335: Common Language Infrastructure (CLI)*, 6th ed., June 2012, Partition I: Concepts and Architecture. CLI、CTS、CLS、VESおよびメタデータの規範的定義。[https://ecma-international.org/publications-and-standards/standards/ecma-335/](https://ecma-international.org/publications-and-standards/standards/ecma-335/)

[^3]: Microsoft Learn, *Introduction - C# language specification*, 2025-09-12更新. C#の初期設計目標と設計上の位置付けを説明する公式導入文書。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/introduction](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/introduction)

[^4]: Microsoft Learn, *C# language reference*; *Table of contents - C# language specification*. 説明的な言語リファレンスと、規範的仕様本文への導線としての仕様書目次。[https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/) ; [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/readme](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/readme)

[^5]: Microsoft Learn, *Introduction to .NET*; *Managed execution process*; *Common Language Runtime (CLR) overview*; *Core .NET libraries overview*. .NETを複数言語基盤として捉える公式概説、実行過程、CLR、ライブラリ群の役割。[https://learn.microsoft.com/en-us/dotnet/core/introduction](https://learn.microsoft.com/en-us/dotnet/core/introduction) ; [https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process) ; [https://learn.microsoft.com/en-us/dotnet/standard/clr](https://learn.microsoft.com/en-us/dotnet/standard/clr) ; [https://learn.microsoft.com/en-us/dotnet/standard/class-library-overview](https://learn.microsoft.com/en-us/dotnet/standard/class-library-overview)

[^6]: Microsoft Learn, *Feature specifications - C#*. ECMA標準未反映または時点差のある機能について、機能仕様と標準仕様の関係を整理する公式文書。[https://learn.microsoft.com/en-us/dotnet/csharp/specification/feature-spec-overview](https://learn.microsoft.com/en-us/dotnet/csharp/specification/feature-spec-overview)

[^7]: GitHub, *dotnet/roslyn*. C#およびVisual Basicコンパイラの公式実装リポジトリ。受理される構文、診断、生成物の観察対象。[https://github.com/dotnet/roslyn](https://github.com/dotnet/roslyn)

[^8]: GitHub, *dotnet/runtime*. .NETランタイムおよび主要ライブラリ群の公式実装リポジトリ。実行時挙動、ライブラリ実装、生成コード観察の参照先。[https://github.com/dotnet/runtime](https://github.com/dotnet/runtime)

[^9]: GitHub, *dotnet/csharplang*. C#言語設計の公式リポジトリ。提案、議論、仕様化の中心。[https://github.com/dotnet/csharplang](https://github.com/dotnet/csharplang)

[^10]: GitHub, *C# Language Design Meetings*. 言語設計会議記録への導線。設計判断と仕様化過程の追跡に用いる。[https://github.com/dotnet/csharplang/blob/main/meetings/README.md](https://github.com/dotnet/csharplang/blob/main/meetings/README.md)
