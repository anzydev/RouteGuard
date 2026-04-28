/**
 * Generate alternative routes for a shipment under current network state.
 */

import type { Hub, Lane, ShipmentRow, DisruptionRow } from "@workspace/db";
import {
  buildAdjacency,
  kShortestPaths,
  type RiskAdjustments,
} from "./network";
import { randomUUID } from "node:crypto";
import type { RouteRecommendation } from "./state";

const SEVERITY_WEIGHT: Record<string, number> = {
  low: 1.2,
  medium: 1.6,
  high: 2.4,
  critical: 4.0,
};

export function buildRiskAdjustments(
  hubs: Hub[],
  lanes: Lane[],
  disruptions: DisruptionRow[],
): RiskAdjustments {
  const hubCongestion: Record<string, number> = {};
  for (const h of hubs) hubCongestion[h.id] = h.congestionScore;

  const laneRiskMultiplier: Record<string, number> = {};
  const laneActive: Record<string, boolean> = {};
  for (const l of lanes) {
    laneRiskMultiplier[l.id] = l.riskMultiplier;
    laneActive[l.id] = l.active;
  }

  for (const d of disruptions) {
    if (!d.active) continue;
    const w = SEVERITY_WEIGHT[d.severity] ?? 1.5;
    for (const laneId of d.affectedLaneIds) {
      laneRiskMultiplier[laneId] = (laneRiskMultiplier[laneId] ?? 1) * w;
    }
    for (const hubId of d.affectedHubIds) {
      hubCongestion[hubId] = Math.min(
        100,
        (hubCongestion[hubId] ?? 0) + 30 * (w - 1),
      );
    }
  }

  return { hubCongestion, laneRiskMultiplier, laneActive };
}

export interface RecGenInput {
  shipment: ShipmentRow;
  hubs: Hub[];
  lanes: Lane[];
  disruptions: DisruptionRow[];
  hubMap: Map<string, Hub>;
  laneMap: Map<string, Lane>;
}

export function generateRecommendations(
  input: RecGenInput,
): RouteRecommendation[] {
  const { shipment, hubs, lanes, disruptions, hubMap, laneMap } = input;
  const adj = buildRiskAdjustments(hubs, lanes, disruptions);

  // Baseline weight (no disruptions taken into account, for delta computation)
  const baseAdj: RiskAdjustments = {
    hubCongestion: Object.fromEntries(hubs.map((h) => [h.id, 20])),
    laneRiskMultiplier: Object.fromEntries(lanes.map((l) => [l.id, 1])),
    laneActive: Object.fromEntries(lanes.map((l) => [l.id, true])),
  };
  const baseGraph = buildAdjacency(lanes, baseAdj);
  const baselinePath = kShortestPaths(
    baseGraph,
    shipment.originHubId,
    shipment.destinationHubId,
    1,
  )[0];
  const baselineHours = baselinePath?.hours ?? null;

  // Current adjusted graph
  const graph = buildAdjacency(lanes, adj);
  const paths = kShortestPaths(
    graph,
    shipment.originHubId,
    shipment.destinationHubId,
    4,
  );

  const recs: RouteRecommendation[] = [];
  for (const path of paths) {
    if (path.lanes.length === 0) continue;
    const viaHubIds = path.hubs.slice(1, -1);
    const viaHubNames = viaHubIds
      .map((id) => hubMap.get(id)?.name ?? id)
      .slice(0, 3);

    const isAir = path.lanes.some((id) => laneMap.get(id)?.mode === "air");
    const etaDeltaHours = baselineHours
      ? Math.round(path.hours - baselineHours)
      : 0;
    const costDeltaUsd = Math.round(
      isAir
        ? 35_000 + path.lanes.length * 6_000
        : 4_000 + path.lanes.length * 1_500,
    );
    const carbonDeltaKg = Math.round(
      isAir
        ? 18_000 + path.hours * 30
        : -1500 + path.lanes.length * 200,
    );
    const riskAfter = Math.max(
      4,
      Math.min(80, Math.round(20 + path.lanes.length * 6 - (isAir ? 10 : 0))),
    );

    const label = buildLabel(path, hubMap, laneMap, viaHubNames);
    const justification = buildJustification(
      path,
      hubMap,
      laneMap,
      disruptions,
      isAir,
      etaDeltaHours,
    );

    recs.push({
      id: `r_${randomUUID().slice(0, 10)}`,
      shipmentId: shipment.id,
      label,
      viaHubIds,
      viaHubNames,
      etaDeltaHours,
      costDeltaUsd,
      carbonDeltaKg,
      riskAfter,
      justification,
    });
    if (recs.length >= 3) break;
  }

  // Ensure at least one option exists — fall back to a "hold position" advisory
  if (recs.length === 0) {
    recs.push({
      id: `r_${randomUUID().slice(0, 10)}`,
      shipmentId: shipment.id,
      label: "HOLD AT ORIGIN",
      viaHubIds: [],
      viaHubNames: [],
      etaDeltaHours: 24,
      costDeltaUsd: 800,
      carbonDeltaKg: -500,
      riskAfter: 25,
      justification:
        "All viable corridors currently degraded. Recommend short hold and re-evaluate within 24 hours.",
    });
  }

  return recs;
}

function buildLabel(
  path: { lanes: string[]; hubs: string[] },
  hubMap: Map<string, Hub>,
  laneMap: Map<string, Lane>,
  viaHubNames: string[],
): string {
  const isAir = path.lanes.some((id) => laneMap.get(id)?.mode === "air");
  const isSea = path.lanes.some((id) => laneMap.get(id)?.mode === "sea");
  if (isAir && isSea) return `Sea-Air via ${viaHubNames[0] ?? "transshipment"}`;
  if (isAir) return `Air freight via ${viaHubNames[0] ?? "hub"}`;
  if (viaHubNames.length === 0) return "Direct sea, current lane";
  return `Sea via ${viaHubNames.join(" → ")}`;
}

function buildJustification(
  path: { lanes: string[]; hubs: string[]; hours: number },
  hubMap: Map<string, Hub>,
  laneMap: Map<string, Lane>,
  disruptions: DisruptionRow[],
  isAir: boolean,
  etaDeltaHours: number,
): string {
  const activeTitles = disruptions
    .filter((d) => d.active)
    .map((d) => d.title)
    .slice(0, 2);
  const days = Math.round(path.hours / 24);
  const direction = etaDeltaHours <= 0 ? "ahead of schedule" : `+${etaDeltaHours}h`;
  if (isAir) {
    return `Bypass surface congestion via air-cargo handoff. Total transit ~${days}d (${direction} vs baseline). Sidesteps ${activeTitles[0] ?? "the active disruption"} entirely.`;
  }
  if (path.hubs.length > 2) {
    return `Reroute through ${path.hubs.length - 2} transshipment hub(s) to avoid affected corridors. Adds ~${days}d transit (${direction}) but materially lowers exposure.`;
  }
  return `Maintain current corridor with closer monitoring. Estimated ~${days}d total (${direction}). Lowest cost option, but residual risk remains.`;
}
