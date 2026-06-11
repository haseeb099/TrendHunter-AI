import { trpc } from "@/lib/trpc";
import {
  ACCOUNT_DEACTIVATED_ERR_MSG,
  ACCOUNT_FLAGGED_ERR_MSG,
  ACCOUNT_PAUSED_ERR_MSG,
  PLAN_FORBIDDEN_ERR_MSG,
  PLAN_LIMIT_ERR_MSG,
  SUBSCRIPTION_INACTIVE_ERR_MSG,
  UNAUTHED_ERR_MSG,
} from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { initSentry } from "./lib/sentry";
import "./index.css";

initSentry();

function injectAnalytics() {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  if (!endpoint || !websiteId || typeof document === "undefined") return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint.replace(/\/$/, "")}/script.js`;
  script.setAttribute("data-website-id", websiteId);
  document.head.appendChild(script);
}

injectAnalytics();

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (isUnauthorized) {
    window.location.href = getLoginUrl();
    return;
  }

  const needsUpgrade =
    error.message.startsWith(PLAN_FORBIDDEN_ERR_MSG) ||
    error.message.startsWith(PLAN_LIMIT_ERR_MSG);
  if (needsUpgrade && !window.location.pathname.includes("/dashboard/billing")) {
    window.location.href = "/dashboard/billing";
    return;
  }

  const accountRestricted =
    error.message === ACCOUNT_DEACTIVATED_ERR_MSG ||
    error.message === ACCOUNT_PAUSED_ERR_MSG ||
    error.message === ACCOUNT_FLAGGED_ERR_MSG ||
    error.message === SUBSCRIPTION_INACTIVE_ERR_MSG;
  if (accountRestricted && !window.location.pathname.includes("/dashboard/billing")) {
    window.location.href = "/dashboard/billing";
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
