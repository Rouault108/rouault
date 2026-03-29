import { setProjectAnnotations } from '@storybook/web-components';
import * as previewAnnotations from './preview';

const normalizedProjectAnnotations = setProjectAnnotations(previewAnnotations);

(
  globalThis as typeof globalThis & {
    globalProjectAnnotations?: typeof normalizedProjectAnnotations;
  }
).globalProjectAnnotations = normalizedProjectAnnotations;
