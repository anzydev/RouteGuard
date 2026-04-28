import { pgTable, text, doublePrecision, integer } from "drizzle-orm/pg-core";

export const hubsTable = pgTable("hubs", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  type: text("type").notNull(),
  congestionScore: integer("congestion_score").notNull().default(20),
});

export type Hub = typeof hubsTable.$inferSelect;
