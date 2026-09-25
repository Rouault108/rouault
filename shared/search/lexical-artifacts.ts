import { normalizeSearchCanonicalPathname, type SearchCanonicalPathname } from './document-url.js';
import { PROVIDER_WASM_SHA256 } from './lexical-provider-config.js';

export const LEXICAL_COMPATIBILITY = Object.freeze({
  schemaVersion: 2,
  engine: 'minisearch',
  engineVersion: '7.2.0',
  indexOptionsId: 'rouault-minisearch-index-v1',
  indexOptionsSha256: 'efbd55a37c821e08f909e24171d28c43cd675bb1193ba3d71a5cd8cc52080392',
  analyzerPolicyId: 'rouault-lexical-v3',
  rankingProfileId: 'rouault-search-v3',
  exactRulesSha256: '3465a99ea725e96139ba685f60789995d4a040307e58a6f0631a6725d9ac4c38',
  providerVersion: '0.9.11',
  providerConfigSha256: 'ba6712f0da9761f52471c630d80c4c53b001481fc835591d799e48404a0dbf57',
  providerArtifactSha256: PROVIDER_WASM_SHA256,
} as const);

export const DOCUMENT_INDEX_FIELDS = [
  'titleWord',
  'titleGram',
  'descriptionWord',
  'descriptionGram',
  'bodyWord',
  'bodyGram',
  'pathWord',
  'keywordWord',
  'tagWord',
] as const;
export const PASSAGE_INDEX_FIELDS = [
  'passageWord',
  'passageGram',
  'currentHeadingWord',
  'currentHeadingGram',
  'ancestorHeadingWord',
  'ancestorHeadingGram',
] as const;
export function lexicalIndexOptions(kind: 'document' | 'passage') {
  return {
    idField: 'id',
    storeFields: [],
    fields: [...(kind === 'document' ? DOCUMENT_INDEX_FIELDS : PASSAGE_INDEX_FIELDS)],
    tokenize: (value: string): string[] => (value === '' ? [] : value.split('\u001f')),
    processTerm: (term: string): string => term,
  };
}

export interface ArtifactDescriptor {
  path: string;
  sha256: string;
  bytes: number;
}
export interface LexicalManifest extends Readonly<typeof LEXICAL_COMPATIBILITY> {
  buildId: string;
  documentIndexSha256: string;
  passageIndexSha256: string;
  passageStoreSha256: string;
  documentIndex: ArtifactDescriptor;
  passageIndex: ArtifactDescriptor;
  passageStore: ArtifactDescriptor;
  providerArtifact: ArtifactDescriptor;
  providerConfig: ArtifactDescriptor;
}
export interface DocumentMetadata {
  id: string;
  canonicalPathname: SearchCanonicalPathname;
  title: string;
  description: string;
  pathLabel: string;
  keywords: string[];
  tags: string[];
  date: string;
}
export interface PassageMetadata {
  id: string;
  documentId: string;
  canonicalPathname: SearchCanonicalPathname;
  order: number;
  headingPath: string[];
  currentHeading: string;
  ancestorHeading: string;
  anchorId: string | null;
}
interface IndexEnvelope {
  schemaVersion: 2;
  serializedIndex: string;
  indexSha256: string;
}
export interface DocumentEnvelope extends IndexEnvelope {
  kind: 'document';
  documents: DocumentMetadata[];
}
export interface PassageEnvelope extends IndexEnvelope {
  kind: 'passage';
  passages: PassageMetadata[];
}
export interface PassageStore {
  schemaVersion: 2;
  kind: 'store';
  passages: { id: string; text: string }[];
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Lexical artifact: ${message}`);
}
function object(value: unknown): Record<string, unknown> {
  requireCondition(value !== null && typeof value === 'object' && !Array.isArray(value), 'object');
  return Object.fromEntries(Object.entries(value));
}
function string(value: unknown): string {
  requireCondition(typeof value === 'string', 'string');
  return value;
}
function strings(value: unknown): string[] {
  requireCondition(Array.isArray(value), 'string array');
  return value.map((item: unknown) => string(item));
}
function array(value: unknown): unknown[] {
  requireCondition(Array.isArray(value), 'array');
  return value;
}
function integer(value: unknown): number {
  requireCondition(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
    'nonnegative integer',
  );
  return value;
}
function digest(value: unknown): string {
  const result = string(value);
  requireCondition(/^[a-f0-9]{64}$/u.test(result), 'sha256');
  return result;
}
function canonical(value: unknown): SearchCanonicalPathname {
  const result = normalizeSearchCanonicalPathname(string(value));
  requireCondition(result !== null && result === value, 'canonical pathname');
  return result;
}
function unique(values: readonly string[]): void {
  requireCondition(new Set(values).size === values.length, 'duplicate identity');
}
export function artifactPath(value: unknown): string {
  const result = string(value);
  requireCondition(
    result.startsWith('/search/') &&
      !/[?#\\\s%]/u.test(result) &&
      !result
        .slice(1)
        .split('/')
        .some((segment) => !segment || segment === '.' || segment === '..'),
    'artifact path',
  );
  return result;
}
function descriptor(value: unknown, expected: string): ArtifactDescriptor {
  const item = object(value),
    sha256 = digest(item['sha256']),
    bytes = integer(item['bytes']);
  requireCondition(sha256 === expected && bytes > 0, 'descriptor identity');
  return { path: artifactPath(item['path']), sha256, bytes };
}
export function parseLexicalManifest(value: unknown): LexicalManifest {
  const item = object(value);
  for (const [key, expected] of Object.entries(LEXICAL_COMPATIBILITY))
    requireCondition(item[key] === expected, `compatibility ${key}`);
  const buildId = string(item['buildId']);
  requireCondition(buildId.trim().length > 0, 'buildId');
  const documentIndexSha256 = digest(item['documentIndexSha256']),
    passageIndexSha256 = digest(item['passageIndexSha256']),
    passageStoreSha256 = digest(item['passageStoreSha256']);
  return {
    ...LEXICAL_COMPATIBILITY,
    buildId,
    documentIndexSha256,
    passageIndexSha256,
    passageStoreSha256,
    documentIndex: descriptor(item['documentIndex'], documentIndexSha256),
    passageIndex: descriptor(item['passageIndex'], passageIndexSha256),
    passageStore: descriptor(item['passageStore'], passageStoreSha256),
    providerArtifact: descriptor(item['providerArtifact'], PROVIDER_WASM_SHA256),
    providerConfig: descriptor(item['providerConfig'], LEXICAL_COMPATIBILITY.providerConfigSha256),
  };
}
export async function sha256(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
}
export async function verifyArtifact(
  bytes: Uint8Array,
  expected: ArtifactDescriptor,
): Promise<void> {
  requireCondition(
    bytes.byteLength === expected.bytes && (await sha256(bytes)) === expected.sha256,
    'artifact bytes/hash',
  );
}
export function decodeArtifact(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function parseIndex(
  value: unknown,
  kind: 'document' | 'passage',
  ids: readonly string[],
): Promise<IndexEnvelope> {
  const item = object(value);
  requireCondition(item['schemaVersion'] === 2 && item['kind'] === kind, 'index envelope');
  const serializedIndex = string(item['serializedIndex']),
    indexSha256 = digest(item['indexSha256']);
  requireCondition(
    (await sha256(new TextEncoder().encode(serializedIndex))) === indexSha256,
    'inner index hash',
  );
  const index = object(JSON.parse(serializedIndex));
  requireCondition(
    index['serializationVersion'] === 2 && index['documentCount'] === ids.length,
    'index version/count',
  );
  const actualIds = Object.values(object(index['documentIds'])).map(string);
  unique(ids);
  unique(actualIds);
  requireCondition(
    JSON.stringify([...ids].sort()) === JSON.stringify(actualIds.sort()),
    'index metadata references',
  );
  const fields = object(index['fieldIds']);
  const expectedFields = kind === 'document' ? DOCUMENT_INDEX_FIELDS : PASSAGE_INDEX_FIELDS;
  requireCondition(
    Object.keys(fields).length === expectedFields.length &&
      expectedFields.every((field, i) => fields[field] === i),
    'index fields',
  );
  return { schemaVersion: 2, serializedIndex, indexSha256 };
}
export async function parseDocumentEnvelope(value: unknown): Promise<DocumentEnvelope> {
  const item = object(value);
  const documents = array(item['documents']).map((entry): DocumentMetadata => {
    const doc = object(entry);
    requireCondition(!('body' in doc), 'body belongs outside metadata');
    const id = string(doc['id']),
      title = string(doc['title']);
    requireCondition(id.length > 0 && title.trim().length > 0, 'document identity/title');
    return {
      id,
      canonicalPathname: canonical(doc['canonicalPathname']),
      title,
      description: string(doc['description']),
      pathLabel: string(doc['pathLabel']),
      keywords: strings(doc['keywords']),
      tags: strings(doc['tags']),
      date: string(doc['date']),
    };
  });
  unique(documents.map((doc) => doc.canonicalPathname));
  return {
    ...(await parseIndex(
      value,
      'document',
      documents.map((doc) => doc.id),
    )),
    kind: 'document',
    documents,
  };
}
export async function parsePassageEnvelope(
  value: unknown,
  documents: readonly DocumentMetadata[],
): Promise<PassageEnvelope> {
  const item = object(value),
    byId = new Map(documents.map((doc) => [doc.id, doc]));
  const passages = array(item['passages']).map((entry): PassageMetadata => {
    const passage = object(entry);
    requireCondition(!('text' in passage), 'text belongs in passage store');
    const id = string(passage['id']),
      documentId = string(passage['documentId']),
      canonicalPathname = canonical(passage['canonicalPathname']);
    const order = integer(passage['order']),
      headingPath = strings(passage['headingPath']);
    const anchorId = passage['anchorId'] === null ? null : string(passage['anchorId']);
    requireCondition(
      byId.get(documentId)?.canonicalPathname === canonicalPathname &&
        id === JSON.stringify([canonicalPathname, order]),
      'passage reference',
    );
    const currentHeading = string(passage['currentHeading']),
      ancestorHeading = string(passage['ancestorHeading']);
    requireCondition(
      currentHeading === (headingPath.at(-1) ?? '') &&
        ancestorHeading === headingPath.slice(0, -1).join(' '),
      'heading fields',
    );
    return {
      id,
      documentId,
      canonicalPathname,
      order,
      headingPath,
      anchorId,
      currentHeading,
      ancestorHeading,
    };
  });
  const nextOrder = new Map<string, number>();
  for (const passage of passages) {
    requireCondition(passage.order === (nextOrder.get(passage.documentId) ?? 0), 'passage order');
    nextOrder.set(passage.documentId, passage.order + 1);
  }
  return {
    ...(await parseIndex(
      value,
      'passage',
      passages.map((passage) => passage.id),
    )),
    kind: 'passage',
    passages,
  };
}
export function parsePassageStore(
  value: unknown,
  expected: readonly PassageMetadata[],
): PassageStore {
  const item = object(value);
  requireCondition(item['schemaVersion'] === 2 && item['kind'] === 'store', 'store envelope');
  const passages = array(item['passages']).map((entry) => {
    const passage = object(entry),
      text = string(passage['text']);
    requireCondition(
      text.trim().length > 0 && Array.from(text).length <= 800,
      'passage text bounds',
    );
    return { id: string(passage['id']), text };
  });
  unique(passages.map((passage) => passage.id));
  requireCondition(
    JSON.stringify(passages.map((passage) => passage.id).sort()) ===
      JSON.stringify(expected.map((passage) => passage.id).sort()),
    'store references',
  );
  return { schemaVersion: 2, kind: 'store', passages };
}
