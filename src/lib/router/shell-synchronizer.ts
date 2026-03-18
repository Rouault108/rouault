export class ShellSynchronizer {
  applyFromDocument(doc: Document): void {
    const currentHeader = document.querySelector('layout-header');
    if (!(currentHeader instanceof HTMLElement)) {
      return;
    }

    const nextHeader = doc.querySelector('layout-header');
    const nextBreadcrumbsJson = nextHeader?.getAttribute('breadcrumbs-json') ?? '';
    currentHeader.setAttribute('breadcrumbs-json', nextBreadcrumbsJson);
    currentHeader.toggleAttribute('note-layout', nextHeader?.hasAttribute('note-layout') ?? false);
  }

  clear(): void {
    const currentHeader = document.querySelector('layout-header');
    if (!(currentHeader instanceof HTMLElement)) {
      return;
    }

    currentHeader.setAttribute('breadcrumbs-json', '');
    currentHeader.toggleAttribute('note-layout', false);
  }
}