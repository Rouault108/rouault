import { test, expect } from '../support/csp-test.js';

test('privacy negative control deliberately fails', async ({ page }) => {
  await page.setContent('<main>CSP_PRIVATE_CANARY_7f1a</main>');
  console.log('CSP_PRIVATE_CANARY_7f1a stdout');
  console.error('CSP_PRIVATE_CANARY_7f1a stderr');
  await page.evaluate(() => console.error('CSP_PRIVATE_CANARY_7f1a browser console'));
  expect('http://127.0.0.1/?q=CSP_PRIVATE_CANARY_7f1a#private').toBe('redacted');
});
