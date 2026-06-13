import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";

const PROVIDER = "rapidapi_tiktok_api" as const;

export type TikTokApi23Video = {
  id: string;
  desc: string | null;
  author: string;
  playCount: number | null;
  diggCount: number | null;
  coverUrl: string | null;
  shareUrl: string | null;
  createTime: number | null;
};

type SearchResponse = {
  item_list?: Array<Record<string, unknown>>;
  itemList?: Array<Record<string, unknown>>;
  cursor?: number;
  has_more?: boolean;
};

type UserInfoResponse = {
  userInfo?: {
    user?: {
      secUid?: string;
      uniqueId?: string;
      nickname?: string;
    };
  };
  user?: { secUid?: string; uniqueId?: string };
};

type PostsResponse = {
  data?: {
    itemList?: Array<Record<string, unknown>>;
    item_list?: Array<Record<string, unknown>>;
  };
  item_list?: Array<Record<string, unknown>>;
};

function mapVideo(raw: Record<string, unknown>, index: number): TikTokApi23Video {
  const authorObj = raw.author as Record<string, unknown> | undefined;
  const stats = raw.stats as Record<string, unknown> | undefined;
  const video = raw.video as Record<string, unknown> | undefined;
  const cover =
    (video?.cover as string | undefined) ??
    ((video?.cover as Record<string, unknown> | undefined)?.url_list as string[] | undefined)?.[0] ??
    null;

  return {
    id: String(raw.id ?? raw.aweme_id ?? `tf-${index}`),
    desc: typeof raw.desc === "string" ? raw.desc : null,
    author: String(authorObj?.uniqueId ?? authorObj?.unique_id ?? authorObj?.nickname ?? "Creator"),
    playCount: typeof stats?.playCount === "number" ? stats.playCount : null,
    diggCount: typeof stats?.diggCount === "number" ? stats.diggCount : null,
    coverUrl: typeof cover === "string" ? cover : null,
    shareUrl: typeof raw.share_url === "string" ? raw.share_url : null,
    createTime: typeof raw.createTime === "number" ? raw.createTime : null,
  };
}

function extractItems(body: SearchResponse | PostsResponse | null): Record<string, unknown>[] {
  if (!body) return [];
  const fromData = (body as PostsResponse).data;
  const list =
    (body as SearchResponse).item_list ??
    (body as SearchResponse).itemList ??
    fromData?.item_list ??
    fromData?.itemList ??
    [];
  return Array.isArray(list) ? list : [];
}

/** Tikfly — keyword video search (free tier: 100 req/mo). */
export async function searchTikTokVideosByKeyword(
  keyword: string,
  options?: { count?: number; cursor?: number }
): Promise<TikTokApi23Video[]> {
  const query = keyword.trim();
  if (!query) return [];

  const body = await rapidApiRequest<SearchResponse>({
    provider: PROVIDER,
    path: "/api/search/video",
    query: {
      keyword: query,
      count: options?.count ?? ENV.rapidApiTiktokApiMaxItems,
      cursor: options?.cursor ?? 0,
    },
  });

  return extractItems(body).map((item, i) => mapVideo(item, i));
}

export async function resolveTikTokSecUid(uniqueId: string): Promise<string | null> {
  const clean = uniqueId.replace(/^@/, "").trim();
  if (!clean) return null;

  const body = await rapidApiRequest<UserInfoResponse>({
    provider: PROVIDER,
    path: "/api/user/info",
    query: { uniqueId: clean },
    skipUsage: true,
  });

  return body?.userInfo?.user?.secUid ?? body?.user?.secUid ?? null;
}

/** Tikfly — Get User Oldest Posts (requires secUid; free tier: 100 req/mo). */
export async function fetchTikTokUserOldestPosts(
  secUid: string,
  options?: { count?: number; cursor?: number }
): Promise<TikTokApi23Video[]> {
  if (!secUid.trim()) return [];

  const body = await rapidApiRequest<PostsResponse>({
    provider: PROVIDER,
    path: "/api/user/oldest-posts",
    query: {
      secUid,
      count: options?.count ?? ENV.rapidApiTiktokApiMaxItems,
      cursor: options?.cursor ?? 0,
    },
  });

  return extractItems(body).map((item, i) => mapVideo(item, i));
}

/** Resolve username → secUid, then fetch oldest posts (2 API calls when secUid unknown). */
export async function fetchTikTokUserOldestPostsByUsername(
  username: string,
  options?: { count?: number; cursor?: number }
): Promise<TikTokApi23Video[]> {
  const secUid = await resolveTikTokSecUid(username);
  if (!secUid) return [];
  return fetchTikTokUserOldestPosts(secUid, options);
}

export function isRapidTikTokApiConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiTiktokApiEnabled;
}
