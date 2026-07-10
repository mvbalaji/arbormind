import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  console.warn("[OpenAI] AI_INTEGRATIONS_OPENAI_BASE_URL not set — AI features disabled");
}

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  console.warn("[OpenAI] AI_INTEGRATIONS_OPENAI_API_KEY not set — AI features disabled");
}

/** True when a real API key is present. Check this before calling `openai.*` so
 *  callers can fail fast with a clean "not configured" message instead of letting a
 *  raw SDK error surface to the user. */
export const openaiConfigured = Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY);

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "placeholder",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1",
});
