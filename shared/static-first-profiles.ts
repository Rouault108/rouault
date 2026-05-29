export type StaticFirstRuntimeProfile = 'note' | 'page' | 'shell' | 'layout';

export type StaticFirstToolingProfile = 'storybook' | 'design-system';

export type StaticFirstSurfaceProfile = StaticFirstRuntimeProfile;

export type SsrComponentProfile = StaticFirstRuntimeProfile;

export type HydrationRegistryProfile = StaticFirstRuntimeProfile | StaticFirstToolingProfile;
