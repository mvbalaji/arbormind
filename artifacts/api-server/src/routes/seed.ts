import { Router } from "express";
import { db } from "@workspace/db";
import {
  accountsTable, contactsTable, leadsTable, opportunitiesTable,
  activitiesTable, productsTable, quotesTable, quoteItemsTable
} from "@workspace/db";
import { count, eq } from "drizzle-orm";

const router = Router();

router.post("/seed", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const [row] = await db.select({ n: count() }).from(accountsTable).where(eq(accountsTable.orgId, orgId));
    if ((row?.n ?? 0) > 2) {
      return res.json({ ok: true, message: "Database already seeded, skipping." });
    }

    // --- Products ---
    const prods = await db.insert(productsTable).values([
      { orgId, name: "CRM Pro License", code: "CRM-PRO", description: "Full-featured CRM license per seat/year", unitPrice: "1200.00", currency: "USD", category: "Software", isActive: true },
      { orgId, name: "CRM Starter License", code: "CRM-STR", description: "Starter CRM license per seat/year", unitPrice: "480.00", currency: "USD", category: "Software", isActive: true },
      { orgId, name: "Implementation & Onboarding", code: "IMPL-OB", description: "Professional services for setup and team onboarding", unitPrice: "4500.00", currency: "USD", category: "Services", isActive: true },
      { orgId, name: "Custom Integration Package", code: "INT-PKG", description: "API & custom integration development", unitPrice: "8000.00", currency: "USD", category: "Services", isActive: true },
      { orgId, name: "Priority Support (Annual)", code: "SUP-PRI", description: "Dedicated support channel, <2hr SLA", unitPrice: "2400.00", currency: "USD", category: "Support", isActive: true },
      { orgId, name: "Data Migration Service", code: "DAT-MIG", description: "Full data migration from legacy system", unitPrice: "3200.00", currency: "USD", category: "Services", isActive: true },
      { orgId, name: "Training Workshop (1 day)", code: "TRN-WS", description: "On-site or remote training workshop", unitPrice: "1800.00", currency: "USD", category: "Training", isActive: true },
      { orgId, name: "AI Insights Add-on", code: "AI-INS", description: "AI-powered lead scoring and deal intelligence", unitPrice: "600.00", currency: "USD", category: "Software", isActive: true },
    ]).returning();
    const [p1, p2, p3, p4, p5, p6, p7, p8] = prods;

    // --- Accounts ---
    const accs = await db.insert(accountsTable).values([
      { orgId, name: "Apex Technologies Pvt Ltd", industry: "Technology", website: "https://apextech.in", phone: "+91-80-4567-8900", email: "info@apextech.in", city: "Bengaluru", country: "India", employees: 320, annualRevenue: "4200000", description: "Enterprise software solutions provider focused on BFSI and logistics verticals." },
      { orgId, name: "Meridian Healthcare Group", industry: "Healthcare", website: "https://meridianhc.com", phone: "+91-22-2345-6789", email: "contact@meridianhc.com", city: "Mumbai", country: "India", employees: 1800, annualRevenue: "28000000", description: "Multi-speciality hospital chain with 12 facilities across Maharashtra and Goa." },
      { orgId, name: "GreenLeaf Agritech", industry: "Agriculture", website: "https://greenleaf.ag", phone: "+91-40-9876-5432", email: "hello@greenleaf.ag", city: "Hyderabad", country: "India", employees: 95, annualRevenue: "1100000", description: "AgriTech startup connecting farmers with direct market access using IoT sensors." },
      { orgId, name: "Starfield Retail Solutions", industry: "Retail", website: "https://starfieldretail.com", phone: "+91-44-7654-3210", email: "sales@starfieldretail.com", city: "Chennai", country: "India", employees: 540, annualRevenue: "9600000", description: "Omnichannel retail operations and inventory management for mid-market chains." },
      { orgId, name: "BlueSky Finserv", industry: "Financial Services", website: "https://blueskyfs.com", phone: "+91-11-6543-2109", email: "bd@blueskyfs.com", city: "New Delhi", country: "India", employees: 210, annualRevenue: "6500000", description: "NBFC offering MSME working capital loans and supply chain financing." },
      { orgId, name: "Catalyst EduTech", industry: "Education", website: "https://catalystedu.in", phone: "+91-80-1122-3344", email: "partnerships@catalystedu.in", city: "Bengaluru", country: "India", employees: 78, annualRevenue: "830000", description: "EdTech platform for upskilling professionals in data, cloud and DevOps domains." },
    ]).returning();
    const [a1, a2, a3, a4, a5, a6] = accs;

    // --- Contacts ---
    const conts = await db.insert(contactsTable).values([
      { orgId, firstName: "Rajesh", lastName: "Iyer", email: "rajesh.iyer@apextech.in", phone: "+91-98765-43210", title: "CTO", department: "Technology", accountId: a1!.id, leadSource: "referral", city: "Bengaluru", country: "India" },
      { orgId, firstName: "Priya", lastName: "Subramaniam", email: "priya.s@apextech.in", phone: "+91-98123-45678", title: "Head of Operations", department: "Operations", accountId: a1!.id, leadSource: "website", city: "Bengaluru", country: "India" },
      { orgId, firstName: "Ananya", lastName: "Krishnamurthy", email: "ananya.k@meridianhc.com", phone: "+91-98456-78901", title: "Chief Medical Officer", department: "Medical", accountId: a2!.id, leadSource: "conference", city: "Mumbai", country: "India" },
      { orgId, firstName: "Vikram", lastName: "Shah", email: "vikram.shah@meridianhc.com", phone: "+91-91234-56789", title: "VP Finance", department: "Finance", accountId: a2!.id, leadSource: "linkedin", city: "Mumbai", country: "India" },
      { orgId, firstName: "Kavitha", lastName: "Rajan", email: "kavitha@greenleaf.ag", phone: "+91-90987-65432", title: "Founder & CEO", department: "Executive", accountId: a3!.id, leadSource: "inbound", city: "Hyderabad", country: "India" },
      { orgId, firstName: "Suresh", lastName: "Natarajan", email: "suresh.n@starfieldretail.com", phone: "+91-99123-45678", title: "Director of Technology", department: "IT", accountId: a4!.id, leadSource: "partner", city: "Chennai", country: "India" },
      { orgId, firstName: "Meena", lastName: "Krishnan", email: "meena.k@starfieldretail.com", phone: "+91-88765-43210", title: "COO", department: "Operations", accountId: a4!.id, leadSource: "referral", city: "Chennai", country: "India" },
      { orgId, firstName: "Arjun", lastName: "Mehta", email: "arjun.m@blueskyfs.com", phone: "+91-98654-32109", title: "Chief Digital Officer", department: "Digital", accountId: a5!.id, leadSource: "linkedin", city: "New Delhi", country: "India" },
      { orgId, firstName: "Pooja", lastName: "Verma", email: "pooja.v@blueskyfs.com", phone: "+91-87654-32198", title: "VP Product", department: "Product", accountId: a5!.id, leadSource: "conference", city: "New Delhi", country: "India" },
      { orgId, firstName: "Rahul", lastName: "Sharma", email: "rahul.s@catalystedu.in", phone: "+91-96543-21098", title: "Co-Founder & CEO", department: "Executive", accountId: a6!.id, leadSource: "inbound", city: "Bengaluru", country: "India" },
      { orgId, firstName: "Nandini", lastName: "Pillai", email: "nandini.p@catalystedu.in", phone: "+91-85432-10987", title: "Head of Partnerships", department: "Business Development", accountId: a6!.id, leadSource: "referral", city: "Bengaluru", country: "India" },
      { orgId, firstName: "Karthik", lastName: "Balaji", email: "karthik.b@apextech.in", phone: "+91-74321-09876", title: "VP Engineering", department: "Engineering", accountId: a1!.id, leadSource: "website", city: "Bengaluru", country: "India" },
    ]).returning();
    const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12] = conts;

    // --- Leads ---
    await db.insert(leadsTable).values([
      { orgId, firstName: "Sanjay", lastName: "Gupta", email: "sanjay.gupta@techlabs.io", phone: "+91-97654-32109", company: "TechLabs India", title: "Head of IT", status: "new", source: "website", score: 85, employees: 150, industry: "Technology", annualRevenue: "2500000", description: "Interested in replacing their Zoho CRM for a 45-seat deployment." },
      { orgId, firstName: "Deepa", lastName: "Menon", email: "deepa.m@brightlogistics.com", phone: "+91-86543-21098", company: "Bright Logistics", title: "Operations Director", status: "contacted", source: "linkedin", score: 72, employees: 280, industry: "Logistics", annualRevenue: "5800000", description: "Looking for CRM with GPS tracking integration for field sales team." },
      { orgId, firstName: "Anil", lastName: "Kapoor", email: "anil.k@pulsepharma.com", phone: "+91-75432-10987", company: "Pulse Pharma", title: "Country Manager", status: "qualified", source: "referral", score: 91, employees: 620, industry: "Pharmaceuticals", annualRevenue: "18000000", description: "Evaluating enterprise CRM for 120 medical reps across 8 states." },
      { orgId, firstName: "Lakshmi", lastName: "Narayanan", email: "lakshmi.n@novafin.in", phone: "+91-64321-09876", company: "NovaFin", title: "CEO", status: "new", source: "conference", score: 65, employees: 45, industry: "Financial Services", annualRevenue: "900000", description: "Seed-stage fintech startup needing lightweight CRM for investor relations." },
      { orgId, firstName: "Praveen", lastName: "Kumar", email: "praveen.k@solargenix.com", phone: "+91-53210-98765", company: "SolarGenix", title: "VP Sales", status: "contacted", source: "inbound", score: 78, employees: 112, industry: "Energy", annualRevenue: "3200000", description: "Solar EPC company expanding to B2B enterprise accounts." },
      { orgId, firstName: "Gauri", lastName: "Agarwal", email: "gauri.a@nexwave.tech", phone: "+91-42109-87654", company: "NexWave Tech", title: "CTO", status: "qualified", source: "partner", score: 88, employees: 95, industry: "Technology", annualRevenue: "1800000", description: "Wants CRM integrated with their Jira/Slack/Hubspot stack." },
      { orgId, firstName: "Mohammed", lastName: "Rizvi", email: "m.rizvi@coastalfoods.in", phone: "+91-31098-76543", company: "Coastal Foods", title: "MD", status: "new", source: "referral", score: 55, employees: 1400, industry: "Food & Beverage", annualRevenue: "42000000", description: "Large FMCG player exploring CRM for their 200-person distributor sales team." },
      { orgId, firstName: "Tanvi", lastName: "Joshi", email: "tanvi.j@brandcraft.co", phone: "+91-20987-65432", company: "BrandCraft Agency", title: "CEO", status: "contacted", source: "website", score: 60, employees: 38, industry: "Marketing", annualRevenue: "720000", description: "Creative agency wanting CRM to manage retainer clients and campaign pipelines." },
      { orgId, firstName: "Vijay", lastName: "Nair", email: "vijay.n@precisionauto.in", phone: "+91-19876-54321", company: "Precision Auto Parts", title: "GM Sales", status: "qualified", source: "trade show", score: 80, employees: 310, industry: "Automotive", annualRevenue: "8900000", description: "Auto parts distributor needing quote generation and territory management." },
      { orgId, firstName: "Swati", lastName: "Deshpande", email: "swati.d@skyarchitects.com", phone: "+91-98760-54321", company: "Sky Architects", title: "Partner", status: "new", source: "website", score: 48, employees: 22, industry: "Architecture", annualRevenue: "480000", description: "Small architecture firm needing project-based CRM for client management." },
    ]);

    // --- Opportunities ---
    const opps = await db.insert(opportunitiesTable).values([
      { orgId, name: "Apex Technologies – Enterprise CRM Rollout", accountId: a1!.id, contactId: c1!.id, stage: "proposal", amount: "142000", probability: 65, closeDate: new Date("2026-06-30"), description: "320-seat CRM Pro rollout with custom ERP integration, 18-month contract.", leadSource: "referral", nextStep: "Send revised commercial proposal with revised SLAs." },
      { orgId, name: "Meridian Healthcare – Clinical CRM Pilot", accountId: a2!.id, contactId: c3!.id, stage: "negotiation", amount: "68000", probability: 80, closeDate: new Date("2026-05-15"), description: "50-seat pilot across 3 hospitals. IT and procurement sign-off pending.", leadSource: "conference", nextStep: "Legal review of DPA & HIPAA clauses by their compliance team." },
      { orgId, name: "Starfield Retail – Omnichannel CRM", accountId: a4!.id, contactId: c6!.id, stage: "closed_won", amount: "95000", probability: 100, closeDate: new Date("2026-03-31"), description: "Full omnichannel CRM for 85-store network. Signed and onboarding started.", leadSource: "partner", nextStep: "Kick-off data migration sprint next Monday." },
      { orgId, name: "BlueSky Finserv – Loan Origination CRM", accountId: a5!.id, contactId: c8!.id, stage: "discovery", amount: "55000", probability: 30, closeDate: new Date("2026-09-30"), description: "Custom workflow for loan origination pipeline plus compliance dashboards.", leadSource: "linkedin", nextStep: "Schedule technical demo with their dev team." },
      { orgId, name: "GreenLeaf Agritech – Starter Pack", accountId: a3!.id, contactId: c5!.id, stage: "prospecting", amount: "18000", probability: 20, closeDate: new Date("2026-08-31"), description: "15-seat starter package plus WhatsApp integration for farmer comms.", leadSource: "inbound", nextStep: "Complete discovery call to qualify budget and timeline." },
      { orgId, name: "Catalyst EduTech – B2B Partnership CRM", accountId: a6!.id, contactId: c11!.id, stage: "proposal", amount: "32000", probability: 55, closeDate: new Date("2026-07-15"), description: "CRM for tracking enterprise training partnerships and renewal pipelines.", leadSource: "inbound", nextStep: "Present ROI case study to CEO and board." },
      { orgId, name: "Meridian Healthcare – Full Enterprise Expansion", accountId: a2!.id, contactId: c4!.id, stage: "prospecting", amount: "210000", probability: 25, closeDate: new Date("2026-12-31"), description: "Full 1800-user enterprise rollout if pilot succeeds. Flagship deal.", leadSource: "conference", nextStep: "Pilot must close first. Keep exec relationship warm." },
      { orgId, name: "Apex Technologies – AI Insights Add-on", accountId: a1!.id, contactId: c12!.id, stage: "negotiation", amount: "28800", probability: 75, closeDate: new Date("2026-05-31"), description: "AI Insights add-on upsell for 48 power users within existing Apex account.", leadSource: "referral", nextStep: "Send AI feature walkthrough video and benchmark results." },
    ]).returning();
    const [o1, o2, o3, o4, o5, o6, o7, o8] = opps;

    // --- Activities ---
    const now = new Date();
    const d = (days: number) => new Date(now.getTime() + days * 86400000);
    await db.insert(activitiesTable).values([
      { orgId, type: "call", subject: "Discovery call with Apex Technologies", status: "completed", dueDate: d(-14), completedAt: d(-14), contactId: c1!.id, opportunityId: o1!.id, accountId: a1!.id, description: "Introductory call with Rajesh. Confirmed 320-seat requirement. Asked about ERP integration." },
      { orgId, type: "email", subject: "Proposal sent – Apex Enterprise CRM", status: "completed", dueDate: d(-7), completedAt: d(-7), contactId: c1!.id, opportunityId: o1!.id, accountId: a1!.id, description: "Sent detailed commercial proposal with pricing tiers and implementation timeline." },
      { orgId, type: "meeting", subject: "Exec alignment – Meridian Healthcare pilot", status: "completed", dueDate: d(-5), completedAt: d(-5), contactId: c3!.id, opportunityId: o2!.id, accountId: a2!.id, description: "Met with Dr. Ananya and legal team. HIPAA clause concerns raised and addressed." },
      { orgId, type: "task", subject: "Prepare ROI model for Catalyst EduTech", status: "planned", dueDate: d(3), contactId: c11!.id, opportunityId: o6!.id, accountId: a6!.id, description: "Build spreadsheet ROI model comparing current manual process cost vs CRM." },
      { orgId, type: "call", subject: "Follow-up on commercial terms – Meridian", status: "planned", dueDate: d(2), contactId: c4!.id, opportunityId: o2!.id, accountId: a2!.id, description: "Vikram to confirm procurement approval. Check if CFO sign-off is done." },
      { orgId, type: "meeting", subject: "Technical demo – BlueSky Finserv", status: "planned", dueDate: d(5), contactId: c8!.id, opportunityId: o4!.id, accountId: a5!.id, description: "Show custom workflow builder and compliance dashboard to their dev team." },
      { orgId, type: "email", subject: "AI Insights benchmark report – Apex", status: "completed", dueDate: d(-2), completedAt: d(-2), contactId: c12!.id, opportunityId: o8!.id, accountId: a1!.id, description: "Sent PDF with lead scoring accuracy benchmarks and competitor comparison." },
      { orgId, type: "task", subject: "Kickoff data migration – Starfield Retail", status: "planned", dueDate: d(1), contactId: c6!.id, opportunityId: o3!.id, accountId: a4!.id, description: "Coordinate with Starfield IT to export legacy CRM data in CSV format." },
      { orgId, type: "call", subject: "Qualifying call – GreenLeaf Agritech", status: "planned", dueDate: d(7), contactId: c5!.id, opportunityId: o5!.id, accountId: a3!.id, description: "Understand Kavitha's budget range and timeline. WhatsApp integration is key." },
      { orgId, type: "meeting", subject: "Onboarding session #1 – Starfield Retail", status: "completed", dueDate: d(-1), completedAt: d(-1), contactId: c7!.id, opportunityId: o3!.id, accountId: a4!.id, description: "Completed first onboarding session with Meena and her ops team. 12 users set up." },
      { orgId, type: "task", subject: "Update NDA – Apex Technologies", status: "completed", dueDate: d(-10), completedAt: d(-9), contactId: c2!.id, opportunityId: o1!.id, accountId: a1!.id, description: "Redlined NDA with Priya's legal team. Signed copy received." },
      { orgId, type: "call", subject: "CEO check-in – Catalyst EduTech", status: "completed", dueDate: d(-3), completedAt: d(-3), contactId: c10!.id, opportunityId: o6!.id, accountId: a6!.id, description: "Rahul is excited about partnership CRM. Budget approved in Q2 planning." },
      { orgId, type: "email", subject: "Feature request log – Meridian Healthcare", status: "completed", dueDate: d(-6), completedAt: d(-6), contactId: c3!.id, opportunityId: o7!.id, accountId: a2!.id, description: "Documented 8 custom feature requests from pilot planning session with Dr. Ananya." },
      { orgId, type: "task", subject: "Prepare contract draft – BlueSky Finserv", status: "planned", dueDate: d(10), contactId: c9!.id, opportunityId: o4!.id, accountId: a5!.id, description: "Draft SaaS subscription agreement with Pooja's compliance team annotations." },
      { orgId, type: "meeting", subject: "Quarterly business review – Apex Technologies", status: "planned", dueDate: d(15), contactId: c1!.id, opportunityId: o1!.id, accountId: a1!.id, description: "Full QBR with Rajesh and Karthik to review expansion roadmap." },
    ]);

    // --- Quotes ---
    const qs = await db.insert(quotesTable).values([
      {
        orgId,
        quoteNumber: "QUO-2026-0001",
        name: "Apex Technologies – Enterprise CRM Proposal",
        opportunityId: o1!.id,
        contactId: c1!.id,
        accountId: a1!.id,
        status: "sent",
        validUntil: new Date("2026-06-15"),
        subtotal: "132000.00",
        discount: "9240.00",
        tax: "17283.60",
        total: "140043.60",
        notes: "7% volume discount applied. Prices in INR equivalent billed as USD. Net 30 payment terms."
      },
      {
        orgId,
        quoteNumber: "QUO-2026-0002",
        name: "Starfield Retail – Omnichannel CRM (Signed)",
        opportunityId: o3!.id,
        contactId: c6!.id,
        accountId: a4!.id,
        status: "accepted",
        validUntil: new Date("2026-04-30"),
        subtotal: "87400.00",
        discount: "4370.00",
        tax: "14882.40",
        total: "97912.40",
        notes: "5% early-sign discount applied. Includes implementation and first-year support."
      }
    ]).returning();
    const [q1, q2] = qs;

    // --- Quote Items ---
    await db.insert(quoteItemsTable).values([
      { orgId, quoteId: q1!.id, productId: p1!.id, productName: p1!.name, quantity: "72", unitPrice: p1!.unitPrice, discount: "0", total: "86400.00" },
      { orgId, quoteId: q1!.id, productId: p3!.id, productName: p3!.name, quantity: "1", unitPrice: p3!.unitPrice, discount: "0", total: "4500.00" },
      { orgId, quoteId: q1!.id, productId: p4!.id, productName: p4!.name, quantity: "1", unitPrice: p4!.unitPrice, discount: "0", total: "8000.00" },
      { orgId, quoteId: q1!.id, productId: p5!.id, productName: p5!.name, quantity: "1", unitPrice: p5!.unitPrice, discount: "0", total: "2400.00" },
      { orgId, quoteId: q1!.id, productId: p8!.id, productName: p8!.name, quantity: "72", unitPrice: p8!.unitPrice, discount: "0", total: "43200.00" },
      { orgId, quoteId: q2!.id, productId: p1!.id, productName: p1!.name, quantity: "60", unitPrice: p1!.unitPrice, discount: "0", total: "72000.00" },
      { orgId, quoteId: q2!.id, productId: p3!.id, productName: p3!.name, quantity: "1", unitPrice: p3!.unitPrice, discount: "0", total: "4500.00" },
      { orgId, quoteId: q2!.id, productId: p6!.id, productName: p6!.name, quantity: "1", unitPrice: p6!.unitPrice, discount: "0", total: "3200.00" },
      { orgId, quoteId: q2!.id, productId: p7!.id, productName: p7!.name, quantity: "2", unitPrice: p7!.unitPrice, discount: "0", total: "3600.00" },
      { orgId, quoteId: q2!.id, productId: p5!.id, productName: p5!.name, quantity: "1", unitPrice: p5!.unitPrice, discount: "0", total: "2400.00" },
    ]);

    return res.json({
      ok: true,
      message: "Seed complete — 6 accounts, 12 contacts, 10 leads, 8 opportunities, 15 activities, 8 products, 2 quotes inserted."
    });
  } catch (err) {
    console.error("[Seed] Error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
