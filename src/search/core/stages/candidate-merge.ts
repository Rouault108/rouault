import { addIssue } from '../../diagnostics.js';
import {
  normalizeDocumentCanonicalUrl,
  validateResultUrl,
} from '../../../../shared/search/document-url.js';
import type { SearchCandidate, SearchSourceBatch, SearchSourceKind } from '../../../../shared/search/search-types.js';
import type { CandidateMergeStageOutput, CandidateValidationStageOutput } from '../stage-types.js';

interface MergedCandidateUrlEntry {
  source: SearchSourceKind;
  url: string;
}

function mergeFieldTokens(
  left: SearchCandidate,
  right: SearchCandidate,
): SearchCandidate['fieldTokens'] {
  return {
    titleTokens: [...new Set([...left.fieldTokens.titleTokens, ...right.fieldTokens.titleTokens])],
    bodyTokens: [...new Set([...left.fieldTokens.bodyTokens, ...right.fieldTokens.bodyTokens])],
    pathTokens: [...new Set([...left.fieldTokens.pathTokens, ...right.fieldTokens.pathTokens])],
    keywordTokens: [
      ...new Set([...left.fieldTokens.keywordTokens, ...right.fieldTokens.keywordTokens]),
    ],
  };
}

function snippetMatchCount(candidate: SearchCandidate): number {
  return candidate.snippet?.segments.filter((segment) => segment.matched).length ?? 0;
}

function pickPreferredUrl(
  canonicalUrl: string,
  urlEntries: readonly MergedCandidateUrlEntry[],
): string | null {
  const validEntries = urlEntries.filter((entry) => {
    const validated = validateResultUrl(entry.url);
    if (!validated.ok) {
      return false;
    }

    return normalizeDocumentCanonicalUrl(validated.url) === canonicalUrl;
  });

  if (validEntries.length === 0) {
    return null;
  }

  return [...validEntries].sort((left, right) => {
    const leftSourceOrder = left.source === 'pagefind' ? 0 : 1;
    const rightSourceOrder = right.source === 'pagefind' ? 0 : 1;
    if (leftSourceOrder !== rightSourceOrder) {
      return leftSourceOrder - rightSourceOrder;
    }

    const leftHasQueryOrHash = left.url.includes('?') || left.url.includes('#') ? 1 : 0;
    const rightHasQueryOrHash = right.url.includes('?') || right.url.includes('#') ? 1 : 0;
    if (leftHasQueryOrHash !== rightHasQueryOrHash) {
      return leftHasQueryOrHash - rightHasQueryOrHash;
    }

    return left.url.localeCompare(right.url, 'ja');
  })[0]?.url ?? null;
}

function mergeCandidates(
  batches: readonly SearchSourceBatch[],
  diagnostics: CandidateValidationStageOutput['diagnostics'],
): SearchCandidate[] {
  const merged = new Map<
    string,
    SearchCandidate & {
      urlEntries: MergedCandidateUrlEntry[];
    }
  >();

  for (const batch of batches) {
    if (batch.status !== 'active') {
      continue;
    }

    for (const candidate of batch.candidates) {
      const existing = merged.get(candidate.canonicalUrl);
      if (!existing) {
        merged.set(candidate.canonicalUrl, {
          ...candidate,
          urlEntries: [{ source: batch.source, url: candidate.url }],
        });
        continue;
      }

      const preferredDescription =
        existing.matchedSources.includes('pagefind') && !candidate.matchedSources.includes('pagefind')
          ? existing.description
          : candidate.matchedSources.includes('pagefind') &&
              !existing.matchedSources.includes('pagefind')
            ? candidate.description
            : existing.description.length >= candidate.description.length
              ? existing.description
              : candidate.description;
      const preferredSnippet =
        existing.matchedSources.includes('pagefind') && !candidate.matchedSources.includes('pagefind')
          ? existing.snippet
          : candidate.matchedSources.includes('pagefind') &&
              !existing.matchedSources.includes('pagefind')
            ? candidate.snippet
            : snippetMatchCount(existing) >= snippetMatchCount(candidate)
              ? existing.snippet
              : candidate.snippet;
      const preferredDate =
        (existing.date.epochMs ?? -1) >= (candidate.date.epochMs ?? -1) ? existing.date : candidate.date;
      const preferredTitle =
        existing.title.length > 0
          ? existing.title
          : candidate.title.length > 0
            ? candidate.title
            : existing.title;

      merged.set(candidate.canonicalUrl, {
        ...existing,
        title: preferredTitle,
        description: preferredDescription,
        date: preferredDate,
        tags: [...new Set([...existing.tags, ...candidate.tags])].sort((left, right) =>
          left.localeCompare(right, 'ja'),
        ),
        snippet: preferredSnippet,
        matchedSources: [...new Set([...existing.matchedSources, ...candidate.matchedSources])],
        fieldTokens: mergeFieldTokens(existing, candidate),
        featureScores: {
          ...existing.featureScores,
          sourceReliabilityScore: Math.max(
            existing.featureScores.sourceReliabilityScore,
            candidate.featureScores.sourceReliabilityScore,
          ),
          matchEvidenceScore: Math.max(
            existing.featureScores.matchEvidenceScore,
            candidate.featureScores.matchEvidenceScore,
          ),
        },
        urlEntries: [...existing.urlEntries, { source: batch.source, url: candidate.url }],
      });
    }
  }

  return [...merged.values()].flatMap((candidate) => {
    const preferredUrl = pickPreferredUrl(candidate.canonicalUrl, candidate.urlEntries);
    if (preferredUrl === null) {
      addIssue(diagnostics, {
        code: 'invalid-result-url',
        stage: 'merge',
        ...(candidate.matchedSources[0] ? { source: candidate.matchedSources[0] } : {}),
      });
      return [];
    }

    return [
      {
        canonicalUrl: candidate.canonicalUrl,
        url: preferredUrl,
        pathLabel: candidate.pathLabel,
        title: candidate.title,
        description: candidate.description,
        date: candidate.date,
        tags: candidate.tags,
        snippet: candidate.snippet,
        matchedSources: candidate.matchedSources,
        matchedFields: candidate.matchedFields,
        matchedTokens: candidate.matchedTokens,
        featureScores: candidate.featureScores,
        fieldTokens: candidate.fieldTokens,
      },
    ];
  });
}

export function runCandidateMergeStage(
  input: CandidateValidationStageOutput,
): CandidateMergeStageOutput {
  return {
    ...input,
    mergedCandidates: mergeCandidates(input.batches, input.diagnostics),
  };
}
