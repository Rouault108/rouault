import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deliveryRecord, parsePreviewDeliveryPolicy } from './csp-preview-authority.js';
import { runPreviewDelivery } from './csp-preview-runtime.js';

// workflowには未接続。authorityが無効な現在はcredential getterにも到達しない。
const run = async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  if (path.resolve(process.cwd()) !== path.resolve(root) || process.argv.length !== 2)
    throw new Error('fixed trusted entry required');
  const git = (...args: string[]) =>
    execFileSync('git', ['--no-optional-locks', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  if (git('status', '--porcelain')) throw new Error('clean trusted checkout required');
  const policy = parsePreviewDeliveryPolicy(
    JSON.parse(
      await readFile(path.join(root, '.github/csp-preview-delivery.json'), 'utf8'),
    ) as unknown,
  );
  const event = deliveryRecord(
      JSON.parse(await readFile(process.env['GITHUB_EVENT_PATH'] ?? '', 'utf8')) as unknown,
    ),
    inputs = deliveryRecord(event['inputs']);
  const operation = inputs['operation'];
  if (operation !== 'publish' && operation !== 'reconcile')
    throw new Error('operation not connected');
  const result = await runPreviewDelivery({
    trustedRoot: root,
    policy,
    approvalId: typeof inputs['approval_id'] === 'string' ? inputs['approval_id'] : '',
    operation,
    execution: {
      repository: process.env['GITHUB_REPOSITORY'] ?? '',
      event: process.env['GITHUB_EVENT_NAME'] ?? '',
      ref: process.env['GITHUB_REF'] ?? '',
      workflowRef: process.env['GITHUB_WORKFLOW_REF'] ?? '',
      workflowSha: process.env['GITHUB_WORKFLOW_SHA'] ?? '',
      checkoutSha: git('rev-parse', 'HEAD'),
      runId: process.env['GITHUB_RUN_ID'] ?? '',
      runAttempt: Number(process.env['GITHUB_RUN_ATTEMPT']),
    },
    bindings: () => ({
      githubToken: process.env['CSP_PREVIEW_GITHUB_TOKEN'] ?? '',
      pagesToken: process.env['CSP_PREVIEW_PAGES_TOKEN'] ?? '',
      journal: {
        accessKeyId: process.env['CSP_PREVIEW_JOURNAL_KEY_ID'] ?? '',
        secretAccessKey: process.env['CSP_PREVIEW_JOURNAL_SECRET'] ?? '',
      },
    }),
  });
  console.log(JSON.stringify(result));
  if (result.attempt.status !== 'verified') process.exitCode = 1;
};
try {
  await run();
} catch {
  console.error(
    '[preview-delivery] stopped; inspect durable attempt before any retry; raw service output omitted',
  );
  process.exitCode = 1;
}
