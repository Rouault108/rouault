# Callout Reading Annotation Redesign Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-29
- Request ID: REQ-CALLOUT-READING-ANNOTATION-001
- Decision ID: D-CALLOUT-READING-ANNOTATION-001
- Scope: Markdown callout visual contract and authoring guidance

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。Markdown safety boundaryは`docs/contracts/markdown.md`、final DOMは`docs/references/markdown-output.md`、視覚契約は`docs/design-system/components/callout.md`を参照します。

## Decision

`callout`をUI通知カードではなく、本文中の短い読書注記surfaceとして再定義する。

初回Phaseでは、`::callout`入力記法、`note` / `tip` / `success` / `warning` / `danger`のkind値、final DOM構造、`aria-labelledby` / `aria-label` / icon `aria-hidden`契約、既定アイコン生成を変更しない。

kindの意味は次の通り固定する。

| kind | 意味 | 視覚強度 |
|---|---|---:|
| `note` | 中立的な補足、前提、余談 | 最弱 |
| `tip` | 実践上の助言、読み方のヒント | 弱から中 |
| `success` | 確認済み、成立、完了 | 中 |
| `warning` | 制約、誤読防止、注意 | 中から強 |
| `danger` | 重大危険、破壊的操作、強い警告 | 最強 |

## Negative Breaking Change Gate

Gate result: pass / no breaking change。

理由:

- `::callout`入力記法を変更しない。
- kind値を追加、削除、改名しない。
- final DOM構造を変更しない。
- `aria-labelledby` / `aria-label` / icon `aria-hidden`契約を変更しない。
- URL / data contractを変更しない。
- 既存`--callout-accent-color`を削除、改名しない。

この変更は破壊的変更ではない。ただし、calloutのvisual contractを読書注記surfaceへ寄せる視覚契約変更である。

## Alternatives Rejected

### Keep callout as a notification card

棄却。本文中の短い補足まで通知カードの強さで表示され、読書面の主従関係を乱す。

### Make `heading` required for warning and danger

棄却。可視headingは強く推奨するが、初回Phaseで入力契約を破壊しない。

### Add a new neutral kind

棄却。既存`note`が中立的な読書注記を担えるため、kind追加は不要である。

### Move structured information into callout variants

棄却。構造化情報は`info-box`の責務であり、calloutへvariantを増やすとsurface境界が曖昧になる。

## Deferred Options

- 実ノート本文内で「補助情報」に`tip`を使っている箇所の段階的棚卸し。
- Storybook上の視覚サンプル整理。
- light / dark / forced-colorsの視覚確認に基づく微調整。

## Counter-hypothesis Review

### H1: tip should remain the default for supplemental information

Rejected. `tip`は助言や読み方のヒントであり、単なる補助情報の標準にすると意味分類が曖昧になる。中立的な補足は`note`が担う。

### H2: Stronger colors improve discoverability

Rejected. calloutは本文内の読書注記であり、通知カードのような発見性より本文への復帰しやすさを優先する。ただし`warning` / `danger`の識別性は左線とheading推奨で維持する。

### H3: DOM or kind changes would make the redesign cleaner

Rejected. 初回Phaseの目的は視覚契約とauthoring guidanceの再定義であり、入力記法、kind値、DOM、aria契約を変えずに成立させる。

## Rollback

このChangeで変更したCSS、CSS契約テスト、例、docs、ADRだけをrevertする。入力記法、kind値、DOM生成、`tokens.css`は変更しないため、rollbackはCSS/docs/tests/examplesの復元で完了する。
