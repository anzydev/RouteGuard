import {
  pgTable,
  text,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const disruptionsTable = pgTable("disruptions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  scenario: text("scenario"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radiusKm: doublePrecision("radius_km").notNull(),
  severity: text("severity").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expectedEndAt: timestamp("expected_end_at", { withTimezone: true }).notNull(),
  affectedHubIds: jsonb("affected_hub_ids").$type<string[]>().notNull().default([]),
  affectedLaneIds: jsonb("affected_lane_ids").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
});

export type DisruptionRow = typeof disruptionsTable.$inferSelect;
