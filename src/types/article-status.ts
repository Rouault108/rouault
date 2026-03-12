export const ARTICLE_STATUSES = ['draft', 'archived', 'wip', 'deprecated'] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export type NoteStatus = ArticleStatus | '';
