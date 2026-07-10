import { Router, type IRouter } from "express";
import { db, entityNotesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const router: IRouter = Router();

const ENTITY_TYPES = ["account", "opportunity", "quote", "order", "contact", "lead", "campaign", "contract"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];
const isEntityType = (s: unknown): s is EntityType =>
  typeof s === "string" && (ENTITY_TYPES as readonly string[]).includes(s);

function getSessionUser(req: any) {
  return req.session?.user ?? req.user ?? null;
}

function requireAuth(req: any, res: any): boolean {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

function parseId(raw: string, res: any): number | null {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return null; }
  return id;
}

function validateAttachmentUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

router.get("/notes", async (req, res) => {
  try {
    const { entity, entityId } = req.query;
    if (!isEntityType(entity)) { res.status(400).json({ error: "Invalid entity" }); return; }
    const idNum = Number.parseInt(String(entityId ?? ""), 10);
    if (!Number.isFinite(idNum) || idNum <= 0) { res.status(400).json({ error: "entityId is required" }); return; }

    const rows = await db.select().from(entityNotesTable)
      .where(and(eq(entityNotesTable.entityType, entity), eq(entityNotesTable.entityId, idNum)))
      .orderBy(desc(entityNotesTable.createdAt));
    res.json({ data: rows });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/notes", async (req, res) => {
  const user = getSessionUser(req);
  try {
    const { entity, entityId, body, attachmentName, attachmentUrl } = req.body ?? {};
    if (!isEntityType(entity)) { res.status(400).json({ error: "Invalid entity" }); return; }
    const idNum = Number.parseInt(String(entityId ?? ""), 10);
    if (!Number.isFinite(idNum) || idNum <= 0) { res.status(400).json({ error: "Invalid entityId" }); return; }
    const trimmedBody = typeof body === "string" ? body.trim() : "";
    const rawAttachUrl = typeof attachmentUrl === "string" ? attachmentUrl.trim() : "";
    let validatedUrl: string | null = null;
    if (rawAttachUrl) {
      validatedUrl = validateAttachmentUrl(rawAttachUrl);
      if (!validatedUrl) {
        res.status(400).json({ error: "Attachment URL must be a valid http(s) link" });
        return;
      }
    }
    if (!trimmedBody && !validatedUrl) {
      res.status(400).json({ error: "Either a note body or an attachment URL is required" });
      return;
    }

    const [created] = await db.insert(entityNotesTable).values({
      entityType: entity,
      entityId: idNum,
      body: trimmedBody,
      attachmentName: typeof attachmentName === "string" && attachmentName.trim() ? attachmentName.trim() : null,
      attachmentUrl: validatedUrl,
      createdBy: user?.id ? Number(user.id) : null,
      createdByName: user?.name ?? user?.email ?? null,
    }).returning();
    res.status(201).json({ data: created });
  } catch (err) { req.log.error(err); res.status(500).json({ error: String(err) }); }
});

router.patch("/notes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id, res);
    if (id == null) return;
    const [existing] = await db.select().from(entityNotesTable).where(eq(entityNotesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Note not found" }); return; }
    const { body, attachmentName, attachmentUrl } = req.body ?? {};
    const updates: Partial<typeof existing> = { updatedAt: new Date() };
    if (typeof body === "string") updates.body = body.trim();
    if (attachmentName !== undefined) updates.attachmentName = typeof attachmentName === "string" && attachmentName.trim() ? attachmentName.trim() : null;
    if (attachmentUrl !== undefined) {
      const raw = typeof attachmentUrl === "string" ? attachmentUrl.trim() : "";
      if (!raw) {
        updates.attachmentUrl = null;
      } else {
        const validated = validateAttachmentUrl(raw);
        if (!validated) { res.status(400).json({ error: "Attachment URL must be a valid http(s) link" }); return; }
        updates.attachmentUrl = validated;
      }
    }
    const nextBody = updates.body ?? existing.body;
    const nextUrl = updates.attachmentUrl !== undefined ? updates.attachmentUrl : existing.attachmentUrl;
    if (!nextBody && !nextUrl) {
      res.status(400).json({ error: "A note must keep either a body or an attachment URL" });
      return;
    }
    const [updated] = await db.update(entityNotesTable).set(updates).where(eq(entityNotesTable.id, id)).returning();
    res.json({ data: updated });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/notes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id, res);
    if (id == null) return;
    const [existing] = await db.select().from(entityNotesTable).where(eq(entityNotesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Note not found" }); return; }
    await db.delete(entityNotesTable).where(eq(entityNotesTable.id, id));
    res.json({ success: true, id });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
