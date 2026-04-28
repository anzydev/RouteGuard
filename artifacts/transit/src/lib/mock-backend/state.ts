import { SEED_HUBS, SEED_LANES } from "./network";

// Ported Database Types
export interface Hub {
  id: string;
  code: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  type: string;
  congestionScore: number;
}

export interface Lane {
  id: string;
  originHubId: string;
  destinationHubId: string;
  mode: string;
  baselineHours: number;
  riskMultiplier: number;
  active: boolean;
}

export interface ShipmentRow {
  id: string;
  refCode: string;
  carrier: string;
  mode: string;
  status: string;
  originHubId: string;
  destinationHubId: string;
  progressPct: number;
  promisedEta: Date;
  currentEta: Date;
  cargoType: string;
  cargoValueUsd: number;
  riskScore: number;
  riskDrivers: any[];
  rerouted: boolean;
  viaHubIds: string[];
  createdAt: Date;
}

export interface DisruptionRow {
  id: string;
  type: string;
  scenario: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  radiusKm: number;
  severity: string;
  startedAt: Date;
  expectedEndAt: Date;
  affectedHubIds: string[];
  affectedLaneIds: string[];
  active: boolean;
}

export interface FeedEventRow {
  id: string;
  at: Date;
  kind: string;
  severity: string;
  headline: string;
  body: string;
  relatedShipmentId: string | null;
}

export interface ScoreboardRow {
  id: string;
  score: number;
  streak: number;
  savedDollarsToday: number;
  reroutesAcceptedToday: number;
}

export interface AppState {
  hubs: Hub[];
  lanes: Lane[];
  shipments: ShipmentRow[];
  disruptions: DisruptionRow[];
  feedEvents: FeedEventRow[];
  scoreboard: ScoreboardRow;
}

const CARGO_TYPES = [
  "Consumer Electronics", "Auto Parts", "Pharmaceuticals", "Apparel & Textiles",
  "Industrial Machinery", "Frozen Seafood", "Lithium Cells", "Solar Panels",
  "Specialty Chemicals", "Medical Devices", "Coffee Beans", "Wine & Spirits",
  "Aerospace Components", "Smartphones", "Furniture",
];

const CARRIERS = [
  "Maersk", "MSC", "CMA CGM", "Hapag-Lloyd", "ONE Network",
  "Evergreen", "COSCO", "ZIM", "FedEx Air", "DHL Cargo",
];

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number): number { return min + Math.random() * (max - min); }
function randInt(min: number, max: number): number { return Math.floor(rand(min, max + 1)); }

function pickCongestion(code: string): number {
  const hot: Record<string, number> = {
    LAX: 55, SHA: 48, SZX: 45, RTM: 38, SGP: 30, HKG: 35, PUS: 28, NYC: 33, HAM: 30,
  };
  return hot[code] ?? randInt(8, 25);
}

function browserUUID() {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
}

function createSeedState(): AppState {
  const now = Date.now();

  const hubs: Hub[] = SEED_HUBS.map((h) => ({
    id: h.id, code: h.code, name: h.name, country: h.country,
    lat: h.lat, lng: h.lng, type: h.type, congestionScore: pickCongestion(h.code),
  }));

  const lanes: Lane[] = SEED_LANES.map((l) => ({
    id: l.id, originHubId: l.originHubId, destinationHubId: l.destinationHubId,
    mode: l.mode, baselineHours: l.baselineHours, riskMultiplier: 1, active: true,
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
    const createdAt = new Date(now - baselineMs * (progressPct / 100) - rand(6, 72) * 3_600_000);

    shipments.push({
      id: `s_${browserUUID().slice(0, 12)}`,
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
      id: `e_${browserUUID().slice(0, 12)}`,
      at: new Date(now - 20 * 60_000),
      kind: "info",
      severity: "info",
      headline: "TRANSIT ONLINE",
      body: "Network telemetry feeds connected. 220 active shipments under watch across 6 regions.",
      relatedShipmentId: null,
    },
    {
      id: `e_${browserUUID().slice(0, 12)}`,
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

  return { hubs, lanes, shipments, disruptions: [], feedEvents, scoreboard };
}

function cloneRow<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map((item) => cloneRow(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneRow(item)])) as T;
  }
  return value;
}
function cloneRows<T>(rows: T[]): T[] { return rows.map((row) => cloneRow(row)); }

// --- Global State ---
let memoryState: AppState | null = null;

function getMemoryState(): AppState {
  if (!memoryState) {
    memoryState = createSeedState();
  }
  return memoryState;
}

export async function listHubs(): Promise<Hub[]> { return cloneRows(getMemoryState().hubs); }
export async function listLanes(): Promise<Lane[]> { return cloneRows(getMemoryState().lanes); }
export async function listShipments(): Promise<ShipmentRow[]> { return cloneRows(getMemoryState().shipments); }
export async function listDisruptions(): Promise<DisruptionRow[]> { return cloneRows(getMemoryState().disruptions); }

export async function listFeedEvents(limit = 50): Promise<FeedEventRow[]> {
  return cloneRows(getMemoryState().feedEvents)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

export async function getScoreboard(): Promise<ScoreboardRow> {
  return cloneRow(getMemoryState().scoreboard);
}

export async function updateScoreboard(patch: Partial<Omit<ScoreboardRow, "id">>): Promise<ScoreboardRow> {
  const state = getMemoryState();
  state.scoreboard = { ...state.scoreboard, ...patch };
  return cloneRow(state.scoreboard);
}

export async function updateShipment(id: string, patch: Partial<ShipmentRow>): Promise<ShipmentRow | null> {
  const state = getMemoryState();
  const index = state.shipments.findIndex((row) => row.id === id);
  if (index === -1) return null;
  state.shipments[index] = { ...state.shipments[index], ...cloneRow(patch) };
  return cloneRow(state.shipments[index]);
}

export async function resetShipmentReroutes(): Promise<void> {
  const state = getMemoryState();
  state.shipments = state.shipments.map((shipment) => ({
    ...shipment,
    rerouted: false,
    viaHubIds: [],
  }));
}

export async function insertDisruptions(rows: DisruptionRow[]): Promise<void> {
  getMemoryState().disruptions.push(...cloneRows(rows));
}

export async function clearDisruptions(): Promise<number> {
  const state = getMemoryState();
  const cleared = state.disruptions.length;
  state.disruptions = [];
  return cleared;
}

export async function updateHubCongestion(hubId: string, nextScore: number): Promise<void> {
  const hub = getMemoryState().hubs.find((row) => row.id === hubId);
  if (hub) hub.congestionScore = nextScore;
}

export async function incrementHubCongestion(hubId: string, delta: number): Promise<void> {
  const hubs = await listHubs();
  const hub = hubs.find((row) => row.id === hubId);
  if (!hub) return;
  await updateHubCongestion(hubId, Math.min(100, hub.congestionScore + delta));
}

export async function insertFeedEvent(row: FeedEventRow): Promise<void> {
  getMemoryState().feedEvents.push(cloneRow(row));
}
