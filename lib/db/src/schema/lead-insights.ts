import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";

export const leadInsightsTable = pgTable("lead_insights", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  companySize: text("company_size"),
  industrySegment: text("industry_segment"),
  productSummary: text("product_summary"),
  recentNews: text("recent_news"),
  hiringTrend: text("hiring_trend"),
  techStack: text("tech_stack"),
  socialPresence: text("social_presence"),
  sentiment: text("sentiment"),
  growthIndicators: text("growth_indicators").array(),
  buyingIntentSignals: text("buying_intent_signals").array(),
  aiScoreBoost: integer("ai_score_boost").notNull().default(0),
  buyerClassification: text("buyer_classification").notNull().default("medium_potential"),
  confidence: text("confidence").notNull().default("low"),
  rawInsights: jsonb("raw_insights"),
  analysisSummary: text("analysis_summary"),
  // Leadership
  ceoName: text("ceo_name"),
  ceoTitle: text("ceo_title"),
  ceoLinkedin: text("ceo_linkedin"),
  // Market intelligence
  headquarters: text("headquarters"),
  foundedYear: text("founded_year"),
  estimatedMarketValue: text("estimated_market_value"),
  fundingStage: text("funding_stage"),
  keyCompetitors: text("key_competitors").array(),
  recentAchievements: text("recent_achievements").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LeadInsights = typeof leadInsightsTable.$inferSelect;
