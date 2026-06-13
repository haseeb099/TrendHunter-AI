import { AGENT_OFF_TOPIC_REPLY } from "@shared/agentScope";

const ECOMMERCE_SIGNALS =
  /\b(e-?commerce|ecom|dropship|dropshipping|shopify|amazon|ebay|etsy|tiktok\s*shop|aliexpress|alibaba|1688|supplier|sourcing|wholesale|margin|profit|landed\s*cost|cogs|roi|roas|cpc|cpa|aov|sku|inventory|fulfillment|watchlist|validate|validation|competitor|spy|niche|product|listing|marketplace|trend|demand|saturation|conversion|checkout|cart|store|brand|ads?|creative|ugc|hashtag|fulfill|shipping|freight|customs|tariff|moq|sample|vetting|gap\s*finder|intel)\b/i;

const OFF_TOPIC_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(president|election|politic|democrat|republican|vote)\b/i, label: "politics" },
  { pattern: /\b(religion|bible|quran|prayer|church|mosque)\b/i, label: "religion" },
  { pattern: /\b(recipe|cook(ing)?|restaurant menu)\b/i, label: "cooking" },
  { pattern: /\b(diagnos|symptom|medicine|prescription|doctor)\b/i, label: "medical" },
  { pattern: /\b(homework|essay|thesis|dissertation)\b/i, label: "academic" },
  { pattern: /\b(write me a poem|love letter|horoscope|astrology)\b/i, label: "personal" },
  { pattern: /\b(hack(ing)?|exploit|malware|phishing|steal password)\b/i, label: "security abuse" },
  { pattern: /\b(ignore (all )?(previous|prior|above) instructions|jailbreak|dan mode|pretend you are not)\b/i, label: "prompt injection" },
  { pattern: /\b(who (are|is) you|what model|system prompt|reveal (your )?instructions)\b/i, label: "meta prompt" },
];

const STRONG_OFF_TOPIC =
  /\b(weather|forecast|football score|nba game|movie review|celebrity gossip|tell me a joke|joke|horoscope|translate this paragraph)\b/i;

const GENERIC_CHITCHAT =
  /^(tell me (a )?(joke|story)|what('s| is) (your )?name|who (are|made) you|how are you|what can you do(?!\s+(with|about)\s+(product|supplier|margin|profit)))\b/i;

export type TopicGuardResult =
  | { allowed: true }
  | { allowed: false; reply: string; reason: string };

export function assessAgentMessageTopic(content: string): TopicGuardResult {
  const text = content.trim();
  if (!text) {
    return { allowed: false, reply: "Please enter a question about product research.", reason: "empty" };
  }

  if (text.length > 4000) {
    return {
      allowed: false,
      reply: "Your message is too long. Please shorten it and stay focused on product research.",
      reason: "too_long",
    };
  }

  for (const { pattern, label } of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text) && !ECOMMERCE_SIGNALS.test(text)) {
      return { allowed: false, reply: AGENT_OFF_TOPIC_REPLY, reason: label };
    }
  }

  if (STRONG_OFF_TOPIC.test(text) && !ECOMMERCE_SIGNALS.test(text)) {
    return { allowed: false, reply: AGENT_OFF_TOPIC_REPLY, reason: "off_topic" };
  }

  if (GENERIC_CHITCHAT.test(text) && !ECOMMERCE_SIGNALS.test(text)) {
    return { allowed: false, reply: AGENT_OFF_TOPIC_REPLY, reason: "chitchat" };
  }

  // Short generic chitchat without commerce context
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|cool)[!.?\s]*$/i.test(text)) {
    return { allowed: true };
  }

  // Require at least one commerce signal for very short messages (≤ 4 words)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 4 && !ECOMMERCE_SIGNALS.test(text)) {
    return { allowed: false, reply: AGENT_OFF_TOPIC_REPLY, reason: "too_vague" };
  }

  return { allowed: true };
}
