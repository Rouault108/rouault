---
title: 'Footnote Endnotes Layout'
description: '脚注 endnotes が番号右側から開始し、2 桁番号でも hanging indent を保つことを確認する e2e 専用 fixture'
date: 2026-04-21
kind: 'reader'
e2eFixtureId: 'note.footnote-endnotes-layout'
genre:
  - testing
  - e2e
---

このノートは、endnotes の hanging indent と 2 桁番号時の安定性を確認する e2e 専用 fixture です。[^layout-1][^layout-2][^layout-3][^layout-4][^layout-5][^layout-6][^layout-7][^layout-8][^layout-9][^layout-10][^layout-11]

## 1. 確認項目

1 桁番号の脚注でも 2 桁番号の脚注でも、本文が番号の右側から始まり、折り返し後の行頭が同じ位置にそろうことを確認します。

[^layout-1]: 一桁番号の脚注は、モバイル幅でも本文開始位置が marker の右側に残り続ける必要があります。折り返し後の行頭がずれると、読み手は番号と本文の対応を見失いやすくなります。静かな UI を保つためにも、脚注一覧の整列は崩してはなりません。
[^layout-2]: 二番目の脚注は fixture の密度を確保するための補助項目です。脚注間の間隔、番号の視認性、backref への到達性が通常の prose と共存できることを確認します。
[^layout-3]: 三番目の脚注は通常の段落長を維持します。意味論は ordered list の marker に任せ、CSS では marker と本文の距離だけを安定化します。
[^layout-4]: 四番目の脚注は長過ぎない文章量で、短文と長文が混在しても一覧の rhythm が崩れないことを確認するために置いています。
[^layout-5]: 五番目の脚注は視覚ノイズを増やさずに補助情報へアクセスできることを確認するためのダミー本文です。
[^layout-6]: 六番目の脚注は target 強調や backref の存在を維持したまま、番号と本文の対応関係が読み取りやすいことを確認する補助項目です。
[^layout-7]: 七番目の脚注は静的 HTML のみでも十分に意味が通ることを確認するためのプレースホルダーです。
[^layout-8]: 八番目の脚注は paragraph 開始位置が段落ごとにぶれないことを確認するための短い補助テキストです。
[^layout-9]: 九番目の脚注は二桁番号へ遷移する直前の比較用として残しています。
[^layout-10]: 二桁番号の脚注でも、本文は番号の右側から開始し続けなければなりません。特にモバイル幅では、最初の行と次の行の左端がそろっていることが hanging indent の成立条件になります。段落が十分に折り返したときでも、marker ガターの幅が不足せず、読み手が本文の開始位置を安定して追える必要があります。
[^layout-11]: 長い URL を含む脚注でも endnotes 全体が横方向に押し広がらないことを確認するため、[https://example.com/footnote-endnotes-layout/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa](https://example.com/footnote-endnotes-layout/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa) を含めています。
