import { generateContent } from '../build/content/generate-content.js';

try {
  await generateContent();
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
}
