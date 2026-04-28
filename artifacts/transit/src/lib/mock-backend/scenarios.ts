/**
 * Disruption scenarios for the Global Chaos Panel.
 */

export type ScenarioId =
  | "suez_blocked"
  | "china_export_freeze"
  | "eu_port_strike"
  | "global_weather_chaos"
  | "la_port_congestion"
  | "panama_drought";

export type DisruptionType =
  | "typhoon"
  | "port_closure"
  | "strike"
  | "congestion"
  | "cyber"
  | "weather"
  | "geopolitical";
export type Severity = "low" | "medium" | "high" | "critical";

export interface ScenarioEvent {
  type: DisruptionType;
  title: string;
  description: string;
  lat: number;
  lng: number;
  radiusKm: number;
  severity: Severity;
  durationHours: number;
  affectedHubIds: string[];
  affectedLaneIds: string[];
}

export interface ScenarioDef {
  id: ScenarioId;
  label: string;
  briefSummary: string;
  events: ScenarioEvent[];
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  suez_blocked: {
    id: "suez_blocked",
    label: "SUEZ BLOCKED AGAIN",
    briefSummary:
      "A grounded mega-vessel has closed the Suez Canal in both directions. All Asia-Europe sea lanes routed through Suez are halted.",
    events: [
      {
        type: "port_closure",
        title: "Suez Canal Blocked",
        description:
          "Mega-vessel ran aground in the Suez. Bidirectional traffic halted; Asia–Europe sea freight via Suez is at a standstill.",
        lat: 30.5852,
        lng: 32.265,
        radiusKm: 600,
        severity: "critical",
        durationHours: 96,
        affectedHubIds: [],
        affectedLaneIds: [
          "l_sha_rtm",
          "l_sgp_rtm",
          "l_bom_rtm",
          "l_szx_ham",
          "l_dxb_rtm",
          "l_dxb_anr",
          "l_pus_rtm",
          "l_hkg_pir",
        ],
      },
    ],
  },
  china_export_freeze: {
    id: "china_export_freeze",
    label: "CHINA EXPORT FREEZE",
    briefSummary:
      "Sudden export controls and port lockdowns across mainland China. Shanghai, Shenzhen, and Hong Kong outbound capacity slashed.",
    events: [
      {
        type: "geopolitical",
        title: "China Export Controls",
        description:
          "Snap export-licensing freeze across mainland China ports. Outbound capacity at SHA, SZX, and HKG cut by 70%.",
        lat: 27,
        lng: 117,
        radiusKm: 1500,
        severity: "critical",
        durationHours: 72,
        affectedHubIds: ["h_sha", "h_szx", "h_hkg"],
        affectedLaneIds: [
          "l_sha_lax",
          "l_sha_oak",
          "l_szx_lax",
          "l_sha_rtm",
          "l_szx_ham",
          "l_szx_sgp",
          "l_hkg_sgp",
          "l_sha_nyc",
          "l_szx_sav",
        ],
      },
    ],
  },
  eu_port_strike: {
    id: "eu_port_strike",
    label: "EU PORT STRIKE",
    briefSummary:
      "Coordinated dockworker strikes at Rotterdam, Hamburg, and Antwerp. North-Sea throughput collapses.",
    events: [
      {
        type: "strike",
        title: "Rotterdam Dockworkers Strike",
        description:
          "48-hour wildcat strike at Rotterdam terminals. All inbound/outbound traffic halted.",
        lat: 51.95,
        lng: 4.14,
        radiusKm: 60,
        severity: "high",
        durationHours: 60,
        affectedHubIds: ["h_rtm"],
        affectedLaneIds: [
          "l_sha_rtm",
          "l_sgp_rtm",
          "l_bom_rtm",
          "l_dxb_rtm",
          "l_pus_rtm",
          "l_rtm_nyc",
          "l_ssz_rtm",
          "l_dur_rtm",
          "l_los_rtm",
        ],
      },
      {
        type: "strike",
        title: "Hamburg Solidarity Action",
        description:
          "Hamburg longshoremen join the strike in solidarity. Container yard operations frozen.",
        lat: 53.55,
        lng: 9.99,
        radiusKm: 50,
        severity: "high",
        durationHours: 48,
        affectedHubIds: ["h_ham"],
        affectedLaneIds: ["l_szx_ham", "l_ham_nyc", "l_pir_ham"],
      },
      {
        type: "strike",
        title: "Antwerp Walkout",
        description:
          "Antwerp port workers walk out. Belgian customs response delayed.",
        lat: 51.26,
        lng: 4.4,
        radiusKm: 40,
        severity: "medium",
        durationHours: 36,
        affectedHubIds: ["h_anr"],
        affectedLaneIds: ["l_dxb_anr", "l_anr_sav", "l_anr_fxt"],
      },
    ],
  },
  global_weather_chaos: {
    id: "global_weather_chaos",
    label: "GLOBAL WEATHER CHAOS",
    briefSummary:
      "Concurrent typhoons, atmospheric rivers, and a North-Atlantic storm front. Multiple regions hit simultaneously.",
    events: [
      {
        type: "typhoon",
        title: "Typhoon Hina (Cat 4) — South China Sea",
        description:
          "Cat-4 typhoon between Manila and Hong Kong. Trans-Pacific sailings rerouted; HKG air ops grounded.",
        lat: 18,
        lng: 117,
        radiusKm: 800,
        severity: "critical",
        durationHours: 60,
        affectedHubIds: ["h_mnl", "h_hkg", "h_hkga"],
        affectedLaneIds: [
          "l_mnl_lax",
          "l_hkg_sgp",
          "l_hkga_anc",
          "l_hkga_fra",
          "l_dxba_hkga",
        ],
      },
      {
        type: "weather",
        title: "Atmospheric River — US West Coast",
        description:
          "Pineapple Express hammering LA/LB and Oakland. Cranes idled; vessel queues forming.",
        lat: 34,
        lng: -120,
        radiusKm: 700,
        severity: "high",
        durationHours: 72,
        affectedHubIds: ["h_lax", "h_oak"],
        affectedLaneIds: ["l_sha_lax", "l_szx_lax", "l_pus_lax", "l_sgp_lax"],
      },
      {
        type: "weather",
        title: "North Atlantic Storm Front",
        description:
          "Force-10 storm system across the North Atlantic. ETA hits add 3-5 days for Europe-NYC sailings.",
        lat: 47,
        lng: -35,
        radiusKm: 1200,
        severity: "high",
        durationHours: 96,
        affectedHubIds: [],
        affectedLaneIds: ["l_rtm_nyc", "l_ham_nyc", "l_anr_sav", "l_leh_nyc"],
      },
    ],
  },
  la_port_congestion: {
    id: "la_port_congestion",
    label: "LA/LB MEGA-CONGESTION",
    briefSummary:
      "Vessel queue at Los Angeles / Long Beach explodes after a rail-handoff failure.",
    events: [
      {
        type: "congestion",
        title: "LA/LB Rail Handoff Collapse",
        description:
          "Rail interchange failure leaves 110+ vessels at anchor outside LA/LB. Dwell times triple.",
        lat: 33.74,
        lng: -118.27,
        radiusKm: 200,
        severity: "high",
        durationHours: 120,
        affectedHubIds: ["h_lax"],
        affectedLaneIds: ["l_sha_lax", "l_szx_lax", "l_pus_lax", "l_sgp_lax", "l_mnl_lax", "l_sgn_lax"],
      },
    ],
  },
  panama_drought: {
    id: "panama_drought",
    label: "PANAMA DROUGHT",
    briefSummary:
      "Panama Canal restricts daily transits due to record-low Gatun Lake levels.",
    events: [
      {
        type: "weather",
        title: "Panama Canal Transit Cap",
        description:
          "ACP slashes daily transits by 40%. Asia → US East Coast sailings face multi-day waits.",
        lat: 9.08,
        lng: -79.68,
        radiusKm: 200,
        severity: "high",
        durationHours: 168,
        affectedHubIds: [],
        affectedLaneIds: ["l_sha_nyc", "l_szx_sav"],
      },
    ],
  },
};
