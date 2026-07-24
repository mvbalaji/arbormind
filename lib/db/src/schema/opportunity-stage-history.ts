import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { opportunitiesTable } from "./opportunities";

export const opportunityStageHistoryTable = pgTable(
  "opportunity_stage_history",
  {
    id: serial("id").primaryKey(),
    opportunityId: integer("opportunity_id")
      .notNull()
      .references(() => opportunitiesTable.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    enteredAt: timestamp("entered_at").notNull().defaultNow(),
    leftAt: timestamp("left_at"),
  },
  (t) => ({
    byOpp: index("oppstagehist_opp_idx").on(t.opportunityId),
  }),
);

export type OpportunityStageHistory = typeof opportunityStageHistoryTable.$inferSelect;
