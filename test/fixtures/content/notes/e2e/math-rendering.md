---
title: 'Static Math Rendering'
description: 'KaTeXのHTML・MathMLと同版CSS・フォントをno-JSで確認するfixture'
kind: 'testing'
testingArea: 'typography'
chromeProfile: 'plain'
e2eFixtureId: 'note.math-rendering'
excludeFromPublicationSurfaces: true
---

Inline $x^2 + y^2 = z^2$.

$$
\frac{1}{2} + \sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

```math
\begin{pmatrix}a & b \\ c & d\end{pmatrix}\quad \big[ x \big]
```
