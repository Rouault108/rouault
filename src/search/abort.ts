export function createAbortError(): DOMException | Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Search aborted.', 'AbortError');
  }

  const error = new Error('Search aborted.');
  error.name = 'AbortError';
  return error;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return;
  }

  throw createAbortError();
}

export function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}
