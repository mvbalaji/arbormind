import { db } from "@workspace/db";
import {
  usersTable, accountsTable, contactsTable, leadsTable,
  opportunitiesTable, activitiesTable, productsTable, casesTable,
  quotesTable, quoteItemsTable
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding CRM database...");

  // Clear existing data in reverse dependency order
  await db.delete(quoteItemsTable);
  await db.delete(quotesTable);
  await db.delete(activitiesTable);
  await db.delete(casesTable);
  await db.delete(opportunitiesTable);
  await db.delete(leadsTable);
  await db.delete(contactsTable);
  await db.delete(accountsTable);
  await db.delete(productsTable);
  await db.delete(usersTable);

  console.log("  ✓ Cleared existing data");

  // Users
  const users = await db.insert(usersTable).values([
    { name: "Alex Johnson", email: "alex@crmai.io", role: "admin", team: "Management", isActive: true },
    { name: "Sarah Chen", email: "sarah@crmai.io", role: "manager", team: "Enterprise Sales", isActive: true },
    { name: "Mike Rodriguez", email: "mike@crmai.io", role: "rep", team: "Enterprise Sales", isActive: true },
    { name: "Emma Wilson", email: "emma@crmai.io", role: "rep", team: "SMB Sales", isActive: true },
    { name: "James Park", email: "james@crmai.io", role: "rep", team: "SMB Sales", isActive: true },
    { name: "Olivia Brown", email: "olivia@crmai.io", role: "manager", team: "Customer Success", isActive: true },
    { name: "Daniel Kim", email: "daniel@crmai.io", role: "rep", team: "Customer Success", isActive: true },
    { name: "Sophia Martinez", email: "sophia@crmai.io", role: "rep", team: "Enterprise Sales", isActive: true },
  ]).returning();
  console.log(`  ✓ Created ${users.length} users`);

  // Accounts
  const accounts = await db.insert(accountsTable).values([
    { name: "Apex Technologies", industry: "Technology", website: "https://apextech.com", phone: "+1-555-100-1000", email: "contact@apextech.com", city: "San Francisco", country: "USA", employees: 2500, annualRevenue: "45000000", ownerId: users[1].id },
    { name: "GlobalFinance Corp", industry: "Finance", website: "https://globalfinance.com", phone: "+1-555-200-2000", email: "info@globalfinance.com", city: "New York", country: "USA", employees: 8500, annualRevenue: "320000000", ownerId: users[1].id },
    { name: "HealthFirst Systems", industry: "Healthcare", website: "https://healthfirst.io", phone: "+1-555-300-3000", email: "hello@healthfirst.io", city: "Boston", country: "USA", employees: 1200, annualRevenue: "78000000", ownerId: users[2].id },
    { name: "RetailPro Inc", industry: "Retail", website: "https://retailpro.com", phone: "+1-555-400-4000", email: "sales@retailpro.com", city: "Chicago", country: "USA", employees: 4200, annualRevenue: "155000000", ownerId: users[2].id },
    { name: "EduLearn Platform", industry: "Education", website: "https://edulearn.co", phone: "+1-555-500-5000", email: "info@edulearn.co", city: "Austin", country: "USA", employees: 340, annualRevenue: "12000000", ownerId: users[3].id },
    { name: "ManuCore Industries", industry: "Manufacturing", website: "https://manucore.com", phone: "+1-555-600-6000", email: "contact@manucore.com", city: "Detroit", country: "USA", employees: 6700, annualRevenue: "890000000", ownerId: users[2].id },
    { name: "CloudNine SaaS", industry: "Technology", website: "https://cloudnine.io", phone: "+1-555-700-7000", email: "hello@cloudnine.io", city: "Seattle", country: "USA", employees: 890, annualRevenue: "67000000", ownerId: users[3].id },
    { name: "RealEstate Plus", industry: "Real Estate", website: "https://realestateplus.com", phone: "+1-555-800-8000", email: "info@realestateplus.com", city: "Miami", country: "USA", employees: 220, annualRevenue: "23000000", ownerId: users[4].id },
    { name: "LogisticsPro", industry: "Logistics", website: "https://logisticspro.net", phone: "+1-555-900-9000", email: "ops@logisticspro.net", city: "Dallas", country: "USA", employees: 3100, annualRevenue: "234000000", ownerId: users[7].id },
    { name: "BioMed Research", industry: "Healthcare", website: "https://biomed.org", phone: "+1-555-110-1100", email: "research@biomed.org", city: "San Diego", country: "USA", employees: 560, annualRevenue: "45000000", ownerId: users[4].id },
    { name: "EnergyForward", industry: "Energy", website: "https://energyforward.com", phone: "+1-555-120-1200", email: "contact@energyforward.com", city: "Houston", country: "USA", employees: 1850, annualRevenue: "412000000", ownerId: users[2].id },
    { name: "MediaStream Co", industry: "Media", website: "https://mediastream.co", phone: "+1-555-130-1300", email: "hello@mediastream.co", city: "Los Angeles", country: "USA", employees: 740, annualRevenue: "89000000", ownerId: users[3].id },
    { name: "AgriGrow Solutions", industry: "Agriculture", website: "https://agrigrow.com", phone: "+1-555-140-1400", email: "sales@agrigrow.com", city: "Des Moines", country: "USA", employees: 180, annualRevenue: "18000000", ownerId: users[4].id },
    { name: "CyberShield Security", industry: "Technology", website: "https://cybershield.io", phone: "+1-555-150-1500", email: "info@cybershield.io", city: "Washington DC", country: "USA", employees: 430, annualRevenue: "56000000", ownerId: users[7].id },
    { name: "TravelWorld Agency", industry: "Travel", website: "https://travelworld.com", phone: "+1-555-160-1600", email: "book@travelworld.com", city: "Las Vegas", country: "USA", employees: 290, annualRevenue: "34000000", ownerId: users[4].id },
    { name: "FoodChain Restaurants", industry: "Food & Beverage", website: "https://foodchain.biz", phone: "+1-555-170-1700", email: "corporate@foodchain.biz", city: "Atlanta", country: "USA", employees: 5400, annualRevenue: "678000000", ownerId: users[2].id },
    { name: "AutoDrive Motors", industry: "Automotive", website: "https://autodrive.com", phone: "+1-555-180-1800", email: "fleet@autodrive.com", city: "Detroit", country: "USA", employees: 9200, annualRevenue: "1200000000", ownerId: users[1].id },
    { name: "FinTech Innovators", industry: "Finance", website: "https://fintech.xyz", phone: "+1-555-190-1900", email: "hello@fintech.xyz", city: "New York", country: "USA", employees: 340, annualRevenue: "28000000", ownerId: users[7].id },
    { name: "PharmaCure Labs", industry: "Healthcare", website: "https://pharmacure.com", phone: "+1-555-200-2100", email: "info@pharmacure.com", city: "Philadelphia", country: "USA", employees: 2300, annualRevenue: "345000000", ownerId: users[1].id },
    { name: "BuildRight Construction", industry: "Construction", website: "https://buildright.net", phone: "+1-555-210-2200", email: "projects@buildright.net", city: "Phoenix", country: "USA", employees: 780, annualRevenue: "92000000", ownerId: users[4].id },
  ]).returning();
  console.log(`  ✓ Created ${accounts.length} accounts`);

  // Contacts
  const contacts = await db.insert(contactsTable).values([
    { firstName: "Robert", lastName: "Chen", email: "robert.chen@apextech.com", phone: "+1-555-100-1001", title: "CTO", department: "Engineering", accountId: accounts[0].id, ownerId: users[2].id, leadSource: "referral", city: "San Francisco", country: "USA" },
    { firstName: "Jennifer", lastName: "Walsh", email: "j.walsh@apextech.com", phone: "+1-555-100-1002", title: "VP Sales", department: "Sales", accountId: accounts[0].id, ownerId: users[2].id, leadSource: "web", city: "San Francisco", country: "USA" },
    { firstName: "Michael", lastName: "Thompson", email: "mthompson@globalfinance.com", phone: "+1-555-200-2001", title: "CFO", department: "Finance", accountId: accounts[1].id, ownerId: users[1].id, leadSource: "conference", city: "New York", country: "USA" },
    { firstName: "Amanda", lastName: "Foster", email: "afoster@globalfinance.com", phone: "+1-555-200-2002", title: "Procurement Manager", department: "Procurement", accountId: accounts[1].id, ownerId: users[1].id, leadSource: "email", city: "New York", country: "USA" },
    { firstName: "David", lastName: "Kim", email: "d.kim@healthfirst.io", phone: "+1-555-300-3001", title: "CEO", department: "Executive", accountId: accounts[2].id, ownerId: users[2].id, leadSource: "referral", city: "Boston", country: "USA" },
    { firstName: "Lisa", lastName: "Patel", email: "lpatel@healthfirst.io", phone: "+1-555-300-3002", title: "IT Director", department: "IT", accountId: accounts[2].id, ownerId: users[3].id, leadSource: "web", city: "Boston", country: "USA" },
    { firstName: "Kevin", lastName: "Martinez", email: "kmart@retailpro.com", phone: "+1-555-400-4001", title: "COO", department: "Operations", accountId: accounts[3].id, ownerId: users[2].id, leadSource: "partner", city: "Chicago", country: "USA" },
    { firstName: "Nicole", lastName: "Anderson", email: "n.anderson@retailpro.com", phone: "+1-555-400-4002", title: "Marketing Director", department: "Marketing", accountId: accounts[3].id, ownerId: users[3].id, leadSource: "conference", city: "Chicago", country: "USA" },
    { firstName: "Brian", lastName: "Taylor", email: "btaylor@edulearn.co", phone: "+1-555-500-5001", title: "CEO", department: "Executive", accountId: accounts[4].id, ownerId: users[3].id, leadSource: "web", city: "Austin", country: "USA" },
    { firstName: "Jessica", lastName: "White", email: "j.white@manucore.com", phone: "+1-555-600-6001", title: "Purchasing Manager", department: "Procurement", accountId: accounts[5].id, ownerId: users[2].id, leadSource: "cold_call", city: "Detroit", country: "USA" },
    { firstName: "Christopher", lastName: "Lee", email: "clee@cloudnine.io", phone: "+1-555-700-7001", title: "CTO", department: "Engineering", accountId: accounts[6].id, ownerId: users[3].id, leadSource: "referral", city: "Seattle", country: "USA" },
    { firstName: "Ashley", lastName: "Harris", email: "aharris@cloudnine.io", phone: "+1-555-700-7002", title: "VP Engineering", department: "Engineering", accountId: accounts[6].id, ownerId: users[7].id, leadSource: "web", city: "Seattle", country: "USA" },
    { firstName: "Matthew", lastName: "Jackson", email: "mjackson@realestateplus.com", phone: "+1-555-800-8001", title: "CEO", department: "Executive", accountId: accounts[7].id, ownerId: users[4].id, leadSource: "web", city: "Miami", country: "USA" },
    { firstName: "Stephanie", lastName: "Moore", email: "smoore@logisticspro.net", phone: "+1-555-900-9001", title: "VP Operations", department: "Operations", accountId: accounts[8].id, ownerId: users[7].id, leadSource: "conference", city: "Dallas", country: "USA" },
    { firstName: "Daniel", lastName: "Johnson", email: "djohnson@biomed.org", phone: "+1-555-110-1101", title: "Research Director", department: "R&D", accountId: accounts[9].id, ownerId: users[4].id, leadSource: "referral", city: "San Diego", country: "USA" },
    { firstName: "Laura", lastName: "Williams", email: "lwilliams@energyforward.com", phone: "+1-555-120-1201", title: "Procurement Director", department: "Procurement", accountId: accounts[10].id, ownerId: users[2].id, leadSource: "cold_call", city: "Houston", country: "USA" },
    { firstName: "Ryan", lastName: "Davis", email: "rdavis@mediastream.co", phone: "+1-555-130-1301", title: "CTO", department: "Technology", accountId: accounts[11].id, ownerId: users[3].id, leadSource: "web", city: "Los Angeles", country: "USA" },
    { firstName: "Emily", lastName: "Wilson", email: "ewilson@cybershield.io", phone: "+1-555-150-1501", title: "CISO", department: "Security", accountId: accounts[13].id, ownerId: users[7].id, leadSource: "conference", city: "Washington DC", country: "USA" },
    { firstName: "Andrew", lastName: "Garcia", email: "agarcia@fintech.xyz", phone: "+1-555-190-1901", title: "CEO", department: "Executive", accountId: accounts[17].id, ownerId: users[7].id, leadSource: "referral", city: "New York", country: "USA" },
    { firstName: "Patricia", lastName: "Robinson", email: "probinson@pharmacure.com", phone: "+1-555-200-2101", title: "VP Procurement", department: "Procurement", accountId: accounts[18].id, ownerId: users[1].id, leadSource: "partner", city: "Philadelphia", country: "USA" },
    { firstName: "Mark", lastName: "Lewis", email: "mlewis@autodrive.com", phone: "+1-555-180-1801", title: "IT Director", department: "IT", accountId: accounts[16].id, ownerId: users[1].id, leadSource: "referral", city: "Detroit", country: "USA" },
    { firstName: "Sandra", lastName: "Clark", email: "sclark@buildright.net", phone: "+1-555-210-2201", title: "COO", department: "Operations", accountId: accounts[19].id, ownerId: users[4].id, leadSource: "web", city: "Phoenix", country: "USA" },
    { firstName: "Paul", lastName: "Rodriguez", email: "prodriguez@foodchain.biz", phone: "+1-555-170-1701", title: "VP Technology", department: "Technology", accountId: accounts[15].id, ownerId: users[2].id, leadSource: "conference", city: "Atlanta", country: "USA" },
    { firstName: "Nancy", lastName: "Scott", email: "nscott@agrigrow.com", phone: "+1-555-140-1401", title: "CEO", department: "Executive", accountId: accounts[12].id, ownerId: users[4].id, leadSource: "cold_call", city: "Des Moines", country: "USA" },
    { firstName: "George", lastName: "Young", email: "gyoung@travelworld.com", phone: "+1-555-160-1601", title: "VP Operations", department: "Operations", accountId: accounts[14].id, ownerId: users[4].id, leadSource: "web", city: "Las Vegas", country: "USA" },
    { firstName: "Helen", lastName: "Hall", email: "hhall@manucore.com", phone: "+1-555-600-6002", title: "VP Engineering", department: "Engineering", accountId: accounts[5].id, ownerId: users[7].id, leadSource: "referral", city: "Detroit", country: "USA" },
    { firstName: "Frank", lastName: "Adams", email: "fadams@globalfinance.com", phone: "+1-555-200-2003", title: "VP Technology", department: "Technology", accountId: accounts[1].id, ownerId: users[7].id, leadSource: "conference", city: "New York", country: "USA" },
    { firstName: "Betty", lastName: "Baker", email: "bbaker@energyforward.com", phone: "+1-555-120-1202", title: "CTO", department: "Technology", accountId: accounts[10].id, ownerId: users[1].id, leadSource: "referral", city: "Houston", country: "USA" },
  ]).returning();
  console.log(`  ✓ Created ${contacts.length} contacts`);

  // Products
  const products = await db.insert(productsTable).values([
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
  ]).returning();
  console.log(`  ✓ Created ${products.length} products`);

  // Leads
  const leads = await db.insert(leadsTable).values([
    { firstName: "Thomas", lastName: "Brown", email: "tbrown@techstart.io", phone: "+1-555-001-0001", company: "TechStart Inc", title: "CEO", status: "qualified", source: "web", score: 85, employees: 45, industry: "Technology", assignedTo: users[2].id },
    { firstName: "Monica", lastName: "Garcia", email: "mgarcia@greenergy.com", phone: "+1-555-001-0002", company: "Greenergy Solutions", title: "VP Operations", status: "contacted", source: "conference", score: 72, employees: 120, industry: "Energy", assignedTo: users[3].id },
    { firstName: "William", lastName: "Nelson", email: "wnelson@mediax.com", phone: "+1-555-001-0003", company: "MediaX Corp", title: "CTO", status: "new", source: "cold_call", score: 45, employees: 890, industry: "Media", assignedTo: users[7].id },
    { firstName: "Catherine", lastName: "Cooper", email: "ccooper@smartretail.com", phone: "+1-555-001-0004", company: "SmartRetail", title: "IT Manager", status: "qualified", source: "referral", score: 91, employees: 230, industry: "Retail", assignedTo: users[2].id },
    { firstName: "Richard", lastName: "Turner", email: "rturner@logix.net", phone: "+1-555-001-0005", company: "LogiX Systems", title: "Director of IT", status: "contacted", source: "email", score: 63, employees: 780, industry: "Logistics", assignedTo: users[7].id },
    { firstName: "Margaret", lastName: "Phillips", email: "mphillips@biotech.org", phone: "+1-555-001-0006", company: "BioTech Research", title: "Research Director", status: "new", source: "web", score: 55, employees: 340, industry: "Healthcare", assignedTo: users[4].id },
    { firstName: "Charles", lastName: "Evans", email: "cevans@finpro.io", phone: "+1-555-001-0007", company: "FinPro Advisory", title: "CEO", status: "qualified", source: "partner", score: 88, employees: 60, industry: "Finance", assignedTo: users[1].id },
    { firstName: "Dorothy", lastName: "King", email: "dking@constructco.com", phone: "+1-555-001-0008", company: "ConstructCo", title: "VP Technology", status: "unqualified", source: "cold_call", score: 30, employees: 450, industry: "Construction", assignedTo: users[4].id },
    { firstName: "Joseph", lastName: "Wright", email: "jwright@autotech.com", phone: "+1-555-001-0009", company: "AutoTech Solutions", title: "CTO", status: "new", source: "web", score: 67, employees: 2300, industry: "Automotive", assignedTo: users[2].id },
    { firstName: "Deborah", lastName: "Lopez", email: "dlopez@edusmart.edu", phone: "+1-555-001-0010", company: "EduSmart", title: "Technology Director", status: "contacted", source: "conference", score: 78, employees: 180, industry: "Education", assignedTo: users[3].id },
    { firstName: "Steven", lastName: "Hill", email: "shill@agromate.ag", phone: "+1-555-001-0011", company: "AgroMate", title: "Operations Manager", status: "new", source: "web", score: 42, employees: 90, industry: "Agriculture", assignedTo: users[4].id },
    { firstName: "Carol", lastName: "Scott", email: "cscott@pharmalab.com", phone: "+1-555-001-0012", company: "PharmaLab Corp", title: "Director of IT", status: "qualified", source: "referral", score: 95, employees: 560, industry: "Healthcare", assignedTo: users[2].id },
    { firstName: "Kenneth", lastName: "Green", email: "kgreen@secupoint.io", phone: "+1-555-001-0013", company: "SecuPoint Security", title: "CISO", status: "contacted", source: "email", score: 76, employees: 140, industry: "Technology", assignedTo: users[7].id },
    { firstName: "Sharon", lastName: "Baker", email: "sbaker@realtypro.com", phone: "+1-555-001-0014", company: "RealtyPro", title: "VP Sales", status: "new", source: "web", score: 58, employees: 75, industry: "Real Estate", assignedTo: users[4].id },
    { firstName: "Ronald", lastName: "Adams", email: "radams@travelnet.com", phone: "+1-555-001-0015", company: "TravelNet", title: "Head of Technology", status: "qualified", source: "conference", score: 82, employees: 210, industry: "Travel", assignedTo: users[3].id },
    { firstName: "Lisa", lastName: "Campbell", email: "lcampbell@foodtech.biz", phone: "+1-555-001-0016", company: "FoodTech Co", title: "CTO", status: "new", source: "cold_call", score: 50, employees: 320, industry: "Food & Beverage", assignedTo: users[2].id },
    { firstName: "Larry", lastName: "Mitchell", email: "lmitchell@cloudify.io", phone: "+1-555-001-0017", company: "Cloudify Solutions", title: "CEO", status: "qualified", source: "referral", score: 90, employees: 85, industry: "Technology", assignedTo: users[7].id },
    { firstName: "Betty", lastName: "Perez", email: "bperez@globalmed.com", phone: "+1-555-001-0018", company: "GlobalMed", title: "Procurement Manager", status: "contacted", source: "web", score: 69, employees: 1200, industry: "Healthcare", assignedTo: users[4].id },
    { firstName: "George", lastName: "Roberts", email: "groberts@energysol.com", phone: "+1-555-001-0019", company: "EnergySol", title: "Director", status: "new", source: "partner", score: 55, employees: 890, industry: "Energy", assignedTo: users[2].id },
    { firstName: "Sandra", lastName: "Turner", email: "sturner@dataflow.ai", phone: "+1-555-001-0020", company: "DataFlow AI", title: "CEO", status: "qualified", source: "web", score: 94, employees: 32, industry: "Technology", assignedTo: users[7].id },
  ]).returning();
  console.log(`  ✓ Created ${leads.length} leads`);

  // Opportunities
  const now = new Date();
  const opportunities = await db.insert(opportunitiesTable).values([
    { name: "Apex Technologies - Enterprise Suite", accountId: accounts[0].id, contactId: contacts[0].id, stage: "proposal", amount: "249000", probability: 65, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 15), assignedTo: users[2].id, leadSource: "referral", nextStep: "Send detailed proposal" },
    { name: "GlobalFinance Corp - Platform Upgrade", accountId: accounts[1].id, contactId: contacts[2].id, stage: "negotiation", amount: "580000", probability: 80, closeDate: new Date(now.getFullYear(), now.getMonth(), 28), assignedTo: users[1].id, leadSource: "conference", nextStep: "Final contract review" },
    { name: "HealthFirst Systems - CRM Implementation", accountId: accounts[2].id, contactId: contacts[4].id, stage: "qualification", amount: "89000", probability: 40, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 10), assignedTo: users[2].id, leadSource: "referral", nextStep: "Schedule technical discovery call" },
    { name: "RetailPro Inc - Enterprise License", accountId: accounts[3].id, contactId: contacts[6].id, stage: "closed_won", amount: "187000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 20), assignedTo: users[2].id, leadSource: "partner" },
    { name: "EduLearn Platform - Starter Package", accountId: accounts[4].id, contactId: contacts[8].id, stage: "prospecting", amount: "24000", probability: 20, closeDate: new Date(now.getFullYear(), now.getMonth() + 3, 1), assignedTo: users[3].id, leadSource: "web" },
    { name: "ManuCore Industries - Custom Integration", accountId: accounts[5].id, contactId: contacts[9].id, stage: "proposal", amount: "135000", probability: 55, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 25), assignedTo: users[2].id, leadSource: "cold_call", nextStep: "Demo scheduled for next week" },
    { name: "CloudNine SaaS - Professional License", accountId: accounts[6].id, contactId: contacts[10].id, stage: "closed_won", amount: "95000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), assignedTo: users[3].id, leadSource: "referral" },
    { name: "LogisticsPro - Enterprise Suite + Services", accountId: accounts[8].id, contactId: contacts[13].id, stage: "negotiation", amount: "412000", probability: 85, closeDate: new Date(now.getFullYear(), now.getMonth(), 30), assignedTo: users[7].id, leadSource: "conference", nextStep: "Legal review of terms" },
    { name: "BioMed Research - Analytics Add-on", accountId: accounts[9].id, contactId: contacts[14].id, stage: "qualification", amount: "45000", probability: 35, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 15), assignedTo: users[4].id, leadSource: "referral" },
    { name: "EnergyForward - Platform Implementation", accountId: accounts[10].id, contactId: contacts[15].id, stage: "prospecting", amount: "298000", probability: 25, closeDate: new Date(now.getFullYear(), now.getMonth() + 3, 15), assignedTo: users[2].id, leadSource: "cold_call" },
    { name: "MediaStream Co - Enterprise License", accountId: accounts[11].id, contactId: contacts[16].id, stage: "closed_lost", amount: "156000", probability: 0, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 5), assignedTo: users[3].id, leadSource: "web" },
    { name: "CyberShield Security - Professional Suite", accountId: accounts[13].id, contactId: contacts[17].id, stage: "proposal", amount: "78000", probability: 60, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 20), assignedTo: users[7].id, leadSource: "conference", nextStep: "Security review meeting" },
    { name: "FinTech Innovators - Starter + AI Assistant", accountId: accounts[17].id, contactId: contacts[18].id, stage: "qualification", amount: "32000", probability: 45, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 5), assignedTo: users[7].id, leadSource: "referral" },
    { name: "PharmaCure Labs - Enterprise Suite", accountId: accounts[18].id, contactId: contacts[19].id, stage: "negotiation", amount: "345000", probability: 75, closeDate: new Date(now.getFullYear(), now.getMonth(), 25), assignedTo: users[1].id, leadSource: "partner", nextStep: "Compliance review" },
    { name: "AutoDrive Motors - Full Platform License", accountId: accounts[16].id, contactId: contacts[20].id, stage: "proposal", amount: "789000", probability: 50, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 28), assignedTo: users[1].id, leadSource: "referral", nextStep: "Executive presentation" },
    { name: "BuildRight Construction - Professional", accountId: accounts[19].id, contactId: contacts[21].id, stage: "prospecting", amount: "54000", probability: 15, closeDate: new Date(now.getFullYear(), now.getMonth() + 4, 1), assignedTo: users[4].id, leadSource: "web" },
    { name: "FoodChain Restaurants - Enterprise Suite", accountId: accounts[15].id, contactId: contacts[22].id, stage: "closed_won", amount: "412000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 2, 15), assignedTo: users[2].id, leadSource: "conference" },
    { name: "GlobalFinance Corp - Analytics Module", accountId: accounts[1].id, contactId: contacts[26].id, stage: "qualification", amount: "89000", probability: 40, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 20), assignedTo: users[7].id, leadSource: "referral" },
    { name: "Apex Technologies - Training Package", accountId: accounts[0].id, contactId: contacts[1].id, stage: "closed_won", amount: "45000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 28), assignedTo: users[2].id, leadSource: "referral" },
    { name: "AgriGrow Solutions - Starter CRM", accountId: accounts[12].id, contactId: contacts[23].id, stage: "prospecting", amount: "18000", probability: 20, closeDate: new Date(now.getFullYear(), now.getMonth() + 3, 10), assignedTo: users[4].id, leadSource: "cold_call" },
    { name: "TravelWorld Agency - Professional", accountId: accounts[14].id, contactId: contacts[24].id, stage: "proposal", amount: "47000", probability: 55, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 10), assignedTo: users[4].id, leadSource: "web" },
    { name: "ManuCore Industries - Support Contract", accountId: accounts[5].id, contactId: contacts[25].id, stage: "negotiation", amount: "120000", probability: 90, closeDate: new Date(now.getFullYear(), now.getMonth(), 22), assignedTo: users[7].id, leadSource: "referral" },
    { name: "EnergyForward - Analytics Add-on", accountId: accounts[10].id, contactId: contacts[27].id, stage: "qualification", amount: "38000", probability: 35, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 8), assignedTo: users[1].id, leadSource: "referral" },
    { name: "HealthFirst Systems - Analytics Module", accountId: accounts[2].id, contactId: contacts[5].id, stage: "closed_won", amount: "62000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 2, 10), assignedTo: users[3].id, leadSource: "referral" },
    { name: "RetailPro Inc - Support Renewal", accountId: accounts[3].id, contactId: contacts[7].id, stage: "qualification", amount: "28000", probability: 70, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 5), assignedTo: users[3].id, leadSource: "partner" },
    { name: "CloudNine SaaS - Enterprise Upgrade", accountId: accounts[6].id, contactId: contacts[11].id, stage: "prospecting", amount: "145000", probability: 20, closeDate: new Date(now.getFullYear(), now.getMonth() + 4, 15), assignedTo: users[7].id, leadSource: "referral" },
    { name: "RealEstate Plus - Starter Package", accountId: accounts[7].id, contactId: contacts[12].id, stage: "proposal", amount: "22000", probability: 60, closeDate: new Date(now.getFullYear(), now.getMonth() + 1, 18), assignedTo: users[4].id, leadSource: "web" },
    { name: "PharmaCure Labs - Training Package", accountId: accounts[18].id, contactId: contacts[19].id, stage: "closed_won", amount: "18000", probability: 100, closeDate: new Date(now.getFullYear(), now.getMonth() - 1, 15), assignedTo: users[1].id, leadSource: "partner" },
    { name: "AutoDrive Motors - Migration Services", accountId: accounts[16].id, contactId: contacts[20].id, stage: "negotiation", amount: "67000", probability: 80, closeDate: new Date(now.getFullYear(), now.getMonth(), 18), assignedTo: users[2].id, leadSource: "referral" },
    { name: "BioMed Research - Implementation", accountId: accounts[9].id, contactId: contacts[14].id, stage: "proposal", amount: "34000", probability: 50, closeDate: new Date(now.getFullYear(), now.getMonth() + 2, 1), assignedTo: users[4].id, leadSource: "referral" },
  ]).returning();
  console.log(`  ✓ Created ${opportunities.length} opportunities`);

  // Activities
  const activities = await db.insert(activitiesTable).values([
    { type: "call", subject: "Discovery call with Apex Technologies", status: "completed", contactId: contacts[0].id, opportunityId: opportunities[0].id, accountId: accounts[0].id, assignedTo: users[2].id, description: "Discussed pain points with current CRM system", dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Enterprise proposal presentation - Apex", status: "planned", contactId: contacts[0].id, opportunityId: opportunities[0].id, accountId: accounts[0].id, assignedTo: users[2].id, description: "Present enterprise package details to executive team", dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "Follow-up: GlobalFinance contract details", status: "completed", contactId: contacts[2].id, opportunityId: opportunities[1].id, accountId: accounts[1].id, assignedTo: users[1].id, description: "Sent updated terms and pricing", dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Prepare ROI analysis for HealthFirst", status: "planned", contactId: contacts[4].id, opportunityId: opportunities[2].id, accountId: accounts[2].id, assignedTo: users[2].id, description: "Calculate 3-year ROI based on their current costs", dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Check-in call - LogisticsPro legal review", status: "planned", contactId: contacts[13].id, opportunityId: opportunities[7].id, accountId: accounts[8].id, assignedTo: users[7].id, description: "Discuss contract amendment points", dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Executive demo - PharmaCure Labs", status: "planned", contactId: contacts[19].id, opportunityId: opportunities[13].id, accountId: accounts[18].id, assignedTo: users[1].id, description: "C-suite presentation and compliance walkthrough", dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) },
    { type: "note", subject: "AutoDrive Motors - competitor analysis", status: "completed", contactId: contacts[20].id, opportunityId: opportunities[14].id, accountId: accounts[16].id, assignedTo: users[1].id, description: "Customer mentioned they are also evaluating Salesforce. We need to emphasize our integration capabilities.", completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "CyberShield - Security features overview", status: "completed", contactId: contacts[17].id, opportunityId: opportunities[11].id, accountId: accounts[13].id, assignedTo: users[7].id, description: "Sent security compliance documentation", dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Update ManuCore proposal with custom integration scope", status: "planned", contactId: contacts[9].id, opportunityId: opportunities[5].id, accountId: accounts[5].id, assignedTo: users[2].id, description: "Add integration with SAP ERP to the proposal", dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Onboarding kickoff - RetailPro Inc", status: "completed", contactId: contacts[6].id, accountId: accounts[3].id, assignedTo: users[2].id, description: "Project kickoff call with implementation team", completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Quarterly business review - GlobalFinance", status: "completed", contactId: contacts[2].id, accountId: accounts[1].id, assignedTo: users[1].id, description: "Q3 review and Q4 planning discussion", completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Research BioMed compliance requirements", status: "planned", contactId: contacts[14].id, opportunityId: opportunities[8].id, accountId: accounts[9].id, assignedTo: users[4].id, description: "Review HIPAA requirements for analytics module", dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Cold outreach - EnergyForward", status: "completed", contactId: contacts[15].id, accountId: accounts[10].id, assignedTo: users[2].id, description: "Initial discovery, prospect is interested but budget needs approval", completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "FinTech Innovators - pricing proposal", status: "planned", contactId: contacts[18].id, opportunityId: opportunities[12].id, accountId: accounts[17].id, assignedTo: users[7].id, description: "Send customized pricing for starter + AI add-on", dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Product demo - TravelWorld Agency", status: "planned", contactId: contacts[24].id, opportunityId: opportunities[20].id, accountId: accounts[14].id, assignedTo: users[4].id, description: "Full platform demo focusing on reporting features", dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000) },
    { type: "call", subject: "Renewal discussion - CloudNine SaaS", status: "planned", contactId: contacts[10].id, accountId: accounts[6].id, assignedTo: users[3].id, description: "Discuss upgrade from Professional to Enterprise", dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { type: "task", subject: "Prepare migration plan for AutoDrive Motors", status: "planned", contactId: contacts[20].id, opportunityId: opportunities[28].id, accountId: accounts[16].id, assignedTo: users[2].id, description: "Create detailed data migration timeline and plan", dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { type: "note", subject: "RealEstate Plus - budget constraints", status: "completed", contactId: contacts[12].id, opportunityId: opportunities[26].id, accountId: accounts[7].id, assignedTo: users[4].id, description: "Customer has limited budget, may need phased approach", completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { type: "email", subject: "Welcome email - FoodChain Restaurants", status: "completed", contactId: contacts[22].id, accountId: accounts[15].id, assignedTo: users[2].id, description: "Sent onboarding resources and implementation schedule", completedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) },
    { type: "meeting", subject: "Strategy session - GlobalFinance Analytics", status: "planned", contactId: contacts[26].id, opportunityId: opportunities[17].id, accountId: accounts[1].id, assignedTo: users[7].id, description: "Understand BI and analytics requirements", dueDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000) },
  ]).returning();
  console.log(`  ✓ Created ${activities.length} activities`);

  // Cases
  const cases = await db.insert(casesTable).values([
    { caseNumber: "CASE-1001", subject: "Login authentication issue", description: "Users unable to log in after recent update", status: "resolved", priority: "critical", type: "Bug", origin: "phone", contactId: contacts[0].id, accountId: accounts[0].id, assignedTo: users[6].id, resolution: "Rolled back authentication middleware, applied hotfix", resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { caseNumber: "CASE-1002", subject: "Data export not working", description: "CSV export showing incorrect field mapping", status: "in_progress", priority: "high", type: "Bug", origin: "email", contactId: contacts[2].id, accountId: accounts[1].id, assignedTo: users[6].id },
    { caseNumber: "CASE-1003", subject: "Custom field configuration help", description: "Need assistance setting up custom fields for contact records", status: "new", priority: "medium", type: "Question", origin: "web", contactId: contacts[4].id, accountId: accounts[2].id, assignedTo: users[5].id },
    { caseNumber: "CASE-1004", subject: "Integration with Shopify not syncing", description: "Orders from Shopify not appearing in CRM", status: "in_progress", priority: "high", type: "Integration", origin: "phone", contactId: contacts[6].id, accountId: accounts[3].id, assignedTo: users[6].id },
    { caseNumber: "CASE-1005", subject: "Report builder crashing on large datasets", description: "Custom reports with >10k rows causing timeout", status: "pending", priority: "medium", type: "Bug", origin: "email", contactId: contacts[9].id, accountId: accounts[5].id, assignedTo: users[6].id },
    { caseNumber: "CASE-1006", subject: "Mobile app sync delay", description: "Changes made on mobile app take 30+ minutes to sync", status: "new", priority: "low", type: "Performance", origin: "web", contactId: contacts[10].id, accountId: accounts[6].id, assignedTo: users[5].id },
    { caseNumber: "CASE-1007", subject: "Billing discrepancy - overcharged", description: "Invoice for December shows incorrect user count", status: "in_progress", priority: "high", type: "Billing", origin: "phone", contactId: contacts[13].id, accountId: accounts[8].id, assignedTo: users[5].id },
    { caseNumber: "CASE-1008", subject: "Email template formatting broken", description: "HTML emails rendering incorrectly in Outlook", status: "new", priority: "medium", type: "Bug", origin: "email", contactId: contacts[16].id, accountId: accounts[11].id, assignedTo: users[6].id },
    { caseNumber: "CASE-1009", subject: "User permission setup guidance", description: "Need help configuring role-based access for new team", status: "resolved", priority: "low", type: "Question", origin: "web", contactId: contacts[7].id, accountId: accounts[3].id, assignedTo: users[5].id, resolution: "Provided documentation and 1:1 training session", resolvedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
    { caseNumber: "CASE-1010", subject: "API rate limit issue", description: "Getting 429 errors when using bulk import API", status: "closed", priority: "medium", type: "Technical", origin: "email", contactId: contacts[17].id, accountId: accounts[13].id, assignedTo: users[6].id, resolution: "Implemented exponential backoff, increased rate limit for account", resolvedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) },
    { caseNumber: "CASE-1011", subject: "Dashboard widgets not loading", description: "KPI widgets showing spinner indefinitely", status: "in_progress", priority: "high", type: "Bug", origin: "phone", contactId: contacts[19].id, accountId: accounts[18].id, assignedTo: users[6].id },
    { caseNumber: "CASE-1012", subject: "Duplicate detection not working", description: "System allowing duplicate contact emails", status: "new", priority: "medium", type: "Bug", origin: "web", contactId: contacts[20].id, accountId: accounts[16].id, assignedTo: users[5].id },
    { caseNumber: "CASE-1013", subject: "Calendar sync with Outlook", description: "Meetings not syncing to Outlook calendar", status: "pending", priority: "medium", type: "Integration", origin: "email", contactId: contacts[1].id, accountId: accounts[0].id, assignedTo: users[6].id },
    { caseNumber: "CASE-1014", subject: "Password reset emails not received", description: "Users reporting password reset emails going to spam or not arriving", status: "new", priority: "high", type: "Bug", origin: "phone", contactId: contacts[22].id, accountId: accounts[15].id, assignedTo: users[6].id },
    { caseNumber: "CASE-1015", subject: "Training request - Advanced admin features", description: "Requesting advanced training for their admin team", status: "resolved", priority: "low", type: "Training", origin: "email", contactId: contacts[14].id, accountId: accounts[9].id, assignedTo: users[5].id, resolution: "Scheduled and completed 3-session training program", resolvedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
  ]).returning();
  console.log(`  ✓ Created ${cases.length} cases`);

  // Quotes
  const quote1 = await db.insert(quotesTable).values({
    quoteNumber: "QT-1001",
    name: "Apex Technologies - Enterprise Package",
    opportunityId: opportunities[0].id,
    contactId: contacts[0].id,
    accountId: accounts[0].id,
    status: "sent",
    validUntil: new Date(now.getFullYear(), now.getMonth() + 1, 30),
    subtotal: "229000",
    discount: "10",
    tax: "0",
    total: "206100",
    notes: "10% volume discount applied. Implementation timeline: 90 days.",
  }).returning();

  await db.insert(quoteItemsTable).values([
    { quoteId: quote1[0].id, productId: products[0].id, productName: "CRMAI Enterprise Suite", quantity: "1", unitPrice: "49999", discount: "0", total: "49999" },
    { quoteId: quote1[0].id, productId: products[3].id, productName: "Implementation Services", quantity: "5", unitPrice: "15000", discount: "0", total: "75000" },
    { quoteId: quote1[0].id, productId: products[5].id, productName: "Training Package - Advanced", quantity: "3", unitPrice: "4500", discount: "0", total: "13500" },
    { quoteId: quote1[0].id, productId: products[6].id, productName: "Annual Support Plan", quantity: "3", unitPrice: "5999", discount: "0", total: "17997" },
    { quoteId: quote1[0].id, productId: products[9].id, productName: "CRMAI Add-on: Analytics", quantity: "1", unitPrice: "3999", discount: "0", total: "3999" },
    { quoteId: quote1[0].id, productId: products[10].id, productName: "CRMAI Add-on: AI Assistant", quantity: "1", unitPrice: "4999", discount: "0", total: "4999" },
  ]);

  const quote2 = await db.insert(quotesTable).values({
    quoteNumber: "QT-1002",
    name: "GlobalFinance Corp - Full Platform",
    opportunityId: opportunities[1].id,
    contactId: contacts[2].id,
    accountId: accounts[1].id,
    status: "accepted",
    validUntil: new Date(now.getFullYear(), now.getMonth() + 2, 28),
    subtotal: "580000",
    discount: "15",
    tax: "0",
    total: "493000",
    notes: "Strategic account pricing. 15% enterprise discount.",
  }).returning();

  await db.insert(quoteItemsTable).values([
    { quoteId: quote2[0].id, productId: products[0].id, productName: "CRMAI Enterprise Suite", quantity: "1", unitPrice: "49999", discount: "15", total: "42499" },
    { quoteId: quote2[0].id, productId: products[3].id, productName: "Implementation Services", quantity: "10", unitPrice: "15000", discount: "15", total: "127500" },
    { quoteId: quote2[0].id, productId: products[7].id, productName: "Data Migration Service", quantity: "1", unitPrice: "8000", discount: "0", total: "8000" },
  ]);

  const quote3 = await db.insert(quotesTable).values({
    quoteNumber: "QT-1003",
    name: "LogisticsPro - Enterprise Suite + Services",
    opportunityId: opportunities[7].id,
    contactId: contacts[13].id,
    accountId: accounts[8].id,
    status: "draft",
    validUntil: new Date(now.getFullYear(), now.getMonth() + 1, 15),
    subtotal: "412000",
    discount: "0",
    tax: "0",
    total: "412000",
    notes: "Pending final scope agreement.",
  }).returning();

  await db.insert(quoteItemsTable).values([
    { quoteId: quote3[0].id, productId: products[0].id, productName: "CRMAI Enterprise Suite", quantity: "1", unitPrice: "49999", discount: "0", total: "49999" },
    { quoteId: quote3[0].id, productId: products[8].id, productName: "Custom Integration", quantity: "2", unitPrice: "12000", discount: "0", total: "24000" },
    { quoteId: quote3[0].id, productId: products[3].id, productName: "Implementation Services", quantity: "8", unitPrice: "15000", discount: "0", total: "120000" },
  ]);

  console.log(`  ✓ Created 3 quotes`);

  console.log("\n✅ Seeding complete!");
  console.log(`   Users: ${users.length}`);
  console.log(`   Accounts: ${accounts.length}`);
  console.log(`   Contacts: ${contacts.length}`);
  console.log(`   Leads: ${leads.length}`);
  console.log(`   Opportunities: ${opportunities.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Activities: ${activities.length}`);
  console.log(`   Cases: ${cases.length}`);
  console.log(`   Quotes: 3`);

  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
