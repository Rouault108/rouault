import type { LexicalAnalyzer } from '../../shared/search/lexical-analyzer.js';
import type { SearchDocument, SearchPassage } from '../../shared/search/search-projection.js';

/** 反復を保持したindex文字列を作り、query用dedupeと混ぜない。 */
export function analyzeSearchProjection(
  analyzer: LexicalAnalyzer,
  documents: readonly SearchDocument[],
  passages: readonly SearchPassage[],
) {
  const fields = (value: string) => {
    const result = analyzer.analyze(value);
    return {
      word: result.wordOccurrenceTokens.join('\u001f'),
      gram: result.gramOccurrenceTokens.join('\u001f'),
    };
  };
  return {
    documents: documents.map((document) => {
      const title = fields(document.title),
        description = fields(document.description),
        body = fields(document.body);
      return {
        id: document.canonicalPathname,
        titleWord: title.word,
        titleGram: title.gram,
        descriptionWord: description.word,
        descriptionGram: description.gram,
        bodyWord: body.word,
        bodyGram: body.gram,
        pathWord: fields(document.pathLabel).word,
        keywordWord: document.keywords
          .map((keyword) => fields(keyword).word)
          .filter(Boolean)
          .join('\u001f'),
        tagWord: document.tags
          .map((tag) => fields(tag).word)
          .filter(Boolean)
          .join('\u001f'),
      };
    }),
    passages: passages.map((passage) => {
      const text = fields(passage.text),
        heading = fields(passage.headingPath.at(-1) ?? ''),
        ancestor = fields(passage.headingPath.slice(0, -1).join(' '));
      return {
        id: passage.passageId,
        passageWord: text.word,
        passageGram: text.gram,
        currentHeadingWord: heading.word,
        currentHeadingGram: heading.gram,
        ancestorHeadingWord: ancestor.word,
        ancestorHeadingGram: ancestor.gram,
      };
    }),
  };
}
