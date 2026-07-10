import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import { campaignsTable, activitiesTable, usersTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { getEmailSettingsRow, resolveSmtpConfig } from "../lib/smtp-config";
import { getOrgId } from "../lib/org-context";

const router: IRouter = Router();
router.use("/campaigns", requireScreenAccess("campaigns"));

interface SessionUser { id: number; email?: string; name?: string }
function getSessionUser(req: Request): SessionUser | null {
  const sess = req.session as unknown as { user?: SessionUser };
  return sess?.user ?? null;
}

function formatCampaign(c: Record<string, unknown>) {
  return {
    ...c,
    budget: c.budget ? Number(c.budget) : null,
    actualCost: c.actualCost ? Number(c.actualCost) : null,
    expectedRevenue: c.expectedRevenue ? Number(c.expectedRevenue) : null,
  };
}

router.get("/campaigns", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { search, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(campaignsTable.orgId, orgId)];
    if (search) {
      conditions.push(or(
        ilike(campaignsTable.name, `%${search}%`),
        ilike(campaignsTable.description, `%${search}%`)
      )!);
    }
    if (status) conditions.push(eq(campaignsTable.status, status));

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      db.select().from(campaignsTable).where(whereClause).limit(limitNum).offset(offset).orderBy(sql`created_at desc`),
      db.select({ count: sql<number>`count(*)` }).from(campaignsTable).where(whereClause),
    ]);

    res.json({ data: data.map(formatCampaign), total: Number(countResult[0].count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function coerceCampaignBody(input: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...input };
  if (body.budget) body.budget = String(body.budget);
  if (body.actualCost) body.actualCost = String(body.actualCost);
  if (body.expectedRevenue) body.expectedRevenue = String(body.expectedRevenue);
  for (const k of ["startDate", "endDate"] as const) {
    const v = body[k];
    if (typeof v === "string" && v.length > 0) {
      const d = new Date(v);
      body[k] = Number.isNaN(d.getTime()) ? null : d;
    } else if (v === "" || v === undefined) {
      delete body[k];
    }
  }
  return body;
}

router.post("/campaigns", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const body = { ...coerceCampaignBody(req.body), orgId };
    const [campaign] = await db.insert(campaignsTable).values(body as typeof campaignsTable.$inferInsert).returning();
    res.status(201).json(formatCampaign(campaign));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const [campaign] = await db.select().from(campaignsTable).where(and(eq(campaignsTable.id, parseInt(req.params.id)), eq(campaignsTable.orgId, orgId)));
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
    } else {
      res.json(formatCampaign(campaign));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/campaigns/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const body = { ...coerceCampaignBody(req.body), updatedAt: new Date() };
    const [campaign] = await db.update(campaignsTable)
      .set(body)
      .where(and(eq(campaignsTable.id, parseInt(req.params.id)), eq(campaignsTable.orgId, orgId)))
      .returning();
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
    } else {
      res.json(formatCampaign(campaign));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/campaigns/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const id = parseInt(req.params.id);
    await db.delete(campaignsTable).where(and(eq(campaignsTable.id, id), eq(campaignsTable.orgId, orgId)));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
 * POST /api/campaigns/:id/launch
 * Proper launch flow:
 *   1. Guard: only planning or paused campaigns can launch
 *   2. Atomically flip to active + stamp launchedAt
 *   3. Write a timeline activity
 *   4. Email all team members (best-effort, SMTP optional)
 * ========================================================== */
router.post("/campaigns/:id/launch", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const orgId = getOrgId(req);
    const campaignId = parseInt(req.params.id);
    const [campaign] = await db.select().from(campaignsTable).where(and(eq(campaignsTable.id, campaignId), eq(campaignsTable.orgId, orgId)));

    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    if (!["planning", "paused"].includes(campaign.status)) {
      res.status(400).json({ error: `Cannot launch a campaign with status: ${campaign.status}` });
      return;
    }

    const now = new Date();

    // 1. Atomically update status
    const [updated] = await db.update(campaignsTable)
      .set({ status: "active", launchedAt: now, updatedAt: now })
      .where(eq(campaignsTable.id, campaignId))
      .returning();

    // 2. Log activity (best-effort)
    const budgetStr = campaign.budget ? `£${Number(campaign.budget).toLocaleString()}` : "Not set";
    const activityDesc = [
      `Campaign "${campaign.name}" was launched.`,
      ``,
      `Type: ${campaign.type}`,
      `Channels: ${campaign.channels ?? "—"}`,
      `Budget: ${budgetStr}`,
      `Goals: ${campaign.goals ?? "—"}`,
      `Team: ${campaign.teamMembers ?? "—"}`,
      ``,
      `Launched by: ${user.name ?? user.email ?? "Unknown"}`,
    ].join("\n");

    await db.insert(activitiesTable).values({
      type: "note",
      subject: `🚀 Campaign Launched: ${campaign.name}`,
      description: activityDesc,
      status: "completed",
      completedAt: now,
      assignedTo: user.id,
    }).catch((e) => req.log.warn(e, "launch activity insert failed (non-fatal)"));

    // 3. Resolve team member emails from users table, fire notifications
    let notifiedCount = 0;
    const emailResults: Array<{ name: string; email: string; status: string }> = [];

    const teamNames = (campaign.teamMembers ?? "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    const allUsers = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.orgId, orgId));

    const matched: Array<{ id: number; name: string; email: string }> = [];
    for (const tName of teamNames) {
      const lower = tName.toLowerCase();
      const found = allUsers.find((u) => u.name?.toLowerCase().includes(lower) || lower.includes((u.name ?? "").toLowerCase()));
      if (found && found.email && !matched.find((m) => m.email === found.email)) {
        matched.push({ id: found.id, name: found.name ?? found.email, email: found.email });
      }
    }

    // Always also include the launcher if not already in the list
    if (user.email && !matched.find((m) => m.email === user.email)) {
      matched.push({ id: user.id, name: user.name ?? user.email, email: user.email });
    }

    // Send emails (fire and forget — do not let SMTP failure abort the launch)
    const emailSettings = await getEmailSettingsRow();
    const smtp = resolveSmtpConfig(emailSettings, { defaultFromName: "ArborMind CRM" });

    if (smtp) {
      const startStr = campaign.startDate ? new Date(campaign.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";
      const endStr = campaign.endDate ? new Date(campaign.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";

      const emailHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#16a34a;padding:20px 24px;border-radius:8px 8px 0 0;">
            <p style="color:#fff;font-size:22px;font-weight:700;margin:0;">🚀 Campaign is Live!</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="font-size:15px;margin:0 0 16px;">Hi there,</p>
            <p style="font-size:15px;margin:0 0 20px;">
              <strong>${campaign.name}</strong> has just been launched and is now live.
              Here's a quick summary:
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
              ${[
                ["Type", campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)],
                ["Channels", campaign.channels ?? "—"],
                ["Budget", budgetStr],
                ["Start Date", startStr],
                ["End Date", endStr],
                ["Goals", campaign.goals ?? "—"],
                ["Launched by", user.name ?? user.email ?? "—"],
              ].map(([label, value]) => `
                <tr>
                  <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-weight:600;width:35%;color:#6b7280;">${label}</td>
                  <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;">${value}</td>
                </tr>
              `).join("")}
            </table>
            <p style="font-size:13px;color:#6b7280;margin:0;">
              You're receiving this because you're a member of this campaign team in ArborMind CRM.
            </p>
          </div>
        </div>
      `;

      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: smtp.host, port: smtp.port, secure: smtp.secure,
          auth: { user: smtp.user, pass: smtp.pass },
        });

        for (const recipient of matched) {
          try {
            await transporter.sendMail({
              from: `"${smtp.fromName}" <${smtp.user}>`,
              to: recipient.email,
              subject: `🚀 Campaign Launched: ${campaign.name}`,
              text: activityDesc,
              html: emailHtml,
            });
            emailResults.push({ name: recipient.name, email: recipient.email, status: "sent" });
            notifiedCount++;
          } catch (sendErr) {
            req.log.warn(sendErr, `launch email to ${recipient.email} failed`);
            emailResults.push({ name: recipient.name, email: recipient.email, status: "failed" });
          }
        }
      } catch (smtpErr) {
        req.log.warn(smtpErr, "SMTP transporter setup failed during campaign launch");
        for (const r of matched) emailResults.push({ name: r.name, email: r.email, status: "smtp_unavailable" });
      }
    } else {
      // SMTP not configured — record who would have been notified
      for (const r of matched) emailResults.push({ name: r.name, email: r.email, status: "smtp_not_configured" });
    }

    res.json({
      campaign: formatCampaign(updated as unknown as Record<string, unknown>),
      launchedAt: now,
      notifiedCount,
      emailResults,
      smtpConfigured: !!smtp,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
