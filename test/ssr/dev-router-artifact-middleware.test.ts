import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';
import {
  createDevelopmentRouterArtifactMiddleware,
  resolveHtmlFilePathFromRouterArtifactRequest,
} from '../../build/dev/dev-router-artifact-middleware.js';

interface MockResponseState {
  statusCode: number;
  headers: Map<string, string>;
  body: Buffer;
  ended: boolean;
}

function createMockResponse(): {
  response: ServerResponse;
  state: MockResponseState;
} {
  const state: MockResponseState = {
    statusCode: 200,
    headers: new Map<string, string>(),
    body: Buffer.alloc(0),
    ended: false,
  };

  const response: {
    statusCode: number;
    setHeader(name: string, value: string | number | readonly string[]): ServerResponse;
    end(
      chunkOrCallback?: string | Buffer | (() => void),
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void,
    ): ServerResponse;
  } = {
    statusCode: 200,
    setHeader(name: string, value: string | number | readonly string[]) {
      const normalizedValue = Array.isArray(value) ? value.join(', ') : String(value);
      state.headers.set(name.toLowerCase(), normalizedValue);
      return response as ServerResponse;
    },
    end(
      chunkOrCallback?: string | Buffer | (() => void),
      _encodingOrCallback?: BufferEncoding | (() => void),
      _callback?: () => void,
    ) {
      if (typeof chunkOrCallback === 'string') {
        state.body = Buffer.from(chunkOrCallback);
      } else if (chunkOrCallback instanceof Buffer) {
        state.body = chunkOrCallback;
      }
      state.statusCode = response.statusCode;
      state.ended = true;
      return response as ServerResponse;
    },
  };

  return {
    response: response as ServerResponse,
    state,
  };
}

describe('dev-router-artifact-middleware', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map(async (directory) => {
        await rm(directory, { recursive: true, force: true });
      }),
    );
  });

  it('router artifact URL から対応する html ファイルを解決すること', () => {
    const outputDirectory = '/tmp/rouault/dist';

    expect(
      resolveHtmlFilePathFromRouterArtifactRequest('/__router/index.router.json', outputDirectory),
    ).toBe(path.resolve(outputDirectory, 'index.html'));

    expect(
      resolveHtmlFilePathFromRouterArtifactRequest(
        '/__router/about/index.router.json?tab=overview',
        outputDirectory,
      ),
    ).toBe(path.resolve(outputDirectory, 'about', 'index.html'));
  });

  it('router artifact URL からのパストラバーサルを拒否すること', () => {
    const outputDirectory = '/tmp/rouault/dist';

    expect(
      resolveHtmlFilePathFromRouterArtifactRequest(
        '/__router/../secret/index.router.json',
        outputDirectory,
      ),
    ).toBeNull();
  });

  it('dist 内 html から NavigationEnvelope JSON を返すこと', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-dev-router-artifact-'));
    temporaryDirectories.push(outputDirectory);

    const aboutDirectory = path.join(outputDirectory, 'about');
    await mkdir(aboutDirectory, { recursive: true });
    await writeFile(
      path.join(aboutDirectory, 'index.html'),
      [
        '<!doctype html>',
        '<html lang="ja">',
        '  <head>',
        '    <meta charset="utf-8">',
        '    <meta name="rouault-build-id" content="dev-build">',
        '    <meta name="rouault-generated-at" content="2026-04-11T00:00:00.000Z">',
        '    <title>About - Rouault</title>',
        '    <meta name="description" content="about page">',
        '  </head>',
        '  <body>',
        '    <main id="main-content"><h1>About</h1><p>Body</p></main>',
        '  </body>',
        '</html>',
      ].join('\n'),
      'utf8',
    );

    const middleware = createDevelopmentRouterArtifactMiddleware({
      outputDirectory,
      buildId: 'dev-build',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });

    const request = {
      method: 'GET',
      url: '/__router/about/index.router.json',
    } satisfies Partial<IncomingMessage>;
    const { response, state } = createMockResponse();
    let nextCalled = false;

    middleware(request as IncomingMessage, response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(state.statusCode).toBe(200);
    expect(state.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(state.headers.get('cache-control')).toBe('no-store');

    const envelope = JSON.parse(state.body.toString('utf8')) as {
      schemaVersion: string;
      buildId: string | null;
      generatedAt: string | null;
      document: {
        title: string;
        renderedKind: string;
        html: string;
      };
    };

    expect(envelope.schemaVersion).toBe(NAVIGATION_ENVELOPE_SCHEMA_VERSION);
    expect(envelope.buildId).toBe('dev-build');
    expect(envelope.generatedAt).toBe('2026-04-11T00:00:00.000Z');
    expect(envelope.document.title).toBe('About - Rouault');
    expect(envelope.document.renderedKind).toBe('page');
    expect(envelope.document.html).toContain('<h1>About</h1>');
  });


  it('dev artifact generatedAt は request をまたいでも injected metadata と一致して stable であること', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-dev-router-artifact-'));
    temporaryDirectories.push(outputDirectory);

    const aboutDirectory = path.join(outputDirectory, 'about');
    await mkdir(aboutDirectory, { recursive: true });
    await writeFile(
      path.join(aboutDirectory, 'index.html'),
      [
        '<!doctype html>',
        '<html lang="ja">',
        '  <head>',
        '    <meta charset="utf-8">',
        '    <meta name="rouault-build-id" content="dev-build">',
        '    <meta name="rouault-generated-at" content="2026-04-11T00:00:00.000Z">',
        '    <title>About - Rouault</title>',
        '  </head>',
        '  <body>',
        '    <main id="main-content"><h1>About</h1></main>',
        '  </body>',
        '</html>',
      ].join('\n'),
      'utf8',
    );

    const middleware = createDevelopmentRouterArtifactMiddleware({
      outputDirectory,
      buildId: 'dev-build',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });

    const readEnvelope = (): { buildId: string; generatedAt: string } => {
      const request = {
        method: 'GET',
        url: '/__router/about/index.router.json',
      } satisfies Partial<IncomingMessage>;
      const { response, state } = createMockResponse();

      middleware(request as IncomingMessage, response, () => {
        throw new Error('middleware should not call next for an existing router artifact.');
      });

      expect(state.statusCode).toBe(200);
      return JSON.parse(state.body.toString('utf8')) as { buildId: string; generatedAt: string };
    };

    const first = readEnvelope();
    const second = readEnvelope();

    expect(first.buildId).toBe('dev-build');
    expect(first.generatedAt).toBe('2026-04-11T00:00:00.000Z');
    expect(second).toEqual(first);
  });

  it('strict artifact mode では embedded buildId の不一致を拒否すること', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-dev-router-artifact-'));
    temporaryDirectories.push(outputDirectory);

    const aboutDirectory = path.join(outputDirectory, 'about');
    await mkdir(aboutDirectory, { recursive: true });
    await writeFile(
      path.join(aboutDirectory, 'index.html'),
      [
        '<!doctype html>',
        '<html lang="ja">',
        '  <head>',
        '    <meta charset="utf-8">',
        '    <meta name="rouault-build-id" content="dist-build">',
        '    <meta name="rouault-generated-at" content="2026-04-11T00:00:00.000Z">',
        '    <title>About - Rouault</title>',
        '  </head>',
        '  <body>',
        '    <main id="main-content"><h1>About</h1></main>',
        '    <footer class="ui-footer" data-layout-footer><p class="ui-footer__build">dist-build</p></footer>',
        '  </body>',
        '</html>',
      ].join('\n'),
      'utf8',
    );

    const middleware = createDevelopmentRouterArtifactMiddleware({
      outputDirectory,
      buildId: 'dev-build',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });

    const request = {
      method: 'GET',
      url: '/__router/about/index.router.json',
    } satisfies Partial<IncomingMessage>;
    const { response, state } = createMockResponse();

    const nextResult: { error: Error | null } = { error: null };
    middleware(request as IncomingMessage, response, (error?: Error) => {
      nextResult.error = error ?? null;
    });

    expect(state.ended).toBe(false);
    const nextError = nextResult.error;
    expect(nextError).toBeInstanceOf(Error);
    if (nextError === null) {
      throw new Error('middleware should pass strict-artifact mismatch error to next.');
    }
    expect(nextError.message).toContain('embedded buildId does not match strict-artifact buildId');
  });

  it('対応する html が存在しない場合は次の middleware へ渡すこと', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-dev-router-artifact-'));
    temporaryDirectories.push(outputDirectory);

    const middleware = createDevelopmentRouterArtifactMiddleware({
      outputDirectory,
      buildId: 'dev-build',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });

    const request = {
      method: 'GET',
      url: '/__router/missing/index.router.json',
    } satisfies Partial<IncomingMessage>;
    const { response, state } = createMockResponse();
    let nextCalled = false;

    middleware(request as IncomingMessage, response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(state.ended).toBe(false);
  });
});
