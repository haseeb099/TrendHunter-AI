export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export function getLoginUrl(returnPath?: string): string {
  const redirect = returnPath ?? "/dashboard";
  const params = new URLSearchParams();
  if (redirect.startsWith("/")) {
    params.set("redirect", redirect);
  }
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function getRegisterUrl(returnPath?: string): string {
  const redirect = returnPath ?? "/dashboard";
  const params = new URLSearchParams();
  if (redirect.startsWith("/")) {
    params.set("redirect", redirect);
  }
  const query = params.toString();
  return query ? `/register?${query}` : "/register";
}
