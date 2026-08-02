import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const DEFAULT_VOLUME_TIERS = [
  { min: 1, max: 10, disc: 0 },
  { min: 11, max: 25, disc: 5 },
  { min: 26, max: 50, disc: 10 },
  { min: 51, max: 100, disc: 15 },
  { min: 101, max: null, disc: 20 },
];

const DEFAULT_APPROVAL_THRESHOLDS = [
  { pct: 10, approver: "Team Lead" },
  { pct: 20, approver: "Manager" },
  { pct: 30, approver: "Director" },
  { pct: 40, approver: "VP" },
];

const DEFAULT_PARTNER_TIERS = [
  { tier: "Registered", disc: 5 },
  { tier: "Silver", disc: 10 },
  { tier: "Gold", disc: 15 },
  { tier: "Platinum", disc: 25 },
];

async function ensureAuditTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cpq_settings_audit (
      id SERIAL PRIMARY KEY,
      setting_key TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by_id INTEGER,
      changed_by_name TEXT,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function logAudit(orgId: number, key: string, oldVal: string | null, newVal: string, userId?: number, userName?: string) {
  try {
    await ensureAuditTable();
    await db.execute(sql`
      INSERT INTO cpq_settings_audit (setting_key, old_value, new_value, changed_by_id, changed_by_name, org_id)
      VALUES (${key}, ${oldVal}, ${newVal}, ${userId ?? null}, ${userName ?? "System"}, ${orgId})
    `);
  } catch (err) {
    console.error("[CPQ audit]", err);
  }
}

// Per-org business config (pricing tiers, guided selling) is namespaced onto the
// key itself since `admin_settings` is a global key-value store shared with
// app-modules.ts's `cpq_enabled` toggle (deliberately kept a single global flag).
function orgScopedKey(key: string, orgId: number): string {
  return `${key}:org${orgId}`;
}

async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await db.execute(sql`SELECT value FROM admin_settings WHERE key = ${key} LIMIT 1`);
    const row = (rows as any).rows?.[0] ?? (rows as any)[0];
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO admin_settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `);
}

function isAdmin(req: any): boolean {
  const user = req.user ?? req.session?.user;
  const isDevMode = !process.env.GOOGLE_CLIENT_ID;
  if (isDevMode) return true;
  return user && (user.role === "admin" || user.role === "super_admin");
}

function getUser(req: any): { id?: number; name?: string } {
  const user = req.user ?? req.session?.user;
  if (!user) return {};
  return { id: user.id, name: user.name ?? user.email ?? "Admin" };
}

// GET /api/settings/cpq
router.get("/settings/cpq", async (req, res) => {
  try {
    const val = await getSetting("cpq_enabled");
    res.json({ enabled: val === "true" });
  } catch {
    res.json({ enabled: false });
  }
});

// POST /api/settings/cpq
router.post("/settings/cpq", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled must be a boolean" });
  try {
    const old = await getSetting("cpq_enabled");
    await setSetting("cpq_enabled", String(enabled));
    const { id, name } = getUser(req);
    await logAudit(req.orgId!, "cpq_enabled", old, String(enabled), id, name);
    res.json({ enabled });
  } catch (err) {
    console.error("[CPQ settings]", err);
    res.status(500).json({ error: "Failed to update CPQ setting" });
  }
});

// GET /api/settings/cpq/pricing
router.get("/settings/cpq/pricing", async (req, res) => {
  try {
    const orgId = req.orgId!;
    const [vt, at, pt] = await Promise.all([
      getSetting(orgScopedKey("cpq_volume_tiers", orgId)),
      getSetting(orgScopedKey("cpq_approval_thresholds", orgId)),
      getSetting(orgScopedKey("cpq_partner_tiers", orgId)),
    ]);
    res.json({
      volumeTiers: vt ? JSON.parse(vt) : DEFAULT_VOLUME_TIERS,
      approvalThresholds: at ? JSON.parse(at) : DEFAULT_APPROVAL_THRESHOLDS,
      partnerTiers: pt ? JSON.parse(pt) : DEFAULT_PARTNER_TIERS,
    });
  } catch (err) {
    console.error("[CPQ pricing settings]", err);
    res.json({
      volumeTiers: DEFAULT_VOLUME_TIERS,
      approvalThresholds: DEFAULT_APPROVAL_THRESHOLDS,
      partnerTiers: DEFAULT_PARTNER_TIERS,
    });
  }
});

// POST /api/settings/cpq/pricing
router.post("/settings/cpq/pricing", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  const { volumeTiers, approvalThresholds, partnerTiers } = req.body;
  try {
    const orgId = req.orgId!;
    const { id, name } = getUser(req);
    const tasks: Promise<void>[] = [];
    if (volumeTiers !== undefined) {
      const old = await getSetting(orgScopedKey("cpq_volume_tiers", orgId));
      const newVal = JSON.stringify(volumeTiers);
      tasks.push(setSetting(orgScopedKey("cpq_volume_tiers", orgId), newVal));
      tasks.push(logAudit(orgId, "cpq_volume_tiers", old, newVal, id, name));
    }
    if (approvalThresholds !== undefined) {
      const old = await getSetting(orgScopedKey("cpq_approval_thresholds", orgId));
      const newVal = JSON.stringify(approvalThresholds);
      tasks.push(setSetting(orgScopedKey("cpq_approval_thresholds", orgId), newVal));
      tasks.push(logAudit(orgId, "cpq_approval_thresholds", old, newVal, id, name));
    }
    if (partnerTiers !== undefined) {
      const old = await getSetting(orgScopedKey("cpq_partner_tiers", orgId));
      const newVal = JSON.stringify(partnerTiers);
      tasks.push(setSetting(orgScopedKey("cpq_partner_tiers", orgId), newVal));
      tasks.push(logAudit(orgId, "cpq_partner_tiers", old, newVal, id, name));
    }
    await Promise.all(tasks);
    res.json({ ok: true });
  } catch (err) {
    console.error("[CPQ pricing settings save]", err);
    res.status(500).json({ error: "Failed to save pricing settings" });
  }
});

// ── Guided Selling Flow ──────────────────────────────────────────────────────
const STEEL_FLOW = {
  id: "steel",
  name: "Steel Manufacturing",
  icon: "🏭",
  description: "Guided selling for steel distribution and processing sales reps.",
  steps: [
    {
      id: "sector", label: "Customer Sector", question: "Which industry sector is your customer in?",
      hint: "This drives grade selection, certification requirements, and delivery priorities.",
      type: "single",
      options: [
        { id: "automotive",   label: "Automotive & Tier 1",       icon: "🚗", hint: "Body panels, stampings, chassis, springs" },
        { id: "construction", label: "Construction & Civil",       icon: "🏗️", hint: "Rebar, beams, sections, roofing" },
        { id: "oil_gas",      label: "Oil & Gas / Energy",         icon: "⛽", hint: "Pipe, fittings, pressure vessels, offshore" },
        { id: "aerospace",    label: "Aerospace & Defence",        icon: "✈️", hint: "High-strength alloy, tight tol., certs" },
        { id: "fabrication",  label: "General Engineering / Fab",  icon: "🔩", hint: "Plate, sections, tube, machined parts" },
        { id: "yellow_goods", label: "Yellow Goods / Heavy Equip", icon: "🚜", hint: "Wear-resistant plate, structural steels" },
        { id: "shipbuilding", label: "Shipbuilding & Marine",      icon: "🚢", hint: "Shipbuilding plate, corrosion-resistant" },
        { id: "rail",         label: "Rail & Infrastructure",      icon: "🚆", hint: "Rails, sleeper clips, bridge steels" },
      ],
    },
    {
      id: "product", label: "Steel Product", question: "What steel product family does the customer need?",
      hint: "Select the primary product form — this determines the processing and inspection scope.",
      type: "single",
      options: [
        { id: "flat_hr",      label: "Flat — Hot Rolled Coil/Sheet",  icon: "📦", hint: "HRC, HRP&O, skelp — general structural & forming" },
        { id: "flat_cr",      label: "Flat — Cold Rolled & Coated",   icon: "🪟", hint: "CRC, galvanised (GI/GA), PPGI, electro-zinc" },
        { id: "long_rebar",   label: "Long — Rebar & Wire Rod",       icon: "📏", hint: "B500B/C rebar, wire rod, coiled bar" },
        { id: "long_section", label: "Long — Sections & Beams",       icon: "🏛️", hint: "UB, UC, PFC, RHS, SHS, angles, flats" },
        { id: "tube_pipe",    label: "Tube & Pipe",                   icon: "🔧", hint: "ERW, SSAW, seamless, CHS, RHS hollow sections" },
        { id: "plate",        label: "Plate — Structural & Wear Res.",icon: "🔲", hint: "S355, S690, Hardox, AR400/500 wear plate" },
        { id: "stainless",    label: "Stainless & Specialty Alloy",   icon: "✨", hint: "304/316 SS, duplex, tool steel, spring steel" },
        { id: "rail_steel",   label: "Rails & Heavy Sections",        icon: "🛤️", hint: "Flat-bottom rail, crane rail, heavy H-pile" },
      ],
    },
    {
      id: "spec", label: "Specification", question: "What is the primary specification driver?",
      hint: "Choose the single most important requirement — this determines which services and products to prioritise.",
      type: "single",
      options: [
        { id: "tolerance",    label: "Tight Tolerances / Precision Dims",   icon: "📐", hint: "±0.1 mm or better on thickness, width, flatness" },
        { id: "surface",      label: "Surface Finish / Coating Spec",        icon: "🪞", hint: "Mill scale, shot-blast Sa 2.5, primer, galv weight" },
        { id: "mechanical",   label: "Mechanical Properties (UTS/YS/CVN)",  icon: "💪", hint: "Tensile, yield, impact, hardness to standard" },
        { id: "corrosion",    label: "Corrosion / Oxidation Resistance",    icon: "🛡️", hint: "Coating system, stainless selection, weathering" },
        { id: "weldability",  label: "Weldability / Formability",           icon: "🔥", hint: "Carbon equivalent, CTOD, bend radius" },
        { id: "lead_time",    label: "Delivery Lead Time (Urgent)",         icon: "⚡", hint: "Ex-stock, next day, scheduled release" },
        { id: "certification",label: "Certification & Traceability",        icon: "📋", hint: "EN 10204 3.1/3.2, ASTM, DNV, LR, CE mark" },
        { id: "cost",         label: "Price / Volume Economics",            icon: "💰", hint: "Best landed cost, volume rebates, index-linked" },
      ],
    },
    {
      id: "services", label: "Value-Add Services", question: "Which value-add services are required?",
      hint: "Select all that apply — these form the service scope of the quote.",
      type: "multi",
      options: [
        { id: "cut_length",   label: "Cut to Length",                icon: "✂️",  hint: "Exact lengths, tolerance ±1 mm" },
        { id: "slitting",     label: "Slitting / Edge Conditioning", icon: "🔪", hint: "Slit coil to width, deburr, mill edge" },
        { id: "blanking",     label: "Blanking & Levelling",         icon: "📐", hint: "Flat blanks, sheet levelling, laser profiling" },
        { id: "shot_blast",   label: "Shot Blast & Prime",           icon: "💨", hint: "Sa 2.5 blast, epoxy or zinc primer" },
        { id: "heat_treat",   label: "Heat Treatment",               icon: "🔥", hint: "Normalise, quench & temper, stress relieve" },
        { id: "inspection",   label: "3rd-Party Inspection / NDT",   icon: "🔍", hint: "UT, MT, RT, PMI — on-site or lab" },
        { id: "stockholding", label: "Consignment / Stockholding",   icon: "🏭", hint: "Hold stock at our yard, call-off as needed" },
        { id: "jit",          label: "JIT / Sequenced Delivery",     icon: "🚚", hint: "Delivery timed to production schedule" },
        { id: "technical",    label: "Technical Advisory",           icon: "🎓", hint: "Grade selection, weld procedure, failure analysis" },
        { id: "certs",        label: "Test Certs & Mill Docs",       icon: "📄", hint: "3.1/3.2 certs, heat lists, CoC" },
      ],
    },
    {
      id: "volume", label: "Order Volume", question: "What is the estimated order volume?",
      hint: "Volume determines pricing tier, stock commitment, and freight economics.",
      type: "single",
      options: [
        { id: "spot_small", label: "< 50 tonnes",         icon: "🪣", hint: "Spot / project buy — ex-stock or short lead time" },
        { id: "spot_med",   label: "50 – 500 tonnes",     icon: "📦", hint: "Single order or mini-contract, 2–4 week schedule" },
        { id: "contract",   label: "500 – 5,000 tonnes",  icon: "🏗️", hint: "3–12 month supply contract, scheduled releases" },
        { id: "framework",  label: "5,000+ tonnes p.a.",  icon: "🏭", hint: "Annual framework / call-off, managed stockholding" },
      ],
    },
    {
      id: "commitment", label: "Commitment Type", question: "What type of commercial commitment is the customer offering?",
      hint: "Commitment type shapes pricing flexibility, payment terms, and stock risk allocation.",
      type: "single",
      options: [
        { id: "spot",        label: "Spot Buy",              icon: "⚡", hint: "One-off, no ongoing commitment — best price for the single order" },
        { id: "contract_3",  label: "Contract (3–6 months)", icon: "📋", hint: "Fixed volume & index-linked or fixed price for the period" },
        { id: "contract_12", label: "Contract (12 months)",  icon: "📑", hint: "Annual supply agreement — typically unlocks volume rebate" },
        { id: "framework",   label: "Framework Call-off",    icon: "🔄", hint: "12 months+, flexible release schedule, managed buffer stock" },
      ],
    },
  ],
};

const IT_FLOW = {
  id: "it",
  name: "IT / Software",
  icon: "💻",
  description: "Guided selling for technology and software solutions sales reps.",
  steps: [
    {
      id: "customer_size", label: "Customer Profile", question: "What is the customer's size and sector?",
      hint: "This shapes licensing model, procurement complexity, and compliance requirements.",
      type: "single",
      options: [
        { id: "enterprise",  label: "Enterprise (1,000+ seats)",   icon: "🏢", hint: "Complex procurement, multi-year roadmaps, executive sponsorship" },
        { id: "midmarket",   label: "Mid-Market (100–999)",         icon: "🏬", hint: "Growth-focused, value-driven, faster procurement cycles" },
        { id: "smb",         label: "SMB (< 100 users)",            icon: "🏪", hint: "Quick deployment, out-of-box, cost-sensitive" },
        { id: "public",      label: "Public Sector / Government",   icon: "🏛️", hint: "Framework-compliant, security-cleared, procurement-regulated" },
        { id: "healthcare",  label: "Healthcare & Life Sciences",   icon: "🏥", hint: "HIPAA/IG compliance, clinical workflow integration" },
        { id: "financial",   label: "Financial Services",           icon: "🏦", hint: "FCA/SOX compliance, low-latency, audit trail requirements" },
      ],
    },
    {
      id: "solution", label: "Solution Category", question: "Which technology solution category does the customer need?",
      hint: "Select the primary solution type — this determines the product and service scope.",
      type: "single",
      options: [
        { id: "cloud_infra",   label: "Cloud Infrastructure & IaaS",  icon: "☁️",  hint: "Compute, storage, networking, virtualisation" },
        { id: "saas_apps",     label: "SaaS Applications",            icon: "📱", hint: "CRM, ERP, ITSM, collaboration, productivity" },
        { id: "cybersecurity", label: "Cybersecurity",                icon: "🔐", hint: "SOC, SIEM, endpoint, IAM, vulnerability management" },
        { id: "data_bi",       label: "Data & Analytics / BI",        icon: "📊", hint: "Data warehousing, dashboards, ML pipelines" },
        { id: "ai_automation", label: "AI & Automation",              icon: "🤖", hint: "GenAI, RPA, intelligent process automation" },
        { id: "managed_it",    label: "Managed IT Services",          icon: "🖥️",  hint: "Outsourced helpdesk, NOC, infrastructure management" },
        { id: "dev_tools",     label: "Dev Tools & Platforms",        icon: "🛠️",  hint: "CI/CD, observability, developer portals" },
        { id: "euc",           label: "End-User Computing",           icon: "💻", hint: "Devices, VDI, unified endpoint management" },
      ],
    },
    {
      id: "driver", label: "Primary Driver", question: "What is the customer's primary business driver?",
      hint: "The key business objective shapes which capabilities and ROI metrics to emphasise.",
      type: "single",
      options: [
        { id: "cost",        label: "Cost Reduction / Opex Efficiency",  icon: "💰", hint: "Replace CapEx, optimise cloud spend, consolidate vendors" },
        { id: "digital_tx",  label: "Digital Transformation",           icon: "🚀", hint: "Modernise legacy systems, cloud-first strategy" },
        { id: "security",    label: "Security & Compliance",            icon: "🛡️",  hint: "Close audit findings, meet regulatory requirements" },
        { id: "scale",       label: "Scalability & Growth",             icon: "📈", hint: "Support headcount growth, expand to new markets" },
        { id: "integration", label: "System Integration",               icon: "🔗", hint: "Connect siloed systems, API-led connectivity" },
        { id: "bcdr",        label: "Business Continuity / DR",         icon: "🆘", hint: "Backup, failover, disaster recovery, RTO/RPO targets" },
      ],
    },
    {
      id: "services", label: "Required Services", question: "Which professional services are required?",
      hint: "Select all that apply — these define the services scope of the engagement.",
      type: "multi",
      options: [
        { id: "implementation",    label: "Implementation & Onboarding", icon: "🚀", hint: "Deployment, configuration, go-live support" },
        { id: "training",          label: "Technical Training",          icon: "🎓", hint: "Admin and end-user training programmes" },
        { id: "support",           label: "24/7 Support & SLA",          icon: "📞", hint: "Tiered support, guaranteed response times" },
        { id: "integration_dev",   label: "Integration Development",     icon: "🔌", hint: "Custom API connectors, middleware, webhooks" },
        { id: "data_migration",    label: "Data Migration",              icon: "📦", hint: "Legacy data extraction, cleansing, load" },
        { id: "security_assess",   label: "Security Assessment",         icon: "🔍", hint: "Penetration testing, risk assessment, hardening review" },
        { id: "licence_mgmt",      label: "Licence Management",          icon: "📋", hint: "Entitlement tracking, renewal management, true-up" },
        { id: "custom_dev",        label: "Custom Development",          icon: "🛠️",  hint: "Bespoke features, extensions, workflow automation" },
      ],
    },
    {
      id: "deployment", label: "Deployment Model", question: "What is the preferred deployment model?",
      hint: "Deployment model affects architecture, security posture, and commercial structure.",
      type: "single",
      options: [
        { id: "cloud_saas",     label: "Cloud / SaaS (multi-tenant)", icon: "☁️",  hint: "Fully hosted, auto-updates, per-seat or consumption pricing" },
        { id: "on_prem",        label: "On-Premises",                 icon: "🏢", hint: "Self-hosted, full data sovereignty, CapEx model" },
        { id: "hybrid",         label: "Hybrid",                      icon: "⚡", hint: "Split workloads between cloud and on-prem" },
        { id: "private_cloud",  label: "Private Cloud / Co-location", icon: "🔒", hint: "Dedicated infrastructure, cloud-like ops, enhanced compliance" },
      ],
    },
    {
      id: "term", label: "Contract Term", question: "What commercial commitment is the customer offering?",
      hint: "Longer terms unlock deeper discounts and enable strategic partnership pricing.",
      type: "single",
      options: [
        { id: "monthly",     label: "Monthly (pay-as-you-go)",    icon: "📅", hint: "Flexible, no commitment, highest per-unit cost" },
        { id: "annual",      label: "Annual Subscription",        icon: "📆", hint: "Standard commitment, ~20% saving vs monthly" },
        { id: "three_year",  label: "3-Year Agreement",           icon: "📑", hint: "Lock-in pricing, deepest discount, strategic partnership" },
        { id: "perpetual",   label: "Perpetual + Support",        icon: "🔄", hint: "One-time licence, annual maintenance & updates" },
      ],
    },
  ],
};

const STEEL_FAB_FLOW = {
  id: "steel_fab",
  name: "Steel Fabricated",
  icon: "🔩",
  description: "Guided selling for steel fabrication — structural work, vessels, machined components and pipework.",
  steps: [
    {
      id: "fab_sector", label: "Fabrication Sector", question: "Which fabrication sector is the customer operating in?",
      hint: "Sector determines codes, inspection standards, and documentation requirements.",
      type: "single",
      options: [
        { id: "structural",   label: "Structural Steelwork",          icon: "🏗️",  hint: "Buildings, bridges, industrial frames, mezzanines" },
        { id: "vessels",      label: "Platework & Pressure Vessels",  icon: "🏭", hint: "Tanks, silos, hoppers, pressure vessels, heat exchangers" },
        { id: "machined",     label: "Machined Components",           icon: "⚙️",  hint: "Turned parts, milled parts, precision components" },
        { id: "pipe_fab",     label: "Pipe Fabrication & Pipework",   icon: "🔧", hint: "Pipework assemblies, manifolds, spools, headers" },
        { id: "offshore",     label: "Offshore & Marine Modules",     icon: "⚓", hint: "Topside modules, skids, marine structures" },
        { id: "mining",       label: "Mining & Heavy Engineering",    icon: "⛏️",  hint: "Conveyors, chutes, crushers, material handling" },
        { id: "rail_trans",   label: "Rail & Transportation",         icon: "🚆", hint: "Bogie frames, underframes, track equipment" },
        { id: "defence_aero", label: "Defence & Aerospace Assembly",  icon: "✈️",  hint: "Armoured structures, aerospace brackets, precision weldments" },
      ],
    },
    {
      id: "process", label: "Fabrication Process", question: "What is the primary fabrication process required?",
      hint: "The dominant process drives tooling, lead time, and quality plan scope.",
      type: "single",
      options: [
        { id: "structural_weld", label: "Structural Fabrication & Welding", icon: "🔥", hint: "Cut, drill, fit, weld, dress structural sections" },
        { id: "cnc",             label: "CNC Machining",                    icon: "🔩", hint: "Turning, milling, boring, grinding to tight tolerance" },
        { id: "plate_roll",      label: "Plate Rolling & Section Bending",  icon: "🌀", hint: "Cone rolls, angle rolls, press forming, pyramids" },
        { id: "profile_cut",     label: "Laser / Plasma / Waterjet Cut",    icon: "✂️",  hint: "Profile cutting from sheet, plate, tube, nesting" },
        { id: "heavy_weld",      label: "Heavy Weld & Cladding",            icon: "💪", hint: "Hard-facing, overlay welding, dissimilar metal joins" },
        { id: "pipe_fit",        label: "Pipe Fitting & Assembly",          icon: "🔧", hint: "Threaded, flanged, orbital-welded pipework" },
        { id: "sub_assembly",    label: "Structural Assembly & Fit-out",    icon: "🏗️",  hint: "Sub-assembly, bolted connections, modular build" },
        { id: "surface_tx",      label: "Surface Treatment & Coating",      icon: "🖌️",  hint: "Blasting, painting, galvanising, powder coat" },
      ],
    },
    {
      id: "material", label: "Material Grade", question: "What material specification is required?",
      hint: "Grade selection directly affects weld procedure, heat treatment, and inspection scope.",
      type: "single",
      options: [
        { id: "std_struct",  label: "Structural (S275 / S355 / A36)",     icon: "🏗️",  hint: "Standard structural grades, most widely used" },
        { id: "hi_strength", label: "High Strength (S460 / S690 / Weldox)", icon: "💪", hint: "Reduced weight, higher strength-to-weight ratio" },
        { id: "pv_grade",    label: "Pressure Vessel (P265 / P355NH)",    icon: "🏭", hint: "Notch toughness, impact tested, PED compliant" },
        { id: "stainless",   label: "Stainless (304 / 316 / Duplex)",     icon: "✨", hint: "Corrosion resistance, hygienic, elevated temp" },
        { id: "wear_res",    label: "Wear Resistant (Hardox / AR400/500)",icon: "🛡️",  hint: "Abrasion resistance for mining, chutes, hoppers" },
        { id: "heat_res",    label: "Heat Resistant (H-grade / Creep)",   icon: "🔥", hint: "Elevated temperature service, power generation" },
        { id: "weathering",  label: "Weathering Steel (COR-TEN / S355J2W)", icon: "🌦️", hint: "Unpainted bridges, facades, outdoor structures" },
        { id: "cryogenic",   label: "Cryogenic (LT / Impact Tested)",     icon: "❄️",  hint: "LNG, cryogenic storage, cold climate service" },
      ],
    },
    {
      id: "services", label: "Required Services", question: "Which services are required on this fabrication?",
      hint: "Select all that apply — these form the quality and delivery scope.",
      type: "multi",
      options: [
        { id: "detailing",   label: "3D Detailing & Approval Drawings", icon: "📐", hint: "Fabrication drawings, GA, IFC documentation" },
        { id: "material_proc", label: "Material Procurement",           icon: "📦", hint: "Mill order, stockholder, full material management" },
        { id: "ndt",         label: "NDT & Third-Party Inspection",     icon: "🔍", hint: "UT, MT, RT, TOFD, third-party witness" },
        { id: "ce_mark",     label: "CE Marking & Certification",       icon: "📋", hint: "EN 1090 EXC2/3, pressure directive, CE marking" },
        { id: "coating",     label: "Surface Prep & Protective Coating",icon: "🖌️",  hint: "Blast, primer, topcoat to client specification" },
        { id: "assembly_test", label: "Assembly & Test Fit",            icon: "🔧", hint: "Pre-assembly, fit-check, dimensional survey" },
        { id: "pwht",        label: "Heat Treatment (PWHT)",            icon: "🔥", hint: "Post-weld heat treatment, normalising, stress relieving" },
        { id: "transport",   label: "Transport & Site Delivery",        icon: "🚚", hint: "Abnormal load, site crane off-load, sequenced delivery" },
      ],
    },
    {
      id: "scale", label: "Project Scale", question: "What is the anticipated project volume?",
      hint: "Scale drives resource planning, tooling investment, and programme commitment.",
      type: "single",
      options: [
        { id: "proto",   label: "Prototype / Sample (< 5t)",       icon: "🧪", hint: "R&D, first-article, single item or small batch" },
        { id: "small",   label: "Small Project (5 – 50t)",          icon: "📦", hint: "Short run, 4–8 week programme" },
        { id: "medium",  label: "Medium Project (50 – 500t)",       icon: "🏗️",  hint: "Structured programme, 8–20 weeks" },
        { id: "major",   label: "Major Project (500t+)",            icon: "🏭", hint: "Long programme, resource planning, milestone management" },
      ],
    },
    {
      id: "timeline", label: "Delivery Requirement", question: "What is the delivery timeline?",
      hint: "Urgency affects capacity allocation, overtime premiums, and subcontract scope.",
      type: "single",
      options: [
        { id: "standard",    label: "Standard (8 – 12 weeks)",     icon: "📅", hint: "Normal programme from order confirmation" },
        { id: "accelerated", label: "Accelerated (4 – 8 weeks)",   icon: "⚡", hint: "Fast-track with premium capacity commitment" },
        { id: "urgent",      label: "Urgent (< 4 weeks)",          icon: "🚨", hint: "Emergency programme, overtime, dedicated resource" },
        { id: "phased",      label: "Phased / JIT Delivery",       icon: "🔄", hint: "Sequenced to site programme or erection schedule" },
      ],
    },
  ],
};

const DEFAULT_GUIDED_SELLING_CONFIG = { flows: [STEEL_FLOW, STEEL_FAB_FLOW, IT_FLOW] };

// GET /api/settings/cpq/guided-selling
router.get("/settings/cpq/guided-selling", async (req, res) => {
  try {
    const val = await getSetting(orgScopedKey("cpq_guided_selling", req.orgId!));
    if (val) {
      const parsed = JSON.parse(val);
      // Migrate old single-flow format (has steps[] but no flows[])
      if (parsed.steps && !parsed.flows) {
        res.json({ flows: [{ id: "default", name: parsed.name ?? "Default", icon: "📋", description: parsed.description ?? "", steps: parsed.steps }] });
      } else {
        res.json(parsed);
      }
    } else {
      res.json(DEFAULT_GUIDED_SELLING_CONFIG);
    }
  } catch (err) {
    console.error("[CPQ guided selling get]", err);
    res.json(DEFAULT_GUIDED_SELLING_CONFIG);
  }
});

// PUT /api/settings/cpq/guided-selling
router.put("/settings/cpq/guided-selling", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const config = req.body;
    if (!config || !Array.isArray(config.flows)) return res.status(400).json({ error: "Invalid config" });
    const orgId = req.orgId!;
    const old = await getSetting(orgScopedKey("cpq_guided_selling", orgId));
    const newVal = JSON.stringify(config);
    await setSetting(orgScopedKey("cpq_guided_selling", orgId), newVal);
    const { id, name } = getUser(req);
    await logAudit(orgId, "cpq_guided_selling", old, newVal, id, name);
    res.json({ ok: true });
  } catch (err) {
    console.error("[CPQ guided selling save]", err);
    res.status(500).json({ error: "Failed to save guided selling config" });
  }
});

// GET /api/settings/cpq/audit — returns recent change history
router.get("/settings/cpq/audit", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    await ensureAuditTable();
    const rows = await db.execute(sql`
      SELECT id, setting_key, old_value, new_value, changed_by_name, changed_at
      FROM cpq_settings_audit
      WHERE org_id = ${req.orgId!}
      ORDER BY changed_at DESC
      LIMIT 50
    `);
    const list = ((rows as any).rows ?? rows) as any[];
    res.json({ entries: list });
  } catch (err) {
    console.error("[CPQ audit fetch]", err);
    res.json({ entries: [] });
  }
});

export default router;
