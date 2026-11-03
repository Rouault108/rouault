import { generateContent } from '../build/content/generate-content.js';
import { reportContentDiagnostic } from '../build/content/content-diagnostics.js';

try {
  await generateContent({ reportDiagnostic: reportContentDiagnostic });
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
}
