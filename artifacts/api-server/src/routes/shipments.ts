import { Router, type IRouter } from "express";
import {
  ListShipmentsQueryParams,
  ListShipmentsResponse,
  GetShipmentParams,
  GetShipmentResponse,
  AcceptRerouteParams,
  AcceptRerouteBody,
  AcceptRerouteResponse,
} from "@workspace/api-zod";
import {
  loadNetwork,
  enrichAll,
  enrichShipment,
  loadScoreboard,
  refreshAndCacheRecommendationsForAtRisk,
} from "../lib/queries";
import { generateRecommendations } from "../lib/recommendations";
import {
  setRecommendations,
  getRecommendations,
  getRecommendationById,
} from "../lib/state";
import { randomUUID } from "node:crypto";
import {
  insertFeedEvent,
  updateScoreboard,
  updateShipment,
} from "../lib/data-store";

const router: IRouter = Router();

router.get("/shipments", async (req, res) => {
  const query = ListShipmentsQueryParams.parse(req.query);
  const snapshot = await loadNetwork();
  let enriched = enrichAll(snapshot);

  if (query.status) {
    enriched = enriched.filter((s) => s.status === query.status);
  }
  if (query.limit !== undefined) {
    enriched = enriched.slice(0, query.limit);
  }

  // Refresh recs cache for at-risk so the drawer is instant
  await refreshAndCacheRecommendationsForAtRisk(snapshot, enriched);

  const data = ListShipmentsResponse.parse(enriched);
  res.json(data);
});

router.get("/shipments/:id", async (req, res) => {
  const { id } = GetShipmentParams.parse(req.params);
  const snapshot = await loadNetwork();
  const row = snapshot.shipments.find((s) => s.id === id);
  if (!row) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const shipment = enrichShipment(row, snapshot);

  // Generate fresh recommendations
  const recs = generateRecommendations({
    shipment: row,
    hubs: snapshot.hubs,
    lanes: snapshot.lanes,
    disruptions: snapshot.disruptions,
    hubMap: snapshot.hubMap,
    laneMap: snapshot.laneMap,
  });
  setRecommendations(row.id, recs);

  // Synthesize a small timeline from progress + ETA
  const created = row.createdAt;
  const timeline: Array<{ at: string; kind: string; label: string; detail: string }> = [
    {
      at: created.toISOString(),
      kind: "pickup",
      label: "Booking confirmed",
      detail: `${row.carrier} booking ${row.refCode} created at ${shipment.originName}`,
    },
    {
      at: new Date(
        created.getTime() + (row.promisedEta.getTime() - created.getTime()) * 0.05,
      ).toISOString(),
      kind: "departure",
      label: "Departed origin",
      detail: `Vessel cleared ${shipment.originName}, on ${row.mode} corridor`,
    },
  ];
  if (row.progressPct > 50) {
    timeline.push({
      at: new Date(Date.now() - 12 * 3_600_000).toISOString(),
      kind: "customs",
      label: "Mid-transit checkpoint",
      detail: `${Math.round(row.progressPct)}% of corridor complete`,
    });
  }
  if (row.rerouted) {
    timeline.push({
      at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      kind: "reroute",
      label: "Reroute applied",
      detail: `Vessel diverted via ${(row.viaHubIds ?? []).length} alternate hub(s)`,
    });
  }
  if (shipment.riskDrivers.length > 0) {
    timeline.push({
      at: new Date().toISOString(),
      kind: "alert",
      label: "Risk signal",
      detail: shipment.riskDrivers[0],
    });
  }

  const data = GetShipmentResponse.parse({
    shipment,
    recommendations: recs,
    timeline,
  });
  res.json(data);
});

router.post("/shipments/:id/accept-reroute", async (req, res) => {
  const { id } = AcceptRerouteParams.parse(req.params);
  const { recommendationId } = AcceptRerouteBody.parse(req.body);

  const snapshot = await loadNetwork();
  const row = snapshot.shipments.find((s) => s.id === id);
  if (!row) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }

  // Try cached, then regenerate if needed
  let rec = getRecommendationById(recommendationId);
  if (!rec || rec.shipmentId !== id) {
    const fresh = generateRecommendations({
      shipment: row,
      hubs: snapshot.hubs,
      lanes: snapshot.lanes,
      disruptions: snapshot.disruptions,
      hubMap: snapshot.hubMap,
      laneMap: snapshot.laneMap,
    });
    setRecommendations(row.id, fresh);
    rec =
      fresh.find((r) => r.id === recommendationId) ??
      getRecommendations(row.id)[0];
  }
  if (!rec) {
    res.status(400).json({ error: "Recommendation not found" });
    return;
  }

  // Apply the reroute: set viaHubIds, mark rerouted, adjust currentEta
  const newCurrentEta = new Date(
    row.promisedEta.getTime() + rec.etaDeltaHours * 3_600_000,
  );
  await updateShipment(id, {
    rerouted: true,
    viaHubIds: rec.viaHubIds,
    currentEta: newCurrentEta,
  });

  // Estimate dollars saved: portion of cargo value that would have been at risk
  const dollarsSaved = Math.round(
    row.cargoValueUsd * Math.max(0.05, Math.min(0.4, (60 - rec.riskAfter) / 100)),
  );

  // Bump scoreboard
  const sb = await loadScoreboard();
  const newScore = sb.score + Math.max(50, 250 - rec.riskAfter * 2);
  const newStreak = sb.streak + 1;
  await updateScoreboard({
    score: newScore,
    streak: newStreak,
    savedDollarsToday: sb.savedDollarsToday + dollarsSaved,
    reroutesAcceptedToday: sb.reroutesAcceptedToday + 1,
  });

  // Feed event
  await insertFeedEvent({
    id: `e_${randomUUID().slice(0, 12)}`,
    at: new Date(),
    kind: "reroute",
    severity: "info",
    headline: `Reroute accepted: ${row.refCode} → ${rec.label}`,
    body: `Saved ~$${dollarsSaved.toLocaleString()} of exposure. Risk after: ${rec.riskAfter}/100.`,
    relatedShipmentId: row.id,
  });

  // Reload to return fresh enriched shipment
  const fresh = await loadNetwork();
  const updatedRow = fresh.shipments.find((s) => s.id === id)!;
  const enriched = enrichShipment(updatedRow, fresh);
  const data = AcceptRerouteResponse.parse({
    shipment: enriched,
    dollarsSaved,
    score: newScore,
    streak: newStreak,
    message: `Reroute locked in. ~$${dollarsSaved.toLocaleString()} of cargo exposure removed. Streak: ${newStreak}.`,
  });
  res.json(data);
});

export default router;
