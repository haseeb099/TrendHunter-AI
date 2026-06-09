import { TRPCError } from "@trpc/server";
import { isAiConfigured } from "./env";
import { invokeLLM, type InvokeParams, type InvokeResult } from "./llm";

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
  return invokeLLM(params);
}

export function getAiStatus() {
  return {
    configured: isAiConfigured(),
    message: isAiConfigured()
      ? "AI features enabled"
      : "Add OPENAI_API_KEY to enable AI features",
  };
}
