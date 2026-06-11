import type { User } from "../../drizzle/schema";
import { invokeLLMOrThrow } from "../_core/aiHelpers";
import type { Message } from "../_core/llm";
import { AGENT_TOOL_DEFINITIONS, executeAgentTool } from "./tools";

const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = `You are DropHunter AI, an expert product research and sourcing advisor for dropshippers.
Help users find winning products, validate opportunities, and decide what to watch next.

You have tools: searchProducts, addToWatchlist, validateProduct.
- Use searchProducts when the user asks to find, discover, or compare products.
- Use validateProduct when they want viability analysis on a specific item.
- Use addToWatchlist when they want to save or track a product (confirm first if ambiguous).

When citing products from search results, always include:
- sourceUrl as a markdown link when available
- rankingSummary (from rankingExplanation) to explain why it ranked well

Be concise but actionable. Offer clear next steps (validate, watchlist, or deeper search).`;

export type AgentRunResult = {
  message: string;
  totalTokens: number;
  toolCallsUsed: string[];
};

export async function runAgentConversation(
  user: User,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<AgentRunResult> {
  const llmMessages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  let totalTokens = 0;
  const toolCallsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await invokeLLMOrThrow({
      messages: llmMessages,
      tools: AGENT_TOOL_DEFINITIONS,
      toolChoice: "auto",
    });

    totalTokens += response.usage?.total_tokens ?? 0;
    const choice = response.choices[0];
    if (!choice) {
      return {
        message: "I couldn't generate a response. Please try again.",
        totalTokens,
        toolCallsUsed,
      };
    }

    const assistantMsg = choice.message;
    const toolCalls = assistantMsg.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      llmMessages.push({
        role: "assistant",
        content: typeof assistantMsg.content === "string" ? assistantMsg.content : "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        toolCallsUsed.push(tc.function.name);
        const result = await executeAgentTool(user, tc.function.name, tc.function.arguments);
        llmMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    const content = assistantMsg.content;
    const message =
      typeof content === "string"
        ? content
        : "I couldn't generate a response. Please try again.";

    return { message, totalTokens, toolCallsUsed };
  }

  return {
    message:
      "I ran several searches but need a simpler question. Try: \"Find pet grooming products under $30\".",
    totalTokens,
    toolCallsUsed,
  };
}

export async function generateSessionTitle(firstUserMessage: string): Promise<string> {
  const trimmed = firstUserMessage.trim().slice(0, 500);
  try {
    const response = await invokeLLMOrThrow({
      messages: [
        {
          role: "system",
          content:
            "Generate a short chat title (3-6 words, no quotes) summarizing the user's product research question.",
        },
        { role: "user", content: trimmed },
      ],
      maxTokens: 24,
    });
    const title = response.choices[0]?.message.content;
    if (typeof title === "string" && title.trim()) {
      return title.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    }
  } catch {
    /* fall through */
  }
  return trimmed.slice(0, 48) + (trimmed.length > 48 ? "…" : "");
}
