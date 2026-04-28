import { Router, type IRouter } from "express";
import {
  ListDisruptionsResponse,
  SimulateDisruptionBody,
  SimulateDisruptionResponse,
  ResetDisruptionsResponse,
} from "@workspace/api-zod";
import { type DisruptionRow, type Lane, type ShipmentRow } from "@workspace/db";
import { SCENARIOS, type ScenarioId } from "../lib/scenarios";
import { randomUUID } from "node:crypto";
import { clearRecommendations } from "../lib/state";
import {
  clearDisruptions,
  incrementHubCongestion,
  insertDisruptions,
  insertFeedEvent,
  listDisruptions,
  listHubs,
  listLanes,
  listShipments,
  resetShipmentReroutes,
  updateHubCongestion,
} from "../lib/data-store";

const router: IRouter = Router();

router.get("/disruptions", async (_req, res) => {
  const rows = await listDisruptions();
  const enriched = await enrichDisruptionCounts(rows);
  const data = ListDisruptionsResponse.parse(enriched);
  res.json(data);
});

router.post("/disruptions/simulate", async (req, res) => {
  const { scenario } = SimulateDisruptionBody.parse(req.body);
  const def = SCENARIOS[scenario as ScenarioId];
  if (!def) {
    res.status(400).json({ error: "Unknown scenario" });
    return;
  }

  const now = new Date();
  const rows = def.events.map((e) => ({
    id: `d_${randomUUID().slice(0, 12)}`,
    type: e.type,
    scenario: def.id,
    title: e.title,
    description: e.description,
    lat: e.lat,
    lng: e.lng,
    radiusKm: e.radiusKm,
    severity: e.severity,
    startedAt: now,
    expectedEndAt: new Date(now.getTime() + e.durationHours * 3_600_000),
    affectedHubIds: e.affectedHubIds,
    affectedLaneIds: e.affectedLaneIds,
    active: true,
  }));
  await insertDisruptions(rows);

  // Spike congestion at affected hubs
  for (const ev of def.events) {
    for (const hubId of ev.affectedHubIds) {
      await incrementHubCongestion(hubId, 35);
    }
  }

  // Breaking news feed event
  await insertFeedEvent({
    id: `e_${randomUUID().slice(0, 12)}`,
    at: new Date(),
    kind: "disruption",
    severity: "critical",
    headline: `BREAKING: ${def.label}`,
    body: def.briefSummary,
    relatedShipmentId: null,
  });

  // Bust reco cache so the next read regenerates with new conditions
  clearRecommendations();

  // Count affected shipments
  const allShipments = await listShipments();
  const lanes = await listLanes();
  const isAffected = createShipmentAffectedPredicate(rows, lanes);
  const affectedShipmentIds = allShipments
    .filter((shipment) => isAffected(shipment))
    .map((shipment) => shipment.id);
  const affectedShipmentCount = affectedShipmentIds.length;

  const enriched = rows.map((r) => ({
    ...r,
    startedAt: r.startedAt.toISOString(),
    expectedEndAt: r.expectedEndAt.toISOString(),
    affectedShipmentCount: Math.round(
      affectedShipmentCount / Math.max(1, rows.length),
    ),
  }));

  const data = SimulateDisruptionResponse.parse({
    events: enriched,
    affectedShipmentIds,
    summary: def.briefSummary,
  });
  res.json(data);
});

router.post("/disruptions/reset", async (_req, res) => {
  const cleared = await clearDisruptions();

  // Reset shipment rerouted state
  await resetShipmentReroutes();

  // Reset hub congestion to baseline-ish
  for (const h of await listHubs()) {
    const baseline = baselineCongestionFor(h.code);
    await updateHubCongestion(h.id, baseline);
  }

  await insertFeedEvent({
    id: `e_${randomUUID().slice(0, 12)}`,
    at: new Date(),
    kind: "info",
    severity: "info",
    headline: "WORLD RESET",
    body: "All disruptions cleared. Shipments returned to original routes.",
    relatedShipmentId: null,
  });
  clearRecommendations();

  const data = ResetDisruptionsResponse.parse({ cleared });
  res.json(data);
});

function baselineCongestionFor(code: string): number {
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
  return hot[code] ?? 15;
}

async function enrichDisruptionCounts(
  rows: DisruptionRow[],
): Promise<unknown[]> {
  const allShipments = await listShipments();
  const lanes = await listLanes();
  return rows.map((d) => {
    const isAffected = createShipmentAffectedPredicate([d], lanes);
    const count = allShipments.filter((shipment) => isAffected(shipment)).length;
    return {
      ...d,
      startedAt: d.startedAt.toISOString(),
      expectedEndAt: d.expectedEndAt.toISOString(),
      affectedShipmentCount: count,
    };
  });
}

function createShipmentAffectedPredicate(
  disruptions: Array<Pick<DisruptionRow, "affectedHubIds" | "affectedLaneIds">>,
  lanes: Lane[],
): (shipment: ShipmentRow) => boolean {
  const affectedHubs = new Set(disruptions.flatMap((item) => item.affectedHubIds));
  const affectedLanePairs = new Set(
    lanes
      .filter((lane) =>
        disruptions.some((item) => item.affectedLaneIds.includes(lane.id)),
      )
      .flatMap((lane) => [
        `${lane.originHubId}__${lane.destinationHubId}`,
        `${lane.destinationHubId}__${lane.originHubId}`,
      ]),
  );

  return (shipment: ShipmentRow) => {
    if (
      affectedHubs.has(shipment.originHubId) ||
      affectedHubs.has(shipment.destinationHubId) ||
      shipment.viaHubIds.some((hubId) => affectedHubs.has(hubId))
    ) {
      return true;
    }

    return affectedLanePairs.has(
      `${shipment.originHubId}__${shipment.destinationHubId}`,
    );
  };
}

export default router;
