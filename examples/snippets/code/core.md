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

### コード読書面contrast fixture

```tsx filename="contrast-typescript.tsx"
// rouault inventory comment
export async function readNote<T extends string>(path: URL): Promise<T> {
  const response = await fetch(path, { method: 'GET' });
  if (!response.ok) throw new Error('failed');
  return (await response.text()) as T;
}
const preview = <article data-kind="note">Rouault</article>;
```

```c filename="contrast-c.c"
#include <stdio.h>
// rouault inventory comment
int main(int argc, char **argv) {
  const char *message = argc > 1 ? argv[1] : "note";
  printf("%s\n", message);
  return 0;
}
```

```json filename="contrast-json.json"
{
  "name": "rouault",
  "enabled": true,
  "count": 3,
  "fallback": null
}
```

```shell filename="contrast-shell.sh"
#!/usr/bin/env bash
# rouault inventory comment
set -euo pipefail
name="${1:-note}"
if [[ -n "$name" ]]; then
  printf '%s\n' "$name"
fi
```

```csharp filename="contrast-csharp.cs"
// rouault inventory comment
namespace Quiet.Space {
  public interface Reader<T> { T Read(); }
  public sealed class NoteReader : Reader<string> {
    public string Read() => "note";
  }
}
```

```ts filename="contrast-states.ts"
const normalState = 'normal';
const highlightedState = 'highlight'; // [!code highlight]
const addedState = 'added'; // [!code ++]
const removedState = 'removed'; // [!code --]
```

::code-group{aria-label="実装比較"}

```ts filename="valid.ts" group-key="valid" tab-label="正しい例"
const value = 1;
```

```ts filename="invalid.ts" group-key="invalid" tab-label="誤り例"
const value = '1';
```

::
