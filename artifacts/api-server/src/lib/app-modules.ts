import { db } from "@workspace/db";
import { appModulesTable, type AppModule } from "@workspace/db";

export const SEED_MODULES: Array<{
  key: string; label: string; description: string;
  isEnabled: boolean; isCore: boolean; sortOrder: number;
}> = [
  {
    key: "crm_sales",
    label: "CRM Sales",
    description: "Core CRM features: Leads, Contacts, Accounts, Opportunities, Activities, Campaigns, Reports and AI Assistant. Always active.",
    isEnabled: true,
    isCore: true,
    sortOrder: 10,
  },
  {
    key: "quotes",
    label: "Quote Management",
    description: "Create, configure and send pricing quotes. Includes approval workflows and PDF generation.",
    isEnabled: true,
    isCore: false,
    sortOrder: 20,
  },
  {
    key: "orders",
    label: "Order Management",
    description: "Track customer orders from placement to fulfilment. Syncs with Quotes and Opportunities.",
    isEnabled: true,
    isCore: false,
    sortOrder: 30,
  },
  {
    key: "contracts",
    label: "Contract Management",
    description: "Full contract lifecycle management — Draft, Under Review, Active, Expired and Terminated. Enabling this module activates the complete lifecycle workflow.",
    isEnabled: true,
    isCore: false,
    sortOrder: 40,
  },
  {
    key: "cpq",
    label: "CPQ (Configure-Price-Quote)",
    description: "Advanced guided selling, product configurator, quote line editor, pricing rules and CPQ dashboard. Enable for customers who need Salesforce-style CPQ workflows.",
    isEnabled: false,
    isCore: false,
    sortOrder: 50,
  },
];

// Which nav screen keys each module owns.
export const MODULE_SCREENS: Record<string, string[]> = {
  crm_sales: [
    "dashboard", "leads", "contacts", "accounts", "opportunities",
    "activities", "campaigns", "website-visits", "reports", "ai-assistant",
    "products", "price-books", "cases", "support", "users", "approvals", "access-control",
  ],
  quotes: ["quotes"],
  orders: ["orders"],
  contracts: ["contracts"],
};

let seeded = false;
export async function seedAppModules(): Promise<void> {
  if (seeded) return;
  try {
    await db.insert(appModulesTable).values(SEED_MODULES).onConflictDoNothing();
    seeded = true;
  } catch (err) {
    console.error("[AppModules] Seed failed:", err);
  }
}

export async function getEnabledModules(): Promise<Record<string, boolean>> {
  try {
    const rows = await db.select().from(appModulesTable);
    const out: Record<string, boolean> = {};
    for (const r of rows) out[r.key] = r.isEnabled;
    // Ensure core module is always shown as enabled
    out["crm_sales"] = true;
    return out;
  } catch {
    // Fallback — if table doesn't exist yet return all enabled
    return { crm_sales: true, quotes: true, orders: true, contracts: true };
  }
}
