import { db } from "@workspace/db";
import {
  organizationsTable, usersTable, accountsTable, contactsTable, leadsTable,
  opportunitiesTable, activitiesTable, productsTable, casesTable,
  quotesTable, quoteItemsTable
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// Ensures the two demo tenants exist (creating "Acme Test Org" the first time
// this runs) so multi-tenancy isolation actually has two independent datasets
// to prove itself against, instead of a single-tenant database where every
// "isolated" query trivially passes.
async function ensureOrg(name: string, slug: string): Promise<number> {
  const [existing] = await db.select({ id: organizationsTable.id }).from(organizationsTable).where(eq(organizationsTable.slug, slug));
  if (existing) return existing.id;
  const [created] = await db.insert(organizationsTable).values({ name, slug }).returning({ id: organizationsTable.id });
  return created.id;
}

async function clearOrg(orgId: number): Promise<void> {
  await db.delete(quoteItemsTable).where(eq(quoteItemsTable.orgId, orgId));
  await db.delete(quotesTable).where(eq(quotesTable.orgId, orgId));
  await db.delete(activitiesTable).where(eq(activitiesTable.orgId, orgId));
  await db.delete(casesTable).where(eq(casesTable.orgId, orgId));
  await db.delete(opportunitiesTable).where(eq(opportunitiesTable.orgId, orgId));
  await db.delete(leadsTable).where(eq(leadsTable.orgId, orgId));
  await db.delete(contactsTable).where(eq(contactsTable.orgId, orgId));
  await db.delete(accountsTable).where(eq(accountsTable.orgId, orgId));
  await db.delete(productsTable).where(eq(productsTable.orgId, orgId));
  await db.delete(usersTable).where(eq(usersTable.orgId, orgId));
}

interface TenantDataset {
  label: string;
  users: Array<{ name: string; email: string; role: string; team: string; isActive: boolean }>;
  accounts: Array<{ name: string; industry: string; website: string; phone: string; email: string; city: string; country: string; employees: number; annualRevenue: string; ownerIdx: number }>;
  contacts: Array<{ firstName: string; lastName: string; email: string; phone: string; title: string; department: string; accountIdx: number; ownerIdx: number; leadSource: string; city: string; country: string }>;
  products: Array<{ name: string; code: string; description: string; unitPrice: string; currency: string; category: string; isActive: boolean }>;
  leads: Array<{ firstName: string; lastName: string; email: string; phone: string; company: string; title: string; status: string; source: string; score: number; employees: number; industry: string; assignedIdx: number }>;
  opportunities: Array<{ name: string; accountIdx: number; contactIdx: number; stage: string; amount: string; probability: number; closeDate: Date; assignedIdx: number; leadSource: string; nextStep?: string }>;
  activities: Array<{ type: string; subject: string; status: string; contactIdx: number; opportunityIdx?: number; accountIdx: number; assignedIdx: number; description: string; dueDate?: Date; completedAt?: Date }>;
  cases: Array<{ caseNumber: string; subject: string; description: string; status: string; priority: string; type: string; origin: string; contactIdx: number; accountIdx: number; assignedIdx: number; resolution?: string; resolvedAt?: Date }>;
  quotes: Array<{
    quoteNumber: string; name: string; opportunityIdx: number; contactIdx: number; accountIdx: number;
    status: string; validUntil: Date; subtotal: string; discount: string; tax: string; total: string; notes: string;
    items: Array<{ productIdx: number; productName: string; quantity: string; unitPrice: string; discount: string; total: string }>;
  }>;
}

async function seedTenant(orgId: number, data: TenantDataset): Promise<void> {
  console.log(`\n🌱 Seeding "${data.label}" (org ${orgId})...`);
  await clearOrg(orgId);

  const users = await db.insert(usersTable).values(data.users.map((u) => ({ ...u, orgId }))).returning();
  console.log(`  ✓ Created ${users.length} users`);

  const accounts = await db.insert(accountsTable).values(
    data.accounts.map((a) => ({ ...a, orgId, ownerId: users[a.ownerIdx].id, ownerIdx: undefined }))
  ).returning();
  console.log(`  ✓ Created ${accounts.length} accounts`);

  const contacts = await db.insert(contactsTable).values(
    data.contacts.map((c) => ({ ...c, orgId, accountId: accounts[c.accountIdx].id, ownerId: users[c.ownerIdx].id, accountIdx: undefined, ownerIdx: undefined }))
  ).returning();
  console.log(`  ✓ Created ${contacts.length} contacts`);

  const products = await db.insert(productsTable).values(data.products.map((p) => ({ ...p, orgId }))).returning();
  console.log(`  ✓ Created ${products.length} products`);

  const leads = await db.insert(leadsTable).values(
    data.leads.map((l) => ({ ...l, orgId, assignedTo: users[l.assignedIdx].id, assignedIdx: undefined }))
  ).returning();
  console.log(`  ✓ Created ${leads.length} leads`);

  const opportunities = await db.insert(opportunitiesTable).values(
    data.opportunities.map((o) => ({
      ...o, orgId,
      accountId: accounts[o.accountIdx].id, contactId: contacts[o.contactIdx].id, assignedTo: users[o.assignedIdx].id,
      accountIdx: undefined, contactIdx: undefined, assignedIdx: undefined,
    }))
  ).returning();
  console.log(`  ✓ Created ${opportunities.length} opportunities`);

  const activities = await db.insert(activitiesTable).values(
    data.activities.map((a) => ({
      ...a, orgId,
      contactId: contacts[a.contactIdx].id,
      opportunityId: a.opportunityIdx != null ? opportunities[a.opportunityIdx].id : null,
      accountId: accounts[a.accountIdx].id, assignedTo: users[a.assignedIdx].id,
      contactIdx: undefined, opportunityIdx: undefined, accountIdx: undefined, assignedIdx: undefined,
    }))
  ).returning();
  console.log(`  ✓ Created ${activities.length} activities`);

  const cases = await db.insert(casesTable).values(
    data.cases.map((c) => ({
      ...c, orgId,
      contactId: contacts[c.contactIdx].id, accountId: accounts[c.accountIdx].id, assignedTo: users[c.assignedIdx].id,
      contactIdx: undefined, accountIdx: undefined, assignedIdx: undefined,
    }))
  ).returning();
  console.log(`  ✓ Created ${cases.length} cases`);

  for (const q of data.quotes) {
    const [quote] = await db.insert(quotesTable).values({
      orgId,
      quoteNumber: q.quoteNumber,
      name: q.name,
      opportunityId: opportunities[q.opportunityIdx].id,
      contactId: contacts[q.contactIdx].id,
      accountId: accounts[q.accountIdx].id,
      status: q.status,
      validUntil: q.validUntil,
      subtotal: q.subtotal,
      discount: q.discount,
      tax: q.tax,
      total: q.total,
      notes: q.notes,
    }).returning();

    await db.insert(quoteItemsTable).values(
      q.items.map((item) => ({
        orgId, quoteId: quote.id, productId: products[item.productIdx].id, productName: item.productName,
        quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, total: item.total,
      }))
    );
  }
  console.log(`  ✓ Created ${data.quotes.length} quotes`);

  console.log(`✅ "${data.label}" seed complete — ${users.length} users, ${accounts.length} accounts, ${contacts.length} contacts, ${leads.length} leads, ${opportunities.length} opportunities, ${products.length} products, ${activities.length} activities, ${cases.length} cases, ${data.quotes.length} quotes.`);
}

const now = new Date();

// --- Tenant 1: "Default Organization" (org 1) — the original US-flavored demo dataset ---
const DEFAULT_ORG_DATA: TenantDataset = {
  label: "Default Organization",
  users: [
    { name: "Alex Johnson", email: "alex@crmai.io", role: "admin", team: "Management", isActive: true },
    { name: "Sarah Chen", email: "sarah@crmai.io", role: "manager", team: "Enterprise Sales", isActive: true },
    { name: "Mike Rodriguez", email: "mike@crmai.io", role: "rep", team: "Enterprise Sales", isActive: true },
    { name: "Emma Wilson", email: "emma@crmai.io", role: "rep", team: "SMB Sales", isActive: true },
    { name: "James Park", email: "james@crmai.io", role: "rep", team: "SMB Sales", isActive: true },
    { name: "Olivia Brown", email: "olivia@crmai.io", role: "manager", team: "Customer Success", isActive: true },
    { name: "Daniel Kim", email: "daniel@crmai.io", role: "rep", team: "Customer Success", isActive: true },
    { name: "Sophia Martinez", email: "sophia@crmai.io", role: "rep", team: "Enterprise Sales", isActive: true },
  ],
  accounts: [
    { name: "Apex Technologies", industry: "Technology", website: "https://apextech.com", phone: "+1-555-100-1000", email: "contact@apextech.com", city: "San Francisco", country: "USA", employees: 2500, annualRevenue: "45000000", ownerIdx: 1 },
    { name: "GlobalFinance Corp", industry: "Finance", website: "https://globalfinance.com", phone: "+1-555-200-2000", email: "info@globalfinance.com", city: "New York", country: "USA", employees: 8500, annualRevenue: "320000000", ownerIdx: 1 },
    { name: "HealthFirst Systems", industry: "Healthcare", website: "https://healthfirst.io", phone: "+1-555-300-3000", email: "hello@healthfirst.io", city: "Boston", country: "USA", employees: 1200, annualRevenue: "78000000", ownerIdx: 2 },
    { name: "RetailPro Inc", industry: "Retail", website: "https://retailpro.com", phone: "+1-555-400-4000", email: "sales@retailpro.com", city: "Chicago", country: "USA", employees: 4200, annualRevenue: "155000000", ownerIdx: 2 },
    { name: "EduLearn Platform", industry: "Education", website: "https://edulearn.co", phone: "+1-555-500-5000", email: "info@edulearn.co", city: "Austin", country: "USA", employees: 340, annualRevenue: "12000000", ownerIdx: 3 },
    { name: "ManuCore Industries", industry: "Manufacturing", website: "https://manucore.com", phone: "+1-555-600-6000", email: "contact@manucore.com", city: "Detroit", country: "USA", employees: 6700, annualRevenue: "890000000", ownerIdx: 2 },
    { name: "CloudNine SaaS", industry: "Technology", website: "https://cloudnine.io", phone: "+1-555-700-7000", email: "hello@cloudnine.io", city: "Seattle", country: "USA", employees: 890, annualRevenue: "67000000", ownerIdx: 3 },
    { name: "RealEstate Plus", industry: "Real Estate", website: "https://realestateplus.com", phone: "+1-555-800-8000", email: "info@realestateplus.com", city: "Miami", country: "USA", employees: 220, annualRevenue: "23000000", ownerIdx: 4 },
    { name: "LogisticsPro", industry: "Logistics", website: "https://logisticspro.net", phone: "+1-555-900-9000", email: "ops@logisticspro.net", city: "Dallas", country: "USA", employees: 3100, annualRevenue: "234000000", ownerIdx: 7 },
    { name: "BioMed Research", industry: "Healthcare", website: "https://biomed.org", phone: "+1-555-110-1100", email: "research@biomed.org", city: "San Diego", country: "USA", employees: 560, annualRevenue: "45000000", ownerIdx: 4 },
    { name: "EnergyForward", industry: "Energy", website: "https://energyforward.com", phone: "+1-555-120-1200", email: "contact@energyforward.com", city: "Houston", country: "USA", employees: 1850, annualRevenue: "412000000", ownerIdx: 2 },
    { name: "MediaStream Co", industry: "Media", website: "https://mediastream.co", phone: "+1-555-130-1300", email: "hello@mediastream.co", city: "Los Angeles", country: "USA", employees: 740, annualRevenue: "89000000", ownerIdx: 3 },
    { name: "AgriGrow Solutions", industry: "Agriculture", website: "https://agrigrow.com", phone: "+1-555-140-1400", email: "sales@agrigrow.com", city: "Des Moines", country: "USA", employees: 180, annualRevenue: "18000000", ownerIdx: 4 },
    { name: "CyberShield Security", industry: "Technology", website: "https://cybershield.io", phone: "+1-555-150-1500", email: "info@cybershield.io", city: "Washington DC", country: "USA", employees: 430, annualRevenue: "56000000", ownerIdx: 7 },
    { name: "TravelWorld Agency", industry: "Travel", website: "https://travelworld.com", phone: "+1-555-160-1600", email: "book@travelworld.com", city: "Las Vegas", country: "USA", employees: 290, annualRevenue: "34000000", ownerIdx: 4 },
    { name: "FoodChain Restaurants", industry: "Food & Beverage", website: "https://foodchain.biz", phone: "+1-555-170-1700", email: "corporate@foodchain.biz", city: "Atlanta", country: "USA", employees: 5400, annualRevenue: "678000000", ownerIdx: 2 },
    { name: "AutoDrive Motors", industry: "Automotive", website: "https://autodrive.com", phone: "+1-555-180-1800", email: "fleet@autodrive.com", city: "Detroit", country: "USA", employees: 9200, annualRevenue: "1200000000", ownerIdx: 1 },
    { name: "FinTech Innovators", industry: "Finance", website: "https://fintech.xyz", phone: "+1-555-190-1900", email: "hello@fintech.xyz", city: "New York", country: "USA", employees: 340, annualRevenue: "28000000", ownerIdx: 7 },
    { name: "PharmaCure Labs", industry: "Healthcare", website: "https://pharmacure.com", phone: "+1-555-200-2100", email: "info@pharmacure.com", city: "Philadelphia", country: "USA", employees: 2300, annualRevenue: "345000000", ownerIdx: 1 },
    { name: "BuildRight Construction", industry: "Construction", website: "https://buildright.net", phone: "+1-555-210-2200", email: "projects@buildright.net", city: "Phoenix", country: "USA", employees: 780, annualRevenue: "92000000", ownerIdx: 4 },
  ],
  contacts: [
    { firstName: "Robert", lastName: "Chen", email: "robert.chen@apextech.com", phone: "+1-555-100-1001", title: "CTO", department: "Engineering", accountIdx: 0, ownerIdx: 2, leadSource: "referral", city: "San Francisco", country: "USA" },
    { firstName: "Jennifer", lastName: "Walsh", email: "j.walsh@apextech.com", phone: "+1-555-100-1002", title: "VP Sales", department: "Sales", accountIdx: 0, ownerIdx: 2, leadSource: "web", city: "San Francisco", country: "USA" },
    { firstName: "Michael", lastName: "Thompson", email: "mthompson@globalfinance.com", phone: "+1-555-200-2001", title: "CFO", department: "Finance", accountIdx: 1, ownerIdx: 1, leadSource: "conference", city: "New York", country: "USA" },
    { firstName: "Amanda", lastName: "Foster", email: "afoster@globalfinance.com", phone: "+1-555-200-2002", title: "Procurement Manager", department: "Procurement", accountIdx: 1, ownerIdx: 1, leadSource: "email", city: "New York", country: "USA" },
    { firstName: "David", lastName: "Kim", email: "d.kim@healthfirst.io", phone: "+1-555-300-3001", title: "CEO", department: "Executive", accountIdx: 2, ownerIdx: 2, leadSource: "referral", city: "Boston", country: "USA" },
    { firstName: "Lisa", lastName: "Patel", email: "lpatel@healthfirst.io", phone: "+1-555-300-3002", title: "IT Director", department: "IT", accountIdx: 2, ownerIdx: 3, leadSource: "web", city: "Boston", country: "USA" },
    { firstName: "Kevin", lastName: "Martinez", email: "kmart@retailpro.com", phone: "+1-555-400-4001", title: "COO", department: "Operations", accountIdx: 3, ownerIdx: 2, leadSource: "partner", city: "Chicago", country: "USA" },
    { firstName: "Nicole", lastName: "Anderson", email: "n.anderson@retailpro.com", phone: "+1-555-400-4002", title: "Marketing Director", department: "Marketing", accountIdx: 3, ownerIdx: 3, leadSource: "conference", city: "Chicago", country: "USA" },
    { firstName: "Brian", lastName: "Taylor", email: "btaylor@edulearn.co", phone: "+1-555-500-5001", title: "CEO", department: "Executive", accountIdx: 4, ownerIdx: 3, leadSource: "web", city: "Austin", country: "USA" },
    { firstName: "Jessica", lastName: "White", email: "j.white@manucore.com", phone: "+1-555-600-6001", title: "Purchasing Manager", department: "Procurement", accountIdx: 5, ownerIdx: 2, leadSource: "cold_call", city: "Detroit", country: "USA" },
    { firstName: "Christopher", lastName: "Lee", email: "clee@cloudnine.io", phone: "+1-555-700-7001", title: "CTO", department: "Engineering", accountIdx: 6, ownerIdx: 3, leadSource: "referral", city: "Seattle", country: "USA" },
    { firstName: "Ashley", lastName: "Harris", email: "aharris@cloudnine.io", phone: "+1-555-700-7002", title: "VP Engineering", department: "Engineering", accountIdx: 6, ownerIdx: 7, leadSource: "web", city: "Seattle", country: "USA" },
    { firstName: "Matthew", lastName: "Jackson", email: "mjackson@realestateplus.com", phone: "+1-555-800-8001", title: "CEO", department: "Executive", accountIdx: 7, ownerIdx: 4, leadSource: "web", city: "Miami", country: "USA" },
    { firstName: "Stephanie", lastName: "Moore", email: "smoore@logisticspro.net", phone: "+1-555-900-9001", title: "VP Operations", department: "Operations", accountIdx: 8, ownerIdx: 7, leadSource: "conference", city: "Dallas", country: "USA" },
    { firstName: "Daniel", lastName: "Johnson", email: "djohnson@biomed.org", phone: "+1-555-110-1101", title: "Research Director", department: "R&D", accountIdx: 9, ownerIdx: 4, leadSource: "referral", city: "San Diego", country: "USA" },
    { firstName: "Laura", lastName: "Williams", email: "lwilliams@energyforward.com", phone: "+1-555-120-1201", title: "Procurement Director", department: "Procurement", accountIdx: 10, ownerIdx: 2, leadSource: "cold_call", city: "Houston", country: "USA" },
    { firstName: "Ryan", lastName: "Davis", email: "rdavis@mediastream.co", phone: "+1-555-130-1301", title: "CTO", department: "Technology", accountIdx: 11, ownerIdx: 3, leadSource: "web", city: "Los Angeles", country: "USA" },
    { firstName: "Emily", lastName: "Wilson", email: "ewilson@cybershield.io", phone: "+1-555-150-1501", title: "CISO", department: "Security", accountIdx: 13, ownerIdx: 7, leadSource: "conference", city: "Washington DC", country: "USA" },
    { firstName: "Andrew", lastName: "Garcia", email: "agarcia@fintech.xyz", phone: "+1-555-190-1901", title: "CEO", department: "Executive", accountIdx: 17, ownerIdx: 7, leadSource: "referral", city: "New York", country: "USA" },
    { firstName: "Patricia", lastName: "Robinson", email: "probinson@pharmacure.com", phone: "+1-555-200-2101", title: "VP Procurement", department: "Procurement", accountIdx: 18, ownerIdx: 1, leadSource: "partner", city: "Philadelphia", country: "USA" },
    { firstName: "Mark", lastName: "Lewis", email: "mlewis@autodrive.com", phone: "+1-555-180-1801", title: "IT Director", department: "IT", accountIdx: 16, ownerIdx: 1, leadSource: "referral", city: "Detroit", country: "USA" },
    { firstName: "Sandra", lastName: "Clark", email: "sclark@buildright.net", phone: "+1-555-210-2201", title: "COO", department: "Operations", accountIdx: 19, ownerIdx: 4, leadSource: "web", city: "Phoenix", country: "USA" },
    { firstName: "Paul", lastName: "Rodriguez", email: "prodriguez@foodchain.biz", phone: "+1-555-170-1701", title: "VP Technology", department: "Technology", accountIdx: 15, ownerIdx: 2, leadSource: "conference", city: "Atlanta", country: "USA" },
    { firstName: "Nancy", lastName: "Scott", email: "nscott@agrigrow.com", phone: "+1-555-140-1401", title: "CEO", department: "Executive", accountIdx: 12, ownerIdx: 4, leadSource: "cold_call", city: "Des Moines", country: "USA" },
    { firstName: "George", lastName: "Young", email: "gyoung@travelworld.com", phone: "+1-555-160-1601", title: "VP Operations", department: "Operations", accountIdx: 14, ownerIdx: 4, leadSource: "web", city: "Las Vegas", country: "USA" },
    { firstName: "Helen", lastName: "Hall", email: "hhall@manucore.com", phone: "+1-555-600-6002", title: "VP Engineering", department: "Engineering", accountIdx: 5, ownerIdx: 7, leadSource: "referral", city: "Detroit", country: "USA" },
    { firstName: "Frank", lastName: "Adams", email: "fadams@globalfinance.com", phone: "+1-555-200-2003", title: "VP Technology", department: "Technology", accountIdx: 1, ownerIdx: 7, leadSource: "conference", city: "New York", country: "USA" },
    { firstName: "Betty", lastName: "Baker", email: "bbaker@energyforward.com", phone: "+1-555-120-1202", title: "CTO", department: "Technology", accountIdx: 10, ownerIdx: 1, leadSource: "referral", city: "Houston", country: "USA" },
  ],
  products: [
    { name: "CRMAI Enterprise Suite", code: "ENT-001", description: "Full-featured CRM for large enterprises", unitPrice: "49999.00", currency: "USD", category: "Software", isActive: true },
    { name: "CRMAI Professional", code: "PRO-001", description: "Professional CRM for mid-size businesses", unitPrice: "19999.00", currency: "USD", category: "Software", isActive: true },
    { name: "CRMAI Starter", code: "STR-001", description: "Entry-level CRM for small businesses", unitPrice: "4999.00", currency: "USD", category: "Software", isActive: true },
    { name: "Implementation Services", code: "SVC-001", description: "Professional implementation and configuration services", unitPrice: "15000.00", currency: "USD", category: "Services", isActive: true },
    { name: "Training Package - Basic", code: "TRN-001", description: "8-hour user training package", unitPrice: "2500.00", currency: "USD", category: "Training", isActive: true },
    { name: "Training Package - Advanced", code: "TRN-002", description: "16-hour advanced admin training", unitPrice: "4500.00", currency: "USD", category: "Training", isActive: true },
    { name: "Annual Support Plan", code: "SUP-001", description: "12 months premium support with SLA", unitPrice: "5999.00", currency: "USD", category: "Support", isActive: true },
    { name: "Data Migration Service", code: "MIG-001", description: "Complete data migration from existing CRM", unitPrice: "8000.00", currency: "USD", category: "Services", isActive: true },
    { name: "Custom Integration", code: "INT-001", description: "Custom API integration development", unitPrice: "12000.00", currency: "USD", category: "Services", isActive: true },
    { name: "CRMAI Add-on: Analytics", code: "ADD-001", description: "Advanced analytics and BI module", unitPrice: "3999.00", currency: "USD", category: "Add-ons", isActive: true },
    { name: "CRMAI Add-on: AI Assistant", code: "ADD-002", description: "AI-powered sales assistant module", unitPrice: "4999.00", currency: "USD", category: "Add-ons", isActive: true },
    { name: "CRMAI Add-on: Marketing", code: "ADD-003", description: "Email marketing automation module", unitPrice: "2999.00", currency: "USD", category: "Add-ons", isActive: true },
  ],
  leads: [
    { firstName: "Thomas", lastName: "Brown", email: "tbrown@techstart.io", phone: "+1-555-001-0001", company: "TechStart Inc", title: "CEO", status: "qualified", source: "web", score: 85, employees: 45, industry: "Technology", assignedIdx: 2 },
    { firstName: "Monica", lastName: "Garcia", email: "mgarcia@greenergy.com", phone: "+1-555-001-0002", company: "Greenergy Solutions", title: "VP Operations", status: "contacted", source: "conference", score: 72, employees: 120, industry: "Energy", assignedIdx: 3 },
    { firstName: "William", lastName: "Nelson", email: "wnelson@mediax.com", phone: "+1-555-001-0003", company: "MediaX Corp", title: "CTO", status: "new", source: "cold_call", score: 45, employees: 890, industry: "Media", assignedIdx: 7 },
    { firstName: "Catherine", lastName: "Cooper", email: "ccooper@smartretail.com", phone: "+1-555-001-0004", company: "SmartRetail", title: "IT Manager", status: "qualified", source: "referral", score: 91, employees: 230, industry: "Retail", assignedIdx: 2 },
    { firstName: "Richard", lastName: "Turner", email: "rturner@logix.net", phone: "+1-555-001-0005", company: "LogiX Systems", title: "Director of IT", status: "contacted", source: "email", score: 63, employees: 780, industry: "Logistics", assignedIdx: 7 },
    { firstName: "Margaret", lastName: "Phillips", email: "mphillips@biotech.org", phone: "+1-555-001-0006", company: "BioTech Research", title: "Research Director", status: "new", source: "web", score: 55, employees: 340, industry: "Healthcare", assignedIdx: 4 },
    { firstName: "Charles", lastName: "Evans", email: "cevans@finpro.io", phone: "+1-555-001-0007", company: "FinPro Advisory", title: "CEO", status: "qualified", source: "partner", score: 88, employees: 60, industry: "Finance", assignedIdx: 1 },
    { firstName: "Dorothy", lastName: "King", email: "dking@constructco.com", phone: "+1-555-001-0008", company: "ConstructCo", title: "VP Technology", status: "unqualified", source: "cold_call", score: 30, employees: 450, industry: "Construction", assignedIdx: 4 },
    { firstName: "Joseph", lastName: "Wright", email: "jwright@autotech.com", phone: "+1-555-001-0009", company: "AutoTech Solutions", title: "CTO", status: "new", source: "web", score: 67, employees: 2300, industry: "Automotive", assignedIdx: 2 },
    { firstName: "Deborah", lastName: "Lopez", email: "dlopez@edusmart.edu", phone: "+1-555-001-0010", company: "EduSmart", title: "Technology Director", status: "contacted", source: "conference", score: 78, employees: 180, industry: "Education", assignedIdx: 3 },
    { firstName: "Steven", lastName: "Hill", email: "shill@agromate.ag", phone: "+1-555-001-0011", company: "AgroMate", title: "Operations Manager", status: "new", source: "web", score: 42, employees: 90, industry: "Agriculture", assignedIdx: 4 },
    { firstName: "Carol", lastName: "Scott", email: "cscott@pharmalab.com", phone: "+1-555-001-0012", company: "PharmaLab Corp", title: "Director of IT", status: "qualified", source: "referral", score: 95, employees: 560, industry: "Healthcare", assignedIdx: 2 },
    { firstName: "Kenneth", lastName: "Green", email: "kgreen@secupoint.io", phone: "+1-555-001-0013", company: "SecuPoint Security", title: "CISO", status: "contacted", source: "email", score: 76, employees: 140, industry: "Technology", assignedIdx: 7 },
    { firstName: "Sharon", lastName: "Baker", email: "sbaker@realtypro.com", phone: "+1-555-001-0014", company: "RealtyPro", title: "VP Sales", status: "new", source: "web", score: 58, employees: 75, industry: "Real Estate", assignedIdx: 4 },
    { firstName: "Ronald", lastName: "Adams", email: "radams@travelnet.com", phone: "+1-555-001-0015", company: "TravelNet", title: "Head of Technology", status: "qualified", source: "conference", score: 82, employees: 210, industry: "Travel", assignedIdx: 3 },
    { firstName: "Lisa", lastName: "Campbell", email: "lcampbell@foodtech.biz", phone: "+1-555-001-0016", company: "FoodTech Co", title: "CTO", status: "new", source: "cold_call", score: 50, employees: 320, industry: "Food & Beverage", assignedIdx: 2 },
    { firstName: "Larry", lastName: "Mitchell", email: "lmitchell@cloudify.io", phone: "+1-555-001-0017", company: "Cloudify Solutions", title: "CEO", status: "qualified", source: "referral", score: 90, employees: 85, industry: "Technology", assignedIdx: 7 },
    { firstName: "Betty", lastName: "Perez", email: "bperez@globalmed.com", phone: "+1-555-001-0018", company: "GlobalMed", title: "Procurement Manager", status: "contacted", source: "web", score: 69, employees: 1200, industry: "Healthcare", assignedIdx: 4 },
    { firstName: "George", lastName: "Roberts", email: "groberts@energysol.com", phone: "+1-555-001-0019", company: "EnergySol", title: "Director", status: "new", source: "partner", score: 55, employees: 890, industry: "Energy", assignedIdx: 2 },
    { firstName: "Sandra", lastName: "Turner", email: "sturner@dataflow.ai", phone: "+1-555-001-0020", company: "DataFlow AI", title: "CEO", status: "qualified", source: "web", score: 94, employees: 32, industry: "Technology", assignedIdx: 7 },
  ],
  opportunities: [
    { name: "Apex Technologies - Enterprise Suite", accountIdx: 0, contactIdx: 0, stage: "proposal", amount: "249000", probability: 65, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 15), assignedIdx: 2, leadSource: "referral", nextStep: "Send detailed proposal" },
    { name: "GlobalFinance Corp - Platform Upgrade", accountIdx: 1, contactIdx: 2, stage: "negotiation", amount: "580000", probability: 80, closeDate: new Date(now.getFullYear(), now.getMonth(), 28), assignedIdx: 1, leadSource: "conference", nextStep: "Final contract review" },
    { name: "HealthFirst Systems - CRM Implementation", accountIdx: 2, contactIdx: 4, stage: "qualification", amount: "89000", probability: 40, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 10), assignedIdx: 2, leadSource: "referral", nextStep: "Schedule technical discovery call" },
    { name: "RetailPro Inc - Enterprise License", accountIdx: 3, contactIdx: 6, stage: "closed_won", amount: "187000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 20), assignedIdx: 2, leadSource: "partner" },
    { name: "EduLearn Platform - Starter Package", accountIdx: 4, contactIdx: 8, stage: "prospecting", amount: "24000", probability: 20, closeDate: new Date(now.getFullYear(), now.getMonth() + 3, 1), assignedIdx: 3, leadSource: "web" },
    { name: "ManuCore Industries - Custom Integration", accountIdx: 5, contactIdx: 9, stage: "proposal", amount: "135000", probability: 55, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 25), assignedIdx: 2, leadSource: "cold_call", nextStep: "Demo scheduled for next week" },
    { name: "CloudNine SaaS - Professional License", accountIdx: 6, contactIdx: 10, stage: "closed_won", amount: "95000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), assignedIdx: 3, leadSource: "referral" },
    { name: "LogisticsPro - Enterprise Suite + Services", accountIdx: 8, contactIdx: 13, stage: "negotiation", amount: "412000", probability: 85, closeDate: new Date(now.getFullYear(), now.getMonth(), 30), assignedIdx: 7, leadSource: "conference", nextStep: "Legal review of terms" },
    { name: "BioMed Research - Analytics Add-on", accountIdx: 9, contactIdx: 14, stage: "qualification", amount: "45000", probability: 35, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 15), assignedIdx: 4, leadSource: "referral" },
    { name: "EnergyForward - Platform Implementation", accountIdx: 10, contactIdx: 15, stage: "prospecting", amount: "298000", probability: 25, closeDate: new Date(now.getFullYear(), now.getMonth() + 3, 15), assignedIdx: 2, leadSource: "cold_call" },
    { name: "MediaStream Co - Enterprise License", accountIdx: 11, contactIdx: 16, stage: "closed_lost", amount: "156000", probability: 0, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 5), assignedIdx: 3, leadSource: "web" },
    { name: "CyberShield Security - Professional Suite", accountIdx: 13, contactIdx: 17, stage: "proposal", amount: "78000", probability: 60, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 20), assignedIdx: 7, leadSource: "conference", nextStep: "Security review meeting" },
    { name: "FinTech Innovators - Starter + AI Assistant", accountIdx: 17, contactIdx: 18, stage: "qualification", amount: "32000", probability: 45, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 5), assignedIdx: 7, leadSource: "referral" },
    { name: "PharmaCure Labs - Enterprise Suite", accountIdx: 18, contactIdx: 19, stage: "negotiation", amount: "345000", probability: 75, closeDate: new Date(now.getFullYear(), now.getMonth(), 25), assignedIdx: 1, leadSource: "partner", nextStep: "Compliance review" },
    { name: "AutoDrive Motors - Full Platform License", accountIdx: 16, contactIdx: 20, stage: "proposal", amount: "789000", probability: 50, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 28), assignedIdx: 1, leadSource: "referral", nextStep: "Executive presentation" },
    { name: "BuildRight Construction - Professional", accountIdx: 19, contactIdx: 21, stage: "prospecting", amount: "54000", probability: 15, closeDate: new Date(now.getFullYear(), now.getMonth() + 4, 1), assignedIdx: 4, leadSource: "web" },
    { name: "FoodChain Restaurants - Enterprise Suite", accountIdx: 15, contactIdx: 22, stage: "closed_won", amount: "412000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 2, 15), assignedIdx: 2, leadSource: "conference" },
    { name: "GlobalFinance Corp - Analytics Module", accountIdx: 1, contactIdx: 26, stage: "qualification", amount: "89000", probability: 40, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 20), assignedIdx: 7, leadSource: "referral" },
    { name: "Apex Technologies - Training Package", accountIdx: 0, contactIdx: 1, stage: "closed_won", amount: "45000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 28), assignedIdx: 2, leadSource: "referral" },
    { name: "AgriGrow Solutions - Starter CRM", accountIdx: 12, contactIdx: 23, stage: "prospecting", amount: "18000", probability: 20, closeDate: new Date(now.getFullYear(), now.getMonth() + 3, 10), assignedIdx: 4, leadSource: "cold_call" },
    { name: "TravelWorld Agency - Professional", accountIdx: 14, contactIdx: 24, stage: "proposal", amount: "47000", probability: 55, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 10), assignedIdx: 4, leadSource: "web" },
    { name: "ManuCore Industries - Support Contract", accountIdx: 5, contactIdx: 25, stage: "negotiation", amount: "120000", probability: 90, closeDate: new Date(now.getFullYear(), now.getMonth(), 22), assignedIdx: 7, leadSource: "referral" },
    { name: "EnergyForward - Analytics Add-on", accountIdx: 10, contactIdx: 27, stage: "qualification", amount: "38000", probability: 35, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 8), assignedIdx: 1, leadSource: "referral" },
    { name: "HealthFirst Systems - Analytics Module", accountIdx: 2, contactIdx: 5, stage: "closed_won", amount: "62000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 2, 10), assignedIdx: 3, leadSource: "referral" },
    { name: "RetailPro Inc - Support Renewal", accountIdx: 3, contactIdx: 7, stage: "qualification", amount: "28000", probability: 70, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 5), assignedIdx: 3, leadSource: "partner" },
    { name: "CloudNine SaaS - Enterprise Upgrade", accountIdx: 6, contactIdx: 11, stage: "prospecting", amount: "145000", probability: 20, closeDate: new Date(now.getFullYear(), now.getMonth() + 4, 15), assignedIdx: 7, leadSource: "referral" },
    { name: "RealEstate Plus - Starter Package", accountIdx: 7, contactIdx: 12, stage: "proposal", amount: "22000", probability: 60, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 18), assignedIdx: 4, leadSource: "web" },
    { name: "PharmaCure Labs - Training Package", accountIdx: 18, contactIdx: 19, stage: "closed_won", amount: "18000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 15), assignedIdx: 1, leadSource: "partner" },
    { name: "AutoDrive Motors - Migration Services", accountIdx: 16, contactIdx: 20, stage: "negotiation", amount: "67000", probability: 80, closeDate: new Date(now.getFullYear(), now.getMonth(), 18), assignedIdx: 2, leadSource: "referral" },
    { name: "BioMed Research - Implementation", accountIdx: 9, contactIdx: 14, stage: "proposal", amount: "34000", probability: 50, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 1), assignedIdx: 4, leadSource: "referral" },
  ],
  activities: [
    { type: "call", subject: "Discovery call with Apex Technologies", status: "completed", contactIdx: 0, opportunityIdx: 0, accountIdx: 0, assignedIdx: 2, description: "Discussed pain points with current CRM system", dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Enterprise proposal presentation - Apex", status: "planned", contactIdx: 0, opportunityIdx: 0, accountIdx: 0, assignedIdx: 2, description: "Present enterprise package details to executive team", dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "Follow-up: GlobalFinance contract details", status: "completed", contactIdx: 2, opportunityIdx: 1, accountIdx: 1, assignedIdx: 1, description: "Sent updated terms and pricing", dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Prepare ROI analysis for HealthFirst", status: "planned", contactIdx: 4, opportunityIdx: 2, accountIdx: 2, assignedIdx: 2, description: "Calculate 3-year ROI based on their current costs", dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Check-in call - LogisticsPro legal review", status: "planned", contactIdx: 13, opportunityIdx: 7, accountIdx: 8, assignedIdx: 7, description: "Discuss contract amendment points", dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Executive demo - PharmaCure Labs", status: "planned", contactIdx: 19, opportunityIdx: 13, accountIdx: 18, assignedIdx: 1, description: "C-suite presentation and compliance walkthrough", dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) },
    { type: "note", subject: "AutoDrive Motors - competitor analysis", status: "completed", contactIdx: 20, opportunityIdx: 14, accountIdx: 16, assignedIdx: 1, description: "Customer mentioned they are also evaluating Salesforce. We need to emphasize our integration capabilities.", completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "CyberShield - Security features overview", status: "completed", contactIdx: 17, opportunityIdx: 11, accountIdx: 13, assignedIdx: 7, description: "Sent security compliance documentation", dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Update ManuCore proposal with custom integration scope", status: "planned", contactIdx: 9, opportunityIdx: 5, accountIdx: 5, assignedIdx: 2, description: "Add integration with SAP ERP to the proposal", dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Onboarding kickoff - RetailPro Inc", status: "completed", contactIdx: 6, accountIdx: 3, assignedIdx: 2, description: "Project kickoff call with implementation team", completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Quarterly business review - GlobalFinance", status: "completed", contactIdx: 2, accountIdx: 1, assignedIdx: 1, description: "Q3 review and Q4 planning discussion", completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Research BioMed compliance requirements", status: "planned", contactIdx: 14, opportunityIdx: 8, accountIdx: 9, assignedIdx: 4, description: "Review HIPAA requirements for analytics module", dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Cold outreach - EnergyForward", status: "completed", contactIdx: 15, accountIdx: 10, assignedIdx: 2, description: "Initial discovery, prospect is interested but budget needs approval", completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "FinTech Innovators - pricing proposal", status: "planned", contactIdx: 18, opportunityIdx: 12, accountIdx: 17, assignedIdx: 7, description: "Send customized pricing for starter + AI add-on", dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Product demo - TravelWorld Agency", status: "planned", contactIdx: 24, opportunityIdx: 20, accountIdx: 14, assignedIdx: 4, description: "Full platform demo focusing on reporting features", dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Renewal discussion - CloudNine SaaS", status: "planned", contactIdx: 10, accountIdx: 6, assignedIdx: 3, description: "Discuss upgrade from Professional to Enterprise", dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Prepare migration plan for AutoDrive Motors", status: "planned", contactIdx: 20, opportunityIdx: 28, accountIdx: 16, assignedIdx: 2, description: "Create detailed data migration timeline and plan", dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { type: "note", subject: "RealEstate Plus - budget constraints", status: "completed", contactIdx: 12, opportunityIdx: 26, accountIdx: 7, assignedIdx: 4, description: "Customer has limited budget, may need phased approach", completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "Welcome email - FoodChain Restaurants", status: "completed", contactIdx: 22, accountIdx: 15, assignedIdx: 2, description: "Sent onboarding resources and implementation schedule", completedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Strategy session - GlobalFinance Analytics", status: "planned", contactIdx: 26, opportunityIdx: 17, accountIdx: 1, assignedIdx: 7, description: "Understand BI and analytics requirements", dueDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000) },
  ],
  cases: [
    { caseNumber: "CASE-1001", subject: "Login authentication issue", description: "Users unable to log in after recent update", status: "resolved", priority: "critical", type: "Bug", origin: "phone", contactIdx: 0, accountIdx: 0, assignedIdx: 6, resolution: "Rolled back authentication middleware, applied hotfix", resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { caseNumber: "CASE-1002", subject: "Data export not working", description: "CSV export showing incorrect field mapping", status: "in_progress", priority: "high", type: "Bug", origin: "email", contactIdx: 2, accountIdx: 1, assignedIdx: 6 },
    { caseNumber: "CASE-1003", subject: "Custom field configuration help", description: "Need assistance setting up custom fields for contact records", status: "new", priority: "medium", type: "Question", origin: "web", contactIdx: 4, accountIdx: 2, assignedIdx: 5 },
    { caseNumber: "CASE-1004", subject: "Integration with Shopify not syncing", description: "Orders from Shopify not appearing in CRM", status: "in_progress", priority: "high", type: "Integration", origin: "phone", contactIdx: 6, accountIdx: 3, assignedIdx: 6 },
    { caseNumber: "CASE-1005", subject: "Report builder crashing on large datasets", description: "Custom reports with >10k rows causing timeout", status: "pending", priority: "medium", type: "Bug", origin: "email", contactIdx: 9, accountIdx: 5, assignedIdx: 6 },
    { caseNumber: "CASE-1006", subject: "Mobile app sync delay", description: "Changes made on mobile app take 30+ minutes to sync", status: "new", priority: "low", type: "Performance", origin: "web", contactIdx: 10, accountIdx: 6, assignedIdx: 5 },
    { caseNumber: "CASE-1007", subject: "Billing discrepancy - overcharged", description: "Invoice for December shows incorrect user count", status: "in_progress", priority: "high", type: "Billing", origin: "phone", contactIdx: 13, accountIdx: 8, assignedIdx: 5 },
    { caseNumber: "CASE-1008", subject: "Email template formatting broken", description: "HTML emails rendering incorrectly in Outlook", status: "new", priority: "medium", type: "Bug", origin: "email", contactIdx: 16, accountIdx: 11, assignedIdx: 6 },
    { caseNumber: "CASE-1009", subject: "User permission setup guidance", description: "Need help configuring role-based access for new team", status: "resolved", priority: "low", type: "Question", origin: "web", contactIdx: 7, accountIdx: 3, assignedIdx: 5, resolution: "Provided documentation and 1:1 training session", resolvedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
    { caseNumber: "CASE-1010", subject: "API rate limit issue", description: "Getting 429 errors when using bulk import API", status: "closed", priority: "medium", type: "Technical", origin: "email", contactIdx: 17, accountIdx: 13, assignedIdx: 6, resolution: "Implemented exponential backoff, increased rate limit for account", resolvedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) },
    { caseNumber: "CASE-1011", subject: "Dashboard widgets not loading", description: "KPI widgets showing spinner indefinitely", status: "in_progress", priority: "high", type: "Bug", origin: "phone", contactIdx: 19, accountIdx: 18, assignedIdx: 6 },
    { caseNumber: "CASE-1012", subject: "Duplicate detection not working", description: "System allowing duplicate contact emails", status: "new", priority: "medium", type: "Bug", origin: "web", contactIdx: 20, accountIdx: 16, assignedIdx: 5 },
    { caseNumber: "CASE-1013", subject: "Calendar sync with Outlook", description: "Meetings not syncing to Outlook calendar", status: "pending", priority: "medium", type: "Integration", origin: "email", contactIdx: 1, accountIdx: 0, assignedIdx: 6 },
    { caseNumber: "CASE-1014", subject: "Password reset emails not received", description: "Users reporting password reset emails going to spam or not arriving", status: "new", priority: "high", type: "Bug", origin: "phone", contactIdx: 22, accountIdx: 15, assignedIdx: 6 },
    { caseNumber: "CASE-1015", subject: "Training request - Advanced admin features", description: "Requesting advanced training for their admin team", status: "resolved", priority: "low", type: "Training", origin: "email", contactIdx: 14, accountIdx: 9, assignedIdx: 5, resolution: "Scheduled and completed 3-session training program", resolvedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
  ],
  quotes: [
    {
      quoteNumber: "QT-1001", name: "Apex Technologies - Enterprise Package", opportunityIdx: 0, contactIdx: 0, accountIdx: 0,
      status: "sent", validUntil: new Date(now.getFullYear(), now.getMonth() + 1, 30), subtotal: "229000", discount: "10", tax: "0", total: "206100",
      notes: "10% volume discount applied. Implementation timeline: 90 days.",
      items: [
        { productIdx: 0, productName: "CRMAI Enterprise Suite", quantity: "1", unitPrice: "49999", discount: "0", total: "49999" },
        { productIdx: 3, productName: "Implementation Services", quantity: "5", unitPrice: "15000", discount: "0", total: "75000" },
        { productIdx: 5, productName: "Training Package - Advanced", quantity: "3", unitPrice: "4500", discount: "0", total: "13500" },
        { productIdx: 6, productName: "Annual Support Plan", quantity: "3", unitPrice: "5999", discount: "0", total: "17997" },
        { productIdx: 9, productName: "CRMAI Add-on: Analytics", quantity: "1", unitPrice: "3999", discount: "0", total: "3999" },
        { productIdx: 10, productName: "CRMAI Add-on: AI Assistant", quantity: "1", unitPrice: "4999", discount: "0", total: "4999" },
      ],
    },
    {
      quoteNumber: "QT-1002", name: "GlobalFinance Corp - Full Platform", opportunityIdx: 1, contactIdx: 2, accountIdx: 1,
      status: "accepted", validUntil: new Date(now.getFullYear(), now.getMonth() + 2, 28), subtotal: "580000", discount: "15", tax: "0", total: "493000",
      notes: "Strategic account pricing. 15% enterprise discount.",
      items: [
        { productIdx: 0, productName: "CRMAI Enterprise Suite", quantity: "1", unitPrice: "49999", discount: "15", total: "42499" },
        { productIdx: 3, productName: "Implementation Services", quantity: "10", unitPrice: "15000", discount: "15", total: "127500" },
        { productIdx: 7, productName: "Data Migration Service", quantity: "1", unitPrice: "8000", discount: "0", total: "8000" },
      ],
    },
    {
      quoteNumber: "QT-1003", name: "LogisticsPro - Enterprise Suite + Services", opportunityIdx: 7, contactIdx: 13, accountIdx: 8,
      status: "draft", validUntil: new Date(now.getFullYear(), now.getMonth() + 1, 15), subtotal: "412000", discount: "0", tax: "0", total: "412000",
      notes: "Pending final scope agreement.",
      items: [
        { productIdx: 0, productName: "CRMAI Enterprise Suite", quantity: "1", unitPrice: "49999", discount: "0", total: "49999" },
        { productIdx: 8, productName: "Custom Integration", quantity: "2", unitPrice: "12000", discount: "0", total: "24000" },
        { productIdx: 3, productName: "Implementation Services", quantity: "8", unitPrice: "15000", discount: "0", total: "120000" },
      ],
    },
  ],
};

// --- Tenant 2: "Acme Test Org" (org 2) — a smaller, deliberately distinct
// dataset. Names/emails/companies never overlap with Tenant 1 so a cross-tenant
// leak in either direction is immediately obvious in the isolation smoke test. ---
const ACME_ORG_DATA: TenantDataset = {
  label: "Acme Test Org",
  users: [
    { name: "Priya Nair", email: "priya@acmetest.io", role: "admin", team: "Management", isActive: true },
    { name: "Tom Baxter", email: "tom@acmetest.io", role: "manager", team: "Sales", isActive: true },
    { name: "Yuki Tanaka", email: "yuki@acmetest.io", role: "rep", team: "Sales", isActive: true },
  ],
  accounts: [
    { name: "Nimbus Retail Group", industry: "Retail", website: "https://nimbusretail.test", phone: "+44-20-7000-1000", email: "contact@nimbusretail.test", city: "Manchester", country: "UK", employees: 410, annualRevenue: "38000000", ownerIdx: 1 },
    { name: "Ferrovia Logistics", industry: "Logistics", website: "https://ferrovia.test", phone: "+44-20-7000-2000", email: "info@ferrovia.test", city: "Leeds", country: "UK", employees: 960, annualRevenue: "72000000", ownerIdx: 1 },
    { name: "Solstice Media Group", industry: "Media", website: "https://solsticemedia.test", phone: "+44-20-7000-3000", email: "hello@solsticemedia.test", city: "Bristol", country: "UK", employees: 130, annualRevenue: "9000000", ownerIdx: 2 },
    { name: "Kestrel Biotech", industry: "Healthcare", website: "https://kestrelbio.test", phone: "+44-20-7000-4000", email: "info@kestrelbio.test", city: "Cambridge", country: "UK", employees: 280, annualRevenue: "21000000", ownerIdx: 2 },
    { name: "Ironwood Manufacturing", industry: "Manufacturing", website: "https://ironwoodmfg.test", phone: "+44-20-7000-5000", email: "sales@ironwoodmfg.test", city: "Sheffield", country: "UK", employees: 1500, annualRevenue: "145000000", ownerIdx: 1 },
  ],
  contacts: [
    { firstName: "Harriet", lastName: "Osei", email: "h.osei@nimbusretail.test", phone: "+44-20-7000-1001", title: "COO", department: "Operations", accountIdx: 0, ownerIdx: 1, leadSource: "referral", city: "Manchester", country: "UK" },
    { firstName: "Callum", lastName: "Doyle", email: "c.doyle@nimbusretail.test", phone: "+44-20-7000-1002", title: "IT Director", department: "IT", accountIdx: 0, ownerIdx: 2, leadSource: "web", city: "Manchester", country: "UK" },
    { firstName: "Freya", lastName: "Lindqvist", email: "f.lindqvist@ferrovia.test", phone: "+44-20-7000-2001", title: "VP Operations", department: "Operations", accountIdx: 1, ownerIdx: 1, leadSource: "conference", city: "Leeds", country: "UK" },
    { firstName: "Idris", lastName: "Farouk", email: "i.farouk@solsticemedia.test", phone: "+44-20-7000-3001", title: "CEO", department: "Executive", accountIdx: 2, ownerIdx: 2, leadSource: "web", city: "Bristol", country: "UK" },
    { firstName: "Marguerite", lastName: "Dubois", email: "m.dubois@kestrelbio.test", phone: "+44-20-7000-4001", title: "Research Director", department: "R&D", accountIdx: 3, ownerIdx: 2, leadSource: "referral", city: "Cambridge", country: "UK" },
    { firstName: "Owen", lastName: "Pryce", email: "o.pryce@ironwoodmfg.test", phone: "+44-20-7000-5001", title: "Purchasing Manager", department: "Procurement", accountIdx: 4, ownerIdx: 1, leadSource: "cold_call", city: "Sheffield", country: "UK" },
  ],
  products: [
    { name: "Acme CRM Standard", code: "ACM-STD", description: "Standard CRM license per seat/year", unitPrice: "899.00", currency: "GBP", category: "Software", isActive: true },
    { name: "Acme Onboarding Package", code: "ACM-ONB", description: "Guided onboarding and setup", unitPrice: "6000.00", currency: "GBP", category: "Services", isActive: true },
    { name: "Acme Priority Support", code: "ACM-SUP", description: "Annual priority support plan", unitPrice: "1800.00", currency: "GBP", category: "Support", isActive: true },
  ],
  leads: [
    { firstName: "Beatrix", lastName: "Whitfield", email: "b.whitfield@northlane.test", phone: "+44-20-7100-0001", company: "Northlane Freight", title: "Ops Manager", status: "new", source: "web", score: 60, employees: 210, industry: "Logistics", assignedIdx: 1 },
    { firstName: "Declan", lastName: "Mercer", email: "d.mercer@brightfield.test", phone: "+44-20-7100-0002", company: "Brightfield Retail", title: "CTO", status: "qualified", source: "referral", score: 84, employees: 340, industry: "Retail", assignedIdx: 2 },
    { firstName: "Saoirse", lastName: "Quinn", email: "s.quinn@lumenmedia.test", phone: "+44-20-7100-0003", company: "Lumen Media", title: "CEO", status: "contacted", source: "conference", score: 71, employees: 90, industry: "Media", assignedIdx: 1 },
    { firstName: "Aksel", lastName: "Berg", email: "a.berg@kestrelbio.test", phone: "+44-20-7100-0004", company: "Kestrel Biotech", title: "Lab Director", status: "new", source: "web", score: 66, employees: 280, industry: "Healthcare", assignedIdx: 2 },
    { firstName: "Nadia", lastName: "Osei", email: "n.osei@ironwoodmfg.test", phone: "+44-20-7100-0005", company: "Ironwood Manufacturing", title: "Plant Manager", status: "qualified", source: "cold_call", score: 79, employees: 1500, industry: "Manufacturing", assignedIdx: 1 },
  ],
  opportunities: [
    { name: "Nimbus Retail Group - Standard Rollout", accountIdx: 0, contactIdx: 0, stage: "proposal", amount: "42000", probability: 55, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 12), assignedIdx: 1, leadSource: "referral", nextStep: "Send updated proposal" },
    { name: "Ferrovia Logistics - Onboarding + Support", accountIdx: 1, contactIdx: 2, stage: "negotiation", amount: "68000", probability: 75, closeDate: new Date(now.getFullYear(), now.getMonth(), 26), assignedIdx: 1, leadSource: "conference", nextStep: "Finalize contract terms" },
    { name: "Solstice Media Group - Starter Rollout", accountIdx: 2, contactIdx: 3, stage: "qualification", amount: "15000", probability: 35, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 8), assignedIdx: 2, leadSource: "web" },
    { name: "Kestrel Biotech - Full Platform", accountIdx: 3, contactIdx: 4, stage: "closed_won", amount: "31000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 18), assignedIdx: 2, leadSource: "referral" },
    { name: "Ironwood Manufacturing - Enterprise Rollout", accountIdx: 4, contactIdx: 5, stage: "prospecting", amount: "95000", probability: 20, closeDate: new Date(now.getFullYear(), now.getMonth() + 3, 5), assignedIdx: 1, leadSource: "cold_call" },
  ],
  activities: [
    { type: "call", subject: "Discovery call with Nimbus Retail", status: "completed", contactIdx: 0, opportunityIdx: 0, accountIdx: 0, assignedIdx: 1, description: "Reviewed current POS/CRM pain points.", dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "Proposal sent - Ferrovia Logistics", status: "completed", contactIdx: 2, opportunityIdx: 1, accountIdx: 1, assignedIdx: 1, description: "Sent onboarding + support bundle pricing.", dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Kickoff - Kestrel Biotech", status: "completed", contactIdx: 4, opportunityIdx: 3, accountIdx: 3, assignedIdx: 2, description: "Implementation kickoff meeting.", completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Prepare Ironwood demo environment", status: "planned", contactIdx: 5, opportunityIdx: 4, accountIdx: 4, assignedIdx: 1, description: "Set up a sandbox tailored to their manufacturing workflow.", dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Qualification call - Solstice Media", status: "planned", contactIdx: 3, opportunityIdx: 2, accountIdx: 2, assignedIdx: 2, description: "Confirm budget and timeline.", dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000) },
  ],
  cases: [
    { caseNumber: "ACME-CASE-2001", subject: "SSO login failing for new starters", description: "New Nimbus Retail users can't complete SSO login.", status: "in_progress", priority: "high", type: "Bug", origin: "email", contactIdx: 1, accountIdx: 0, assignedIdx: 2 },
    { caseNumber: "ACME-CASE-2002", subject: "Export formatting question", description: "Ferrovia asking how to customize CSV export columns.", status: "new", priority: "low", type: "Question", origin: "web", contactIdx: 2, accountIdx: 1, assignedIdx: 2 },
    { caseNumber: "ACME-CASE-2003", subject: "Support renewal billing query", description: "Kestrel Biotech disputing renewal invoice amount.", status: "resolved", priority: "medium", type: "Billing", origin: "phone", contactIdx: 4, accountIdx: 3, assignedIdx: 1, resolution: "Corrected proration on renewal invoice.", resolvedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
  ],
  quotes: [
    {
      quoteNumber: "ACME-QT-3001", name: "Nimbus Retail Group - Standard Package", opportunityIdx: 0, contactIdx: 0, accountIdx: 0,
      status: "sent", validUntil: new Date(now.getFullYear(), now.getMonth() + 1, 20), subtotal: "42000", discount: "5", tax: "0", total: "39900",
      notes: "5% early-commit discount.",
      items: [
        { productIdx: 0, productName: "Acme CRM Standard", quantity: "40", unitPrice: "899", discount: "5", total: "34162" },
        { productIdx: 2, productName: "Acme Priority Support", quantity: "1", unitPrice: "1800", discount: "0", total: "1800" },
      ],
    },
  ],
};

async function main() {
  const org1Id = await ensureOrg("Default Organization", "default");
  await seedTenant(org1Id, DEFAULT_ORG_DATA);

  const org2Id = await ensureOrg("Acme Test Org", "acme-test");
  await seedTenant(org2Id, ACME_ORG_DATA);

  console.log(`\n✅ Seeding complete for both tenants (org ${org1Id}: "${DEFAULT_ORG_DATA.label}", org ${org2Id}: "${ACME_ORG_DATA.label}").`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
