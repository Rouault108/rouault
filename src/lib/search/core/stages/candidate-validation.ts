import { addIssue, createCandidateRef } from '../../diagnostics.js';
import {
  normalizeDocumentCanonicalUrl,
  validateResultUrl,
} from '../../document-url.js';
import type { SearchSourceBatch } from '../../search-types.js';
import type { CandidateValidationStageOutput, SourceFederationStageOutput } from '../stage-types.js';

function validateBatch(
  batch: SearchSourceBatch,
  diagnostics: SourceFederationStageOutput['diagnostics'],
): SearchSourceBatch {
  if (batch.status !== 'active') {
    return batch;
  }

  return {
    ...batch,
    candidates: batch.candidates.flatMap((candidate) => {
      const candidateRef = createCandidateRef(
        batch.source,
        candidate.url || candidate.canonicalUrl || candidate.title,
      );
      const canonicalUrl = normalizeDocumentCanonicalUrl(candidate.canonicalUrl);
      if (canonicalUrl === null) {
        addIssue(diagnostics, {
          code: 'invalid-document-canonical-url',
          stage: 'validate',
          source: batch.source,
          candidateRef,
        });
        return [];
      }

      const validatedUrl = validateResultUrl(candidate.url);
      if (!validatedUrl.ok) {
        addIssue(diagnostics, {
          code: validatedUrl.code,
          stage: 'validate',
          source: batch.source,
          candidateRef,
        });
        return [];
      }

      const urlCanonical = normalizeDocumentCanonicalUrl(validatedUrl.url);
      if (urlCanonical === null || urlCanonical !== canonicalUrl) {
        addIssue(diagnostics, {
          code: 'invalid-document-canonical-url',
          stage: 'validate',
          source: batch.source,
          candidateRef,
        });
        return [];
      }

      return [
        {
          ...candidate,
          canonicalUrl,
          url: validatedUrl.url,
        },
      ];
    }),
  };
}

export function runCandidateValidationStage(
  input: SourceFederationStageOutput,
): CandidateValidationStageOutput {
  const batches = input.batches.map((batch) => validateBatch(batch, input.diagnostics));

  return {
    ...input,
    batches,
    activeBatches: batches.filter((batch) => batch.status === 'active'),
  };
}
