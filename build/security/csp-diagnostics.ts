export interface CspDiagnostic {
  buildId: string;
  browser: string;
  routeClass: string;
  directive: string;
  disposition: string;
  blocked: string;
  status: number;
  owner: string;
  classification: 'fixture' | 'known-legacy-preview';
}

// 完全URLやBlob識別子を保存せず、許可境界の判定に必要なorigin/schemeだけを残す。
export const blockedOriginOrScheme = (value: string): string => {
  if (value === 'blob' || value.startsWith('blob:')) return 'blob:';
  if (value === 'data' || value.startsWith('data:')) return 'data:';
  if (['inline', 'eval', 'wasm-eval', ''].includes(value)) return value;
  try {
    const url = new URL(value);
    return url.origin !== 'null' ? url.origin : url.protocol;
  } catch {
    return 'other';
  }
};

export const assertMinimalCspDiagnostics = (value: unknown): void => {
  if (!Array.isArray(value)) throw new Error('[csp] diagnostic must be an array');
  const keys = [
    'buildId',
    'browser',
    'routeClass',
    'directive',
    'disposition',
    'blocked',
    'status',
    'owner',
    'classification',
  ];
  for (const row of value) {
    if (
      !row ||
      typeof row !== 'object' ||
      Object.keys(row).some((key) => !keys.includes(key)) ||
      keys.some((key) => !(key in row))
    )
      throw new Error('[csp] diagnostic contains unapproved fields');
    const record: Record<string, unknown> = Object.fromEntries(Object.entries(row));
    if (
      keys.filter((key) => key !== 'status').some((key) => typeof record[key] !== 'string') ||
      typeof record['status'] !== 'number' ||
      !Number.isFinite(record['status'])
    )
      throw new Error('[csp] malformed diagnostic');
    const blocked = record['blocked'];
    if (
      typeof blocked !== 'string' ||
      blockedOriginOrScheme(blocked) !== blocked ||
      !/^[\w.-]+$/u.test(String(record['buildId'])) ||
      !/^(?:chromium|firefox|webkit)-csp$/u.test(String(record['browser'])) ||
      !/^[a-z-]+$/u.test(String(record['directive'])) ||
      !/^[\w-]+$/u.test(String(record['owner'])) ||
      ![
        'home',
        'note',
        'memo',
        'corpus',
        'tag',
        'about',
        'search',
        '404',
        'other',
        'preview',
      ].includes(String(record['routeClass'])) ||
      record['disposition'] !== 'report' ||
      !['fixture', 'known-legacy-preview'].includes(String(record['classification']))
    )
      throw new Error('[csp] diagnostic is not minimized');
  }
};
