export const createSearchAvailability = () => {
  let current: object | undefined;
  let saved = false;
  let available = false;
  return {
    isAvailable: () => available,
    isCurrent: (attempt: object) => attempt === current,
    begin: (): object => {
      current = {};
      available = false;
      saved = false;
      return current;
    },
    contentSaved: (attempt: object): void => {
      if (attempt === current) saved = true;
    },
    complete: (attempt: object): void => {
      if (attempt === current && saved) available = true;
    },
    fail: (attempt: object): void => {
      if (attempt === current) {
        available = false;
        saved = false;
      }
    },
  };
};
export type SearchAvailability = ReturnType<typeof createSearchAvailability>;

// server設定が初回生成より後でも、同じ状態を参照し続ける。
export const developmentSearchAvailability = createSearchAvailability();

export const createContentBuildLifecycle = (options: {
  availability: SearchAvailability;
  generateContent: () => Promise<unknown>;
  copyStaticArtifacts: () => Promise<void>;
  emitSearch: () => Promise<void>;
}) => {
  const attempts = new WeakMap<object, object>();
  return {
    before: async (event: unknown): Promise<void> => {
      const attempt = options.availability.begin();
      if (!event || typeof event !== 'object')
        throw new Error('[content] missing Eleventy build event');
      attempts.set(event, attempt);
      try {
        await options.generateContent();
        options.availability.contentSaved(attempt);
      } catch (error) {
        options.availability.fail(attempt);
        attempts.delete(event);
        throw error;
      }
    },
    after: async (event: unknown): Promise<void> => {
      if (!event || typeof event !== 'object') return;
      const attempt = attempts.get(event);
      if (!attempt || !options.availability.isCurrent(attempt)) return;
      attempts.delete(event);
      try {
        // EleventyはHTMLとpassthrough copyの成功後にだけafterをawaitする。
        await options.copyStaticArtifacts();
        await options.emitSearch();
        options.availability.complete(attempt);
      } catch (error) {
        options.availability.fail(attempt);
        throw error;
      }
    },
  };
};
