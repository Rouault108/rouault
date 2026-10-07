import type { ImageInputGuards } from '../../build/media/validate-image-inputs.js';
import {
  createGitPublicationPorts,
  dryRunGitPublication,
  type GitPublicationOptions,
} from './git-publication-ports.js';
import {
  createGitHubDeploymentProofReader,
  type AuthenticatedActionsTransport,
  type ArtifactReadLimits,
} from './read-github-deployment-proof.js';
import { createMemoDeploymentVerifier } from './verify-memo-deployment.js';
import { executePublicationOperation } from './publish-snapshot.js';
import type { PrivateCommand } from './private-command.js';

/** Called by the existing private Metis request handler after it resolves a specific user request. */
export const runManualMemoRequest = async (
  input: Omit<GitPublicationOptions, 'verifyDeployment'> & {
    actions: AuthenticatedActionsTransport;
    command: PrivateCommand;
    artifactLimits: ArtifactReadLimits;
    siteOrigin: string;
    basePath: string;
    allowedMediaOrigins: readonly string[];
    httpTimeoutMs: number;
    maxHttpResponseBytes: number;
    guards: ImageInputGuards;
    rightsConfirmedFor?: ReadonlySet<string>;
    archiveReferencesVerified?: boolean;
  },
) => {
  const execution: unknown = input.execution;
  if (execution !== 'dry-run' && execution !== 'publication')
    throw new Error('[publication] explicit execution mode required');
  const verifyDeployment = createMemoDeploymentVerifier({
    readVerifiedProof: createGitHubDeploymentProofReader({
      actions: input.actions,
      command: input.command,
      limits: input.artifactLimits,
    }),
    siteOrigin: input.siteOrigin,
    basePath: input.basePath,
    allowedMediaOrigins: input.allowedMediaOrigins,
    timeoutMs: input.httpTimeoutMs,
    maxResponseBytes: input.maxHttpResponseBytes,
  });
  const options = { ...input, verifyDeployment };
  const config = {
    guards: input.guards,
    ...(input.initializeEmpty ? { initializeEmpty: true } : {}),
    ...(input.rightsConfirmedFor ? { rightsConfirmedFor: input.rightsConfirmedFor } : {}),
    ...(input.archiveReferencesVerified !== undefined
      ? { archiveReferencesVerified: input.archiveReferencesVerified }
      : {}),
  };
  if (input.execution === 'dry-run')
    return { execution: 'dry-run' as const, plan: await dryRunGitPublication(options, config) };
  const ports = await createGitPublicationPorts(options);
  return {
    execution: 'publication' as const,
    result: await executePublicationOperation(input.operation, ports, config),
  };
};
