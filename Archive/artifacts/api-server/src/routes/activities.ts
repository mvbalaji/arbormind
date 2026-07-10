import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activitiesTable, usersTable, contactsTable, accountsTable, opportunitiesTable, emailTrackingTable, emailAttachmentsTable, emailsTable } from "@workspace/db";
import { eq, sql, and, desc, gte, lte } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { recalculateLeadScore } from "../lib/lead-scoring";

const router: IRouter = Router();
router.use("/activities", requireScreenAccess("activities"));

const activityFields = {
  id: activitiesTable.id,
  type: activitiesTable.type,
  subject: activitiesTable.subject,
  description: activitiesTable.description,
  status: activitiesTable.status,
  dueDate: activitiesTable.dueDate,
  completedAt: activitiesTable.completedAt,
  leadId: activitiesTable.leadId,
  contactId: activitiesTable.contactId,
  contactFirstName: contactsTable.firstName,
  contactLastName: contactsTable.lastName,
  opportunityId: activitiesTable.opportunityId,
  opportunityName: opportunitiesTable.name,
  accountId: activitiesTable.accountId,
  accountName: accountsTable.name,
  assignedTo: activitiesTable.assignedTo,
  assignedToName: usersTable.name,
  createdAt: activitiesTable.createdAt,
  updatedAt: activitiesTable.updatedAt,
  emailOpenCount: emailTrackingTable.openCount,
  emailOpenedAt: emailTrackingTable.openedAt,
  emailLastOpenedAt: emailTrackingTable.lastOpenedAt,
  emailLastUserAgent: emailTrackingTable.lastUserAgent,
  emailToAddress: emailTrackingTable.toEmail,
};

function formatActivity(a: { contactFirstName: string | null; contactLastName: string | null; [key: string]: unknown }) {
  const { contactFirstName, contactLastName, ...rest } = a;
  return {
    ...rest,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName}` : null,
  };
}

router.get("/activities", async (req, res) => {
  try {
    const { leadId, contactId, opportunityId, accountId, type, assignedTo, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (leadId) conditions.push(eq(activitiesTable.leadId, parseInt(leadId)));
    if (contactId) conditions.push(eq(activitiesTable.contactId, parseInt(contactId)));
    if (opportunityId) conditions.push(eq(activitiesTable.opportunityId, parseInt(opportunityId)));
    if (accountId) conditions.push(eq(activitiesTable.accountId, parseInt(accountId)));
    if (type) conditions.push(eq(activitiesTable.type, type));
    if (assignedTo) conditions.push(eq(activitiesTable.assignedTo, parseInt(assignedTo)));

    const baseQuery = db.select(activityFields)
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(activitiesTable.accountId, accountsTable.id))
      .leftJoin(opportunitiesTable, eq(activitiesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(emailTrackingTable, eq(emailTrackingTable.activityId, activitiesTable.id));

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).orderBy(activitiesTable.createdAt).limit(limitNum).offset(offset);

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(activitiesTable).where(whereClause);
    res.json({ data: data.map(formatActivity), total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/activities", async (req, res) => {
  try {
    const body = { ...req.body } as Record<string, unknown>;
    // Coerce ISO strings to Date for timestamp columns
    for (const k of ["dueDate", "completedAt"] as const) {
      if (typeof body[k] === "string") body[k] = new Date(body[k] as string);
    }
    const [activity] = await db.insert(activitiesTable).values(body as typeof activitiesTable.$inferInsert).returning();
    // Trigger lead score recalculation when a completed activity is logged
    if (activity.leadId && (activity.status === "completed" || activity.type === "note")) {
      void recalculateLeadScore(activity.leadId).catch(() => {});
    }
    res.status(201).json({ ...activity, contactName: null, opportunityName: null, accountName: null, assignedToName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activities/:id", async (req, res) => {
  try {
    const [activity] = await db
      .select(activityFields)
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(activitiesTable.accountId, accountsTable.id))
      .leftJoin(opportunitiesTable, eq(activitiesTable.opportunityId, opportunitiesTable.id))
      .where(eq(activitiesTable.id, parseInt(req.params.id)));

    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
    } else {
      res.json(formatActivity(activity));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/activities/:id", async (req, res) => {
  try {
    const [activity] = await db.update(activitiesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(activitiesTable.id, parseInt(req.params.id)))
      .returning();
    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
    } else {
      // Trigger lead score recalculation if activity is completed and linked to a lead
      if (activity.leadId && (activity.status === "completed" || req.body?.status === "completed")) {
        void recalculateLeadScore(activity.leadId).catch(() => {});
      }
      res.json({ ...activity, contactName: null, opportunityName: null, accountName: null, assignedToName: null });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/activities/:id/email-body
// Returns the full body of an email activity so users can actually read the message
// (vs. only seeing the truncated snippet in the timeline). Resolves direction
// from email_tracking (outbound) or emails (inbound) and returns HTML where available.
router.get("/activities/:id/email-body", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [activity] = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, id));
    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }
    if (activity.type !== "email") {
      res.status(400).json({ error: "Activity is not an email" });
      return;
    }

    // Outbound: tracking row keyed by activityId.
    const [tracking] = await db
      .select()
      .from(emailTrackingTable)
      .where(eq(emailTrackingTable.activityId, id))
      .limit(1);
    if (tracking) {
      // Attachment open-tracking metadata (no file bytes — these are kept
      // server-side and only streamed via /api/track/attachment/:token).
      const attachments = await db
        .select({
          filename: emailAttachmentsTable.filename,
          contentType: emailAttachmentsTable.contentType,
          sizeBytes: emailAttachmentsTable.sizeBytes,
          openCount: emailAttachmentsTable.openCount,
          lastOpenedAt: emailAttachmentsTable.lastOpenedAt,
        })
        .from(emailAttachmentsTable)
        .where(eq(emailAttachmentsTable.trackingId, tracking.id));
      res.json({
        direction: "outbound",
        subject: tracking.subject ?? activity.subject,
        fromEmail: null,
        fromName: null,
        toEmail: tracking.toEmail,
        sentAt: tracking.sentAt,
        textBody: activity.description ?? "",
        htmlBody: null,
        openCount: tracking.openCount ?? 0,
        lastOpenedAt: tracking.lastOpenedAt,
        lastUserAgent: tracking.lastUserAgent,
        attachments,
      });
      return;
    }

    // Inbound: find the matching emails row. processEmail() inserts the email row
    // and the activity row back-to-back (well under 5 seconds apart) and they share
    // every related FK that's set on the activity. Match strictly on ALL of those
    // (AND, not OR) so we never pull a sibling lead's email in a busy system, and
    // require the normalised subject to match (no nearest-in-time fallback).
    const createdAt = activity.createdAt ?? new Date();
    const windowMs = 60 * 1000; // 60s is generous given the inserts are back-to-back
    const lo = new Date(createdAt.getTime() - windowMs);
    const hi = new Date(createdAt.getTime() + windowMs);
    const linkConditions = [
      gte(emailsTable.createdAt, lo),
      lte(emailsTable.createdAt, hi),
    ];
    if (activity.leadId != null) linkConditions.push(eq(emailsTable.relatedLeadId, activity.leadId));
    if (activity.contactId != null) linkConditions.push(eq(emailsTable.relatedContactId, activity.contactId));
    if (activity.opportunityId != null) linkConditions.push(eq(emailsTable.relatedOpportunityId, activity.opportunityId));

    const candidates = await db
      .select()
      .from(emailsTable)
      .where(and(...linkConditions))
      .orderBy(desc(emailsTable.createdAt))
      .limit(10);

    // Activity subject is prefixed with "Reply: " or "Email: " by processEmail;
    // strip those before comparing against the raw inbound subject on emails.
    const normSubject = (s: string | null | undefined) =>
      (s ?? "").replace(/^(Reply|Email):\s*/i, "").trim().toLowerCase();
    const target = normSubject(activity.subject);
    const match = candidates.find((c) => normSubject(c.subject) === target);

    if (match) {
      res.json({
        direction: "inbound",
        subject: match.subject,
        fromEmail: match.fromEmail,
        fromName: match.fromName,
        toEmail: null,
        sentAt: match.createdAt,
        textBody: match.message ?? activity.description ?? "",
        htmlBody: match.bodyHtml ?? null,
        openCount: 0,
        lastOpenedAt: null,
        lastUserAgent: null,
      });
      return;
    }

    // Last-resort fallback: no linked email row, just return the activity description.
    res.json({
      direction: "unknown",
      subject: activity.subject,
      fromEmail: null,
      fromName: null,
      toEmail: null,
      sentAt: activity.createdAt,
      textBody: activity.description ?? "",
      htmlBody: null,
      openCount: 0,
      lastOpenedAt: null,
      lastUserAgent: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/activities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(activitiesTable).where(eq(activitiesTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
