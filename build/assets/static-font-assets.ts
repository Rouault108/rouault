import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

export const STATIC_ASSETS_ROOT_REPO_PATH = '.generated/static-assets';

export const STATIC_ASSETS_ROOT_ABSOLUTE_PATH = path.resolve(
  process.cwd(),
  STATIC_ASSETS_ROOT_REPO_PATH,
);

export const NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH = path.resolve(
  process.cwd(),
  'node_modules/@fontsource-variable/noto-sans-jp/files',
);

export const NOTO_SANS_JP_FONT_DIR_REPO_PATH =
  '.generated/static-assets/assets/fonts/noto-sans-jp';

export const NOTO_SANS_JP_FONT_DIR_ABSOLUTE_PATH = path.resolve(
  process.cwd(),
  NOTO_SANS_JP_FONT_DIR_REPO_PATH,
);

const assertDirectoryExists = async (directoryPath: string, label: string): Promise<void> => {
  try {
    const directoryStat = await stat(directoryPath);
    if (!directoryStat.isDirectory()) {
      throw new Error(`${label} is not a directory: ${directoryPath}`);
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`${label} does not exist: ${directoryPath}`);
    }
    throw error;
  }
};

const collectDirectWoff2FileNames = async (directoryPath: string): Promise<string[]> => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.woff2'))
    .map((entry) => entry.name)
    .sort();
};

const assertWoff2FilesAreNonEmpty = async (
  directoryPath: string,
  fileNames: readonly string[],
  label: string,
): Promise<void> => {
  for (const fileName of fileNames) {
    const filePath = path.join(directoryPath, fileName);
    const fileStat = await stat(filePath);
    if (fileStat.size === 0) {
      throw new Error(`${label} .woff2 file is empty: ${filePath}`);
    }
  }
};

const assertSortedFileNameSetsMatch = (
  sourceFileNames: readonly string[],
  destinationFileNames: readonly string[],
): void => {
  if (
    sourceFileNames.length !== destinationFileNames.length ||
    sourceFileNames.some((fileName, index) => fileName !== destinationFileNames[index])
  ) {
    throw new Error(
      `Noto Sans JP source and generated mirror .woff2 basename sets differ: source=${sourceFileNames.join(
        ', ',
      )}; destination=${destinationFileNames.join(', ')}`,
    );
  }
};

export const prepareStaticFontAssets = async (): Promise<void> => {
  await assertDirectoryExists(
    NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH,
    'Noto Sans JP font source directory',
  );

  const sourceFileNames = await collectDirectWoff2FileNames(
    NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH,
  );
  if (sourceFileNames.length === 0) {
    throw new Error(
      `Noto Sans JP font source directory has no direct .woff2 files: ${NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH}`,
    );
  }
  await assertWoff2FilesAreNonEmpty(
    NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH,
    sourceFileNames,
    'Noto Sans JP source',
  );

  await rm(NOTO_SANS_JP_FONT_DIR_ABSOLUTE_PATH, { recursive: true, force: true });
  await mkdir(NOTO_SANS_JP_FONT_DIR_ABSOLUTE_PATH, { recursive: true });

  for (const fileName of sourceFileNames) {
    await copyFile(
      path.join(NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH, fileName),
      path.join(NOTO_SANS_JP_FONT_DIR_ABSOLUTE_PATH, fileName),
    );
  }

  const destinationFileNames = await collectDirectWoff2FileNames(
    NOTO_SANS_JP_FONT_DIR_ABSOLUTE_PATH,
  );
  if (destinationFileNames.length === 0) {
    throw new Error(
      `Noto Sans JP generated mirror has no .woff2 files: ${NOTO_SANS_JP_FONT_DIR_ABSOLUTE_PATH}`,
    );
  }
  await assertWoff2FilesAreNonEmpty(
    NOTO_SANS_JP_FONT_DIR_ABSOLUTE_PATH,
    destinationFileNames,
    'Noto Sans JP generated mirror',
  );
  assertSortedFileNameSetsMatch(sourceFileNames, destinationFileNames);
};
