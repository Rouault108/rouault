import { createHash } from 'node:crypto';
import { previewDigest } from '../../build/security/csp-preview-artifact.js';
import {
  deliveryRecord,
  parsePreviewApproval,
  PREVIEW_REPOSITORY,
  PREVIEW_WORKFLOW,
  verifyPreviewServiceEvidence,
  type PreviewApproval,
  type PreviewServiceEvidence,
} from './csp-preview-authority.js';
import { previewTimestamp } from './csp-preview-transaction.js';
import {
  nativePreviewFetch,
  readPreviewJson,
  readPreviewResponse,
  type PreviewFetch,
} from './csp-preview-transport.js';

const API = `https://api.github.com/repos/${PREVIEW_REPOSITORY}`;
const BLOB_HOSTS = new Set([
  'productionresultssa3.blob.core.windows.net',
  'productionresultssa9.blob.core.windows.net',
]);
const positive = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new Error('[preview-delivery] invalid service count/attempt');
  return value;
};

export class PreviewGithubAdapter {
  constructor(
    private readonly token: string,
    private readonly transport: PreviewFetch = nativePreviewFetch,
  ) {
    if (!token || /[\r\n]/u.test(token))
      throw new Error('[preview-delivery] GitHub binding unavailable');
  }
  private async get(path: string): Promise<Response> {
    // pathは下の固定API生成だけから渡す。candidate URLやarchive_download_urlを使わない。
    const response = await this.transport(API + path, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'Accept-Encoding': 'identity',
        'X-GitHub-Api-Version': '2026-03-10',
      },
    });
    return response;
  }
  private async json(path: string): Promise<unknown> {
    return readPreviewJson(await this.get(path));
  }
  async assertTrustedHead(sha: string): Promise<void> {
    if (!/^[a-f0-9]{40}$/u.test(sha))
      throw new Error('[preview-delivery] invalid trusted revision');
    const ref = deliveryRecord(await this.json('/git/ref/heads/main'));
    if (ref['ref'] !== 'refs/heads/main' || deliveryRecord(ref['object'])['sha'] !== sha)
      throw new Error('[preview-delivery] trusted policy is stale');
  }

  async pages(path: string, field: 'jobs' | 'artifacts'): Promise<Record<string, unknown>[]> {
    if (
      !/^\/actions\/runs\/[1-9][0-9]*(?:\/attempts\/[1-9][0-9]*)?\/(?:jobs|artifacts)$/u.test(path)
    )
      throw new Error('[preview-delivery] unsupported GitHub collection');
    const rows: Record<string, unknown>[] = [];
    let expected: number | undefined;
    for (let page = 1; page <= 100; page++) {
      const response = await this.get(`${path}?per_page=100&page=${String(page)}`),
        value = deliveryRecord(await readPreviewJson(response));
      const count = value['total_count'];
      if (
        typeof count !== 'number' ||
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > 10000 ||
        !Array.isArray(value[field]) ||
        value[field].length > 100 ||
        (expected !== undefined && count !== expected)
      )
        throw new Error('[preview-delivery] incomplete or changing GitHub collection');
      expected = count;
      rows.push(...value[field].map(deliveryRecord));
      if (
        new Set(rows.map((row) => String(row['id']))).size !== rows.length ||
        rows.some((row) => !/^[1-9][0-9]*$/u.test(String(row['id'])))
      )
        throw new Error('[preview-delivery] duplicate/invalid service identity');
      const link = response.headers.get('link') ?? '';
      const links = link
        ? link.split(',').map((item) => {
            const parsed = /^\s*<([^>]+)>;\s*rel="(next|prev|first|last)"\s*$/u.exec(item);
            if (!parsed) throw new Error('[preview-delivery] malformed pagination');
            return parsed;
          })
        : [];
      if (new Set(links.map((entry) => entry[2])).size !== links.length)
        throw new Error('[preview-delivery] duplicate pagination relation');
      const next = links.filter((v) => v[2] === 'next');
      for (const entry of links) {
        const url = new URL(entry[1] ?? '');
        if (
          url.origin + url.pathname !== API + path ||
          url.hash ||
          url.username ||
          url.password ||
          [...url.searchParams.keys()].sort().join(',') !== 'page,per_page' ||
          url.searchParams.get('per_page') !== '100' ||
          !/^[1-9][0-9]*$/u.test(url.searchParams.get('page') ?? '')
        )
          throw new Error('[preview-delivery] foreign pagination redirect');
      }
      if (!next.length) {
        if (rows.length !== expected) throw new Error('[preview-delivery] missing collection page');
        return rows;
      }
      if (
        next.length !== 1 ||
        new URL(next[0]?.[1] ?? '').searchParams.get('page') !== String(page + 1) ||
        rows.length >= expected
      )
        throw new Error('[preview-delivery] pagination order/limit');
    }
    throw new Error('[preview-delivery] GitHub pagination limit');
  }

  async approvedEvidence(approval: PreviewApproval): Promise<PreviewServiceEvidence> {
    parsePreviewApproval(approval);
    const latest = deliveryRecord(await this.json(`/actions/runs/${approval.producerRunId}`));
    if (latest['run_attempt'] !== approval.producerAttempt)
      throw new Error('[preview-delivery] producer attempt changed');
    const producer = deliveryRecord(
      await this.json(
        `/actions/runs/${approval.producerRunId}/attempts/${String(approval.producerAttempt)}`,
      ),
    );
    if (
      producer['run_attempt'] !== approval.producerAttempt ||
      producer['head_sha'] !== latest['head_sha']
    )
      throw new Error('[preview-delivery] producer attempt identity mismatch');
    const jobs = await this.pages(
      `/actions/runs/${approval.producerRunId}/attempts/${String(approval.producerAttempt)}/jobs`,
      'jobs',
    );
    if (new Set(jobs.map((job) => job['name'])).size !== jobs.length)
      throw new Error('[preview-delivery] ambiguous producer job identity');
    if (
      !jobs.some(
        (j) =>
          j['name'] === 'prepare' && j['status'] === 'completed' && j['conclusion'] === 'success',
      ) ||
      !jobs.some(
        (j) => j['name'] === 'trusted-delivery-preflight' && j['conclusion'] === 'skipped',
      ) ||
      jobs.some(
        (j) =>
          !['prepare', 'trusted-delivery-preflight', 'trusted-delivery'].includes(
            String(j['name']),
          ) ||
          (j['name'] !== 'prepare' && j['conclusion'] !== 'skipped'),
      )
    )
      throw new Error('[preview-delivery] producer job provenance mismatch');
    const artifacts = await this.pages(
      `/actions/runs/${approval.producerRunId}/artifacts`,
      'artifacts',
    );
    const selected = artifacts.filter((a) => String(a['id']) === approval.artifactId);
    if (selected.length !== 1) throw new Error('[preview-delivery] artifact absent/ambiguous');
    const artifact = deliveryRecord(await this.json(`/actions/artifacts/${approval.artifactId}`));
    if (
      ['id', 'name', 'digest', 'expired', 'created_at', 'updated_at', 'size_in_bytes'].some(
        (key) => artifact[key] !== selected[0]?.[key],
      )
    )
      throw new Error('[preview-delivery] artifact metadata changed');
    const started = Date.parse(previewTimestamp(producer['run_started_at'])),
      ended = Date.parse(previewTimestamp(producer['updated_at']));
    const created = Date.parse(previewTimestamp(artifact['created_at']));
    if (
      created < started ||
      created > ended ||
      Date.parse(previewTimestamp(artifact['updated_at'])) > ended
    )
      throw new Error('[preview-delivery] artifact is from another attempt');
    const ci = deliveryRecord(await this.json(`/actions/runs/${approval.ciRunId}`));
    if (ci['run_attempt'] !== approval.ciRunAttempt)
      throw new Error('[preview-delivery] CI attempt changed');
    const ciJobs = await this.pages(
      `/actions/runs/${approval.ciRunId}/attempts/${String(positive(ci['run_attempt']))}/jobs`,
      'jobs',
    );
    for (const name of [
      'prebuild-gate',
      'build-production',
      'ci-required',
      'csp-required',
      'test-csp (chromium)',
      'test-csp (firefox)',
      'test-csp (webkit)',
    ])
      if (
        ciJobs.filter((j) => j['name'] === name).length !== 1 ||
        !ciJobs.some(
          (j) => j['name'] === name && j['status'] === 'completed' && j['conclusion'] === 'success',
        )
      )
        throw new Error('[preview-delivery] required candidate CI proof missing');
    const file = deliveryRecord(
      await this.json(`/contents/.github/workflows/ci-cd.yml?ref=${approval.sourceSha}`),
    );
    if (
      file['type'] !== 'file' ||
      file['path'] !== '.github/workflows/ci-cd.yml' ||
      file['encoding'] !== 'base64' ||
      typeof file['content'] !== 'string'
    )
      throw new Error('[preview-delivery] invalid CI definition response');
    const bytes = Buffer.from(file['content'].replace(/\n/gu, ''), 'base64');
    if (
      bytes.length > 1024 * 1024 ||
      bytes.length !== file['size'] ||
      createHash('sha1')
        .update(`blob ${String(bytes.length)}\0`)
        .update(bytes)
        .digest('hex') !== file['sha']
    )
      throw new Error('[preview-delivery] CI blob identity mismatch');
    const evidence = { producer, artifact, ci, ciWorkflowDigest: previewDigest(bytes) };
    verifyPreviewServiceEvidence(approval, evidence);
    if (producer['path'] !== PREVIEW_WORKFLOW)
      throw new Error('[preview-delivery] foreign producer');
    return evidence;
  }

  async archive(approval: PreviewApproval): Promise<Buffer> {
    parsePreviewApproval(approval);
    const redirect = await this.get(`/actions/artifacts/${approval.artifactId}/zip`);
    if (redirect.status !== 302) throw new Error('[preview-delivery] artifact redirect required');
    let target: URL;
    try {
      target = new URL(redirect.headers.get('location') ?? '');
    } catch {
      throw new Error('[preview-delivery] invalid artifact redirect');
    }
    if (
      target.protocol !== 'https:' ||
      target.port ||
      target.username ||
      target.password ||
      target.hash ||
      target.pathname === '/' ||
      !BLOB_HOSTS.has(target.hostname)
    )
      throw new Error('[preview-delivery] unapproved artifact redirect');
    await redirect.body?.cancel();
    // SAS URLはメモリー内だけで使う。GitHub Authorizationを次のhostへ転送しない。
    const response = await this.transport(target.href, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: { Accept: 'application/zip', 'Accept-Encoding': 'identity' },
    });
    if (
      response.status !== 200 ||
      !/^(?:application\/zip|application\/octet-stream)(?:;|$)/iu.test(
        response.headers.get('content-type') ?? '',
      )
    )
      throw new Error('[preview-delivery] artifact download unavailable/redirected');
    const bytes = await readPreviewResponse(response, 128 * 1024 * 1024);
    if (`sha256:${previewDigest(bytes)}` !== approval.artifactZipDigest)
      throw new Error('[preview-delivery] downloaded ZIP digest mismatch');
    return bytes;
  }
}
