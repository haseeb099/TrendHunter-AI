import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";

const PROVIDER = "rapidapi_alibaba" as const;

/** Free tier exposes health-check only — product search disabled on basic plan. */
export async function checkRapidAlibabaHealth(): Promise<boolean> {
  const body = await rapidApiRequest<{ message?: string }>({
    provider: PROVIDER,
    path: "/alibaba/health-check",
  });
  return Boolean(body?.message?.toLowerCase().includes("running"));
}

export function isRapidAlibabaConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiAlibabaEnabled;
}
