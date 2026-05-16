import type {
  SearchDiagnosticIssueCode,
  SearchDiagnosticStage,
  SearchDiagnosticSeverity,
  SearchSourceKind,
} from './search-types.js';
import { stripAsciiControlCharacters } from '../string/ascii-control.js';

export interface SearchDiagnosticIssue {
  readonly stage: SearchDiagnosticStage;
  readonly code: SearchDiagnosticIssueCode;
}

export interface SearchDiagnosticSink {
  readonly record: (issue: SearchDiagnosticIssue) => void;
  readonly read: () => readonly SearchDiagnosticIssue[];
}

export const createSearchDiagnosticSink = (): SearchDiagnosticSink => {
  const issues: SearchDiagnosticIssue[] = [];
  return { record: (issue) => issues.push(issue), read: () => [...issues] };
};

export type SearchArtifactDiagnosticSource = 'search-catalog-json' | 'static-explore-response-json';

export type SearchArtifactParseIssueCode =
  | 'invalid-json'
  | 'invalid-search-catalog-schema'
  | 'invalid-static-response-schema'
  | 'invalid-canonical-pathname'
  | 'allowlist-miss'
  | 'invalid-catalog-item';

export type SearchDiagnosticSummaryCode = 'search-json-dropped-items';

declare const SearchDiagnosticCandidateRefBrand: unique symbol;

export type SearchDiagnosticCandidateRef = string & {
  readonly [SearchDiagnosticCandidateRefBrand]: true;
};

export interface MutableSearchDiagnosticsTarget {
  issues: {
    code: SearchDiagnosticIssueCode;
    severity: SearchDiagnosticSeverity;
    stage: SearchDiagnosticStage;
    source?: SearchSourceKind;
    artifactSource?: SearchArtifactDiagnosticSource;
    candidateRef?: string;
    count: number;
  }[];
}

export interface SearchJsonParseDiagnosticSink {
  readonly addIssue: (issue: {
    readonly code: SearchArtifactParseIssueCode;
    readonly artifactSource: SearchArtifactDiagnosticSource;
    readonly candidateRef?: SearchDiagnosticCandidateRef;
  }) => void;
  readonly addSummary: (summary: {
    readonly code: SearchDiagnosticSummaryCode;
    readonly artifactSource: SearchArtifactDiagnosticSource;
    readonly droppedItemCount: number;
  }) => void;
}

const normalizeCandidateRef = (value: string): SearchDiagnosticCandidateRef | undefined => {
  const sanitized = stripAsciiControlCharacters(value).slice(0, 120);
  return sanitized.length > 0 ? (sanitized as SearchDiagnosticCandidateRef) : undefined;
};

export const createSearchDiagnosticCandidateRef = (
  value: string,
): SearchDiagnosticCandidateRef | undefined => normalizeCandidateRef(value);

const toSearchDiagnosticCode = (code: SearchArtifactParseIssueCode): SearchDiagnosticIssueCode => {
  switch (code) {
    case 'invalid-json':
    case 'invalid-search-catalog-schema':
    case 'invalid-static-response-schema':
    case 'invalid-canonical-pathname':
    case 'allowlist-miss':
    case 'invalid-catalog-item':
      return 'invalid-catalog-item';
  }
};

const addNormalizedIssue = (
  diagnostics: MutableSearchDiagnosticsTarget,
  issue: {
    readonly code: SearchDiagnosticIssueCode;
    readonly stage: SearchDiagnosticStage;
    readonly severity: SearchDiagnosticSeverity;
    readonly artifactSource?: SearchArtifactDiagnosticSource;
    readonly candidateRef?: string;
  },
): void => {
  const existing = diagnostics.issues.find(
    (candidate) =>
      candidate.code === issue.code &&
      candidate.stage === issue.stage &&
      candidate.source === undefined &&
      candidate.artifactSource === issue.artifactSource &&
      candidate.candidateRef === issue.candidateRef,
  );
  if (existing) {
    existing.count += 1;
    return;
  }

  diagnostics.issues.push({
    code: issue.code,
    severity: issue.severity,
    stage: issue.stage,
    ...(issue.artifactSource !== undefined ? { artifactSource: issue.artifactSource } : {}),
    ...(issue.candidateRef !== undefined ? { candidateRef: issue.candidateRef } : {}),
    count: 1,
  });
};

export const createSearchJsonParseDiagnosticSink = (
  diagnostics: MutableSearchDiagnosticsTarget,
): SearchJsonParseDiagnosticSink => ({
  addIssue(issue) {
    addNormalizedIssue(diagnostics, {
      code: toSearchDiagnosticCode(issue.code),
      severity: 'warn',
      stage: 'normalize',
      artifactSource: issue.artifactSource,
      ...(issue.candidateRef !== undefined ? { candidateRef: issue.candidateRef } : {}),
    });
  },
  addSummary(summary) {
    if (summary.droppedItemCount <= 0) {
      return;
    }
    addNormalizedIssue(diagnostics, {
      code: 'invalid-catalog-item',
      severity: 'warn',
      stage: 'normalize',
      artifactSource: summary.artifactSource,
      candidateRef: `${summary.artifactSource}:${summary.droppedItemCount.toString()}-dropped`,
    });
  },
});

export type SearchEventDiagnosticIssueCode =
  | 'search-event-invalid-schema'
  | 'search-event-invalid-canonical-pathname'
  | 'search-event-render-href-mismatch';

declare const SearchEventDiagnosticCandidateRefBrand: unique symbol;

export type SearchEventDiagnosticCandidateRef = string & {
  readonly [SearchEventDiagnosticCandidateRefBrand]: true;
};

export const createSearchEventDiagnosticCandidateRef = (
  value: string,
): SearchEventDiagnosticCandidateRef | null => {
  const sanitized = stripAsciiControlCharacters(value).slice(0, 120);
  return sanitized.length > 0 ? (sanitized as SearchEventDiagnosticCandidateRef) : null;
};

export interface SearchEventDiagnosticIssue {
  readonly code: SearchEventDiagnosticIssueCode;
  readonly stage: 'event';
  readonly candidateRef?: SearchEventDiagnosticCandidateRef;
}

export interface SearchEventDiagnosticsSnapshot {
  readonly issues: readonly SearchEventDiagnosticIssue[];
}

export interface SearchEventDiagnosticSink {
  readonly addIssue: (issue: SearchEventDiagnosticIssue) => void;
  readonly snapshot: () => SearchEventDiagnosticsSnapshot;
  readonly clear: () => void;
}

export const createSearchEventDiagnosticSink = (): SearchEventDiagnosticSink => {
  const issues: SearchEventDiagnosticIssue[] = [];
  return {
    addIssue(issue) {
      issues.push(issue);
    },
    snapshot() {
      return { issues: [...issues] };
    },
    clear() {
      issues.length = 0;
    },
  };
};

export const defaultSearchEventDiagnosticSink: SearchEventDiagnosticSink =
  createSearchEventDiagnosticSink();
