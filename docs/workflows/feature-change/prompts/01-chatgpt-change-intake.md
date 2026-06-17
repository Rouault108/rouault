# Prompt: ChatGPT 機能変更の初動整理

```text
Rouaultで次の機能変更要求があります。
以下の情報だけを使い、入口判定、変更種別、R段階、Aレベル、必要成果物を整理してください。
採用仕様はまだ断定しないでください。

情報境界:
- この入力に明示された情報だけを根拠にする
- 未提示の過去会話や記憶を根拠にしない
- 推定は推定として明示し、Evidenceで検証可能にする
- 未redactの個人ノート本文、秘密情報、ローカルパス、非公開URLを根拠にしない

入力:
- Request ID:
- 変更要求:
- 変更種別候補: add / change / remove / refactor / contract-change / migration / deprecation
- 対象機能:
- 目的:
- 変更しない場合の問題:
- ユーザー体験上の意図:
- 期待する挙動:
- 変更したくない挙動:
- 関連ファイル:
- 関連docs / contracts / ADR:
- 環境:
- branch / commit:
- local差分:
- CI run / log:
- 共有不可情報:

出力:
1. 依頼の仮定義
2. problem-solving ではなく feature-change として扱うべきか
3. 変更種別と理由
4. 重大度
5. R段階と理由
6. Aレベルと理由
7. 必要成果物
8. R3 Decision Record要否
9. Delete / Breaking Change Gate要否
10. A1/A2 Evidence保全要件の要否
11. 現行仕様・現行実装として確認すべき項目
12. 削除・破壊的変更・移行・契約変更に該当する場合に必要な追加Evidence
13. 不足情報
14. 次に行う確認
15. 次に使うプロンプト
16. この時点で断定を避けるべき点
```
