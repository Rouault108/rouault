import type { DocumentSnapshot } from './router-types.js';
import { MAIN_CONTENT_SELECTOR } from '../../shared/navigation/main-landmark-contract.js';

const FALLBACK_MAIN_SELECTOR = 'main';

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
    // SSR strict 化後も旧来の `main` だけを返す文書を吸収するための暫定互換です。
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
