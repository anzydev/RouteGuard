/**
 * Seed generation for both database-backed and in-memory demo mode.
 */
import { db } from "@workspace/db";
import {
  hubsTable,
  lanesTable,
  shipmentsTable,
  feedEventsTable,
  scoreboardTable,
  type Hub,
  type Lane,
  type ShipmentRow,
  type FeedEventRow,
  type ScoreboardRow,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { SEED_HUBS, SEED_LANES } from "./network";
import { logger } from "./logger";
import { randomUUID } from "node:crypto";

const CARGO_TYPES = [
  "Consumer Electronics",
  "Auto Parts",
  "Pharmaceuticals",
  "Apparel & Textiles",
  "Industrial Machinery",
  "Frozen Seafood",
  "Lithium Cells",
  "Solar Panels",
  "Specialty Chemicals",
  "Medical Devices",
  "Coffee Beans",
  "Wine & Spirits",
  "Aerospace Components",
  "Smartphones",
  "Furniture",
] as const;

const CARRIERS = [
  "Maersk",
  "MSC",
  "CMA CGM",
  "Hapag-Lloyd",
  "ONE Network",
  "Evergreen",
  "COSCO",
  "ZIM",
  "FedEx Air",
  "DHL Cargo",
] as const;

export interface SeedState {
  hubs: Hub[];
  lanes: Lane[];
  shipments: ShipmentRow[];
  feedEvents: FeedEventRow[];
  scoreboard: ScoreboardRow;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickCongestion(code: string): number {
  const hot: Record<string, number> = {
    LAX: 55,
    SHA: 48,
    SZX: 45,
    RTM: 38,
    SGP: 30,
    HKG: 35,
    PUS: 28,
    NYC: 33,
    HAM: 30,
  };
  return hot[code] ?? randInt(8, 25);
}

export function createSeedState(): SeedState {
  const now = Date.now();

  const hubs: Hub[] = SEED_HUBS.map((h) => ({
    id: h.id,
    code: h.code,
    name: h.name,
    country: h.country,
    lat: h.lat,
    lng: h.lng,
    type: h.type,
    congestionScore: pickCongestion(h.code),
  }));

  const lanes: Lane[] = SEED_LANES.map((l) => ({
    id: l.id,
    originHubId: l.originHubId,
    destinationHubId: l.destinationHubId,
    mode: l.mode,
    baselineHours: l.baselineHours,
    riskMultiplier: 1,
    active: true,
  }));

  const seaLanes = SEED_LANES.filter((l) => l.mode === "sea");
  const shipments: ShipmentRow[] = [];
  for (let i = 0; i < 220; i++) {
    const lane = pick(seaLanes);
    const progressPct = rand(2, 95);
    const baselineMs = lane.baselineHours * 3_600_000;
    const remainingMs = baselineMs * (1 - progressPct / 100);
    const promisedEta = new Date(now + remainingMs + rand(-12, 24) * 3_600_000);
    const currentEta = new Date(promisedEta.getTime() + rand(-6, 12) * 3_600_000);
    const createdAt = new Date(
      now - baselineMs * (progressPct / 100) - rand(6, 72) * 3_600_000,
    );

    shipments.push({
      id: `s_${randomUUID().slice(0, 12)}`,
      refCode: `${pick(CARRIERS).split(" ")[0].toUpperCase().slice(0, 3)}-${randInt(10000, 99999)}`,
      carrier: pick(CARRIERS),
      mode: lane.mode,
      status: "on_track",
      originHubId: lane.originHubId,
      destinationHubId: lane.destinationHubId,
      progressPct,
      promisedEta,
      currentEta,
      cargoType: pick(CARGO_TYPES),
      cargoValueUsd: Math.round(rand(50_000, 4_500_000)),
      riskScore: 0,
      riskDrivers: [],
      rerouted: false,
      viaHubIds: [],
      createdAt,
    });
  }

  const feedEvents: FeedEventRow[] = [
    {
      id: `e_${randomUUID().slice(0, 12)}`,
      at: new Date(now - 20 * 60_000),
      kind: "info",
      severity: "info",
      headline: "TRANSIT ONLINE",
      body: "Network telemetry feeds connected. 220 active shipments under watch across 6 regions.",
      relatedShipmentId: null,
    },
    {
      id: `e_${randomUUID().slice(0, 12)}`,
      at: new Date(now - 10 * 60_000),
      kind: "info",
      severity: "info",
      headline: "Baseline established",
      body: "All sea lanes nominal. No active disruptions. Standby for live signal.",
      relatedShipmentId: null,
    },
  ];

  const scoreboard: ScoreboardRow = {
    id: "singleton",
    score: 0,
    streak: 0,
    savedDollarsToday: 0,
    reroutesAcceptedToday: 0,
  };

  return { hubs, lanes, shipments, feedEvents, scoreboard };
}

export async function seedDatabaseIfEmpty(): Promise<void> {
  if (!db) {
    throw new Error("Database is not configured");
  }

  const [{ count: hubCount }] = (await db.execute(
    sql`SELECT COUNT(*)::int AS count FROM hubs`,
  )).rows as Array<{ count: number }>;

  if (hubCount > 0) {
    logger.info({ hubCount }, "Seed skipped — hubs already populated");
    return;
  }

  logger.info("Seeding network — hubs, lanes, shipments");
  const seed = createSeedState();

  await db.insert(hubsTable).values(seed.hubs);
  await db.insert(lanesTable).values(seed.lanes);
  await db.insert(shipmentsTable).values(seed.shipments);
  await db.insert(feedEventsTable).values(seed.feedEvents);
  await db.insert(scoreboardTable).values(seed.scoreboard);

  logger.info(
    {
      hubs: seed.hubs.length,
      lanes: seed.lanes.length,
      shipments: seed.shipments.length,
    },
    "Seed complete",
  );
}

export async function seedIfEmpty(): Promise<void> {
  await seedDatabaseIfEmpty();
}
