import { PREVIEW_TARGET } from '../../build/security/csp-preview-artifact.js';
import { deliveryRecord } from './csp-preview-authority.js';
import {
  PREVIEW_UUID,
  previewTimestamp,
  snapshotBeforeUpload,
  type DeploymentSnapshot,
} from './csp-preview-transaction.js';
import { nativePreviewFetch, readPreviewJson, type PreviewFetch } from './csp-preview-transport.js';
import { previewSinglePost } from './csp-preview-post.js';
import { type PreviewUploadedAssets } from './csp-preview-wrangler.js';
import {
  type PreviewAttempt,
  previewAttemptMarker,
  parsePreviewAttempt,
} from './csp-preview-transaction.js';

const marker = /^rouault-preview:[1-9][0-9]{0,19}\.[1-9][0-9]*\.[a-f0-9-]{36}$/u;
const sanitizeDeployment = (value: unknown): Record<string, unknown> => {
  const row = deliveryRecord(value),
    trigger = row['deployment_trigger'],
    stage = row['latest_stage'];
  const metadata =
    trigger && typeof trigger === 'object' && 'metadata' in trigger
      ? deliveryRecord(trigger.metadata)
      : {};
  const last = stage && typeof stage === 'object' ? deliveryRecord(stage) : {};
  return {
    id: row['id'],
    created_on: previewTimestamp(row['created_on']),
    url:
      typeof row['url'] === 'string' &&
      /^https:\/\/[a-f0-9]{8,32}\.rouault\.pages\.dev\/?$/u.test(row['url'])
        ? row['url']
        : null,
    project_name: row['project_name'] === PREVIEW_TARGET.project ? PREVIEW_TARGET.project : null,
    environment: row['environment'] === 'preview' ? 'preview' : null,
    aliases: Array.isArray(row['aliases'])
      ? row['aliases'].map((alias: unknown) =>
          alias === PREVIEW_TARGET.origin || alias === PREVIEW_TARGET.origin + '/'
            ? alias
            : 'unapproved-alias',
        )
      : null,
    latest_stage: {
      name: last['name'] === 'deploy' ? 'deploy' : null,
      status: ['success', 'failure', 'active', 'canceled'].includes(String(last['status']))
        ? last['status']
        : null,
    },
    deployment_trigger: {
      metadata: {
        branch: metadata['branch'] === PREVIEW_TARGET.branch ? PREVIEW_TARGET.branch : null,
        commit_hash:
          typeof metadata['commit_hash'] === 'string' &&
          /^[a-f0-9]{40}$/u.test(metadata['commit_hash'])
            ? metadata['commit_hash']
            : null,
        commit_dirty:
          typeof metadata['commit_dirty'] === 'boolean' ? metadata['commit_dirty'] : null,
        // 他のdeploymentの自由なcommit本文を証跡へ持ち込まない。
        commit_message:
          typeof metadata['commit_message'] === 'string' && marker.test(metadata['commit_message'])
            ? metadata['commit_message']
            : null,
      },
    },
  };
};

export class PreviewPagesAdapter {
  private readonly base: string;
  constructor(
    private readonly accountId: string,
    private readonly token: string,
    private readonly transport: PreviewFetch = nativePreviewFetch,
    private readonly post: PreviewFetch = transport === nativePreviewFetch
      ? previewSinglePost()
      : transport,
  ) {
    if (!/^[a-f0-9]{32}$/u.test(accountId) || !token || /[\r\n]/u.test(token))
      throw new Error('[preview-delivery] Pages binding unavailable');
    this.base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/rouault`;
  }
  private async get(path: string): Promise<{ body: Record<string, unknown>; date: string }> {
    const response = await this.transport(this.base + path, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
      },
    });
    const rawDate = response.headers.get('date'),
      time = rawDate === null ? NaN : Date.parse(rawDate);
    if (!Number.isFinite(time)) throw new Error('[preview-delivery] Pages server time missing');
    const body = deliveryRecord(await readPreviewJson(response));
    if (body['success'] !== true || !Array.isArray(body['errors']) || body['errors'].length)
      throw new Error('[preview-delivery] Pages API rejected read');
    return { body, date: new Date(time).toISOString() };
  }
  async project(): Promise<void> {
    const { body } = await this.get(''),
      project = deliveryRecord(body['result']);
    if (project['name'] !== PREVIEW_TARGET.project || project['production_branch'] !== 'main')
      throw new Error('[preview-delivery] Pages project/production branch mismatch');
  }
  async uploadToken(): Promise<string> {
    const { body } = await this.get('/upload-token'),
      jwt = deliveryRecord(body['result'])['jwt'];
    if (
      typeof jwt !== 'string' ||
      jwt.length > 16384 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(jwt)
    )
      throw new Error('[preview-delivery] invalid limited asset JWT');
    return jwt;
  }
  async createDeployment(
    attempt: PreviewAttempt,
    assets: PreviewUploadedAssets,
  ): Promise<{ deploymentId: string }> {
    parsePreviewAttempt(attempt);
    if (
      attempt.accountId !== this.accountId ||
      attempt.status !== 'upload-started' ||
      attempt.operationStatus !== 'unknown'
    )
      throw new Error('[preview-delivery] deployment POST identity/state mismatch');
    const form = new FormData();
    form.set('manifest', JSON.stringify(assets.manifest));
    form.set('branch', PREVIEW_TARGET.branch);
    form.set('commit_hash', attempt.sourceSha);
    form.set('commit_dirty', 'false');
    form.set('commit_message', previewAttemptMarker(attempt));
    form.set('_headers', new File([assets.headers], '_headers'));
    form.set('_redirects', new File([assets.redirects], '_redirects'));
    const encoded = new Request(this.base + '/deployments', { method: 'POST', body: form });
    const bytes = new Uint8Array(await encoded.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw new Error('[preview-delivery] deployment form limit');
    // 8000000、5xx、切断、応答欠損も再送しない。結果はjournalからread-onlyで照合する。
    const response = await this.post(this.base + '/deployments', {
      method: 'POST',
      redirect: 'manual',
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': encoded.headers.get('content-type') ?? '',
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
      },
      body: bytes,
    });
    const body = deliveryRecord(await readPreviewJson(response));
    if (body['success'] !== true || !Array.isArray(body['errors']) || body['errors'].length)
      throw new Error('[preview-delivery] deployment POST requires reconciliation');
    const value = sanitizeDeployment(body['result']),
      metadata = deliveryRecord(deliveryRecord(value['deployment_trigger'])['metadata']);
    if (
      typeof value['id'] !== 'string' ||
      !PREVIEW_UUID.test(value['id']) ||
      value['project_name'] !== PREVIEW_TARGET.project ||
      value['environment'] !== 'preview' ||
      metadata['branch'] !== PREVIEW_TARGET.branch ||
      metadata['commit_hash'] !== attempt.sourceSha ||
      metadata['commit_dirty'] !== false ||
      metadata['commit_message'] !== previewAttemptMarker(attempt)
    )
      throw new Error('[preview-delivery] deployment creation identity mismatch');
    return { deploymentId: value['id'] };
  }
  async waitForDeployment(id: string): Promise<void> {
    for (let poll = 0; poll < 12; poll++) {
      const value = await this.deployment(id),
        stage = deliveryRecord(value['latest_stage']);
      if (
        stage['name'] === 'deploy' &&
        ['success', 'failure', 'canceled'].includes(String(stage['status']))
      )
        return;
      if (poll < 11) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  async snapshot(): Promise<DeploymentSnapshot> {
    const deployments: Record<string, unknown>[] = [];
    let expected: number | undefined, observedAt: string | undefined;
    for (let page = 1; page <= 400; page++) {
      const { body, date } = await this.get(
        `/deployments?env=preview&per_page=25&page=${String(page)}`,
      );
      const info = deliveryRecord(body['result_info']),
        rows = body['result'],
        total = info['total_count'];
      if (
        !Array.isArray(rows) ||
        rows.length > 25 ||
        info['page'] !== page ||
        info['per_page'] !== 25 ||
        info['count'] !== rows.length ||
        typeof total !== 'number' ||
        !Number.isSafeInteger(total) ||
        total < 0 ||
        total > 10000 ||
        (expected !== undefined && total !== expected) ||
        (observedAt !== undefined && Date.parse(date) < Date.parse(observedAt))
      )
        throw new Error('[preview-delivery] incomplete/changing Pages pagination');
      expected = total;
      observedAt = date;
      deployments.push(...rows.map(sanitizeDeployment));
      if (
        new Set(deployments.map((row) => row['id'])).size !== deployments.length ||
        deployments.some((row) => typeof row['id'] !== 'string' || !PREVIEW_UUID.test(row['id']))
      )
        throw new Error('[preview-delivery] duplicate Pages deployment identity');
      const pages = Math.max(1, Math.ceil(total / 25));
      if (info['total_pages'] !== undefined && info['total_pages'] !== pages)
        throw new Error('[preview-delivery] Pages total page mismatch');
      if (page === pages) {
        if (deployments.length !== total)
          throw new Error('[preview-delivery] missing Pages deployment page');
        const snapshot = { complete: true, observedAt, deployments };
        snapshotBeforeUpload(snapshot);
        return snapshot;
      }
    }
    throw new Error('[preview-delivery] Pages snapshot limit');
  }
  async deployment(id: string): Promise<Record<string, unknown>> {
    if (!PREVIEW_UUID.test(id)) throw new Error('[preview-delivery] invalid Pages deployment ID');
    const { body } = await this.get(`/deployments/${id}`),
      value = sanitizeDeployment(body['result']);
    if (value['id'] !== id)
      throw new Error('[preview-delivery] Pages deployment response mismatch');
    return value;
  }
}
