import Anthropic from "@anthropic-ai/sdk";

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  console.warn("[Anthropic] AI_INTEGRATIONS_ANTHROPIC_BASE_URL not set — AI features disabled");
}

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
  console.warn("[Anthropic] AI_INTEGRATIONS_ANTHROPIC_API_KEY not set — AI features disabled");
}

/** True when a real API key is present. Check this before calling `anthropic.*` so
 *  callers can fail fast with a clean "not configured" message instead of letting a
 *  raw SDK error (e.g. "invalid x-api-key") surface to the user. */
export const anthropicConfigured = Boolean(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);

export const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "placeholder",
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
});
