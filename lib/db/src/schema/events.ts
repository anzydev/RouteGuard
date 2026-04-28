import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const feedEventsTable = pgTable("feed_events", {
  id: text("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  kind: text("kind").notNull(),
  severity: text("severity").notNull(),
  headline: text("headline").notNull(),
  body: text("body").notNull(),
  relatedShipmentId: text("related_shipment_id"),
});

export type FeedEventRow = typeof feedEventsTable.$inferSelect;
