import { pgTable, text, doublePrecision, boolean } from "drizzle-orm/pg-core";

export const lanesTable = pgTable("lanes", {
  id: text("id").primaryKey(),
  originHubId: text("origin_hub_id").notNull(),
  destinationHubId: text("destination_hub_id").notNull(),
  mode: text("mode").notNull(),
  baselineHours: doublePrecision("baseline_hours").notNull(),
  riskMultiplier: doublePrecision("risk_multiplier").notNull().default(1),
  active: boolean("active").notNull().default(true),
});

export type Lane = typeof lanesTable.$inferSelect;
