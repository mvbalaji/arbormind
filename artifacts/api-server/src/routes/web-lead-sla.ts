/**
 * Admin CRUD for web-to-lead SLA configuration.
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import multer from "multer";
import { getDefaultOrgId } from "../lib/org-context";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const REGIONS = ["Global", "India", "United Kingdom"];

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const r = result as { rows?: unknown[] };
  return (r.rows ?? []) as Record<string, unknown>[];
}

// Public read — used by web-to-lead handler
router.get("/admin/web-lead-sla/public", async (_req, res) => {
  try {
    const orgId = await getDefaultOrgId();
    const raw = await db.execute(sql`
      SELECT id, region, task_name, sla_hours, description, sort_order
      FROM web_lead_sla_config WHERE is_active = true AND org_id = ${orgId}
      ORDER BY region, sort_order, id
    `);
    res.json(rowsOf(raw));
  } catch { res.json([]); }
});

// GET /api/admin/web-lead-sla/template — download Excel template
router.get("/admin/web-lead-sla/template", (_req, res) => {
  const wb = XLSX.utils.book_new();
  const sampleRows = [
    ["Region", "Task Name", "SLA Hours", "Description", "Sort Order", "Active"],
    ["Global", "Initial outreach call", 1, "Call the lead within 1 hour of submission.", 10, "Yes"],
    ["Global", "Send introductory email", 4, "Send a personalised intro email.", 20, "Yes"],
    ["Global", "Qualification call", 24, "Conduct qualification call (BANT/MEDDIC).", 30, "Yes"],
    ["Global", "Product demo / discovery meeting", 72, "Schedule a product demonstration.", 40, "Yes"],
    ["Global", "Proposal & follow-up", 168, "Send a formal proposal.", 50, "Yes"],
    ["India", "Initial outreach call", 2, "Call within 2 hours (IST business hours).", 10, "Yes"],
    ["United Kingdom", "Initial outreach call", 1, "Call within 1 hour (GMT/BST).", 10, "Yes"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws["!cols"] = [{ wch: 16 }, { wch: 36 }, { wch: 12 }, { wch: 52 }, { wch: 12 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws, "SLA Config");

  // Instructions sheet
  const infoRows = [
    ["Instructions"],
    [""],
    ["Column", "Description", "Required", "Values"],
    ["Region", "Region name", "Yes", "Global | India | United Kingdom"],
    ["Task Name", "Name of the follow-up task", "Yes", "Free text"],
    ["SLA Hours", "Hours from lead submission when task is due", "Yes", "Number (e.g. 1, 4, 24, 72, 168)"],
    ["Description", "Guidance for the sales rep", "No", "Free text"],
    ["Sort Order", "Display order (lower = first)", "No", "Number (e.g. 10, 20, 30...)"],
    ["Active", "Whether task is enabled", "No", "Yes | No (default: Yes)"],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 16 }, { wch: 48 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Instructions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", "attachment; filename=web-lead-sla-template.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// POST /api/admin/web-lead-sla/import — bulk import from Excel/CSV
router.post("/admin/web-lead-sla/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) { res.status(422).json({ error: "No file uploaded" }); return; }

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames.find((n) => n.toLowerCase() !== "instructions") ?? wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    const mode = String(req.query.mode ?? "append"); // "append" | "replace"
    const orgId = req.orgId!;

    if (mode === "replace") {
      await db.execute(sql`DELETE FROM web_lead_sla_config WHERE org_id = ${orgId}`);
    }

    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header

      const region = String(row["Region"] ?? row["region"] ?? "").trim();
      const taskName = String(row["Task Name"] ?? row["task_name"] ?? row["TaskName"] ?? "").trim();
      const slaHours = Number(row["SLA Hours"] ?? row["sla_hours"] ?? row["SLAHours"] ?? 24);
      const description = String(row["Description"] ?? row["description"] ?? "").trim() || null;
      const sortOrder = Number(row["Sort Order"] ?? row["sort_order"] ?? row["SortOrder"] ?? 0);
      const activeRaw = String(row["Active"] ?? row["active"] ?? "Yes").trim().toLowerCase();
      const isActive = activeRaw !== "no" && activeRaw !== "false" && activeRaw !== "0";

      if (!region || !taskName) {
        errors.push(`Row ${rowNum}: Region and Task Name are required`);
        continue;
      }
      if (!REGIONS.includes(region)) {
        errors.push(`Row ${rowNum}: Region "${region}" not valid. Must be one of: ${REGIONS.join(", ")}`);
        continue;
      }
      if (isNaN(slaHours) || slaHours <= 0) {
        errors.push(`Row ${rowNum}: SLA Hours must be a positive number`);
        continue;
      }

      await db.execute(sql`
        INSERT INTO web_lead_sla_config (region, task_name, sla_hours, description, is_active, sort_order, org_id)
        VALUES (${region}, ${taskName}, ${slaHours}, ${description}, ${isActive}, ${sortOrder}, ${orgId})
      `);
      inserted++;
    }

    res.json({ ok: true, inserted, errors, total: rows.length });
  } catch (err) {
    console.error("[web-lead-sla] import:", err);
    res.status(500).json({ error: "Import failed. Check your file format." });
  }
});

// List all
router.get("/admin/web-lead-sla", async (req, res) => {
  try {
    const region = req.query.region ? String(req.query.region) : null;
    const raw = region
      ? await db.execute(sql`SELECT * FROM web_lead_sla_config WHERE region = ${region} AND org_id = ${req.orgId!} ORDER BY sort_order, id`)
      : await db.execute(sql`SELECT * FROM web_lead_sla_config WHERE org_id = ${req.orgId!} ORDER BY region, sort_order, id`);
    res.json(rowsOf(raw));
  } catch (err) {
    console.error("[web-lead-sla] list:", err);
    res.status(500).json({ error: "Failed to load SLA config" });
  }
});

// Create
router.post("/admin/web-lead-sla", async (req, res) => {
  try {
    const { region, taskName, slaHours, description, isActive, sortOrder } = req.body ?? {};
    if (!taskName || !region || slaHours == null) {
      res.status(422).json({ error: "region, taskName and slaHours are required" });
      return;
    }
    const raw = await db.execute(sql`
      INSERT INTO web_lead_sla_config (region, task_name, sla_hours, description, is_active, sort_order, org_id)
      VALUES (${String(region)}, ${String(taskName)}, ${Number(slaHours)}, ${description ?? null}, ${isActive !== false}, ${Number(sortOrder ?? 0)}, ${req.orgId!})
      RETURNING *
    `);
    res.status(201).json(rowsOf(raw)[0]);
  } catch (err) {
    console.error("[web-lead-sla] create:", err);
    res.status(500).json({ error: "Failed to create SLA task" });
  }
});

// Update
router.put("/admin/web-lead-sla/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { region, taskName, slaHours, description, isActive, sortOrder } = req.body ?? {};
    const raw = await db.execute(sql`
      UPDATE web_lead_sla_config SET
        region      = COALESCE(${region ?? null}, region),
        task_name   = COALESCE(${taskName ?? null}, task_name),
        sla_hours   = COALESCE(${slaHours != null ? Number(slaHours) : null}, sla_hours),
        description = COALESCE(${description ?? null}, description),
        is_active   = COALESCE(${isActive != null ? Boolean(isActive) : null}, is_active),
        sort_order  = COALESCE(${sortOrder != null ? Number(sortOrder) : null}, sort_order),
        updated_at  = NOW()
      WHERE id = ${id} AND org_id = ${req.orgId!} RETURNING *
    `);
    const row = rowsOf(raw)[0];
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    console.error("[web-lead-sla] update:", err);
    res.status(500).json({ error: "Failed to update" });
  }
});

// Delete
router.delete("/admin/web-lead-sla/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM web_lead_sla_config WHERE id = ${Number(req.params.id)} AND org_id = ${req.orgId!}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("[web-lead-sla] delete:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
