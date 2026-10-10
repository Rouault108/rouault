---
title: "GoFデザインパターン全23種と現代Javaでの使い方"
license: CC BY 4.0
---

# GoFデザインパターン全23種をJavaで理解する

作成日・資料確認日: 2026年10月7日\
コードの対象: Java 21、プレビュー機能なし、外部ライブラリ不要

## 要点

* 全23パターンを、変更したい場所と守る契約から選ぶ。
* Javaの言語機能・JDKにより、昔のクラス構造をそのまま書く必要は減っている。
* 特定APIの非推奨と、設計パターンの価値を混同しない。
* すべてのJava例はJava 21で独立実行できる。

## 内容

### このノートの読み方

GoFの23パターンは、オブジェクトの生成、構造、協調に繰り返し現れる設計問題を言語化したものだ。名前を増やすことより、「何が変わるのか」「どこを安定させるのか」を説明するために役立つ。クラス図をそのまま実装することが目的ではない。

このノートでは全23種について、目的、役割、Javaの独立実行例、適用条件と不向きな条件、現代の言語・JDK・フレームワークとの関係を整理する。例は理解のために小さくしてあり、外部I/Oの失敗、トランザクション、並行制御などを省略した箇所は本文で注意する。

**現在の評価で重要なのは、パターンそのものと実装手段を区別すること。** 次の四つは違う話である。

1. **設計上の狙いが今も有効**: Adapter、Strategy、Observerなど、必要な分離は現在のコードにも現れる。
2. **言語・標準APIで定型コードが小さくなった**: Strategyのラムダ、Iteratorを利用する拡張for、閉じた型集合に対するVisitorの代替となるpattern switchなど。
3. **特定のAPIが公式に非推奨**: `java.util.Observable` など。対応する設計パターン全体が非推奨になるわけではない。
4. **用途により設計上の不利益が大きい**: 変更可能なグローバル状態を持つSingletonなど。これはJavaコンパイラの `@Deprecated` と異なる設計判断である。

各節の「使う・避ける」は適用条件に基づく判断であり、利用率の統計や業界全体の流行ランキングではない。JDK/APIの仕様上の記述には公式資料を添えた。リンク先はJava 21の言語仕様解説と確認できたJDK 21/25/26/27 APIなどを使い分けており、すべてのリンクが最新リリース番号を指すという意味ではない。フレームワークのcurrent/reference資料は後日更新され得る。

### 全23種の比較早見

| 分類   | パターン                    | 分離したいもの・解く問題      | 現代Javaでの読み替え・注意                             |
| ---- | ----------------------- | ----------------- | ------------------------------------------- |
| 生成   | Factory Method          | 利用手順と生成する具象型      | 単なるstatic factoryとは区別。継承の生成フック              |
| 生成   | Abstract Factory        | 関連する製品群と利用側       | DIや設定でファミリーを選べるが、製品間の整合性は契約次第               |
| 生成   | Builder                 | 複雑な組立て手順と完成物      | fluent builderはよく使う変形。recordだけでは多段組立てを代替しない |
| 生成   | Prototype               | 生成元の具象型と複製処理      | copyメソッドでも実現。Cloneableの採用は必須ではない            |
| 生成   | Singleton               | 一意なインスタンスと取得方法    | enumやDIスコープを検討。グローバル可変状態に注意                 |
| 構造   | Adapter                 | 利用したい契約と既存APIの差   | 境界の変換として有効。DTO変換も意味の違いを意識                   |
| 構造   | Bridge                  | 独立して増える二つの変化軸     | 継承の直積を委譲でほどく                                |
| 構造   | Composite               | 単体と階層的集合の扱い       | 木の再帰処理。循環、親所有権、操作の意味に注意                     |
| 構造   | Decorator               | 本体と追加機能           | ラッパーの組合せ。順序とリソース所有権が重要                      |
| 構造   | Facade                  | 複雑なサブシステムと用途別の入口  | 薄いサービス境界に使える。巨大窓口にしない                       |
| 構造   | Flyweight               | 大量オブジェクトと共有可能な状態  | 不変値を共有。計測なしのキャッシュ追加を避ける                     |
| 構造   | Proxy                   | 本体へのアクセスと制御       | JDK動的Proxy、Spring AOP。自己呼出しなどの制約に注意         |
| 振る舞い | Chain of Responsibility | 要求の送信元と処理担当・順序    | フィルター、ミドルウェア。処理の継続条件を明示                     |
| 振る舞い | Command                 | 要求内容と実行時刻・実行者     | Runnable、キュー、Undo。実行要求の永続化は追加設計             |
| 振る舞い | Interpreter             | 文法と評価規則           | 小さなDSL向け。複雑な文法にはパーサーを検討                     |
| 振る舞い | Iterator                | 走査と内部表現           | Iterable、拡張for、Stream。Streamは完全な同義ではない      |
| 振る舞い | Mediator                | 参加者同士の協調規則        | UIやユースケースの調停。巨大な仲介者を避ける                     |
| 振る舞い | Memento                 | 内部状態と履歴管理         | 不変スナップショット。深いコピーと保存量に注意                     |
| 振る舞い | Observer                | 状態変化と通知先          | 旧Observableは非推奨、型付きリスナーやイベントは有効             |
| 振る舞い | State                   | 状態別の振る舞いとContext  | enumやsealed型を活用。単純なswitchで十分な場合も多い          |
| 振る舞い | Strategy                | 目的と交換可能なアルゴリズム    | 関数型インターフェース、ラムダ、DI                          |
| 振る舞い | Template Method         | 固定された手順と変更可能なステップ | 既存の骨格実装を理解。callbackによる委譲も比較                 |
| 振る舞い | Visitor                 | 安定した要素型と増える操作     | sealed + pattern switchが条件付き代替              |

### コードの実行方法と前提

検証結果: 本文のJavaコード23本をOpenJDK 21.0.12.1で個別にコンパイル・実行し、すべて正常終了することを確認した。プレビュー機能は使っていない。実際の検証は同環境のコンパイラモジュールに `-source 21 -target 21 -Xlint:all` を指定して行った。Observer例には、購読解除のためだけに保持するtry-with-resources変数を本体内で参照していないというlint警告が1件あり、動作上のエラーはない。並行性の負荷試験や、説明中の外部フレームワークとの統合実行まで保証するものではない。

各節のJavaコードブロックはそれぞれ独立したプログラムである。`public class` の名前と同じファイル名で保存する。たとえば `StrategyDemo` なら以下のように実行できる。

```sh
javac --release 21 StrategyDemo.java
java StrategyDemo
```

Java 21のソースファイル実行を使うなら `java --source 21 StrategyDemo.java` でもよい。コード間で補助クラスを共有しないため、読みたい節だけを試せる。recordは参照先まで自動的に不変にする機能ではなく、サンプル中のコレクションの防御的コピーなどにも注目してほしい。

## 生成に関する5パターン

### 1 Factory Method ファクトリメソッド

#### 目的と解決する問題

**共通の処理は親クラスに残し、その処理で使うオブジェクトの具体的な種類をサブクラスに決めさせる。** たとえば、帳票出力の「入力を受け取る、検証する、出力する」という手順は同じでも、出力器はテキスト用と CSV 用で異なる。親クラスが具体的な出力器を直接 `new` すると、形式の追加が共通処理の変更につながる。そこで生成処理をオーバーライド可能なメソッドへ分離する。

ここでいう Method は単に「オブジェクトを返すメソッド」という意味ではない。GoF の中心は、**生成をサブクラスの拡張点にすること**にある。名前が `create` や `of` であるだけでは、このパターンとは判定できない。

#### 構造と役割

* Product：利用側が依存する製品の抽象型。例では `Exporter`。
* ConcreteProduct：具体的な製品。`TextExporter` と `CsvExporter`。
* Creator：Product を使う共通処理と、生成用メソッドを定義する `ReportJob`。
* ConcreteCreator：生成用メソッドを実装する `TextJob` と `CsvJob`。

クライアントは Creator を選択し、共通処理を呼ぶ。共通処理が `createExporter()` を呼び、動的ディスパッチで具体的な生成処理が選ばれる。その後の処理は `Exporter` の契約だけを使う。生成メソッドは必ずしも抽象でなくてもよく、既定の製品を返す実装を親クラスに持たせる設計もある。

#### Java例

保存名は `FactoryMethodExample.java`。外部ライブラリ、ファイル出力、ネットワーク通信は使わない。

```java
import java.util.List;
import java.util.stream.Collectors;

public class FactoryMethodExample {
    interface Exporter {
        String export(List<String> rows);
    }

    static final class TextExporter implements Exporter {
        @Override
        public String export(List<String> rows) {
            return String.join("\n", rows);
        }
    }

    static final class CsvExporter implements Exporter {
        @Override
        public String export(List<String> rows) {
            // 1 行 1 フィールドの CSV。引用符を二重化する。
            return rows.stream()
                    .map(row -> "\"" + row.replace("\"", "\"\"") + "\"")
                    .collect(Collectors.joining("\n"));
        }
    }

    abstract static class ReportJob {
        protected abstract Exporter createExporter();

        public final String run(List<String> rows) {
            var snapshot = List.copyOf(rows);
            if (snapshot.isEmpty()) {
                throw new IllegalArgumentException("帳票が空です");
            }
            return createExporter().export(snapshot);
        }
    }

    static final class TextJob extends ReportJob {
        @Override
        protected Exporter createExporter() {
            return new TextExporter();
        }
    }

    static final class CsvJob extends ReportJob {
        @Override
        protected Exporter createExporter() {
            return new CsvExporter();
        }
    }

    public static void main(String[] args) {
        var rows = List.of("Java,21", "設計\"入門");
        for (ReportJob job : List.of(new TextJob(), new CsvJob())) {
            System.out.println(job.run(rows));
            System.out.println("---");
        }
    }
}
```

テキスト形式と、引用符を正しく処理した CSV 形式が順に表示される。形式を増やすときは新しい Product と Creator を追加する。`ReportJob.run()` を変更しない点が、この例の狙いである。`run()` 自体は Template Method の形であり、その内部の生成用フックが Factory Method に相当する。

#### 使う条件と避ける条件と注意点

プラグイン型の文書エディタ、帳票エンジン、パーサ、テスト用基底クラスなど、もともと継承による拡張を提供している仕組みに適する。生成した製品の初期化、検証、利用順序を Creator 側で統制したい場合も有効である。

反対に、生成対象を一つ差し替えるためだけに Creator の継承階層を増やすのは重い。既存の継承上の制約がある場合や、実行時に何度も切り替えたい場合は、製品や生成関数をコンストラクタへ渡す合成を先に検討する。製品が単純で変更の見込みもないなら、直接のコンストラクタ呼び出しの方が読みやすい。

**利点と注意点**

共通処理と具体的な生成を分離でき、追加形式の影響を局所化できる。一方、Product と Creator の二つの階層が増えやすい。生成が毎回必要なのか、キャッシュした同一インスタンスを返してよいのかも契約として明示したい。生成メソッドが返すリソースについては、終了処理の所有者も決める。親クラスのコンストラクタからオーバーライド可能な生成メソッドを呼ぶと、未初期化のサブクラス状態へアクセスする危険があるため避ける。

#### 現在の使われ方と言語・ライブラリとの関係

Factory Method という設計方針に JDK の非推奨指定があるわけではない。JDK の実例として、`DocumentBuilderFactory.newDocumentBuilder()` は抽象インスタンスメソッドであり、具体的なファクトリ実装が `DocumentBuilder` を生成する。一方、同じ型の `newInstance()` はファクトリ実装を取得する静的な入口であり、両者を区別すると理解しやすい。Java 27 API でもこれらに非推奨指定はない。[Java 27 DocumentBuilderFactory](https://docs.oracle.com/en/java/javase/27/docs/api/java.xml/javax/xml/parsers/DocumentBuilderFactory.html#newDocumentBuilder\(\))

Java 8 以降なら `Supplier<Exporter>` とコンストラクタ参照で生成方針を注入できる。ただし、これは継承型の Factory Method を合成へ置き換える選択肢であり、厳密に同じ構造ではない。また `Supplier` は呼ぶたびに新しい値を返すことを要求していない。[Java 21 Supplier](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/function/Supplier.html)

#### 似たパターンとの違い

* 静的ファクトリ：`of()` や `valueOf()` など、コンストラクタ以外の名前付き生成入口。オーバーライドによる生成委譲とは別。
* Simple Factory：引数の `switch` などで生成型を選ぶ一つの工場。GoF 23 パターンの独立した一項目ではない。
* Abstract Factory：互換性のある複数種類の製品を一組で生成することが主題。内部の各生成操作を Factory Method で実装することはある。

### 2 Abstract Factory アブストラクトファクトリ

#### 目的と解決する問題

**関連する複数の製品を、具体的なクラスに依存せず、整合した組み合わせとして生成する。** たとえば UI にボタンとチェックボックスがあり、明色テーマと暗色テーマを切り替えたい。各部品を別々の条件分岐で生成すると、明色ボタンと暗色チェックボックスが混在しやすくなる。一つのテーマ用ファクトリへまとめれば、テーマの選択を一か所に集められる。

重要なのは「何種類も生成できる」ことだけでなく、**同じ系列に属する製品群を一緒に選ぶ理由があること**である。無関係なサービスを大量に返す巨大なファクトリを作る根拠にはならない。

#### 構造と役割

* AbstractFactory：製品の種類ごとの生成操作を定義する `UiFactory`。
* ConcreteFactory：系列を決める `LightFactory` と `DarkFactory`。
* AbstractProduct：製品の役割を表す `Button` と `Checkbox`。
* ConcreteProduct：各系列・各役割の具体的な実装。
* Client：具体クラスを知らず製品群を使う `Screen`。

アプリケーションの組み立て地点で ConcreteFactory を一つ選ぶ。Client はそのファクトリから必要な製品を取得し、その後は抽象インターフェースを通じて操作する。画面を作り直して別のファクトリを渡せば、製品群をまとめて切り替えられる。

#### Java例

保存名は `AbstractFactoryExample.java`。画面部品の描画を文字列で表現する。

```java
public class AbstractFactoryExample {
    interface Button {
        String render();
    }

    interface Checkbox {
        String render();
    }

    interface UiFactory {
        Button createButton();
        Checkbox createCheckbox();
    }

    record LightButton() implements Button {
        public String render() { return "白いボタン"; }
    }

    record LightCheckbox() implements Checkbox {
        public String render() { return "白いチェックボックス"; }
    }

    record DarkButton() implements Button {
        public String render() { return "黒いボタン"; }
    }

    record DarkCheckbox() implements Checkbox {
        public String render() { return "黒いチェックボックス"; }
    }

    static final class LightFactory implements UiFactory {
        public Button createButton() { return new LightButton(); }
        public Checkbox createCheckbox() { return new LightCheckbox(); }
    }

    static final class DarkFactory implements UiFactory {
        public Button createButton() { return new DarkButton(); }
        public Checkbox createCheckbox() { return new DarkCheckbox(); }
    }

    static final class Screen {
        private final Button button;
        private final Checkbox checkbox;

        Screen(UiFactory factory) {
            button = factory.createButton();
            checkbox = factory.createCheckbox();
        }

        String render() {
            return button.render() + " / " + checkbox.render();
        }
    }

    public static void main(String[] args) {
        System.out.println(new Screen(new LightFactory()).render());
        System.out.println(new Screen(new DarkFactory()).render());
    }
}
```

結果は明色の二部品、暗色の二部品の順になる。`Screen` は `LightButton` などを参照していない。ただし、この単純な型設計だけであらゆる混在がコンパイル時に禁止されるわけではない。新しいファクトリの実装を誤れば混在できる。厳密な互換性制約が必要なら、系列を型パラメータで表す、製品群を一つの不変オブジェクトとして返す、契約テストを用意するといった補強を検討する。

#### 使う条件と避ける条件と注意点

UI テーマ、OS ごとの部品セット、ストレージ実装ごとのリーダーとライター、通信方式ごとのエンコーダーとデコーダーなどが候補になる。本番用とインメモリ用の関連オブジェクト群をテストで切り替える場合にも役立つ。単独のオブジェクトを差し替えるだけなら、直接の依存性注入や単一の生成関数で十分なことが多い。

このパターンは**系列の追加**に強いが、**製品の種類の追加**には弱い。たとえば新テーマは ConcreteFactory を追加すればよい。一方、`Slider` を追加すると AbstractFactory と既存のすべての ConcreteFactory の見直しが必要になる。どちらの変更が起きやすいかを見て採用する。

**利点と注意点**

具体的な生成クラスをクライアントから隠し、互換性のある構成を選びやすくする。テストでも製品群をまとめて置換できる。一方、製品数と系列数の積だけ実装が増えやすい。ファクトリをアプリケーション全域から検索する形にすると、依存関係を隠す Service Locator に近づくため、必要なところへ明示的に渡したい。

生成した製品群が一緒に破棄されるべき場合は、生成だけでなく寿命の管理も設計する。また実行途中で系列を変更しても、すでに作られた製品が自動的に置き換わるわけではない。再生成、移行、状態の引き継ぎを別に扱う必要がある。

#### 現在の使われ方と言語・ライブラリとの関係

DI コンテナで関連する実装を一括構成できれば、明示的な AbstractFactory クラスを作らずに同じ設計上の目的を満たせる場合がある。ただし「利用者ごとに系列を選ぶ」「実行中にまとまった製品群を新規生成する」場面では、コンテナとファクトリを併用する価値がある。DI の普及はパターン自体の廃止を意味しない。

JDK では `DatatypeFactory` が XML データ型に対応する `Duration` と `XMLGregorianCalendar` を生成する。複数の抽象製品をプロバイダ実装から取得する構造は、Abstract Factory として読むことができる。これは構造上の対応づけであり、API 名に「GoF 準拠」と書かれているという意味ではない。確認した Java 26 API でこのクラスは非推奨ではない。[Java 26 DatatypeFactory](https://docs.oracle.com/en/java/javase/26/docs/api/java.xml/javax/xml/datatype/DatatypeFactory.html)

#### 似たパターンとの違い

* Factory Method：サブクラスへ生成を委ねる拡張点が中心。Abstract Factory は製品群とその整合性が中心。
* Builder：複数段階の組み立てと、その結果の表現を分離する。Abstract Factory は通常、各操作で利用可能な製品を返す。
* Facade：既存のサブシステムを使いやすくする窓口。関連製品の生成を切り替えることは必須でない。

### 3 Builder ビルダー

#### 目的と解決する問題

**複雑なオブジェクトを作る手順と、完成する表現を切り離す。** 同じ「タイトルを設定し、項目を追加する」という手順で、構造化された帳票オブジェクトとテキスト帳票を作りたい場合、組み立ての手順を共通化し、各ステップの具体的な処理を Builder に任せる。

GoF の Builder と、Java でよく見る `new Builder().name(...).build()` は重なるが同一ではない。前者は**同じ組み立て手順から異なる表現を作れること**が主題である。後者は多数の任意引数、読みやすさ、不変オブジェクトの構築を主目的にした流暢な API で、独立した Director や複数の Product を持たないことも多い。本節のコードは GoF の構造を示す。

#### 構造と役割

* Builder：組み立て操作を定義する `ReportBuilder<T>`。
* ConcreteBuilder：構造化帳票用の `StructuredBuilder` とテキスト用の `TextBuilder`。
* Director：組み立て手順を知る `Director`。
* Product：完成した `Report` または `String`。

クライアントが Builder を選び、Director に渡す。Director は抽象的な組み立て操作を順に呼び、最後に製品を受け取る。ジェネリクスにより、製品に共通の親型がなくても戻り値の型を保てる。Director をクライアント自身が担う設計も可能である。

#### Java例

保存名は `BuilderExample.java`。Builder の可変な作業用リストを完成品へそのまま渡さない点にも注目する。

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class BuilderExample {
    interface ReportBuilder<T> {
        void title(String title);
        void addItem(String item);
        T build();
    }

    record Report(String title, List<String> items) {
        Report {
            title = checkedTitle(title);
            items = List.copyOf(items);
        }
    }

    static String checkedTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("タイトルが必要です");
        }
        return title;
    }

    static final class StructuredBuilder implements ReportBuilder<Report> {
        private String title;
        private final List<String> items = new ArrayList<>();

        public void title(String title) {
            this.title = checkedTitle(title);
        }

        public void addItem(String item) {
            items.add(Objects.requireNonNull(item));
        }

        public Report build() {
            return new Report(title, items);
        }
    }

    static final class TextBuilder implements ReportBuilder<String> {
        private String title;
        private final StringBuilder body = new StringBuilder();

        public void title(String title) {
            this.title = checkedTitle(title);
        }

        public void addItem(String item) {
            body.append("- ").append(Objects.requireNonNull(item)).append('\n');
        }

        public String build() {
            return checkedTitle(title) + "\n" + body;
        }
    }

    static final class Director {
        <T> T weeklyReport(ReportBuilder<T> builder) {
            builder.title("週次報告");
            builder.addItem("設計レビュー完了");
            builder.addItem("結合テスト実施中");
            return builder.build();
        }
    }

    public static void main(String[] args) {
        var director = new Director();
        Report structured = director.weeklyReport(new StructuredBuilder());
        String text = director.weeklyReport(new TextBuilder());
        System.out.println(structured);
        System.out.print(text);
    }
}
```

同じ手順から `Report[title=週次報告, items=[...]]` と、タイトル付きの箇条書きが出力される。コードでは一回の組み立てごとに Builder を新規作成している。再利用する設計に変えるなら、前回の項目の残存、`build()` 後の変更、リセットのタイミングを契約として決める。

#### 使う条件と避ける条件と注意点

複数形式の文書出力、複雑な検索条件、段階的な設定、任意項目の多いリクエスト作成に向く。完成前の不完全な状態を利用者へ露出させたくないときにも有用である。必須項目をコンストラクタに渡し、任意項目だけを設定メソッドにする形は、使い忘れの予防になる。

二、三個の引数で意味が明確な値オブジェクトに、毎回 Builder を導入する必要はない。Java の `record` とコンパクトコンストラクタで簡潔に表せるなら、そちらを優先できる。順序制約が重要なら、段階ごとに異なるインターフェースを返す staged builder も選択肢だが、型の数と保守負担が増える。

**利点と注意点**

組み立ての重複を減らし、生成途中の状態を製品から隔離できる。`build()` を検証境界にでき、完成品を不変にしやすい。ただし Builder を使っただけで不変性や検証が保証されるわけではない。参照先が可変なら防御的コピーが必要であり、`record` も浅い不変性しか持たない。本例の要素は不変な `String` なので `List.copyOf()` で必要な分離を満たせる。[Java 21 Record](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Record.html)

可変な Builder を複数スレッドやリクエストで共有すると、設定が混ざる危険がある。また完成時まで必須項目の不足を検出しない API では、失敗が遅れる。エラーをいつ検出するか、既定値が業務上妥当か、同じ Builder から複数の製品を作れるかを明文化するとよい。

#### 現在の使われ方と言語・ライブラリとの関係

Builder は現行 JDK でも使われる設計である。`HttpRequest.Builder` は設定操作が同じ Builder を返し、`build()` が不変の `HttpRequest` を作る例である。一方、Builder の設定操作は同期されておらず、外部同期なしに複数スレッドから呼ばないよう API に明記されている。Java 27 API に非推奨指定はない。[Java 27 HttpRequest.Builder](https://docs.oracle.com/en/java/javase/27/docs/api/java.net.http/java/net/http/HttpRequest.Builder.html)

#### 似たパターンとの違い

* Abstract Factory：製品群の系列を切り替える。Builder は組み立て過程と完成表現を分離する。
* Fluent Interface：メソッド連鎖などによる読みやすい API のスタイル。Builder でなくても実現できる。
* Prototype：既存の完成品を複製する。Builder は手順や設定を積み上げて製品を構築する。`toBuilder()` は両方の発想を組み合わせた実装になり得る。

### 4 Prototype プロトタイプ

#### 目的と解決する問題

**新しく作るオブジェクトの種類や初期状態を、既存のオブジェクトを複製することで指定する。** たとえばテンプレートに多数の設定があり、それを少しだけ変更した文書を作りたい。毎回すべての初期値を組み立て直す代わりに、テンプレート自身にコピーを作らせる。

クライアントが具象クラスのコンストラクタを知らなくても、共通の `copy()` 契約を通じて実行時の具体型に合った複製を得られることがポイントである。「変数へ同じ参照を代入すること」は複製ではない。また、単にどこかでコピーコンストラクタを呼んでいるだけで、アプリケーション全体が Prototype パターンになっているとも限らない。

#### 構造と役割

* Prototype：複製操作を宣言する `Template`。
* ConcretePrototype：内部状態の正しい複製方法を知る `Document`。
* Client：原型を選び、複製を編集する `main()`。

必要なら「見積書」「議事録」などの名前と原型を対応づけるレジストリを追加できる。Client はレジストリから原型を取得し、コピーを作ってから個別の変更を加える。レジストリは便利な構成要素だが、Prototype の必須要素ではない。

#### Java例

保存名は `PrototypeExample.java`。`Cloneable` に依存せず、複製の意味を `copy()` で明示する。

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class PrototypeExample {
    interface Template {
        Template copy();
        void rename(String title);
        void addTag(String tag);
        String describe();
    }

    static final class Document implements Template {
        private String title;
        private final List<String> tags;

        Document(String title, List<String> tags) {
            this.title = Objects.requireNonNull(title);
            this.tags = new ArrayList<>(List.copyOf(tags));
        }

        @Override
        public Document copy() {
            // リストは新規生成。不変な String 要素は安全に共有する。
            return new Document(title, tags);
        }

        @Override
        public void rename(String title) {
            this.title = Objects.requireNonNull(title);
        }

        @Override
        public void addTag(String tag) {
            tags.add(Objects.requireNonNull(tag));
        }

        @Override
        public String describe() {
            return title + " " + tags;
        }
    }

    public static void main(String[] args) {
        Template original = new Document("定例会", List.of("社内"));
        Template copy = original.copy();
        copy.rename("臨時会");
        copy.addTag("緊急");

        System.out.println(original.describe());
        System.out.println(copy.describe());
        System.out.println("別インスタンス: " + (original != copy));
    }
}
```

出力は `定例会 [社内]`、`臨時会 [社内, 緊急]`、`別インスタンス: true` となる。コピー先に追加したタグが原型へ漏れないことまで確かめている。トップレベルの参照が異なるだけでは、内部状態が独立しているとは限らない。

#### 使う条件と避ける条件と注意点

図形エディタの複製、設定済みのリクエスト雛形、ゲーム内の敵やアイテムの雛形、文書テンプレートなどに向く。実行時に登録された具体型を、型名の条件分岐なしで増やしたい場合にも便利である。初期化が高価な場合は高速化できる可能性があるが、深いコピーの費用もあるため計測が必要になる。

DB 接続、スレッド、ロック、ファイルハンドルなど、外部資源や固有の身元を持つものは安易に複製しない。業務エンティティの ID、監査情報、時刻を引き継ぐのか再採番するのかも、用途ごとに決める。完全に不変な値なら安全に共有できるため、そもそもコピーが不要なことが多い。

**利点と注意点**

型ごとの初期化条件をコピー処理に集約でき、クライアントから具象型への依存を減らせる。一方、**どの参照を共有し、どこを独立させるか**が難所になる。浅いコピーは参照先を共有する。深いコピーは必要な可変部分まで複製するが、循環参照や複数箇所から参照される同一オブジェクトがあると、単純な再帰では壊れる。オブジェクトグラフの対応表で同一性を保つことが必要になる場合もある。

原型が他のスレッドで変更されている最中のコピーは、一貫したスナップショットになるとは限らない。原型を不変にする、編集と複製を同期するなど、並行性の方針も別途必要である。新しいフィールドを追加した際にコピーし忘れないよう、原型とコピーの値、および変更の分離をテストする。

#### 現在の使われ方と言語・ライブラリとの関係

`Object.clone()` はフィールド単位の浅いコピーを行う。`Cloneable` はその操作を許可するためのマーカーであり、`clone()` メソッド自体を宣言しない。このため利用側が一様に扱える公開のコピー API を自動的に得られるわけではない。2026 年 10 月 7 日に確認した Java 27 API で、`Object.clone()` と `Cloneable` は非推奨指定されていない。非推奨と説明される `Object.finalize()` は別のメソッドである。[Java 27 Object.clone](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/lang/Object.html#clone\(\))、[Java 27 Cloneable](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/lang/Cloneable.html)

本節が明示的な `copy()` やコピーコンストラクタを勧めるのは、型、検証、共有方針を表現しやすいという設計判断であり、「clone が廃止されたから」ではない。また Spring の `prototype` スコープは、Bean の取得要求ごとに新しいインスタンスを生成する寿命の設定であり、既存オブジェクトを複製する GoF Prototype とは違う。[Spring Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html#beans-factory-scopes-prototype)

#### 似たパターンとの違い

* Builder：設定を段階的に組み立てる。Prototype は既存の状態を出発点にする。
* Flyweight：共有して個数を減らす。Prototype は必要な部分を複製し独立した変更を可能にする。
* Memento：後で状態を復元するために保存する。Prototype の目的は新しい製品の生成であり、復元先や履歴管理は必須でない。

### 5 Singleton シングルトン

#### 目的と解決する問題

**指定した範囲でインスタンスを一つに制限し、それにアクセスする入口を提供する。** ただし「どこからでもアクセスできると便利」と「本当に一つでなければならない」は分けて考える必要がある。安易な Singleton は、グローバルな可変状態、隠れた依存、テスト間の干渉を持ち込みやすい。

Java では一般に、同じクラスを定義するクラスローダーの範囲で一つになる。JVM 全体、複数 JVM、コンテナの複数レプリカをまたいで一つになるわけではない。「バッチをクラスタ全体で一回だけ実行する」という要件には、分散ロック、リーダー選出、ジョブ基盤など別の仕組みが必要である。

#### 構造と役割

* Singleton：自身の生成と唯一のインスタンスへのアクセスを管理する型。
* Client：そのインスタンスを利用する側。

典型的なクラス実装ではコンストラクタを外部に公開せず、静的なフィールドと取得メソッドを置く。以下では単一要素の `enum` を使う。さらに利用側には抽象インターフェースを渡し、Singleton の取得箇所をアプリケーションの組み立て地点へ集める。

#### Java例

保存名は `SingletonExample.java`。共有するデータを不変にし、テスト用の代替も渡せる構造にする。

```java
import java.util.Map;
import java.util.Objects;

public class SingletonExample {
    interface Labels {
        String text(String key);
    }

    enum ApplicationLabels implements Labels {
        INSTANCE;

        private final Map<String, String> values = Map.of(
                "appName", "蔵書管理",
                "save", "保存"
        );

        @Override
        public String text(String key) {
            return values.getOrDefault(key, key);
        }
    }

    static final class Screen {
        private final Labels labels;

        Screen(Labels labels) {
            this.labels = Objects.requireNonNull(labels);
        }

        String title() {
            return labels.text("appName");
        }
    }

    public static void main(String[] args) {
        var first = ApplicationLabels.INSTANCE;
        var second = ApplicationLabels.INSTANCE;
        System.out.println("同じインスタンス: " + (first == second));
        System.out.println(new Screen(first).title());
        System.out.println(new Screen(key -> "テスト表示").title());
    }
}
```

結果は `同じインスタンス: true`、`蔵書管理`、`テスト表示` となる。`Screen` 自身は Singleton を検索しないため、表示のテストでグローバルな状態を変更する必要がない。この例のラベル程度なら、実務では通常の不変オブジェクトを一度生成して注入するだけでも十分である。ここでは唯一性の仕組みと、依存を表に出す工夫を同時に示している。

#### 使う条件と避ける条件と注意点

アプリケーション内で共有する不変の定義や、数を厳密に制限する意味のある小さな基盤部品が候補になる。ただし資源を管理するからといって、自作 Singleton が必要とは限らない。接続プールやクライアントを一度だけ生成し、DI コンテナやアプリケーションの所有者が開始・終了を管理する方が、構成変更とテストに対応しやすい。

ユーザー別、リクエスト別、テナント別の状態を入れる用途は避ける。一つであることが性能向上を保証するわけでもない。共有の可変状態にアクセスが集中すると、ロック競合や意図しない状態の漏れを起こす。並列テストで順序依存が出る場合は、Singleton の採用範囲を見直す手掛かりになる。

**利点と注意点**

生成数とアクセス経路を制御しやすい一方、寿命が長く、依存先の置換やリセットが難しい。**安全に一度だけ生成することと、その後のメソッド呼び出しがスレッドセーフであることは別問題**である。本例は不変の Map を読むだけだが、可変フィールドを追加したら同期や原子的な更新を別途設計する。

初期化時の副作用、例外、終了処理にも注意する。通常のクラスで遅延初期化するなら、初期化オンデマンドホルダーなど、クラス初期化の保証を利用する形を検討できる。二重チェックロッキングを実装する場合は `volatile` など Java メモリモデル上の要件を満たさなければならず、短く見えるコードを安易に模倣しない。クラス初期化には仕様で定められた同期手順がある。[Java 言語仕様 21 第 12.4.2 節](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html#jls-12.4.2)

#### 現在の使われ方と言語・ライブラリとの関係

単一要素の `enum` は、通常の Java の仕組みでは追加インスタンスの生成、クローン、反射によるインスタンス化が禁止され、シリアライズにも特別な扱いがある。そのため単純な Singleton の実装候補になる。ただし任意の設定をコンストラクタへ注入する設計や柔軟な寿命管理には向かない。[Java 言語仕様 21 第 8.9 節](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.9)

Spring の singleton スコープは、**コンテナごと・Bean 定義ごと**に一つであり、GoF のクラス側に唯一性を持たせる Singleton と範囲が異なる。同じクラスでも Bean 定義やコンテナが別なら複数存在し得る。DI を使うアプリケーションでは、必要な共有範囲をコンテナに管理させる設計をまず検討したい。[Spring Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html#beans-factory-scopes-singleton)

Singleton は言語 API の名称ではないため、JDK の `@Deprecated` の対象として「パターン全体が非推奨」とは言えない。グローバル可変状態を避けるという設計上の助言と、特定の API に対する正式な非推奨指定を混同しない。

#### 似たパターンとの違い

* 静的ユーティリティ：インスタンスを持たず静的メソッドを使う。インターフェース越しにインスタンスを注入する設計とは異なる。
* DI の共有スコープ：外部の管理者がインスタンス数と寿命を管理する。クラス自身が唯一性を強制する必要はない。
* Flyweight：キーや内部状態に応じて複数の共有オブジェクトを使うことが一般的。単一インスタンスを要求しない。

## 構造に関する7パターン

### 6 Adapter アダプター

#### 目的と解決する問題

Adapterは、既存の部品が提供するインターフェースを、利用側が必要とするインターフェースへ変換する。すでに動く外部SDKや旧システムを変更できず、メソッド名、引数、戻り値、単位、例外の形式が新しいコードと合わないときに使う。利用側に変換処理を散らすと、SDK更新のたびに各所を修正しなければならない。変換を境界の一か所へ集めれば、業務コードは自分に必要な契約だけを知ればよい。

#### 構造と役割

主役は、利用側の契約を定めるTarget、既存部品であるAdaptee、両者を接続するAdapter、Targetだけを使うClient。以下では `TemperatureSensor` がTarget、華氏を返す `LegacyProbe` がAdaptee、摂氏へ変換する `FahrenheitAdapter` がAdapter、`main` がClientである。メソッドの名前を変えるだけでなく、意味の違いも吸収している。

#### Java例

ファイル名：`AdapterDemo.java`

```java
import java.util.Objects;

public class AdapterDemo {
    interface TemperatureSensor {                 // Target
        double celsius();
    }

    static final class LegacyProbe {              // Adaptee
        double readFahrenheit() {
            return 77.0;
        }
    }

    record FahrenheitAdapter(LegacyProbe probe)
            implements TemperatureSensor {        // Adapter
        FahrenheitAdapter {
            Objects.requireNonNull(probe);
        }

        @Override
        public double celsius() {
            return (probe.readFahrenheit() - 32.0) * 5.0 / 9.0;
        }
    }

    public static void main(String[] args) {
        TemperatureSensor sensor =
                new FahrenheitAdapter(new LegacyProbe());
        System.out.println(sensor.celsius());
    }
}
```

出力は `25.0`。`main` は旧APIの名前も華氏という単位も知らない。実装を継承するクラスAdapterに対して、これはAdapteeを保持するオブジェクトAdapterである。Javaではクラスの多重継承ができず、外部クラスが `final` の場合もあるため、委譲による構成は適用しやすい。

#### 使う条件と避ける条件と注意点

**実用例：** 外部決済SDKを自社の `PaymentGateway` に合わせる、旧住所モデルを新しいドメインモデルに変換する、ストレージ製品ごとのAPIをアプリケーションのポートへ接続する。単なるデータ写し替えだけでなく、時刻のタイムゾーン、金額の単位、ページ番号、欠損値、エラーの意味を契約として整理することが大切である。

**使うとよいとき：** 既存部品の変更権限がない、移行期間に新旧実装を併用したい、外部依存の詳細をテスト用実装に置き換えたい場合。**避けたいとき：** 自分で変更できる小さなAPIに、名前が違うだけの層を大量に足す場合。変換先に外部SDKの型をそのまま公開すると、境界を設けた効果が薄れる。

利点は外部変更の局所化とテスト容易性。危険は、変換時の情報損失や、本来表せない機能を無理に同じ契約へ押し込むことである。たとえば「未対応」を成功や空値に化けさせず、能力の違いを明示する。SDK由来の例外を変換するときも、原因や再試行可能性を失わないようにする。テストには通常値だけでなく、境界値、失敗、単位変換を含めたい。

#### 現在の使われ方と言語・ライブラリとの関係

JDKの `InputStreamReader` は、バイト入力を文字入力という別の抽象へ変換する例として読める。公式説明にある「bridge」は一般語としての橋渡しであり、その語だけを根拠にGoF Bridgeへ分類しない。本稿ではインターフェース変換という意図からAdapterとして説明する。[InputStreamReaderの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/InputStreamReader.html)

Spring MVCの `HandlerAdapter` は、ハンドラー固有の詳細を `DispatcherServlet` から切り離すSPIである。通常のコントローラーを書くたびに自作するものではなく、フレームワークが適応を担う実例として理解するとよい。[Spring HandlerAdapter](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/HandlerAdapter.html)

#### 似たパターンとの違い

Adapterは「既存の不一致を接続する」、Bridgeは「二つの変化軸を独立に育てる」、Facadeは「複雑な操作を使いやすくまとめる」。ラムダで一メソッドの変換は短く書けるが、複数の変換規則や状態を持つ場合は名前のあるAdapterが読みやすい。古いSDKの廃止はAdapterという考え方の廃止を意味しない。

### 7 Bridge ブリッジ

#### 目的と解決する問題

Bridgeは、利用者に見せる機能の抽象と、その機能を支える実装を分け、双方を独立に拡張できるようにする。「レポートの種類」と「出力形式」が変わる場合、日次テキスト、日次HTML、警告テキスト、警告HTMLという組合せごとにサブクラスを作ると、種類が増えるほど管理が難しくなる。レポート側は出力の契約だけに依存し、実際の描画を別オブジェクトへ委譲する。

#### 構造と役割

役割はAbstraction、RefinedAbstraction、Implementor、ConcreteImplementor。例では `Report` がAbstraction、`DailyReport` と `AlertReport` がその拡張、`Renderer` がImplementor、`TextRenderer` と `HtmlRenderer` が具体実装である。重要なのは単にフィールドへinterfaceを入れることではなく、独立して変わる二軸を発見すること。実装側のAPIは上位操作と一対一でなくてもよく、上位の機能が実装側の基本操作を組み合わせてもよい。

#### Java例

ファイル名：`BridgeDemo.java`

```java
import java.util.List;
import java.util.Objects;

public class BridgeDemo {
    interface Renderer {                          // Implementor
        String render(String title, List<String> lines);
    }

    static final class TextRenderer implements Renderer {
        public String render(String title, List<String> lines) {
            return title + ": " + String.join(", ", lines);
        }
    }

    static final class HtmlRenderer implements Renderer {
        private static String escape(String text) {
            return text.replace("&", "&amp;")
                    .replace("<", "&lt;").replace(">", "&gt;");
        }

        public String render(String title, List<String> lines) {
            return "<h1>" + escape(title) + "</h1><p>"
                    + escape(String.join(", ", lines)) + "</p>";
        }
    }

    abstract static class Report {                // Abstraction
        private final Renderer renderer;

        Report(Renderer renderer) {
            this.renderer = Objects.requireNonNull(renderer);
        }

        abstract String title();
        abstract List<String> lines();

        final String output() {
            return renderer.render(title(), lines());
        }
    }

    static final class DailyReport extends Report {
        DailyReport(Renderer renderer) { super(renderer); }
        String title() { return "Daily"; }
        List<String> lines() { return List.of("orders=12"); }
    }

    static final class AlertReport extends Report {
        AlertReport(Renderer renderer) { super(renderer); }
        String title() { return "Alert"; }
        List<String> lines() { return List.of("stock<5"); }
    }

    public static void main(String[] args) {
        System.out.println(new DailyReport(new TextRenderer()).output());
        System.out.println(new DailyReport(new HtmlRenderer()).output());
        System.out.println(new AlertReport(new HtmlRenderer()).output());
    }
}
```

出力は `Daily: orders=12`、`<h1>Daily</h1><p>orders=12</p>`、`<h1>Alert</h1><p>stock&lt;5</p>` の3行。新しいレポートを追加しても描画側を変更せず、新しい描画形式を追加しても各レポートを変更しない。例のエスケープはHTMLテキスト要素用の最小例であり、属性値やURLなど別の文脈に流用しない。

#### 使う条件と避ける条件と注意点

**実用例：** 通知の種類と送信経路、図形と描画エンジン、業務操作と装置ドライバー、帳票と出力先の分離。**使うとよいとき：** すでに二方向の変更要求があり、組合せを再利用したい場合。種類がm個、実装がn個なら、組合せ専用クラスをm×n個作る代わりに、軸ごとに整理できる。ただし全組合せが意味を持つかは別の問題である。

**避けたいとき：** 実装が一つで将来の増加根拠もない、変わるのが小さな計算規則一つだけ、全ての組合せに特別対応が必要な場合。独立していないものを無理に分けると、interfaceに能力照会や例外分岐が増え、かえって複雑になる。

利点は組合せ爆発の抑制と独立したテスト。コストは間接化と契約設計である。最小の共通APIだけにすると高度な実装の機能が使えず、逆に全実装の機能を詰めると巨大な契約になる。対応できない組合せは生成時に弾くか、別の能力interfaceとして表す。実装の交換を許すなら、保持している接続やバッファの寿命も合わせて設計する。

#### 現在の使われ方と言語・ライブラリとの関係

コンストラクター注入やDIコンテナーはBridgeの実装側を渡す手段になるが、DIを使ったというだけでBridgeになるわけではない。JDBCの標準APIと各ベンダーのドライバーは、抽象と実装を分ける考え方の参考になる。ただしJDBC全体を一つのGoF Bridgeと断定するのではなく、どの二軸を分けたかを説明したい。公式には `DriverManager` がドライバーを管理し、接続取得では `DataSource` の利用が推奨されている。[DriverManagerの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/DriverManager.html)

#### 似たパターンとの違い

Strategyも委譲先を差し替えるため図が似るが、主眼はアルゴリズムの交換。Bridgeは機能側と実装側の双方が育つ構造を扱う。Adapterは既存APIの不一致を接続する意図が中心であり、Bridgeは独立性を設計する意図が中心である。後からBridgeへリファクタリングしてもよく、必ず開発初日に導入するという意味ではない。

### 8 Composite コンポジット

#### 目的と解決する問題

Compositeは、単体の要素と複数の要素からなる集合を、共通の操作で扱えるようにする。ファイルとフォルダー、商品と商品セット、式と部分式のような再帰的な「部分と全体」の構造が対象である。Clientが毎回「これは葉か、集合か」と分岐して内部を歩く代わりに、Componentへ操作を依頼する。集合自身もComponentなので、階層を深くしても利用側のコードは変わらない。

#### 構造と役割

Componentは共通の契約、Leafは子を持たない要素、Compositeは子Componentを保持して操作を委譲・集約する要素である。以下の `Entry`、`FileEntry`、`Directory` が対応する。`Directory.size()` は子それぞれのサイズを足すが、その子がさらにDirectoryかどうかを知らなくてよい。

#### Java例

ファイル名：`CompositeDemo.java`

```java
import java.util.List;
import java.util.Objects;

public class CompositeDemo {
    sealed interface Entry permits FileEntry, Directory {
        long size();
    }

    record FileEntry(String name, long size) implements Entry {
        FileEntry {
            Objects.requireNonNull(name);
            if (size < 0) throw new IllegalArgumentException("negative size");
        }
    }

    record Directory(String name, List<Entry> children) implements Entry {
        Directory {
            Objects.requireNonNull(name);
            children = List.copyOf(children);
        }

        @Override
        public long size() {
            long total = 0;
            for (Entry child : children) {
                total = Math.addExact(total, child.size());
            }
            return total;
        }
    }

    public static void main(String[] args) {
        Entry root = new Directory("root", List.of(
                new FileEntry("readme.txt", 100),
                new Directory("images", List.of(
                        new FileEntry("a.png", 200),
                        new FileEntry("b.png", 50)))));
        System.out.println(root.size());
    }
}
```

出力は `350`。これは実際のディスク操作ではなく、メモリー内の小さな木のモデルである。`List.copyOf` で子リストを防御的にコピーし、作成後に外側から構造を変更できないようにした。`record` 自体が参照先まで自動的に不変にするわけではない。ここでは構成要素も不変にし、下から組み立てる。加算のオーバーフローは `Math.addExact` で検出する。

#### 使う条件と避ける条件と注意点

**実用例：** UI部品ツリー、構文木、検索条件のAND/OR、メニュー、部品表、階層化した設定。**使うとよいとき：** 単体と集合に意味のある共通操作があり、再帰構造を利用側へ露出させたくない場合。単に `List` があるだけではCompositeとは限らず、集合自身も同じ抽象を実装する点が重要である。

**避けたいとき：** 葉と集合の振る舞いがほとんど共通しない、親子ではなく任意の関連グラフが中心、操作が平坦な一括データ処理で済む場合。木として集計したいのに同じノードを複数の親から参照すると、数え方によって二重計上になる。可変の木では循環参照、親ポインターの整合性、削除時の所有権にも注意する。

共通interfaceに `add` / `remove` まで載せる「透過性重視」の設計はClientを単純にできるが、Leafで意味を持たない操作が生まれる。Compositeだけに子管理を置く「安全性重視」の設計ならその問題を避けられる。例は後者をさらに不変構造へ寄せている。

利点は階層の扱いの統一と要素追加の容易さ。危険は、全階層走査のコストが単純な呼出しの陰に隠れること。深い木では再帰によるスタック消費が問題になり、必要なら明示的なスタックによる走査にする。合計値をキャッシュする場合は更新時の無効化が新たな責務となる。部分集合での集計や空の集合の結果もテストする。

#### 現在の使われ方と言語・ライブラリとの関係

AWTの `Container` は `Component` を継承し、子Componentを保持する。これはCompositeの構造を具体的に観察できる例である。APIに古い非推奨メソッドがあっても、部分・全体を共通に扱う設計が非推奨になったという意味ではない。[Containerの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/Container.html)

要素の種類が閉じているなら、`sealed interface` で許可する実装を列挙できる。外部プラグインから要素型を追加したい場合は、閉じるかどうかを慎重に選ぶ。[Java 21のsealed型](https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html) 不変データの記述にはrecordが便利だが、可変な参照先を持つと深い不変性は得られない。[Java 21のrecord](https://docs.oracle.com/en/java/javase/21/language/records.html)

#### 似たパターンとの違い

Decoratorも同じ型のオブジェクトを内包するが、主目的は一つの対象へ機能を重ねること。Compositeは複数の子をまとめた部分・全体構造を表す。Visitorは、その構造を保ったまま操作群を外へ分離するために組み合わせられる。

### 9 Decorator デコレーター

#### 目的と解決する問題

Decoratorは、元のオブジェクトと同じインターフェースを持つラッパーを重ね、個々のオブジェクトへ機能を追加する。継承で「圧縮あり」「暗号化あり」「両方あり」の全組合せを作る代わりに、必要な機能を構成時に選ぶ。同じComponent型で包めるため、利用側は基本実装と装飾済み実装を共通に呼び出せる。

#### 構造と役割

役割はComponent、ConcreteComponent、Decorator、ConcreteDecorator。以下では `TextSource` が共通契約、`Literal` が基本実装、`UpperCase` と `Prefix` がDecoratorとして委譲先を保持する。GoFの構造図にある共通Decorator基底クラスは、転送処理が共通化できる場合に有用だが必須ではない。この例では小さなrecordで役割を直接実装している。

#### Java例

ファイル名：`DecoratorDemo.java`

```java
import java.util.Locale;
import java.util.Objects;

public class DecoratorDemo {
    interface TextSource {
        String read();
    }

    record Literal(String text) implements TextSource {
        Literal { Objects.requireNonNull(text); }
        public String read() { return text; }
    }

    record UpperCase(TextSource source) implements TextSource {
        UpperCase { Objects.requireNonNull(source); }
        public String read() {
            return source.read().toUpperCase(Locale.ROOT);
        }
    }

    record Prefix(TextSource source, String prefix) implements TextSource {
        Prefix {
            Objects.requireNonNull(source);
            Objects.requireNonNull(prefix);
        }
        public String read() {
            return prefix + source.read();
        }
    }

    public static void main(String[] args) {
        TextSource base = new Literal("hello");
        TextSource a = new UpperCase(new Prefix(base, "[info] "));
        TextSource b = new Prefix(new UpperCase(base), "[info] ");
        System.out.println(a.read());
        System.out.println(b.read());
    }
}
```

出力は `[INFO] HELLO` と `[info] HELLO`。装飾は一般に交換可能ではなく、順序が意味を変える。`a` は接頭辞まで大文字化し、`b` は本文を大文字化した後で接頭辞を付ける。実務の圧縮と暗号化、認証とキャッシュ、再試行と計測でも同じように順序が重要になる。

#### 使う条件と避ける条件と注意点

**実用例：** ストリームへのバッファリングや圧縮、HTTPクライアントへの計測、リポジトリーへの監査、サービス呼出しへの制限や検証。**使うとよいとき：** 機能を任意に組み合わせたい、元のクラスを変更できない、全インスタンスでなく一部にだけ機能を足したい場合。必要な組合せを作る責務はファクトリーやDI設定へ置くとよい。

**避けたいとき：** 装飾後の契約が元の契約とかけ離れる、同じ機能を何重にも適用する事故が多い、呼出しの通り道を理解できないほどラッパーが深い場合。固定した一つの処理しか必要ないなら、普通のメソッド抽出の方が読みやすい。

利点は継承の組合せ爆発を避けられることと、追加責務を単独でテストできること。危険は呼出し順序、例外、リソース所有権が分かりにくくなること。`close()` を外側だけでよいのか、内側も所有するのかを明確にする。元オブジェクトとの同一性や `equals` に期待するコードにも注意が必要である。装飾が戻り値を加工する場合は、Componentの契約がその加工を許す必要がある。

また、一見透過的な再試行Decoratorでも、副作用のある処理を複数回実行すれば二重処理につながる。冪等性、例外の分類、最大試行回数を契約に含める。個別Decoratorのテストに加え、実際に採用する順序で統合テストすることが重要である。

#### 現在の使われ方と言語・ライブラリとの関係

`FilterInputStream` は内側の `InputStream` へ委譲し、派生クラスが変換や機能追加を行う。JDKに残る分かりやすいDecoratorの実例であり、`BufferedInputStream` などの階層を読むと構造がつかめる。ただしフィルター作成では、単一バイト版と配列版など各オーバーロードの委譲仕様を確認し、一つだけ上書きすれば全読込みを捕捉できるとは考えない。[FilterInputStreamの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/FilterInputStream.html)

一メソッドの機能合成ならラムダや関数の合成で簡潔に表せる。状態、複数メソッド、リソース寿命を持つ場合は明示的なラッパーが役に立つ。AOPによる横断処理も関連するが、適用対象や順序が設定側へ隠れる点を理解する。

#### 似たパターンとの違い

Proxyとはクラス図がほぼ同じになりうる。Decoratorは責務の追加・積み重ねを意図し、Proxyは実体へのアクセスや生成の制御を意図する。Adapterは利用側のインターフェースを変える。呼び名は形だけでなく「何の問題を解いたか」で選ぶ。

### 10 Facade ファサード

#### 目的と解決する問題

Facadeは、複数のクラスや手順からなるサブシステムへ、目的に沿った分かりやすい入口を提供する。Clientが検索、計算、整形などの細かな順序を毎回知る必要があると、内部変更が呼出し側へ広がる。入口へ依頼すれば一連の利用手順がまとまり、Clientとサブシステムの依存を減らせる。

#### 構造と役割

中心はFacade、Subsystem classes、Client。以下では `Catalog`、`Pricing`、`QuoteFormatter` が内部の部品で、`QuoteFacade` が「見積もりを表示用文字列にする」という一つの用途を公開する。内部部品がFacadeを知る必要はない。Facadeにinterfaceや継承が必須なわけでもなく、静的メソッドの集合に限定されるわけでもない。

#### Java例

ファイル名：`FacadeDemo.java`

```java
import java.util.Map;
import java.util.Objects;

public class FacadeDemo {
    record Product(String name, long unitYen) {}

    static final class Catalog {
        private final Map<String, Product> products = Map.of(
                "BOOK", new Product("Java book", 3000));

        Product find(String sku) {
            Product product = products.get(sku);
            if (product == null) {
                throw new IllegalArgumentException("unknown sku: " + sku);
            }
            return product;
        }
    }

    static final class Pricing {
        long total(Product product, int quantity) {
            if (quantity <= 0) {
                throw new IllegalArgumentException("quantity must be positive");
            }
            return Math.multiplyExact(product.unitYen(), quantity);
        }
    }

    static final class QuoteFormatter {
        String format(Product product, int quantity, long total) {
            return product.name() + " x " + quantity + " = JPY " + total;
        }
    }

    record QuoteFacade(Catalog catalog, Pricing pricing,
                       QuoteFormatter formatter) {
        QuoteFacade {
            Objects.requireNonNull(catalog);
            Objects.requireNonNull(pricing);
            Objects.requireNonNull(formatter);
        }
        String quote(String sku, int quantity) {
            Product product = catalog.find(sku);
            long total = pricing.total(product, quantity);
            return formatter.format(product, quantity, total);
        }
    }

    public static void main(String[] args) {
        var quotes = new QuoteFacade(
                new Catalog(), new Pricing(), new QuoteFormatter());
        System.out.println(quotes.quote("BOOK", 2));
    }
}
```

出力は `Java book x 2 = JPY 6000`。説明を絞るため整数円・固定価格・税計算なしのメモリー内モデルであり、購入や決済は行わない。Clientが必要とする操作は一回で、商品取得と計算と表示の順序はFacadeに集約されている。

#### 使う条件と避ける条件と注意点

**実用例：** 動画変換ライブラリーの簡易API、注文照会用のアプリケーションサービス、複数の設定読込みをまとめる起動API、外部システム連携のユースケース単位の入口。**使うとよいとき：** 多くの利用側が同じ手順を繰り返す、内部の変更を外へ伝播させたくない、初心者向けの入口と詳細APIを分けたい場合。

**避けたいとき：** すでに単純なAPIに転送だけの層を増やす、関係のない業務まで一つの `Manager` や `Service` へ集める場合。Facadeの役割はまとまりのある入口であり、全システムの仕事を引き受ける巨大クラスではない。機能領域やユースケースごとに分け、下位の業務規則は担当する部品に残す。

利点は呼出し手順と依存の簡素化、内部実装の交換しやすさ。危険は、便利な一呼出しが重いI/Oや長い処理を隠すことと、一つのメソッドが成功の意味を曖昧にすること。たとえば支払い、在庫、通知をまとめても、それだけで全操作が原子的になるわけではない。部分失敗、補償、タイムアウト、再実行の意味を別途設計する。

Facadeを置くだけでは下位APIへの直接アクセスは禁止されない。必要ならパッケージ構成やモジュールの公開範囲で境界を補強する。テストでは内部呼出しの回数を過度に固定するより、入口が約束する結果と失敗時の振る舞いを確認すると内部の改善を妨げにくい。

#### 現在の使われ方と言語・ライブラリとの関係

SLF4Jは公式にロギングのFacadeと説明されている。アプリケーションのログ出力APIと実際のバックエンドを分け、SLF4J 2.0系はServiceLoaderでproviderを見つける。これは、パターンが古い実装技術と一緒に廃止されるのではなく、実装手段を変えながら生きる例である。[SLF4J公式マニュアル](https://slf4j.org/manual.html)

JDKの `Files.readString` は読込み、文字デコード、クローズを簡潔に利用できるAPIであり、Facade的な利便性を考える参考になる。本稿の設計上の見立てであり、JDKがそのメソッドをGoF Facadeと命名しているわけではない。ファイル全体を読むため、大きなファイルには向かないという制約も公式に明記されている。[Filesの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Files.html#readString\(java.nio.file.Path\))

#### 似たパターンとの違い

Adapterは不一致のある契約を変換し、Facadeは使い方を簡単にする。Mediatorは複数オブジェクト間の相互作用を中央へ集めるが、Facadeでは通常、内部部品は入口の存在を知らない。Facadeの中でAdapterやBuilderを使うこともあり、パターンは排他的な分類ではない。

### 11 Flyweight フライウェイト

#### 目的と解決する問題

Flyweightは、大量の似たオブジェクトが持つ共通部分を共有し、メモリー使用を減らす。文字の種類や表示スタイルは共通でも、画面上の座標は各文字ごとに違う。全情報を毎回複製する代わりに、共有可能な内部状態（intrinsic state）と、使用箇所ごとの外部状態（extrinsic state）を分ける。

#### 構造と役割

Flyweightは共有するオブジェクト、FlyweightFactoryはキーに応じて共有物を取得・生成する管理役、ClientやContextは座標などの外部状態を保持する役である。以下では `Style` がFlyweight、`StyleFactory` がFactory、`Label` がContext。Styleに座標を持たせないことが、共有を安全にする核心となる。

#### Java例

ファイル名：`FlyweightDemo.java`

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class FlyweightDemo {
    record StyleKey(String font, int size, String color) {
        StyleKey {
            Objects.requireNonNull(font);
            Objects.requireNonNull(color);
            if (size <= 0) throw new IllegalArgumentException("invalid size");
        }
    }

    record Style(StyleKey key) {                   // Intrinsic state
        Style { Objects.requireNonNull(key); }
        String draw(String text, int x, int y) {   // Extrinsic state
            return text + "@(" + x + "," + y + ") "
                    + key.font() + "/" + key.size() + "/" + key.color();
        }
    }

    static final class StyleFactory {
        private final Map<StyleKey, Style> pool = new HashMap<>();

        Style get(StyleKey key) {
            Objects.requireNonNull(key);
            return pool.computeIfAbsent(key, Style::new);
        }

        int sharedCount() { return pool.size(); }
    }

    record Label(String text, int x, int y, Style style) {
        Label {
            Objects.requireNonNull(text);
            Objects.requireNonNull(style);
        }
        String draw() { return style.draw(text, x, y); }
    }

    public static void main(String[] args) {
        var factory = new StyleFactory();
        var a = new Label("A", 0, 0,
                factory.get(new StyleKey("Sans", 12, "black")));
        var b = new Label("B", 10, 0,
                factory.get(new StyleKey("Sans", 12, "black")));
        System.out.println(a.draw());
        System.out.println(b.draw());
        System.out.println("shared=" + (a.style() == b.style()));
        System.out.println("styles=" + factory.sharedCount());
    }
}
```

出力は `A@(0,0) Sans/12/black`、`B@(10,0) Sans/12/black`、`shared=true`、`styles=1` の4行。異なるラベルが同じStyleを参照する。ここでの `==` は共有を観察するためであり、一般の値比較を参照同一性へ置き換えることを勧める例ではない。

#### 使う条件と避ける条件と注意点

**実用例：** エディターの文字スタイル、地図やゲームの共通描画資源、同じ属性が反復する構文要素やメタデータ。**使うとよいとき：** オブジェクト数が多く、共通状態の重複が測定上のメモリー問題になっており、共有キーの種類が利用箇所数より十分少ない場合。小さなデータ一個を共有するだけでは、Mapやキーの管理コストの方が大きくなることもある。

**避けたいとき：** 状態の大半が個別、キーの種類がほぼ無制限、共有部分が頻繁に書き換わる、オブジェクトの固有性自体が業務上重要な場合。共通物を可変にすると、一か所の変更が全利用箇所へ波及する。recordも参照先の深い不変性までは保証しないため、共有対象の内容まで確認する。

利点は重複メモリーと同じ資源の構築回数を減らせること。コストはFactoryの検索、外部状態の受渡し、共有物の寿命管理。例の `HashMap` は単一スレッド用で上限もない。実用では並行アクセス、上限、破棄単位を決める。何でもグローバルな永久キャッシュにすると、節約するつもりがメモリー保持の原因になる。

キャッシュから取り除いても、利用側が共有物を参照していればその物は残る。再生成後に同じ値のインスタンスが複数存在してもよいかを考え、通常は値として正しく振る舞うようにする。参照の同一性を業務上の識別子にしてしまうと、キャッシュの最適化が契約変更になってしまう。

#### 現在の使われ方と言語・ライブラリとの関係

JDKの `Integer.valueOf(int)` は少なくとも−128〜127をキャッシュする。これは共有による再利用の身近な参考例であり、すべてのGoFの役割がそのまま表れているという主張ではない。Java 21では `new Integer(...)` のコンストラクターが削除予定の非推奨APIだが、`valueOf` やFlyweightが非推奨という意味ではない。Integerは値ベースのクラスなので値は `equals` 等で比較し、ロック対象としても使わない。[Integerの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html)

並行Factoryには `ConcurrentHashMap.computeIfAbsent` が候補となる。ただしMapの安全性と、共有する値の安全性、キャッシュの容量管理は別問題であり、実装を変えるだけで全問題が解決するわけではない。[ConcurrentHashMapの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html#computeIfAbsent\(K,java.util.function.Function\))

#### 似たパターンとの違い

Singletonは「インスタンスを一つに制御する」意図、Flyweightは「多数の文脈で共通状態を共有する」意図。Object Poolは貸出し・返却・再利用が中心で、通常一つの資源を同時に共有するFlyweightとは所有権の考え方が違う。汎用キャッシュも関連するが、何を内部状態として切り出したかがFlyweightの説明の要点となる。

### 12 Proxy プロキシ

#### 目的と解決する問題

Proxyは、実体と同じインターフェースを持つ代理を置き、実体へのアクセスを制御する。重いオブジェクトを必要になるまで作らないVirtual Proxy、権限を確認するProtection Proxy、遠隔サービスを表すRemote Proxyなど、制御したいものによって用途が変わる。Clientへ実体を直接渡さず代理を渡すことで、Clientの呼出し方を保ったままアクセス時の振る舞いを管理できる。

#### 構造と役割

Subjectは共通契約、RealSubjectは本体、Proxyは本体を保持または取得して仲介する役である。例の `Document`、`RealDocument`、`LazyDocument` が対応する。ここでは遅延生成だけに絞り、最初の `read()` で初めて実体を作る。Proxyのクラスは手で書いてもよく、リフレクションやフレームワークは必須ではない。

#### Java例

ファイル名：`ProxyDemo.java`

```java
import java.util.Objects;

public class ProxyDemo {
    interface Document {
        String read();
    }

    static final class RealDocument implements Document {
        private final String contents;

        RealDocument(String id) {
            System.out.println("load " + id);
            // 教材ではメモリー内の文字列。本番なら重い読込みに相当する。
            contents = "contents of " + id;
        }

        @Override
        public String read() { return contents; }
    }

    static final class LazyDocument implements Document {
        private final String id;
        private RealDocument target;

        LazyDocument(String id) {
            this.id = Objects.requireNonNull(id);
        }

        @Override
        public synchronized String read() {
            if (target == null) {
                target = new RealDocument(id);
            }
            return target.read();
        }
    }

    public static void main(String[] args) {
        Document document = new LazyDocument("manual");
        System.out.println("proxy created");
        System.out.println(document.read());
        System.out.println(document.read());
    }
}
```

出力は `proxy created`、`load manual`、`contents of manual`、`contents of manual` の4行。生成メッセージは初回だけ現れる。例は `synchronized` により初期化と参照公開を単純に安全化し、同じProxyへの読取りを直列化する。本体生成が例外で失敗した場合、代入は完了せず次の呼出しで再試行される設計である。永続的な失敗を記憶するか、再試行するかは用途で決める。

#### 使う条件と避ける条件と注意点

**実用例：** 重い画像や設定の遅延ロード、RPCクライアント、権限付きサービス、ORMの遅延取得、フレームワークのトランザクションやキャッシュの介入。**使うとよいとき：** Clientの契約を保ちながら、生成時期やアクセス条件を一か所で制御したい場合。**避けたいとき：** 呼出しの実コストや失敗条件を隠す方が危険な場合。遠隔通信がローカル呼出しと同じ記法でも、遅延、通信断、部分失敗は消えない。

利点はClientからアクセス制御の詳細を分離できること。危険は予期しないI/O、認証済みと未認証の結果の混同、参照同一性や型判定への依存である。キャッシュProxyならキーに利用者や権限の条件を含める必要がある場合もある。アプリケーション内のProxyによる権限確認だけでは、直接到達できる本体やサーバーへのアクセスを防げないため、信頼境界での検証を省かない。

遅延生成には競合、失敗後の扱い、初期化時間、資源解放の責務が伴う。Clientが `RealDocument` へダウンキャストしなければ使えないAPIなら、代理の透過性は失われる。テストでは初回、2回目、同時呼出し、失敗時を区別し、代理を通った時だけ保証されることを明示する。

#### 現在の使われ方と言語・ライブラリとの関係

JDKの `Proxy.newProxyInstance` は、指定したインターフェースの呼出しを `InvocationHandler` へ転送する動的Proxyを作る。Java 21の `Proxy.getProxyClass` は非推奨だが、代わりに `newProxyInstance` が案内されており、Proxyパターン自体が非推奨なのではない。JDK動的Proxyの対象はクラスではなくインターフェースで、sealed interfaceもそのまま対象にはできない。[Proxyの公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/Proxy.html)

Spring AOPはJDK動的ProxyまたはCGLIBによるProxyを用いる。クラスベースのProxyでは `final` クラスや `final` / `private` メソッドなどに制約があり、対象自身による `this.method()` 呼出しは通常Proxyを通らずAdviceを迂回する。具体的な方式は設定やSpring Bootとの組合せでも変わるため、「Springは常にJDK Proxy」とは覚えない。[SpringのProxy公式説明](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)

#### 似たパターンとの違い

Decoratorは責務を任意に重ねる意図が中心で、Proxyは本体の代役としてアクセスを制御する意図が中心。Adapterはインターフェースを変える。構造が似ても、遅延、権限、遠隔性を何の契約として扱うかを説明すると、採用理由がはっきりする。

## 振る舞いに関する11パターン

### 13 Chain of Responsibility 責任の連鎖

#### 目的と解決する問題

要求を送る側が、処理できる担当者を直接選ばなくてよいようにする。候補を順番につなぎ、各候補が「ここで処理する」「次へ渡す」を判断する。例えば問い合わせ窓口で、パスワード問題は認証担当、請求問題は決済担当へ回す。呼び出し側に担当者一覧の条件分岐を埋め込むと、担当追加のたびに呼び出し側まで変わる。本パターンは、その選択と順序をハンドラーの連鎖へ移す。

典型的なGoFの形は、最初に引き受けた担当が処理を完了する。実務には、認証、監査、圧縮のように複数段が仕事をして継続する形もある。どちらも連鎖に見えるが、停止条件と結果の扱いが違うため、同じ説明のまま混ぜない。

#### 構造と役割

* Handler：処理を受け付ける共通契約と、次の候補への委譲を定める。
* ConcreteHandler：自分が引き受ける条件と、具体的な処理を実装する。
* Client：連鎖を組み立て、その入口へ要求を渡す。
* Request：判定に必要な情報を運ぶ。後続が必要な情報を途中で壊さない契約が重要になる。

#### Java例

`ChainOfResponsibilityDemo.java` として保存する。各問い合わせは最大1人が処理し、担当がいない場合も明示的な結果にする。

```java
public class ChainOfResponsibilityDemo {
    enum Kind { PASSWORD, BILLING, OTHER }
    record Ticket(Kind kind, String description) {}

    abstract static class Handler {
        private final Handler next;

        Handler(Handler next) {
            this.next = next;
        }

        final String handle(Ticket ticket) {
            if (accepts(ticket)) {
                return process(ticket);
            }
            return next == null
                    ? "担当なし: " + ticket.description()
                    : next.handle(ticket);
        }

        protected abstract boolean accepts(Ticket ticket);
        protected abstract String process(Ticket ticket);
    }

    static final class PasswordHandler extends Handler {
        PasswordHandler(Handler next) { super(next); }

        protected boolean accepts(Ticket ticket) {
            return ticket.kind() == Kind.PASSWORD;
        }

        protected String process(Ticket ticket) {
            return "認証担当: " + ticket.description();
        }
    }

    static final class BillingHandler extends Handler {
        BillingHandler(Handler next) { super(next); }

        protected boolean accepts(Ticket ticket) {
            return ticket.kind() == Kind.BILLING;
        }

        protected String process(Ticket ticket) {
            return "決済担当: " + ticket.description();
        }
    }

    public static void main(String[] args) {
        Handler desk = new PasswordHandler(new BillingHandler(null));
        System.out.println(desk.handle(
                new Ticket(Kind.PASSWORD, "ログインできない")));
        System.out.println(desk.handle(
                new Ticket(Kind.BILLING, "請求内容を確認したい")));
        System.out.println(desk.handle(
                new Ticket(Kind.OTHER, "取材の相談")));
    }
}
```

結果は「認証担当」「決済担当」「担当なし」の順になる。第2の問い合わせを追うと、入口は種類だけを判定して次へ渡し、決済担当が結果を返す。入口を使うコードは担当の選択条件を知らない。担当ごとのテストに加え、連鎖全体の順序と未処理経路をテストすると、設定の誤りも発見しやすい。

#### 使う条件と避ける条件と注意点

入力検査、権限チェック、障害時の段階的フォールバック、問い合わせの振り分けなど、候補と優先順位が増減する処理に向く。各段を単独で交換・テストでき、呼び出し側の依存を減らせる。一方、種類が固定され、単なるキーと担当者の対応で済むなら、Mapによる振り分けのほうが直接的である。必ず全段を通す計算処理なら、パイプラインとして明示したほうが意図が伝わる場合もある。

順序には意味がある。広すぎる条件を先頭に置けば、後続は永久に実行されない。継続の呼び忘れ、循環、例外の握りつぶし、未処理要求の消失にも注意する。認可で「担当なし」を成功扱いすると危険なので、拒否などの終端方針を明示する。非同期化する場合は、キャンセル、タイムアウト、文脈情報の引継ぎも別途設計する。

#### 現在の使われ方と言語・ライブラリとの関係

2026年10月7日に確認したJakarta Servlet 6.1の `Filter` は、`FilterChain.doFilter` で次へ進めるか、呼ばずに処理を止めるAPIを持つ。前後処理も可能なため、本例の「1人が引き受ける連鎖」から発展した実例として理解するとよい。[Jakarta Servlet Filter公式API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/filter)

#### 似たパターンとの違い

Strategyは選ばれた1つの方式へ処理を委ねる。Chain of Responsibilityは候補をたどり、誰が処理するかを実行時に決める。Decoratorは同じサービスを包んで機能を追加することが主眼であり、担当探しが主眼ではない。連鎖がラムダのリストで実装されても設計意図は残る。クラス数が減ったことと、パターンの役割がなくなったことは別である。

### 14 Command コマンド

#### 目的と解決する問題

「何をするか」という要求をオブジェクトとして表し、要求を出す側と実際に仕事をする側を分離する。ボタンに操作の中身を直接書くと、ショートカット、メニュー、バッチから同じ操作を呼ぶたびに結合や重複が生じる。Commandにすると、入口は `execute()` を呼ぶだけになり、操作をキューに入れる、履歴に積む、まとめて実行するといった制御を共通化できる。

操作のオブジェクト化だけが必須であり、Undo、永続化、非同期実行は追加の要求である。Commandを作っただけで「再実行して安全」「途中失敗から復旧できる」とは限らない。

#### 構造と役割

* Command：実行の契約を定める。必要なら取消しや説明情報も持つ。
* ConcreteCommand：操作の引数とReceiverを保持し、実行時に呼び出す。
* Receiver：音量変更など、本来の業務処理を行う。
* Invoker：実行時期、キュー、履歴を扱う。本例では `History` が担当する。
* Client：ReceiverとCommandを組み合わせてInvokerへ渡す。

#### Java例

`CommandDemo.java` として保存する。音量変更を2回行い、最後の変更だけを戻す。履歴がある間、ReceiverはこのInvoker経由だけで更新する前提である。

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class CommandDemo {
    interface Command {
        void execute();
        void undo();
    }

    static final class Speaker {
        private int volume = 20;

        int volume() { return volume; }

        void setVolume(int value) {
            if (value < 0 || value > 100) {
                throw new IllegalArgumentException("音量は0から100");
            }
            volume = value;
        }
    }

    static final class SetVolume implements Command {
        private final Speaker speaker;
        private final int target;
        private int previous;
        private boolean executed;

        SetVolume(Speaker speaker, int target) {
            this.speaker = speaker;
            this.target = target;
        }

        public void execute() {
            if (executed) {
                throw new IllegalStateException("実行中の操作は再利用しない");
            }
            previous = speaker.volume();
            speaker.setVolume(target);
            executed = true;
        }

        public void undo() {
            if (!executed) {
                throw new IllegalStateException("未実行の操作は戻せない");
            }
            speaker.setVolume(previous);
            executed = false;
        }
    }

    static final class History {
        private final Deque<Command> done = new ArrayDeque<>();

        void execute(Command command) {
            command.execute();
            done.push(command);
        }

        void undo() {
            if (!done.isEmpty()) {
                done.peek().undo();
                done.pop();
            }
        }
    }

    public static void main(String[] args) {
        Speaker speaker = new Speaker();
        History history = new History();
        history.execute(new SetVolume(speaker, 50));
        history.execute(new SetVolume(speaker, 80));
        System.out.println(speaker.volume()); // 80
        history.undo();
        System.out.println(speaker.volume()); // 50
    }
}
```

`SetVolume` が前の音量を記録し、履歴は操作の中身を知らずに実行と取消しを行う。実行が失敗したCommandは履歴に入れない。これは単一スレッドの小さな例であり、汎用的なトランザクションや並行編集を実現してはいない。

#### 使う条件と避ける条件と注意点

GUIの操作履歴、バックグラウンドジョブ、マクロ、運用ツールの操作一覧に向く。操作単位に監査情報や権限確認を追加しやすく、呼び出し元を増やしてもReceiverのAPIを散在させずに済む。単に1回メソッドを呼ぶだけなら、Commandクラスや共通履歴まで導入する必要はない。

再試行する操作には、重複実行を検出する識別子や冪等性を検討する。送金・メール送信のような外部作用は、値を戻すだけでは取消せない。履歴に積む順番、途中失敗時に何が完了したか、複数操作をまとめる境界も重要である。永続キューでは、生のReceiver参照やラムダを保存するより、操作種別と引数をデータ化し、実行時に依存を解決する設計が扱いやすい。

#### 現在の使われ方と言語・ライブラリとの関係

`Runnable` は戻り値のない操作を表す関数型インターフェースで、ラムダやメソッド参照で小さなCommand相当の役割を表現できる。`Executor` はその投入と実行方法を分離する。ただし、Executorは同じ呼び出しスレッドで実行してもよく、非同期は契約上の必須条件ではない。Undoや履歴もRunnableの標準機能ではない。[Runnable公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runnable.html)、[Executor公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Executor.html)

#### 似たパターンとの違い

Strategyは「どう計算するか」の差し替えに重点を置く。Commandは「この操作を実行する」という依頼を保存・移動・制御する。Mementoは過去の状態を保存するため、CommandがUndo用のMementoを持つ組合せも自然である。関数型記法でクラスの記述量が減っても、要求と実行の分離という価値は変わらない。

### 15 Interpreter インタプリタ

#### 目的と解決する問題

小さな言語の構文をオブジェクト構造として表し、その構造を評価する規則を定める。「単価 × 個数 ＋ 送料」のような式や、条件を組み合わせた検索規則を、場当たり的な文字列処理と条件分岐で扱うと、文法が増えるたびに処理が崩れやすい。式の種類ごとに意味を担当させると、文法と評価処理の対応が明確になる。

本パターンの中心は構文木の評価である。テキストを読み取る字句解析・構文解析は別の仕事であり、必ず手書きパーサーを作るわけではない。以下では木をJavaコードで組み立て、評価そのものに集中する。

#### 構造と役割

* AbstractExpression：式を評価する共通契約。本例では `Expr`。
* TerminalExpression：これ以上分解しない定数や変数。本例では `Number` と `Variable`。
* NonterminalExpression：子の式を組み合わせる演算。本例では `Add` と `Multiply`。
* Context：変数の値など、評価時の環境。本例ではMap。
* Client：構文木とContextを用意して評価を開始する。

#### Java例

`InterpreterDemo.java` として保存する。対象言語は整数、変数、加算、乗算だけとし、構文木が演算のまとまりを明示する。

```java
import java.util.Map;

public class InterpreterDemo {
    sealed interface Expr permits Number, Variable, Add, Multiply {
        int eval(Map<String, Integer> context);
    }

    record Number(int value) implements Expr {
        public int eval(Map<String, Integer> context) {
            return value;
        }
    }

    record Variable(String name) implements Expr {
        public int eval(Map<String, Integer> context) {
            Integer value = context.get(name);
            if (value == null) {
                throw new IllegalArgumentException("未定義の変数: " + name);
            }
            return value;
        }
    }

    record Add(Expr left, Expr right) implements Expr {
        public int eval(Map<String, Integer> context) {
            return Math.addExact(left.eval(context), right.eval(context));
        }
    }

    record Multiply(Expr left, Expr right) implements Expr {
        public int eval(Map<String, Integer> context) {
            return Math.multiplyExact(left.eval(context), right.eval(context));
        }
    }

    public static void main(String[] args) {
        Expr total = new Add(
                new Multiply(new Variable("price"), new Variable("quantity")),
                new Number(500));
        Map<String, Integer> context = Map.of("price", 1200, "quantity", 3);
        System.out.println(total.eval(context)); // 4100
    }
}
```

最上位の `Add` が左右を評価し、左側の `Multiply` がさらに2つの変数を評価する。結果は `1200 × 3 + 500 = 4100`。未定義変数は明示的な例外とし、整数演算の桁あふれも `Math.*Exact` によって例外になる。実際の金額計算では、通貨、端数処理、桁の扱いを定めたうえでBigDecimal等の型を検討する。

#### 使う条件と避ける条件と注意点

小さな社内DSL、検索条件、計算式、設定ルールの評価など、文法が狭く安定している場合に向く。構文要素ごとのテストが書きやすく、新しい演算を局所的に追加できる。本例のような副作用のない評価なら、同じ式を異なるContextで安全に比較しやすい。

一方、多数の構文、型推論、詳細なエラー位置、最適化が必要な言語では、手作業でクラスを増やす費用が大きい。既存の式エンジンやパーサー生成器を使うことを検討する。利用者の入力を実行できる式として受け取る場合は、許可する演算、参照対象、式の長さ・深さ、評価時間を制限する。式エンジンの導入自体はサンドボックス化を意味しない。

#### 現在の使われ方と言語・ライブラリとの関係

recordsは式ノードのデータを簡潔に表し、sealed型は式の種類を限定する助けになる。Java 21ではどちらもプレビューなしで使用できる。recordは参照先まで自動的に不変化する仕組みではないため、可変の子リストを持つなら防御的コピー等が必要になる。[Java 21 Record Classes公式ガイド](https://docs.oracle.com/en/java/javase/21/language/records.html)、[Java 21 Sealed Classes公式ガイド](https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html)

SpringのSpELは実行時の式評価やオブジェクトグラフへのアクセスを提供する。これは既存エンジンを使う選択肢であり、内部の全構造をGoFのクラス図そのものと断定する必要はない。JDKの `Pattern` も正規表現という言語を扱うAPIだが、同様に「言語の評価」という関連と「GoFの厳密な実装」は分けて考える。[SpEL公式リファレンス](https://docs.spring.io/spring-framework/reference/core/expressions.html)、[Pattern公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html)

#### 似たパターンとの違い

Compositeは木の構造を統一的に扱う考え方で、Interpreterの構文木と併用できる。Visitorは、その木に対する評価・整形・検査などの操作を外へ分離できる。Interpreterを常に自作する必要が薄れたことと、式を構文と意味に分ける設計が不要になったことは同義ではない。

### 16 Iterator イテレータ

#### 目的と解決する問題

集合の内部表現を公開せず、要素を順番に取り出せるようにする。呼び出し側が配列の添字、連結リストのリンク、木の枝を直接たどると、データ構造を変えた際に利用コードも変わる。Iteratorは「次があるか」「次の要素を得るか」という走査の契約に置き換える。

重要なのは、集合そのものと走査中の位置を別にすることである。同じ集合を2人が別々の位置から読んだり、異なる走査順を提供したりできる。単なるforループの書き換えというより、データへのアクセス方法を抽象化するパターンである。

#### 構造と役割

* Aggregate：Iteratorを生成する契約。Javaでは `Iterable<T>` が対応する。
* ConcreteAggregate：具体的な集合。本例では `Bookshelf`。
* Iterator：走査の共通契約。Java標準の `Iterator<T>` を使う。
* ConcreteIterator：位置と、次の要素を得る方法を保持する。本例では匿名クラス。
* Client：内部のListに触れずに要素を取得する。

#### Java例

`IteratorDemo.java` として保存する。本棚は作成時にタイトル一覧をコピーし、走査中の変更という問題をこの例から取り除く。

```java
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;

public class IteratorDemo {
    static final class Bookshelf implements Iterable<String> {
        private final List<String> titles;

        Bookshelf(List<String> titles) {
            this.titles = List.copyOf(titles);
        }

        @Override
        public Iterator<String> iterator() {
            return new Iterator<>() {
                private int cursor;

                @Override
                public boolean hasNext() {
                    return cursor < titles.size();
                }

                @Override
                public String next() {
                    if (!hasNext()) {
                        throw new NoSuchElementException();
                    }
                    return titles.get(cursor++);
                }
            };
        }
    }

    public static void main(String[] args) {
        Bookshelf shelf = new Bookshelf(List.of("GoF", "Effective Java"));
        Iterator<String> first = shelf.iterator();
        Iterator<String> second = shelf.iterator();
        System.out.println(first.next());  // GoF
        System.out.println(first.next());  // Effective Java
        System.out.println(second.next()); // GoF: 位置は独立

        for (String title : shelf) {
            System.out.println(title);
        }
    }
}
```

`first` と `second` は同じ本棚を参照するが、`cursor` は別々に持つ。拡張for文でも同じ契約を利用できる。独自Iteratorを示すために手書きしたが、実務でListの順序をそのまま公開するだけなら `return titles.iterator();` で十分である。

#### 使う条件と避ける条件と注意点

独自コレクション、木やグラフの走査、条件付きの遅延列挙、ページ単位に取得する結果の抽象化に向く。利用側は保存方法から独立し、走査位置も局所化できる。反対に、必要なのが固定位置へのランダムアクセスだけなら、Iteratorに変換して先頭から歩く理由はない。

順序、同じIterableから何度走査できるか、走査中の追加・削除、リソースの解放を契約として決める。ネットワークやDBを背後に置くなら、`next()` が遅い、失敗する、途中終了で資源を残す可能性がある。通常のIteratorには `close()` がないため、必要に応じて別の明確な資源管理契約を用意する。

Java標準の `next()` は末尾で `NoSuchElementException` を投げる。`remove()` は任意操作で、既定実装は `UnsupportedOperationException` を投げる。すべてのIteratorが削除できるわけではない。[Iterator公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Iterator.html)

#### 現在の使われ方と言語・ライブラリとの関係

Streamはfilter、map、集約などの処理を表現するため、利用者がIteratorを直接扱う機会を減らす。ただし、Streamは原則1回だけ消費する処理列であり、コレクションそのものではない。逐次的に要素を取り出すIteratorの役割は残る。[Stream公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html)

`ArrayList` のIteratorはfail-fastだが、その検出はベストエフォートであり、並行処理の安全性を保証する仕組みではない。すべてのIteratorが同じ変更検出方式でもない。例外が出なかったことを「安全に並行更新できた証拠」にしない。[ArrayList公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html)

#### 似たパターンとの違い

Visitorは各要素へ適用する操作の追加、Iteratorは要素を列挙する方法の分離が主眼である。Compositeの木をIteratorで列挙し、Visitorで処理することもできる。Iteratorは古い記法の名残ではなく、標準ライブラリの共通契約として利用する場面の多いパターンである。

### 17 Mediator メディエータ

#### 目的と解決する問題

複数のオブジェクトの協調規則を、仲介役に集める。画面の入力欄がチェックボックスを参照し、チェックボックスがボタンを参照し、ボタンがさらに入力欄を参照すると、部品を変えるだけで相互依存を追う必要が出てくる。Mediatorでは各部品が仲介役へ変更を知らせ、仲介役が「全条件を満たしたらボタンを有効にする」といった規則を適用する。

部品の依存がなくなるわけではない。部品同士の多数の依存を、仲介役との依存に組み替える。その結果、部品単体は単純になり、協調規則を1か所で読めるようになる。

#### 構造と役割

* Mediator：部品が仲介役へ通知する契約。本例では `changed()`。
* ConcreteMediator：具体的な協調ルールを実装し、必要な部品を参照する。
* Colleague：仲介される部品。本例では入力欄、同意欄、送信ボタン。
* Client：部品と仲介役を結び付ける。小さな例では仲介役が部品も組み立てる。

#### Java例

`MediatorDemo.java` として保存する。GUIライブラリを使わず、必須入力と同意がそろったときだけ送信可能になる規則を示す。

```java
public class MediatorDemo {
    interface Mediator {
        void changed();
    }

    static final class TextField {
        private final Mediator mediator;
        private String value = "";

        TextField(Mediator mediator) { this.mediator = mediator; }
        String value() { return value; }

        void setValue(String value) {
            this.value = value;
            mediator.changed();
        }
    }

    static final class CheckBox {
        private final Mediator mediator;
        private boolean checked;

        CheckBox(Mediator mediator) { this.mediator = mediator; }
        boolean checked() { return checked; }

        void setChecked(boolean checked) {
            this.checked = checked;
            mediator.changed();
        }
    }

    static final class Button {
        private boolean enabled;
        boolean enabled() { return enabled; }
        void setEnabled(boolean enabled) { this.enabled = enabled; }
    }

    static final class RegistrationDialog implements Mediator {
        final TextField name;
        final CheckBox consent;
        final Button submit;

        RegistrationDialog() {
            name = new TextField(this);
            consent = new CheckBox(this);
            submit = new Button();
            changed();
        }

        public void changed() {
            submit.setEnabled(!name.value().isBlank() && consent.checked());
        }
    }

    public static void main(String[] args) {
        RegistrationDialog dialog = new RegistrationDialog();
        System.out.println(dialog.submit.enabled()); // false
        dialog.name.setValue("山田");
        System.out.println(dialog.submit.enabled()); // false
        dialog.consent.setChecked(true);
        System.out.println(dialog.submit.enabled()); // true
        dialog.name.setValue("");
        System.out.println(dialog.submit.enabled()); // false
    }
}
```

入力欄は同意欄やボタンの存在を知らず、変更だけを通知する。仲介役が入力状態を読み、ボタンの状態を決める。入力値を消した場合も同じ規則で無効化される。ここでの同意欄はパターン学習用の状態であり、実サービスの同意取得や法的要件を実装したものではない。

#### 使う条件と避ける条件と注意点

複数部品が連動するダイアログ、エディタの選択状態とツール群、会議室や機器の利用調整などに向く。協調ルールをまとめることで変更範囲を絞れ、部品を別の仲介役の下で再利用しやすくなる。テストでは部品の通知と、仲介役のルールを分けて確認できる。

単純な1対1の呼び出しまで仲介させると、経路が長くなるだけである。また、画面や業務をまたぐすべての処理を1つのMediatorに集めると、巨大な万能オブジェクトになる。仲介の範囲を1画面や1つの協調単位に限定し、計算や業務処理は専用サービスへ委譲する。

部品の更新がさらに通知を発生させる場合は、再入や無限通知に注意する。本例のボタン更新は通知を発生させない。実際のUIでは同値更新を抑制し、必要なら更新をまとめ、UIスレッドの規則にも従う。

#### 現在の使われ方と言語・ライブラリとの関係

JavaBeansの `PropertyChangeSupport` は、プロパティ変更のリスナー登録と通知を支援する。Mediatorの入力側に利用できるが、このAPI自体が画面の協調ルールを決めるわけではない。公式APIでこの支援クラスがスレッドセーフでも、通知先のモデルや画面まで自動的に安全になるとは限らない。[PropertyChangeSupport公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/beans/PropertyChangeSupport.html)

#### 似たパターンとの違い

Observerは変更の通知関係を表し、Mediatorは複数参加者の協調規則を表す。MediatorがObserver型の通知を受ける構成も可能である。Facadeはサブシステムへの簡単な入口を提供し、内部の部品がFacadeへ変更を通知することまでは要求しない。イベントバスやDIコンテナを導入しただけでは、協調規則の所在は整理されない。現代のフレームワークでも、どのクラスがルールを所有するかを明確にする点で本パターンは役立つ。

### 18 Memento メメント

#### 目的と解決する問題

オブジェクトの内部状態を、その内部表現を外部の履歴管理者へ詳しく公開せずに保存し、後で復元する。エディタの「元に戻す」を履歴管理側が実装しようとして、本文、カーソル、選択範囲を直接読み書きすると、エディタの内部変更が履歴機能にも波及する。Mementoでは状態を知る本人が保存・復元を担当し、外部は保存物を保管するだけにする。

記録するのは、操作の名前よりも、その時点の状態である。完全コピーに限らず、不変構造を共有したスナップショットや、復元に必要な情報だけを保存する設計もある。

#### 構造と役割

* Originator：保存する状態を持ち、Mementoを生成・復元する。本例では `Editor`。
* Memento：復元に必要な状態を保持する。本例では外へ詳細を公開しない `Snapshot`。
* Caretaker：Mementoの保存順や寿命を管理する。本例では `History`。状態の中身を解釈しない。

#### Java例

`MementoDemo.java` として保存する。履歴には狭いインターフェース `Editor.Memento` だけを見せる。スナップショットには所有者も記録し、別のエディタの状態を誤って復元しないようにする。

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class MementoDemo {
    static final class Editor {
        sealed interface Memento permits Snapshot {}

        private record Snapshot(Editor owner, String text, int cursor)
                implements Memento {}

        private String text = "";
        private int cursor;

        void type(String addition) {
            text = text.substring(0, cursor) + addition + text.substring(cursor);
            cursor += addition.length();
        }

        String text() { return text; }

        Memento save() {
            return new Snapshot(this, text, cursor);
        }

        void restore(Memento memento) {
            if (!(memento instanceof Snapshot snapshot)
                    || snapshot.owner() != this) {
                throw new IllegalArgumentException("別のエディタの記録です");
            }
            text = snapshot.text();
            cursor = snapshot.cursor();
        }
    }

    static final class History {
        private final Editor editor;
        private final Deque<Editor.Memento> snapshots = new ArrayDeque<>();

        History(Editor editor) { this.editor = editor; }

        void checkpoint() {
            snapshots.push(editor.save());
        }

        void undo() {
            if (!snapshots.isEmpty()) {
                editor.restore(snapshots.peek());
                snapshots.pop();
            }
        }
    }

    public static void main(String[] args) {
        Editor editor = new Editor();
        History history = new History(editor);
        editor.type("Hello");
        history.checkpoint();
        editor.type(" Java");
        System.out.println(editor.text()); // Hello Java
        history.undo();
        System.out.println(editor.text()); // Hello
    }
}
```

履歴は本文やカーソルの構造を知らず、記録を積み、復元を依頼するだけである。本文は不変のStringなので、記録後の編集が過去の本文を変更しない。本例はUndoのみで、Redoや永続保存は実装していない。

#### 使う条件と避ける条件と注意点

文書編集、描画、ゲームの局面保存、設定変更の取消し、試行的な計算状態の退避に向く。Originatorの内部表現を変えてもCaretakerの修正を抑えやすく、逆操作が複雑でも以前の状態へ戻せる。一方、状態が巨大なら毎回の完全コピーは高価になる。履歴数・容量の上限、差分保存、不変データ構造の共有を検討する。

浅いコピーに注意する。recordのフィールドがfinalでも、その参照先が可変Listなら過去の記録が後から変わり得る。必要な範囲をコピーするか、要素を含めて不変にする。復元対象には、見た目の値だけでなく整合性に必要なカーソルや関連情報も含める。ただし、ソケットや外部サービスの状態をメモリの復元だけで元に戻せるとは考えない。

並行編集で古い状態をそのまま復元すると、他の変更を消す可能性がある。版番号の照合や競合解決が必要になる。履歴には消したはずの個人情報が残る場合もあるため、保持期限と破棄方法も設計に含める。

#### 現在の使われ方と言語・ライブラリとの関係

recordは保存用データを簡潔に書けるが、深い不変性や適切な公開範囲を自動保証しない。本例のprivateなrecordと狭いインターフェースは、保存情報を扱う責任をOriginatorへ寄せるための選択である。[Record Classes公式ガイド](https://docs.oracle.com/en/java/javase/21/language/records.html)

Swingの `UndoManager` は `UndoableEdit` の履歴とUndo／Redoを管理する。これは取消しの支援APIであり、すべての編集を完全なMementoとして保持する契約ではない。Command型の操作とスナップショットを組み合わせることもできる。また、同APIのシリアライズには将来のSwingリリースとの互換性に警告があるため、長期保存形式としてそのまま依存しない。この警告はMementoパターンの非推奨化を意味しない。[UndoManager公式API](https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/javax/swing/undo/UndoManager.html)

#### 似たパターンとの違い

Commandは操作を記録し、Mementoは状態を記録する。Prototypeは複製から新しいオブジェクトを作ることが目的で、過去状態への復元を必須としない。イベントソーシングは起きた事実の列を保存する設計であり、Mementoと同義ではないが、再生を速めるスナップショットを併用することはある。

### 19 Observer オブザーバー

#### 目的と解決する問題

一つの対象の変化を、対象が各利用者の具象クラスを知らずに複数の相手へ通知する。価格表示、UIの更新、アプリケーション内部イベントなどで、通知先を増やすたびに更新元を編集する問題を避ける。

中心は「一対多の依存関係を登録し、変化を知らせる」という契約である。同期か非同期か、変更後の値を渡すpush型か通知後に値を読むpull型かは別の設計判断になる。

#### 構造と役割

* Subject: 登録、解除、通知を管理する対象。
* Observer: 通知を受ける共通契約。
* ConcreteSubject: 実際の状態を保持する対象。
* ConcreteObserver: 表示更新や集計などの処理を実行する受信者。

この例では `Prices` がSubject、`Consumer<PriceChanged>` がObserver、ラムダが具体的な受信者となる。購読を `AutoCloseable` にして解除責任を明示する。

#### Java例

```java
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class ObserverDemo {
    record PriceChanged(String item, int yen) {}

    static final class Prices {
        private final List<Consumer<PriceChanged>> listeners = new ArrayList<>();
        AutoCloseable subscribe(Consumer<PriceChanged> listener) {
            listeners.add(listener);
            return () -> listeners.remove(listener);
        }
        void update(String item, int yen) {
            if (yen < 0) throw new IllegalArgumentException("negative price");
            var event = new PriceChanged(item, yen);
            for (var listener : List.copyOf(listeners)) {
                listener.accept(event);
            }
        }
    }

    public static void main(String[] args) throws Exception {
        var prices = new Prices();
        try (var subscription = prices.subscribe(
                e -> System.out.println(e.item() + ": " + e.yen()))) {
            prices.update("Java book", 3500);
        }
        prices.update("Java book", 3600); // 購読解除後なので表示されない
    }
}
```

出力は `Java book: 3500`。サンプルは単一スレッド・同期通知で、受信者が例外を投げると残りへの通知も中断する。スナップショット列挙により通知中の登録解除による列挙破壊を避けているが、解除直前にコピーされた通知まで取り消す保証はない。

#### 使う条件と避ける条件と注意点

通知先が動的に増減する、更新元を表示・ログ・分析から分離したい場合に向く。呼び出し先が一つで固定され、処理の成功を直接戻り値で受ける必要があるだけなら、普通のメソッド呼び出しが分かりやすい。

利点は通知先追加時の変更局所化。注意点は解除忘れによる参照保持、通知の連鎖や再入、例外の分離、順序、遅い受信者による停止である。「通知した」と「永続化された」「相手が成功した」は別であり、重要な業務イベントでは再試行、重複排除、トランザクション境界も決める。

#### 現在の使われ方と言語・ライブラリとの関係

`java.util.Observer` と `Observable` はJava 9から非推奨。理由は旧APIのイベントモデルの制約などであり、Observerパターンの廃止を意味しない。新規コードでこの旧APIを選ぶ理由は乏しく、型付きリスナーなどを検討する。[JDK Observable API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Observable.html)

JDK `Flow` は購読と要求数によるフロー制御を持つ。単純なリスナーを置換するだけのAPIではなく、バックプレッシャーが必要なストリームの契約として選ぶ。[JDK Flow API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/Flow.html)

Springの `ApplicationEventPublisher`、`ApplicationListener`、`@EventListener` はアプリケーション内イベントに使える。標準設定のイベント配信は同期であり、イベントを発行しただけで非同期になると考えない。[Spring ApplicationContext events](https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html)

#### 似たパターンとの違い

Mediatorは複数オブジェクト間の協調規則を仲介者に集める。Observerは一対多の通知関係を定める。両者は組み合わせられる。メッセージブローカーを介するPublish/Subscribeは通知先との時間的・配置上の分離を持ち得るが、永続化や再配信の保証までGoF Observerに含まれるわけではない。

### 20 State ステート

#### 目的と解決する問題

オブジェクトの内部状態に応じて変わる振る舞いを状態別オブジェクトへ移す。同じ `pay()` や `ship()` でも注文が未払いか支払い済みかで意味が違うとき、すべてのメソッドに同じ状態判定が散らばるのを防ぐ。

単なる状態名の列挙ではなく、状態ごとの処理と許可された遷移をまとめる設計である。実務では注文、チケット、接続プロトコル、UIの編集モードなどに応用できる。

#### 構造と役割

* Context: 現在のStateを保持し、操作を委譲する本体。
* State: 状態に依存する操作の契約。
* ConcreteState: その状態での処理と遷移を定義するもの。

例では `Order` がContextで、`Stage` の各enum定数がStateとなる。状態オブジェクト自体には注文ごとの可変データを持たせず、安全に共有する。

#### Java例

```java
public class StateDemo {
    enum Stage {
        NEW {
            @Override void pay(Order order) { order.stage = PAID; }
        },
        PAID {
            @Override void ship(Order order) { order.stage = SHIPPED; }
        },
        SHIPPED;

        void pay(Order order) { throw new IllegalStateException("cannot pay: " + this); }
        void ship(Order order) { throw new IllegalStateException("cannot ship: " + this); }
    }

    static final class Order {
        private Stage stage = Stage.NEW;
        void pay() { stage.pay(this); }
        void ship() { stage.ship(this); }
        Stage stage() { return stage; }
    }

    public static void main(String[] args) {
        var order = new Order();
        order.pay();
        order.ship();
        System.out.println(order.stage()); // SHIPPED
    }
}
```

未払いで `ship()` を呼ぶと例外となる。これはメモリー上の状態遷移の例であり、現実の決済・配送を実行するコードではない。支払い失敗時にPAIDへ遷移してはいけないし、DB保存と外部決済の整合性は別途設計が必要になる。

#### 使う条件と避ける条件と注意点

複数操作の意味が状態によって変わり、遷移にも規則があるなら有効。状態が二つで表示文字列を変えるだけならenumと短いswitchの方が簡潔である。

利点は状態に関する判断の局所化と不正操作の明示。注意点は状態クラスの増加、遷移先への依存、全体の遷移図の見えにくさ。同時操作で「支払済みを二回処理する」競合も起こるため、パターンだけで排他制御や冪等性が得られると考えない。

#### 現在の使われ方と言語・ライブラリとの関係

Javaのenum定数別メソッドは、有限で固定された状態集合をコンパクトに実装できる。状態ごとのデータ型も違うならsealed階層とrecordで不正なデータの組合せを減らせる。ただし永続化、タイマー、並行イベントを含むワークフロー全体が言語機能に吸収されるわけではない。[Java sealed classes](https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html)

JDK `Thread.State` は状態を表すenumだが、それだけを根拠に `Thread` がGoF Stateの教科書的構造で実装されているとは言えない。「状態を持つ」と「Stateパターンを採る」を区別する。[JDK Thread.State](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Thread.State.html)

#### 似たパターンとの違い

Strategyは通常、外部から選択した方針を交換する。Stateは対象のライフサイクルの現在位置によって振る舞いが変わり、内部イベントが次の状態へ導く。どちらも委譲という構造を使うが、変更理由が異なる。状態数とイベント数が多いときは、遷移表や状態機械ライブラリの方が全体を検証しやすい場合もある。

### 21 Strategy ストラテジー

#### 目的と解決する問題

同じ目的を達成する複数のアルゴリズムを交換可能にする。送料、割引、整列、圧縮、認証方針などの分岐を、利用側の処理から切り離す。

「条件分岐を必ずなくす」ことが目的ではない。どの方針を使うかは組立て箇所で判断してよい。重要なのは、その選択と各アルゴリズムの実装を、使う側の業務処理に混在させないことにある。

#### 構造と役割

* Context: アルゴリズムを利用する側。
* Strategy: 入出力と意味上の制約を定める共通契約。
* ConcreteStrategy: 交換可能な具体的アルゴリズム。

この例では `Checkout` がContext、`Shipping` がStrategy、二つのラムダがConcreteStrategyとなる。重量の単位はグラム、結果の単位は円で統一する。

#### Java例

```java
import java.util.Objects;

public class StrategyDemo {
    @FunctionalInterface
    interface Shipping { int yen(int grams); }

    static final class Checkout {
        private final Shipping shipping;
        Checkout(Shipping shipping) { this.shipping = Objects.requireNonNull(shipping); }
        int shippingYen(int grams) {
            if (grams < 0) throw new IllegalArgumentException("negative weight");
            return shipping.yen(grams);
        }
    }

    public static void main(String[] args) {
        Shipping standard = grams -> grams <= 1000 ? 500 : 900;
        Shipping express = grams -> 1200;
        System.out.println(new Checkout(standard).shippingYen(600)); // 500
        System.out.println(new Checkout(express).shippingYen(600));  // 1200
    }
}
```

`Checkout` を変更せず、料金体系を差し替えられる。実運用ではオーバーフロー、価格の有効期間、地域、税、契約条件などもStrategyの契約とテストに含める。

#### 使う条件と避ける条件と注意点

同じ目的の計算を複数持つ、呼出し側や設定で方針を選ぶ、各方針を独立テストしたい場合に向く。変化しない一行の式のためにクラス階層を作る必要はない。

利点は方針の追加とテストが局所化すること。注意点は共通契約の設計である。入力・出力が同じでも例外、性能、副作用、単位、並行利用可否が違うと単純交換できない。ContextがStrategyの具体型を調べ始めたら抽象化を見直す。

#### 現在の使われ方と言語・ライブラリとの関係

単一抽象メソッドの契約なら、Javaのラムダとメソッド参照で具象クラスの記述を省ける。`Function`、`Predicate`、`ToIntFunction` なども使えるが、ドメイン上の意味や例外契約が重要なら独自の関数型インターフェースに名前を付ける価値がある。[JDK java.util.function](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/function/package-summary.html)

`Comparator` は順序を外から与える代表的なAPI。`comparing` と `thenComparing` による組合せは、方針オブジェクトを細かいクラスなしで構成できることを示す。[JDK Comparator](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Comparator.html)

複数の操作、設定、内部状態、リソース管理を持つ方針は通常のクラスの方が明瞭になる。DIはStrategyの選択と注入を助けるが、DIを使うこと自体がStrategyではない。

#### 似たパターンとの違い

Template Methodは継承で処理手順の一部を差し替え、Strategyは委譲でアルゴリズムを交換する。Commandは「後で実行する要求」をオブジェクトにする。引数なしラムダ一つでも、計算方針として使えばStrategy、実行待ち作業としてキューに積めばCommandというように意図で区別する。

### 22 Template Method テンプレートメソッド

#### 目的と解決する問題

アルゴリズムの手順を基底クラスに固定し、特定のステップだけをサブクラスで実装する。データ読込み、変換、保存など、処理順序を統一しながら部分差分を許したいときに使う。

共通メソッドを継承で再利用するだけでは不十分で、基底クラスが処理の骨格と呼出し順序を管理することがポイントとなる。

#### 構造と役割

* AbstractClass: Template Methodと抽象ステップを定義する。
* Template Method: 決まった順序で各ステップを呼ぶ公開操作。
* ConcreteClass: 必要なステップを実装する。
* Hook: 既定動作を持ち、必要な場合だけ上書きする拡張点。

例の `importAll` は `final` とし、検証してから保存する順序を維持する。 `afterImport` は任意のフックである。

#### Java例

```java
import java.util.List;

public class TemplateMethodDemo {
    static abstract class Importer {
        final void importAll(List<String> lines) {
            var values = lines.stream().map(this::parse).toList();
            if (values.stream().anyMatch(v -> v < 0)) {
                throw new IllegalArgumentException("negative value");
            }
            save(values);
            afterImport(values.size());
        }
        protected abstract int parse(String line);
        protected abstract void save(List<Integer> values);
        protected void afterImport(int count) {}
    }

    static final class DecimalImporter extends Importer {
        @Override protected int parse(String line) { return Integer.parseInt(line.strip()); }
        @Override protected void save(List<Integer> values) { System.out.println(values); }
        @Override protected void afterImport(int count) { System.out.println("count=" + count); }
    }

    public static void main(String[] args) {
        new DecimalImporter().importAll(List.of("10", "20"));
    }
}
```

出力は `[10, 20]` と `count=2`。先に全件を変換・検証するため、この例では入力エラーによる途中保存が起きない。一方、全件メモリー保持が大容量処理に適するとは限らず、実際の保存失敗のロールバックも別途必要である。

#### 使う条件と避ける条件と注意点

継承を拡張方法として提供するフレームワークや、処理順序の不変条件が明確な場合に向く。部品を実行時に交換したい、独立した複数軸で変化する、既に別の基底クラスを継承している場合は委譲を選びやすい。

利点は重複する手順を集約し不変条件を保ちやすいこと。注意点は基底クラス変更の波及、保護メソッドへの依存、フック増殖。コンストラクターから上書き可能メソッドを呼ぶと、サブクラス初期化前に動作する危険もある。サブクラスが契約を破るなら、`final` な骨格だけでは安全性を保証できない。

#### 現在の使われ方と言語・ライブラリとの関係

JDK `AbstractList` は `get` と `size` などの少数の操作を実装することで、他のリスト操作を補う骨格実装である。既存の抽象基底APIを理解するうえでTemplate Methodの考え方は引き続き役立つ。[JDK AbstractList](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/AbstractList.html)

Spring `JdbcTemplate` はリソース処理などの共通手順を扱い、差分をコールバックとして受け取る。名前にTemplateが付いていても、利用者が継承して差し替えるGoFの典型構造とは区別する。これは骨格の再利用という狙いを、委譲で実現する設計の例として読むとよい。[Spring JDBC core](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html)

ラムダでステップを受け取る設計は継承依存を減らせるが、すべてを引数化すると手順と契約が読みにくくなる。既存の安定した拡張APIを機械的に書き換える必要はない。

#### 似たパターンとの違い

Strategyはアルゴリズムの交換、Template Methodは骨格を維持した部分差し替え。Factory MethodはTemplate Method内の「生成ステップ」として組み込まれることがある。両者は競合ではなく、異なる範囲の変化を扱う。

### 23 Visitor ビジター

#### 目的と解決する問題

安定した要素型の集合に対して、新しい操作を要素クラスの外側へ追加する。構文木に評価、表示、型検査などを追加する、文書要素を複数形式へ出力する、といった場面に向く。

要素側の `accept` とVisitor側の型別 `visit` を組み合わせることで、実行時の要素型に応じた処理へ到達する。Javaのオーバーロードだけは実行時型で選ばれないため、要素側から自身の静的型が分かる `visit(this)` を呼ぶ。この二段階がダブルディスパッチの要点になる。

#### 構造と役割

* Element: `accept` を持つ要素の契約。
* ConcreteElement: 自分に対応する `visit` を呼ぶ具象要素。
* Visitor: 各要素型に対応する操作の集合。
* ConcreteVisitor: 評価など、一つの処理を実装するもの。
* ObjectStructure: 要素を保持し、必要に応じて訪問・走査する構造。

以下では同じ式を、古典的VisitorとJava 21のpattern switchの両方で評価する。

#### Java例

```java
public class VisitorDemo {
    sealed interface Expr permits Num, Add {
        <R> R accept(Visitor<R> visitor);
    }
    record Num(int value) implements Expr {
        public <R> R accept(Visitor<R> visitor) { return visitor.visit(this); }
    }
    record Add(Expr left, Expr right) implements Expr {
        public <R> R accept(Visitor<R> visitor) { return visitor.visit(this); }
    }
    interface Visitor<R> {
        R visit(Num num);
        R visit(Add add);
    }
    static final class Eval implements Visitor<Integer> {
        public Integer visit(Num num) { return num.value(); }
        public Integer visit(Add add) {
            return add.left().accept(this) + add.right().accept(this);
        }
    }
    static int evaluate(Expr expr) {
        return switch (expr) {
            case Num n -> n.value();
            case Add a -> evaluate(a.left()) + evaluate(a.right());
        };
    }
    public static void main(String[] args) {
        Expr expr = new Add(new Num(2), new Num(3));
        System.out.println(expr.accept(new Eval())); // 5
        System.out.println(evaluate(expr));          // 5
    }
}
```

Visitorは訪問先ごとの処理を決めるが、木の走査順序まで自動的に決めない。この例では `Eval.visit(Add)` が子へ再帰する。深い入力、整数オーバーフロー、循環グラフ、nullは省略しており、一般の式エンジンとしてそのまま使わない。

#### 使う条件と避ける条件と注意点

要素型が比較的固定され、操作を追加する頻度が高い場合に向く。要素型の追加が頻繁だと、多くのVisitorに新しい `visit` の追加が必要となる。プラグインが自由に要素型を増やす開いた階層には、古典的Visitorもsealedなswitchもそのままでは適さないことがある。

利点は一つの操作を一か所へ集めやすいこと。注意点は要素内部へのアクセス要求が増えること、Visitorと要素型集合の結合、戻り値や引数の型設計が複雑になること。二つの軸を同時に無制限に拡張できる魔法ではない。

#### 現在の使われ方と言語・ライブラリとの関係

Java 21では、sealed階層とpattern switchにより、閉じた型集合の網羅的な処理を `accept` なしで記述できる。例の後半だけを選ぶなら、`Expr` から `accept` とVisitor関連のコードを取り除ける。型集合を制御でき、外部操作から必要なデータが読めて、既存のVisitor契約との互換性が不要なときに有力な代替となる。[Java 21 pattern matching for switch](https://docs.oracle.com/en/java/javase/21/language/pattern-matching-switch.html) / [Java 21 sealed classes](https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html)

ただし操作ごとの状態、共通の走査制御、外部公開済み拡張契約などは依然設計が必要。JDKの言語モデルAPIには `ElementVisitor` が存在し、Visitorの契約を理解する実務上の必要は残る。[JDK ElementVisitor](https://docs.oracle.com/en/java/javase/26/docs/api/java.compiler/javax/lang/model/element/ElementVisitor.html)

#### 似たパターンとの違い

Iteratorは「次の要素を取得する」走査の契約、Visitorは「要素の型に応じて何をするか」の契約。Compositeの木をVisitorで処理することもできる。Interpreterは文法を表現して解釈する仕組みで、Visitorは構文木に評価以外の操作も付加する手段になる。

## 問題から選ぶためのガイド

### まず変化する場所を一文にする

「このクラスにはStrategyが必要だ」から始めず、「送料の計算規則だけを店舗ごとに差し替えたい」のように書く。変化する場所が一つなら、必要な境界も小さくできる。

* **作るものを変える**: 継承先が具象型を決めるならFactory Method、互換性のある製品群を選ぶならAbstract Factory、組立ての段階や表現を変えるならBuilder、見本を複製するならPrototype。
* **相手との接続方法を変える**: 既存APIの形が違うならAdapter、利用手順が複雑ならFacade、同じ契約のままアクセスを制御するならProxy。
* **構造を組み合わせる**: 木として扱うならComposite、追加機能を積むならDecorator、二つの分類軸を独立させるならBridge、大量の同一部分を共有するならFlyweight。
* **振る舞いの選択を変える**: 呼出し側が方針を選ぶならStrategy、対象の現在状態に従って振る舞いが変わるならState、固定手順の一部を継承で変えるならTemplate Method。
* **処理の届け方・時刻を変える**: 一対多の通知ならObserver、複数候補を順に渡すならChain of Responsibility、要求を保存・遅延・取消対象にするならCommand、参加者間の協調を集約するならMediator。
* **データの扱いを分ける**: 走査を隠すならIterator、復元用の状態を隠すならMemento、安定した型群に操作を追加するならVisitor、小さな文法の評価を組み立てるならInterpreter。

Singletonだけは「どこからでも呼べるようにしたい」を導入理由にしない。一つにする必要がある資源の範囲と寿命を先に決め、コンストラクター注入やコンテナ管理で十分かを確認する。

### 混同しやすい組合せ

| 比較                                | 見分ける質問                            |
| --------------------------------- | --------------------------------- |
| Factory Method と単なる生成メソッド         | 生成処理をサブクラスが上書きする拡張点があるか           |
| Abstract Factory とBuilder         | 互換性のある製品群を選ぶのか、一つの完成物を段階的に組み立てるのか |
| Adapter とBridge                   | 既存の不一致を埋めるのか、最初から独立する変化軸を分けるのか    |
| Decorator とProxy                  | 機能を積み上げるのか、本体へのアクセスを代理・制御するのか     |
| Facade とMediator                  | 利用者向けの簡単な入口か、参加者同士のやり取りの調停か       |
| Strategy とState                   | 選んだ方針か、現在のライフサイクル状態か              |
| Strategy とTemplate Method         | オブジェクトを差し替える委譲か、固定骨格の一部を変える継承か    |
| Command とStrategy                 | 実行要求そのものを保持するのか、処理のやり方を渡すのか       |
| Observer とChain of Responsibility | 複数受信者への通知か、順序付きで継続・停止する処理か        |
| Memento とPrototype                | 復元用の状態を保管するのか、別のオブジェクトを作るため複製するのか |
| Iterator とVisitor                 | どう走査するかを分離するのか、型ごとに何をするかを分離するのか   |

同じクラスが複数の意図を持つことはある。例えば圧縮ラッパーにアクセス制御が加わればDecoratorとProxyの性質を併せ持つ。名前を一つに確定するより、契約と責任が明確かを優先する。

### 組み合わせる実務例

**文書エディター**なら、文書の木をComposite、型別の出力をVisitor、ユーザー操作をCommand、Undo用の状態をMemento、画面更新をObserverで扱える。ただし最初から五つの基盤を作る必要はない。Undoが不要なら履歴層は不要であり、文書の型が二つしかないなら小さなsealed型とswitchで十分かもしれない。

**外部サービス接続**なら、相手APIとの差をAdapterで吸収し、認証やキャッシュをProxy、用途別の一連の操作をFacadeに分けられる。再試行をラッパーに置く場合は、書込みが冪等かを確認する。「透明なラッパー」のつもりでも、二重決済や重複送信を生むなら振る舞いは透明ではない。

**データ取込み**なら、固定の手順をTemplate Methodまたはコールバックで組み、変換方針をStrategy、各処理段階をChainとしてつなげられる。ただし処理順序が固定されているだけなら、普通の関数を順番に呼ぶ実装から始める方が読みやすい。

## 過剰設計を避けるためのチェック

1. **現実の変更要求があるか**: 「将来何でも差し替えられるように」だけで階層を増やさない。二つ目の具体例が出たときに抽象化すると共通点を確かめやすい。ただし公開APIや安全境界など、後変更が高価な部分は先に設計する。
2. **標準APIが既に境界を提供していないか**: `Comparator`、`Iterable`、`Supplier` などが意味に合うなら使う。名前が短いことより、単位・副作用・例外契約が伝わることを重視する。
3. **分岐は本当に問題か**: 閉じた小さな選択肢のswitchは明瞭で安全なことがある。分岐を消して動作を追いにくくしていないかを確認する。
4. **依存の数と向きは改善したか**: Factoryを増やした結果、設定や型変換が各層に散ったなら、元の問題を移しただけかもしれない。
5. **テストのしやすさが改善したか**: 独立した純粋関数として試せる計算を、巨大なDIコンテナがないと動かせない設計にしない。契約テストで交換可能性も確認する。
6. **寿命と所有権は決まっているか**: 誰が購読解除、close、キャッシュ破棄を行うかを明示する。オブジェクトの関連図だけでは資源管理は解決しない。
7. **並行性と失敗を別に設計したか**: パターン名はスレッドセーフ、非同期、耐障害性、原子性、分散での一意性を保証しない。
8. **削除できる抽象化はないか**: 一つしか実装がなく、境界・テスト・公開契約のどれにも役立たない中継インターフェースを残していないかを見る。
9. **意図を一行で説明できるか**: 「このAdapterは外部の単位と例外を内部契約へ変換する」のような説明ができればよい。「GoFに載っているから」は理由にならない。

## 学習の順序

最初はStrategy、Adapter、Factory Method、Observer、Decoratorで委譲と契約を体験する。その後、Composite、Iterator、Command、Stateで構造とライフサイクルを学び、残りを実際の変更要求に結び付けて読むと理解しやすい。

各例を読むだけでなく「具体型を一つ追加する」「失敗を起こす」「呼出し順を変える」「並行して使う」といった小さな変更を試すと、パターンが局所化する変更と、局所化しない変更の境界が分かる。23個を暗記するより、どの変更の費用を下げ、代わりに何の費用を払う設計かを説明できることを目標にする。

## 関連する資料・ノート

各パターンの末尾に、該当するJDK・Java言語・フレームワークの公式資料を配置した。パターンの原典は Erich Gamma、Richard Helm、Ralph Johnson、John Vlissides による Design Patterns Elements of Reusable Object-Oriented Software。本文の説明とサンプルコードは、このノートのために構成したもので、原典の長文転載ではない。
