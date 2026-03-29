---
title: 'ソートアルゴリズム比較'
description: '主要なソートアルゴリズムの計算量と特徴を比較するメモ'
date: 2026-02-10
genre:
  - computer-science
  - algorithms
---

## ソートアルゴリズム比較

### 計算量一覧

| アルゴリズム   | 最良          | 平均          | 最悪          | 安定 |
| -------------- | ------------- | ------------- | ------------- | ---- |
| バブルソート   | $O(n)$        | $O(n^2)$      | $O(n^2)$      | Yes  |
| マージソート   | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | Yes  |
| クイックソート | $O(n \log n)$ | $O(n \log n)$ | $O(n^2)$      | No   |

### クイックソートの実装例

```typescript
function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;

  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter((x) => x < pivot);
  const middle = arr.filter((x) => x === pivot);
  const right = arr.filter((x) => x > pivot);

  return [...quickSort(left), ...middle, ...quickSort(right)];
}
```

::code-group{aria-label="クイックソート比較"}

```typescript group-key="typescript" tab-label="TypeScript" filename="quick-sort.ts"
function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter((x) => x < pivot);
  const middle = arr.filter((x) => x === pivot);
  const right = arr.filter((x) => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
```

```javascript group-key="javascript" tab-label="JavaScript" filename="quick-sort.js"
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter((x) => x < pivot);
  const middle = arr.filter((x) => x === pivot);
  const right = arr.filter((x) => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
```

::

### マージソートの特徴

- **安定ソート**: 同じ値の要素の順序が保持される
- **空間計算量**: $O(n)$ の追加メモリが必要
- **分割統治法**: 再帰的に半分に分割して結合
