import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { sanitizeScoreSvg } from './sanitize-svg.js';

interface ResolveScoreSvgOptions {
  readonly sourceFilePath?: string | undefined;
}

const SCORE_SVG_EXTENSION = '.svg';

const isUnsafeScoreSource = (value: string): boolean =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(value) || value.includes('\0');

const normalizeScoreSource = (src: string): string => {
  const trimmed = src.trim();
  if (trimmed.length === 0 || isUnsafeScoreSource(trimmed)) {
    throw new Error('[markdown] score の src はローカル SVG だけ指定できます');
  }
  if (path.isAbsolute(trimmed) || trimmed.startsWith('/')) {
    throw new Error('[markdown] score の src はリポジトリ内の相対 SVG だけ指定できます');
  }
  const normalized = path.posix.normalize(trimmed.replaceAll(path.sep, '/'));
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error('[markdown] score の src は親ディレクトリへ遡れません');
  }
  if (path.posix.extname(trimmed).toLowerCase() !== SCORE_SVG_EXTENSION) {
    throw new Error('[markdown] score の src は .svg ファイルだけ指定できます');
  }
  return normalized;
};

const isInsideDirectory = (candidate: string, directory: string): boolean => {
  const relative = path.relative(directory, candidate);
  return relative.length === 0 || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const resolveScorePath = (src: string, options: ResolveScoreSvgOptions): string => {
  const normalized = normalizeScoreSource(src);
  const cwd = process.cwd();
  const candidates = [
    ...(options.sourceFilePath
      ? [path.resolve(path.dirname(options.sourceFilePath), normalized)]
      : []),
    path.resolve(cwd, normalized),
  ].filter((candidate) => isInsideDirectory(candidate, cwd));

  const matched = candidates.find((candidate) => existsSync(candidate));
  if (!matched) {
    throw new Error(`[markdown] score SVG "${normalized}" が見つかりません`);
  }

  const stat = statSync(matched);
  if (!stat.isFile()) {
    throw new Error(`[markdown] score SVG "${normalized}" はファイルではありません`);
  }
  return matched;
};

export const resolveScoreSvg = (src: string, options: ResolveScoreSvgOptions = {}): string => {
  const filePath = resolveScorePath(src, options);
  const rawSvg = readFileSync(filePath, 'utf8');
  return sanitizeScoreSvg(rawSvg, src);
};
