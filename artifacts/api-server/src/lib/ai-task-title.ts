import { anthropic } from "@workspace/integrations-anthropic-ai";

/**
 * Generate a short, action-oriented task title from an email so the rep's
 * Actions tab reads like a real to-do list ("Send pricing breakdown to
 * Acme") instead of an echo of the subject line ("Reply to: Re: hi").
 *
 * Falls back to the original subject-based title on any failure so the
 * email flow never breaks because the LLM is unavailable.
 */
export async function generateEmailTaskTitle(opts: {
  direction: "outbound" | "inbound";
  subject: string;
  body: string;
  counterpartName?: string | null;
  counterpartEmail?: string | null;
}): Promise<string> {
  const { direction, subject, body, counterpartName, counterpartEmail } = opts;
  const fallback =
    direction === "outbound"
      ? `Sent email: ${subject}`
      : `Reply to: ${subject}`;

  try {
    const counterpart = counterpartName || counterpartEmail || "the recipient";
    const trimmedBody = (body || "").replace(/\s+/g, " ").trim().slice(0, 1500);
    if (!trimmedBody) return fallback;

    const verb =
      direction === "outbound"
        ? `The sales rep just sent this email to ${counterpart}. Phrase the task as a past-tense log entry of what was done (e.g. "Sent pricing proposal to Acme", "Shared demo recording with John").`
        : `The sales rep just received this email from ${counterpart}. Phrase the task as an imperative next-step the rep should do (e.g. "Send pricing breakdown to Acme", "Schedule demo with John", "Reply with NDA").`;

    const prompt =
      `${verb}\n\n` +
      `Subject: ${subject}\n` +
      `Body:\n${trimmedBody}\n\n` +
      `Respond with ONLY the task title — no quotes, no prefix, no trailing punctuation. Max 80 characters. Be specific about what the email is actually about.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }],
    });

    const block = (response.content as Array<{ type: string; text?: string }>).find((b) => b.type === "text");
    const text = (block?.text ?? "").trim().replace(/^["']|["']$/g, "").replace(/\.$/, "").trim();
    if (!text) return fallback;
    return text.length > 100 ? text.slice(0, 100) : text;
  } catch (err) {
    console.warn("[ai-task-title] generation failed, using fallback:", err);
    return fallback;
  }
}
