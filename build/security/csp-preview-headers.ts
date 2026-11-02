import {
  CSP_REPORT_ONLY_HEADER,
  type CspStageOneManifest,
  renderCspHeaders,
  resolveCspReportOnly,
} from './csp-report-only.js';

interface HeaderRule {
  pattern: string;
  headers: { name: string; value: string | null }[];
}

// Pages全構文のemulatorにはせず、現在使うpath/splat・cache・ROだけを解釈する。
export const parsePreviewHeaders = (source: string): HeaderRule[] => {
  const rules: HeaderRule[] = [];
  for (const line of source.split(/\r?\n/u)) {
    if (Buffer.byteLength(line) > 2000) throw new Error('[preview] header line limit');
    if (!line.trim() || line.startsWith('#')) continue;
    if (line.startsWith('/')) {
      if (!/^\/[A-Za-z0-9_./*%-]*$/u.test(line) || line.split('*').length > 2)
        throw new Error('[preview] unsupported header path');
      if (rules.some((rule) => rule.pattern === line))
        throw new Error('[preview] duplicate header rule');
      rules.push({ pattern: line, headers: [] });
      continue;
    }
    const reset = /^[ ]{2}! (Content-Security-Policy-Report-Only)$/u.exec(line);
    const set = /^[ ]{2}(Cache-Control|Content-Security-Policy-Report-Only): (.+)$/u.exec(line);
    const rule = rules.at(-1);
    const name = reset?.[1] ?? set?.[1];
    if (!rule || !name) throw new Error('[preview] unsupported header operation');
    if (reset && rule.headers.length) throw new Error('[preview] detach must precede set');
    if (rule.headers.some((header) => header.name === name && (reset || header.value !== null)))
      throw new Error('[preview] duplicate/comma header conflict');
    rule.headers.push({ name, value: reset ? null : (set?.[2] ?? '') });
  }
  if (rules.length > 100 || rules.some((rule) => !rule.headers.length))
    throw new Error('[preview] header rule limit or empty rule');
  return rules;
};

export const assemblePreviewHeaders = (
  baseline: string,
  fragment: string,
  manifest: CspStageOneManifest,
): string => {
  const baseRules = parsePreviewHeaders(baseline);
  if (baseRules.some((rule) => rule.headers.some(({ name }) => name !== 'Cache-Control')))
    throw new Error('[preview] baseline must be CSP-free');
  if (fragment !== renderCspHeaders(manifest)) throw new Error('[preview] stale RO fragment');
  const combined = `${baseline}\n${fragment}`;
  const rules = parsePreviewHeaders(combined);
  const parsed = rules.flatMap((rule) => {
    const operations = rule.headers.filter(({ name }) => name === CSP_REPORT_ONLY_HEADER);
    if (!operations.length) return [];
    const expected = manifest.rules.find(({ pattern }) => pattern === rule.pattern);
    const last = operations.at(-1);
    if (
      !expected ||
      !last?.value ||
      last.value.includes(',') ||
      /report-(?:uri|to)\b/iu.test(last.value)
    )
      throw new Error('[preview] unapproved policy');
    return [
      {
        pattern: rule.pattern,
        policy: last.value,
        context: expected.context,
        ...(operations[0]?.value === null ? { reset: true } : {}),
      },
    ];
  });
  if (JSON.stringify(parsed) !== JSON.stringify(manifest.rules))
    throw new Error('[preview] policy operations differ');
  for (const rule of manifest.rules) {
    const pathname = rule.context === 'worker' ? rule.pattern : '/index.html';
    if (resolveCspReportOnly(parsed, pathname) !== rule.policy)
      throw new Error('[preview] parent/Worker policy leakage');
  }
  return combined;
};
