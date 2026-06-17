import { validateNoteSourceLinks } from '../build/content/validate-note-source-links.js';

try {
  await validateNoteSourceLinks();
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
}
