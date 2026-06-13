import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";

const PROVIDER = "rapidapi_tiktok_scraper" as const;

export type TikTokScraperVideo = {
  id: string;
  desc: string | null;
  author: string;
  playCount: number | null;
  diggCount: number | null;
  coverUrl: string | null;
  shareUrl: string | null;
};

type MediaFeedResponse = {
  status?: string;
  data?: {
    aweme_list?: Array<Record<string, unknown>> | null;
    itemList?: Array<Record<string, unknown>> | null;
    user?: Record<string, unknown>;
  };
};

function mapVideo(raw: Record<string, unknown>, index: number): TikTokScraperVideo {
  const authorObj = raw.author as Record<string, unknown> | undefined;
  const stats = raw.stats as Record<string, unknown> | undefined;
  const video = raw.video as Record<string, unknown> | undefined;
  const coverObj = video?.cover as Record<string, unknown> | undefined;
  const originCover = video?.origin_cover as Record<string, unknown> | undefined;
  const coverList = (coverObj?.url_list ?? originCover?.url_list) as string[] | undefined;
  const cover = coverList?.[0] ?? raw.cover ?? null;

  return {
    id: String(raw.id ?? raw.aweme_id ?? `mc-${index}`),
    desc: typeof raw.desc === "string" ? raw.desc : null,
    author: String(
      authorObj?.unique_id ?? authorObj?.uniqueId ?? authorObj?.nickname ?? "Creator"
    ),
    playCount: typeof stats?.play_count === "number" ? stats.play_count : null,
    diggCount: typeof stats?.digg_count === "number" ? stats.digg_count : null,
    coverUrl: typeof cover === "string" ? cover : null,
    shareUrl: typeof raw.share_url === "string" ? raw.share_url : null,
  };
}

/** MediaCrawlers — User Media Feed by Username (free tier: 100 req/mo). */
export async function fetchTikTokUserMediaFeed(
  username: string,
  options?: { count?: number; cursor?: number }
): Promise<TikTokScraperVideo[]> {
  const clean = username.replace(/^@/, "").trim();
  if (!clean) return [];

  const count = options?.count ?? ENV.rapidApiTiktokScraperMaxItems;
  const cursor = options?.cursor ?? 0;

  const body = await rapidApiRequest<MediaFeedResponse>({
    provider: PROVIDER,
    path: "/user/feed",
    query: {
      username: clean,
      count,
      cursor,
    },
  });

  if (!body?.data) return [];

  const items = body.data.aweme_list ?? body.data.itemList ?? [];
  if (!Array.isArray(items)) return [];
  return items.map((item, i) => mapVideo(item, i));
}

export function isRapidTikTokScraperConfigured(): boolean {
  return (
    Boolean(ENV.rapidApiKey) &&
    ENV.rapidApiEnabled &&
    ENV.rapidApiTiktokScraperEnabled
  );
}
