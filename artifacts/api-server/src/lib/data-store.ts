import { db, pool, hasDatabaseConfig } from "@workspace/db";
import {
  hubsTable,
  lanesTable,
  shipmentsTable,
  disruptionsTable,
  feedEventsTable,
  scoreboardTable,
  type Hub,
  type Lane,
  type ShipmentRow,
  type DisruptionRow,
  type FeedEventRow,
  type ScoreboardRow,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "./logger";
import { createSeedState, seedDatabaseIfEmpty } from "./seed";

type StorageMode = "database" | "memory";

interface MemoryState {
  hubs: Hub[];
  lanes: Lane[];
  shipments: ShipmentRow[];
  disruptions: DisruptionRow[];
  feedEvents: FeedEventRow[];
  scoreboard: ScoreboardRow;
}

let storageMode: StorageMode = "memory";
let initialized = false;
let memoryState: MemoryState | null = null;

function cloneRow<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneRow(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneRow(item)]),
    ) as T;
  }
  return value;
}

function cloneRows<T>(rows: T[]): T[] {
  return rows.map((row) => cloneRow(row));
}

function getMemoryState(): MemoryState {
  if (!memoryState) {
    const seed = createSeedState();
    memoryState = {
      hubs: cloneRows(seed.hubs),
      lanes: cloneRows(seed.lanes),
      shipments: cloneRows(seed.shipments),
      disruptions: [],
      feedEvents: cloneRows(seed.feedEvents),
      scoreboard: cloneRow(seed.scoreboard),
    };
  }
  return memoryState;
}

async function initMemoryMode(reason: string): Promise<void> {
  storageMode = "memory";
  getMemoryState();
  logger.warn({ reason }, "Database unavailable, starting in demo memory mode");
}

export async function initializeDataStore(): Promise<StorageMode> {
  if (initialized) {
    return storageMode;
  }

  const requestedMode = process.env.TRANSIT_STORAGE;
  if (requestedMode === "memory") {
    await initMemoryMode("TRANSIT_STORAGE=memory");
    initialized = true;
    return storageMode;
  }

  if (!hasDatabaseConfig || !db || !pool) {
    await initMemoryMode("DATABASE_URL missing");
    initialized = true;
    return storageMode;
  }

  try {
    await pool.query("SELECT 1");
    await seedDatabaseIfEmpty();
    storageMode = "database";
    logger.info("Database connected, starting in database mode");
  } catch (err) {
    logger.warn({ err }, "Database bootstrap failed");
    await initMemoryMode("database bootstrap failed");
  }

  initialized = true;
  return storageMode;
}

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await initializeDataStore();
  }
}

export function getStorageMode(): StorageMode {
  return storageMode;
}

export async function listHubs(): Promise<Hub[]> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    return db.select().from(hubsTable);
  }
  return cloneRows(getMemoryState().hubs);
}

export async function listLanes(): Promise<Lane[]> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    return db.select().from(lanesTable);
  }
  return cloneRows(getMemoryState().lanes);
}

export async function listShipments(): Promise<ShipmentRow[]> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    return db.select().from(shipmentsTable);
  }
  return cloneRows(getMemoryState().shipments);
}

export async function listDisruptions(): Promise<DisruptionRow[]> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    return db.select().from(disruptionsTable);
  }
  return cloneRows(getMemoryState().disruptions);
}

export async function listFeedEvents(limit = 50): Promise<FeedEventRow[]> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    return db
      .select()
      .from(feedEventsTable)
      .orderBy(desc(feedEventsTable.at))
      .limit(limit);
  }

  return cloneRows(getMemoryState().feedEvents)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

export async function getScoreboard(): Promise<ScoreboardRow> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    const rows = await db
      .select()
      .from(scoreboardTable)
      .where(eq(scoreboardTable.id, "singleton"));
    if (rows.length > 0) {
      return rows[0];
    }

    const fresh: ScoreboardRow = {
      id: "singleton",
      score: 0,
      streak: 0,
      savedDollarsToday: 0,
      reroutesAcceptedToday: 0,
    };
    await db.insert(scoreboardTable).values(fresh);
    return fresh;
  }

  return cloneRow(getMemoryState().scoreboard);
}

export async function updateScoreboard(
  patch: Partial<Omit<ScoreboardRow, "id">>,
): Promise<ScoreboardRow> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    const current = await getScoreboard();
    const next = { ...current, ...patch };
    await db
      .update(scoreboardTable)
      .set({
        score: next.score,
        streak: next.streak,
        savedDollarsToday: next.savedDollarsToday,
        reroutesAcceptedToday: next.reroutesAcceptedToday,
      })
      .where(eq(scoreboardTable.id, "singleton"));
    return next;
  }

  const state = getMemoryState();
  state.scoreboard = { ...state.scoreboard, ...patch };
  return cloneRow(state.scoreboard);
}

export async function updateShipment(
  id: string,
  patch: Partial<ShipmentRow>,
): Promise<ShipmentRow | null> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    await db.update(shipmentsTable).set(patch).where(eq(shipmentsTable.id, id));
    const rows = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.id, id));
    return rows[0] ?? null;
  }

  const state = getMemoryState();
  const index = state.shipments.findIndex((row) => row.id === id);
  if (index === -1) {
    return null;
  }
  state.shipments[index] = { ...state.shipments[index], ...cloneRow(patch) };
  return cloneRow(state.shipments[index]);
}

export async function resetShipmentReroutes(): Promise<void> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    await db.update(shipmentsTable).set({ rerouted: false, viaHubIds: [] });
    return;
  }

  const state = getMemoryState();
  state.shipments = state.shipments.map((shipment) => ({
    ...shipment,
    rerouted: false,
    viaHubIds: [],
  }));
}

export async function insertDisruptions(
  rows: DisruptionRow[],
): Promise<void> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    await db.insert(disruptionsTable).values(rows);
    return;
  }

  const state = getMemoryState();
  state.disruptions.push(...cloneRows(rows));
}

export async function clearDisruptions(): Promise<number> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    const rows = await db.select().from(disruptionsTable);
    await db.delete(disruptionsTable);
    return rows.length;
  }

  const state = getMemoryState();
  const cleared = state.disruptions.length;
  state.disruptions = [];
  return cleared;
}

export async function updateHubCongestion(
  hubId: string,
  nextScore: number,
): Promise<void> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    await db
      .update(hubsTable)
      .set({ congestionScore: nextScore })
      .where(eq(hubsTable.id, hubId));
    return;
  }

  const state = getMemoryState();
  const hub = state.hubs.find((row) => row.id === hubId);
  if (hub) {
    hub.congestionScore = nextScore;
  }
}

export async function incrementHubCongestion(
  hubId: string,
  delta: number,
): Promise<void> {
  await ensureInitialized();
  const hubs = await listHubs();
  const hub = hubs.find((row) => row.id === hubId);
  if (!hub) {
    return;
  }
  await updateHubCongestion(hubId, Math.min(100, hub.congestionScore + delta));
}

export async function insertFeedEvent(row: FeedEventRow): Promise<void> {
  await ensureInitialized();
  if (storageMode === "database" && db) {
    await db.insert(feedEventsTable).values(row);
    return;
  }

  getMemoryState().feedEvents.push(cloneRow(row));
}
