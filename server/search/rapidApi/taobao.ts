import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";

const PROVIDER = "rapidapi_taobao" as const;

/** Utility: decrypt Taobao itemIdStr — on-demand only, not bulk ingest. */
export async function convertTaobaoItemIdStr(itemIdStr: string): Promise<string | null> {
  const body = await rapidApiRequest<{ itemId?: string; data?: { itemId?: string } }>({
    provider: PROVIDER,
    path: "/itemidstr_convert",
    method: "POST",
    body: { itemIdStr },
  });

  return body?.itemId ?? body?.data?.itemId ?? null;
}

export function isRapidTaobaoConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiTaobaoEnabled;
}
