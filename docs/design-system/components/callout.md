# Callout

`callout`は、本文中の短い読書注記surfaceである。UI通知カード、操作カード、長い構造化情報の器ではない。読者の注意を一瞬だけ本文脇へ寄せ、すぐ本文へ戻れる軽さを保つ。

## Responsibility

- `callout`: 短い補足、ヒント、注意、警告を本文の流れに挿入する読書注記surface。
- `info-box`: 作品情報、属性一覧、複数項目のまとまった説明など、構造化情報surface。
- `details`: 読者が展開して読む補足。
- `translation`: 原文と訳文など、対応関係を持つ読書surface。

`callout`へ長い表、複数セクション、操作UIを詰め込まない。構造が必要な情報は`info-box`または通常本文へ分ける。

## Kind Roles

| kind | 意味 | 視覚強度 | 方針 |
|---|---|---:|---|
| `note` | 中立的な補足、前提、余談 | 最弱 | semantic colorを主面に使わない、最も静かな読書注記。 |
| `tip` | 実践上の助言、読み方のヒント | 弱から中 | 補助情報ではなくヒント。青い面は控えめにする。 |
| `success` | 確認済み、成立、完了 | 中 | 成功通知ではなく、検証済み事項の短い注記。 |
| `warning` | 制約、誤読防止、注意 | 中から強 | 可視headingを強く推奨し、色だけに依存しない。 |
| `danger` | 重大危険、破壊的操作、強い警告 | 最強 | 可視headingを強く推奨し、左線で最も強く識別する。 |

## Visual Contract

- rootは本文に従属する軽いsurfaceとして表示する。
- root defaultと`note`はneutral/subtle系の背景面を抑え、左線と余白で読書注記としての構造を保つ。
- `tip`はinfo subtle系tokenを優先し、強い青い通知カードにしない。
- `success`は成功通知カードではなく、確認済み事項の短い読書注記として扱い、緑の背景面を強くしすぎない。
- `warning` / `danger`は識別性を維持し、背景色だけに意味を依存させない。
- `danger`だけがkind別ruleで左線幅を強めてよい。
- rootにhover、active、focus、transition、animation、shadowによる操作surface表現を付けない。
- 内部のlink / buttonなどのnative interactive elementは、それぞれのfocus-visible契約を維持する。
- forced-colorsではborder、左線、text/iconで識別できるようにし、背景色だけに依存しない。

## Compatibility

`--callout-accent-color`は既存互換のaliasとして維持する。ただし、新しい公開override契約として文書化しない。実装内部の追加変数はprivateな`--_callout-*`として扱う。

`.callout-icon`と`[data-callout-icon-svg]`の両方は、既定icon生成と既存CSS互換のためscope付きselectorで維持する。
