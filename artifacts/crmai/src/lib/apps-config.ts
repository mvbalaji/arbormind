export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  color: string; // tailwind bg color class for the icon tile
  emoji: string;
  navHrefs: string[]; // which BASE_NAV_ITEMS hrefs belong to this app
  moduleKeys?: string[]; // optional: module keys required to show this app
  cpqRequired?: boolean;
}

export const APP_DEFINITIONS: AppDefinition[] = [
  {
    id: "sales",
    name: "Sales",
    description: "Leads, contacts, accounts, opportunities and activities",
    color: "bg-blue-600",
    emoji: "💼",
    navHrefs: ["/", "/sales-manager", "/leads", "/contacts", "/accounts", "/opportunities", "/campaigns", "/website-visitors", "/activities"],
  },
  {
    id: "quotes_orders",
    name: "Quotes & Orders",
    description: "Price books, products, quotes, and orders",
    color: "bg-emerald-600",
    emoji: "📋",
    navHrefs: ["/products", "/product-bundles", "/price-books", "/quotes", "/orders"],
    moduleKeys: ["quotes", "orders"],
  },
  {
    id: "cpq",
    name: "CPQ",
    description: "Configure, price, and quote with guided selling and product configurator",
    color: "bg-violet-600",
    emoji: "⚙️",
    navHrefs: ["/cpq", "/cpq/guided-selling", "/cpq/configurator", "/cpq/qle", "/cpq/pricing", "/cpq/admin"],
    cpqRequired: true,
  },
  {
    id: "contracts",
    name: "Contracts (CLM)",
    description: "Contract lifecycle management, templates, renewals, and alerts",
    color: "bg-amber-600",
    emoji: "📝",
    navHrefs: ["/contracts", "/clm/templates", "/clm/renewals", "/clm/workflow", "/clm/notifications"],
    moduleKeys: ["contracts"],
  },
  {
    id: "service",
    name: "Service",
    description: "Cases, support and customer service tools",
    color: "bg-rose-600",
    emoji: "🎧",
    navHrefs: ["/cases", "/support"],
  },
  {
    id: "incentives",
    name: "Sales Incentives",
    description: "Sales performance, targets, incentive plans and payouts",
    color: "bg-orange-600",
    emoji: "🏆",
    navHrefs: ["/stims/dashboard", "/stims/target-cycles", "/stims/incentive-plans", "/stims/calc-runs", "/stims/admin"],
  },
  {
    id: "analytics",
    name: "Analytics & AI",
    description: "Reports, AI assistant and approvals",
    color: "bg-cyan-600",
    emoji: "📊",
    navHrefs: ["/reports", "/ai-assistant", "/approvals"],
  },
  {
    id: "admin",
    name: "Administration",
    description: "System admin, users, product rules and app management",
    color: "bg-slate-600",
    emoji: "🔧",
    navHrefs: ["/users", "/admin/product-rules", "/app-management"],
  },
];

export const ALL_APP_ID = "__all__";
