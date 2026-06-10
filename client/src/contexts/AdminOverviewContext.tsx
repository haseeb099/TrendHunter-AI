import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { createContext, useContext } from "react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminOverviewData = RouterOutputs["admin"]["getOverview"];

export type AdminOverviewQuery = {
  data: AdminOverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: { message: string } | null;
  refetch: () => void;
};

const AdminOverviewContext = createContext<AdminOverviewQuery | null>(null);

export function AdminOverviewProvider({ children }: { children: React.ReactNode }) {
  const overview = trpc.admin.getOverview.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return (
    <AdminOverviewContext.Provider value={overview}>{children}</AdminOverviewContext.Provider>
  );
}

export function useAdminOverview() {
  const context = useContext(AdminOverviewContext);
  if (!context) {
    throw new Error("useAdminOverview must be used within AdminOverviewProvider");
  }
  return context;
}
