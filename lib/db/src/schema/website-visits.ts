import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const websiteVisitsTable = pgTable(
  "website_visits",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().default(1),
    // Anonymous visitor id generated client-side and persisted in the
    // browser so repeat page views can be attributed to the same visitor.
    sessionId: text("session_id"),
    // Page that was viewed (pathname, e.g. "/" or "/pricing").
    path: text("path"),
    // document.referrer of the visit (empty for direct traffic).
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    // UTM attribution — passed via query string from campaign links.
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    // Optional FK to the campaign that drove this visit.
    campaignId: integer("campaign_id"),
    visitedAt: timestamp("visited_at").notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index("website_visits_session_id_idx").on(table.sessionId),
    visitedAtIdx: index("website_visits_visited_at_idx").on(table.visitedAt),
  }),
);

// ipAddress + userAgent are derived server-side from the request, so they are
// omitted from the client-facing insert schema.
export const insertWebsiteVisitSchema = createInsertSchema(websiteVisitsTable).omit({
  id: true,
  visitedAt: true,
  ipAddress: true,
  userAgent: true,
});
export type InsertWebsiteVisit = z.infer<typeof insertWebsiteVisitSchema>;
export type WebsiteVisit = typeof websiteVisitsTable.$inferSelect;
