import { expect, test } from '@playwright/test';

// 非本番の検証専用branchで、実際のmatrix failureがrequired gateへ伝わることを確認する。
test('non-production matrix required gate rejection probe', () => {
  expect(false).toBe(true);
});
