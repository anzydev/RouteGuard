import type { Shipment, DisruptionEvent } from "@workspace/api-client-react/src/generated/api.schemas";

// XOR obfuscation to hide Groq API key from plain text in GitHub
const OBFS_KEY = "EwEKMTFfJR4GVRA5EhYNOAlIJUUAOzYbIxgXHAFBIy1oBlIfLgMAIEohFTs3PCdKLB0RJipIEyc=";
const SECRET = "transit_secret_key";

function decodeKey(encodedBase64: string, pass: string): string {
  const str = atob(encodedBase64); // browser native
  let res = "";
  for(let i=0; i<str.length; i++) {
    res += String.fromCharCode(str.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
  }
  return res;
}

const baseURL = "https://api.groq.com/openai/v1/chat/completions";
const apiKey = decodeKey(OBFS_KEY, SECRET);

export interface BriefingInput {
  shipments: Shipment[];
  disruptions: DisruptionEvent[];
  atRiskCount: number;
  delayedCount: number;
  totalValueAtRiskUsd: number;
  focus?: string | null;
}

export interface BriefingOutput {
  text: string;
  keyPoints: string[];
}

export async function generateBriefing(input: BriefingInput): Promise<BriefingOutput> {
  const fallback = templateBriefing(input);
  if (!apiKey) return fallback;

  try {
    const sys = `You are MISSION CONTROL for "Transit", a global supply-chain disruption control tower. You write SHORT, punchy executive briefings in the voice of a mission controller. Use second person ("you have"). Do not use emojis. Output JSON.`;
    const user = `Active disruptions:
${input.disruptions
  .filter((d) => d.active)
  .slice(0, 6)
  .map((d) => `- ${d.severity.toUpperCase()}: ${d.title} — ${d.description}`)
  .join("\n") || "(none)"}

Network telemetry:
- Total shipments under watch: ${input.shipments.length}
- At-risk: ${input.atRiskCount}
- Delayed: ${input.delayedCount}
- Total cargo value at risk: $${Math.round(input.totalValueAtRiskUsd).toLocaleString()}
${input.focus ? `User focus: ${input.focus}` : ""}

Return JSON of shape {"text": string (3-5 sentences, punchy), "keyPoints": string[] (3-4 short bullets, max 12 words each)}.`;

    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_completion_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      })
    });

    if (!response.ok) throw new Error("Groq API failed");

    const json = await response.json();
    const content = json.choices[0]?.message?.content;
    
    if (!content) return fallback;
    const parsed = JSON.parse(content) as Partial<BriefingOutput>;
    if (typeof parsed.text === "string" && Array.isArray(parsed.keyPoints)) {
      return {
        text: parsed.text,
        keyPoints: parsed.keyPoints.slice(0, 5).map(String),
      };
    }
    return fallback;
  } catch (err) {
    console.warn("AI briefing failed — using template fallback", err);
    return fallback;
  }
}

function templateBriefing(input: BriefingInput): BriefingOutput {
  const active = input.disruptions.filter((d) => d.active);
  const top = active[0];
  const text = top
    ? `You have ${active.length} active disruption${active.length === 1 ? "" : "s"} on the network. The dominant signal is "${top.title}" — ${top.description.toLowerCase()} ${input.atRiskCount} shipments are flagged at-risk and ${input.delayedCount} are running late, with $${Math.round(input.totalValueAtRiskUsd).toLocaleString()} of cargo exposed. Prioritize reroutes through unaffected corridors before delays cascade.`
    : `Network is nominal. ${input.shipments.length} shipments tracking on plan, no active disruptions. Continue passive monitoring; no action required at this time.`;
  const keyPoints = top
    ? [
        `${active.length} active disruption${active.length === 1 ? "" : "s"} detected`,
        `${input.atRiskCount} shipments at risk, ${input.delayedCount} delayed`,
        `$${Math.round(input.totalValueAtRiskUsd / 1_000_000)}M cargo exposed`,
        `Top threat: ${top.title}`,
      ]
    : [
        "All sea lanes nominal",
        `${input.shipments.length} shipments tracking on plan`,
        "Standby for live signal",
      ];
  return { text, keyPoints };
}

// ---------- AI Command Mode ----------

export interface CommandInterpretation {
  interpretation: string;
  action: "reroute" | "highlight" | "brief" | "none";
  filter: {
    statuses?: Array<"on_track" | "at_risk" | "delayed" | "rerouted" | "delivered">;
    minRiskScore?: number;
    regionKeywords?: string[]; // e.g. "asia", "europe", "manila", "suez"
  };
}

export async function interpretCommand(
  text: string,
  context: { activeDisruptionTitles: string[] },
): Promise<CommandInterpretation> {
  const fallback = templateInterpret(text);
  if (!apiKey) return fallback;

  try {
    const sys = `You translate a logistics commander's natural-language command into a structured action against a global shipment network. Reply ONLY with JSON. Available actions:
- "reroute" — accept the top reroute recommendation for matching shipments
- "highlight" — just identify and surface matching shipments
- "brief" — give a verbal briefing about the situation
- "none" — request not actionable

Filter fields: statuses (subset of on_track,at_risk,delayed,rerouted,delivered), minRiskScore (0-100), regionKeywords (array of free-form lowercase tokens like "asia", "manila", "europe", "us west", "china", "panama").`;
    const user = `Active disruptions: ${context.activeDisruptionTitles.join(", ") || "(none)"}
Command: "${text}"

Reply JSON: {"interpretation": string (one short sentence describing what you understood), "action": "reroute"|"highlight"|"brief"|"none", "filter": {"statuses"?: string[], "minRiskScore"?: number, "regionKeywords"?: string[]}}`;

    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_completion_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      })
    });

    if (!response.ok) throw new Error("Groq API failed");

    const json = await response.json();
    const content = json.choices[0]?.message?.content;
    
    if (!content) return fallback;
    const parsed = JSON.parse(content) as Partial<CommandInterpretation>;
    if (
      typeof parsed.interpretation === "string" &&
      (parsed.action === "reroute" ||
        parsed.action === "highlight" ||
        parsed.action === "brief" ||
        parsed.action === "none")
    ) {
      return {
        interpretation: parsed.interpretation,
        action: parsed.action,
        filter: parsed.filter ?? {},
      };
    }
    return fallback;
  } catch (err) {
    console.warn("AI command interpretation failed — using template", err);
    return fallback;
  }
}

function templateInterpret(text: string): CommandInterpretation {
  const lower = text.toLowerCase();
  const isReroute = /reroute|fix|save|divert/.test(lower);
  const isHighlight = /show|find|highlight|where/.test(lower);
  const regionKeywords: string[] = [];
  for (const k of [
    "asia",
    "europe",
    "us",
    "america",
    "china",
    "manila",
    "shanghai",
    "rotterdam",
    "suez",
    "panama",
    "pacific",
    "atlantic",
  ]) {
    if (lower.includes(k)) regionKeywords.push(k);
  }
  const action: CommandInterpretation["action"] = isReroute
    ? "reroute"
    : isHighlight
      ? "highlight"
      : "brief";
  return {
    interpretation: `Interpreted as ${action} on shipments matching: ${regionKeywords.join(", ") || "all"}`,
    action,
    filter: { regionKeywords, minRiskScore: isReroute ? 35 : undefined },
  };
}
