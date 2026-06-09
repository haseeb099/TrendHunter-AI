import crypto from "crypto";

/** AliExpress Open Platform MD5 sign (TOP API) */
export function signAliExpressParams(
  params: Record<string, string>,
  appSecret: string
): string {
  const sorted = Object.keys(params).sort();
  const base = sorted.map((key) => `${key}${params[key]}`).join("");
  return crypto
    .createHash("md5")
    .update(`${appSecret}${base}${appSecret}`)
    .digest("hex")
    .toUpperCase();
}
