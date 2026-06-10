export function safeRedirectPath(redirect: string | null | undefined, fallback: string): string {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return fallback;
  }
  return redirect;
}
