import type { DocumentSnapshot } from './router-types.js';

const MAIN_CONTENT_SELECTOR = 'main#main-content';
const FALLBACK_MAIN_SELECTOR = 'main';

export class DocumentContractViolationError extends Error {
  override name = 'DocumentContractViolationError' as const;
}

export class DocumentSnapshotFactory {
  async create(documentSnapshot: Document): Promise<DocumentSnapshot> {
    const contentRoot = this.resolveContentRoot(documentSnapshot);

    return {
      kind: 'page',
      html: contentRoot.innerHTML,
      title: documentSnapshot.title,
      metaDescription:
        documentSnapshot.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
      shell: null,
      announcedTitle: documentSnapshot.title,
    };
  }

  private resolveContentRoot(documentSnapshot: Document): Element {
    const preferredRoot =
      documentSnapshot.querySelector(MAIN_CONTENT_SELECTOR) ??
      documentSnapshot.querySelector(FALLBACK_MAIN_SELECTOR);

    if (preferredRoot instanceof Element) {
      return preferredRoot;
    }

    throw new DocumentContractViolationError(
      '遷移対象文書が `main#main-content` または `main` を持っていません。',
    );
  }
}
