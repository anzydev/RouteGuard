import { Router, type IRouter } from "express";
import { ListEventsQueryParams, ListEventsResponse } from "@workspace/api-zod";
import { listFeedEvents } from "../lib/data-store";

const router: IRouter = Router();

router.get("/events", async (req, res) => {
  const query = ListEventsQueryParams.parse(req.query);
  const limit = query.limit ?? 50;
  const rows = await listFeedEvents(limit);
  const data = ListEventsResponse.parse(
    rows.map((r) => ({ ...r, at: r.at.toISOString() })),
  );
  res.json(data);
});

export default router;
