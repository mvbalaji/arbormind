import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { socialMessagesTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

// ── GET /api/social-messages?leadId=:id ──────────────────────────────────────
router.get("/social-messages", async (req, res) => {
  try {
    const { leadId, contactId, platform, limit = "100" } = req.query as Record<string, string>;
    if (!leadId && !contactId) {
      res.status(400).json({ error: "leadId or contactId is required" });
      return;
    }

    const conditions = [eq(socialMessagesTable.orgId, req.orgId as number)];
    if (leadId) conditions.push(eq(socialMessagesTable.leadId, parseInt(leadId)));
    if (contactId) conditions.push(eq(socialMessagesTable.contactId, parseInt(contactId)));
    if (platform) conditions.push(eq(socialMessagesTable.platform, platform));

    const rows = await db
      .select({
        id: socialMessagesTable.id,
        leadId: socialMessagesTable.leadId,
        contactId: socialMessagesTable.contactId,
        platform: socialMessagesTable.platform,
        direction: socialMessagesTable.direction,
        content: socialMessagesTable.content,
        mediaUrl: socialMessagesTable.mediaUrl,
        mediaType: socialMessagesTable.mediaType,
        senderName: socialMessagesTable.senderName,
        senderHandle: socialMessagesTable.senderHandle,
        senderAvatarUrl: socialMessagesTable.senderAvatarUrl,
        platformMessageId: socialMessagesTable.platformMessageId,
        platformThreadId: socialMessagesTable.platformThreadId,
        platformProfileUrl: socialMessagesTable.platformProfileUrl,
        status: socialMessagesTable.status,
        isRead: socialMessagesTable.isRead,
        deliveredAt: socialMessagesTable.deliveredAt,
        readAt: socialMessagesTable.readAt,
        createdAt: socialMessagesTable.createdAt,
        sentByUserId: socialMessagesTable.sentByUserId,
        sentByUserName: usersTable.name,
      })
      .from(socialMessagesTable)
      .leftJoin(usersTable, eq(socialMessagesTable.sentByUserId, usersTable.id))
      .where(and(...conditions))
      .orderBy(desc(socialMessagesTable.createdAt))
      .limit(parseInt(limit));

    // Mark inbound messages as read when fetched
    if (leadId) {
      await db
        .update(socialMessagesTable)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(socialMessagesTable.leadId, parseInt(leadId)),
            eq(socialMessagesTable.direction, "inbound"),
            eq(socialMessagesTable.isRead, false),
            eq(socialMessagesTable.orgId, req.orgId as number),
          ),
        );
    }

    res.json({ data: rows.reverse() }); // oldest-first for chat display
  } catch (err) {
    console.error("[social-messages] GET error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// ── POST /api/social-messages ─────────────────────────────────────────────────
router.post("/social-messages", async (req, res) => {
  try {
    const user = req.user as { id?: number } | undefined;
    const {
      leadId, contactId, platform, direction = "outbound",
      content, mediaUrl, mediaType,
      senderName, senderHandle, senderAvatarUrl,
      platformMessageId, platformThreadId, platformProfileUrl,
      status = "sent",
    } = req.body as Record<string, string | number | undefined>;

    if (!content || !platform) {
      res.status(400).json({ error: "content and platform are required" });
      return;
    }
    if (!leadId && !contactId) {
      res.status(400).json({ error: "leadId or contactId is required" });
      return;
    }

    const [row] = await db
      .insert(socialMessagesTable)
      .values({
        orgId: req.orgId as number,
        leadId: leadId ? Number(leadId) : null,
        contactId: contactId ? Number(contactId) : null,
        sentByUserId: direction === "outbound" && user?.id ? user.id : null,
        platform: String(platform),
        direction: String(direction),
        content: String(content),
        mediaUrl: mediaUrl ? String(mediaUrl) : null,
        mediaType: mediaType ? String(mediaType) : null,
        senderName: senderName ? String(senderName) : null,
        senderHandle: senderHandle ? String(senderHandle) : null,
        senderAvatarUrl: senderAvatarUrl ? String(senderAvatarUrl) : null,
        platformMessageId: platformMessageId ? String(platformMessageId) : null,
        platformThreadId: platformThreadId ? String(platformThreadId) : null,
        platformProfileUrl: platformProfileUrl ? String(platformProfileUrl) : null,
        status: String(status),
        isRead: direction === "outbound",
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    console.error("[social-messages] POST error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ── PATCH /api/social-messages/:id ───────────────────────────────────────────
router.patch("/social-messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isRead } = req.body as { status?: string; isRead?: boolean };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (isRead != null) {
      updates.isRead = isRead;
      if (isRead) updates.readAt = new Date();
    }
    const [row] = await db
      .update(socialMessagesTable)
      .set(updates)
      .where(and(eq(socialMessagesTable.id, parseInt(id)), eq(socialMessagesTable.orgId, req.orgId as number)))
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[social-messages] PATCH error:", err);
    res.status(500).json({ error: "Failed to update message" });
  }
});

// ── POST /api/social-messages/inbound-webhook ─────────────────────────────────
// Simulated inbound webhook — real platforms would verify signatures here.
router.post("/social-messages/inbound-webhook", async (req, res) => {
  try {
    const {
      platform, leadId, contactId,
      content, senderName, senderHandle, senderAvatarUrl,
      platformMessageId, platformThreadId,
    } = req.body as Record<string, string | number | undefined>;

    if (!content || !platform || (!leadId && !contactId)) {
      res.status(400).json({ error: "platform, content, and leadId or contactId are required" });
      return;
    }

    const [row] = await db
      .insert(socialMessagesTable)
      .values({
        orgId: req.orgId as number,
        leadId: leadId ? Number(leadId) : null,
        contactId: contactId ? Number(contactId) : null,
        platform: String(platform),
        direction: "inbound",
        content: String(content),
        senderName: senderName ? String(senderName) : null,
        senderHandle: senderHandle ? String(senderHandle) : null,
        senderAvatarUrl: senderAvatarUrl ? String(senderAvatarUrl) : null,
        platformMessageId: platformMessageId ? String(platformMessageId) : null,
        platformThreadId: platformThreadId ? String(platformThreadId) : null,
        status: "delivered",
        isRead: false,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    console.error("[social-messages] webhook error:", err);
    res.status(500).json({ error: "Failed to store inbound message" });
  }
});

// ── GET /api/social-messages/stats?leadId=:id ────────────────────────────────
router.get("/social-messages/stats", async (req, res) => {
  try {
    const { leadId } = req.query as Record<string, string>;
    if (!leadId) { res.status(400).json({ error: "leadId required" }); return; }

    const rows = await db
      .select({
        platform: socialMessagesTable.platform,
        direction: socialMessagesTable.direction,
        count: sql<number>`count(*)::int`,
      })
      .from(socialMessagesTable)
      .where(and(eq(socialMessagesTable.leadId, parseInt(leadId)), eq(socialMessagesTable.orgId, req.orgId as number)))
      .groupBy(socialMessagesTable.platform, socialMessagesTable.direction);

    // Reshape into { linkedin: { inbound: 2, outbound: 3 }, ... }
    const stats: Record<string, { inbound: number; outbound: number; total: number }> = {};
    for (const r of rows) {
      if (!stats[r.platform]) stats[r.platform] = { inbound: 0, outbound: 0, total: 0 };
      stats[r.platform][r.direction as "inbound" | "outbound"] = r.count;
      stats[r.platform].total += r.count;
    }

    res.json({ stats });
  } catch (err) {
    console.error("[social-messages] stats error:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;
