import { Router, type IRouter } from "express";
import { ResetScoreboardResponse } from "@workspace/api-zod";
import { updateScoreboard } from "../lib/data-store";

const router: IRouter = Router();

router.post("/scoreboard/reset", async (_req, res) => {
  await updateScoreboard({
    score: 0,
    streak: 0,
    savedDollarsToday: 0,
    reroutesAcceptedToday: 0,
  });
  const data = ResetScoreboardResponse.parse({
    score: 0,
    streak: 0,
    savedDollarsToday: 0,
    reroutesAcceptedToday: 0,
  });
  res.json(data);
});

export default router;
