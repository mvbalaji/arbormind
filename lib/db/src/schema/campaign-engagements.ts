import { pgTable, serial, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";
import { leadsTable } from "./leads";
import { contactsTable } from "./contacts";
import { organizationsTable } from "./organizations";

// Platforms supported for tracking
export type EngagementPlatform =
  | "linkedin" | "instagram" | "facebook" | "telegram" | "whatsapp" | "website" | "other";

// All event types we can capture
export type EngagementEventType =
  | "ad_impression" | "view" | "story_view" | "profile_visit"
  | "reaction" | "link_click" | "comment" | "share"
  | "message" | "form_submit" | "page_view" | "button_click";

// Interest classification derived from score
export type InterestCategory = "cold" | "warm" | "hot";

// Engagement score per event type (higher = more intent)
export const EVENT_SCORES: Record<EngagementEventType, number> = {
  ad_impression: 1,
  view: 2,
  story_view: 2,
  profile_visit: 3,
  reaction: 4,
  link_click: 5,
  page_view: 5,
  button_click: 6,
  comment: 8,
  share: 8,
  message: 15,
  form_submit: 20,
};

export function scoreToCategory(score: number): InterestCategory {
  if (score >= 15) return "hot";
  if (score >= 5) return "warm";
  return "cold";
}

export const campaignEngagementsTable = pgTable(
  "campaign_engagements",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),

    // Campaign attribution (nullable — some events may come in before campaign is linked)
    campaignId: integer("campaign_id").references(() => campaignsTable.id, { onDelete: "set null" }),

    // Which platform generated the event
    platform: text("platform").notNull(), // EngagementPlatform

    // What kind of engagement
    eventType: text("event_type").notNull(), // EngagementEventType

    // How much intent this event signals (1-20)
    engagementScore: integer("engagement_score").notNull().default(1),

    // Derived classification
    interestCategory: text("interest_category").notNull().default("cold"), // InterestCategory

    // CRM identity links (populated when we can match the person)
    leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
    contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),

    // Platform identity (from webhooks — may not map to a CRM record yet)
    platformUserId: text("platform_user_id"),
    platformUserName: text("platform_user_name"),
    platformUserEmail: text("platform_user_email"),
    platformUserPhone: text("platform_user_phone"),

    // Anonymous identity fallback (UTM session, IP hash, etc.)
    anonymousId: text("anonymous_id"),

    // UTM attribution
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),

    // Structured context
    metadata: jsonb("metadata"),

    // Raw platform payload for debugging / replay
    rawPayload: jsonb("raw_payload"),

    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index("ce_campaign_id_idx").on(table.campaignId),
    platformIdx: index("ce_platform_idx").on(table.platform),
    leadIdIdx: index("ce_lead_id_idx").on(table.leadId),
    occurredAtIdx: index("ce_occurred_at_idx").on(table.occurredAt),
  }),
);

export const insertCampaignEngagementSchema = createInsertSchema(campaignEngagementsTable).omit({
  id: true, createdAt: true,
});
export type InsertCampaignEngagement = z.infer<typeof insertCampaignEngagementSchema>;
export type CampaignEngagement = typeof campaignEngagementsTable.$inferSelect;
