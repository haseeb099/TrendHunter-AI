import { TRPCError } from "@trpc/server";
import { isAiConfigured } from "./env";
import { invokeLLM, type InvokeParams, type InvokeResult } from "./llm";
import { createLogger } from "./logger";

const log = createLogger("ai");

export function assertAiConfigured() {
  if (!isAiConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "OPENAI_API_KEY is not configured. Add it to .env — see docs/API-ENV-SETUP.md",
    });
  }
}

export async function invokeLLMOrThrow(params: InvokeParams): Promise<InvokeResult> {
  assertAiConfigured();
  log.info("llm_invoke", {
    messageCount: params.messages.length,
    hasTools: Boolean(params.tools?.length),
  });
  try {
    const result = await invokeLLM(params);
    log.info("llm_success", { model: result.model });
    return result;
  } catch (err) {
    log.error("llm_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    throw err;
  }
}

export function getAiStatus() {
  return {
    configured: isAiConfigured(),
    message: isAiConfigured()
      ? "AI features enabled"
      : "Add OPENAI_API_KEY to enable AI features",
  };
}
