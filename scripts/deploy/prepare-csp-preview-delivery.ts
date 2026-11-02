import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  assertCredentialFreePreview,
  PREVIEW_PENDING_GATES,
  PREVIEW_TARGET,
} from '../../build/security/csp-preview-artifact.js';
import { authorizePreviewDelivery, parsePreviewDeliveryPolicy } from './csp-preview-authority.js';
import { stagePreviewPacket } from './csp-preview-packet.js';

const run = async (): Promise<void> => {
  assertCredentialFreePreview(process.env);
  const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
  if (process.cwd() !== root || process.argv.length !== 3)
    throw new Error('[preview-delivery] fixed checkout root and action required');
  const git = (...args: string[]) =>
    execFileSync('git', ['--no-optional-locks', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  const sourceSha = git('rev-parse', 'HEAD');
  if (process.argv[2] === 'stage') {
    if (git('status', '--porcelain'))
      throw new Error('[preview-delivery] clean candidate required');
    // source-owned allowlistを含む既存の実検査を通す。出力本文はログへ再転記しない。
    execFileSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/prepare-csp-preview.ts', 'dry-run'],
      {
        cwd: root,
        env: process.env,
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    const packet = await stagePreviewPacket(root, sourceSha);
    console.log(
      JSON.stringify({
        schema: 1,
        kind: 'csp-preview-packet',
        target: PREVIEW_TARGET,
        ...packet,
        validation: 'packet-recomputed',
        publicationAllowed: false,
        deliveryAdapters: 'not-connected',
        pendingGates: [
          ...PREVIEW_PENDING_GATES,
          'actions-read-and-service-fetch',
          'durable-reservation-and-live-adapters',
        ],
      }),
    );
    return;
  }
  if (process.argv[2] !== 'preflight') throw new Error('[preview-delivery] unsupported action');
  const policy = parsePreviewDeliveryPolicy(
    JSON.parse(
      await readFile(path.join(root, '.github/csp-preview-delivery.json'), 'utf8'),
    ) as unknown,
  );
  const event: unknown = JSON.parse(await readFile(process.env['GITHUB_EVENT_PATH'] ?? '', 'utf8'));
  const inputs = event && typeof event === 'object' && 'inputs' in event ? event.inputs : null;
  const approvalId =
    inputs &&
    typeof inputs === 'object' &&
    'approval_id' in inputs &&
    typeof inputs.approval_id === 'string'
      ? inputs.approval_id
      : '';
  authorizePreviewDelivery(policy, approvalId, {
    repository: process.env['GITHUB_REPOSITORY'] ?? '',
    event: process.env['GITHUB_EVENT_NAME'] ?? '',
    ref: process.env['GITHUB_REF'] ?? '',
    workflowRef: process.env['GITHUB_WORKFLOW_REF'] ?? '',
    workflowSha: process.env['GITHUB_WORKFLOW_SHA'] ?? '',
    checkoutSha: sourceSha,
  });
  // 未確認のcredential bindingやActions権限をこの実装で暗黙に有効化しない。
  throw new Error(
    '[preview-delivery] live artifact download, credential binding and uploader adapters require separate review',
  );
};

try {
  await run();
} catch {
  console.error(
    '[preview-delivery] blocked; no publication attempted; confirm trusted policy and pending delivery adapters',
  );
  process.exitCode = 1;
}
