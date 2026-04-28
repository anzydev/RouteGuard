import {
  listHubs,
  listLanes,
  listShipments,
  listDisruptions,
  listFeedEvents,
  getScoreboard,
  updateShipment,
  updateScoreboard,
  resetShipmentReroutes,
  insertDisruptions,
  clearDisruptions,
  updateHubCongestion,
  incrementHubCongestion,
  insertFeedEvent
} from "./state";
import { generateBriefing, interpretCommand } from "./ai";
import { loadNetwork, enrichAll, loadScoreboard, clearRecommendations } from "./queries";
import { generateRecommendations } from "./recommendations";
import { SCENARIOS, type ScenarioId } from "./scenarios";

function browserUUID() {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
}

export async function mockRouter(method: string, url: string, body?: any) {
  console.log(`[MOCK BACKEND] ${method} ${url}`, body);

  const path = url.split('?')[0].replace('/api/', '');

  if (method === "GET" && path === "healthz") {
    return { status: "ok" };
  }

  if (method === "GET" && path === "summary") {
    const snapshot = await loadNetwork();
    const enriched = enrichAll(snapshot);
    const activeDisruptions = snapshot.disruptions.filter(d => d.active).length;
    const scoreboard = await loadScoreboard();

    let totalValueAtRisk = 0;
    let onTrackCount = 0;
    let atRiskCount = 0;
    let delayedCount = 0;
    let reroutedCount = 0;
    let deliveredCount = 0;
    let totalEtaDelta = 0;

    const modeCounts = { sea: 0, air: 0, road: 0, rail: 0 };
    const modeAtRisk = { sea: 0, air: 0, road: 0, rail: 0 };
    const riskBuckets = { safe: 0, watch: 0, warning: 0, critical: 0 };

    for (const s of enriched) {
      if (s.status === "on_track") onTrackCount++;
      if (s.status === "at_risk") atRiskCount++;
      if (s.status === "delayed") delayedCount++;
      if (s.status === "rerouted") reroutedCount++;
      if (s.status === "delivered") deliveredCount++;

      if (s.status === "at_risk" || s.status === "delayed") {
        totalValueAtRisk += s.cargoValueUsd;
      }
      
      totalEtaDelta += s.etaDeltaHours;
      
      const mode = s.mode as keyof typeof modeCounts;
      if (modeCounts[mode] !== undefined) modeCounts[mode]++;
      if ((s.status === "at_risk" || s.status === "delayed") && modeAtRisk[mode] !== undefined) modeAtRisk[mode]++;

      if (s.riskScore < 20) riskBuckets.safe++;
      else if (s.riskScore < 50) riskBuckets.watch++;
      else if (s.riskScore < 80) riskBuckets.warning++;
      else riskBuckets.critical++;
    }

    const topAtRiskShipmentIds = enriched
      .filter(s => s.status === "at_risk" || s.status === "delayed")
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
      .map(s => s.id);

    return {
      activeDisruptions,
      totalShipments: enriched.length,
      onTrackCount,
      atRiskCount,
      delayedCount,
      reroutedCount,
      deliveredCount,
      totalValueAtRiskUsd: totalValueAtRisk,
      avgEtaDeltaHours: enriched.length ? totalEtaDelta / enriched.length : 0,
      score: scoreboard.score,
      streak: scoreboard.streak,
      savedDollarsToday: scoreboard.savedDollarsToday,
      reroutesAcceptedToday: scoreboard.reroutesAcceptedToday,
      topAtRiskShipmentIds,
      modeBreakdown: [
        { mode: "sea", count: modeCounts.sea, atRiskCount: modeAtRisk.sea },
        { mode: "air", count: modeCounts.air, atRiskCount: modeAtRisk.air },
        { mode: "road", count: modeCounts.road, atRiskCount: modeAtRisk.road },
        { mode: "rail", count: modeCounts.rail, atRiskCount: modeAtRisk.rail },
      ],
      riskBuckets: [
        { bucket: "safe", count: riskBuckets.safe },
        { bucket: "watch", count: riskBuckets.watch },
        { bucket: "warning", count: riskBuckets.warning },
        { bucket: "critical", count: riskBuckets.critical },
      ],
    };
  }

  if (method === "GET" && path === "hubs") {
    return await listHubs();
  }

  if (method === "GET" && path === "events") {
    return await listFeedEvents();
  }

  if (method === "GET" && path === "lanes") {
    return await listLanes();
  }

  if (method === "GET" && path === "shipments") {
    const snapshot = await loadNetwork();
    return enrichAll(snapshot);
  }

  if (method === "GET" && path.startsWith("shipments/") && !path.endsWith("accept-reroute")) {
    const id = path.split('/')[1];
    const snapshot = await loadNetwork();
    const row = snapshot.shipments.find(s => s.id === id);
    if (!row) throw new Error("Shipment not found");
    
    const enriched = enrichAll(snapshot).find(s => s.id === id)!;
    const isAtRisk = enriched.status === "at_risk" || enriched.status === "delayed";
    
    let recommendations: any[] = [];
    if (isAtRisk && !row.rerouted) {
      recommendations = generateRecommendations({
        shipment: row,
        hubs: snapshot.hubs,
        lanes: snapshot.lanes,
        disruptions: snapshot.disruptions,
        hubMap: snapshot.hubMap,
        laneMap: snapshot.laneMap,
      });
    }

    return {
      shipment: enriched,
      timeline: [],
      recommendations,
    };
  }

  if (method === "POST" && path.match(/^shipments\/.*\/accept-reroute$/)) {
    const id = path.split('/')[1];
    const { recommendationId, viaHubIds, etaDeltaHours, costDeltaUsd, riskAfter } = body;
    const row = (await listShipments()).find(s => s.id === id);
    if (!row) throw new Error("Shipment not found");

    const newCurrentEta = new Date(row.promisedEta.getTime() + etaDeltaHours * 3_600_000);
    const updated = await updateShipment(id, {
      rerouted: true,
      viaHubIds,
      currentEta: newCurrentEta,
    });

    const saved = Math.round(row.cargoValueUsd * Math.max(0.05, Math.min(0.4, (60 - riskAfter) / 100)));
    const scoreDelta = Math.max(40, 200 - riskAfter * 2);

    const sb = await getScoreboard();
    await updateScoreboard({
      score: sb.score + scoreDelta,
      streak: sb.streak + 1,
      savedDollarsToday: sb.savedDollarsToday + saved,
      reroutesAcceptedToday: sb.reroutesAcceptedToday + 1,
    });

    await insertFeedEvent({
      id: `e_${browserUUID().slice(0, 12)}`,
      at: new Date(),
      kind: "info",
      severity: "success",
      headline: "REROUTE EXECUTED",
      body: `Shipment ${row.refCode} diverted. ETA impact mitigated, saving an estimated $${saved.toLocaleString()}.`,
      relatedShipmentId: id,
    });

    const snapshot = await loadNetwork();
    const enriched = enrichAll(snapshot).find(s => s.id === id)!;

    return {
      shipment: enriched,
      dollarsSaved: saved,
      score: sb.score + scoreDelta,
      streak: sb.streak + 1,
      message: `Shipment ${row.refCode} successfully rerouted.`
    };
  }

  if (method === "GET" && path === "disruptions") {
    const rows = await listDisruptions();
    const allShipments = await listShipments();
    
    // Very simplified enrichment for mock
    return rows.map((r: any) => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      expectedEndAt: r.expectedEndAt.toISOString(),
      affectedShipmentCount: Math.floor(allShipments.length * 0.15)
    }));
  }

  if (method === "POST" && path === "disruptions/simulate") {
    const { scenario } = body;
    const def = SCENARIOS[scenario as ScenarioId];
    if (!def) throw new Error("Unknown scenario");

    const now = new Date();
    const rows = def.events.map((e) => ({
      id: `d_${browserUUID().slice(0, 12)}`,
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

    for (const ev of def.events) {
      for (const hubId of ev.affectedHubIds) {
        await incrementHubCongestion(hubId, 35);
      }
    }

    await insertFeedEvent({
      id: `e_${browserUUID().slice(0, 12)}`,
      at: new Date(),
      kind: "disruption",
      severity: "critical",
      headline: `BREAKING: ${def.label}`,
      body: def.briefSummary,
      relatedShipmentId: null,
    });

    clearRecommendations();

    const enriched = rows.map((r: any) => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      expectedEndAt: r.expectedEndAt.toISOString(),
      affectedShipmentCount: 36,
    }));

    return {
      events: enriched,
      affectedShipmentIds: [],
      summary: def.briefSummary,
    };
  }

  if (method === "POST" && path === "disruptions/reset") {
    const cleared = await clearDisruptions();
    await resetShipmentReroutes();
    clearRecommendations();

    await insertFeedEvent({
      id: `e_${browserUUID().slice(0, 12)}`,
      at: new Date(),
      kind: "info",
      severity: "info",
      headline: "WORLD RESET",
      body: "All disruptions cleared. Shipments returned to original routes.",
      relatedShipmentId: null,
    });

    return { cleared };
  }

  if (method === "POST" && path === "command") {
    const { text } = body;
    const snapshot = await loadNetwork();
    const enriched = enrichAll(snapshot);

    const interp = await interpretCommand(text, {
      activeDisruptionTitles: snapshot.disruptions.filter(d => d.active).map(d => d.title)
    });

    let matches = enriched;
    // simplified matching for mock
    let appliedReroutes = 0;
    let dollarsSaved = 0;
    
    if (interp.action === "reroute") {
      const targets = matches.filter(s => !s.rerouted).slice(0, 25);
      for (const t of targets) {
        const row = snapshot.shipments.find(r => r.id === t.id);
        if (!row) continue;
        const recs = generateRecommendations({
          shipment: row,
          hubs: snapshot.hubs, lanes: snapshot.lanes, disruptions: snapshot.disruptions,
          hubMap: snapshot.hubMap, laneMap: snapshot.laneMap
        });
        const top = recs[0];
        if (!top) continue;
        
        await updateShipment(row.id, {
          rerouted: true,
          viaHubIds: top.viaHubIds,
          currentEta: new Date(row.promisedEta.getTime() + top.etaDeltaHours * 3_600_000)
        });
        
        dollarsSaved += 15000;
        appliedReroutes++;
      }
    }

    return {
      interpretation: interp.interpretation,
      action: interp.action,
      affectedShipmentIds: matches.map((s) => s.id),
      appliedReroutes,
      dollarsSaved,
      score: 100,
      streak: 1,
    };
  }

  if (method === "GET" && path === "scoreboard") {
    return await getScoreboard();
  }

  if (method === "POST" && path === "scoreboard/reset") {
    const fresh = await updateScoreboard({ score: 0, streak: 0, savedDollarsToday: 0, reroutesAcceptedToday: 0 });
    return fresh;
  }

  if (method === "POST" && path === "briefing") {
    const snapshot = await loadNetwork();
    const enriched = enrichAll(snapshot);
    let totalValueAtRisk = 0, atRiskShipments = 0, delayedShipments = 0;

    for (const s of enriched) {
      if (s.status === "at_risk" || s.status === "delayed") totalValueAtRisk += s.cargoValueUsd;
      if (s.status === "at_risk") atRiskShipments++;
      if (s.status === "delayed") delayedShipments++;
    }

    return await generateBriefing({
      shipments: snapshot.shipments,
      disruptions: snapshot.disruptions,
      atRiskCount: atRiskShipments,
      delayedCount: delayedShipments,
      totalValueAtRiskUsd: totalValueAtRisk,
      focus: body.focus
    });
  }

  throw new Error(`404: Mock route not found for ${method} ${path}`);
}
