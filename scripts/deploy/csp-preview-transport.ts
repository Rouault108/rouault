export type PreviewFetch = (url: string, init: RequestInit) => Promise<Response>;
export const nativePreviewFetch: PreviewFetch = (url, init) =>
  fetch(url, {
    ...init,
    redirect: 'manual',
    credentials: 'omit',
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });

export const readPreviewResponse = async (response: Response, limit: number): Promise<Buffer> => {
  const length = response.headers.get('content-length');
  if (length !== null && (!/^[0-9]+$/u.test(length) || Number(length) > limit))
    throw new Error('[preview-delivery] response byte limit');
  if (
    response.headers.get('content-encoding') &&
    response.headers.get('content-encoding') !== 'identity'
  )
    throw new Error('[preview-delivery] encoded response is unsupported');
  const reader = response.body?.getReader();
  if (!reader) {
    if (length !== null && Number(length) !== 0)
      throw new Error('[preview-delivery] truncated response');
    return Buffer.alloc(0);
  }
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new Error('[preview-delivery] response byte limit');
      }
      parts.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = Buffer.concat(parts);
  if (length !== null && Number(length) !== result.length)
    throw new Error('[preview-delivery] truncated response');
  return result;
};
export const readPreviewJson = async (response: Response): Promise<unknown> => {
  if (
    response.status !== 200 ||
    !/^application\/json(?:;|$)/iu.test(response.headers.get('content-type') ?? '')
  )
    throw new Error('[preview-delivery] API response unavailable');
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        await readPreviewResponse(response, 8 * 1024 * 1024),
      ),
    ) as unknown;
  } catch {
    throw new Error('[preview-delivery] invalid bounded API response');
  }
};
