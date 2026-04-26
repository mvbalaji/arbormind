import path from "node:path";
import { promises as fs } from "node:fs";
import { db, emailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const CATALOGUE_PATH = path.resolve(
  process.cwd(),
  "attached_assets/RTindall_Fire_Protection_Catalogue_with_Pricing.pdf",
);

const FALLBACK_REPLY =
  "Acknowledged — someone from the support team will get back to you shortly.";

let cachedCatalogueText: string | null = null;

async function loadCatalogueText(): Promise<string> {
  if (cachedCatalogueText) return cachedCatalogueText;
  const buffer = await fs.readFile(CATALOGUE_PATH);
  // Import the lib entry directly to avoid pdf-parse's index.js test loader.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    data: Buffer,
  ) => Promise<{ text: string }>;
  const parsed = await pdfParse(buffer);
  cachedCatalogueText = parsed.text;
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
- Set "canAnswer" to true ONLY if the customer's question can be answered substantively and accurately from the catalogue content.
- If the question is off-topic, ambiguous, requires information that is not in the catalogue, requires a human decision (custom quote, order changes, complaints, account issues, scheduling, refunds), or you cannot find a confident answer in the catalogue, set "canAnswer" to false and return an empty string for "reply".
- When "canAnswer" is true, "reply" must be a complete, properly formatted email body in plain text. It must:
    * Open with a brief greeting addressing the customer by their first name if known, otherwise "Hello".
    * Answer the question clearly, citing relevant product names and prices from the catalogue.
    * Close with a short sign-off from "RTindall Fire Protection — Support Team".
    * Use line breaks (\\n) to separate paragraphs. Do not include subject lines or email headers.
- Never speculate. Never apologise for missing information — if you can't answer, just set canAnswer=false.`;

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
