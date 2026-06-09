import crypto from "node:crypto";
import { ENV } from "../_core/env";

const TIKTOK_API_BASE = "https://open-api.tiktokglobalshop.com";

type TikTokShopRequestOptions = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
};

function buildSignature(
  path: string,
  query: Record<string, string | number | undefined>,
  body: string
): string {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params[key] = String(value);
    }
  }

  delete params.sign;
  delete params.access_token;
  delete params["x-tts-access-token"];

  const sortedKeys = Object.keys(params).sort();
  let payload = path;
  for (const key of sortedKeys) {
    payload += `${key}${params[key]}`;
  }
  if (body) payload += body;

  const wrapped = `${ENV.tiktokAppSecret}${payload}${ENV.tiktokAppSecret}`;
  return crypto.createHmac("sha256", ENV.tiktokAppSecret).update(wrapped).digest("hex");
}

export async function tiktokShopRequest<T = unknown>(
  options: TikTokShopRequestOptions
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000);
  const query: Record<string, string | number | undefined> = {
    app_key: ENV.tiktokAppKey,
    timestamp,
    ...options.query,
  };

  if (ENV.tiktokShopCipher) {
    query.shop_cipher = ENV.tiktokShopCipher;
  }

  const bodyString =
    options.method === "POST" && options.body !== undefined
      ? JSON.stringify(options.body)
      : "";

  query.sign = buildSignature(options.path, query, bodyString);

  const url = new URL(options.path, TIKTOK_API_BASE);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: options.method,
    headers: {
      "content-type": "application/json",
      ...(ENV.tiktokAccessToken
        ? { "x-tts-access-token": ENV.tiktokAccessToken }
        : {}),
    },
    body: options.method === "POST" ? bodyString : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TikTok Shop API failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { code?: number; message?: string; data?: T };
  if (json.code !== undefined && json.code !== 0) {
    throw new Error(json.message ?? `TikTok Shop API error (${json.code})`);
  }

  return json.data as T;
}
