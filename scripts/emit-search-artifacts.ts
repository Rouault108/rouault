import path from 'node:path';

import { loadNotesData } from '../build/data/notes.js';
import { emitSearchArtifacts } from '../build/search/emit-search-artifacts.js';
import { emitLexicalSite } from '../build/search/emit-lexical-site.js';

const outputDir = path.resolve(process.cwd(), 'dist');

await emitSearchArtifacts({
  notes: loadNotesData(),
  outputDir,
});
await emitLexicalSite({ notes: loadNotesData(), outputDir });
