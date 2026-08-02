/**
 * Public web-to-lead endpoint — no authentication required.
 * Creates a CRM lead from a website contact form submission,
 * assigns it to the country sales manager, creates SLA follow-up
 * tasks, and emails the manager immediately.
 *
 * POST /api/web-to-lead
 * GET  /api/web-to-lead/config
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getSmtpConfig } from "../lib/smtp-config";
import { getDefaultOrgId } from "../lib/org-context";
import nodemailer from "nodemailer";

const router: IRouter = Router();

const HONEYPOT_FIELD = "website_url_confirm";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

interface SlaTask { subject: string; slaHours: number; description: string }

async function loadSlaTasks(orgId: number, region: string): Promise<SlaTask[]> {
  // Try region-specific tasks first, then fall back to Global
  const regionLabel = region.toLowerCase().includes("india") ? "India"
    : region.toLowerCase().includes("uk") || region.toLowerCase().includes("united kingdom") || region.toLowerCase().includes("kingdom") ? "United Kingdom"
    : "Global";

  try {
    const raw = await db.execute(sql`
      SELECT task_name, sla_hours, description
      FROM web_lead_sla_config
      WHERE is_active = true
        AND region = ${regionLabel}
        AND org_id = ${orgId}
      ORDER BY sort_order, id
    `);
    const rows = ((raw as any).rows ?? (Array.isArray(raw) ? raw : [])) as Record<string, unknown>[];
    if (rows.length > 0) {
      return rows.map((r) => ({
        subject: String(r.task_name ?? ""),
        slaHours: Number(r.sla_hours ?? 24),
        description: String(r.description ?? ""),
      }));
    }
  } catch { /* fall through */ }

  // Fallback to Global
  try {
    const raw = await db.execute(sql`
      SELECT task_name, sla_hours, description
      FROM web_lead_sla_config
      WHERE is_active = true AND region = 'Global' AND org_id = ${orgId}
      ORDER BY sort_order, id
    `);
    const rows = ((raw as any).rows ?? (Array.isArray(raw) ? raw : [])) as Record<string, unknown>[];
    if (rows.length > 0) {
      return rows.map((r) => ({
        subject: String(r.task_name ?? ""),
        slaHours: Number(r.sla_hours ?? 24),
        description: String(r.description ?? ""),
      }));
    }
  } catch { /* fall through */ }

  // Hardcoded defaults if table doesn't exist yet
  return [
    { subject: "Initial outreach call", slaHours: 1, description: "Call the lead within 1 hour of submission." },
    { subject: "Send introductory email", slaHours: 4, description: "Send a personalised intro email." },
    { subject: "Qualification call", slaHours: 24, description: "Conduct a structured qualification call." },
    { subject: "Product demo / discovery meeting", slaHours: 72, description: "Schedule and run a product demonstration." },
    { subject: "Proposal & follow-up", slaHours: 168, description: "Send a formal proposal and follow up." },
  ];
}

async function findCountryManager(orgId: number, country: string): Promise<{ id: number; email: string; name: string } | null> {
  const lower = country.toLowerCase();
  let teamPattern = "%";
  if (lower.includes("india")) teamPattern = "%india%";
  else if (lower.includes("uk") || lower.includes("united kingdom") || lower.includes("kingdom")) teamPattern = "%uk%";

  try {
    const rows = await db.execute(sql`
      SELECT id, email, name
      FROM users
      WHERE is_active = true
        AND org_id = ${orgId}
        AND role IN ('manager', 'admin', 'sales_manager')
        AND (LOWER(team) LIKE ${teamPattern} OR ${teamPattern} = '%')
      ORDER BY
        CASE WHEN role = 'manager' THEN 0
             WHEN role = 'sales_manager' THEN 1
             ELSE 2 END,
        id ASC
      LIMIT 1
    `);
    const row = (rows as any).rows?.[0] ?? (Array.isArray(rows) ? rows[0] : null);
    if (!row) return null;
    return { id: Number(row.id), email: String(row.email), name: String(row.name) };
  } catch {
    return null;
  }
}

async function sendManagerNotification(opts: {
  manager: { email: string; name: string };
  lead: { id: number; firstName: string; lastName: string; email: string; phone?: string; company?: string; service?: string; country?: string; message?: string };
  slaTasks: SlaTask[];
}): Promise<void> {
  const smtp = await getSmtpConfig({ defaultFromName: "Arbormind CRM" });
  if (!smtp) return; // SMTP not configured — skip silently

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const leadName = [opts.lead.firstName, opts.lead.lastName].filter(Boolean).join(" ");
  const rows = [
    ["Name", leadName],
    ["Email", opts.lead.email],
    opts.lead.phone ? ["Phone", opts.lead.phone] : null,
    opts.lead.company ? ["Company", opts.lead.company] : null,
    opts.lead.service ? ["Interested in", opts.lead.service] : null,
    opts.lead.country ? ["Country", opts.lead.country] : null,
    opts.lead.message ? ["Message", opts.lead.message] : null,
  ]
    .filter(Boolean)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#4b5563;white-space:nowrap">${k}</td><td style="padding:6px 12px;color:#111827">${v}</td></tr>`)
    .join("");

  const taskRows = opts.slaTasks.map((t, i) =>
    `<tr style="background:${i % 2 === 0 ? "#f9fafb" : "#fff"}">
      <td style="padding:6px 12px">${t.subject}</td>
      <td style="padding:6px 12px;color:#2563eb;font-weight:600">${t.slaHours < 24 ? `${t.slaHours}h` : `${Math.round(t.slaHours / 24)}d`} SLA</td>
    </tr>`
  ).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">🔔 New Web Lead — Action Required</h1>
        <p style="margin:8px 0 0;opacity:.8;font-size:14px">Submitted via arbormind.in contact form</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;padding:24px 32px">
        <p style="margin:0 0 16px">Hi <strong>${opts.manager.name}</strong>,</p>
        <p style="margin:0 0 16px;color:#374151">A new lead has been assigned to you. Please action within the SLA windows below.</p>
        <h2 style="font-size:15px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin:0 0 12px">Lead Details</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          ${rows}
        </table>
        <h2 style="font-size:15px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin:0 0 12px">Follow-up Tasks &amp; SLA</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead><tr style="background:#f3f4f6"><th style="padding:6px 12px;text-align:left;font-size:13px">Task</th><th style="padding:6px 12px;text-align:left;font-size:13px">SLA</th></tr></thead>
          <tbody>${taskRows}</tbody>
        </table>
        <a href="http://localhost:5173/leads/${opts.lead.id}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View Lead in CRM →</a>
      </div>
      <div style="padding:16px 32px;font-size:12px;color:#9ca3af">
        Arbormind CRM · This is an automated notification. Do not reply to this email.
      </div>
    </div>
  `;

  await transport.sendMail({
    from: `"${smtp.fromName}" <${smtp.user}>`,
    to: opts.manager.email,
    subject: `🔔 New Web Lead: ${leadName}${opts.lead.company ? ` — ${opts.lead.company}` : ""}`,
    html,
  });
}

router.post("/web-to-lead", async (req, res) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many submissions. Please try again later." });
    return;
  }

  const body = req.body ?? {};

  if (body[HONEYPOT_FIELD] && String(body[HONEYPOT_FIELD]).trim() !== "") {
    res.status(200).json({ ok: true });
    return;
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName  = String(body.lastName  ?? "").trim();
  const email     = String(body.email     ?? "").trim();
  const phone     = String(body.phone     ?? "").trim();
  const company   = String(body.company   ?? "").trim();
  const message   = String(body.message   ?? "").trim();
  const service   = String(body.service   ?? "").trim();
  const country   = String(body.country   ?? "").trim();

  if (!firstName || !email) {
    res.status(422).json({ error: "First name and email are required." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(422).json({ error: "Please provide a valid email address." });
    return;
  }

  try {
    const now = new Date();
    const orgId = await getDefaultOrgId();

    const description = [
      service ? `Service interest: ${service}` : null,
      country ? `Country: ${country}` : null,
      message ? `Message: ${message}` : null,
    ].filter(Boolean).join("\n");

    // 1. Create the lead
    const result = await db.insert(leadsTable).values({
      orgId,
      firstName,
      lastName: lastName || undefined,
      email,
      phone: phone || undefined,
      company: company || undefined,
      source: "web",
      status: "new",
      description: description || undefined,
    } as any).returning({ id: leadsTable.id });

    const leadId = result[0]?.id;
    if (!leadId) throw new Error("Lead insert failed");

    // 2. Find country sales manager
    const manager = await findCountryManager(orgId, country);

    // 3. Assign lead to manager
    if (manager) {
      await db.execute(sql`
        UPDATE leads SET assigned_to = ${manager.id}, updated_at = NOW()
        WHERE id = ${leadId}
      `);
    }

    // 4. Log submission note
    await db.execute(sql`
      INSERT INTO activities (lead_id, type, subject, description, org_id, assigned_to)
      VALUES (
        ${leadId}, 'note', 'Web contact form submitted',
        ${`New lead from website contact form. ${description}`},
        ${orgId},
        ${manager?.id ?? null}
      )
    `);

    // 5. Load SLA tasks from DB (region-specific or Global fallback)
    const slaTasks = await loadSlaTasks(orgId, country);

    // 6. Create standard SLA follow-up tasks
    for (const task of slaTasks) {
      const dueDate = addHours(now, task.slaHours);
      await db.execute(sql`
        INSERT INTO activities (lead_id, type, subject, description, status, due_date, org_id, assigned_to)
        VALUES (
          ${leadId},
          'task',
          ${task.subject},
          ${task.description},
          'planned',
          ${dueDate.toISOString()},
          ${orgId},
          ${manager?.id ?? null}
        )
      `);
    }

    // 7. Email the manager (non-blocking — don't fail the request if SMTP is down)
    if (manager) {
      sendManagerNotification({
        manager,
        lead: { id: leadId, firstName, lastName, email, phone: phone || undefined, company: company || undefined, service: service || undefined, country: country || undefined, message: message || undefined },
        slaTasks,
      }).catch((err) => console.warn("[web-to-lead] Manager notification failed:", err));
    }

    res.status(201).json({ ok: true, leadId, assignedTo: manager?.name ?? null });
  } catch (err) {
    console.error("[web-to-lead] Error:", err);
    res.status(500).json({ error: "Failed to submit. Please try again." });
  }
});

router.get("/web-to-lead/config", (_req, res) => {
  res.json({
    companyName: "Arbormind",
    services: [
      "CRM Implementation",
      "Sales Automation",
      "AI-Powered Insights",
      "CPQ / Quote Management",
      "Contract Lifecycle Management",
      "Custom Integration",
      "Training & Support",
      "General Enquiry",
    ],
  });
});

export default router;
