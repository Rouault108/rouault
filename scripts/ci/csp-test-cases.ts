// 保存するcase IDは固定集合だけとし、任意のtest titleやURLをreportへ通さない。
export const CSP_TEST_CASES: Readonly<Record<string, string>> = {
  'theme bootstrap works independently: system': 'theme-system',
  'theme bootstrap works independently: light': 'theme-light',
  'theme bootstrap works independently: dark': 'theme-dark',
  'theme bootstrap works independently: storage-denied': 'theme-storage-denied',
  'unknown inline reports and continues in Report-Only': 'inline-ro',
  'production Worker continues lexical operations in RO; notifications are evaluated in isolated controls':
    'lexical-ro-control',
  'production lexical Worker has the separate HTTP policy, correct MIME, WASM and no Catalog fallback':
    'lexical-production',
  'style exception is intentional; legacy srcdoc script/base/frame violations remain classified':
    'legacy-preview',
  'all entry classes share one policy and preserve no-JS content; soft navigation keeps the initial document':
    'entry-navigation',
  'unknown paths receive app 404 with global policy; 304 retains the correct response-class policy':
    'http-404-304',
  'diagnostic only: separate Worker console, events, Blob fetch and WASM outcomes':
    'worker-diagnostic',
  'Worker RO observation with controls; capability evaluation is separate': 'worker-observation',
  'failure privacy controls redact assertion, source, DOM, stdout and report': 'failure-privacy',
  'observer faults are detected independently of notification gaps': 'observer-faults',
  'real Suzume API evidence keeps streaming, bytes and notifications independent': 'real-wasm',
  'diagnostic-only and shared measurement faults have different effects': 'wasm-faults',
};
export const CSP_REQUIRED_CASE_IDS = Object.values(CSP_TEST_CASES);
