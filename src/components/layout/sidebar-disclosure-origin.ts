interface Episode {
  initialOpen: boolean;
  expectedOpen: boolean;
  firstOperation: number;
  lastOperation: number;
  generation: number;
  user: boolean;
  source: Event | null;
}

/** coalesced toggleの始点と終点を保持し、帰属不明な変更を永続化しない。 */
export class SidebarDisclosureOrigin {
  private episodes = new Map<HTMLDetailsElement, Episode>();
  private operation = 0;

  clear(): void {
    this.episodes.clear();
  }

  native(details: HTMLDetailsElement, event: Event, generation: number): void {
    const previous = this.episodes.get(details);
    this.episodes.delete(details);
    if (!event.isTrusted) return;
    const operation = ++this.operation;
    const episode: Episode = {
      initialOpen: previous?.initialOpen ?? details.open,
      expectedOpen: !details.open,
      firstOperation: previous?.firstOperation ?? operation,
      lastOperation: operation,
      generation,
      user: previous === undefined,
      source: event,
    };
    this.episodes.set(details, episode);
    queueMicrotask(() => {
      if (event.defaultPrevented && this.episodes.get(details) === episode)
        this.episodes.delete(details);
    });
  }

  write(details: HTMLDetailsElement, open: boolean, generation: number, user: boolean): void {
    if (details.open === open) return;
    const previous = this.episodes.get(details);
    const operation = ++this.operation;
    this.episodes.set(details, {
      initialOpen: previous?.initialOpen ?? details.open,
      expectedOpen: open,
      firstOperation: previous?.firstOperation ?? operation,
      lastOperation: operation,
      generation,
      user:
        user &&
        (previous === undefined ||
          (previous.user && previous.generation === generation && previous.source === null)),
      source: null,
    });
    details.open = open;
  }

  consume(details: HTMLDetailsElement, event: ToggleEvent, generation: number): boolean {
    const episode = this.episodes.get(details);
    this.episodes.delete(details);
    return (
      event.isTrusted &&
      episode !== undefined &&
      episode.user &&
      episode.generation === generation &&
      (episode.source === null || (episode.source.isTrusted && !episode.source.defaultPrevented)) &&
      event.oldState === (episode.initialOpen ? 'open' : 'closed') &&
      event.newState === (episode.expectedOpen ? 'open' : 'closed') &&
      details.open === episode.expectedOpen
    );
  }
}
