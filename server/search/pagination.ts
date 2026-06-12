import type { SearchPagination } from "@shared/searchTypes";

export function paginateResults<T>(
  items: T[],
  pagination?: SearchPagination
): { items: T[]; totalCount: number; nextCursor?: number } {
  const totalCount = items.length;
  const cursor = Math.max(0, pagination?.cursor ?? 0);
  const limit = Math.min(Math.max(1, pagination?.limit ?? 50), 500);
  const page = items.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < totalCount ? cursor + limit : undefined;
  return { items: page, totalCount, nextCursor };
}
