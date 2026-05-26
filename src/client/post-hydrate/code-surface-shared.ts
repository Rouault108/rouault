const LANGUAGE_LABEL_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  css: 'CSS',
  html: 'HTML',
  json: 'JSON',
  md: 'Markdown',
  markdown: 'Markdown',
  sh: 'Shell',
  bash: 'Bash',
  yml: 'YAML',
  yaml: 'YAML',
};

export const pickOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getIntentLabel = (intent: string | null | undefined): string | null => {
  switch (pickOptionalString(intent)) {
    case 'valid':
      return '正しい例';
    case 'invalid':
      return '誤り例';
    default:
      return null;
  }
};

export const resolveLanguageLabel = (value: string | null | undefined): string | null => {
  const normalized = pickOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  const mapped = LANGUAGE_LABEL_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  return normalized.slice(0, 1).toUpperCase() + normalized.slice(1);
};

const withCopyVerb = (contextName: string | null): string => {
  if (!contextName || contextName === 'コード') {
    return 'コードをコピー';
  }

  return `${contextName} のコードをコピー`;
};

export const resolveStandaloneContextName = (pre: HTMLElement): string => {
  const filename = pickOptionalString(pre.dataset['codeFilename']);
  if (filename) {
    return filename;
  }

  const language = resolveLanguageLabel(pre.dataset['codeLanguage'] ?? null);
  if (language) {
    return language;
  }

  return 'コード';
};

export const resolveStandaloneCopyButtonLabel = (pre: HTMLElement): string =>
  withCopyVerb(resolveStandaloneContextName(pre));

export const resolveGroupCopyContextName = (
  pre: HTMLElement,
  fallbackLabel: string | null | undefined,
): string => {
  const copyLabel = pickOptionalString(pre.dataset['codeCopyLabel']);
  if (copyLabel) {
    return copyLabel;
  }

  const filename = pickOptionalString(pre.dataset['codeFilename']);
  if (filename) {
    return filename;
  }

  const language = resolveLanguageLabel(pre.dataset['codeLanguage'] ?? null);
  if (language) {
    return language;
  }

  const tabLabel = pickOptionalString(pre.dataset['codeTabLabel']);
  if (tabLabel) {
    return tabLabel;
  }

  const normalizedFallback = pickOptionalString(fallbackLabel ?? null);
  if (normalizedFallback) {
    return normalizedFallback;
  }

  return 'コード';
};

export const resolveGroupCopyButtonLabel = (
  pre: HTMLElement,
  fallbackLabel: string | null | undefined,
): string => withCopyVerb(resolveGroupCopyContextName(pre, fallbackLabel));
