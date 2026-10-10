---
title: "Visual Studio よく使うコマンドとショートカット"
license: CC BY 4.0
---

# Visual Studio よく使うコマンドとショートカット

## 要点

* Windows 版 **Visual Studio** の日常作業で使いやすい 40 コマンドを、目的別にまとめた一覧。
* Microsoft Learn の **General（全般）プロファイルの既定割り当て**を基準にする。バージョン、言語、キーボード配列、拡張機能、独自設定によって異なる場合がある。
* 最初は「定義へ移動」「参照検索」「クイック アクション」「整形」「ビルド」「ステップ実行」から覚える。
* ショートカットが合わないときは、末尾の「割り当ての確認方法」で表のコマンド ID を検索する。

## 内容

### キー表記の読み方

* `Ctrl+Shift+B`：同時に押す。
* `Ctrl+K, Ctrl+C`：まず `Ctrl+K`、次に `Ctrl+C` を押す。2 段階の操作。
* `Ctrl+R, A`：まず `Ctrl+R` を押して離し、その後は **Ctrl を押さずに** `A` を押す。
* `Ctrl+,`：Ctrl とカンマを同時に押す、1 段階の操作。
* `Ctrl+.`：Ctrl とピリオドを同時に押す。
* 表のコマンド ID は、Visual Studio のキーボード設定で割り当てを探すための名前。

### 1. コードを探す・移動する

| 操作                  | ショートカット        | 使いどころ                | コマンド ID                  |
| ------------------- | -------------- | -------------------- | ------------------------ |
| ファイル・型・メンバーなどを名前で探す | `Ctrl+,`       | ソリューション内の目的のコードへ移動する | `Edit.NavigateTo`        |
| 定義へ移動               | `F12`          | 関数や型が定義されている場所を開く    | `Edit.GoToDefinition`    |
| 定義をここで表示            | `Alt+F12`      | 今の編集位置を保ちながら定義を読む    | `Edit.PeekDefinition`    |
| すべての参照を検索           | `Shift+F12`    | 使用箇所を調べ、変更の影響範囲を確認する | `Edit.FindAllReferences` |
| 前の場所へ戻る             | `Ctrl+-`       | 定義へ移動した後、元の場所に戻る     | `View.NavigateBackward`  |
| 次の場所へ進む             | `Ctrl+Shift+-` | 戻った後、移動履歴を先へたどる      | `View.NavigateForward`   |
| 指定行へ移動              | `Ctrl+G`       | ログやレビューで示された行番号を開く   | `Edit.GoTo`              |

`Ctrl+,` と同系統の検索は `Ctrl+T` でも開ける。Visual Studio 2022 以降では、新しい検索画面が開く構成もあるため、画面の見た目はバージョンや設定で変わる。

参照：[既定のショートカット](https://learn.microsoft.com/en-us/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio?view=visualstudio)、[Go To によるコード検索](https://learn.microsoft.com/en-us/visualstudio/ide/go-to?view=visualstudio)

### 2. 編集・整形・リファクタリング

コード編集系の操作は、対象コードにカーソルを置くか、対象範囲を選択して使う。言語やファイル形式によって利用できる機能が異なる。

| 操作               | ショートカット            | 使いどころ                   | コマンド ID                         |
| ---------------- | ------------------ | ----------------------- | ------------------------------- |
| すべて保存            | `Ctrl+Shift+S`     | 複数ファイルを変更した後にまとめて保存する   | `File.SaveAll`                  |
| 単語の補完            | `Ctrl+Space`       | 入力途中の名前から補完候補を出す        | `Edit.CompleteWord`             |
| パラメーター情報         | `Ctrl+Shift+Space` | メソッド呼び出しの引数を確認する        | `Edit.ParameterInfo`            |
| クイック アクション       | `Ctrl+.`           | 修正候補やリファクタリングを表示する      | `View.ShowSmartTag`             |
| シンボル名の変更         | `Ctrl+R, Ctrl+R`   | 変数・メソッド・型などを、参照も含めて改名する | `Refactor.Rename`               |
| コメント化            | `Ctrl+K, Ctrl+C`   | 選択したコードをコメントにする         | `Edit.CommentSelection`         |
| コメント解除           | `Ctrl+K, Ctrl+U`   | コメント化したコードを戻す           | `Edit.UncommentSelection`       |
| ドキュメント全体を整形      | `Ctrl+K, Ctrl+D`   | ファイル全体のインデントや空白を整える     | `Edit.FormatDocument`           |
| 選択範囲を整形          | `Ctrl+K, Ctrl+F`   | 一部のコードだけを整える            | `Edit.FormatSelection`          |
| 現在の領域を折りたたむ／展開する | `Ctrl+M, Ctrl+M`   | メソッドなどの表示を切り替え、周辺を見渡す   | `Edit.ToggleOutliningExpansion` |

* 改名には文字列の一括置換より `Refactor.Rename` を使うと、シンボルの参照関係を扱える。適用前に変更対象を確認する。
* 全体整形は差分が広くなる場合がある。既存の書式をなるべく保ちたいときは、選択範囲の整形を使う。

参照：[既定のショートカット](https://learn.microsoft.com/en-us/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio?view=visualstudio)、[クイック アクション](https://learn.microsoft.com/en-us/visualstudio/ide/quick-actions?view=visualstudio)

### 3. 検索・置換・機能検索

| 操作                      | ショートカット        | 使いどころ                     | コマンド ID               |
| ----------------------- | -------------- | ------------------------- | --------------------- |
| 現在のファイルを検索              | `Ctrl+F`       | 開いているファイル内の文字列を探す         | `Edit.Find`           |
| 複数ファイルを検索               | `Ctrl+Shift+F` | ソリューションや指定フォルダーを横断して探す    | `Edit.FindinFiles`    |
| 現在のファイルで置換              | `Ctrl+H`       | 目の前のファイルの文字列を置き換える        | `Edit.Replace`        |
| 複数ファイルで置換               | `Ctrl+Shift+H` | 対象範囲を指定してまとめて置き換える        | `Edit.ReplaceinFiles` |
| Visual Studio の機能・設定を検索 | `Ctrl+Q`       | 名前は分かるがメニューの場所が分からない機能を探す | `Window.QuickLaunch`  |

複数ファイルの置換では、検索範囲・ファイル種別・大文字小文字・正規表現の設定を確認してから実行する。`Ctrl+Q` は、メニューやオプションを探す入口として使える。

参照：[既定のショートカット](https://learn.microsoft.com/en-us/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio?view=visualstudio)、[生産性向上のヒント](https://learn.microsoft.com/en-us/visualstudio/ide/productivity-features?view=visualstudio)

### 4. ビルド・実行・デバッグ

| 操作           | ショートカット        | 使いどころ                     | コマンド ID                       |
| ------------ | -------------- | ------------------------- | ----------------------------- |
| ソリューションをビルド  | `Ctrl+Shift+B` | コンパイルが通るか確認する             | `Build.BuildSolution`         |
| デバッグ開始／続行    | `F5`           | デバッガー付きで起動する。停止中なら実行を再開する | `Debug.Start`                 |
| デバッグなしで開始    | `Ctrl+F5`      | デバッガーを付けずに実行する            | `Debug.StartWithoutDebugging` |
| デバッグ停止       | `Shift+F5`     | デバッグ セッションを終了する           | `Debug.StopDebugging`         |
| ブレークポイント切り替え | `F9`           | 現在行に停止位置を設定／解除する          | `Debug.ToggleBreakpoint`      |
| ステップ オーバー    | `F10`          | 呼び出し先の内部へ入らず、次のステートメントへ進む | `Debug.StepOver`              |
| ステップ イン      | `F11`          | 呼び出し先の内部へ入り、処理を追う         | `Debug.StepInto`              |
| ステップ アウト     | `Shift+F11`    | 現在の関数の残りを実行し、呼び出し元へ戻る     | `Debug.StepOut`               |
| カーソル位置まで実行   | `Ctrl+F10`     | 目的の行に達するまで実行する            | `Debug.RunToCursor`           |
| クイック ウォッチ    | `Shift+F9`     | 停止中に、変数や式の値を詳しく調べる        | `Debug.QuickWatch`            |

覚え方は **F10＝中へ入らない、F11＝中へ入る、Shift+F11＝外へ出る**。

* ステップ実行は、原則としてブレークポイントなどで停止してから使う。
* `Ctrl+F10` で目的の行へ進む途中でも、別のブレークポイントなどで停止することがある。
* デバッグなしの実行も実際のプログラムを動かす。ファイル更新や外部通信など、そのプログラムの処理は実行される。

参照：[既定のショートカット](https://learn.microsoft.com/en-us/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio?view=visualstudio)、[デバッガーでコードを移動する](https://learn.microsoft.com/en-us/visualstudio/debugger/navigating-through-code-with-the-debugger)、[デバッガーの基本操作](https://learn.microsoft.com/en-us/visualstudio/debugger/debugger-feature-tour?view=visualstudio)

### 5. テスト

テスト プロジェクトと、利用するテスト フレームワークに対応した検出・実行環境が必要。

| 操作               | ショートカット     | 使いどころ                         | コマンド ID                             |
| ---------------- | ----------- | ----------------------------- | ----------------------------------- |
| すべてのテストを実行       | `Ctrl+R, A` | 変更後にソリューションのテストをまとめて確認する      | `TestExplorer.RunAllTests`          |
| 現在のコンテキストのテストを実行 | `Ctrl+R, T` | カーソル位置に応じてテスト メソッド・クラスなどを実行する | `TestExplorer.RunAllTestsInContext` |
| テスト エクスプローラーを表示  | `Ctrl+E, T` | テスト一覧・成否・失敗の詳細を見る             | `TestExplorer.ShowTestExplorer`     |

`Ctrl+R, T` と `Ctrl+R, Ctrl+T` は別の操作。後者はテストの**デバッグ**に割り当てられているため、2 打目の Ctrl の有無に注意する。テスト エクスプローラーにフォーカスがある場合は、選択したテストが操作対象になる。

参照：[既定のショートカット](https://learn.microsoft.com/en-us/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio?view=visualstudio)、[テスト エクスプローラーでテストを実行](https://learn.microsoft.com/en-us/visualstudio/test/run-unit-tests-with-test-explorer?view=visualstudio)

### 6. ウィンドウ・タブ

| 操作                  | ショートカット          | 使いどころ              | コマンド ID                        |
| ------------------- | ---------------- | ------------------ | ------------------------------ |
| ソリューション エクスプローラーを表示 | `Ctrl+Alt+L`     | プロジェクトやファイルの構成を見る  | `View.SolutionExplorer`        |
| 出力ウィンドウを表示          | `Ctrl+Alt+O`     | ビルドやデバッグのログを読む     | `View.Output`                  |
| エラー一覧を表示            | `Ctrl+\, Ctrl+E` | エラー・警告から該当コードへ移動する | `View.ErrorList`               |
| 開いているドキュメントを切り替え    | `Ctrl+Tab`       | 最近使ったファイルへ素早く戻る    | `Window.NextDocumentWindowNav` |
| 現在のドキュメントを閉じる       | `Ctrl+F4`        | 不要になった編集タブを閉じる     | `Window.CloseDocumentWindow`   |

`O` は英字のオー。`\` はバックスラッシュで、日本語キーボードでは配列や設定により入力・表示が異なる場合がある。エラー一覧が開かないときは `Ctrl+Q` から「エラー一覧」を探す。

参照：[既定のショートカット](https://learn.microsoft.com/en-us/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio?view=visualstudio)

### 割り当ての確認方法

1. **ツール → オプション → 環境 → キーボード**を開く。新しいオプション画面では **すべての設定（All Settings）→ 環境 → キーボード**とたどる。
2. コマンド名の検索欄（Show commands containing）に、表の ID を入力する。例：`Edit.FormatDocument`、`View.SolutionExplorer`。
3. コマンドを選び、「選択したコマンドへのショートカット」（Shortcuts for selected command）を確認する。
4. 同じキーでも **Global／Text Editor などの適用範囲**で動作が変わる。現在フォーカスがある場所も確認する。
5. 分からない機能は `Ctrl+Q` で名前を検索する。キーボード設定を変更するなら、既存の割り当てと競合しないか確認してから割り当てる。

参照：[キーボード ショートカットの確認・カスタマイズ](https://learn.microsoft.com/en-us/visualstudio/ide/identifying-and-customizing-keyboard-shortcuts-in-visual-studio?view=visualstudio)

### 日常の使い方の例

* **コードを読む**：`Ctrl+,` で探す → `F12` で定義 → `Shift+F12` で参照 → `Ctrl+-` で戻る。
* **コードを直す**：`Ctrl+.` で修正候補 → `Ctrl+K, Ctrl+D` で整形 → `Ctrl+Shift+S` で保存 → `Ctrl+Shift+B` でビルド。
* **不具合を追う**：`F9` で停止位置 → `F5` で開始 → `F10`／`F11` で追う → `Shift+F9` で値を見る。
* **変更を確かめる**：`Ctrl+R, T` で対象テスト → `Ctrl+R, A` で全体のテスト。

## 関連する資料・ノート

いずれも Microsoft 公式資料。確認日：**2026-10-05**。

* [Visual Studio の既定キーボード ショートカット](https://learn.microsoft.com/en-us/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio?view=visualstudio)
* [ショートカットの確認とカスタマイズ](https://learn.microsoft.com/en-us/visualstudio/ide/identifying-and-customizing-keyboard-shortcuts-in-visual-studio?view=visualstudio)
* [Go To によるコード検索](https://learn.microsoft.com/en-us/visualstudio/ide/go-to?view=visualstudio)
* [クイック アクション](https://learn.microsoft.com/en-us/visualstudio/ide/quick-actions?view=visualstudio)
* [生産性向上のヒント](https://learn.microsoft.com/en-us/visualstudio/ide/productivity-features?view=visualstudio)
* [デバッガーでコードを移動する](https://learn.microsoft.com/en-us/visualstudio/debugger/navigating-through-code-with-the-debugger)
* [デバッガーの基本操作](https://learn.microsoft.com/en-us/visualstudio/debugger/debugger-feature-tour?view=visualstudio)
* [テスト エクスプローラーでテストを実行](https://learn.microsoft.com/en-us/visualstudio/test/run-unit-tests-with-test-explorer?view=visualstudio)
