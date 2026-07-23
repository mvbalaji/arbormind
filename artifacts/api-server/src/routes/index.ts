import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import accountsRouter from "./accounts";
import contactsRouter from "./contacts";
import leadsRouter from "./leads";
import opportunitiesRouter from "./opportunities";
import activitiesRouter from "./activities";
import productsRouter from "./products";
import priceBooksRouter from "./price-books";
import casesRouter from "./cases";
import quotesRouter from "./quotes";
import reportsRouter from "./reports";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import enquiriesRouter from "./enquiries";
import emailsRouter from "./emails";
import campaignsRouter from "./campaigns";
import importRouter from "./import";
import seedRouter from "./seed";
import emailSettingsRouter from "./email-settings";
import ordersRouter from "./orders";
import contractsRouter from "./contracts";
import aiRouter from "./ai";
import approvalsRouter from "./approvals";
import entityNotesRouter from "./entity-notes";
import accessControlRouter from "./access-control";
import recordAccessRouter from "./record-access";
import searchRouter from "./search";
import emailSendRouter from "./email-send";
import exchangeRatesRouter from "./exchange-rates";
import websiteVisitsRouter from "./website-visits";
import appModulesRouter from "./app-modules";
import webhooksRouter from "./webhooks";
import campaignEngagementsRouter from "./campaign-engagements";
import campaignMembersRouter from "./campaign-members";
import leadScoringAdminRouter from "./lead-scoring-admin";
import productRulesRouter from "./product-rules";
import clmRouter from "./clm";
import stimsRouter from "./stims";
import productBundlesRouter from "./product-bundles";
import socialMessagesRouter from "./social-messages";
import cpqSettingsRouter from "./cpq-settings";
import quoteTeamRouter from "./quote-team";
import { seedAccessControl } from "../lib/access-control";
import { seedRecordAccess } from "../lib/record-access";
import { seedStandardPricing } from "../lib/pricing";
import { seedAppModules } from "../lib/app-modules";
import { seedDefaultScoringRules } from "../lib/lead-scoring";
import { getDefaultOrgId } from "../lib/org-context";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(organizationsRouter);
router.use(emailSettingsRouter);
router.use(enquiriesRouter);
router.use(emailsRouter);
router.use(usersRouter);
router.use(accountsRouter);
router.use(contactsRouter);
router.use(leadsRouter);
router.use(opportunitiesRouter);
router.use(activitiesRouter);
router.use(productsRouter);
router.use(priceBooksRouter);
router.use(casesRouter);
router.use(quotesRouter);
router.use(reportsRouter);
router.use(campaignsRouter);
router.use(importRouter);
router.use(seedRouter);
router.use(ordersRouter);
router.use(contractsRouter);
router.use(aiRouter);
router.use(approvalsRouter);
router.use(entityNotesRouter);
router.use(accessControlRouter);
router.use(recordAccessRouter);
router.use(searchRouter);
router.use(emailSendRouter);
router.use(exchangeRatesRouter);
router.use(websiteVisitsRouter);
router.use(appModulesRouter);
router.use(webhooksRouter);
router.use(campaignEngagementsRouter);
router.use(campaignMembersRouter);
router.use(leadScoringAdminRouter);
router.use(productRulesRouter);
router.use(clmRouter);
router.use(stimsRouter);
router.use(productBundlesRouter);
router.use(socialMessagesRouter);
router.use(cpqSettingsRouter);
router.use(quoteTeamRouter);

// Idempotent seed of roles, screens, record types, and default admin
// access on startup — scoped to the pre-multitenancy Default Organization.
// New orgs are seeded on creation via seedOrgDefaults() in routes/organizations.ts.
void (async () => {
  try {
    const defaultOrgId = await getDefaultOrgId();
    await seedAccessControl(defaultOrgId);
    await seedRecordAccess(defaultOrgId);
    await seedStandardPricing(defaultOrgId);
    await seedAppModules(defaultOrgId);
    await seedDefaultScoringRules(defaultOrgId);
  } catch (err) {
    console.error("[Migrate] default-org seed:", err);
  }
})();

// Add use_standard_price column to price_book_entries if missing
void (async () => {
  try {
    await db.execute(sql`
      ALTER TABLE price_book_entries ADD COLUMN IF NOT EXISTS use_standard_price BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("[Migrate] price_book_entries.use_standard_price column ready");
  } catch (err) {
    console.error("[Migrate] price_book_entries use_standard_price:", err);
  }
})();

// admin_settings table + CPQ seed (idempotent) — org-scoped: composite (org_id, key) PK
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_settings (
        org_id INTEGER NOT NULL DEFAULT 1,
        key TEXT NOT NULL,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (org_id, key)
      )
    `);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`);
    await db.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'admin_settings' AND constraint_type = 'PRIMARY KEY' AND constraint_name = 'admin_settings_pkey'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.key_column_usage
          WHERE table_name = 'admin_settings' AND constraint_name = 'admin_settings_pkey' AND column_name = 'org_id'
        ) THEN
          ALTER TABLE admin_settings DROP CONSTRAINT admin_settings_pkey;
          ALTER TABLE admin_settings ADD PRIMARY KEY (org_id, key);
        END IF;
      END $$
    `);
    const defaultOrgId = await getDefaultOrgId();
    await db.execute(sql`
      INSERT INTO admin_settings (org_id, key, value) VALUES (${defaultOrgId}, 'cpq_enabled', 'false')
      ON CONFLICT (org_id, key) DO NOTHING
    `);
    console.log("[Migrate] admin_settings table ready");
  } catch (err) {
    console.error("[Migrate] admin_settings:", err);
  }
})();

// Ensure product_rules table exists (idempotent migration)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'Product',
        conditions_met TEXT NOT NULL DEFAULT 'All',
        conditions TEXT NOT NULL DEFAULT '[]',
        actions TEXT NOT NULL DEFAULT '[]',
        error_message TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[Migrate] product_rules table ready");
  } catch (err) {
    console.error("[Migrate] product_rules:", err);
  }
})();

// CLM table migrations (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clm_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'MSA',
        description TEXT,
        content TEXT,
        variables TEXT NOT NULL DEFAULT '[]',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clm_reviews (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER NOT NULL,
        reviewer_id INTEGER,
        stage TEXT NOT NULL DEFAULT 'legal',
        status TEXT NOT NULL DEFAULT 'pending',
        decision TEXT,
        due_date DATE,
        decision_date DATE,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clm_signers (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        title TEXT,
        role TEXT NOT NULL DEFAULT 'signer',
        signing_order INTEGER NOT NULL DEFAULT 1,
        party TEXT NOT NULL DEFAULT 'counterparty',
        status TEXT NOT NULL DEFAULT 'pending',
        signed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clm_redlines (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER NOT NULL,
        author_id INTEGER,
        round INTEGER NOT NULL DEFAULT 1,
        section TEXT,
        original_text TEXT,
        proposed_text TEXT,
        change_type TEXT NOT NULL DEFAULT 'modification',
        party TEXT NOT NULL DEFAULT 'counterparty',
        status TEXT NOT NULL DEFAULT 'open',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clm_workflow_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        trigger_event TEXT NOT NULL,
        conditions TEXT NOT NULL DEFAULT '[]',
        actions TEXT NOT NULL DEFAULT '[]',
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clm_notification_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        event TEXT NOT NULL,
        recipients TEXT NOT NULL DEFAULT '[]',
        channels TEXT NOT NULL DEFAULT '["email"]',
        trigger_days_before INTEGER,
        message_template TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    for (const t of ["clm_templates", "clm_reviews", "clm_signers", "clm_redlines", "clm_workflow_rules", "clm_notification_rules"]) {
      await db.execute(sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`));
    }
    // Extend contracts table with CLM fields (idempotent column additions)
    const clmColumns = [
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS territory TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS business_unit TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium'`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS governing_law TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_terms TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS liability_cap_multiplier NUMERIC`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS confidentiality_period_years INTEGER`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS ip_ownership TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_notice_days INTEGER`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counterparty_company TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counterparty_signer_name TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counterparty_signer_email TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counterparty_signer_title TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counterparty_address TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_provider TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_order TEXT DEFAULT 'Sequential'`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_deadline DATE`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_status TEXT`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_decision_date DATE`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_window_days INTEGER DEFAULT 90`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS arr_at_risk NUMERIC`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS yearly_escalation_pct NUMERIC`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS minimum_annual_commit NUMERIC`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS risk_score INTEGER`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS redline_round INTEGER DEFAULT 0`,
      `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_id INTEGER`,
    ];
    for (const col of clmColumns) {
      await db.execute(sql.raw(col));
    }
    console.log("[Migrate] CLM tables and columns ready");
  } catch (err) {
    console.error("[Migrate] CLM:", err);
  }
})();

// STIMS table migrations (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_fiscal_periods (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        period_type TEXT NOT NULL DEFAULT 'monthly',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_locked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_target_cycles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        fiscal_period_id INTEGER REFERENCES stims_fiscal_periods(id) ON DELETE SET NULL,
        metric TEXT NOT NULL DEFAULT 'revenue',
        total_target NUMERIC NOT NULL DEFAULT 0,
        allocation_method TEXT NOT NULL DEFAULT 'equal',
        scope TEXT NOT NULL DEFAULT 'All',
        currency TEXT NOT NULL DEFAULT 'GBP',
        growth_pct NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        created_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_quotas (
        id SERIAL PRIMARY KEY,
        cycle_id INTEGER NOT NULL REFERENCES stims_target_cycles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        quota_amount NUMERIC NOT NULL DEFAULT 0,
        ramp_pct NUMERIC NOT NULL DEFAULT 100,
        is_new_hire BOOLEAN NOT NULL DEFAULT false,
        period_breakdowns JSONB,
        approved BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(cycle_id, user_id)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_incentive_plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'draft',
        effective_start DATE,
        effective_end DATE,
        currency TEXT NOT NULL DEFAULT 'GBP',
        base_variable_split NUMERIC NOT NULL DEFAULT 30,
        ote_amount NUMERIC NOT NULL DEFAULT 0,
        payout_frequency TEXT NOT NULL DEFAULT 'quarterly',
        threshold_pct NUMERIC NOT NULL DEFAULT 70,
        cap_pct NUMERIC,
        measure TEXT NOT NULL DEFAULT 'revenue',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_plan_tiers (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL REFERENCES stims_incentive_plans(id) ON DELETE CASCADE,
        label TEXT,
        from_pct NUMERIC NOT NULL,
        to_pct NUMERIC,
        rate_pct NUMERIC NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_plan_assignments (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL REFERENCES stims_incentive_plans(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        effective_start DATE,
        effective_end DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(plan_id, user_id)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_attainment (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        fiscal_period_id INTEGER REFERENCES stims_fiscal_periods(id) ON DELETE SET NULL,
        actual_amount NUMERIC NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'manual',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, fiscal_period_id)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_calc_runs (
        id SERIAL PRIMARY KEY,
        fiscal_period_id INTEGER REFERENCES stims_fiscal_periods(id) ON DELETE SET NULL,
        cycle_id INTEGER REFERENCES stims_target_cycles(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        total_payout NUMERIC DEFAULT 0,
        approved_by INTEGER,
        run_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_payout_lines (
        id SERIAL PRIMARY KEY,
        run_id INTEGER NOT NULL REFERENCES stims_calc_runs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        quota NUMERIC NOT NULL DEFAULT 0,
        actual NUMERIC NOT NULL DEFAULT 0,
        attainment_pct NUMERIC NOT NULL DEFAULT 0,
        gross_payout NUMERIC NOT NULL DEFAULT 0,
        adjustment NUMERIC DEFAULT 0,
        adjustment_reason TEXT,
        net_payout NUMERIC NOT NULL DEFAULT 0,
        breakdown TEXT,
        exception_note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_disputes (
        id SERIAL PRIMARY KEY,
        payout_line_id INTEGER REFERENCES stims_payout_lines(id) ON DELETE SET NULL,
        user_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        resolution TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stims_ramp_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        months_schedule JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    for (const t of [
      "stims_fiscal_periods", "stims_target_cycles", "stims_quotas", "stims_incentive_plans",
      "stims_plan_tiers", "stims_plan_assignments", "stims_attainment", "stims_calc_runs",
      "stims_payout_lines", "stims_disputes", "stims_ramp_templates",
    ]) {
      await db.execute(sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`));
    }
    console.log("[Migrate] STIMS tables ready");
  } catch (err) {
    console.error("[Migrate] STIMS:", err);
  }
})();

// Product Bundles migration (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_bundles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        bundle_discount_pct NUMERIC NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_bundle_items (
        id SERIAL PRIMARY KEY,
        bundle_id INTEGER NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity NUMERIC NOT NULL DEFAULT 1,
        unit_price_override NUMERIC,
        discount_pct NUMERIC NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE product_bundles ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`);
    await db.execute(sql`ALTER TABLE product_bundle_items ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`);
    console.log("[Migrate] product_bundles tables ready");
  } catch (err) {
    console.error("[Migrate] product_bundles:", err);
  }
})();

// Margin fields migration (idempotent)
void (async () => {
  try {
    await db.execute(sql.raw(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC`));
    await db.execute(sql.raw(`ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_unit_of_measure TEXT`));
    await db.execute(sql.raw(`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC`));
    await db.execute(sql.raw(`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS margin_pct NUMERIC`));
    console.log("[Migrate] margin fields ready");
  } catch (err) {
    console.error("[Migrate] margin fields:", err);
  }
})();

// Social messages table migration (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS social_messages (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
        sent_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        platform TEXT NOT NULL,
        direction TEXT NOT NULL,
        content TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT,
        sender_name TEXT,
        sender_handle TEXT,
        sender_avatar_url TEXT,
        platform_message_id TEXT,
        platform_thread_id TEXT,
        platform_profile_url TEXT,
        status TEXT NOT NULL DEFAULT 'sent',
        is_read BOOLEAN NOT NULL DEFAULT false,
        delivered_at TIMESTAMP,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sm_lead_id_idx ON social_messages(lead_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sm_platform_idx ON social_messages(platform)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sm_created_at_idx ON social_messages(created_at)`);
    console.log("[Migrate] social_messages table ready");
  } catch (err) {
    console.error("[Migrate] social_messages:", err);
  }
})();

// Quote attachments migration (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_attachments (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        file_type TEXT NOT NULL DEFAULT '',
        file_data TEXT NOT NULL,
        uploaded_by_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS qa_quote_id_idx ON quote_attachments(quote_id)`);
    await db.execute(sql`ALTER TABLE quote_attachments ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`);
    console.log("[Migrate] quote_attachments table ready");
  } catch (err) {
    console.error("[Migrate] quote_attachments:", err);
  }
})();

// Add bundle_id / bundle_name columns to quote_items (idempotent)
void (async () => {
  try {
    await db.execute(sql`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS bundle_id INTEGER`);
    await db.execute(sql`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS bundle_name TEXT`);
    console.log("[Migrate] quote_items bundle columns ready");
  } catch (err) {
    console.error("[Migrate] quote_items bundle columns:", err);
  }
})();

// Lead attachments migration
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_attachments (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        file_type TEXT NOT NULL DEFAULT '',
        file_data TEXT NOT NULL,
        uploaded_by_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS la_lead_id_idx ON lead_attachments(lead_id)`);
    await db.execute(sql`ALTER TABLE lead_attachments ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`);
    console.log("[Migrate] lead_attachments table ready");
  } catch (err) {
    console.error("[Migrate] lead_attachments:", err);
  }
})();

// Quote team members migration (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_team_members (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'Team Member',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(quote_id, user_id)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS qtm_quote_id_idx ON quote_team_members(quote_id)`);
    console.log("[Migrate] quote_team_members table ready");
  } catch (err) {
    console.error("[Migrate] quote_team_members:", err);
  }
})();

// Opportunity attachments migration
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS opportunity_attachments (
        id SERIAL PRIMARY KEY,
        opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        file_type TEXT NOT NULL DEFAULT '',
        file_data TEXT NOT NULL,
        uploaded_by_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS oa_opp_id_idx ON opportunity_attachments(opportunity_id)`);
    await db.execute(sql`ALTER TABLE opportunity_attachments ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`);
    console.log("[Migrate] opportunity_attachments table ready");
  } catch (err) {
    console.error("[Migrate] opportunity_attachments:", err);
  }
})();

export default router;
