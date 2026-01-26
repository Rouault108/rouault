/**
 * シンプルなi18nユーティリティ
 * TODO: 完全な国際化が必要な場合は @lit/localize を置き換える
 */

export type Locale = 'ja' | 'en';

interface Messages {
  preview: {
    codePreview: string;
    sourceCode: string;
    showCode: string;
    hideCode: string;
    previewTitle: string;
  };
}

const messages: Record<Locale, Messages> = {
  ja: {
    preview: {
      codePreview: 'コードプレビュー',
      sourceCode: 'ソースコード',
      showCode: 'コードを表示',
      hideCode: 'コードを非表示',
      previewTitle: 'プレビュー',
    },
  },
  en: {
    preview: {
      codePreview: 'Code Preview',
      sourceCode: 'Source Code',
      showCode: 'Show Code',
      hideCode: 'Hide Code',
      previewTitle: 'Preview',
    },
  },
};

let currentLocale: Locale = 'ja';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function t(key: string): string {
  const keys = key.split('.');
  let value: unknown = messages[currentLocale];

  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      console.warn(`i18n: Missing translation for key "${key}"`);
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}
