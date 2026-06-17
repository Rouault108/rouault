---
title: 'TOC Absent'
description: 'TOC 不在時の note shell 契約を確認します。'
date: 2026-04-14
updated: 2026-04-14
kind: 'testing'
testingArea: 'navigation'
chromeProfile: 'reader'
status: 'wip'
e2eFixtureId: 'note.toc-absent'
---

このノートは TOC が存在しない reader note 用 fixture です。

本文は段落と箇条書きだけで構成し、見出し要素を含めません。

- header reserve
- note-shell の 1 カラム契約
- router 遷移時の shell 同期

| Observation target    | Expected no TOC frame behavior | Wider content evidence                                 | Stability note                         |
| --------------------- | ------------------------------ | ------------------------------------------------------ | -------------------------------------- |
| absent TOC note shell | 右側の TOC track を予約しない  | この横長のセルが本文 frame の拡張を E2E から観測できる | 見出しを追加せず TOC absent を維持する |
