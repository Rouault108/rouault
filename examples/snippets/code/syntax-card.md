## Syntax Card

`syntax-card` directive family の最小構成と、`syntax-fields` / `syntax-field` を含む構成を確認します。

::syntax-card{name="useEffect" kind="Method" lang="ts" heading-level="3"}
::syntax-signature

```ts
function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
```

::

::syntax-section{label="概要"}

React の副作用を宣言する Hook です。

::

::syntax-section{label="パラメータ"}

::syntax-fields

::syntax-field{name="effect" type="() => void | (() => void)" required="true"}

副作用本体です。クリーンアップ関数を返せます。

::

::syntax-field{name="deps" type="readonly unknown[]" default="undefined"}

依存配列です。省略時は毎回評価されます。

::

::

::

::

## Syntax Card without host lang

`syntax-card.lang` を省略し、signature fence 側の `lang` 解決を確認します。

::syntax-card{name="identity" kind="Function" heading-level="3"}
::syntax-signature

```ts
const identity = <T>(value: T): T => value;
```

::

::syntax-section{label="戻り値"}

入力値をそのまま返します。

::

::
