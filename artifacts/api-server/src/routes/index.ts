import { Router, type IRouter } from "express";
import healthRouter from "./health";
import summaryRouter from "./summary";
import networkRouter from "./network";
import shipmentsRouter from "./shipments";
import disruptionsRouter from "./disruptions";
import eventsRouter from "./events";
import briefingRouter from "./briefing";
import commandRouter from "./command";
import scoreboardRouter from "./scoreboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(summaryRouter);
router.use(networkRouter);
router.use(shipmentsRouter);
router.use(disruptionsRouter);
router.use(eventsRouter);
router.use(briefingRouter);
router.use(commandRouter);
router.use(scoreboardRouter);

export default router;
