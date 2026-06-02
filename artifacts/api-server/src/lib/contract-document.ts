// Generates a formatted contract agreement document from structured contract
// data so no one has to type the agreement by hand. Amounts are formatted in
// the system base currency (GBP). Pricing shows final line totals and the
// overall contract value only — internal discount/tax breakdown is omitted.

const PROVIDER_NAME = "ArborMind";

export interface ContractDocLineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ContractDocInput {
  contractNumber: string;
  name: string;
  accountName?: string | null;
  contactName?: string | null;
  ownerName?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  contractTermMonths?: number | null;
  autoRenew?: boolean | null;
  renewalTermMonths?: number | null;
  specialTerms?: string | null;
  description?: string | null;
  total: number;
  companySignerName?: string | null;
  customerSignerName?: string | null;
  items: ContractDocLineItem[];
}

function money(amount: number): string {
  return `£${Number(amount || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function longDate(value: Date | string | null | undefined): string {
  if (!value) return "____________________";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "____________________";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function padRight(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

function padLeft(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : " ".repeat(width - s.length) + s;
}

function termText(input: ContractDocInput): string {
  const parts: string[] = [];
  if (input.contractTermMonths) parts.push(`${input.contractTermMonths} month(s)`);
  parts.push(`commencing ${longDate(input.startDate)}`);
  parts.push(`and ending ${longDate(input.endDate)}`);
  let text = `This Agreement shall remain in effect for a term of ${parts.join(", ")}.`;
  if (input.autoRenew) {
    const renewal = input.renewalTermMonths ? `${input.renewalTermMonths} month(s)` : "an equivalent period";
    text += ` Upon expiry, this Agreement shall automatically renew for successive terms of ${renewal} unless either party provides written notice of non-renewal.`;
  }
  return text;
}

function pricingTable(items: ContractDocLineItem[]): string {
  const nameW = 40;
  const qtyW = 8;
  const priceW = 16;
  const totalW = 16;
  const header =
    padRight("Product / Service", nameW) +
    padLeft("Qty", qtyW) +
    padLeft("Unit Price", priceW) +
    padLeft("Amount", totalW);
  const divider = "-".repeat(nameW + qtyW + priceW + totalW);
  const rows = items.map((it) =>
    padRight(it.productName, nameW) +
    padLeft(String(it.quantity), qtyW) +
    padLeft(money(it.unitPrice), priceW) +
    padLeft(money(it.total), totalW),
  );
  return [header, divider, ...rows].join("\n");
}

export function generateContractDocument(input: ContractDocInput): { title: string; content: string } {
  const title = input.name || `Contract ${input.contractNumber}`;
  const customer = input.accountName || "the Customer";
  const lines: string[] = [];

  lines.push(title.toUpperCase());
  lines.push("");
  lines.push(`Contract Reference: ${input.contractNumber}`);
  lines.push(`Date: ${longDate(new Date())}`);
  lines.push("");
  lines.push("─".repeat(60));
  lines.push("");
  lines.push("1. PARTIES");
  lines.push("");
  lines.push(`This Contract Agreement (the "Agreement") is made between:`);
  lines.push("");
  lines.push(`  (a) ${PROVIDER_NAME} (the "Provider"); and`);
  lines.push("");
  lines.push(`  (b) ${customer} (the "Customer")${input.contactName ? `, represented by ${input.contactName}` : ""}.`);
  lines.push("");

  if (input.description && input.description.trim()) {
    lines.push("2. BACKGROUND");
    lines.push("");
    lines.push(input.description.trim());
    lines.push("");
    lines.push("3. TERM");
  } else {
    lines.push("2. TERM");
  }
  lines.push("");
  lines.push(termText(input));
  lines.push("");

  const scopeNum = input.description && input.description.trim() ? "4" : "3";
  lines.push(`${scopeNum}. SCOPE & PRICING`);
  lines.push("");
  if (input.items.length > 0) {
    lines.push("The Provider shall provide the following products and/or services:");
    lines.push("");
    lines.push(pricingTable(input.items));
    lines.push("");
  } else {
    lines.push("The products and services to be provided are as set out in the relevant order documentation.");
    lines.push("");
  }
  lines.push(`Total Contract Value: ${money(input.total)}`);
  lines.push("");

  const termsNum = input.description && input.description.trim() ? "5" : "4";
  if (input.specialTerms && input.specialTerms.trim()) {
    lines.push(`${termsNum}. SPECIAL TERMS & CONDITIONS`);
    lines.push("");
    lines.push(input.specialTerms.trim());
    lines.push("");
  }

  const sigNum = input.description && input.description.trim()
    ? (input.specialTerms && input.specialTerms.trim() ? "6" : "5")
    : (input.specialTerms && input.specialTerms.trim() ? "5" : "4");
  lines.push(`${sigNum}. SIGNATURES`);
  lines.push("");
  lines.push("Signed for and on behalf of the Provider:");
  lines.push("");
  lines.push(`  Name:  ${input.companySignerName || input.ownerName || "____________________"}`);
  lines.push("  Signature:  ____________________        Date:  ____________________");
  lines.push("");
  lines.push("Signed for and on behalf of the Customer:");
  lines.push("");
  lines.push(`  Name:  ${input.customerSignerName || input.contactName || "____________________"}`);
  lines.push("  Signature:  ____________________        Date:  ____________________");
  lines.push("");

  return { title, content: lines.join("\n") };
}
