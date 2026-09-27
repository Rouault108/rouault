import { addIssue, createCandidateRef } from '../../diagnostics.js';
import { normalizeSearchCanonicalPathname } from '../../../../shared/search/document-url.js';
import type { CatalogBatch } from '../../../../shared/search/search-types.js';
import type { CandidateValidationStageOutput, CatalogLoadStageOutput } from '../stage-types.js';

function validateBatch(
  batch: CatalogBatch,
  diagnostics: CatalogLoadStageOutput['diagnostics'],
): CatalogBatch {
  if (batch.status !== 'active') {
    return batch;
  }

  return {
    ...batch,
    candidates: batch.candidates.flatMap((candidate) => {
      const candidateRef = createCandidateRef(
        batch.source,
        candidate.canonicalPathname || candidate.title,
      );
      const canonicalPathname = normalizeSearchCanonicalPathname(candidate.canonicalPathname);
      if (canonicalPathname === null) {
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
          canonicalPathname,
        },
      ];
    }),
  };
}

export function runCandidateValidationStage(
  input: CatalogLoadStageOutput,
): CandidateValidationStageOutput {
  const batches = input.batches.map((batch) => validateBatch(batch, input.diagnostics));

  return {
    ...input,
    batches,
    activeBatches: batches.filter((batch) => batch.status === 'active'),
  };
}
