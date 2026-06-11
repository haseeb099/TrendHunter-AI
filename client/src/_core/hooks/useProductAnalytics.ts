import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function useProductAnalytics() {
  const record = trpc.analytics.recordProductEvent.useMutation();

  const track = useCallback(
    (
      eventType:
        | "product_impression"
        | "product_click"
        | "drawer_open"
        | "watchlist_save"
        | "pipeline_add"
        | "ranking_explain_open",
      metadata?: Record<string, unknown>
    ) => {
      record.mutate({ eventType, metadata });
    },
    [record]
  );

  return { track };
}
