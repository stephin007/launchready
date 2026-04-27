import { Router, type IRouter } from "express";
import healthRouter from "./health";
import prdsRouter from "./prds";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(prdsRouter);
router.use(adminRouter);

export default router;
