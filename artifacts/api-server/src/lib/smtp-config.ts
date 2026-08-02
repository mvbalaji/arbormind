import { db, emailSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
}

/**
 * The email_settings row admins configure via the Email Settings page — one per org.
 * Pass orgId when calling from a request context. Background jobs (email poller,
 * auto-reply) run outside any request and don't yet loop per-org, so they omit it
 * and fall back to the first row in the table — real per-org background sync is
 * follow-up work, not attempted here.
 */
export async function getEmailSettingsRow(orgId?: number): Promise<Record<string, unknown> | null> {
  try {
    const rows = orgId != null
      ? await db.select().from(emailSettingsTable).where(eq(emailSettingsTable.orgId, orgId)).limit(1)
      : await db.select().from(emailSettingsTable).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve SMTP transport config: admin-configured DB row (Email Settings page) first,
 * then env vars, then an optional caller-supplied fallback (e.g. IMAP creds for the
 * same mailbox). Returns null when no usable user/pass is found anywhere.
 */
export function resolveSmtpConfig(
  settings: Record<string, unknown> | null,
  opts: { defaultFromName: string; fallbackUser?: string; fallbackPass?: string },
): SmtpConfig | null {
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
  const secure =
    typeof settings?.smtpSecure === "boolean"
      ? (settings.smtpSecure as boolean)
      : process.env.SMTP_SECURE !== "false";
  const user =
    (settings?.smtpUser as string | undefined) ||
    process.env.SMTP_USER ||
    opts.fallbackUser ||
    "";
  const pass =
    (settings?.smtpPassword as string | undefined) ||
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    opts.fallbackPass ||
    "";
  const fromName =
    (settings?.smtpFromName as string | undefined) ||
    process.env.SMTP_FROM_NAME ||
    opts.defaultFromName;

  if (!user || !pass) return null;
  return { host, port, secure, user, pass, fromName };
}

/** Convenience wrapper: fetch the DB row and resolve in one call. */
export async function getSmtpConfig(
  opts: { defaultFromName: string; fallbackUser?: string; fallbackPass?: string },
  orgId?: number,
): Promise<SmtpConfig | null> {
  const settings = await getEmailSettingsRow(orgId);
  return resolveSmtpConfig(settings, opts);
}
