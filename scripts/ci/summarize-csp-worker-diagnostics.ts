import { readFile } from 'node:fs/promises';
import { workerDiagnosticNotices } from './csp-worker-diagnostics.js';

try {
  const engine = process.argv[2];
  if (!engine || !['chromium-csp', 'firefox-csp', 'webkit-csp'].includes(engine))
    throw new Error('invalid-engine');
  const report: unknown = JSON.parse(
    await readFile(`.generated/csp/worker-diagnostics-${engine}.json`, 'utf8'),
  );
  for (const notice of workerDiagnosticNotices(report)) console.log(notice);
} catch {
  process.stderr.write('[csp-diagnostics] invalid-or-missing-evidence\n');
  process.exitCode = 1;
}
