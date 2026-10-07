---
title: 'TOC Readable Long Heading'
description: '長い日本語見出しに対する TOC wrapping contract を確認します。'
date: 2026-05-08
updated: 2026-05-08
kind: 'testing'
testingArea: 'navigation'
chromeProfile: 'reader'
status: 'wip'
e2eFixtureId: 'note.toc-readable-long-heading'
---

このノートは、長い日本語見出しが右 TOC と mobile panel で読めることを確認するための fixture です。

## 第1章 読書面と補助ナビゲーションの役割を分ける

本文の読みやすさを優先しつつ、現在地の把握に必要な章題は残します。

## 第2章 ソースコードから実行まで：コンパイル単位、アセンブリ、IL、メタデータ、CLRの関係

この見出しは TOC label の複数行 clamp と active state の検証対象です。

## 第3章 ビルド時変換と実行時 hydration の責務境界

静的 HTML と runtime 振る舞いの契約を分けます。

## 第4章 Markdown 資産を表示都合で汚染しないための変換層

表示都合は content asset ではなく projection と UI で吸収します。

## 第5章 URL、履歴 state、文書内 navigation の所有範囲

共有可能な状態と一時的な UI 状態を分離します。

## 第6章 active rail と aria-current を主表現にした現在地表示

font weight は補助表現として扱います。

## 第7章 compact density でも見出し情報を過剰に欠落させない

compact は余白を詰める契約であり、見出しを単行へ潰す契約ではありません。

## 第8章 static-first mobile panel clone の表示契約

SSR desktop nav と mobile panel clone は同じ wrapping contract を共有します。

## 第9章 legacy Lit layout shell と nested ui-toc の互換経路

legacy 経路でも同じ DOM hook と label wrapping を維持します。

## 第10章 header center zone と TOC reserve の横方向整合

TOC 幅の変更は reading chrome 全体の契約として検証します。

## 第11章 production CSS artifact に到達する wrapping contract

生成された HTML から到達できる CSS に契約が含まれることを確認します。

## 第12章 回帰検知のための browser と e2e の責務分離

computed style、DOM hook、実ブラウザ表示をそれぞれ異なる層で固定します。
