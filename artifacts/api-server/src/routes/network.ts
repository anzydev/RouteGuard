import { Router, type IRouter } from "express";
import { ListHubsResponse, ListLanesResponse } from "@workspace/api-zod";
import { listHubs, listLanes } from "../lib/data-store";

const router: IRouter = Router();

router.get("/hubs", async (_req, res) => {
  const rows = await listHubs();
  const data = ListHubsResponse.parse(rows);
  res.json(data);
});

router.get("/lanes", async (_req, res) => {
  const rows = await listLanes();
  const data = ListLanesResponse.parse(rows);
  res.json(data);
});

export default router;
