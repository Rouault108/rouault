import { deliveryRecord } from '../../scripts/deploy/csp-preview-authority.js';
import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PreviewGithubAdapter } from '../../scripts/deploy/csp-preview-github.js';
import { readPreviewResponse } from '../../scripts/deploy/csp-preview-transport.js';
import {
  readPreviewZip,
  extractPreviewZip,
  previewCrc32,
} from '../../scripts/deploy/csp-preview-zip.js';
import { PreviewPagesAdapter } from '../../scripts/deploy/csp-preview-pages.js';
import { approval, deployment, trustedSha } from './helpers/csp-preview-delivery-fixture.js';
import { githubFixture, jsonResponse, storedZip } from './helpers/csp-preview-adapter-fixture.js';

describe('bounded preview service transports', () => {
  it('uses fixed GitHub endpoints and verifies attempt, jobs, workflow blob and digest', async () => {
    const f = githubFixture(),
      github = new PreviewGithubAdapter('mock-github', f.transport);
    await github.assertTrustedHead(trustedSha);
    expect((await github.approvedEvidence(f.approval)).ciWorkflowDigest).toBe(
      f.approval.ciWorkflowDigest,
    );
    expect(await github.archive(f.approval)).toEqual(Buffer.from('mock-zip'));
    expect(f.calls.at(-1)?.init.headers).not.toHaveProperty('Authorization');
    expect(
      f.calls.every(({ init }) => init.redirect === 'manual' && init.credentials === 'omit'),
    ).toBe(true);
  });
  it.each([
    ['/actions/runs/101', 'run_attempt', 2],
    ['/actions/runs/103', 'run_attempt', 2],
    ['/actions/artifacts/102', 'created_at', '2026-11-01T00:00:00.000Z'],
    ['/actions/runs/101/attempts/1', 'head_branch', 'untrusted'],
    ['/actions/runs/103', 'head_sha', '0'.repeat(40)],
    ['/actions/artifacts/102', 'expired', true],
  ])('rejects changed service identity %s %s', async (key, field, value) => {
    const f = githubFixture(undefined, (k, row) =>
      k === key ? { ...deliveryRecord(row), [String(field)]: value } : row,
    );
    await expect(
      new PreviewGithubAdapter('mock', f.transport).approvedEvidence(f.approval),
    ).rejects.toThrow();
  });
  it('rejects changed trusted head and absent required jobs', async () => {
    const f = githubFixture(undefined, (k, row) =>
      k.endsWith('/jobs?per_page=100&page=1') ? { total_count: 0, jobs: [] } : row,
    );
    await expect(
      new PreviewGithubAdapter('mock', f.transport).assertTrustedHead('0'.repeat(40)),
    ).rejects.toThrow('stale');
    await expect(
      new PreviewGithubAdapter('mock', f.transport).approvedEvidence(f.approval),
    ).rejects.toThrow('provenance');
  });
  it('reads every collection page and rejects missing, duplicate and foreign links', async () => {
    const base = 'https://api.github.com/repos/Rouault108/rouault/actions/runs/101/artifacts';
    for (const mode of ['valid', 'missing', 'duplicate', 'foreign']) {
      const github = new PreviewGithubAdapter('mock', async (url) => {
        const page = new URL(url).searchParams.get('page');
        return jsonResponse(
          { total_count: 2, artifacts: [{ id: page === '1' ? 1 : mode === 'duplicate' ? 1 : 2 }] },
          page === '1' && mode !== 'missing'
            ? {
                link: `<${mode === 'foreign' ? 'https://example.invalid/' : base}?per_page=100&page=2>; rel="next"`,
              }
            : {},
        );
      });
      if (mode === 'valid')
        expect(await github.pages('/actions/runs/101/artifacts', 'artifacts')).toHaveLength(2);
      else await expect(github.pages('/actions/runs/101/artifacts', 'artifacts')).rejects.toThrow();
    }
  });
  it.each([
    'https://evil.invalid/a',
    'https://productionresultssa3.blob.core.windows.net:444/a',
    'http://productionresultssa3.blob.core.windows.net/a',
    'https://u:p@productionresultssa3.blob.core.windows.net/a',
  ])('rejects archive redirect %s', async (location) => {
    let calls = 0;
    await expect(
      new PreviewGithubAdapter('mock', async () => {
        calls++;
        return new Response(null, { status: 302, headers: { location } });
      }).archive(approval),
    ).rejects.toThrow('redirect');
    expect(calls).toBe(1);
  });
  it('rejects second redirect, archive digest mismatch and encoded/truncated/oversized bodies', async () => {
    const f = githubFixture();
    await expect(
      new PreviewGithubAdapter('mock', async (url, init) =>
        url.includes('blob.core') ? new Response(null, { status: 302 }) : f.transport(url, init),
      ).archive(f.approval),
    ).rejects.toThrow('unavailable');
    await expect(new PreviewGithubAdapter('mock', f.transport).archive(approval)).rejects.toThrow(
      'digest',
    );
    for (const headers of [
      { 'content-length': '100' },
      { 'content-encoding': 'gzip' },
      { 'content-length': '1' },
    ])
      await expect(readPreviewResponse(new Response('abc', { headers }), 8)).rejects.toThrow();
    await expect(readPreviewResponse(new Response('123456789'), 8)).rejects.toThrow('limit');
  });
});

describe('bounded ZIP and extraction', () => {
  const archive = () => storedZip([{ name: 'baseline/index.html', bytes: Buffer.from('hello') }]);
  it('accepts independent Python deflate header', () =>
    expect(
      readPreviewZip(
        Buffer.from(
          'UEsDBBQAAAAIAAAAY10BnCfzFgAAABYAAAATAAAAYmFzZWxpbmUvaW5kZXguaHRtbMvOyy/PU8jMS0ktSAUSeSUKVZkFXABQSwECFAMUAAAACAAAAGNdAZwn8xYAAAAWAAAAEwAAAAAAAAAAAAAAgAEAAAAAYmFzZWxpbmUvaW5kZXguaHRtbFBLBQYAAAAAAQABAEEAAABHAAAAAAA=',
          'base64',
        ),
      )[0]?.bytes.toString(),
    ).toBe('known independent zip\n'));
  it('accepts independent Python deflate descriptor', () =>
    expect(
      readPreviewZip(
        Buffer.from(
          'UEsDBBQACAAIAAAAY10AAAAAAAAAAAAAAAATAAAAYmFzZWxpbmUvaW5kZXguaHRtbMvOyy/PU8jMS0ktSAUSeSUKVZkFXABQSwcIAZwn8xYAAAAWAAAAUEsBAhQDFAAIAAgAAABjXQGcJ/MWAAAAFgAAABMAAAAAAAAAAAAAAIABAAAAAGJhc2VsaW5lL2luZGV4Lmh0bWxQSwUGAAAAAAEAAQBBAAAAVwAAAAAA',
          'base64',
        ),
      )[0]?.bytes.toString(),
    ).toBe('known independent zip\n'));
  it('checks a known CRC and creates only fresh bounded files', async () => {
    expect(previewCrc32(Buffer.from('123456789'))).toBe(0xcbf43926);
    expect(readPreviewZip(archive())[0]?.bytes.toString()).toBe('hello');
    const root = await mkdtemp(path.join(tmpdir(), 'zip-test-'));
    try {
      await extractPreviewZip(archive(), root + '/packet');
      expect(await readFile(root + '/packet/baseline/index.html', 'utf8')).toBe('hello');
      await expect(extractPreviewZip(archive(), root + '/packet')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it.each(['../escape', '/absolute', 'a/../b', 'a\\b', 'a:b', '.env', 'a//b'])(
    'rejects unsafe path %s',
    (name) =>
      expect(() => readPreviewZip(storedZip([{ name, bytes: Buffer.from('x') }]))).toThrow(),
  );
  it('rejects duplicates, case aliases, symlinks, parent files and oversized expansion', () => {
    for (const files of [
      [
        { name: 'a', bytes: Buffer.alloc(0) },
        { name: 'A', bytes: Buffer.alloc(0) },
      ],
      [{ name: 'link', bytes: Buffer.from('target'), mode: 0o120777 }],
      [
        { name: 'a', bytes: Buffer.alloc(0) },
        { name: 'a/b', bytes: Buffer.alloc(0) },
      ],
    ])
      expect(() => readPreviewZip(storedZip(files))).toThrow();
    const modified = archive(),
      central = modified.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    modified.writeUInt32LE(33 * 1024 * 1024, central + 24);
    expect(() => readPreviewZip(modified)).toThrow();
  });
  it.each(['crc', 'offset', 'flags', 'method', 'trailing', 'truncated'])(
    'rejects malformed %s',
    (mode) => {
      let value = archive();
      if (mode === 'crc') value[50] = (value[50] ?? 0) ^ 1;
      if (mode === 'offset') value.writeUInt32LE(1, value.length - 6);
      if (mode === 'flags') value.writeUInt16LE(1, 6);
      if (mode === 'method') value.writeUInt16LE(99, 8);
      if (mode === 'trailing') value = Buffer.concat([value, Buffer.from('x')]);
      if (mode === 'truncated') value = value.subarray(0, -1);
      expect(() => readPreviewZip(value)).toThrow();
    },
  );
});

describe('Pages read adapter', () => {
  const account = 'c'.repeat(32),
    date = { date: 'Mon, 02 Nov 2026 00:00:03 GMT' };
  it('validates project and strips free text and credentials from response data', async () => {
    const pages = new PreviewPagesAdapter(account, 'mock', async (url) =>
      jsonResponse(
        {
          success: true,
          errors: [],
          result: url.includes('/deployments')
            ? [{ ...deployment(), env_vars: { secret: 'DO_NOT_KEEP' } }]
            : { name: 'rouault', production_branch: 'main' },
          result_info: { page: 1, per_page: 25, count: 1, total_count: 1 },
        },
        date,
      ),
    );
    await pages.project();
    const result = await pages.snapshot();
    expect(result.complete).toBe(true);
    expect(JSON.stringify(result)).not.toContain('DO_NOT_KEEP');
  });
  it.each(['missing-date', 'wrong-project', 'wrong-id', 'missing-page', 'future-deployment'])(
    'rejects %s',
    async (mode) => {
      const pages = new PreviewPagesAdapter(account, 'mock', async () =>
        jsonResponse(
          {
            success: true,
            errors: [],
            result:
              mode === 'wrong-project'
                ? { name: 'other', production_branch: 'main' }
                : mode === 'wrong-id'
                  ? { ...deployment(), id: 'bad' }
                  : [
                      {
                        ...deployment(),
                        ...(mode === 'future-deployment'
                          ? { created_on: '2027-01-01T00:00:00Z' }
                          : {}),
                      },
                    ],
            result_info: {
              page: 1,
              per_page: 25,
              count: 1,
              total_count: mode === 'missing-page' ? 2 : 1,
            },
          },
          mode === 'missing-date' ? {} : date,
        ),
      );
      if (mode === 'wrong-project') await expect(pages.project()).rejects.toThrow();
      else if (mode === 'wrong-id')
        await expect(pages.deployment(deployment().id)).rejects.toThrow();
      else await expect(pages.snapshot()).rejects.toThrow();
    },
  );
  it('does not follow API redirects', async () =>
    await expect(
      new PreviewPagesAdapter(
        account,
        'mock',
        async () =>
          new Response(null, {
            status: 302,
            headers: { ...date, location: 'https://evil.invalid/' },
          }),
      ).project(),
    ).rejects.toThrow());
});
