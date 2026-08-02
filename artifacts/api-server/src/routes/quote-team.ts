import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// GET /quotes/:id/team — list team members with user details
router.get("/quotes/:id/team", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const result = await db.execute(sql`
      SELECT qtm.id, qtm.quote_id, qtm.user_id, qtm.role, qtm.created_at,
             u.name, u.email, u.role as user_role, u.team, u.avatar_url
      FROM quote_team_members qtm
      JOIN users u ON u.id = qtm.user_id
      WHERE qtm.quote_id = ${quoteId} AND qtm.org_id = ${req.orgId!}
      ORDER BY qtm.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /quotes/:id/team — add a team member
router.post("/quotes/:id/team", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const { userId, role = "Team Member" } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const result = await db.execute(sql`
      INSERT INTO quote_team_members (quote_id, user_id, role, org_id)
      VALUES (${quoteId}, ${userId}, ${role}, ${req.orgId!})
      ON CONFLICT (quote_id, user_id) DO UPDATE SET role = EXCLUDED.role
      RETURNING *
    `);
    const row = result.rows[0] as any;
    const user = await db.execute(sql`SELECT name, email, role as user_role, team, avatar_url FROM users WHERE id = ${userId}`);
    res.status(201).json({ ...row, ...(user.rows[0] ?? {}) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /quotes/:quoteId/team/:memberId — update role
router.patch("/quotes/:id/team/:memberId", async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { role } = req.body;
    await db.execute(sql`UPDATE quote_team_members SET role = ${role} WHERE id = ${memberId} AND org_id = ${req.orgId!}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /quotes/:id/team/:memberId — remove a team member
router.delete("/quotes/:id/team/:memberId", async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    await db.execute(sql`DELETE FROM quote_team_members WHERE id = ${memberId} AND org_id = ${req.orgId!}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
