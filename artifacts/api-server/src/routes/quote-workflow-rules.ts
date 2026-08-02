import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activitiesTable, approvalRequestsTable, approvalAuditEventsTable, usersTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import { getEmailSettingsRow, resolveSmtpConfig } from "../lib/smtp-config";

const router: IRouter = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuoteWorkflowRule {
  id: number;
  stage: string;          // the stage being entered (e.g. "needs_review")
  ruleType: "activity" | "approval"; // clearly separate categories
  // Activity fields
  activityType?: string;  // task | call | email | meeting
  activityTitle?: string;
  activityDueDays?: number; // days from now for due date
  assignToRole?: string;  // 'admin' | 'rep' | 'manager' | specific role name
  assignToUserId?: number;
  // Approval/Email fields
  approvalRequired?: boolean;
  approvalEmailSubject?: string;
  approvalEmailBody?: string;
  approverRole?: string;
  approverUserId?: number;
  advanceToStage?: string; // stage to advance to on email approval
  enabled: boolean;
  createdAt?: string;
}

// ── CRUD endpoints ─────────────────────────────────────────────────────────────

router.get("/admin/quote-workflow-rules", async (req, res) => {
  try {
    const rows = (await db.execute(sql`
      SELECT qwr.*, u1.name as assign_user_name, u2.name as approver_user_name
      FROM quote_workflow_rules qwr
      LEFT JOIN users u1 ON u1.id = qwr.assign_to_user_id
      LEFT JOIN users u2 ON u2.id = qwr.approver_user_id
      WHERE qwr.org_id = ${req.orgId!}
      ORDER BY qwr.stage, qwr.rule_type
    `)).rows as any[];
    res.json({ data: rows.map(formatRule) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rules" });
  }
});

router.post("/admin/quote-workflow-rules", async (req, res) => {
  try {
    const b = req.body as Partial<QuoteWorkflowRule>;
    const [row] = (await db.execute(sql`
      INSERT INTO quote_workflow_rules
        (stage, rule_type, activity_type, activity_title, activity_due_days,
         assign_to_role, assign_to_user_id,
         approval_required, approval_email_subject, approval_email_body,
         approver_role, approver_user_id, advance_to_stage, enabled, org_id)
      VALUES (
        ${b.stage}, ${b.ruleType},
        ${b.activityType ?? null}, ${b.activityTitle ?? null}, ${b.activityDueDays ?? 1},
        ${b.assignToRole ?? null}, ${b.assignToUserId ?? null},
        ${b.approvalRequired ?? false}, ${b.approvalEmailSubject ?? null}, ${b.approvalEmailBody ?? null},
        ${b.approverRole ?? null}, ${b.approverUserId ?? null}, ${b.advanceToStage ?? null},
        ${b.enabled ?? true}, ${req.orgId!}
      )
      RETURNING *
    `)).rows as any[];
    res.status(201).json(formatRule(row));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

router.put("/admin/quote-workflow-rules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const b = req.body as Partial<QuoteWorkflowRule>;
    const [row] = (await db.execute(sql`
      UPDATE quote_workflow_rules SET
        stage = ${b.stage}, rule_type = ${b.ruleType},
        activity_type = ${b.activityType ?? null}, activity_title = ${b.activityTitle ?? null},
        activity_due_days = ${b.activityDueDays ?? 1},
        assign_to_role = ${b.assignToRole ?? null}, assign_to_user_id = ${b.assignToUserId ?? null},
        approval_required = ${b.approvalRequired ?? false},
        approval_email_subject = ${b.approvalEmailSubject ?? null},
        approval_email_body = ${b.approvalEmailBody ?? null},
        approver_role = ${b.approverRole ?? null}, approver_user_id = ${b.approverUserId ?? null},
        advance_to_stage = ${b.advanceToStage ?? null},
        enabled = ${b.enabled ?? true},
        updated_at = NOW()
      WHERE id = ${id} AND org_id = ${req.orgId!} RETURNING *
    `)).rows as any[];
    if (!row) { res.status(404).json({ error: "Rule not found" }); return; }
    res.json(formatRule(row));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

router.delete("/admin/quote-workflow-rules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM quote_workflow_rules WHERE id = ${id} AND org_id = ${req.orgId!}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

// ── Get users list for assignment dropdowns ────────────────────────────────────

router.get("/admin/quote-workflow-rules/users", async (req, res) => {
  try {
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.orgId, req.orgId!));
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── Rule execution: called from quotes.ts on stage change ─────────────────────

export async function executeQuoteWorkflowRules(
  orgId: number,
  quoteId: number,
  newStage: string,
  quote: { name: string; quoteNumber: string; opportunityId?: number | null; contactId?: number | null; accountId?: number | null },
  actor: { id: number | null; name: string | null; email: string | null },
  log?: any,
) {
  try {
    const rules = (await db.execute(sql`
      SELECT * FROM quote_workflow_rules
      WHERE stage = ${newStage} AND enabled = true AND org_id = ${orgId}
      ORDER BY rule_type, id
    `)).rows as any[];

    if (rules.length === 0) return;

    for (const rule of rules) {
      if (rule.rule_type === "activity") {
        await executeActivityRule(orgId, rule, quoteId, quote, actor);
      } else if (rule.rule_type === "approval") {
        await executeApprovalRule(orgId, rule, quoteId, quote, actor, log);
      }
    }
  } catch (err) {
    console.error("[QuoteWorkflow] Error executing rules for stage", newStage, err);
  }
}

async function resolveAssignee(orgId: number, role: string | null, userId: number | null): Promise<number | null> {
  if (userId) return userId;
  if (!role) return null;
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.role, role), eq(usersTable.orgId, orgId)));
  return user?.id ?? null;
}

async function executeActivityRule(
  orgId: number,
  rule: any,
  quoteId: number,
  quote: { name: string; quoteNumber: string; opportunityId?: number | null; contactId?: number | null; accountId?: number | null },
  actor: { id: number | null; name: string | null },
) {
  const assignedTo = await resolveAssignee(orgId, rule.assign_to_role, rule.assign_to_user_id);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (rule.activity_due_days ?? 1));

  await db.insert(activitiesTable).values({
    orgId,
    type: rule.activity_type ?? "task",
    subject: rule.activity_title ?? `[Auto] ${quote.quoteNumber} — stage: ${rule.stage}`,
    description: `Auto-created by quote workflow rule when ${quote.quoteNumber} entered "${rule.stage}" stage.`,
    status: "planned",
    dueDate,
    opportunityId: quote.opportunityId ?? null,
    contactId: quote.contactId ?? null,
    accountId: quote.accountId ?? null,
    assignedTo,
  });
}

async function executeApprovalRule(
  orgId: number,
  rule: any,
  quoteId: number,
  quote: { name: string; quoteNumber: string; opportunityId?: number | null; contactId?: number | null; accountId?: number | null },
  actor: { id: number | null; name: string | null; email: string | null },
  log?: any,
) {
  if (!rule.approval_required) return;

  const approverUserId = await resolveAssignee(orgId, rule.approver_role, rule.approver_user_id);

  // Create approval request record
  const [approvalReq] = await db.insert(approvalRequestsTable).values({
    orgId,
    entity: "quote",
    entityId: quoteId,
    status: "open",
    level: 1,
    requestedBy: actor.id ?? undefined,
    ruleKey: `workflow_stage_${rule.stage}_${rule.id}`,
    comment: `Stage-triggered approval for ${quote.quoteNumber} entering "${rule.stage}"`,
  }).returning();

  await db.insert(approvalAuditEventsTable).values({
    orgId,
    requestId: approvalReq.id,
    event: "created",
    actorUserId: actor.id ?? undefined,
    actorName: actor.name ?? "System",
    comment: `Auto-created by workflow rule when quote entered "${rule.stage}"`,
  });

  // Send approval email if configured
  if (rule.approval_email_subject && approverUserId) {
    const [approver] = await db.select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable).where(and(eq(usersTable.id, approverUserId), eq(usersTable.orgId, orgId)));

    if (approver?.email) {
      await sendApprovalEmail({
        toEmail: approver.email,
        toName: approver.name,
        subject: rule.approval_email_subject
          .replace("{quote_number}", quote.quoteNumber)
          .replace("{quote_name}", quote.name)
          .replace("{stage}", rule.stage),
        body: (rule.approval_email_body ?? "Please review and reply APPROVE or REJECT with reason.")
          .replace("{quote_number}", quote.quoteNumber)
          .replace("{quote_name}", quote.name)
          .replace("{stage}", rule.stage)
          .replace("{approval_id}", String(approvalReq.id)),
        approvalId: approvalReq.id,
        quoteNumber: quote.quoteNumber,
        log,
      });
    }
  }
}

async function sendApprovalEmail(opts: {
  toEmail: string; toName: string | null; subject: string; body: string;
  approvalId: number; quoteNumber: string; log?: any;
}) {
  try {
    const settings = await getEmailSettingsRow();
    if (!settings) return;
    const smtp = resolveSmtpConfig(settings);
    if (!smtp) return;
    const transporter = nodemailer.createTransport(smtp as any);
    const approvalRef = `[APPROVAL-${opts.approvalId}]`;
    await transporter.sendMail({
      from: settings.fromEmail ? `${settings.fromName ?? "CRM"} <${settings.fromEmail}>` : undefined,
      to: `${opts.toName ?? ""} <${opts.toEmail}>`,
      subject: `${opts.subject} ${approvalRef}`,
      text: `${opts.body}\n\n---\nReply to this email with:\n  APPROVE - to approve\n  REJECT: <reason> - to reject\n\nRef: ${approvalRef} | Quote: ${opts.quoteNumber}`,
      html: `<p>${opts.body.replace(/\n/g, "<br>")}</p>
             <hr>
             <p><strong>To respond:</strong><br>
             Reply with <code>APPROVE</code> to approve, or <code>REJECT: your reason</code> to reject.<br>
             Ref: <code>${approvalRef}</code></p>`,
    });
  } catch (err) {
    if (opts.log) opts.log.warn({ err }, "[QuoteWorkflow] Approval email failed");
    else console.warn("[QuoteWorkflow] Approval email failed:", err);
  }
}

// ── Email-based approval detection ─────────────────────────────────────────────
// Called from emails.ts inbound webhook handler

export async function detectEmailApproval(subject: string, body: string): Promise<{
  approvalId: number | null; decision: "approved" | "rejected" | null; reason: string;
}> {
  const text = `${subject} ${body}`;
  const refMatch = text.match(/\[APPROVAL-(\d+)\]/i);
  if (!refMatch) return { approvalId: null, decision: null, reason: "" };

  const approvalId = parseInt(refMatch[1]);
  const combined = body.trim().toUpperCase();
  let decision: "approved" | "rejected" | null = null;
  let reason = "";

  if (combined.startsWith("APPROVE") || /\bAPPROVED?\b/.test(combined)) {
    decision = "approved";
  } else if (combined.startsWith("REJECT") || /\bREJECT(ED|ION)?\b/.test(combined)) {
    decision = "rejected";
    const reasonMatch = body.match(/REJECT(?:ED)?:?\s*(.+)/i);
    reason = reasonMatch ? reasonMatch[1].trim() : body.replace(/\[APPROVAL-\d+\]/i, "").trim().substring(0, 500);
  }

  return { approvalId, decision, reason };
}

export async function processEmailApprovalDecision(
  approvalId: number,
  decision: "approved" | "rejected",
  reason: string,
  actorEmail: string,
) {
  try {
    const [req] = (await db.execute(sql`
      SELECT ar.*, qwr.advance_to_stage
      FROM approval_requests ar
      LEFT JOIN quote_workflow_rules qwr ON qwr.rule_key = ar.rule_key
      WHERE ar.id = ${approvalId} AND ar.status = 'open'
    `)).rows as any[];

    if (!req) return;
    const orgId = req.org_id as number;

    const [actor] = await db.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable).where(and(eq(usersTable.email, actorEmail), eq(usersTable.orgId, orgId)));

    await db.execute(sql`
      UPDATE approval_requests
      SET status = ${decision}, decided_by = ${actor?.id ?? null}, decided_at = NOW(),
          comment = ${reason}, updated_at = NOW()
      WHERE id = ${approvalId} AND org_id = ${orgId}
    `);

    await db.insert(approvalAuditEventsTable).values({
      orgId,
      requestId: approvalId,
      event: decision,
      actorUserId: actor?.id ?? undefined,
      actorName: actor?.name ?? actorEmail,
      comment: reason || null,
    });

    // Advance quote stage on approval
    if (decision === "approved" && req.entity === "quote") {
      const [currentQuote] = (await db.execute(sql`SELECT status FROM quotes WHERE id = ${req.entity_id} AND org_id = ${orgId}`)).rows as any[];
      // Use explicit advance_to_stage from workflow rule, or derive next stage from progression map
      const QUOTE_APPROVAL_NEXT: Record<string, string> = {
        draft: "in_review", needs_review: "in_review", in_review: "approved",
        proposal: "in_review", sent: "in_review", approved: "presented",
      };
      const nextStage = req.advance_to_stage ?? (currentQuote ? QUOTE_APPROVAL_NEXT[currentQuote.status as string] : null);
      if (nextStage && currentQuote) {
        const now = new Date();
        await db.execute(sql`UPDATE quotes SET status = ${nextStage}, updated_at = ${now} WHERE id = ${req.entity_id} AND org_id = ${orgId}`);
        await db.execute(sql`UPDATE quote_stage_history SET left_at = ${now} WHERE quote_id = ${req.entity_id} AND stage = ${currentQuote.status} AND left_at IS NULL AND org_id = ${orgId}`);
        await db.execute(sql`INSERT INTO quote_stage_history (quote_id, stage, entered_at, org_id) VALUES (${req.entity_id}, ${nextStage}, ${now}, ${orgId})`);
      }
    }
  } catch (err) {
    console.error("[QuoteWorkflow] processEmailApprovalDecision failed:", err);
  }
}

function formatRule(r: any): QuoteWorkflowRule {
  return {
    id: r.id,
    stage: r.stage,
    ruleType: r.rule_type,
    activityType: r.activity_type,
    activityTitle: r.activity_title,
    activityDueDays: r.activity_due_days,
    assignToRole: r.assign_to_role,
    assignToUserId: r.assign_to_user_id,
    assignUserName: r.assign_user_name,
    approvalRequired: r.approval_required,
    approvalEmailSubject: r.approval_email_subject,
    approvalEmailBody: r.approval_email_body,
    approverRole: r.approver_role,
    approverUserId: r.approver_user_id,
    approverUserName: r.approver_user_name,
    advanceToStage: r.advance_to_stage,
    enabled: r.enabled,
    createdAt: r.created_at,
  } as any;
}

export default router;
