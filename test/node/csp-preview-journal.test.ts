import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { S3Client } from '@aws-sdk/client-s3';
import {
  PreviewJournalAdapter,
  PreviewCasConflict,
  PreviewCasUncertain,
  parsePreviewJournal,
  createPreviewS3CasStore,
  PREVIEW_JOURNAL_BUCKET,
  PREVIEW_JOURNAL_KEY,
} from '../../scripts/deploy/csp-preview-journal.js';
import { makeAttempt, memoryJournal } from './helpers/csp-preview-adapter-fixture.js';
import { deployment } from './helpers/csp-preview-delivery-fixture.js';
const generation = '11111111-2222-3333-4444-555555555555';
const started = () => ({
  ...makeAttempt(),
  uploadStartedAt: '2026-11-02T00:00:01.500Z',
  status: 'upload-started' as const,
  operationStatus: 'unknown' as const,
});

describe('durable preview conditional journal', () => {
  it('requires explicit bootstrap; reserves before upload and retains complete history', async () => {
    const memory = memoryJournal(),
      journal = new PreviewJournalAdapter(memory.store, generation);
    await expect(journal.reserve(makeAttempt())).rejects.toThrow('missing');
    expect(memory.writes).toBe(0);
    await journal.initialize();
    await journal.reserve(makeAttempt());
    await journal.persist(started());
    await journal.persist({
      ...started(),
      status: 'verified',
      confirmation: {
        createdAt: '2026-11-02T00:00:02.000Z',
        observedAt: '2026-11-02T00:00:03.000Z',
      },
      operationStatus: 'confirmed',
      contentStatus: 'matches',
      deploymentId: deployment().id,
    });
    expect((await journal.read()).journal.events.map((e) => e.attempt.status)).toEqual([
      'reserved',
      'upload-started',
      'verified',
    ]);
    expect((await journal.history()).attemptedApprovalIds).toEqual(['review-1']);
    await expect(journal.initialize()).rejects.toBeInstanceOf(PreviewCasConflict);
    await expect(journal.reserve(makeAttempt())).rejects.toThrow('duplicate');
  });
  it.each([false, true])(
    'atomically rejects concurrent duplicate/global reservations (same approval %s)',
    async (same) => {
      const memory = memoryJournal(),
        a = new PreviewJournalAdapter(memory.store, generation),
        b = new PreviewJournalAdapter(memory.store, generation);
      await a.initialize();
      const results = await Promise.allSettled([
        a.reserve(makeAttempt()),
        b.reserve({
          ...makeAttempt(),
          approvalId: same ? 'review-1' : 'review-2',
          attemptId: '201.1.bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
        }),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect((await a.read()).journal.events).toHaveLength(1);
    },
  );
  it('resolves lost write response by readback without a second PUT', async () => {
    const memory = memoryJournal(),
      journal = new PreviewJournalAdapter(memory.store, generation);
    await journal.initialize();
    let puts = 0;
    const lost = new PreviewJournalAdapter(
      {
        ...memory.store,
        put: async (bytes, tag) => {
          puts++;
          await memory.store.put(bytes, tag);
          throw new PreviewCasUncertain();
        },
      },
      generation,
    );
    await lost.reserve(makeAttempt());
    expect(puts).toBe(1);
    expect((await journal.read()).journal.events).toHaveLength(1);
  });
  it('keeps uncommitted unknown writes uncertain instead of retrying', async () => {
    const memory = memoryJournal(),
      journal = new PreviewJournalAdapter(memory.store, generation);
    await journal.initialize();
    let puts = 0;
    const lost = new PreviewJournalAdapter(
      {
        ...memory.store,
        put: async () => {
          puts++;
          throw new PreviewCasUncertain();
        },
      },
      generation,
    );
    await expect(lost.reserve(makeAttempt())).rejects.toBeInstanceOf(PreviewCasUncertain);
    expect(puts).toBe(1);
    expect((await journal.read()).journal.events).toHaveLength(0);
  });
  it.each(['generation', 'truncate', 'hash', 'identity', 'malformed'])(
    'rejects corrupt %s history without reset',
    async (mode) => {
      const memory = memoryJournal(),
        journal = new PreviewJournalAdapter(memory.store, generation);
      await journal.initialize();
      await journal.reserve(makeAttempt());
      await journal.persist(started());
      const bytes = memory.value?.bytes;
      if (!bytes) throw new Error('fixture');
      const value = parsePreviewJournal(bytes, generation);
      if (mode === 'generation') value.generation = 'aaaaaaaa-2222-3333-4444-555555555555';
      if (mode === 'truncate') value.events.pop();
      if (mode === 'hash') value.headDigest = '0'.repeat(64);
      if (mode === 'identity' && value.events[0])
        value.events[0].attempt.sourceSha = '0'.repeat(40);
      expect(() =>
        parsePreviewJournal(
          mode === 'malformed' ? Buffer.from('{') : Buffer.from(JSON.stringify(value)),
          generation,
        ),
      ).toThrow();
    },
  );
  it('rejects state regression and exposes conflicts instead of dropping events', async () => {
    const memory = memoryJournal(),
      journal = new PreviewJournalAdapter(memory.store, generation);
    await journal.initialize();
    await journal.reserve(makeAttempt());
    await journal.persist(started());
    await expect(journal.persist(makeAttempt())).rejects.toThrow('regression');
    const conflict = new PreviewJournalAdapter(
      {
        ...memory.store,
        put: async () => {
          throw new PreviewCasConflict();
        },
      },
      generation,
    );
    await expect(conflict.persist({ ...started(), status: 'uncertain' })).rejects.toThrow(
      'contention',
    );
    expect((await journal.read()).journal.events).toHaveLength(2);
  });
  it('uses fixed S3 GET/conditional PUT and distinguishes precondition from unknown outcome', async () => {
    const calls: unknown[] = [],
      store = createPreviewS3CasStore(async (command) => {
        calls.push(command.input);
        return 'Body' in command.input
          ? { ETag: '"' + 'b'.repeat(32) + '"' }
          : {
              Body: Readable.from([Buffer.from('{}')]),
              ContentLength: 2,
              ETag: '"' + 'a'.repeat(32) + '"',
            };
      });
    expect((await store.load())?.bytes.toString()).toBe('{}');
    await store.put(Buffer.from('{}'), null);
    await store.put(Buffer.from('{}'), '"' + 'a'.repeat(32) + '"');
    expect(calls).toEqual([
      { Bucket: PREVIEW_JOURNAL_BUCKET, Key: PREVIEW_JOURNAL_KEY },
      expect.objectContaining({ IfNoneMatch: '*' }),
      expect.objectContaining({ IfMatch: '"' + 'a'.repeat(32) + '"' }),
    ]);
    for (const name of ['PreconditionFailed', 'network']) {
      const bad = createPreviewS3CasStore(async () => {
        const error = new Error('not logged');
        error.name = name;
        throw error;
      });
      await expect(bad.put(Buffer.alloc(0), null)).rejects.toBeInstanceOf(
        name === 'PreconditionFailed' ? PreviewCasConflict : PreviewCasUncertain,
      );
    }
  });
  it('serializes CAS headers through the real SDK without network or credential discovery', async () => {
    const seen: {
      method: string;
      hostname: string;
      path: string;
      headers: Record<string, string>;
    }[] = [];
    const client = new S3Client({
      endpoint: 'https://' + 'c'.repeat(32) + '.r2.cloudflarestorage.com',
      region: 'auto',
      credentials: { accessKeyId: 'mock-key', secretAccessKey: 'mock-secret' },
      forcePathStyle: true,
      maxAttempts: 1,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      requestHandler: {
        handle: async (request: {
          method: string;
          hostname: string;
          path: string;
          headers: Record<string, string>;
        }) => {
          seen.push(request);
          return {
            response: {
              statusCode: 200,
              headers: { etag: '"' + 'a'.repeat(32) + '"' },
              body: Readable.from([]),
            },
          };
        },
      },
    });
    try {
      const store = createPreviewS3CasStore((command) => client.send(command));
      await store.put(Buffer.from('{}'), null);
      await store.put(Buffer.from('{}'), '"' + 'a'.repeat(32) + '"');
      expect(seen).toHaveLength(2);
      expect(seen[0]?.headers['if-none-match']).toBe('*');
      expect(seen[1]?.headers['if-match']).toBe('"' + 'a'.repeat(32) + '"');
      expect(
        seen.every(
          (r) =>
            r.method === 'PUT' && r.path === `/${PREVIEW_JOURNAL_BUCKET}/${PREVIEW_JOURNAL_KEY}`,
        ),
      ).toBe(true);
    } finally {
      client.destroy();
    }
  });
});
