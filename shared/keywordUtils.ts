/** Normalize and bound keywords for search / intelligence APIs */
export function sanitizeKeyword(input: string, maxLen = 120): string {
  return input
    .trim()
    .replace(/[\x00-\x1f\x7f]/g, "")
    .slice(0, maxLen);
}

export function keywordToSlug(keyword: string): string {
  return encodeURIComponent(
    sanitizeKeyword(keyword)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export function slugToKeyword(slug: string): string {
  try {
    return sanitizeKeyword(decodeURIComponent(slug).replace(/-/g, " "));
  } catch {
    return sanitizeKeyword(slug.replace(/-/g, " "));
  }
}
