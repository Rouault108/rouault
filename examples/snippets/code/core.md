## コード関係

```ts
// TypeScriptのコード
const greeting: string = 'Hello World!';
```

```ts filename="foo.ts"
// ファイル名付きTypeScriptのコード
const greeting: string = 'Hello World!';
```

::code-group{aria-label="実装比較"}

```ts group-key="valid-simple" tab-label="正しい例"
const value = 1;
```

```ts group-key="invalid-simple" tab-label="誤り例"
const value = '1';
```

::

::code-group{aria-label="実装比較"}

```ts filename="valid.ts" group-key="valid" tab-label="正しい例"
const value = 1;
```

```ts filename="invalid.ts" group-key="invalid" tab-label="誤り例"
const value = '1';
```

::
