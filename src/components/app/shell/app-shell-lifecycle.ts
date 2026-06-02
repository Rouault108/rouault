let currentShellCommitId = 0;
let nextShellCommitId = 1;

export const readCurrentShellCommitId = (): number => currentShellCommitId;

export const reserveShellCommitId = (): number => {
  const reserved = nextShellCommitId;
  nextShellCommitId += 1;
  return reserved;
};

export const commitShellGeneration = (shellCommitId: number): void => {
  currentShellCommitId = shellCommitId;
};

export const restoreShellGeneration = (shellCommitId: number): void => {
  currentShellCommitId = shellCommitId;
};

export const resetShellLifecycleForTest = (): void => {
  currentShellCommitId = 0;
  nextShellCommitId = 1;
};
