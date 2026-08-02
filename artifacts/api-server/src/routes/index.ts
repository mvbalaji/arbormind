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
import quoteWorkflowRulesRouter from "./quote-workflow-rules";
import quoteStagesAdminRouter from "./quote-stages-admin";
import integrationsRouter from "./integrations";
import integrationWebhooksRouter from "./integration-webhooks";
import integrationWebToLeadRouter from "./integration-web-to-lead";
import webToLeadRouter from "./web-to-lead";
import webLeadSlaRouter from "./web-lead-sla";
import { seedAccessControl } from "../lib/access-control";
import { seedRecordAccess } from "../lib/record-access";
import { seedStandardPricing } from "../lib/pricing";
import { seedAppModules } from "../lib/app-modules";
import { seedDefaultScoringRules } from "../lib/lead-scoring";
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
router.use(quoteWorkflowRulesRouter);
router.use(quoteStagesAdminRouter);
router.use(integrationsRouter);
router.use(integrationWebhooksRouter);
router.use(integrationWebToLeadRouter);
router.use(webToLeadRouter);
router.use(webLeadSlaRouter);

// Idempotent seed of roles, screens, record types, and default admin
// access on startup.
void seedAccessControl();
void seedRecordAccess();
void seedStandardPricing();
void seedAppModules();
void seedDefaultScoringRules();

// app_modules table — recreate with correct schema matching Drizzle (key as PK, no id column)
void (async () => {
  try {
    // Drop old table if it has the wrong schema (id SERIAL PK instead of key TEXT PK)
    await db.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'app_modules' AND column_name = 'id'
        ) THEN
          DROP TABLE app_modules;
        END IF;
      END $$
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app_modules (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_core BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 100,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Seed default modules
    await db.execute(sql`
      INSERT INTO app_modules (key, label, description, is_enabled, is_core, sort_order) VALUES
        ('crm_sales',  'CRM Sales',                  'Core CRM features: Leads, Contacts, Accounts, Opportunities, Activities, Campaigns, Reports and AI Assistant. Always active.',                                      TRUE,  TRUE,  10),
        ('quotes',     'Quote Management',            'Create, configure and send pricing quotes. Includes approval workflows and PDF generation.',                                                                         TRUE,  FALSE, 20),
        ('orders',     'Order Management',            'Track customer orders from placement to fulfilment. Syncs with Quotes and Opportunities.',                                                                           TRUE,  FALSE, 30),
        ('contracts',  'Contract Management',         'Full contract lifecycle management — Draft, Under Review, Active, Expired and Terminated. Enabling this module activates the complete lifecycle workflow.',          TRUE,  FALSE, 40),
        ('cpq',        'CPQ (Configure-Price-Quote)', 'Advanced guided selling, product configurator, quote line editor, pricing rules and CPQ dashboard. Enable for customers who need Salesforce-style CPQ workflows.',  FALSE, FALSE, 50)
      ON CONFLICT (key) DO NOTHING
    `);
    console.log("[Migrate] app_modules table ready");
  } catch (err) {
    console.error("[Migrate] app_modules:", err);
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

// admin_settings table + CPQ seed (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      INSERT INTO admin_settings (key, value) VALUES ('cpq_enabled', 'false')
      ON CONFLICT (key) DO NOTHING
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
    console.log("[Migrate] opportunity_attachments table ready");
  } catch (err) {
    console.error("[Migrate] opportunity_attachments:", err);
  }
})();

// Quote stage history migration (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_stage_history (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        stage TEXT NOT NULL,
        entered_at TIMESTAMP NOT NULL DEFAULT NOW(),
        left_at TIMESTAMP
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS qsh_quote_id_idx ON quote_stage_history(quote_id)`);
    console.log("[Migrate] quote_stage_history table ready");
  } catch (err) {
    console.error("[Migrate] quote_stage_history:", err);
  }
})();

// Lead stage history migration (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_stage_history (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        stage TEXT NOT NULL,
        entered_at TIMESTAMP NOT NULL DEFAULT NOW(),
        left_at TIMESTAMP
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS lsh_lead_id_idx ON lead_stage_history(lead_id)`);
    console.log("[Migrate] lead_stage_history table ready");
  } catch (err) {
    console.error("[Migrate] lead_stage_history:", err);
  }
})();

// Quote workflow rules table (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_workflow_rules (
        id SERIAL PRIMARY KEY,
        stage TEXT NOT NULL,
        rule_type TEXT NOT NULL CHECK (rule_type IN ('activity','approval')),
        activity_type TEXT,
        activity_title TEXT,
        activity_due_days INTEGER DEFAULT 1,
        assign_to_role TEXT,
        assign_to_user_id INTEGER,
        approval_required BOOLEAN DEFAULT FALSE,
        approval_email_subject TEXT,
        approval_email_body TEXT,
        approver_role TEXT,
        approver_user_id INTEGER,
        advance_to_stage TEXT,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS qwr_stage_idx ON quote_workflow_rules(stage)`);
    console.log("[Migrate] quote_workflow_rules table ready");
  } catch (err) { console.error("[Migrate] quote_workflow_rules:", err); }
})();

// contract_documents.is_active — marks the current version of a contract document
void (async () => {
  try {
    await db.execute(sql`ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    console.log("[Migrate] contract_documents.is_active column ready");
  } catch (err) {
    console.error("[Migrate] contract_documents.is_active:", err);
  }
})();

// Add rejection_reason column to quotes table (idempotent)
void (async () => {
  try {
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    console.log("[Migrate] quotes.rejection_reason column ready");
  } catch (err) {
    console.error("[Migrate] quotes.rejection_reason:", err);
  }
})();

// Quote stage config table — dynamic stage management
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_stage_config (
        id SERIAL PRIMARY KEY,
        stage_id TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL DEFAULT 100,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Seed default system stages (idempotent)
    await db.execute(sql`
      INSERT INTO quote_stage_config (stage_id, label, description, position, is_active, is_system) VALUES
        ('draft',        'Draft',        'Initial draft, not yet submitted',  10,  TRUE, TRUE),
        ('needs_review', 'Needs Review', 'Submitted for internal review',     20,  TRUE, TRUE),
        ('in_review',   'In Review',    'Being reviewed by manager',          30,  TRUE, TRUE),
        ('approved',    'Approved',     'Internally approved',                40,  TRUE, TRUE),
        ('presented',   'Presented',    'Sent to customer',                   50,  TRUE, TRUE),
        ('accepted',    'Accepted',     'Customer accepted',                  60,  TRUE, TRUE),
        ('rejected',    'Rejected',     'Customer rejected',                  70,  TRUE, TRUE)
      ON CONFLICT (stage_id) DO NOTHING
    `);
    console.log("[Migrate] quote_stage_config table ready");
  } catch (err) {
    console.error("[Migrate] quote_stage_config:", err);
  }
})();

// Integration Framework tables (idempotent) — partner profiles, versioned
// mapping templates, run log, audit log.
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_partners (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        webhook_secret_encrypted TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_mapping_templates (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL REFERENCES integration_partners(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        definition JSONB NOT NULL,
        created_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        activated_at TIMESTAMP
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS imt_partner_entity_idx ON integration_mapping_templates(partner_id, entity_type)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_run_log (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER REFERENCES integration_partners(id) ON DELETE SET NULL,
        template_id INTEGER,
        entity_type TEXT NOT NULL,
        status TEXT NOT NULL,
        request_payload JSONB,
        mapped_output JSONB,
        errors JSONB,
        crm_entity_id INTEGER,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        correlation_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS irl_partner_idx ON integration_run_log(partner_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS irl_created_at_idx ON integration_run_log(created_at)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_audit_log (
        id SERIAL PRIMARY KEY,
        actor_id INTEGER,
        actor_name TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        before_state JSONB,
        after_state JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE integration_partners ADD COLUMN IF NOT EXISTS allow_public_form BOOLEAN NOT NULL DEFAULT FALSE`);
    console.log("[Migrate] integration framework tables ready");
  } catch (err) {
    console.error("[Migrate] integration framework:", err);
  }
})();

// Web-to-Lead SLA config table (idempotent)
void (async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS web_lead_sla_config (
        id SERIAL PRIMARY KEY,
        region TEXT NOT NULL DEFAULT 'Global',
        task_name TEXT NOT NULL,
        sla_hours NUMERIC NOT NULL DEFAULT 24,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Seed default SLA tasks for each region (idempotent)
    await db.execute(sql`
      INSERT INTO web_lead_sla_config (region, task_name, sla_hours, description, sort_order) VALUES
        ('Global',          'Initial outreach call',         1,   'Call the lead within 1 hour of submission. Introduce Arbormind and understand their immediate needs. SLA: 1 hour.', 10),
        ('Global',          'Send introductory email',        4,   'Send a personalised intro email with company overview and relevant case studies. SLA: 4 hours.', 20),
        ('Global',          'Qualification call',             24,  'Conduct a structured qualification call (BANT/MEDDIC). Assess budget, authority, need and timeline. SLA: 24 hours.', 30),
        ('Global',          'Product demo / discovery meeting',72, 'Schedule and run a product demonstration tailored to their service interest. SLA: 3 business days.', 40),
        ('Global',          'Proposal & follow-up',           168, 'Send a formal proposal and follow up to confirm receipt and address any questions. SLA: 7 days.', 50),
        ('India',           'Initial outreach call',          2,   'Call the lead within 2 hours (IST business hours). SLA: 2 hours.', 10),
        ('India',           'Send introductory email',        8,   'Send personalised intro email in English. SLA: 8 hours.', 20),
        ('India',           'Qualification call',             48,  'Conduct qualification call. SLA: 2 business days.', 30),
        ('India',           'Product demo / discovery meeting',120,'Schedule a product demo. SLA: 5 business days.', 40),
        ('India',           'Proposal & follow-up',           240, 'Send formal proposal and follow up. SLA: 10 days.', 50),
        ('United Kingdom',  'Initial outreach call',          1,   'Call the lead within 1 hour (GMT/BST business hours). SLA: 1 hour.', 10),
        ('United Kingdom',  'Send introductory email',        4,   'Send a tailored intro email highlighting UK case studies. SLA: 4 hours.', 20),
        ('United Kingdom',  'Qualification call',             24,  'Conduct qualification call. SLA: 24 hours.', 30),
        ('United Kingdom',  'Product demo / discovery meeting',72, 'Schedule and run product demo. SLA: 3 business days.', 40),
        ('United Kingdom',  'Proposal & follow-up',           120, 'Send formal proposal and follow up. SLA: 5 days.', 50)
      ON CONFLICT DO NOTHING
    `);
    console.log("[Migrate] web_lead_sla_config table ready");
  } catch (err) {
    console.error("[Migrate] web_lead_sla_config:", err);
  }
})();

// Multi-tenancy backfill: add org_id to the handful of tables that predate the
// org_id migration and are managed via raw SQL (no Drizzle schema). DEFAULT 1
// is safe — every existing row today belongs to the single "Default
// Organization" tenant.
void (async () => {
  const tables = [
    "cpq_settings_audit",
    "integration_audit_log",
    "integration_mapping_templates",
    "integration_partners",
    "integration_run_log",
    "lead_stage_history",
    "quote_stage_config",
    "quote_stage_history",
    "quote_workflow_rules",
    "web_lead_sla_config",
    "clm_templates",
    "clm_reviews",
    "clm_signers",
    "clm_redlines",
    "clm_workflow_rules",
    "clm_notification_rules",
    "stims_fiscal_periods",
    "stims_target_cycles",
    "stims_quotas",
    "stims_incentive_plans",
    "stims_plan_tiers",
    "stims_plan_assignments",
    "stims_attainment",
    "stims_calc_runs",
    "stims_payout_lines",
    "stims_disputes",
    "stims_ramp_templates",
    "product_bundles",
    "product_bundle_items",
    "social_messages",
  ];
  for (const table of tables) {
    try {
      await db.execute(sql.raw(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id)`,
      ));
      console.log(`[Migrate] ${table}.org_id column ready`);
    } catch (err) {
      console.error(`[Migrate] ${table}.org_id:`, err);
    }
  }
})();

// Multi-tenancy: widen unique constraints that were global-only so each org
// can have its own independent values instead of colliding with other tenants.
void (async () => {
  try {
    await db.execute(sql`DROP INDEX IF EXISTS approval_roles_name_idx`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS approval_roles_name_idx ON approval_roles (org_id, name)`);

    await db.execute(sql`DROP INDEX IF EXISTS approval_configs_entity_idx`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS approval_configs_entity_idx ON approval_configs (org_id, entity)`);

    await db.execute(sql`ALTER TABLE lead_scoring_rules DROP CONSTRAINT IF EXISTS lead_scoring_rules_key_key`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS lead_scoring_rules_org_key_unique ON lead_scoring_rules (org_id, key)`);

    await db.execute(sql`DROP INDEX IF EXISTS emails_message_uid_unique`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS emails_message_uid_unique ON emails (org_id, message_uid)`);

    await db.execute(sql`DROP INDEX IF EXISTS price_books_single_standard_unique`);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS price_books_single_standard_unique
      ON price_books (org_id, is_standard) WHERE is_standard = true
    `);

    await db.execute(sql`ALTER TABLE quote_stage_config DROP CONSTRAINT IF EXISTS quote_stage_config_stage_id_key`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS quote_stage_config_org_stage_unique ON quote_stage_config (org_id, stage_id)`);

    // Human-readable sequence numbers (QT-####, CNTR-####, CASE-####, ORD-####)
    // were globally unique — each org generates its own sequence independently
    // (see quotes.ts/contracts.ts/cases.ts/orders.ts), so two orgs' first quote
    // both being "QT-0001" must not collide.
    await db.execute(sql`ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_quote_number_key`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS quotes_org_quote_number_unique ON quotes (org_id, quote_number)`);
    await db.execute(sql`ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_contract_number_key`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS contracts_org_contract_number_unique ON contracts (org_id, contract_number)`);
    await db.execute(sql`ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_case_number_key`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS cases_org_case_number_unique ON cases (org_id, case_number)`);
    await db.execute(sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_key`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_org_order_number_unique ON orders (org_id, order_number)`);
    console.log("[Migrate] per-org unique constraints ready");
  } catch (err) {
    console.error("[Migrate] per-org unique constraints:", err);
  }
})();

// Row-Level Security (RLS): the hard backstop for tenant isolation, enforced by
// Postgres itself independent of whether application code remembered to filter
// by org_id. `neondb_owner` (used by `db`/`pool` outside a request — migrations,
// the seed script, background jobs) is the table owner and bypasses RLS by
// design; only the non-owner `app_runtime` role is actually subject to these
// policies (see lib/db's runtimePool + app.ts's per-request connection-leasing
// middleware, which sets `app.current_org_id` on the leased connection).
//
// `current_setting(..., true)` (missing_ok=true) returns NULL, not an error,
// when the session var isn't set — `org_id = NULL` is never true, so a query
// that somehow runs without it set simply sees zero rows (fail closed).
//
// Excluded on purpose: `organizations` (the tenant registry itself — has no
// org_id of its own), and `screens` / `roles` / `record_types` / `app_modules`
// (carry an org_id column for DB-schema accuracy only — the app treats them as
// shared global config, not per-tenant data; see the comments in
// access-control.ts / record-access.ts / app-modules.ts).
void (async () => {
  const tenantTables = [
    "access_audit_log", "accounts", "activities", "allowed_users",
    "approval_requests", "approval_audit_events", "approval_roles", "approval_configs", "approval_criteria",
    "campaign_engagements", "campaign_members", "campaigns", "cases", "contacts",
    "contracts", "contract_line_items", "contract_documents",
    "email_settings", "email_attachments", "email_tracking", "emails",
    "enquiries", "entity_notes",
    "lead_contacts", "lead_insights", "lead_score_milestones", "lead_scoring_rules", "leads", "lead_stage_history",
    "opportunities", "opportunity_items", "opportunity_stage_history",
    "orders", "order_items",
    "price_book_entries", "price_books",
    "product_rules", "products", "product_bundles", "product_bundle_items",
    "quote_team_members", "quotes", "quote_items", "quote_stage_config", "quote_stage_history", "quote_workflow_rules",
    "record_access", "record_access_audit_log",
    "screen_access", "social_messages", "users", "website_visits",
    "cpq_settings_audit",
    "integration_audit_log", "integration_mapping_templates", "integration_partners", "integration_run_log",
    "web_lead_sla_config",
    "clm_templates", "clm_reviews", "clm_signers", "clm_redlines", "clm_workflow_rules", "clm_notification_rules",
    "stims_fiscal_periods", "stims_target_cycles", "stims_quotas", "stims_incentive_plans",
    "stims_plan_tiers", "stims_plan_assignments", "stims_attainment", "stims_calc_runs",
    "stims_payout_lines", "stims_disputes", "stims_ramp_templates",
  ];
  let ready = 0;
  for (const table of tenantTables) {
    try {
      await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
      await db.execute(sql.raw(`
        DO $pol$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'tenant_isolation') THEN
            CREATE POLICY tenant_isolation ON ${table}
              USING (org_id = current_setting('app.current_org_id', true)::int)
              WITH CHECK (org_id = current_setting('app.current_org_id', true)::int);
          END IF;
        END $pol$;
      `));
      ready++;
    } catch (err) {
      console.error(`[Migrate] RLS policy for ${table}:`, err);
    }
  }
  console.log(`[Migrate] RLS policies ready for ${ready}/${tenantTables.length} tenant tables`);
})();

// Grants for the app_runtime role itself (idempotent — safe to re-run every
// boot). Table owner and DDL rights stay with neondb_owner; app_runtime only
// gets ordinary row-level DML, which is exactly what RLS policies above then
// constrain per-tenant. ALTER DEFAULT PRIVILEGES covers tables/sequences
// created by neondb_owner *after* this runs too, not just the ones that exist
// right now.
void (async () => {
  if (!process.env.APP_DATABASE_URL) {
    console.log("[Migrate] APP_DATABASE_URL not set — skipping app_runtime role setup");
    return;
  }
  try {
    const appRuntimeUrl = new URL(process.env.APP_DATABASE_URL);
    const roleName = decodeURIComponent(appRuntimeUrl.username) || "app_runtime";
    const rolePassword = decodeURIComponent(appRuntimeUrl.password);

    const [{ exists }] = (await db.execute(
      sql`SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${roleName}) AS exists`,
    )).rows as unknown as { exists: boolean }[];

    if (!exists) {
      await db.execute(sql.raw(`CREATE ROLE ${roleName} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`));
    }
    if (rolePassword) {
      // Escape single quotes for the literal password in this DDL statement — pg
      // doesn't support bind params inside ALTER ROLE ... PASSWORD.
      await db.execute(sql.raw(`ALTER ROLE ${roleName} WITH PASSWORD '${rolePassword.replace(/'/g, "''")}'`));
    }

    await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${roleName}`));
    await db.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleName}`));
    await db.execute(sql.raw(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleName}`));
    await db.execute(sql.raw(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName}`));
    await db.execute(sql.raw(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${roleName}`));

    console.log(`[Migrate] ${roleName} role ready (login, no bypass-RLS, granted DML on all current + future tables)`);
  } catch (err) {
    console.error("[Migrate] app_runtime role setup:", err);
  }
})();

export default router;
