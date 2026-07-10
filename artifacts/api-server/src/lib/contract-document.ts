const PROVIDER_NAME = "ArborMind Solutions Ltd.";
const PROVIDER_ADDRESS = "1 Innovation Way, London, EC1A 1BB, United Kingdom";

export interface ContractDocLineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  listPrice?: number;
  discount?: number;
  total: number;
}

export interface ContractDocReview {
  stage: string;
  reviewerName?: string | null;
  status: string;
  dueDate?: Date | string | null;
  completedDate?: Date | string | null;
  notes?: string | null;
}

export interface ContractDocSigner {
  name: string;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  signedAt?: Date | string | null;
}

export interface ContractDocNote {
  body: string;
  createdByName?: string | null;
  createdAt?: Date | string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

export interface ContractDocInput {
  contractNumber: string;
  name: string;
  status?: string | null;
  accountName?: string | null;
  contactName?: string | null;
  ownerName?: string | null;
  opportunityName?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  contractTermMonths?: number | null;
  autoRenew?: boolean | null;
  renewalTermMonths?: number | null;
  specialTerms?: string | null;
  description?: string | null;
  total: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  companySignerName?: string | null;
  customerSignerName?: string | null;
  // CLM authoring fields
  contractType?: string | null;
  territory?: string | null;
  businessUnit?: string | null;
  priority?: string | null;
  governingLaw?: string | null;
  paymentTerms?: string | null;
  liabilityCapMultiplier?: number | null;
  confidentialityPeriodYears?: number | null;
  ipOwnership?: string | null;
  terminationNoticeDays?: number | null;
  counterpartyCompany?: string | null;
  counterpartySignerName?: string | null;
  counterpartySignerEmail?: string | null;
  counterpartySignerTitle?: string | null;
  counterpartyAddress?: string | null;
  signingProvider?: string | null;
  signingOrder?: string | null;
  signingDeadline?: Date | string | null;
  yearlyEscalationPct?: number | null;
  minimumAnnualCommit?: number | null;
  // Renewal
  renewalStatus?: string | null;
  renewalWindowDays?: number | null;
  arrAtRisk?: number | null;
  // Risk
  riskScore?: number | null;
  redlineRound?: number | null;
  // Template
  templateClauses?: string | null;
  // Related records
  reviews?: ContractDocReview[];
  signers?: ContractDocSigner[];
  notes?: ContractDocNote[];
  items: ContractDocLineItem[];
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function money(amount: number): string {
  return `£${Number(amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function longDate(value: Date | string | null | undefined): string {
  if (!value) return "[_______________]";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "[_______________]";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function shortDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function rule(char = "─", len = 80): string { return char.repeat(len); }

function heading(num: string, text: string): string {
  return `\n${num}. ${text.toUpperCase()}\n${rule("─", num.length + 2 + text.length)}\n`;
}

function subheading(text: string): string { return `\n   ${text}\n`; }

function para(text: string): string { return `   ${text.trim().replace(/\n/g, "\n   ")}\n`; }

function padRight(s: string, w: number): string { return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length); }
function padLeft(s: string, w: number): string  { return s.length >= w ? s.slice(0, w) : " ".repeat(w - s.length) + s; }

function pricingTable(items: ContractDocLineItem[], subtotal: number, discount: number, tax: number, total: number): string {
  const NW = 38, QW = 6, LW = 14, DW = 10, UW = 14, TW = 14;
  const divider = "   " + rule("-", NW + QW + LW + DW + UW + TW);
  const header  = "   " + padRight("Description", NW) + padLeft("Qty", QW) + padLeft("List Price", LW) + padLeft("Disc%", DW) + padLeft("Unit Price", UW) + padLeft("Amount", TW);

  const rows = items.map((it) => {
    const discPct = it.discount != null && it.discount > 0 ? `${it.discount.toFixed(1)}%` : "—";
    return "   " +
      padRight(it.productName, NW) +
      padLeft(String(it.quantity), QW) +
      padLeft(it.listPrice != null && it.listPrice !== it.unitPrice ? money(it.listPrice) : "—", LW) +
      padLeft(discPct, DW) +
      padLeft(money(it.unitPrice), UW) +
      padLeft(money(it.total), TW);
  });

  const lines = [header, divider, ...rows, divider];
  lines.push("   " + padRight("", NW + QW + LW + DW + UW) + padLeft(`Subtotal: ${money(subtotal)}`, TW));
  if (discount && discount > 0) lines.push("   " + padRight("", NW + QW + LW + DW + UW) + padLeft(`Discount (${discount}%): -${money(subtotal * discount / 100)}`, TW));
  if (tax && tax > 0)           lines.push("   " + padRight("", NW + QW + LW + DW + UW) + padLeft(`Tax (${tax}%): ${money((subtotal * (1 - discount / 100)) * tax / 100)}`, TW));
  lines.push("   " + padRight("", NW + QW + LW + DW + UW) + padLeft(`TOTAL: ${money(total)}`, TW));
  return lines.join("\n");
}

function statusBadge(s: string): string {
  return s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateContractDocument(input: ContractDocInput): { title: string; content: string } {
  const title = input.name || `Contract ${input.contractNumber}`;
  const customer   = input.counterpartyCompany || input.accountName || "the Customer";
  const custAddr   = input.counterpartyAddress  || "[Customer Address]";
  const now        = longDate(new Date());
  const L: string[] = [];

  // ── Cover ────────────────────────────────────────────────────────────────
  L.push(rule("═"));
  L.push("");
  L.push(title.toUpperCase().split("").join(" "));
  L.push("");
  if (input.contractType)   L.push(`Type:                ${input.contractType}`);
  L.push(`Contract Reference:  ${input.contractNumber}`);
  if (input.status)         L.push(`Status:              ${statusBadge(input.status)}`);
  L.push(`Date of Agreement:   ${now}`);
  if (input.signingDeadline) L.push(`Signing Deadline:    ${longDate(input.signingDeadline)}`);
  if (input.priority)       L.push(`Priority:            ${input.priority}`);
  if (input.territory)      L.push(`Territory / Region:  ${input.territory}`);
  if (input.businessUnit)   L.push(`Business Unit:       ${input.businessUnit}`);
  if (input.opportunityName) L.push(`Opportunity:         ${input.opportunityName}`);
  if (input.riskScore != null) L.push(`Risk Score:          ${input.riskScore}/100`);
  if (input.redlineRound != null && input.redlineRound > 0) L.push(`Redline Round:       ${input.redlineRound}`);
  L.push("");
  L.push(rule("═"));

  // ── Section counter ──────────────────────────────────────────────────────
  let sec = 0;
  const S = () => { sec++; return String(sec); };

  // ── 1. PARTIES ───────────────────────────────────────────────────────────
  L.push(heading(S(), "Parties"));
  L.push(para(`This ${input.contractType || "Contract Agreement"} (the "Agreement") is entered into as of ${now} by and between:`));
  L.push(subheading("Provider:"));
  L.push(para(`${PROVIDER_NAME}\n${PROVIDER_ADDRESS}\nContract Owner: ${input.ownerName || "[Contract Owner]"}`));
  L.push(subheading("Customer / Counterparty:"));
  L.push(para(`${customer}\n${custAddr}${input.contactName ? `\nPrimary Contact: ${input.contactName}` : ""}${input.counterpartySignerName ? `\nAuthorised Signatory: ${input.counterpartySignerName}${input.counterpartySignerTitle ? `, ${input.counterpartySignerTitle}` : ""}` : ""}${input.counterpartySignerEmail ? `\nEmail: ${input.counterpartySignerEmail}` : ""}`));
  L.push(para(`Each of the Provider and the Customer is referred to individually as a "Party" and collectively as the "Parties."`));

  // ── 2. BACKGROUND ────────────────────────────────────────────────────────
  if (input.description?.trim()) {
    L.push(heading(S(), "Background"));
    L.push(para(input.description.trim()));
  }

  // ── 3. TERM & RENEWAL ───────────────────────────────────────────────────
  L.push(heading(S(), "Term & Renewal"));
  const termParts: string[] = [];
  if (input.contractTermMonths) termParts.push(`${input.contractTermMonths} month(s)`);
  const termSentence = termParts.length
    ? `This Agreement shall remain in force for a term of ${termParts.join(", ")}, commencing on ${longDate(input.startDate)} and expiring on ${longDate(input.endDate)} (the "Initial Term"), unless terminated earlier in accordance with this Agreement.`
    : `This Agreement shall commence on ${longDate(input.startDate)} and expire on ${longDate(input.endDate)}, unless terminated earlier in accordance with this Agreement.`;
  L.push(para(termSentence));
  if (input.autoRenew) {
    const renewPeriod = input.renewalTermMonths ? `${input.renewalTermMonths} month(s)` : "an equivalent period";
    L.push(para(`Automatic Renewal: Upon expiry of the Initial Term, this Agreement shall automatically renew for successive periods of ${renewPeriod} unless either Party provides written notice of non-renewal at least ${input.terminationNoticeDays ?? 30} days prior to the end of the then-current term.`));
  } else {
    L.push(para(`This Agreement will not automatically renew. The Parties must execute a new agreement or an amendment to continue the arrangement after the expiry date.`));
  }
  if (input.yearlyEscalationPct != null && input.yearlyEscalationPct > 0) {
    L.push(para(`Price Escalation: Fees shall increase by ${input.yearlyEscalationPct}% per annum at each renewal.`));
  }
  if (input.renewalStatus) {
    L.push(para(`Renewal Status: ${statusBadge(input.renewalStatus)}${input.renewalWindowDays ? `. Renewal review window: ${input.renewalWindowDays} days before expiry.` : "."}`));
  }
  if (input.arrAtRisk != null && input.arrAtRisk > 0) {
    L.push(para(`ARR at Risk: ${money(input.arrAtRisk)} of annual recurring revenue is subject to renewal decision.`));
  }

  // ── 4. SCOPE OF SERVICES & PRICING ─────────────────────────────────────
  L.push(heading(S(), "Scope of Services & Pricing"));
  if (input.items.length > 0) {
    L.push(para(`The Provider shall provide the following products and/or services to the Customer during the Term:`));
    L.push("");
    L.push(pricingTable(input.items, input.subtotal ?? input.total, input.discount ?? 0, input.tax ?? 0, input.total));
    L.push("");
    if (input.minimumAnnualCommit != null && input.minimumAnnualCommit > 0) {
      L.push(para(`Minimum Annual Commitment: The Customer commits to a minimum annual spend of ${money(input.minimumAnnualCommit)}.`));
    }
  } else {
    L.push(para(`The products and services to be provided are as set out in the applicable Statement of Work or order documentation attached hereto as an exhibit.`));
    L.push(para(`Total Contract Value: ${money(input.total)}`));
  }

  // ── 5. PAYMENT TERMS ────────────────────────────────────────────────────
  L.push(heading(S(), "Payment Terms"));
  const pt = input.paymentTerms || "Net 30";
  L.push(para(`Payment is due ${pt} from the date of invoice. All amounts are exclusive of applicable taxes unless otherwise stated. Invoices not paid within the agreed terms shall accrue interest at 2% per month on the outstanding balance.`));
  if (input.minimumAnnualCommit != null && input.minimumAnnualCommit > 0) {
    L.push(para(`The Customer shall pay no less than ${money(input.minimumAnnualCommit)} per contract year regardless of actual usage.`));
  }

  // ── 6. INTELLECTUAL PROPERTY ────────────────────────────────────────────
  L.push(heading(S(), "Intellectual Property"));
  const ipText = input.ipOwnership
    ? {
        "Customer Owns": `All intellectual property created specifically for the Customer under this Agreement shall vest in and be owned by the Customer upon full payment. The Provider retains ownership of its pre-existing intellectual property and any general-purpose tools, methodologies, or frameworks.`,
        "Vendor Owns": `All intellectual property, including deliverables, developed by the Provider under this Agreement shall remain the sole property of the Provider. The Customer is granted a non-exclusive, non-transferable licence to use such deliverables for the duration of this Agreement.`,
        "Jointly Owned": `Intellectual property created jointly by the Parties under this Agreement shall be jointly owned. Each Party may exploit such jointly-owned IP without accounting to the other, unless otherwise agreed in writing.`,
        "Work-for-Hire": `All work product created by the Provider under this Agreement constitutes a work-for-hire and shall be the exclusive property of the Customer. The Provider assigns all rights, title, and interest to the Customer upon creation.`,
      }[input.ipOwnership] ?? `Intellectual property rights shall be allocated as specified in writing between the Parties.`
    : `The Provider retains ownership of its pre-existing intellectual property. Unless otherwise agreed in writing, no transfer of intellectual property is implied by this Agreement.`;
  L.push(para(ipText));

  // ── 7. CONFIDENTIALITY ──────────────────────────────────────────────────
  L.push(heading(S(), "Confidentiality"));
  const confYears = input.confidentialityPeriodYears ?? 3;
  L.push(para(`Each Party agrees to hold the other Party's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent. "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement.`));
  L.push(para(`These confidentiality obligations shall survive termination or expiry of this Agreement for a period of ${confYears} year(s).`));
  L.push(para(`Exceptions: These obligations do not apply to information that (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party; (c) is independently developed; or (d) is required to be disclosed by law or court order.`));

  // ── 8. LIABILITY & INDEMNIFICATION ──────────────────────────────────────
  L.push(heading(S(), "Liability & Indemnification"));
  const liabCap = input.liabilityCapMultiplier != null
    ? `The total aggregate liability of either Party under or in connection with this Agreement shall not exceed ${input.liabilityCapMultiplier}× the total fees paid or payable by the Customer in the twelve (12) months immediately preceding the claim.`
    : `The total aggregate liability of either Party shall not exceed the total fees paid by the Customer in the twelve (12) months preceding the claim.`;
  L.push(para(liabCap));
  L.push(para(`Neither Party shall be liable for indirect, incidental, consequential, special, or exemplary damages arising out of or related to this Agreement, even if advised of the possibility of such damages.`));
  L.push(para(`Each Party shall indemnify and hold the other harmless against any third-party claims arising from its own breach of this Agreement, negligence, or wilful misconduct.`));

  // ── 9. TERMINATION ──────────────────────────────────────────────────────
  L.push(heading(S(), "Termination"));
  const noticeDays = input.terminationNoticeDays ?? 30;
  L.push(para(`Either Party may terminate this Agreement for convenience upon ${noticeDays} days' written notice to the other Party.`));
  L.push(para(`Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) commits a material breach that remains uncured for 30 days after written notice; (b) becomes insolvent, makes an assignment for the benefit of creditors, or is subject to bankruptcy or liquidation proceedings.`));
  L.push(para(`Upon termination: (a) the Customer shall pay all amounts due for services rendered up to the termination date; (b) each Party shall return or destroy the other's Confidential Information; (c) any provisions that by their nature should survive shall survive termination.`));

  // ── 10. GOVERNING LAW & DISPUTE RESOLUTION ──────────────────────────────
  L.push(heading(S(), "Governing Law & Dispute Resolution"));
  const gl = input.governingLaw || "England and Wales";
  L.push(para(`This Agreement shall be governed by and construed in accordance with the laws of ${gl}, without regard to conflict-of-law principles.`));
  L.push(para(`The Parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the relevant arbitration body in ${gl}, unless the Parties agree otherwise in writing.`));

  // ── 11. APPROVAL & REVIEW HISTORY ───────────────────────────────────────
  if (input.reviews && input.reviews.length > 0) {
    L.push(heading(S(), "Approval & Review History"));
    L.push(para(`The following internal review stages have been completed or are in progress for this Agreement:`));
    L.push("");
    const RW = 20, SW = 14, NW = 22, DW = 14, CW = 14;
    const hdr = "   " + padRight("Stage", RW) + padRight("Status", SW) + padRight("Reviewer", NW) + padRight("Due Date", DW) + padRight("Completed", CW);
    const div = "   " + rule("-", RW + SW + NW + DW + CW);
    L.push(hdr);
    L.push(div);
    for (const rv of input.reviews) {
      L.push("   " +
        padRight(rv.stage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), RW) +
        padRight(statusBadge(rv.status), SW) +
        padRight(rv.reviewerName || "—", NW) +
        padRight(shortDate(rv.dueDate), DW) +
        padRight(shortDate(rv.completedDate), CW)
      );
      if (rv.notes) L.push(`      Notes: ${rv.notes}`);
    }
    L.push("");
  }

  // ── 12. SIGNING DETAILS ──────────────────────────────────────────────────
  const hasSigningDetails = input.signingProvider || input.signingOrder || (input.signers && input.signers.length > 0);
  if (hasSigningDetails) {
    L.push(heading(S(), "Signing Details"));
    if (input.signingProvider) L.push(para(`E-Signature Provider: ${input.signingProvider}`));
    if (input.signingOrder)    L.push(para(`Signing Order: ${input.signingOrder}`));
    if (input.signingDeadline) L.push(para(`Signing Deadline: ${longDate(input.signingDeadline)}`));
    if (input.signers && input.signers.length > 0) {
      L.push(subheading("Designated Signatories:"));
      for (const sg of input.signers) {
        const line = [
          sg.name,
          sg.role ? `(${sg.role})` : null,
          sg.email ? `<${sg.email}>` : null,
          sg.status ? `— ${statusBadge(sg.status)}` : null,
          sg.signedAt ? `on ${shortDate(sg.signedAt)}` : null,
        ].filter(Boolean).join(" ");
        L.push(para(line));
      }
    }
  }

  // ── 13. TEMPLATE / STANDARD CLAUSES ─────────────────────────────────────
  if (input.templateClauses?.trim()) {
    L.push(heading(S(), "Standard Clauses (from Contract Template)"));
    L.push(para(input.templateClauses.trim()));
  }

  // ── 14. SPECIAL TERMS & CONDITIONS ──────────────────────────────────────
  if (input.specialTerms?.trim()) {
    L.push(heading(S(), "Special Terms & Conditions"));
    L.push(para(input.specialTerms.trim()));
  }

  // ── 15. CONTRACT NOTES ───────────────────────────────────────────────────
  if (input.notes && input.notes.length > 0) {
    L.push(heading(S(), "Contract Notes & Attachments"));
    for (const note of input.notes) {
      const who = note.createdByName || "Team";
      const when = note.createdAt ? shortDate(note.createdAt) : "";
      L.push(para(`[${who}${when ? ` · ${when}` : ""}]`));
      if (note.body) L.push(para(note.body));
      if (note.attachmentName || note.attachmentUrl) {
        L.push(para(`Attachment: ${note.attachmentName || note.attachmentUrl}`));
      }
      L.push("");
    }
  }

  // ── 16. GENERAL PROVISIONS ──────────────────────────────────────────────
  L.push(heading(S(), "General Provisions"));
  L.push(subheading("Entire Agreement"));
  L.push(para(`This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements.`));
  L.push(subheading("Amendments"));
  L.push(para(`No amendment to this Agreement shall be effective unless made in writing and signed by authorised representatives of both Parties.`));
  L.push(subheading("Waiver"));
  L.push(para(`Failure by either Party to enforce any provision shall not constitute a waiver of that Party's right to enforce such provision in the future.`));
  L.push(subheading("Severability"));
  L.push(para(`If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.`));
  L.push(subheading("Notices"));
  L.push(para(`All notices shall be in writing and delivered by email (with confirmation of receipt) or registered post to the addresses set out in Section 1.`));
  L.push(subheading("Force Majeure"));
  L.push(para(`Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, pandemic, or government action, provided the affected Party gives prompt written notice.`));
  L.push(subheading("Assignment"));
  L.push(para(`Neither Party may assign its rights or obligations under this Agreement without the prior written consent of the other Party, except that either Party may assign to an affiliate or successor in connection with a merger or acquisition.`));

  // ── SIGNATURES ───────────────────────────────────────────────────────────
  L.push(`\n${rule("═")}`);
  L.push(heading(S(), "Execution / Signatures"));
  L.push(para(`IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.`));
  L.push("");

  const sigBlock = (party: string, name: string, title: string, company: string) => [
    `   For and on behalf of ${company}:`,
    ``,
    `   Name:        ${name}`,
    `   Title:       ${title}`,
    `   Signature:   _________________________________`,
    `   Date:        _________________________________`,
    ``,
  ];

  L.push(...sigBlock("Provider", input.companySignerName || input.ownerName || "[Authorised Signatory]", "Authorised Representative", PROVIDER_NAME));
  L.push(...sigBlock("Customer", input.counterpartySignerName || input.customerSignerName || input.contactName || "[Authorised Signatory]", input.counterpartySignerTitle || "Authorised Representative", customer));

  L.push(rule("═"));
  L.push(`   Document generated: ${longDate(new Date())}  |  ${input.contractNumber}  |  Confidential`);
  L.push(rule("═"));

  return { title, content: L.join("\n") };
}
