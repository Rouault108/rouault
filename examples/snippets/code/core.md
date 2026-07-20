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

### 行state selection fixture

```ts filename="line-state-standalone.ts" show-line-numbers="true"
const standaloneNormal = 'normal-reading-width-normal-reading-width-normal-reading-width-normal-reading-width';
const standaloneHighlight = 'highlight-reading-width-highlight-reading-width-highlight-reading-width'; // [!code highlight]
const standaloneAdd = 'add-reading-width-add-reading-width-add-reading-width-add-reading-width'; // [!code ++]
const standaloneRemove = 'remove-reading-width-remove-reading-width-remove-reading-width'; // [!code --]
```

::code-preview{heading="行state selection preview"}

```html filename="line-state-preview.html"
<p data-state="normal">normal-reading-width-normal-reading-width-normal-reading-width-normal-reading-width-normal-reading-width-normal-reading-width</p>
<p data-state="highlight">highlight-reading-width-highlight-reading-width-highlight-reading-width-highlight-reading-width-highlight-reading-width</p> <!-- [!code highlight] -->
<p data-state="add">add-reading-width-add-reading-width-add-reading-width-add-reading-width-add-reading-width-add-reading-width-add-reading-width</p> <!-- [!code ++] -->
<p data-state="remove">remove-reading-width-remove-reading-width-remove-reading-width-remove-reading-width-remove-reading-width-remove-reading-width</p> <!-- [!code --] -->
```

::

::code-group{aria-label="行state selection group"}

```ts filename="line-state-group-active.ts" group-key="active" tab-label="Active"
const groupNormal = 'normal-reading-width-normal-reading-width-normal-reading-width-normal-reading-width';
const groupHighlight = 'highlight-reading-width-highlight-reading-width-highlight-reading-width'; // [!code highlight]
const groupAdd = 'add-reading-width-add-reading-width-add-reading-width-add-reading-width'; // [!code ++]
const groupRemove = 'remove-reading-width-remove-reading-width-remove-reading-width'; // [!code --]
```

```ts filename="line-state-group-secondary.ts" group-key="secondary" tab-label="Secondary"
const secondaryState = 'normal';
```

::
