import { Router, type IRouter } from "express";
import { GetSummaryResponse } from "@workspace/api-zod";
import { loadNetwork, enrichAll, loadScoreboard } from "../lib/queries";

const router: IRouter = Router();

router.get("/summary", async (_req, res) => {
  const snapshot = await loadNetwork();
  const enriched = enrichAll(snapshot);
  const scoreboard = await loadScoreboard();

  const onTrackCount = enriched.filter((s) => s.status === "on_track").length;
  const atRiskCount = enriched.filter((s) => s.status === "at_risk").length;
  const delayedCount = enriched.filter((s) => s.status === "delayed").length;
  const reroutedCount = enriched.filter((s) => s.status === "rerouted").length;
  const deliveredCount = enriched.filter((s) => s.status === "delivered").length;

  const exposed = enriched.filter(
    (s) => s.status === "at_risk" || s.status === "delayed",
  );
  const totalValueAtRiskUsd = exposed.reduce(
    (acc, s) => acc + s.cargoValueUsd,
    0,
  );
  const avgEtaDeltaHours = enriched.length
    ? Math.round(
        (enriched.reduce((acc, s) => acc + s.etaDeltaHours, 0) /
          enriched.length) *
          10,
      ) / 10
    : 0;

  const activeDisruptions = snapshot.disruptions.filter((d) => d.active).length;

  const topAtRiskShipmentIds = [...exposed]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map((s) => s.id);

  const modeCounts = new Map<string, { count: number; atRiskCount: number }>();
  for (const s of enriched) {
    const cur = modeCounts.get(s.mode) ?? { count: 0, atRiskCount: 0 };
    cur.count += 1;
    if (s.status === "at_risk" || s.status === "delayed") cur.atRiskCount += 1;
    modeCounts.set(s.mode, cur);
  }
  const modeBreakdown = Array.from(modeCounts.entries()).map(
    ([mode, v]) => ({ mode, count: v.count, atRiskCount: v.atRiskCount }),
  );

  const buckets = [
    { bucket: "safe", min: 0, max: 25 },
    { bucket: "watch", min: 26, max: 55 },
    { bucket: "warning", min: 56, max: 75 },
    { bucket: "critical", min: 76, max: 100 },
  ];
  const riskBuckets = buckets.map((b) => ({
    bucket: b.bucket,
    count: enriched.filter((s) => s.riskScore >= b.min && s.riskScore <= b.max)
      .length,
  }));

  const data = GetSummaryResponse.parse({
    totalShipments: enriched.length,
    onTrackCount,
    atRiskCount,
    delayedCount,
    reroutedCount,
    deliveredCount,
    totalValueAtRiskUsd,
    avgEtaDeltaHours,
    activeDisruptions,
    score: scoreboard.score,
    streak: scoreboard.streak,
    savedDollarsToday: scoreboard.savedDollarsToday,
    reroutesAcceptedToday: scoreboard.reroutesAcceptedToday,
    topAtRiskShipmentIds,
    modeBreakdown,
    riskBuckets,
  });
  res.json(data);
});

export default router;
