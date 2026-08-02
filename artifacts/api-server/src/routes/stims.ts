import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

// ─── Fiscal Periods ───────────────────────────────────────────────────────────

router.get("/stims/fiscal-periods", async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM stims_fiscal_periods WHERE org_id = $1 ORDER BY start_date DESC`, [req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/fiscal-periods", async (req, res) => {
  try {
    const { name, fiscal_year, period_type, start_date, end_date } = req.body;
    const r = await pool.query(
      `INSERT INTO stims_fiscal_periods (name, fiscal_year, period_type, start_date, end_date, org_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, fiscal_year, period_type, start_date, end_date, req.orgId!]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/stims/fiscal-periods/:id", async (req, res) => {
  try {
    const { name, fiscal_year, period_type, start_date, end_date, is_locked } = req.body;
    const r = await pool.query(
      `UPDATE stims_fiscal_periods SET name=$1, fiscal_year=$2, period_type=$3,
       start_date=$4, end_date=$5, is_locked=$6, updated_at=NOW() WHERE id=$7 AND org_id=$8 RETURNING *`,
      [name, fiscal_year, period_type, start_date, end_date, is_locked, req.params.id, req.orgId!]
    );
    res.json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stims/fiscal-periods/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM stims_fiscal_periods WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Target Cycles ────────────────────────────────────────────────────────────

router.get("/stims/target-cycles", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT tc.*, fp.name AS period_name, fp.period_type, fp.start_date, fp.end_date,
             u.name AS created_by_name
      FROM stims_target_cycles tc
      LEFT JOIN stims_fiscal_periods fp ON fp.id = tc.fiscal_period_id
      LEFT JOIN users u ON u.id = tc.created_by
      WHERE tc.org_id = $1
      ORDER BY tc.created_at DESC
    `, [req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/target-cycles", async (req, res) => {
  try {
    const { name, fiscal_period_id, metric, total_target, allocation_method, scope, currency, growth_pct } = req.body;
    const userId = (req as any).user?.id ?? null;
    const r = await pool.query(
      `INSERT INTO stims_target_cycles
         (name, fiscal_period_id, metric, total_target, allocation_method, scope, currency, growth_pct, status, created_by, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10) RETURNING *`,
      [name, fiscal_period_id, metric, total_target, allocation_method ?? "equal", scope ?? "All", currency ?? "GBP", growth_pct ?? 0, userId, req.orgId!]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/stims/target-cycles/:id", async (req, res) => {
  try {
    const { name, metric, total_target, allocation_method, scope, currency, growth_pct, status } = req.body;
    const r = await pool.query(
      `UPDATE stims_target_cycles
       SET name=$1, metric=$2, total_target=$3, allocation_method=$4, scope=$5,
           currency=$6, growth_pct=$7, status=$8, updated_at=NOW()
       WHERE id=$9 AND org_id=$10 RETURNING *`,
      [name, metric, total_target, allocation_method, scope, currency, growth_pct, status, req.params.id, req.orgId!]
    );
    res.json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stims/target-cycles/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM stims_target_cycles WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Quotas ───────────────────────────────────────────────────────────────────

router.get("/stims/target-cycles/:cycleId/quotas", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT q.*, u.name AS user_name, u.email AS user_email
      FROM stims_quotas q
      LEFT JOIN users u ON u.id = q.user_id
      WHERE q.cycle_id = $1 AND q.org_id = $2
      ORDER BY u.name
    `, [req.params.cycleId, req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/target-cycles/:cycleId/quotas", async (req, res) => {
  try {
    const { user_id, quota_amount, ramp_pct, period_breakdowns, is_new_hire } = req.body;
    const r = await pool.query(
      `INSERT INTO stims_quotas (cycle_id, user_id, quota_amount, ramp_pct, period_breakdowns, is_new_hire, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (cycle_id, user_id) DO UPDATE
         SET quota_amount=$3, ramp_pct=$4, period_breakdowns=$5, is_new_hire=$6, updated_at=NOW()
       RETURNING *`,
      [req.params.cycleId, user_id, quota_amount, ramp_pct ?? 100, period_breakdowns ? JSON.stringify(period_breakdowns) : null, is_new_hire ?? false, req.orgId!]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/target-cycles/:cycleId/distribute", async (req, res) => {
  try {
    const { user_ids, allocation_method } = req.body;
    const cycleRow = await pool.query(`SELECT * FROM stims_target_cycles WHERE id=$1 AND org_id=$2`, [req.params.cycleId, req.orgId!]);
    const cycle = cycleRow.rows[0] as Record<string, unknown>;
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });

    const total = Number(cycle.total_target);
    const count = user_ids.length;
    const perRep = count > 0 ? total / count : 0;

    for (const uid of user_ids) {
      await pool.query(
        `INSERT INTO stims_quotas (cycle_id, user_id, quota_amount, ramp_pct, org_id)
         VALUES ($1,$2,$3,100,$4)
         ON CONFLICT (cycle_id, user_id) DO UPDATE SET quota_amount=$3, updated_at=NOW()`,
        [req.params.cycleId, uid, perRep, req.orgId!]
      );
    }
    res.json({ distributed: count, per_rep: perRep });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Incentive Plans ──────────────────────────────────────────────────────────

router.get("/stims/incentive-plans", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.*,
        (SELECT json_agg(t ORDER BY t.from_pct) FROM stims_plan_tiers t WHERE t.plan_id = p.id) AS tiers,
        (SELECT count(*) FROM stims_plan_assignments a WHERE a.plan_id = p.id) AS assignment_count
      FROM stims_incentive_plans p
      WHERE p.org_id = $1
      ORDER BY p.created_at DESC
    `, [req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stims/incentive-plans/:id", async (req, res) => {
  try {
    const [planRow, tiersRow, assignRow] = await Promise.all([
      pool.query(`SELECT * FROM stims_incentive_plans WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]),
      pool.query(`SELECT * FROM stims_plan_tiers WHERE plan_id=$1 AND org_id=$2 ORDER BY from_pct`, [req.params.id, req.orgId!]),
      pool.query(`
        SELECT a.*, u.name AS user_name, u.email
        FROM stims_plan_assignments a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.plan_id=$1 AND a.org_id=$2
      `, [req.params.id, req.orgId!]),
    ]);
    if (!planRow.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ ...planRow.rows[0], tiers: tiersRow.rows, assignments: assignRow.rows });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/incentive-plans", async (req, res) => {
  try {
    const {
      name, effective_start, effective_end, currency, base_variable_split,
      ote_amount, payout_frequency, threshold_pct, cap_pct, measure, notes, tiers
    } = req.body;
    const planRow = await pool.query(
      `INSERT INTO stims_incentive_plans
         (name, effective_start, effective_end, currency, base_variable_split, ote_amount,
          payout_frequency, threshold_pct, cap_pct, measure, notes, status, version, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',1,$12) RETURNING *`,
      [name, effective_start, effective_end, currency ?? "GBP", base_variable_split ?? 30,
       ote_amount, payout_frequency ?? "quarterly", threshold_pct ?? 70, cap_pct ?? null, measure ?? "revenue", notes ?? null, req.orgId!]
    );
    const plan = planRow.rows[0] as Record<string, unknown>;
    if (tiers?.length) {
      for (const t of tiers) {
        await pool.query(
          `INSERT INTO stims_plan_tiers (plan_id, from_pct, to_pct, rate_pct, label, org_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [plan.id, t.from_pct, t.to_pct ?? null, t.rate_pct, t.label ?? null, req.orgId!]
        );
      }
    }
    res.status(201).json(plan);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/stims/incentive-plans/:id", async (req, res) => {
  try {
    const {
      name, effective_start, effective_end, currency, base_variable_split,
      ote_amount, payout_frequency, threshold_pct, cap_pct, measure, notes, status, tiers
    } = req.body;
    const r = await pool.query(
      `UPDATE stims_incentive_plans SET name=$1, effective_start=$2, effective_end=$3,
       currency=$4, base_variable_split=$5, ote_amount=$6, payout_frequency=$7,
       threshold_pct=$8, cap_pct=$9, measure=$10, notes=$11, status=$12, updated_at=NOW()
       WHERE id=$13 AND org_id=$14 RETURNING *`,
      [name, effective_start, effective_end, currency, base_variable_split,
       ote_amount, payout_frequency, threshold_pct, cap_pct, measure, notes, status, req.params.id, req.orgId!]
    );
    if (tiers) {
      await pool.query(`DELETE FROM stims_plan_tiers WHERE plan_id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
      for (const t of tiers) {
        await pool.query(
          `INSERT INTO stims_plan_tiers (plan_id, from_pct, to_pct, rate_pct, label, org_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.params.id, t.from_pct, t.to_pct ?? null, t.rate_pct, t.label ?? null, req.orgId!]
        );
      }
    }
    res.json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stims/incentive-plans/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM stims_incentive_plans WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// Assign users to plan
router.post("/stims/incentive-plans/:id/assign", async (req, res) => {
  try {
    const { user_ids, effective_start, effective_end } = req.body;
    const planRow = await pool.query(`SELECT id FROM stims_incentive_plans WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
    if (!planRow.rows[0]) return res.status(404).json({ error: "Not found" });
    const results = [];
    for (const uid of user_ids) {
      const r = await pool.query(
        `INSERT INTO stims_plan_assignments (plan_id, user_id, effective_start, effective_end, org_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (plan_id, user_id) DO UPDATE SET effective_start=$3, effective_end=$4, updated_at=NOW()
         RETURNING *`,
        [req.params.id, uid, effective_start, effective_end ?? null, req.orgId!]
      );
      results.push(r.rows[0]);
    }
    res.json(results);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// Simulate plan payout for a given attainment %
router.post("/stims/incentive-plans/:id/simulate", async (req, res) => {
  try {
    const planRow = await pool.query(`SELECT * FROM stims_incentive_plans WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
    const tiersRow = await pool.query(`SELECT * FROM stims_plan_tiers WHERE plan_id=$1 AND org_id=$2 ORDER BY from_pct`, [req.params.id, req.orgId!]);
    const plan = planRow.rows[0] as Record<string, unknown>;
    if (!plan) return res.status(404).json({ error: "Not found" });

    const { attainment_pct, quota } = req.body as { attainment_pct: number; quota: number };
    const tiers = tiersRow.rows as Array<Record<string, unknown>>;
    const threshold = Number(plan.threshold_pct);
    const ote = Number(plan.ote_amount);
    const cap = plan.cap_pct ? Number(plan.cap_pct) : null;

    const effectivePct = cap ? Math.min(attainment_pct, cap) : attainment_pct;

    let payout = 0;
    let breakdown = "";

    if (effectivePct < threshold) {
      payout = 0;
      breakdown = `Below threshold (${threshold}%) — no payout`;
    } else {
      // Find applicable tier
      const tier = tiers.find(t => {
        const from = Number(t.from_pct);
        const to = t.to_pct ? Number(t.to_pct) : Infinity;
        return effectivePct >= from && effectivePct < to;
      }) ?? tiers[tiers.length - 1];

      if (tier) {
        const rate = Number(tier.rate_pct) / 100;
        payout = ote * rate * (effectivePct / 100);
        breakdown = `Tier ${tier.label ?? `${tier.from_pct}%–${tier.to_pct ?? "∞"}%`}: rate ${tier.rate_pct}% of OTE × attainment`;
      } else {
        payout = ote * (effectivePct / 100);
        breakdown = "Linear payout (no specific tier matched)";
      }
    }

    res.json({ attainment_pct: effectivePct, quota, payout: Math.round(payout * 100) / 100, breakdown });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Attainment ───────────────────────────────────────────────────────────────

router.get("/stims/attainment", async (req, res) => {
  try {
    const { period_id } = req.query;
    const r = await pool.query(`
      SELECT a.*, u.name AS user_name, u.email
      FROM stims_attainment a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.org_id = $2 AND ($1::int IS NULL OR a.fiscal_period_id = $1)
      ORDER BY u.name
    `, [period_id ?? null, req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/attainment", async (req, res) => {
  try {
    const { user_id, fiscal_period_id, actual_amount, source } = req.body;
    const r = await pool.query(
      `INSERT INTO stims_attainment (user_id, fiscal_period_id, actual_amount, source, org_id)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, fiscal_period_id) DO UPDATE
         SET actual_amount=$3, source=$4, updated_at=NOW()
       RETURNING *`,
      [user_id, fiscal_period_id, actual_amount, source ?? "manual", req.orgId!]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Calculation Runs ─────────────────────────────────────────────────────────

router.get("/stims/calc-runs", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT cr.*, fp.name AS period_name, u.name AS approved_by_name
      FROM stims_calc_runs cr
      LEFT JOIN stims_fiscal_periods fp ON fp.id = cr.fiscal_period_id
      LEFT JOIN users u ON u.id = cr.approved_by
      WHERE cr.org_id = $1
      ORDER BY cr.run_at DESC
    `, [req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stims/calc-runs/:id", async (req, res) => {
  try {
    const [runRow, linesRow] = await Promise.all([
      pool.query(`
        SELECT cr.*, fp.name AS period_name
        FROM stims_calc_runs cr
        LEFT JOIN stims_fiscal_periods fp ON fp.id = cr.fiscal_period_id
        WHERE cr.id = $1 AND cr.org_id = $2
      `, [req.params.id, req.orgId!]),
      pool.query(`
        SELECT pl.*, u.name AS user_name, u.email
        FROM stims_payout_lines pl
        LEFT JOIN users u ON u.id = pl.user_id
        WHERE pl.run_id = $1 AND pl.org_id = $2
        ORDER BY u.name
      `, [req.params.id, req.orgId!]),
    ]);
    if (!runRow.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ ...runRow.rows[0], lines: linesRow.rows });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/calc-runs", async (req, res) => {
  try {
    const { fiscal_period_id, cycle_id } = req.body;
    const orgId = req.orgId!;

    // Create the run record
    const runRow = await pool.query(
      `INSERT INTO stims_calc_runs (fiscal_period_id, cycle_id, status, org_id) VALUES ($1,$2,'draft',$3) RETURNING *`,
      [fiscal_period_id, cycle_id, orgId]
    );
    const run = runRow.rows[0] as Record<string, unknown>;

    // Fetch quotas for this cycle
    const quotasRow = await pool.query(
      `SELECT q.*, u.id AS uid FROM stims_quotas q JOIN users u ON u.id = q.user_id WHERE q.cycle_id = $1 AND q.org_id = $2`,
      [cycle_id, orgId]
    );

    // Fetch attainment for this period
    const attainRow = await pool.query(
      `SELECT * FROM stims_attainment WHERE fiscal_period_id = $1 AND org_id = $2`,
      [fiscal_period_id, orgId]
    );
    const attainMap = new Map<number, number>();
    for (const a of attainRow.rows as Array<Record<string, unknown>>) {
      attainMap.set(Number(a.user_id), Number(a.actual_amount));
    }

    let totalPayout = 0;
    const exceptions: string[] = [];

    for (const q of quotasRow.rows as Array<Record<string, unknown>>) {
      const userId = Number(q.user_id);
      const quota = Number(q.quota_amount);
      const actual = attainMap.get(userId) ?? 0;
      const attainPct = quota > 0 ? (actual / quota) * 100 : 0;

      // Find active plan for this user
      const planAssignRow = await pool.query(`
        SELECT pa.plan_id FROM stims_plan_assignments pa
        JOIN stims_incentive_plans p ON p.id = pa.plan_id
        WHERE pa.user_id = $1 AND p.status = 'active' AND pa.org_id = $2
        ORDER BY pa.created_at DESC LIMIT 1
      `, [userId, orgId]);

      if (!planAssignRow.rows[0]) {
        exceptions.push(`User ${userId}: no active incentive plan assigned`);
        await pool.query(
          `INSERT INTO stims_payout_lines (run_id, user_id, quota, actual, attainment_pct, gross_payout, net_payout, exception_note, org_id)
           VALUES ($1,$2,$3,$4,$5,0,0,$6,$7)`,
          [run.id, userId, quota, actual, attainPct, "No active plan", orgId]
        );
        continue;
      }

      const planId = (planAssignRow.rows[0] as Record<string, unknown>).plan_id;
      const planRow = await pool.query(`SELECT * FROM stims_incentive_plans WHERE id=$1 AND org_id=$2`, [planId, orgId]);
      const tiersRow = await pool.query(`SELECT * FROM stims_plan_tiers WHERE plan_id=$1 AND org_id=$2 ORDER BY from_pct`, [planId, orgId]);
      const plan = planRow.rows[0] as Record<string, unknown>;
      const tiers = tiersRow.rows as Array<Record<string, unknown>>;

      const threshold = Number(plan.threshold_pct);
      const ote = Number(plan.ote_amount);
      const capPct = plan.cap_pct ? Number(plan.cap_pct) : null;
      const effectivePct = capPct ? Math.min(attainPct, capPct) : attainPct;

      let grossPayout = 0;
      let breakdown = "";

      if (effectivePct < threshold) {
        grossPayout = 0;
        breakdown = `Below threshold (${threshold}%) — no payout`;
      } else {
        const tier = tiers.find(t => {
          const from = Number(t.from_pct);
          const to = t.to_pct ? Number(t.to_pct) : Infinity;
          return effectivePct >= from && effectivePct < to;
        }) ?? tiers[tiers.length - 1];

        if (tier) {
          const rate = Number(tier.rate_pct) / 100;
          grossPayout = ote * rate * (effectivePct / 100);
          breakdown = `Tier ${tier.label ?? `${tier.from_pct}%+`}: ${tier.rate_pct}% rate × ${effectivePct.toFixed(1)}% attainment`;
        } else {
          grossPayout = ote * (effectivePct / 100);
          breakdown = `Linear: OTE × ${effectivePct.toFixed(1)}% attainment`;
        }
      }

      grossPayout = Math.round(grossPayout * 100) / 100;
      totalPayout += grossPayout;

      await pool.query(
        `INSERT INTO stims_payout_lines (run_id, user_id, quota, actual, attainment_pct, gross_payout, net_payout, breakdown, org_id)
         VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8)`,
        [run.id, userId, quota, actual, attainPct, grossPayout, breakdown, orgId]
      );
    }

    await pool.query(`UPDATE stims_calc_runs SET total_payout=$1 WHERE id=$2 AND org_id=$3`, [totalPayout, run.id, orgId]);

    res.status(201).json({
      run_id: run.id,
      total_payout: totalPayout,
      exceptions,
      lines_created: quotasRow.rows.length,
    });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/stims/calc-runs/:id", async (req, res) => {
  try {
    const { status, approved_by } = req.body;
    const r = await pool.query(
      `UPDATE stims_calc_runs SET status=$1, approved_by=$2, updated_at=NOW() WHERE id=$3 AND org_id=$4 RETURNING *`,
      [status, approved_by ?? null, req.params.id, req.orgId!]
    );
    res.json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// Adjust a payout line
router.patch("/stims/payout-lines/:id", async (req, res) => {
  try {
    const { adjustment, adjustment_reason } = req.body;
    const lineRow = await pool.query(`SELECT * FROM stims_payout_lines WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
    const line = lineRow.rows[0] as Record<string, unknown>;
    if (!line) return res.status(404).json({ error: "Not found" });
    const net = (Number(line.gross_payout) + Number(adjustment)).toFixed(2);
    const r = await pool.query(
      `UPDATE stims_payout_lines SET adjustment=$1, adjustment_reason=$2, net_payout=$3, updated_at=NOW()
       WHERE id=$4 AND org_id=$5 RETURNING *`,
      [adjustment, adjustment_reason, net, req.params.id, req.orgId!]
    );
    res.json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// Export payout run as CSV data
router.get("/stims/calc-runs/:id/export", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.name AS rep_name, u.email, pl.quota, pl.actual, pl.attainment_pct,
             pl.gross_payout, pl.adjustment, pl.net_payout, pl.breakdown, pl.exception_note
      FROM stims_payout_lines pl
      LEFT JOIN users u ON u.id = pl.user_id
      WHERE pl.run_id = $1 AND pl.org_id = $2
      ORDER BY u.name
    `, [req.params.id, req.orgId!]);

    const headers = ["Rep Name","Email","Quota","Actual","Attainment %","Gross Payout","Adjustment","Net Payout","Notes","Exception"];
    const rows = (r.rows as Array<Record<string, unknown>>).map(row =>
      [row.rep_name, row.email, row.quota, row.actual, Number(row.attainment_pct).toFixed(1),
       row.gross_payout, row.adjustment ?? 0, row.net_payout, row.breakdown ?? "", row.exception_note ?? ""]
    );
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="payout-run-${req.params.id}.csv"`);
    res.send(csv);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Disputes ─────────────────────────────────────────────────────────────────

router.get("/stims/disputes", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT d.*, u.name AS user_name, pl.gross_payout, pl.net_payout
      FROM stims_disputes d
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN stims_payout_lines pl ON pl.id = d.payout_line_id
      WHERE d.org_id = $1
      ORDER BY d.created_at DESC
    `, [req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/disputes", async (req, res) => {
  try {
    const { payout_line_id, user_id, description } = req.body;
    const r = await pool.query(
      `INSERT INTO stims_disputes (payout_line_id, user_id, description, status, org_id)
       VALUES ($1,$2,$3,'open',$4) RETURNING *`,
      [payout_line_id, user_id, description, req.orgId!]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/stims/disputes/:id", async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const r = await pool.query(
      `UPDATE stims_disputes SET status=$1, resolution=$2, resolved_at=NOW(), updated_at=NOW()
       WHERE id=$3 AND org_id=$4 RETURNING *`,
      [status, resolution, req.params.id, req.orgId!]
    );
    res.json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Ramp Templates ────────────────────────────────────────────────────

router.get("/stims/ramp-templates", async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM stims_ramp_templates WHERE org_id = $1 ORDER BY name`, [req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stims/ramp-templates", async (req, res) => {
  try {
    const { name, months_schedule } = req.body;
    const r = await pool.query(
      `INSERT INTO stims_ramp_templates (name, months_schedule, org_id) VALUES ($1,$2,$3) RETURNING *`,
      [name, JSON.stringify(months_schedule), req.orgId!]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stims/ramp-templates/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM stims_ramp_templates WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId!]);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Performance Summary ──────────────────────────────────────────────────────

router.get("/stims/performance-summary", async (req, res) => {
  try {
    const { fiscal_period_id, cycle_id } = req.query;
    const r = await pool.query(`
      SELECT
        u.id AS user_id, u.name AS user_name, u.email,
        q.quota_amount AS quota,
        COALESCE(a.actual_amount, 0) AS actual,
        CASE WHEN q.quota_amount > 0
             THEN ROUND((COALESCE(a.actual_amount,0) / q.quota_amount) * 100, 1)
             ELSE 0 END AS attainment_pct,
        CASE WHEN q.quota_amount > 0
             THEN ROUND(q.quota_amount - COALESCE(a.actual_amount,0), 2)
             ELSE 0 END AS gap_to_target
      FROM stims_quotas q
      JOIN users u ON u.id = q.user_id
      LEFT JOIN stims_attainment a ON a.user_id = q.user_id AND a.fiscal_period_id = $1::int
      WHERE q.org_id = $3 AND ($2::int IS NULL OR q.cycle_id = $2)
      ORDER BY attainment_pct DESC
    `, [fiscal_period_id ?? null, cycle_id ?? null, req.orgId!]);
    res.json(r.rows);
  } catch (err) {
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
