import type { SearchRequest } from './search-types.js';

export const LEXICAL_TIMEOUTS = Object.freeze({
  artifactFetch: 15000,
  workerInit: 30000,
  workerSearch: 30000,
  passageStore: 15000,
  lexicalRequestTotal: 45000,
  catalogFetch: 15000,
});
export const WORKER_FAILURE_KINDS = [
  'lexical-load-failed',
  'lexical-search-failed',
  'lexical-worker-failed',
  'lexical-timeout',
  'lexical-analyzer-unavailable',
] as const;
export type WorkerFailureKind = (typeof WORKER_FAILURE_KINDS)[number];
export interface LexicalSnippet {
  text: string;
  segments: { text: string; matched: boolean }[];
  startUtf16: number;
  endUtf16: number;
  codePoints: number;
  offsetPass: boolean;
}
export interface LexicalCandidate {
  id: string;
  canonicalPathname: string;
  title: string;
  date: string | null;
  tags: string[];
  description: string;
  snippet: LexicalSnippet | null;
  source: 'passage' | 'description' | 'none';
  bodyMatch: boolean;
  degraded: boolean;
  issues: 'lexical-snippet-unavailable'[];
  evidence: {
    fusionScore: number;
    rankingBestPassageId: string | null;
    snippetPassageId: string | null;
    exactTitle: boolean;
    titlePrefix: boolean;
  };
}
export interface LexicalResult {
  candidates: LexicalCandidate[];
  queryTokens: string[];
  traceSha256: string;
  metrics: Record<string, unknown>;
}
export interface LexicalContext {
  siteOrigin: string;
  basePath: string;
}
export interface IdentityHeader {
  protocolVersion: 1;
  generation: number;
  requestId: number;
  identity: string;
}
export type MainMessage = IdentityHeader &
  (
    | { type: 'init'; payload: { context: LexicalContext; manifestSha: string } }
    | { type: 'search'; payload: SearchRequest }
    | { type: 'cancel' | 'dispose'; payload: null }
  );
export type WorkerMessage = IdentityHeader &
  (
    | {
        type: 'ready';
        payload: { identity: string; initMs: number; wasmMemory: number; assets: unknown[] };
      }
    | { type: 'result'; payload: LexicalResult }
    | { type: 'failure'; payload: { kind: WorkerFailureKind; message: string } }
  );
export class LexicalFailure extends Error {
  constructor(
    readonly kind: WorkerFailureKind,
    readonly stage: 'fetch' | 'validate' | 'normalize' | 'rank',
    message: string,
  ) {
    super(message);
    this.name = 'LexicalFailure';
  }
}
export function protocolObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new LexicalFailure('lexical-worker-failed', 'validate', 'Protocol object');
  return Object.fromEntries(Object.entries(value));
}
function check(condition: unknown): asserts condition {
  if (!condition) throw new LexicalFailure('lexical-worker-failed', 'validate', 'Protocol payload');
}
function text(value: unknown): string {
  check(typeof value === 'string');
  return value;
}
function texts(value: unknown): string[] {
  check(Array.isArray(value));
  return value.map((item: unknown) => text(item));
}
function bool(value: unknown): boolean {
  check(typeof value === 'boolean');
  return value;
}
function number(value: unknown): number {
  check(typeof value === 'number' && Number.isFinite(value));
  return value;
}
function positive(value: unknown): number {
  const result = number(value);
  check(Number.isSafeInteger(result) && result > 0);
  return result;
}
function nullable(value: unknown): string | null {
  return value === null ? null : text(value);
}
function hash(value: unknown): string {
  const result = text(value);
  check(/^[a-f0-9]{64}$/u.test(result));
  return result;
}
export function parseHeader(value: unknown): IdentityHeader {
  const item = protocolObject(value);
  check(item['protocolVersion'] === 1);
  return {
    protocolVersion: 1,
    generation: positive(item['generation']),
    requestId: positive(item['requestId']),
    identity: hash(item['identity']),
  };
}
export function parseMainMessage(value: unknown): MainMessage {
  const header = parseHeader(value),
    item = protocolObject(value),
    type = item['type'];
  if (type === 'cancel' || type === 'dispose') {
    check(item['payload'] === null);
    return { ...header, type, payload: null };
  }
  const payload = protocolObject(item['payload']);
  if (type === 'init') {
    const context = protocolObject(payload['context']);
    return {
      ...header,
      type,
      payload: {
        context: { siteOrigin: text(context['siteOrigin']), basePath: text(context['basePath']) },
        manifestSha: hash(payload['manifestSha']),
      },
    };
  }
  check(type === 'search');
  const mode = payload['mode'],
    tagMode = payload['tagMode'],
    sort = payload['sort'];
  check(mode === 'navigate' || mode === 'explore');
  check(tagMode === 'and' || tagMode === 'or');
  check(sort === 'relevance' || sort === 'date-desc');
  return {
    ...header,
    type,
    payload: { q: text(payload['q']), mode, tagMode, sort, tags: texts(payload['tags']) },
  };
}
function snippet(value: unknown): LexicalSnippet | null {
  if (value === null) return null;
  const item = protocolObject(value);
  check(Array.isArray(item['segments']));
  const segments = item['segments'].map((entry: unknown) => {
    const segment = protocolObject(entry);
    return { text: text(segment['text']), matched: bool(segment['matched']) };
  });
  const result = {
    text: text(item['text']),
    segments,
    startUtf16: number(item['startUtf16']),
    endUtf16: number(item['endUtf16']),
    codePoints: number(item['codePoints']),
    offsetPass: bool(item['offsetPass']),
  };
  check(
    Number.isSafeInteger(result.startUtf16) &&
      result.startUtf16 >= 0 &&
      result.endUtf16 === result.startUtf16 + result.text.length &&
      result.codePoints === Array.from(result.text).length &&
      result.codePoints <= 240 &&
      result.offsetPass &&
      segments.map((segment) => segment.text).join('') === result.text,
  );
  return result;
}
export function parseWorkerMessage(value: unknown): WorkerMessage {
  const header = parseHeader(value),
    item = protocolObject(value),
    payload = protocolObject(item['payload']),
    type = item['type'];
  if (type === 'failure') {
    const kind = WORKER_FAILURE_KINDS.find((kind) => kind === payload['kind']);
    check(kind);
    const message = text(payload['message']);
    const stages =
      kind === 'lexical-load-failed' || kind === 'lexical-worker-failed'
        ? ['fetch', 'validate']
        : kind === 'lexical-analyzer-unavailable'
          ? ['normalize']
          : kind === 'lexical-search-failed'
            ? ['rank']
            : ['fetch'];
    check(stages.includes(message));
    return { ...header, type, payload: { kind, message } };
  }
  if (type === 'ready') {
    check(payload['identity'] === header.identity && Array.isArray(payload['assets']));
    return {
      ...header,
      type,
      payload: {
        identity: header.identity,
        initMs: number(payload['initMs']),
        wasmMemory: number(payload['wasmMemory']),
        assets: payload['assets'],
      },
    };
  }
  check(type === 'result' && Array.isArray(payload['candidates']));
  const candidates = payload['candidates'].map((entry: unknown): LexicalCandidate => {
    const candidate = protocolObject(entry),
      evidence = protocolObject(candidate['evidence']);
    const source = candidate['source'];
    check(source === 'passage' || source === 'description' || source === 'none');
    const issues = texts(candidate['issues']);
    check(issues.every((issue) => issue === 'lexical-snippet-unavailable'));
    const result: LexicalCandidate = {
      id: text(candidate['id']),
      canonicalPathname: text(candidate['canonicalPathname']),
      title: text(candidate['title']),
      date: nullable(candidate['date']),
      tags: texts(candidate['tags']),
      description: text(candidate['description']),
      snippet: snippet(candidate['snippet']),
      source,
      bodyMatch: bool(candidate['bodyMatch']),
      degraded: bool(candidate['degraded']),
      issues: issues.map(() => 'lexical-snippet-unavailable'),
      evidence: {
        fusionScore: number(evidence['fusionScore']),
        rankingBestPassageId: nullable(evidence['rankingBestPassageId']),
        snippetPassageId: nullable(evidence['snippetPassageId']),
        exactTitle: bool(evidence['exactTitle']),
        titlePrefix: bool(evidence['titlePrefix']),
      },
    };
    check(
      (source === 'passage') === result.bodyMatch &&
        (source === 'passage') === (result.evidence.snippetPassageId !== null),
    );
    check(result.id.length > 0 && result.evidence.fusionScore >= 0);
    check((source === 'none') === (result.snippet === null));
    check(
      !result.bodyMatch ||
        (result.evidence.rankingBestPassageId !== null &&
          result.snippet?.segments.some((segment) => segment.matched)),
    );
    check(result.degraded === (result.issues.length === 1) && result.issues.length <= 1);
    check(
      !result.degraded || (source !== 'passage' && result.evidence.rankingBestPassageId !== null),
    );
    return result;
  });
  check(new Set(candidates.map((candidate) => candidate.id)).size === candidates.length);
  check(
    new Set(candidates.map((candidate) => candidate.canonicalPathname)).size === candidates.length,
  );
  return {
    ...header,
    type,
    payload: {
      candidates,
      queryTokens: texts(payload['queryTokens']),
      traceSha256: hash(payload['traceSha256']),
      metrics: protocolObject(payload['metrics']),
    },
  };
}
