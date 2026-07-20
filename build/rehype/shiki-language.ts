import { bundledLanguagesInfo, type BundledLanguage } from 'shiki';

export type ShikiLanguageFallbackReason = 'language-omitted' | 'explicit-text' | 'unknown-language';

export interface ResolvedShikiLanguage {
  readonly requestedLanguage: string | undefined;
  readonly normalizedLanguage: string | undefined;
  readonly resolvedLanguage: BundledLanguage | 'text';
  readonly fallbackReason: ShikiLanguageFallbackReason | null;
}

const BUNDLED_LANGUAGE_IDS = new Set(bundledLanguagesInfo.map((language) => language.id));
const BUNDLED_LANGUAGE_ALIASES = new Map(
  bundledLanguagesInfo.flatMap((language) =>
    (language.aliases ?? []).map((alias) => [alias, language.id] as const),
  ),
);

export const resolveShikiLanguage = (language: string | undefined): ResolvedShikiLanguage => {
  const normalizedLanguage = language?.trim().toLowerCase();
  if (!normalizedLanguage) {
    return {
      requestedLanguage: language,
      normalizedLanguage: normalizedLanguage || undefined,
      resolvedLanguage: 'text',
      fallbackReason: 'language-omitted',
    };
  }

  if (normalizedLanguage === 'text') {
    return {
      requestedLanguage: language,
      normalizedLanguage,
      resolvedLanguage: 'text',
      fallbackReason: 'explicit-text',
    };
  }

  if (BUNDLED_LANGUAGE_IDS.has(normalizedLanguage)) {
    return {
      requestedLanguage: language,
      normalizedLanguage,
      resolvedLanguage: normalizedLanguage as BundledLanguage,
      fallbackReason: null,
    };
  }

  const aliased = BUNDLED_LANGUAGE_ALIASES.get(normalizedLanguage);
  if (aliased && BUNDLED_LANGUAGE_IDS.has(aliased)) {
    return {
      requestedLanguage: language,
      normalizedLanguage,
      resolvedLanguage: aliased as BundledLanguage,
      fallbackReason: null,
    };
  }

  return {
    requestedLanguage: language,
    normalizedLanguage,
    resolvedLanguage: 'text',
    fallbackReason: 'unknown-language',
  };
};
