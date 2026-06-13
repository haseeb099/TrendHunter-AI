import { TRPCClientError } from "@trpc/client";

import {

  ACCOUNT_DEACTIVATED_ERR_MSG,

  ACCOUNT_FLAGGED_ERR_MSG,

  ACCOUNT_PAUSED_ERR_MSG,

  PLAN_FORBIDDEN_ERR_MSG,

  PLAN_LIMIT_ERR_MSG,

  SUBSCRIPTION_INACTIVE_ERR_MSG,

  UNAUTHED_ERR_MSG,

} from "@shared/const";

import { toast } from "sonner";



export function isRetryableTrpcError(error: unknown): boolean {

  if (!(error instanceof TRPCClientError)) return false;

  const code = error.data?.code;

  if (code === "INTERNAL_SERVER_ERROR" || code === "TIMEOUT") return true;

  if (code === "TOO_MANY_REQUESTS") return true;

  const msg = error.message.toLowerCase();

  return (

    msg.includes("unavailable") ||

    msg.includes("try again") ||

    msg.includes("provider") ||

    msg.includes("timeout")

  );

}



export function toastTrpcError(error: unknown, retry?: () => void): void {

  if (!(error instanceof TRPCClientError)) {

    toast.error("Something went wrong. Please try again.");

    return;

  }



  const msg = error.message;



  if (msg === UNAUTHED_ERR_MSG || msg.startsWith("Please login")) {

    toast.error("Please sign in to continue.", {

      action: { label: "Login", onClick: () => { window.location.href = "/login"; } },

    });

    return;

  }



  if (msg.startsWith(PLAN_FORBIDDEN_ERR_MSG) || msg.startsWith(PLAN_LIMIT_ERR_MSG)) {

    toast.error("Upgrade your plan to use this feature.", {

      action: { label: "View plans", onClick: () => { window.location.href = "/dashboard/billing"; } },

    });

    return;

  }



  if (msg === SUBSCRIPTION_INACTIVE_ERR_MSG) {

    toast.error("Your subscription is inactive.", {

      action: { label: "Billing", onClick: () => { window.location.href = "/dashboard/billing"; } },

    });

    return;

  }



  if (msg === ACCOUNT_DEACTIVATED_ERR_MSG) {

    toast.error("Your account has been deactivated. Contact support for help.");

    return;

  }



  if (msg === ACCOUNT_PAUSED_ERR_MSG) {

    toast.error("Your account is paused. Contact support to restore access.");

    return;

  }



  if (msg === ACCOUNT_FLAGGED_ERR_MSG) {

    toast.error("Your account is under review — some features are limited.");

    return;

  }



  if (retry && isRetryableTrpcError(error)) {

    toast.error(msg, { action: { label: "Retry", onClick: retry } });

    return;

  }



  toast.error(msg);

}

