export type InteractionModality = 'pointer' | 'keyboard' | 'unknown';

export interface InteractionModalityTracker {
  getSnapshot(): InteractionModality;
  destroy(): void;
}

export function createInteractionModalityTracker(
  ownerDocument: Document,
): InteractionModalityTracker {
  let currentModality: InteractionModality = 'unknown';

  const handleKeydown = (): void => {
    currentModality = 'keyboard';
  };

  const handlePointer = (): void => {
    currentModality = 'pointer';
  };

  ownerDocument.addEventListener('keydown', handleKeydown, true);
  ownerDocument.addEventListener('pointerdown', handlePointer, true);
  ownerDocument.addEventListener('mousedown', handlePointer, true);
  ownerDocument.addEventListener('touchstart', handlePointer, true);

  return {
    getSnapshot(): InteractionModality {
      return currentModality;
    },
    destroy(): void {
      ownerDocument.removeEventListener('keydown', handleKeydown, true);
      ownerDocument.removeEventListener('pointerdown', handlePointer, true);
      ownerDocument.removeEventListener('mousedown', handlePointer, true);
      ownerDocument.removeEventListener('touchstart', handlePointer, true);
    },
  };
}
