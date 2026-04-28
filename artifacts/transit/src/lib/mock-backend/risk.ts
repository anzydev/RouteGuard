/**
 * Risk scoring + status derivation for shipments.
 */

import type { ShipmentRow, DisruptionRow, Hub, Lane } from "./state";

export type Status = "on_track" | "at_risk" | "delayed" | "rerouted" | "delivered";

export interface ScoringContext {
  hubs: Map<string, Hub>;
  lanes: Map<string, Lane>;
  laneIndex: Map<string, Lane[]>; // hubId -> lanes touching it
  disruptions: DisruptionRow[];
  laneAffectedBy: Map<string, DisruptionRow[]>; // laneId -> disruptions
  hubAffectedBy: Map<string, DisruptionRow[]>; // hubId -> disruptions
}

export function buildScoringContext(
  hubs: Hub[],
  lanes: Lane[],
  disruptions: DisruptionRow[],
): ScoringContext {
  const hubMap = new Map(hubs.map((h) => [h.id, h]));
  const laneMap = new Map(lanes.map((l) => [l.id, l]));
  const laneIndex = new Map<string, Lane[]>();
  for (const lane of lanes) {
    if (!laneIndex.has(lane.originHubId)) laneIndex.set(lane.originHubId, []);
    if (!laneIndex.has(lane.destinationHubId))
      laneIndex.set(lane.destinationHubId, []);
    laneIndex.get(lane.originHubId)!.push(lane);
    laneIndex.get(lane.destinationHubId)!.push(lane);
  }
  const laneAffectedBy = new Map<string, DisruptionRow[]>();
  const hubAffectedBy = new Map<string, DisruptionRow[]>();
  for (const d of disruptions) {
    if (!d.active) continue;
    for (const id of d.affectedLaneIds) {
      if (!laneAffectedBy.has(id)) laneAffectedBy.set(id, []);
      laneAffectedBy.get(id)!.push(d);
    }
    for (const id of d.affectedHubIds) {
      if (!hubAffectedBy.has(id)) hubAffectedBy.set(id, []);
      hubAffectedBy.get(id)!.push(d);
    }
  }
  return {
    hubs: hubMap,
    lanes: laneMap,
    laneIndex,
    disruptions,
    laneAffectedBy,
    hubAffectedBy,
  };
}

const SEVERITY_WEIGHT: Record<string, number> = {
  low: 8,
  medium: 18,
  high: 32,
  critical: 50,
};

export interface RiskResult {
  riskScore: number;
  drivers: string[];
  status: Status;
  etaDeltaHours: number;
  newCurrentEta: Date;
}

/**
 * Compute live risk for a shipment given current network state.
 */
export function scoreShipment(
  s: ShipmentRow,
  ctx: ScoringContext,
  now: Date = new Date(),
): RiskResult {
  if (s.status === "delivered") {
    return {
      riskScore: 0,
      drivers: [],
      status: "delivered",
      etaDeltaHours: 0,
      newCurrentEta: s.currentEta,
    };
  }

  const drivers: string[] = [];
  let score = 0;
  let extraHours = 0;

  // Hub congestion (origin & dest)
  const origin = ctx.hubs.get(s.originHubId);
  const dest = ctx.hubs.get(s.destinationHubId);
  if (origin && origin.congestionScore > 40) {
    const c = origin.congestionScore;
    score += Math.min(20, (c - 40) * 0.4);
    if (c > 60)
      drivers.push(`Origin port congestion at ${origin.name} (${c}/100)`);
    extraHours += (c - 40) * 0.5;
  }
  if (dest && dest.congestionScore > 40) {
    const c = dest.congestionScore;
    score += Math.min(20, (c - 40) * 0.4);
    if (c > 60)
      drivers.push(`Destination dwell at ${dest.name} (${c}/100)`);
    extraHours += (c - 40) * 0.5;
  }

  // Direct disruptions on the shipment's primary lane(s)
  const candidateLanes = candidateLaneIds(s, ctx);
  const seenDisruptions = new Set<string>();
  for (const laneId of candidateLanes) {
    const ds = ctx.laneAffectedBy.get(laneId) ?? [];
    for (const d of ds) {
      if (seenDisruptions.has(d.id)) continue;
      seenDisruptions.add(d.id);
      const w = SEVERITY_WEIGHT[d.severity] ?? 15;
      score += w;
      drivers.push(`${d.title} (${d.severity})`);
      extraHours += w * 1.5;
    }
  }
  // Hub-level disruptions
  for (const hubId of [s.originHubId, s.destinationHubId, ...s.viaHubIds]) {
    const ds = ctx.hubAffectedBy.get(hubId) ?? [];
    for (const d of ds) {
      if (seenDisruptions.has(d.id)) continue;
      seenDisruptions.add(d.id);
      const w = SEVERITY_WEIGHT[d.severity] ?? 15;
      score += w * 0.7;
      drivers.push(`${d.title} (${d.severity})`);
      extraHours += w * 1.0;
    }
  }

  // Time pressure: if promised ETA is close and shipment is barely moving
  const hoursToPromised =
    (s.promisedEta.getTime() - now.getTime()) / 3_600_000;
  if (hoursToPromised < 48 && s.progressPct < 80) {
    score += 12;
    drivers.push("Tight delivery window");
  }

  // Reroute discount — already taken action
  if (s.rerouted) {
    score *= 0.55;
    drivers.push("Reroute applied — risk mitigated");
    extraHours *= 0.5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const newCurrentEta = new Date(s.currentEta.getTime() + extraHours * 3_600_000);
  const etaDeltaHours = Math.round(
    (newCurrentEta.getTime() - s.promisedEta.getTime()) / 3_600_000,
  );

  let status: Status = "on_track";
  if (s.rerouted && score < 35) status = "rerouted";
  else if (score >= 70) status = "delayed";
  else if (score >= 35) status = "at_risk";

  return {
    riskScore: score,
    drivers: dedupe(drivers).slice(0, 4),
    status,
    etaDeltaHours,
    newCurrentEta,
  };
}

function candidateLaneIds(s: ShipmentRow, ctx: ScoringContext): string[] {
  const ids = new Set<string>();
  const segments: Array<[string, string]> = [];
  if (s.viaHubIds.length === 0) {
    segments.push([s.originHubId, s.destinationHubId]);
  } else {
    let prev = s.originHubId;
    for (const v of s.viaHubIds) {
      segments.push([prev, v]);
      prev = v;
    }
    segments.push([prev, s.destinationHubId]);
  }
  for (const [a, b] of segments) {
    // Find any lane that links these two hubs in either direction
    const lanesAtA = ctx.laneIndex.get(a) ?? [];
    for (const lane of lanesAtA) {
      if (
        (lane.originHubId === a && lane.destinationHubId === b) ||
        (lane.originHubId === b && lane.destinationHubId === a)
      ) {
        ids.add(lane.id);
      }
    }
  }
  return Array.from(ids);
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/**
 * Interpolate current lat/lng based on progressPct between origin and destination.
 */
export function interpolatePosition(
  s: ShipmentRow,
  ctx: ScoringContext,
): { lat: number; lng: number } {
  const o = ctx.hubs.get(s.originHubId);
  const d = ctx.hubs.get(s.destinationHubId);
  if (!o || !d) return { lat: 0, lng: 0 };
  const t = Math.max(0, Math.min(1, s.progressPct / 100));
  return { lat: o.lat + (d.lat - o.lat) * t, lng: o.lng + (d.lng - o.lng) * t };
}
