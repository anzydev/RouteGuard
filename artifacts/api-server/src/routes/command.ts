import { Router, type IRouter } from "express";
import { AiCommandBody, AiCommandResponse } from "@workspace/api-zod";
import {
  loadNetwork,
  enrichAll,
  loadScoreboard,
} from "../lib/queries";
import { interpretCommand } from "../lib/ai";
import { generateRecommendations } from "../lib/recommendations";
import { randomUUID } from "node:crypto";
import {
  insertFeedEvent,
  updateScoreboard,
  updateShipment,
} from "../lib/data-store";

const router: IRouter = Router();

const ASIA_HUBS = new Set([
  "h_sha",
  "h_szx",
  "h_hkg",
  "h_sgp",
  "h_pus",
  "h_tyo",
  "h_mnl",
  "h_bom",
  "h_sgn",
  "h_bkk",
  "h_hkga",
  "h_inca",
]);
const EUROPE_HUBS = new Set([
  "h_rtm",
  "h_ham",
  "h_anr",
  "h_fxt",
  "h_pir",
  "h_leh",
  "h_fra",
]);
const NA_HUBS = new Set([
  "h_lax",
  "h_oak",
  "h_sea",
  "h_yvr",
  "h_nyc",
  "h_sav",
  "h_hou",
  "h_anc",
  "h_mem",
]);

const HUB_TOKENS: Record<string, string[]> = {
  h_sha: ["shanghai", "china"],
  h_szx: ["shenzhen", "china"],
  h_hkg: ["hong kong", "china"],
  h_mnl: ["manila", "philippines"],
  h_sgp: ["singapore"],
  h_rtm: ["rotterdam", "netherlands"],
  h_ham: ["hamburg", "germany"],
  h_lax: ["la", "los angeles", "long beach", "us west", "uswest"],
  h_nyc: ["nyc", "new york", "us east"],
  h_dxb: ["dubai", "uae"],
  h_bom: ["mumbai", "india"],
};

function shipmentMatches(
  s: { originHubId: string; destinationHubId: string },
  keywords: string[],
): boolean {
  const k = keywords.map((x) => x.toLowerCase());
  for (const tok of k) {
    if (tok === "asia") {
      if (ASIA_HUBS.has(s.originHubId) || ASIA_HUBS.has(s.destinationHubId))
        return true;
    } else if (tok === "europe") {
      if (EUROPE_HUBS.has(s.originHubId) || EUROPE_HUBS.has(s.destinationHubId))
        return true;
    } else if (tok === "us" || tok === "america" || tok === "us east" || tok === "us west") {
      if (NA_HUBS.has(s.originHubId) || NA_HUBS.has(s.destinationHubId))
        return true;
    } else {
      for (const [hubId, tokens] of Object.entries(HUB_TOKENS)) {
        if (tokens.includes(tok)) {
          if (s.originHubId === hubId || s.destinationHubId === hubId)
            return true;
        }
      }
    }
  }
  return false;
}

router.post("/command", async (req, res) => {
  const { text } = AiCommandBody.parse(req.body);
  const snapshot = await loadNetwork();
  const enriched = enrichAll(snapshot);

  const interp = await interpretCommand(text, {
    activeDisruptionTitles: snapshot.disruptions
      .filter((d) => d.active)
      .map((d) => d.title),
  });

  // Match shipments
  let matches = enriched;
  if (interp.filter.statuses && interp.filter.statuses.length > 0) {
    const allowed = new Set(interp.filter.statuses);
    matches = matches.filter((s) => allowed.has(s.status));
  }
  if (interp.filter.minRiskScore !== undefined) {
    matches = matches.filter(
      (s) => s.riskScore >= (interp.filter.minRiskScore ?? 0),
    );
  }
  if (interp.filter.regionKeywords && interp.filter.regionKeywords.length > 0) {
    matches = matches.filter((s) =>
      shipmentMatches(s, interp.filter.regionKeywords ?? []),
    );
  }

  let appliedReroutes = 0;
  let dollarsSaved = 0;
  let scoreDelta = 0;
  let streakDelta = 0;

  if (interp.action === "reroute" && matches.length > 0) {
    // Apply top reroute to up to 25 shipments
    const targets = matches
      .filter((s) => !s.rerouted)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 25);

    for (const t of targets) {
      const row = snapshot.shipments.find((r) => r.id === t.id);
      if (!row) continue;
      const recs = generateRecommendations({
        shipment: row,
        hubs: snapshot.hubs,
        lanes: snapshot.lanes,
        disruptions: snapshot.disruptions,
        hubMap: snapshot.hubMap,
        laneMap: snapshot.laneMap,
      });
      const top = recs[0];
      if (!top) continue;
      const newCurrentEta = new Date(
        row.promisedEta.getTime() + top.etaDeltaHours * 3_600_000,
      );
      await updateShipment(row.id, {
        rerouted: true,
        viaHubIds: top.viaHubIds,
        currentEta: newCurrentEta,
      });
      const saved = Math.round(
        row.cargoValueUsd *
          Math.max(0.05, Math.min(0.4, (60 - top.riskAfter) / 100)),
      );
      dollarsSaved += saved;
      scoreDelta += Math.max(40, 200 - top.riskAfter * 2);
      appliedReroutes += 1;
    }
    if (appliedReroutes > 0) streakDelta = 1;
  }

  // Update scoreboard
  const sb = await loadScoreboard();
  const newScore = sb.score + scoreDelta;
  const newStreak = streakDelta > 0 ? sb.streak + streakDelta : sb.streak;
  if (scoreDelta > 0 || dollarsSaved > 0) {
    await updateScoreboard({
      score: newScore,
      streak: newStreak,
      savedDollarsToday: sb.savedDollarsToday + dollarsSaved,
      reroutesAcceptedToday: sb.reroutesAcceptedToday + appliedReroutes,
    });
  }

  // Feed event
  await insertFeedEvent({
    id: `e_${randomUUID().slice(0, 12)}`,
    at: new Date(),
    kind: "ai",
    severity: "info",
    headline: `AI COMMAND: "${text.slice(0, 80)}"`,
    body: `${interp.interpretation} — ${matches.length} shipments matched, ${appliedReroutes} rerouted, $${dollarsSaved.toLocaleString()} saved.`,
    relatedShipmentId: null,
  });

  const data = AiCommandResponse.parse({
    interpretation: interp.interpretation,
    action: interp.action,
    affectedShipmentIds: matches.map((s) => s.id),
    appliedReroutes,
    dollarsSaved,
    score: newScore,
    streak: newStreak,
  });
  res.json(data);
});

export default router;
