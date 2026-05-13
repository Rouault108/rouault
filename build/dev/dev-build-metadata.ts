import { resolveDevelopmentBuildMetadata } from '../metadata/build-metadata.js';

export const devBuildMetadata = resolveDevelopmentBuildMetadata();
export const devBuildId = devBuildMetadata.buildId;
export const devBuildLabel = devBuildMetadata.buildLabel;
export const devGeneratedAt = devBuildMetadata.generatedAt;
