export class HeadManager {
  setTitle(title: string): void {
    document.title = title;
  }

  setMetaDescription(description: string | null): void {
    const normalized = typeof description === 'string' ? description.trim() : '';
    const currentMetaTag = document.querySelector('meta[name="description"]');

    if (normalized.length === 0) {
      currentMetaTag?.remove();
      return;
    }

    let metaTag = currentMetaTag;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'description');
      document.head.appendChild(metaTag);
    }

    metaTag.setAttribute('content', normalized);
  }
}
