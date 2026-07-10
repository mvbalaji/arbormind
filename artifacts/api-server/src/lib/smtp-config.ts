import { db, emailSettingsTable } from "@workspace/db";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
}

/** The single global email_settings row admins configure via the Email Settings page. */
export async function getEmailSettingsRow(): Promise<Record<string, unknown> | null> {
  try {
    const rows = await db.select().from(emailSettingsTable).limit(1);
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
): Promise<SmtpConfig | null> {
  const settings = await getEmailSettingsRow();
  return resolveSmtpConfig(settings, opts);
}
