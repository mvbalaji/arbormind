import { Router } from "express";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { generateContractDocument } from "../lib/contract-document";

// Rebuilds the active contract document content after CLM field changes.
// No-op if the contract has no documents yet.
async function syncActiveDocument(contractId: number): Promise<void> {
  const docRows = await pool.query(
    `SELECT id FROM contract_documents WHERE contract_id = $1 ORDER BY version DESC LIMIT 1`,
    [contractId]
  );
  if (!docRows.rows[0]) return;
  const docId = (docRows.rows[0] as Record<string, unknown>).id as number;

  const r = await pool.query(
    `SELECT c.*, a.name AS account_name,
            con.first_name AS contact_first_name, con.last_name AS contact_last_name,
            opp.name AS opportunity_name, u.name AS owner_name
     FROM contracts c
     LEFT JOIN accounts a ON a.id = c.account_id
     LEFT JOIN contacts con ON con.id = c.contact_id
     LEFT JOIN opportunities opp ON opp.id = c.opportunity_id
     LEFT JOIN users u ON u.id = c.owner_id
     WHERE c.id = $1`,
    [contractId]
  );
  const row = r.rows[0] as Record<string, unknown> | undefined;
  if (!row) return;

  const [items, reviewRows, signerRows, noteRows] = await Promise.all([
    pool.query(`SELECT * FROM contract_line_items WHERE contract_id = $1`, [contractId]),
    pool.query(`SELECT r.stage, r.status, r.due_date, r.completed_date, r.notes, u.name AS reviewer_name
                FROM clm_reviews r LEFT JOIN users u ON u.id = r.reviewer_id
                WHERE r.contract_id = $1 ORDER BY r.created_at ASC`, [contractId]),
    pool.query(`SELECT name, email, role, status, signed_at FROM clm_signers
                WHERE contract_id = $1 ORDER BY signing_order ASC`, [contractId]),
    pool.query(`SELECT body, created_by_name, created_at, attachment_name, attachment_url
                FROM entity_notes WHERE entity_type = 'contract' AND entity_id = $1
                ORDER BY created_at ASC`, [contractId]),
  ]);

  let templateClauses: string | null = null;
  if (row.template_id) {
    const tpl = await pool.query(`SELECT content FROM clm_templates WHERE id = $1 AND active = true`, [row.template_id]);
    if (tpl.rows[0]) templateClauses = (tpl.rows[0] as Record<string, unknown>).content as string;
  } else if (row.contract_type) {
    const tpl = await pool.query(`SELECT content FROM clm_templates WHERE category = $1 AND active = true ORDER BY id LIMIT 1`, [row.contract_type]);
    if (tpl.rows[0]) templateClauses = (tpl.rows[0] as Record<string, unknown>).content as string;
  }

  const contactName = row.contact_first_name
    ? `${row.contact_first_name} ${row.contact_last_name ?? ""}`.trim()
    : null;

  const built = generateContractDocument({
    contractNumber: row.contract_number as string,
    name: row.name as string,
    status: row.status as string | null,
    accountName: row.account_name as string | null,
    contactName,
    ownerName: row.owner_name as string | null,
    opportunityName: row.opportunity_name as string | null,
    startDate: row.start_date as Date | null,
    endDate: row.end_date as Date | null,
    contractTermMonths: row.contract_term_months as number | null,
    autoRenew: row.auto_renew as boolean | null,
    renewalTermMonths: row.renewal_term_months as number | null,
    specialTerms: row.special_terms as string | null,
    description: row.description as string | null,
    total: Number(row.total), subtotal: Number(row.subtotal),
    discount: Number(row.discount), tax: Number(row.tax),
    companySignerName: null, customerSignerName: null,
    contractType: row.contract_type as string | null,
    territory: row.territory as string | null,
    businessUnit: row.business_unit as string | null,
    priority: row.priority as string | null,
    governingLaw: row.governing_law as string | null,
    paymentTerms: row.payment_terms as string | null,
    liabilityCapMultiplier: row.liability_cap_multiplier as number | null,
    confidentialityPeriodYears: row.confidentiality_period_years as number | null,
    ipOwnership: row.ip_ownership as string | null,
    terminationNoticeDays: row.termination_notice_days as number | null,
    counterpartyCompany: row.counterparty_company as string | null,
    counterpartySignerName: row.counterparty_signer_name as string | null,
    counterpartySignerEmail: row.counterparty_signer_email as string | null,
    counterpartySignerTitle: row.counterparty_signer_title as string | null,
    counterpartyAddress: row.counterparty_address as string | null,
    signingProvider: row.signing_provider as string | null,
    signingOrder: row.signing_order as string | null,
    signingDeadline: row.signing_deadline as Date | null,
    yearlyEscalationPct: row.yearly_escalation_pct as number | null,
    minimumAnnualCommit: row.minimum_annual_commit as number | null,
    renewalStatus: row.renewal_status as string | null,
    renewalWindowDays: row.renewal_window_days as number | null,
    arrAtRisk: row.arr_at_risk as number | null,
    riskScore: row.risk_score as number | null,
    redlineRound: row.redline_round as number | null,
    templateClauses,
    reviews: (reviewRows.rows as Record<string, unknown>[]).map((rv) => ({
      stage: rv.stage as string,
      reviewerName: rv.reviewer_name as string | null,
      status: rv.status as string,
      dueDate: rv.due_date as Date | null,
      completedDate: rv.completed_date as Date | null,
      notes: rv.notes as string | null,
    })),
    signers: (signerRows.rows as Record<string, unknown>[]).map((s) => ({
      name: s.name as string,
      email: s.email as string | null,
      role: s.role as string | null,
      status: s.status as string | null,
      signedAt: s.signed_at as Date | null,
    })),
    notes: (noteRows.rows as Record<string, unknown>[]).map((n) => ({
      body: n.body as string,
      createdByName: n.created_by_name as string | null,
      createdAt: n.created_at as Date | null,
      attachmentName: n.attachment_name as string | null,
      attachmentUrl: n.attachment_url as string | null,
    })),
    items: (items.rows as Record<string, unknown>[]).map((it) => ({
      productName: it.product_name as string,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unit_price),
      listPrice: Number(it.list_price ?? it.unit_price),
      discount: Number(it.discount ?? 0),
      total: Number(it.total),
    })),
  });

  await pool.query(
    `UPDATE contract_documents SET title = $1, content = $2 WHERE id = $3`,
    [built.title, built.content, docId]
  );
}

const router = Router();

// ─── Templates (UC-019) ──────────────────────────────────────────────────────

router.get("/clm/templates", async (req, res) => {
  try {
    const { category, active } = req.query;
    const rows = await db.execute(sql`SELECT * FROM clm_templates ORDER BY name ASC`);
    let data = rows.rows as Record<string, unknown>[];
    if (category) data = data.filter((r) => r.category === category);
    if (active !== undefined) data = data.filter((r) => r.active === (active === "true"));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clm/templates", async (req, res) => {
  try {
    const { name, category, description, content, variables, active = true } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO clm_templates (name, category, description, content, variables, active)
      VALUES (${name}, ${category}, ${description}, ${content}, ${JSON.stringify(variables ?? [])}, ${active})
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/clm/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, description, content, variables, active } = req.body;
    const rows = await db.execute(sql`
      UPDATE clm_templates SET
        name = COALESCE(${name}, name),
        category = COALESCE(${category}, category),
        description = COALESCE(${description}, description),
        content = COALESCE(${content}, content),
        variables = COALESCE(${variables != null ? JSON.stringify(variables) : null}, variables),
        active = COALESCE(${active}, active),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/clm/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM clm_templates WHERE id = ${id}`);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Reviews (UC-003) ─────────────────────────────────────────────────────────

router.get("/clm/reviews", async (req, res) => {
  try {
    const { contractId } = req.query;
    const rows = await db.execute(sql`
      SELECT r.*, u.name as reviewer_name FROM clm_reviews r
      LEFT JOIN users u ON u.id = r.reviewer_id
      WHERE (${contractId ? parseInt(contractId as string) : null} IS NULL OR r.contract_id = ${contractId ? parseInt(contractId as string) : null})
      ORDER BY r.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clm/reviews", async (req, res) => {
  try {
    const { contractId, reviewerId, stage, dueDate, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO clm_reviews (contract_id, reviewer_id, stage, status, due_date, notes)
      VALUES (${contractId}, ${reviewerId}, ${stage}, 'pending', ${dueDate ?? null}, ${notes ?? null})
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/clm/reviews/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, decision, notes, decisionDate } = req.body;
    const rows = await db.execute(sql`
      UPDATE clm_reviews SET
        status = COALESCE(${status}, status),
        decision = COALESCE(${decision}, decision),
        notes = COALESCE(${notes}, notes),
        decision_date = COALESCE(${decisionDate ?? null}, decision_date),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Signers (UC-009) ─────────────────────────────────────────────────────────

router.get("/clm/signers", async (req, res) => {
  try {
    const { contractId } = req.query;
    const rows = await db.execute(sql`
      SELECT * FROM clm_signers
      WHERE (${contractId ? parseInt(contractId as string) : null} IS NULL OR contract_id = ${contractId ? parseInt(contractId as string) : null})
      ORDER BY signing_order ASC
    `);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clm/signers", async (req, res) => {
  try {
    const { contractId, name, email, title, role, signingOrder, party } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO clm_signers (contract_id, name, email, title, role, signing_order, party, status)
      VALUES (${contractId}, ${name}, ${email}, ${title ?? null}, ${role ?? "signer"}, ${signingOrder ?? 1}, ${party ?? "counterparty"}, 'pending')
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/clm/signers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, signedAt } = req.body;
    const rows = await db.execute(sql`
      UPDATE clm_signers SET
        status = COALESCE(${status}, status),
        signed_at = COALESCE(${signedAt ?? null}, signed_at),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/clm/signers/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM clm_signers WHERE id = ${parseInt(req.params.id)}`);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Redlines (UC-004) ───────────────────────────────────────────────────────

router.get("/clm/redlines", async (req, res) => {
  try {
    const { contractId } = req.query;
    const rows = await db.execute(sql`
      SELECT r.*, u.name as author_name FROM clm_redlines r
      LEFT JOIN users u ON u.id = r.author_id
      WHERE (${contractId ? parseInt(contractId as string) : null} IS NULL OR r.contract_id = ${contractId ? parseInt(contractId as string) : null})
      ORDER BY r.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clm/redlines", async (req, res) => {
  try {
    const { contractId, authorId, round, section, originalText, proposedText, changeType, party, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO clm_redlines (contract_id, author_id, round, section, original_text, proposed_text, change_type, party, status, notes)
      VALUES (${contractId}, ${authorId ?? null}, ${round ?? 1}, ${section ?? null}, ${originalText ?? null}, ${proposedText ?? null}, ${changeType ?? "modification"}, ${party ?? "counterparty"}, 'open', ${notes ?? null})
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/clm/redlines/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE clm_redlines SET
        status = COALESCE(${status}, status),
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Workflow Rules (UC-018) ──────────────────────────────────────────────────

router.get("/clm/workflow-rules", async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM clm_workflow_rules ORDER BY sort_order ASC, name ASC`);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clm/workflow-rules", async (req, res) => {
  try {
    const { name, triggerEvent, conditions, actions, active = true, sortOrder = 0 } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO clm_workflow_rules (name, trigger_event, conditions, actions, active, sort_order)
      VALUES (${name}, ${triggerEvent}, ${JSON.stringify(conditions ?? [])}, ${JSON.stringify(actions ?? [])}, ${active}, ${sortOrder})
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/clm/workflow-rules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, triggerEvent, conditions, actions, active, sortOrder } = req.body;
    const rows = await db.execute(sql`
      UPDATE clm_workflow_rules SET
        name = COALESCE(${name}, name),
        trigger_event = COALESCE(${triggerEvent}, trigger_event),
        conditions = COALESCE(${conditions != null ? JSON.stringify(conditions) : null}, conditions),
        actions = COALESCE(${actions != null ? JSON.stringify(actions) : null}, actions),
        active = COALESCE(${active}, active),
        sort_order = COALESCE(${sortOrder}, sort_order),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/clm/workflow-rules/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM clm_workflow_rules WHERE id = ${parseInt(req.params.id)}`);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Notification Rules (UC-020) ─────────────────────────────────────────────

router.get("/clm/notification-rules", async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM clm_notification_rules ORDER BY name ASC`);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clm/notification-rules", async (req, res) => {
  try {
    const { name, event, recipients, channels, triggerDaysBefore, messageTemplate, active = true } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO clm_notification_rules (name, event, recipients, channels, trigger_days_before, message_template, active)
      VALUES (${name}, ${event}, ${JSON.stringify(recipients ?? [])}, ${JSON.stringify(channels ?? ["email"])}, ${triggerDaysBefore ?? null}, ${messageTemplate ?? null}, ${active})
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put("/clm/notification-rules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, event, recipients, channels, triggerDaysBefore, messageTemplate, active } = req.body;
    const rows = await db.execute(sql`
      UPDATE clm_notification_rules SET
        name = COALESCE(${name}, name),
        event = COALESCE(${event}, event),
        recipients = COALESCE(${recipients != null ? JSON.stringify(recipients) : null}, recipients),
        channels = COALESCE(${channels != null ? JSON.stringify(channels) : null}, channels),
        trigger_days_before = COALESCE(${triggerDaysBefore ?? null}, trigger_days_before),
        message_template = COALESCE(${messageTemplate ?? null}, message_template),
        active = COALESCE(${active}, active),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/clm/notification-rules/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM clm_notification_rules WHERE id = ${parseInt(req.params.id)}`);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Contract CLM Fields (PATCH /contracts/:id/clm) ─────────────────────────

router.patch("/contracts/:id/clm", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const b = req.body as Record<string, unknown>;
    const n = (k: string) => (b[k] !== undefined && b[k] !== "" ? b[k] : null);

    const result = await pool.query(
      `UPDATE contracts SET
        contract_type                = $1,
        territory                    = $2,
        business_unit                = $3,
        priority                     = $4,
        governing_law                = $5,
        payment_terms                = $6,
        liability_cap_multiplier     = $7,
        confidentiality_period_years = $8,
        ip_ownership                 = $9,
        termination_notice_days      = $10,
        counterparty_company         = $11,
        counterparty_signer_name     = $12,
        counterparty_signer_email    = $13,
        counterparty_signer_title    = $14,
        counterparty_address         = $15,
        updated_at                   = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        n("contractType"), n("territory"), n("businessUnit"), n("priority"),
        n("governingLaw"), n("paymentTerms"), n("liabilityCapMultiplier"),
        n("confidentialityPeriodYears"), n("ipOwnership"), n("terminationNoticeDays"),
        n("counterpartyCompany"), n("counterpartySignerName"), n("counterpartySignerEmail"),
        n("counterpartySignerTitle"), n("counterpartyAddress"),
        id,
      ]
    );
    res.json(result.rows[0]);

    // Regenerate the active document in-place so it reflects the updated CLM fields.
    // This is non-fatal — if no document exists yet, it's a no-op.
    try {
      await syncActiveDocument(id);
    } catch { /* non-fatal */ }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Renewal Dashboard (UC-011) ──────────────────────────────────────────────

router.get("/clm/renewals", async (req, res) => {
  try {
    const { status, withinDays } = req.query;
    const rows = await db.execute(sql`
      SELECT c.*, a.name as account_name
      FROM contracts c
      LEFT JOIN accounts a ON a.id = c.account_id
      WHERE c.status IN ('activated', 'expired')
      ORDER BY c.end_date ASC NULLS LAST
    `);
    let data = rows.rows as Record<string, unknown>[];
    if (status) data = data.filter((r) => r.renewal_status === status);
    if (withinDays) {
      const cutoff = new Date(Date.now() + parseInt(withinDays as string) * 86400000);
      data = data.filter((r) => r.end_date && new Date(r.end_date as string) <= cutoff);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
