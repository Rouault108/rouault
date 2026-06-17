export interface PaginationItemsInput {
  currentPage: number;
  totalPages: number;
}

export type PaginationItem =
  | {
      kind: 'previous';
      page: number;
      disabled: boolean;
    }
  | {
      kind: 'status';
      currentPage: number;
      totalPages: number;
    }
  | {
      kind: 'next';
      page: number;
      disabled: boolean;
    };

const normalizePositivePage = (value: number): number => {
  if (!Number.isFinite(value)) return 1;

  const normalized = Math.trunc(value);
  return normalized < 1 ? 1 : normalized;
};

const normalizeCurrentPage = (value: number): number => {
  if (Number.isNaN(value)) return 1;
  if (value === Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY;
  if (value === Number.NEGATIVE_INFINITY) return 1;

  const normalized = Math.trunc(value);
  return normalized < 1 ? 1 : normalized;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const buildPaginationItems = (input: PaginationItemsInput): PaginationItem[] => {
  const totalPages = normalizePositivePage(input.totalPages);
  const currentPage = clamp(normalizeCurrentPage(input.currentPage), 1, totalPages);

  return [
    {
      kind: 'previous',
      page: Math.max(1, currentPage - 1),
      disabled: currentPage <= 1,
    },
    {
      kind: 'status',
      currentPage,
      totalPages,
    },
    {
      kind: 'next',
      page: Math.min(totalPages, currentPage + 1),
      disabled: currentPage >= totalPages,
    },
  ];
};
