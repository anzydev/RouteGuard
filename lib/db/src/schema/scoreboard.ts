import { pgTable, text, integer, doublePrecision } from "drizzle-orm/pg-core";

export const scoreboardTable = pgTable("scoreboard", {
  id: text("id").primaryKey().default("singleton"),
  score: integer("score").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  savedDollarsToday: doublePrecision("saved_dollars_today").notNull().default(0),
  reroutesAcceptedToday: integer("reroutes_accepted_today").notNull().default(0),
});

export type ScoreboardRow = typeof scoreboardTable.$inferSelect;
