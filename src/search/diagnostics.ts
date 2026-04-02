import type {
  SearchDiagnosticIssue,
  SearchDiagnosticIssueCode,
  SearchDiagnosticSeverity,
  SearchDiagnosticStage,
  SearchDiagnostics,
  SearchFailureKind,
  SearchSourceBatch,
  SearchSourceKind,
} from '../../shared/search/search-types.js';

const STAGE_ORDER: SearchDiagnosticStage[] = [
  'fetch',
  'normalize',
  'validate',
  'merge',
  'rank',
  'filter',
  'navigate',
];

const SEVERITY_ORDER: SearchDiagnosticSeverity[] = ['error', 'warn', 'info'];

const SOURCE_ORDER: SearchSourceKind[] = ['pagefind', 'catalog'];

export interface MutableDiagnostics {
  failures: SearchFailureKind[];
  issues: SearchDiagnosticIssue[];
}

export interface SearchIssueInput {
  code: SearchDiagnosticIssueCode;
  stage: SearchDiagnosticStage;
  source?: SearchSourceKind;
  candidateRef?: string;
}

function issueSeverity(code: SearchDiagnosticIssueCode): SearchDiagnosticSeverity {
  switch (code) {
    case 'invalid-catalog-item':
    case 'source-degraded':
      return 'warn';
    default:
      return 'error';
  }
}

function compareIssues(left: SearchDiagnosticIssue, right: SearchDiagnosticIssue): number {
  const severityOrder =
    SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);
  if (severityOrder !== 0) {
    return severityOrder;
  }

  const stageOrder = STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage);
  if (stageOrder !== 0) {
    return stageOrder;
  }

  const codeOrder = left.code.localeCompare(right.code, 'ja');
  if (codeOrder !== 0) {
    return codeOrder;
  }

  const leftSourceOrder =
    left.source === undefined ? SOURCE_ORDER.length : SOURCE_ORDER.indexOf(left.source);
  const rightSourceOrder =
    right.source === undefined ? SOURCE_ORDER.length : SOURCE_ORDER.indexOf(right.source);
  if (leftSourceOrder !== rightSourceOrder) {
    return leftSourceOrder - rightSourceOrder;
  }

  return (left.candidateRef ?? '~').localeCompare(right.candidateRef ?? '~', 'ja');
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `c${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createCandidateRef(source: SearchSourceKind, stableInput: string): string {
  return hashString(`${source}:${stableInput}`);
}

export function createDiagnostics(): MutableDiagnostics {
  return {
    failures: [],
    issues: [],
  };
}

export function addFailure(diagnostics: MutableDiagnostics, failure: SearchFailureKind): void {
  if (!diagnostics.failures.includes(failure)) {
    diagnostics.failures.push(failure);
  }
}

export function addIssue(diagnostics: MutableDiagnostics, issue: SearchIssueInput): void {
  const existing = diagnostics.issues.find(
    (candidate) =>
      candidate.code === issue.code &&
      candidate.stage === issue.stage &&
      candidate.source === issue.source &&
      candidate.candidateRef === issue.candidateRef,
  );

  if (existing) {
    existing.count += 1;
    return;
  }

  diagnostics.issues.push({
    code: issue.code,
    severity: issueSeverity(issue.code),
    stage: issue.stage,
    ...(issue.source !== undefined ? { source: issue.source } : {}),
    ...(issue.candidateRef !== undefined ? { candidateRef: issue.candidateRef } : {}),
    count: 1,
  });

  diagnostics.issues = diagnostics.issues.sort(compareIssues).slice(0, 100);
}

export function finalizeDiagnostics(
  diagnostics: MutableDiagnostics,
  batches: readonly SearchSourceBatch[],
): SearchDiagnostics {
  const activeSources = SOURCE_ORDER.filter((source) =>
    batches.some((batch) => batch.source === source && batch.status === 'active'),
  );
  const issues = [...diagnostics.issues].sort(compareIssues).slice(0, 100);
  const degraded =
    diagnostics.failures.length > 0 ||
    issues.some(
      (issue) =>
        issue.code === 'source-degraded' &&
        issue.source !== undefined &&
        activeSources.includes(issue.source),
    );

  return {
    degraded,
    activeSources,
    failures: [...diagnostics.failures],
    issues,
  };
}
