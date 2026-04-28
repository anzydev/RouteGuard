/**
 * Network seed data + graph routing for Transit.
 * Hubs are real-world global nodes; lanes are weighted edges.
 */

export type HubType = "port" | "airport" | "warehouse" | "terminal";
export type LaneMode = "sea" | "air" | "road" | "rail";

export interface SeedHub {
  id: string;
  code: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  type: HubType;
  region: "asia" | "europe" | "namerica" | "samerica" | "mideast" | "africa" | "oceania";
}

export interface SeedLane {
  id: string;
  originHubId: string;
  destinationHubId: string;
  mode: LaneMode;
  baselineHours: number;
}

export const SEED_HUBS: SeedHub[] = [
  // ------- Asia (sea ports)
  { id: "h_sha", code: "SHA", name: "Shanghai", country: "CN", lat: 31.23, lng: 121.47, type: "port", region: "asia" },
  { id: "h_szx", code: "SZX", name: "Shenzhen", country: "CN", lat: 22.54, lng: 114.06, type: "port", region: "asia" },
  { id: "h_hkg", code: "HKG", name: "Hong Kong", country: "HK", lat: 22.30, lng: 114.17, type: "port", region: "asia" },
  { id: "h_sgp", code: "SGP", name: "Singapore", country: "SG", lat: 1.29, lng: 103.85, type: "port", region: "asia" },
  { id: "h_pus", code: "PUS", name: "Busan", country: "KR", lat: 35.10, lng: 129.04, type: "port", region: "asia" },
  { id: "h_tyo", code: "TYO", name: "Tokyo / Yokohama", country: "JP", lat: 35.45, lng: 139.64, type: "port", region: "asia" },
  { id: "h_mnl", code: "MNL", name: "Manila", country: "PH", lat: 14.59, lng: 120.97, type: "port", region: "asia" },
  { id: "h_bom", code: "BOM", name: "Mumbai (JNPT)", country: "IN", lat: 18.95, lng: 72.95, type: "port", region: "asia" },
  { id: "h_sgn", code: "SGN", name: "Ho Chi Minh", country: "VN", lat: 10.77, lng: 106.70, type: "port", region: "asia" },
  { id: "h_bkk", code: "BKK", name: "Laem Chabang", country: "TH", lat: 13.08, lng: 100.88, type: "port", region: "asia" },

  // ------- Middle East
  { id: "h_dxb", code: "DXB", name: "Jebel Ali (Dubai)", country: "AE", lat: 24.99, lng: 55.05, type: "port", region: "mideast" },

  // ------- Europe
  { id: "h_rtm", code: "RTM", name: "Rotterdam", country: "NL", lat: 51.95, lng: 4.14, type: "port", region: "europe" },
  { id: "h_ham", code: "HAM", name: "Hamburg", country: "DE", lat: 53.55, lng: 9.99, type: "port", region: "europe" },
  { id: "h_anr", code: "ANR", name: "Antwerp", country: "BE", lat: 51.26, lng: 4.40, type: "port", region: "europe" },
  { id: "h_fxt", code: "FXT", name: "Felixstowe", country: "GB", lat: 51.96, lng: 1.32, type: "port", region: "europe" },
  { id: "h_pir", code: "PIR", name: "Piraeus", country: "GR", lat: 37.94, lng: 23.65, type: "port", region: "europe" },
  { id: "h_leh", code: "LEH", name: "Le Havre", country: "FR", lat: 49.49, lng: 0.11, type: "port", region: "europe" },

  // ------- North America
  { id: "h_lax", code: "LAX", name: "Los Angeles / Long Beach", country: "US", lat: 33.74, lng: -118.27, type: "port", region: "namerica" },
  { id: "h_oak", code: "OAK", name: "Oakland", country: "US", lat: 37.80, lng: -122.30, type: "port", region: "namerica" },
  { id: "h_sea", code: "SEA", name: "Seattle / Tacoma", country: "US", lat: 47.27, lng: -122.42, type: "port", region: "namerica" },
  { id: "h_yvr", code: "YVR", name: "Vancouver", country: "CA", lat: 49.29, lng: -123.10, type: "port", region: "namerica" },
  { id: "h_nyc", code: "NYC", name: "New York / NJ", country: "US", lat: 40.66, lng: -74.04, type: "port", region: "namerica" },
  { id: "h_sav", code: "SAV", name: "Savannah", country: "US", lat: 32.13, lng: -81.14, type: "port", region: "namerica" },
  { id: "h_hou", code: "HOU", name: "Houston", country: "US", lat: 29.72, lng: -95.02, type: "port", region: "namerica" },

  // ------- South America
  { id: "h_ssz", code: "SSZ", name: "Santos", country: "BR", lat: -23.96, lng: -46.33, type: "port", region: "samerica" },
  { id: "h_ctg", code: "CTG", name: "Cartagena", country: "CO", lat: 10.41, lng: -75.55, type: "port", region: "samerica" },

  // ------- Africa
  { id: "h_dur", code: "DUR", name: "Durban", country: "ZA", lat: -29.87, lng: 31.03, type: "port", region: "africa" },
  { id: "h_los", code: "LOS", name: "Lagos (Apapa)", country: "NG", lat: 6.45, lng: 3.36, type: "port", region: "africa" },

  // ------- Air hubs
  { id: "h_anc", code: "ANC", name: "Anchorage Air", country: "US", lat: 61.17, lng: -149.99, type: "airport", region: "namerica" },
  { id: "h_mem", code: "MEM", name: "Memphis Air", country: "US", lat: 35.04, lng: -89.98, type: "airport", region: "namerica" },
  { id: "h_fra", code: "FRA", name: "Frankfurt Air", country: "DE", lat: 50.04, lng: 8.56, type: "airport", region: "europe" },
  { id: "h_hkga", code: "HKGA", name: "Hong Kong Air", country: "HK", lat: 22.31, lng: 113.92, type: "airport", region: "asia" },
  { id: "h_dxba", code: "DXBA", name: "Dubai Air", country: "AE", lat: 25.25, lng: 55.36, type: "airport", region: "mideast" },
  { id: "h_inca", code: "ICN", name: "Incheon Air", country: "KR", lat: 37.46, lng: 126.44, type: "airport", region: "asia" },

  // ------- Oceania
  { id: "h_syd", code: "SYD", name: "Sydney", country: "AU", lat: -33.87, lng: 151.21, type: "port", region: "oceania" },
];

export const SEED_LANES: SeedLane[] = [
  // Trans-Pacific (Asia → US West)
  { id: "l_sha_lax", originHubId: "h_sha", destinationHubId: "h_lax", mode: "sea", baselineHours: 14 * 24 },
  { id: "l_sha_oak", originHubId: "h_sha", destinationHubId: "h_oak", mode: "sea", baselineHours: 15 * 24 },
  { id: "l_szx_lax", originHubId: "h_szx", destinationHubId: "h_lax", mode: "sea", baselineHours: 15 * 24 },
  { id: "l_pus_lax", originHubId: "h_pus", destinationHubId: "h_lax", mode: "sea", baselineHours: 13 * 24 },
  { id: "l_tyo_sea", originHubId: "h_tyo", destinationHubId: "h_sea", mode: "sea", baselineHours: 11 * 24 },
  { id: "l_pus_yvr", originHubId: "h_pus", destinationHubId: "h_yvr", mode: "sea", baselineHours: 12 * 24 },
  { id: "l_sgp_lax", originHubId: "h_sgp", destinationHubId: "h_lax", mode: "sea", baselineHours: 21 * 24 },
  { id: "l_mnl_lax", originHubId: "h_mnl", destinationHubId: "h_lax", mode: "sea", baselineHours: 16 * 24 },
  { id: "l_sgn_lax", originHubId: "h_sgn", destinationHubId: "h_lax", mode: "sea", baselineHours: 17 * 24 },

  // Trans-Pacific transshipment
  { id: "l_sha_pus", originHubId: "h_sha", destinationHubId: "h_pus", mode: "sea", baselineHours: 2 * 24 },
  { id: "l_szx_sgp", originHubId: "h_szx", destinationHubId: "h_sgp", mode: "sea", baselineHours: 4 * 24 },
  { id: "l_hkg_sgp", originHubId: "h_hkg", destinationHubId: "h_sgp", mode: "sea", baselineHours: 4 * 24 },

  // Asia → Europe (Suez)
  { id: "l_sha_rtm", originHubId: "h_sha", destinationHubId: "h_rtm", mode: "sea", baselineHours: 32 * 24 },
  { id: "l_sgp_rtm", originHubId: "h_sgp", destinationHubId: "h_rtm", mode: "sea", baselineHours: 25 * 24 },
  { id: "l_bom_rtm", originHubId: "h_bom", destinationHubId: "h_rtm", mode: "sea", baselineHours: 22 * 24 },
  { id: "l_szx_ham", originHubId: "h_szx", destinationHubId: "h_ham", mode: "sea", baselineHours: 33 * 24 },
  { id: "l_dxb_rtm", originHubId: "h_dxb", destinationHubId: "h_rtm", mode: "sea", baselineHours: 18 * 24 },
  { id: "l_dxb_anr", originHubId: "h_dxb", destinationHubId: "h_anr", mode: "sea", baselineHours: 19 * 24 },
  { id: "l_pus_rtm", originHubId: "h_pus", destinationHubId: "h_rtm", mode: "sea", baselineHours: 34 * 24 },
  { id: "l_hkg_pir", originHubId: "h_hkg", destinationHubId: "h_pir", mode: "sea", baselineHours: 26 * 24 },

  // Europe ↔ US East
  { id: "l_rtm_nyc", originHubId: "h_rtm", destinationHubId: "h_nyc", mode: "sea", baselineHours: 8 * 24 },
  { id: "l_ham_nyc", originHubId: "h_ham", destinationHubId: "h_nyc", mode: "sea", baselineHours: 9 * 24 },
  { id: "l_anr_sav", originHubId: "h_anr", destinationHubId: "h_sav", mode: "sea", baselineHours: 10 * 24 },
  { id: "l_leh_nyc", originHubId: "h_leh", destinationHubId: "h_nyc", mode: "sea", baselineHours: 8 * 24 },

  // Asia → US East via Panama
  { id: "l_sha_nyc", originHubId: "h_sha", destinationHubId: "h_nyc", mode: "sea", baselineHours: 32 * 24 },
  { id: "l_szx_sav", originHubId: "h_szx", destinationHubId: "h_sav", mode: "sea", baselineHours: 30 * 24 },

  // Intra-Europe
  { id: "l_rtm_ham", originHubId: "h_rtm", destinationHubId: "h_ham", mode: "sea", baselineHours: 1 * 24 },
  { id: "l_anr_fxt", originHubId: "h_anr", destinationHubId: "h_fxt", mode: "sea", baselineHours: 1 * 24 },
  { id: "l_pir_ham", originHubId: "h_pir", destinationHubId: "h_ham", mode: "sea", baselineHours: 8 * 24 },

  // South America
  { id: "l_ssz_nyc", originHubId: "h_ssz", destinationHubId: "h_nyc", mode: "sea", baselineHours: 14 * 24 },
  { id: "l_ssz_rtm", originHubId: "h_ssz", destinationHubId: "h_rtm", mode: "sea", baselineHours: 16 * 24 },
  { id: "l_ctg_hou", originHubId: "h_ctg", destinationHubId: "h_hou", mode: "sea", baselineHours: 5 * 24 },
  { id: "l_ctg_nyc", originHubId: "h_ctg", destinationHubId: "h_nyc", mode: "sea", baselineHours: 6 * 24 },

  // Africa
  { id: "l_dur_rtm", originHubId: "h_dur", destinationHubId: "h_rtm", mode: "sea", baselineHours: 24 * 24 },
  { id: "l_los_rtm", originHubId: "h_los", destinationHubId: "h_rtm", mode: "sea", baselineHours: 12 * 24 },
  { id: "l_dur_sgp", originHubId: "h_dur", destinationHubId: "h_sgp", mode: "sea", baselineHours: 16 * 24 },

  // Oceania
  { id: "l_syd_sgp", originHubId: "h_syd", destinationHubId: "h_sgp", mode: "sea", baselineHours: 12 * 24 },
  { id: "l_syd_lax", originHubId: "h_syd", destinationHubId: "h_lax", mode: "sea", baselineHours: 18 * 24 },

  // Air lanes (faster, costlier — used as reroutes)
  { id: "l_hkga_anc", originHubId: "h_hkga", destinationHubId: "h_anc", mode: "air", baselineHours: 12 },
  { id: "l_anc_mem", originHubId: "h_anc", destinationHubId: "h_mem", mode: "air", baselineHours: 8 },
  { id: "l_hkga_fra", originHubId: "h_hkga", destinationHubId: "h_fra", mode: "air", baselineHours: 13 },
  { id: "l_inca_anc", originHubId: "h_inca", destinationHubId: "h_anc", mode: "air", baselineHours: 11 },
  { id: "l_dxba_fra", originHubId: "h_dxba", destinationHubId: "h_fra", mode: "air", baselineHours: 7 },
  { id: "l_fra_mem", originHubId: "h_fra", destinationHubId: "h_mem", mode: "air", baselineHours: 10 },
  { id: "l_dxba_hkga", originHubId: "h_dxba", destinationHubId: "h_hkga", mode: "air", baselineHours: 8 },
];

// ---------- Graph ----------

export interface GraphEdge {
  laneId: string;
  to: string;
  mode: LaneMode;
  weight: number; // hours, adjusted for current risk
}

export interface RiskAdjustments {
  hubCongestion: Record<string, number>; // 0..100
  laneRiskMultiplier: Record<string, number>; // 1..N
  laneActive: Record<string, boolean>;
}

export interface LaneLike {
  id: string;
  originHubId: string;
  destinationHubId: string;
  mode: string;
  baselineHours: number;
}

export function buildAdjacency(
  lanes: LaneLike[],
  adj: RiskAdjustments,
): Map<string, GraphEdge[]> {
  const adjacency = new Map<string, GraphEdge[]>();
  for (const lane of lanes) {
    if (adj.laneActive[lane.id] === false) continue;
    const mult = adj.laneRiskMultiplier[lane.id] ?? 1;
    const congestion =
      ((adj.hubCongestion[lane.originHubId] ?? 0) +
        (adj.hubCongestion[lane.destinationHubId] ?? 0)) /
      2;
    // congestion adds up to ~30% extra hours
    const weight = lane.baselineHours * mult * (1 + congestion / 300);

    const mode = lane.mode as LaneMode;
    const fwd: GraphEdge = {
      laneId: lane.id,
      to: lane.destinationHubId,
      mode,
      weight,
    };
    const rev: GraphEdge = {
      laneId: lane.id,
      to: lane.originHubId,
      mode,
      weight: weight * 1.05,
    };
    if (!adjacency.has(lane.originHubId)) adjacency.set(lane.originHubId, []);
    if (!adjacency.has(lane.destinationHubId))
      adjacency.set(lane.destinationHubId, []);
    adjacency.get(lane.originHubId)!.push(fwd);
    adjacency.get(lane.destinationHubId)!.push(rev);
  }
  return adjacency;
}

export interface PathResult {
  hubs: string[]; // hub ids start..end
  lanes: string[];
  hours: number;
  mode: LaneMode;
}

/**
 * Yen's-lite: returns up to k shortest paths via Dijkstra with edge removals.
 */
export function kShortestPaths(
  adjacency: Map<string, GraphEdge[]>,
  source: string,
  target: string,
  k: number,
): PathResult[] {
  const results: PathResult[] = [];
  const removed = new Set<string>(); // laneIds to skip

  for (let i = 0; i < k; i++) {
    const path = dijkstra(adjacency, source, target, removed);
    if (!path) break;
    results.push(path);
    // remove the most-weighted lane in this path to force diversity
    if (path.lanes.length === 0) break;
    const middleLane = path.lanes[Math.floor(path.lanes.length / 2)];
    removed.add(middleLane);
  }
  return results;
}

function dijkstra(
  adjacency: Map<string, GraphEdge[]>,
  source: string,
  target: string,
  removedLaneIds: Set<string>,
): PathResult | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { hub: string; laneId: string; mode: LaneMode } | null>();
  const visited = new Set<string>();
  dist.set(source, 0);
  prev.set(source, null);

  // Simple priority queue via array
  const queue: Array<{ hub: string; d: number }> = [{ hub: source, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const { hub: u, d } = queue.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === target) break;
    const edges = adjacency.get(u) ?? [];
    for (const e of edges) {
      if (removedLaneIds.has(e.laneId)) continue;
      const nd = d + e.weight;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { hub: u, laneId: e.laneId, mode: e.mode });
        queue.push({ hub: e.to, d: nd });
      }
    }
  }

  if (!visited.has(target)) return null;
  // reconstruct
  const hubs: string[] = [];
  const lanes: string[] = [];
  let modeUsed: LaneMode = "sea";
  let cur: string | null = target;
  while (cur) {
    hubs.unshift(cur);
    const p = prev.get(cur);
    if (!p) break;
    lanes.unshift(p.laneId);
    modeUsed = p.mode;
    cur = p.hub;
  }
  return { hubs, lanes, hours: dist.get(target) ?? Infinity, mode: modeUsed };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}
