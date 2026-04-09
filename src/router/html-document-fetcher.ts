export class HtmlDocumentFetcher {
  fetch(url: string, signal: AbortSignal): Promise<Response> {
    return fetch(url, { signal });
  }
}
