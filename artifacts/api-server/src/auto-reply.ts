import path from "node:path";
import { promises as fs } from "node:fs";
import { db, emailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const CATALOGUE_FILENAME = "RTindall_Fire_Protection_Catalogue_with_Pricing.pdf";

// The api-server runs with cwd = artifacts/api-server, but the catalogue lives at
// <repo-root>/attached_assets/. Try a few candidate locations and use whichever exists,
// with an explicit CATALOGUE_PATH env override for production deployments.
const CATALOGUE_CANDIDATES = [
  process.env.CATALOGUE_PATH,
  path.resolve(process.cwd(), "attached_assets", CATALOGUE_FILENAME),
  path.resolve(process.cwd(), "..", "..", "attached_assets", CATALOGUE_FILENAME),
  path.resolve(process.cwd(), "..", "attached_assets", CATALOGUE_FILENAME),
  path.resolve("/home/runner/workspace/attached_assets", CATALOGUE_FILENAME),
].filter((p): p is string => Boolean(p));

const FALLBACK_REPLY = `Hello,

Thank you for reaching out to RTindall Fire Protection. We've received your message and a member of our support team will get back to you shortly with a personalised response.

If your enquiry is urgent, please reply to this email with any additional details.

Kind regards,
RTindall Fire Protection — Support Team
support@arbormind.in`;

let cachedCatalogueText: string | null = null;
let cachedCataloguePath: string | null = null;

async function resolveCataloguePath(): Promise<string> {
  if (cachedCataloguePath) return cachedCataloguePath;
  for (const candidate of CATALOGUE_CANDIDATES) {
    try {
      await fs.access(candidate);
      cachedCataloguePath = candidate;
      console.log(`[AutoReply] Using catalogue at ${candidate}`);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(
    `Catalogue PDF not found. Tried: ${CATALOGUE_CANDIDATES.join(", ")}. ` +
      `Set the CATALOGUE_PATH env var to the absolute path of ${CATALOGUE_FILENAME}.`,
  );
}

async function loadCatalogueText(): Promise<string> {
  if (cachedCatalogueText) return cachedCatalogueText;
  const cataloguePath = await resolveCataloguePath();
  const buffer = await fs.readFile(cataloguePath);
  // Import the lib entry directly to avoid pdf-parse's index.js test loader.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    data: Buffer,
  ) => Promise<{ text: string }>;
  const parsed = await pdfParse(buffer);
  cachedCatalogueText = parsed.text;
  console.log(
    `[AutoReply] Catalogue loaded — ${parsed.text.length} characters of text extracted.`,
  );
  return cachedCatalogueText;
}

const SYSTEM_PROMPT = `You are a customer support assistant for RTindall Fire Protection, replying to incoming customer emails on behalf of the support team.

You have access to the official RTindall Fire Protection product catalogue (with pricing). You must answer the customer's question using ONLY the information contained in this catalogue. Do not invent products, specifications, prices, availability, or policies that are not explicitly in the catalogue.

Respond ONLY with a single JSON object — no markdown fences, no commentary before or after — using exactly this shape:
{
  "canAnswer": boolean,
  "reply": string
}

Rules:
- Set "canAnswer" to true if the customer's question can be answered substantively from the catalogue content (product info, pricing, specifications, availability of items listed in the catalogue). Be generous: if the catalogue has any relevant information, answer with what you have.
- Only set "canAnswer" to false when the question is completely off-topic, requires a human decision (custom quote outside catalogue scope, order modifications, complaints, refunds, account/billing issues, scheduling), or there is genuinely no relevant content in the catalogue. When false, return an empty string for "reply".
- When "canAnswer" is true, "reply" must be a complete, professionally formatted email body in plain text following EXACTLY this structure:

    Hi <FirstName>,    <-- or "Hello," if no name is known

    Thank you for reaching out to RTindall Fire Protection.

    <One or two short paragraphs answering the question. Cite specific product names and prices from the catalogue. Use bullet points (with "• " prefix) when listing multiple products or specs. Keep paragraphs short — 2-4 sentences each.>

    If you'd like to place an order or need any further details, just reply to this email and our team will be happy to help.

    Kind regards,
    RTindall Fire Protection — Support Team
    support@arbormind.in

- Use real newline characters (\\n) between lines and a blank line between paragraphs. Do NOT include "Subject:" lines, "From:" headers, markdown formatting, code fences, or HTML.
- Never invent products, prices, or specifications. Never apologise for missing information — if you cannot answer from the catalogue, set canAnswer=false instead.`;

interface ClaudeReplyResult {
  canAnswer: boolean;
  reply: string;
}

async function composeReply(
  fromName: string,
  subject: string,
  body: string,
): Promise<ClaudeReplyResult> {
  const catalogue = await loadCatalogueText();

  const userPrompt = `Customer name: ${fromName || "(unknown)"}
Email subject: ${subject}

Customer message:
"""
${body.slice(0, 8000)}
"""

Catalogue (authoritative source — answer ONLY from this content):
"""
${catalogue}
"""`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  const text = block && block.type === "text" ? block.text.trim() : "";

  // Strip any accidental code fences and parse JSON.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as ClaudeReplyResult;
    if (typeof parsed.canAnswer !== "boolean") {
      return { canAnswer: false, reply: "" };
    }
    return {
      canAnswer: parsed.canAnswer,
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
    };
  } catch (err) {
    console.error("[AutoReply] Failed to parse Claude response as JSON:", err, text.slice(0, 300));
    return { canAnswer: false, reply: "" };
  }
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
}

function getSmtpConfig(
  settings: Record<string, unknown> | null,
  imapUser: string,
  imapPass: string,
): SmtpConfig | null {
  // Prefer admin-configured SMTP creds in DB, then env, then fall back to IMAP creds (same Spacemail mailbox).
  const host =
    (settings?.smtpHost as string | undefined) ||
    process.env.SMTP_HOST ||
    process.env.IMAP_HOST ||
    "mail.spacemail.com";
  const port = Number(
    (settings?.smtpPort as number | undefined) ??
      process.env.SMTP_PORT ??
      465,
  );
  const secureRaw =
    (settings?.smtpSecure as boolean | undefined) ??
    (process.env.SMTP_SECURE !== "false");
  const user =
    (settings?.smtpUser as string | undefined) ||
    process.env.SMTP_USER ||
    imapUser;
  const pass =
    (settings?.smtpPassword as string | undefined) ||
    process.env.SMTP_PASSWORD ||
    imapPass;
  const fromName =
    (settings?.smtpFromName as string | undefined) ||
    process.env.SMTP_FROM_NAME ||
    "RTindall Fire Protection Support";

  if (!user || !pass) return null;
  return { host, port, secure: secureRaw !== false, user, pass, fromName };
}

async function sendEmail(
  smtp: SmtpConfig,
  to: string,
  subject: string,
  bodyText: string,
): Promise<void> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const replySubject = subject.toLowerCase().startsWith("re:")
    ? subject
    : `Re: ${subject}`;

  await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.user}>`,
    to,
    subject: replySubject,
    text: bodyText,
  });
}

/**
 * Diagnostic helper: composes (but does NOT send) a reply for a sample customer email.
 * Used by the /api/admin/auto-reply-preview endpoint so admins can verify the AI is
 * actually pulling answers from the catalogue and producing a properly formatted reply.
 */
export async function previewAutoReply(opts: {
  fromName: string;
  subject: string;
  body: string;
}): Promise<{
  cataloguePath: string;
  catalogueChars: number;
  canAnswer: boolean;
  reply: string;
  source: "ai" | "fallback";
}> {
  const cataloguePath = await resolveCataloguePath();
  const catalogue = await loadCatalogueText();
  let canAnswer = false;
  let reply = FALLBACK_REPLY;
  let source: "ai" | "fallback" = "fallback";
  try {
    const result = await composeReply(opts.fromName, opts.subject, opts.body);
    if (result.canAnswer && result.reply.trim()) {
      canAnswer = true;
      reply = result.reply.trim();
      source = "ai";
    }
  } catch (err) {
    console.error("[AutoReply] Preview composition failed:", err);
  }
  return {
    cataloguePath,
    catalogueChars: catalogue.length,
    canAnswer,
    reply,
    source,
  };
}

export async function maybeAutoReply(opts: {
  emailId: number;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  imapUser: string;
  imapPass: string;
  emailSettings: Record<string, unknown> | null;
}): Promise<void> {
  const { emailId, fromEmail, fromName, subject, body, imapUser, imapPass, emailSettings } = opts;

  // Don't reply to ourselves (prevents loops with bounces / mailing list copies).
  if (fromEmail.toLowerCase() === imapUser.toLowerCase()) {
    console.log(`[AutoReply] Skipping self-addressed email ${emailId}`);
    return;
  }

  const smtp = getSmtpConfig(emailSettings, imapUser, imapPass);
  if (!smtp) {
    console.warn(`[AutoReply] No SMTP credentials available — cannot send reply for email ${emailId}`);
    return;
  }

  let replyText = FALLBACK_REPLY;
  let usedAi = false;

  try {
    const result = await composeReply(fromName, subject, body);
    if (result.canAnswer && result.reply.trim()) {
      replyText = result.reply.trim();
      usedAi = true;
    }
  } catch (err) {
    console.error(`[AutoReply] Claude composition failed for email ${emailId}:`, err);
    // fall through with FALLBACK_REPLY
  }

  try {
    await sendEmail(smtp, fromEmail, subject, replyText);
    await db
      .update(emailsTable)
      .set({
        status: "replied",
        notes: usedAi
          ? "Auto-replied with AI-composed answer from catalogue"
          : "Auto-replied with acknowledgement (catalogue did not contain an answer)",
        updatedAt: new Date(),
      })
      .where(eq(emailsTable.id, emailId));
    console.log(
      `[AutoReply] Sent ${usedAi ? "AI" : "fallback"} reply for email ${emailId} to ${fromEmail}`,
    );
  } catch (err) {
    console.error(`[AutoReply] Failed to send reply for email ${emailId}:`, err);
  }
}
