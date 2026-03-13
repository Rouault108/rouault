import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createStaticDirectoryMiddleware,
  resolveStaticFilePath,
} from '../../src/lib/dev-static-directory.js';

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

describe('dev-static-directory', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map(async (directory) => {
        await rm(directory, { recursive: true, force: true });
      }),
    );
  });

  it('route prefix 配下の静的ファイルパスを解決すること', () => {
    const resolved = resolveStaticFilePath('/pagefind/pagefind.js', '/pagefind/', '/tmp/rouault/dist/pagefind');

    expect(resolved).toBe(path.resolve('/tmp/rouault/dist/pagefind', 'pagefind.js'));
  });

  it('route prefix からのパストラバーサルを拒否すること', () => {
    const resolved = resolveStaticFilePath('/pagefind/../secret.txt', '/pagefind/', '/tmp/rouault/dist/pagefind');

    expect(resolved).toBeNull();
  });

  it('対象ディレクトリ内の pagefind アセットを返すこと', async () => {
    const rootDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-pagefind-'));
    temporaryDirectories.push(rootDirectory);
    await writeFile(path.join(rootDirectory, 'pagefind.js'), 'export const ok = true;\n', 'utf8');

    const middleware = createStaticDirectoryMiddleware('/pagefind/', rootDirectory);
    const request = {
      method: 'GET',
      url: '/pagefind/pagefind.js',
    } satisfies Partial<IncomingMessage>;
    const { response, state } = createMockResponse();
    let nextCalled = false;

    middleware(
      request as IncomingMessage,
      response,
      () => {
        nextCalled = true;
      },
    );

    expect(nextCalled).toBe(false);
    expect(state.statusCode).toBe(200);
    expect(state.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(state.headers.get('cache-control')).toBe('no-store');
    expect(state.body.toString('utf8')).toBe('export const ok = true;\n');
  });

  it('存在しないファイルは次の middleware へ渡すこと', async () => {
    const rootDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-pagefind-'));
    temporaryDirectories.push(rootDirectory);
    await mkdir(path.join(rootDirectory, 'fragments'), { recursive: true });

    const middleware = createStaticDirectoryMiddleware('/pagefind/', rootDirectory);
    const request = {
      method: 'GET',
      url: '/pagefind/missing.js',
    } satisfies Partial<IncomingMessage>;
    const { response, state } = createMockResponse();
    let nextCalled = false;

    middleware(
      request as IncomingMessage,
      response,
      () => {
        nextCalled = true;
      },
    );

    expect(nextCalled).toBe(true);
    expect(state.ended).toBe(false);
  });
});
