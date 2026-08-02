import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";
import { organizationsTable } from "./organizations";

export const leadInsightsTable = pgTable("lead_insights", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
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
  // Company social media
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  facebookUrl: text("facebook_url"),
  instagramHandle: text("instagram_handle"),
  youtubeUrl: text("youtube_url"),
  // Best contact to reach
  bestContactName: text("best_contact_name"),
  bestContactTitle: text("best_contact_title"),
  bestContactEmail: text("best_contact_email"),
  emailPattern: text("email_pattern"),
  // Blog / resources
  blogUrl: text("blog_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LeadInsights = typeof leadInsightsTable.$inferSelect;
