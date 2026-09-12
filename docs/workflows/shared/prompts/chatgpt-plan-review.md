# Prompt: ChatGPT計画精査

計画精査は、変更の妥当性を確定する中心的な精査です。実装後の適合性確認へ設計判断を先送りしません。

実行面と権限の正本は[分析・精査の実行面](../../analysis-and-review-surfaces.md)です。

```text
Rouaultの次の計画成果物を、実装開始前に精査してください。
本精査はChatまたはWorkで実行できます。実行面によってR段階、Aレベル、Gate、精査契約を変更しないでください。
精査中は対象repositoryの実装状態をread-onlyとして扱い、実装・tests・docs・生成物・untracked files・Git状態を変更しないでください。精査レポートは対象repository外の許可された場所へ作成できます。
計画の問題を発見しても精査と同時に実装修正せず、指摘と判定を返してください。
計画の本質的な妥当性、責務境界、契約影響、実装可能性、完了判定可能性を中心に確認してください。

入力:
- 対象状態:
- workflow modeと基本R段階:
- 基本計画: Mini Brief／Run Card／Cause Analysis＋Fix Plan／Decision Analysis＋Change Plan／Decision Record＋Change Plan
- R4 overlayの場合だけ全体Phase Map＋現在Phaseの詳細Phase Plan＋後続Phase概要:
- 根拠Evidence:
- 関連する現行実装・テスト・docs:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

確認:
- CauseまたはDecisionが対象状態とEvidenceに十分支えられているか
- 採用修正戦略または変更機構がFailureまたはRequestへ直接対応するか
- 最も低い適合R段階が採用され、条件付き項目だけが発火しているか
- R4 overlayの場合、基本計画を変更せず一括レビュー不能性だけを解決しているか
- owner、source of truth、責務境界、契約影響が一意か
- 対象ファイル、対象箇所、許可範囲、禁止範囲、out-of-scopeが矛盾しないか
- Failure／Request→Cause／Decision→Change→Success／Acceptance→Verificationが対応するか
- Success／Acceptanceが変更目的を表し、Verificationで判定可能か
- Verificationが観測対象、判定基準、必要環境を定めているか
- Codexへ仕様、契約、owner、削除、移行、アクセシビリティ上の意味の判断を残していないか
- 対象状態に対して実装可能か

重大度:
- Blocker: この計画のまま実装すると、採用機構、変更範囲、契約、Success／Acceptanceの再決定、誤実装、契約違反、または完了判定不能を招く
- Recommended: 実装判断を変えないが、今回の計画を明確化する合理性が高い
- Optional: 将来改善または別案。今回の計画を拡張しない

指摘を修正しても採用機構、変更範囲、契約、Success／Acceptance、Verificationの実現可能性が変わらない場合、原則としてBlockerにしないでください。
Evidence取得方法の細部、報告形式、ログ名、保存形式、補助的な追加確認は、Cause／Decision、変更範囲、Verificationの実現可能性、またはA1／A2要件を左右する場合だけBlockerにしてください。
Verificationの正本は観測対象と判定基準です。コマンド文字列を契約として固定した場合を除き、同じ判定ができる同等手段を認めてください。

出力:
1. 結論: approve-candidate／request-changes／re-investigate／replan-required
2. Blocker
3. Recommended
4. Optional
5. Cause／Decisionと採用機構の妥当性
6. 契約、owner、source of truth、責務境界
7. 変更範囲とout-of-scope
8. Success／AcceptanceとVerificationの判定可能性
9. Codexへ渡してよい確定計画か
10. workflow移行、R段階変更、R4 overlayが発火する場合だけ、その要否と理由
11. 承認時に固定する基本計画と、R4の場合は全体Phase Map／現在Phase Plan／後続Phase概要の要約

重大な見落としとは、Cause／Decision、採用機構、変更範囲、責務境界、契約、Success／Acceptance、Verificationの実現可能性を変える新事実です。
2回目以降は前回指摘と更新された計画差分を主対象とし、新Evidenceまたは重大な見落としがない限り、採用済み判断をゼロから再設計しないでください。
```
