import { Router, type IRouter } from "express";
import {
  GenerateBriefingBody,
  GenerateBriefingResponse,
} from "@workspace/api-zod";
import { loadNetwork, enrichAll } from "../lib/queries";
import { generateBriefing } from "../lib/ai";

const router: IRouter = Router();

router.post("/briefing", async (req, res) => {
  const { focus } = GenerateBriefingBody.parse(req.body ?? {});
  const snapshot = await loadNetwork();
  const enriched = enrichAll(snapshot);
  const atRiskCount = enriched.filter((s) => s.status === "at_risk").length;
  const delayedCount = enriched.filter((s) => s.status === "delayed").length;
  const totalValueAtRiskUsd = enriched
    .filter((s) => s.status === "at_risk" || s.status === "delayed")
    .reduce((acc, s) => acc + s.cargoValueUsd, 0);

  const briefing = await generateBriefing({
    shipments: snapshot.shipments,
    disruptions: snapshot.disruptions,
    atRiskCount,
    delayedCount,
    totalValueAtRiskUsd,
    focus: focus ?? null,
  });

  const data = GenerateBriefingResponse.parse({
    text: briefing.text,
    keyPoints: briefing.keyPoints,
    generatedAt: new Date().toISOString(),
  });
  res.json(data);
});

export default router;
