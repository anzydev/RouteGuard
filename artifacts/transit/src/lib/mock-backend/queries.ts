/**
 * Shared data query helpers.
 */
import type {
  Hub,
  Lane,
  ShipmentRow,
  DisruptionRow,
  ScoreboardRow,
  FeedEventRow,
} from "./state";
import { buildScoringContext, scoreShipment, interpolatePosition } from "./risk";
import { generateRecommendations } from "./recommendations";
import {
  listHubs,
  listLanes,
  listShipments,
  listDisruptions,
  listFeedEvents,
  getScoreboard,
} from "./state";

// Port RouteRecommendation here to decouple
export interface RouteRecommendation {
  id: string;
  viaHubIds: string[];
  etaDeltaHours: number;
  costDeltaUsd: number;
  riskAfter: number;
}

// In-memory cache for recommendations since we don't use DB
let recommendationsCache: Record<string, RouteRecommendation[]> = {};

export function setRecommendations(shipmentId: string, recs: RouteRecommendation[]) {
  recommendationsCache[shipmentId] = recs;
}

export function clearRecommendations() {
  recommendationsCache = {};
}

export interface NetworkSnapshot {
  hubs: Hub[];
  lanes: Lane[];
  shipments: ShipmentRow[];
  disruptions: DisruptionRow[];
  hubMap: Map<string, Hub>;
  laneMap: Map<string, Lane>;
}

export async function loadNetwork(): Promise<NetworkSnapshot> {
  const [hubs, lanes, shipments, disruptions] = await Promise.all([
    listHubs(),
    listLanes(),
    listShipments(),
    listDisruptions(),
  ]);
  return {
    hubs,
    lanes,
    shipments,
    disruptions,
    hubMap: new Map(hubs.map((h) => [h.id, h])),
    laneMap: new Map(lanes.map((l) => [l.id, l])),
  };
}

export interface EnrichedShipment {
  id: string;
  refCode: string;
  carrier: string;
  mode: "sea" | "air" | "road" | "rail";
  status: "on_track" | "at_risk" | "delayed" | "rerouted" | "delivered";
  originHubId: string;
  destinationHubId: string;
  originName: string;
  destinationName: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  currentLat: number;
  currentLng: number;
  progressPct: number;
  promisedEta: string;
  currentEta: string;
  etaDeltaHours: number;
  cargoType: string;
  cargoValueUsd: number;
  riskScore: number;
  riskDrivers: string[];
  rerouted: boolean;
}

export function enrichShipment(
  s: ShipmentRow,
  snapshot: NetworkSnapshot,
): EnrichedShipment {
  const ctx = buildScoringContext(snapshot.hubs, snapshot.lanes, snapshot.disruptions);
  const score = scoreShipment(s, ctx);
  const pos = interpolatePosition(s, ctx);
  const o = snapshot.hubMap.get(s.originHubId)!;
  const d = snapshot.hubMap.get(s.destinationHubId)!;
  return {
    id: s.id,
    refCode: s.refCode,
    carrier: s.carrier,
    mode: s.mode as EnrichedShipment["mode"],
    status: score.status,
    originHubId: s.originHubId,
    destinationHubId: s.destinationHubId,
    originName: o.name,
    destinationName: d.name,
    originLat: o.lat,
    originLng: o.lng,
    destinationLat: d.lat,
    destinationLng: d.lng,
    currentLat: pos.lat,
    currentLng: pos.lng,
    progressPct: Math.round(s.progressPct * 10) / 10,
    promisedEta: s.promisedEta.toISOString(),
    currentEta: score.newCurrentEta.toISOString(),
    etaDeltaHours: score.etaDeltaHours,
    cargoType: s.cargoType,
    cargoValueUsd: s.cargoValueUsd,
    riskScore: score.riskScore,
    riskDrivers: score.drivers,
    rerouted: s.rerouted,
  };
}

export function enrichAll(snapshot: NetworkSnapshot): EnrichedShipment[] {
  const ctx = buildScoringContext(snapshot.hubs, snapshot.lanes, snapshot.disruptions);
  return snapshot.shipments.map((s) => {
    const score = scoreShipment(s, ctx);
    const pos = interpolatePosition(s, ctx);
    const o = snapshot.hubMap.get(s.originHubId)!;
    const d = snapshot.hubMap.get(s.destinationHubId)!;
    return {
      id: s.id,
      refCode: s.refCode,
      carrier: s.carrier,
      mode: s.mode as EnrichedShipment["mode"],
      status: score.status,
      originHubId: s.originHubId,
      destinationHubId: s.destinationHubId,
      originName: o.name,
      destinationName: d.name,
      originLat: o.lat,
      originLng: o.lng,
      destinationLat: d.lat,
      destinationLng: d.lng,
      currentLat: pos.lat,
      currentLng: pos.lng,
      progressPct: Math.round(s.progressPct * 10) / 10,
      promisedEta: s.promisedEta.toISOString(),
      currentEta: score.newCurrentEta.toISOString(),
      etaDeltaHours: score.etaDeltaHours,
      cargoType: s.cargoType,
      cargoValueUsd: s.cargoValueUsd,
      riskScore: score.riskScore,
      riskDrivers: score.drivers,
      rerouted: s.rerouted,
    };
  });
}

export async function loadScoreboard(): Promise<ScoreboardRow> {
  return getScoreboard();
}

export async function refreshAndCacheRecommendationsForAtRisk(
  snapshot: NetworkSnapshot,
  enriched: EnrichedShipment[],
): Promise<void> {
  // Pre-cache recs for at-risk + delayed shipments so the UI can render fast
  const atRisk = enriched.filter(
    (s) =>
      (s.status === "at_risk" || s.status === "delayed") && !s.rerouted,
  );
  for (const e of atRisk.slice(0, 80)) {
    const row = snapshot.shipments.find((r) => r.id === e.id);
    if (!row) continue;
    const recs = generateRecommendations({
      shipment: row,
      hubs: snapshot.hubs,
      lanes: snapshot.lanes,
      disruptions: snapshot.disruptions,
      hubMap: snapshot.hubMap,
      laneMap: snapshot.laneMap,
    });
    setRecommendations(row.id, recs);
  }
}
