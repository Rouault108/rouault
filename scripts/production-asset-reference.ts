import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { hasAsciiControlCharacter } from '../shared/string/ascii-control.js';

import { isPathnameInsideBasePath, type SiteUrlContext } from '../shared/site/site-url-context.js';

export interface ProductionAssetReference {
  readonly pathname: string;
  readonly assetPath: string;
}

export const productionAssetUrl = (assetPath: string, context: SiteUrlContext): string =>
  `${context.siteOrigin}${context.basePath}/${assetPath.split('/').map(encodeURIComponent).join('/')}`;

export const resolveProductionAssetReference = (
  rawUrl: string,
  referringUrl: string,
  context: SiteUrlContext,
): ProductionAssetReference => {
  // URL parserが補正するbackslashやcontrol文字を、公開URLの証拠として受け入れない。
  if (rawUrl.length === 0 || rawUrl.includes('\\') || hasAsciiControlCharacter(rawUrl)) {
    throw new Error('[production-assets] invalid static asset URL');
  }
  const url = new URL(rawUrl, referringUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('[production-assets] static asset URL must use http or https');
  }
  if (url.origin !== context.siteOrigin || url.username || url.password) {
    throw new Error(
      '[production-assets] static asset URL must use the production origin without credentials',
    );
  }
  // percent復号後のseparatorやdot segmentをfilesystemへ渡すと、URL上の包含が失われる。
  const decodedPathname = url.pathname
    .split('/')
    .map((segment) => {
      const decoded = decodeURIComponent(segment);
      if (
        decoded === '.' ||
        decoded === '..' ||
        /[\\/:]/u.test(decoded) ||
        hasAsciiControlCharacter(decoded)
      ) {
        throw new Error('[production-assets] unsafe static asset pathname');
      }
      return decoded;
    })
    .join('/');
  if (!isPathnameInsideBasePath(decodedPathname, context.basePath)) {
    throw new Error('[production-assets] static asset URL is outside the hosting base path');
  }
  const segments = decodedPathname.slice(context.basePath.length + 1).split('/');
  if (segments.every((segment) => segment.length === 0)) {
    throw new Error('[production-assets] static asset URL has no file pathname');
  }
  return { pathname: url.pathname, assetPath: segments.join('/') };
};

const isInsideDirectory = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

export const assertProductionAssetFile = (
  repoRoot: string,
  assetPath: string,
  description: string,
): string => {
  const distRoot = path.resolve(repoRoot, 'dist');
  const filePath = path.resolve(distRoot, assetPath);
  if (!isInsideDirectory(distRoot, filePath)) {
    throw new Error(`[production-assets] ${description}: asset is outside dist: ${assetPath}`);
  }
  if (!existsSync(filePath)) {
    throw new Error(`[production-assets] ${description}: missing asset: ${assetPath}`);
  }
  if (!isInsideDirectory(realpathSync(distRoot), realpathSync(filePath))) {
    throw new Error(
      `[production-assets] ${description}: asset real path is outside dist: ${assetPath}`,
    );
  }
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(
      `[production-assets] ${description}: asset is not a regular file: ${assetPath}`,
    );
  }
  if (stat.size === 0) {
    throw new Error(`[production-assets] ${description}: empty asset: ${assetPath}`);
  }
  return filePath;
};

export const readProductionCssAsset = (repoRoot: string, assetPath: string): string =>
  readFileSync(assertProductionAssetFile(repoRoot, assetPath, 'CSS'), 'utf8');
