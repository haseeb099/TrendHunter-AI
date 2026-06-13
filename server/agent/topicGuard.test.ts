import { describe, expect, it } from "vitest";
import { assessAgentMessageTopic } from "./topicGuard";

describe("assessAgentMessageTopic", () => {
  it("allows e-commerce product questions", () => {
    expect(assessAgentMessageTopic("How do I calculate margin on a $12 product?").allowed).toBe(true);
    expect(assessAgentMessageTopic("Find pet grooming suppliers on AliExpress").allowed).toBe(true);
    expect(assessAgentMessageTopic("Compare competitors for wireless earbuds").allowed).toBe(true);
  });

  it("blocks clearly off-topic requests", () => {
    expect(assessAgentMessageTopic("Who should I vote for in the election?").allowed).toBe(false);
    expect(assessAgentMessageTopic("What's the weather in London tomorrow?").allowed).toBe(false);
  });

  it("allows greetings", () => {
    expect(assessAgentMessageTopic("Hi").allowed).toBe(true);
  });

  it("blocks vague non-commerce short prompts", () => {
    expect(assessAgentMessageTopic("Tell me a joke").allowed).toBe(false);
  });
});
