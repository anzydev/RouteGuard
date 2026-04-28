import {
  pgTable,
  text,
  doublePrecision,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const shipmentsTable = pgTable("shipments", {
  id: text("id").primaryKey(),
  refCode: text("ref_code").notNull(),
  carrier: text("carrier").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull().default("on_track"),
  originHubId: text("origin_hub_id").notNull(),
  destinationHubId: text("destination_hub_id").notNull(),
  progressPct: doublePrecision("progress_pct").notNull().default(0),
  promisedEta: timestamp("promised_eta", { withTimezone: true }).notNull(),
  currentEta: timestamp("current_eta", { withTimezone: true }).notNull(),
  cargoType: text("cargo_type").notNull(),
  cargoValueUsd: doublePrecision("cargo_value_usd").notNull(),
  riskScore: integer("risk_score").notNull().default(0),
  riskDrivers: jsonb("risk_drivers").$type<string[]>().notNull().default([]),
  rerouted: boolean("rerouted").notNull().default(false),
  viaHubIds: jsonb("via_hub_ids").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ShipmentRow = typeof shipmentsTable.$inferSelect;
