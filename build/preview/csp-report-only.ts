import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  CSP_REPORT_ONLY_HEADER,
  resolveCspReportOnly,
  type CspStageOneManifest,
} from '../security/csp-report-only.js';

// 隔離検証入口のみで使用する。複数一致を黙って上書きせず、Cloudflareのcomma結合を再現する。
export const createCspReportOnlyMiddleware =
  (manifest: Pick<CspStageOneManifest, 'rules'>) =>
  (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const pathname = new URL(request.url ?? '/', 'http://preview.local').pathname;
      const policy = resolveCspReportOnly(manifest.rules, pathname);
      if (policy !== null) response.setHeader(CSP_REPORT_ONLY_HEADER, policy);
    }
    next();
  };
