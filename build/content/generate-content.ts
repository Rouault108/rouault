import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readContentInputs, type ContentInput } from './content-input.js';
import { createContentBuildContext, type ContentDocumentContext } from './content-build-context.js';
import { compileContentInput } from './content-compiler.js';
import type { CompiledNote } from './content-schema.js';
import type { SourceMemo } from '../data/memos.js';
import { buildNotesCollection, filterPublicNotes } from '../data/notes.js';
import {
  validateCollectedNoteSourceLinks,
  type CollectedMarkdownUrl,
} from './validate-note-source-links.js';
import {
  resolveDevelopmentSiteUrlContext,
  resolveProductionSiteUrlContext,
} from '../site/site-url-context.js';

export interface ContentOutputIO {
  writeFile: typeof writeFile;
  rename: typeof rename;
  rm: typeof rm;
}

export const saveContentCollections = async (
  collections: { notes: readonly CompiledNote[]; memos: readonly SourceMemo[] },
  outputDirectory = path.resolve('.velite'),
  io: ContentOutputIO = { writeFile, rename, rm },
): Promise<void> => {
  // 両方のシリアライズを終えるまで、一時ファイルにも触れない。
  const payloads = [
    ['notes', JSON.stringify(collections.notes)],
    ['memos', JSON.stringify(collections.memos)],
  ] as const;
  await mkdir(outputDirectory, { recursive: true });
  const attempt = randomUUID();
  const files = payloads.map(([name, payload]) => {
    const target = path.join(outputDirectory, `${name}.json`);
    return { target, temporary: `${target}.${attempt}.tmp`, payload };
  });
  try {
    for (const file of files) await io.writeFile(file.temporary, file.payload, { flag: 'wx' });
    for (const file of files) await io.rename(file.temporary, file.target);
  } finally {
    // cleanup失敗は元の書込み/置換エラーを隠さない。次回も両方を全生成する。
    await Promise.allSettled(files.map((file) => io.rm(file.temporary, { force: true })));
  }
};

export const compileContentInputs = async (
  inputs: readonly ContentInput[],
): Promise<{
  notes: CompiledNote[];
  memos: SourceMemo[];
  contexts: Map<string, ContentDocumentContext>;
}> => {
  const siteUrlContext = process.env['ROUAULT_SITE_ORIGIN']
    ? resolveProductionSiteUrlContext()
    : resolveDevelopmentSiteUrlContext();
  const contextFor = createContentBuildContext(inputs, siteUrlContext);
  const contexts = new Map<string, ContentDocumentContext>();
  const notes: CompiledNote[] = [];
  const memos: SourceMemo[] = [];
  const linksBySource = new Map<string, CollectedMarkdownUrl[]>();
  for (const input of inputs) {
    const context = contextFor(input);
    contexts.set(input.sourceLabel, context);
    const compiled = await compileContentInput(input, context);
    if (compiled.note) notes.push(compiled.note);
    if (compiled.memo) memos.push(compiled.memo);
    linksBySource.set(input.sourceLabel, compiled.links);
  }
  const publicNotes = filterPublicNotes(buildNotesCollection(notes, path.resolve('content/notes')));
  const routePermalinks = new Set(publicNotes.map((note) => note.permalink));
  for (const note of publicNotes) {
    validateCollectedNoteSourceLinks(
      linksBySource.get(`${note.sourceRoot}/${note.rawSlug}.md`) ?? [],
      routePermalinks,
    );
  }
  return { notes, memos, contexts };
};

export const generateContent = async () => {
  const collections = await compileContentInputs(readContentInputs());
  await saveContentCollections(collections);
  return collections;
};
