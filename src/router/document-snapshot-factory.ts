import type { DocumentSnapshot } from './router-types.js';
import { MAIN_CONTENT_SELECTOR } from '../../shared/navigation/main-landmark-contract.js';

export class DocumentContractViolationError extends Error {
  override name = 'DocumentContractViolationError' as const;
}

export class DocumentSnapshotFactory {
  create(documentSnapshot: Document): DocumentSnapshot {
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
    const contentRoot = documentSnapshot.querySelector(MAIN_CONTENT_SELECTOR);

    if (contentRoot instanceof Element) {
      return contentRoot;
    }

    throw new DocumentContractViolationError('遷移対象文書が `main#main-content` を持っていません。');
  }
}
