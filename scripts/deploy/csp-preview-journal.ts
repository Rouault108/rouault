import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { previewDigest } from '../../build/security/csp-preview-artifact.js';
import { deliveryRecord, exactDeliveryFields } from './csp-preview-authority.js';
import {
  parsePreviewAttempt,
  PREVIEW_UUID,
  type PreviewAttempt,
} from './csp-preview-transaction.js';

export const PREVIEW_JOURNAL_BUCKET = 'rouault-csp-preview-journal';
export const PREVIEW_JOURNAL_KEY = 'csp-preview/rouault/csp-verify/journal-v1.json';
const MAX_BYTES = 8 * 1024 * 1024;
export interface PreviewCasStore {
  load: () => Promise<{ bytes: Buffer; etag: string } | null>;
  put: (bytes: Buffer, etag: string | null) => Promise<{ etag: string }>;
}
export class PreviewCasConflict extends Error {
  override name = 'PreviewCasConflict';
}
export class PreviewCasUncertain extends Error {
  override name = 'PreviewCasUncertain';
}
export interface PreviewJournalEvent {
  sequence: number;
  previousDigest: string;
  attempt: PreviewAttempt;
  digest: string;
}
export interface PreviewJournal {
  schema: 1;
  generation: string;
  events: PreviewJournalEvent[];
  headDigest: string;
}
const genesis = (generation: string): string =>
  previewDigest(`rouault-preview-journal-v1:${generation}`);
const serialize = (value: unknown): Buffer => Buffer.from(JSON.stringify(value));
const eventDigest = (sequence: number, previousDigest: string, attempt: PreviewAttempt): string =>
  previewDigest(JSON.stringify({ sequence, previousDigest, attempt }));
const sameIdentity = (a: PreviewAttempt, b: PreviewAttempt): boolean =>
  [
    'schema',
    'approvalId',
    'recoveryFrom',
    'mode',
    'sourceSha',
    'payloadDigest',
    'packetDigest',
    'accountId',
    'runId',
    'runAttempt',
    'workflowSha',
    'attemptId',
    'before',
  ].every(
    (key) => JSON.stringify(deliveryRecord(a)[key]) === JSON.stringify(deliveryRecord(b)[key]),
  );
const transition = (before: PreviewAttempt, after: PreviewAttempt): void => {
  const allowed: Record<PreviewAttempt['status'], readonly PreviewAttempt['status'][]> = {
    reserved: ['upload-started', 'uncertain'],
    'upload-started': ['deployed-unverified', 'uncertain'],
    'deployed-unverified': ['verified', 'failed-confirmed', 'uncertain'],
    uncertain: ['verified', 'failed-confirmed', 'uncertain'],
    'failed-confirmed': ['verified', 'failed-confirmed', 'uncertain'],
    verified: [],
  };
  if (
    !sameIdentity(before, after) ||
    before.status === 'verified' ||
    !allowed[before.status].includes(after.status) ||
    (before.uploadStartedAt !== null && after.uploadStartedAt !== before.uploadStartedAt) ||
    (before.deploymentId !== null && after.deploymentId !== before.deploymentId) ||
    (before.confirmation !== null &&
      JSON.stringify(before.confirmation) !== JSON.stringify(after.confirmation)) ||
    (before.operationStatus === 'confirmed' && after.operationStatus !== 'confirmed') ||
    after.status === 'reserved' ||
    (before.status !== 'reserved' && after.uploadStartedAt === null)
  )
    throw new Error('[preview-delivery] journal identity/state regression');
};

const assertReservation = (latest: Map<string, PreviewAttempt>, attempt: PreviewAttempt): void => {
  if (attempt.status !== 'reserved')
    throw new Error('[preview-delivery] unreserved journal attempt');
  const covered = new Set(
    [...latest.values()].flatMap((value) =>
      value.recoveryFrom ? [value.recoveryFrom.approvalId] : [],
    ),
  );
  const active = [...latest.values()].filter(
    (value) => !covered.has(value.approvalId) && value.status !== 'verified',
  );
  const reference = attempt.recoveryFrom;
  if (!reference) {
    if (active.length)
      throw new Error('[preview-delivery] unresolved attempt requires explicit recovery authority');
    return;
  }
  const prior = active[0];
  if (
    active.length !== 1 ||
    prior?.status !== 'failed-confirmed' ||
    prior.operationStatus !== 'confirmed' ||
    !prior.confirmation ||
    !prior.deploymentId ||
    !['http-differs', 'http-unavailable'].includes(prior.verificationFailure ?? '') ||
    attempt.accountId !== prior.accountId ||
    attempt.mode !== 'baseline' ||
    prior.approvalId !== reference.approvalId ||
    prior.attemptId !== reference.attemptId ||
    prior.deploymentId !== reference.deploymentId ||
    !attempt.before.ids.includes(prior.deploymentId) ||
    Date.parse(attempt.before.observedAt) < Date.parse(prior.confirmation.observedAt)
  )
    throw new Error('[preview-delivery] baseline recovery identity/confirmation mismatch');
};

export const parsePreviewJournal = (bytes: Buffer, generation: string): PreviewJournal => {
  if (bytes.length > MAX_BYTES || !PREVIEW_UUID.test(generation))
    throw new Error('[preview-delivery] journal bound/generation');
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('[preview-delivery] corrupt journal');
  }
  const row = deliveryRecord(raw);
  exactDeliveryFields(row, ['schema', 'generation', 'events', 'headDigest']);
  if (
    row['schema'] !== 1 ||
    row['generation'] !== generation ||
    !Array.isArray(row['events']) ||
    row['events'].length > 5000
  )
    throw new Error('[preview-delivery] incomplete journal schema');
  let previous = genesis(generation);
  const latest = new Map<string, PreviewAttempt>();
  const events = row['events'].map((value: unknown, index: number): PreviewJournalEvent => {
    const event = deliveryRecord(value);
    exactDeliveryFields(event, ['sequence', 'previousDigest', 'attempt', 'digest']);
    const attempt = parsePreviewAttempt(event['attempt']);
    if (
      event['sequence'] !== index + 1 ||
      event['previousDigest'] !== previous ||
      event['digest'] !== eventDigest(index + 1, previous, attempt)
    )
      throw new Error('[preview-delivery] missing/corrupt journal event');
    const before = latest.get(attempt.approvalId);
    if (before) transition(before, attempt);
    else assertReservation(latest, attempt);
    latest.set(attempt.approvalId, attempt);
    previous = event['digest'];
    return {
      sequence: index + 1,
      previousDigest: event['previousDigest'],
      attempt,
      digest: previous,
    };
  });
  if (row['headDigest'] !== previous)
    throw new Error('[preview-delivery] truncated journal history');
  return { schema: 1, generation, events, headDigest: previous };
};

export class PreviewJournalAdapter {
  constructor(
    private readonly store: PreviewCasStore,
    private readonly generation: string,
  ) {
    if (!PREVIEW_UUID.test(generation))
      throw new Error('[preview-delivery] invalid journal generation');
  }
  async read(): Promise<{ journal: PreviewJournal; etag: string }> {
    const value = await this.store.load();
    if (!value)
      throw new Error('[preview-delivery] missing durable journal; never reset automatically');
    return { journal: parsePreviewJournal(value.bytes, this.generation), etag: value.etag };
  }
  async initialize(): Promise<void> {
    // bootstrapは別承認の明示操作だけ。reserveから自動作成・再作成しない。
    const journal: PreviewJournal = {
      schema: 1,
      generation: this.generation,
      events: [],
      headDigest: genesis(this.generation),
    };
    await this.store.put(serialize(journal), null);
  }
  async history(): Promise<{ complete: true; attemptedApprovalIds: string[] }> {
    const { journal } = await this.read();
    return {
      complete: true,
      attemptedApprovalIds: [...new Set(journal.events.map((e) => e.attempt.approvalId))],
    };
  }
  async attempt(approvalId: string): Promise<PreviewAttempt> {
    const { journal } = await this.read();
    const attempt = journal.events
      .filter((e) => e.attempt.approvalId === approvalId)
      .at(-1)?.attempt;
    if (!attempt) throw new Error('[preview-delivery] attempt not recorded');
    return attempt;
  }
  async append(input: PreviewAttempt, reserve: boolean): Promise<void> {
    const attempt = parsePreviewAttempt(input);
    for (let retry = 0; retry < 3; retry++) {
      const { journal, etag } = await this.read(),
        existing = journal.events
          .filter((e) => e.attempt.approvalId === attempt.approvalId)
          .at(-1)?.attempt;
      if (reserve ? existing !== undefined : existing === undefined)
        throw new Error('[preview-delivery] duplicate/missing reservation');
      if (existing && JSON.stringify(existing) === JSON.stringify(attempt)) return;
      if (existing) transition(existing, attempt);
      const event = {
        sequence: journal.events.length + 1,
        previousDigest: journal.headDigest,
        attempt,
        digest: eventDigest(journal.events.length + 1, journal.headDigest, attempt),
      };
      const next: PreviewJournal = {
        ...journal,
        events: [...journal.events, event],
        headDigest: event.digest,
      };
      const bytes = serialize(next);
      parsePreviewJournal(bytes, this.generation);
      try {
        await this.store.put(bytes, etag);
        return;
      } catch (error) {
        // write応答が失われた場合はGETで自分のeventを照合し、PUTを盲目的に再送しない。
        if (error instanceof PreviewCasUncertain) {
          const current = await this.read();
          if (current.journal.events.some((e) => e.digest === event.digest)) return;
          throw error;
        }
        if (!(error instanceof PreviewCasConflict)) throw error;
      }
    }
    throw new Error('[preview-delivery] reservation contention limit');
  }
  reserve = (attempt: PreviewAttempt): Promise<void> => this.append(attempt, true);
  persist = (attempt: PreviewAttempt): Promise<void> => this.append(attempt, false);
}

export type PreviewS3Send = (command: GetObjectCommand | PutObjectCommand) => Promise<unknown>;
const etag = (value: unknown): string => {
  if (typeof value !== 'string' || !/^"[a-f0-9]{32}(?:-[0-9]+)?"$/u.test(value))
    throw new Error('[preview-delivery] invalid journal ETag');
  return value;
};
const bodyBytes = async (body: unknown): Promise<Buffer> => {
  if (!(body instanceof Readable)) throw new Error('[preview-delivery] unsupported journal stream');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const value of body) {
    const chunk: unknown = value;
    if (!(chunk instanceof Uint8Array)) {
      body.destroy();
      throw new Error('[preview-delivery] invalid journal stream');
    }
    size += chunk.length;
    if (size > MAX_BYTES) {
      body.destroy();
      throw new Error('[preview-delivery] journal byte limit');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
export const createPreviewS3CasStore = (send: PreviewS3Send): PreviewCasStore => ({
  async load() {
    try {
      const value = deliveryRecord(
        await send(
          new GetObjectCommand({ Bucket: PREVIEW_JOURNAL_BUCKET, Key: PREVIEW_JOURNAL_KEY }),
        ),
      );
      if (
        typeof value['ContentLength'] !== 'number' ||
        value['ContentLength'] > MAX_BYTES ||
        value['ContentLength'] < 0
      )
        throw new Error('[preview-delivery] journal content length');
      const bytes = await bodyBytes(value['Body']);
      if (bytes.length !== value['ContentLength'])
        throw new Error('[preview-delivery] truncated journal object');
      return { bytes, etag: etag(value['ETag']) };
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') return null;
      throw new Error('[preview-delivery] journal read unavailable', { cause: error });
    }
  },
  async put(bytes, expected) {
    if (bytes.length > MAX_BYTES) throw new Error('[preview-delivery] journal byte limit');
    try {
      const result = deliveryRecord(
        await send(
          new PutObjectCommand({
            Bucket: PREVIEW_JOURNAL_BUCKET,
            Key: PREVIEW_JOURNAL_KEY,
            Body: bytes,
            ContentType: 'application/json',
            CacheControl: 'no-store',
            ...(expected === null ? { IfNoneMatch: '*' } : { IfMatch: etag(expected) }),
          }),
        ),
      );
      return { etag: etag(result['ETag']) };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'PreconditionFailed' || error.name === 'ConditionalRequestConflict')
      )
        throw new PreviewCasConflict('[preview-delivery] journal CAS conflict');
      throw new PreviewCasUncertain('[preview-delivery] journal write outcome unknown');
    }
  },
});

export const createPreviewR2JournalStore = (
  accountId: string,
  credentials: { accessKeyId: string; secretAccessKey: string },
): PreviewCasStore => {
  if (
    !/^[a-f0-9]{32}$/u.test(accountId) ||
    !credentials.accessKeyId ||
    !credentials.secretAccessKey
  )
    throw new Error('[preview-delivery] dedicated journal binding unavailable');
  const client = new S3Client({
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
    credentials,
    maxAttempts: 1,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return createPreviewS3CasStore(async (command) =>
    command instanceof GetObjectCommand
      ? client.send(command, { abortSignal: AbortSignal.timeout(20000) })
      : client.send(command, { abortSignal: AbortSignal.timeout(20000) }),
  );
};
