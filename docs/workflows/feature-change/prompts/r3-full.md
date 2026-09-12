# Prompt: Feature-change R3 Decision Record and Change Plan

```text
RouaultのR3変更について、仕様判断を実装から分離し、Decision Recordを作成した後にChange Planを作成してください。

R3対象:
- 公開・永続契約変更
- owner／source of truth／コンポーネント境界変更
- URL、routing、データ形式、永続化形式変更
- アクセシビリティ上の意味変更
- 機能削除、migration、deprecation

入力:
- 対象状態:
- Request:
- Evidence:
- 現行仕様・実装・テスト・docs:
- problem-solving Handoff（該当する場合）:
- 候補案:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

Decision Record:
1. Requestと採用Decision
2. 採用仕様
3. 実装可能な棄却案／保留案（存在する場合だけ）
4. 反対仮説と判断を支えるEvidence
5. 変更する契約と維持する契約
6. 現在／目標owner（変更対象の場合）
7. 現在／目標source of truth（変更対象の場合）
8. 旧owner／旧正本の終了状態（ownerまたは正本を変更する場合だけ）
9. compatibility policy（互換性判断が必要な場合だけ）
10. 削除、migration、deprecationの扱い（該当する場合だけ）
11. 読書体験とアクセシビリティへの影響
12. 未解決事項とout-of-scope

Delete／Breaking Change Gate:
削除、互換性破壊、契約削除、migration、deprecationがある場合だけ作成する。
- 対象契約
- 参照検索Evidence
- 破壊的変更の理由
- 代替手段
- migration／deprecation
- 失敗時の扱い
- 非自明なrollback
- Gate通過可否

Change Plan:
- 対象ファイルと対象箇所
- 変更理由
- 変更してよい範囲／変更してはいけない範囲
- 目標owner／source of truthと旧経路の終了（変更対象の場合だけ）
- 未計画のfallback、shim、並行経路を禁止する境界
- Request→Decision→Change→Acceptance→Verification
- Verificationの観測対象、判定基準、必要環境
- 既知の場合だけ推奨コマンド
- 自動化できないAcceptanceだけ手動確認
- 発火した場合だけrollback
- out-of-scope
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
- Codex限定実装条件

禁止:
- Codexへ未決の仕様、契約、削除、移行判断を委ねる
- 互換性維持を名目とする終了条件のない並行経路
- 発火しないGateやA1／A2成果物のN/A一覧
```
