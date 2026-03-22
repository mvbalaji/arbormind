import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import accountsRouter from "./accounts";
import contactsRouter from "./contacts";
import leadsRouter from "./leads";
import opportunitiesRouter from "./opportunities";
import activitiesRouter from "./activities";
import productsRouter from "./products";
import casesRouter from "./cases";
import quotesRouter from "./quotes";
import reportsRouter from "./reports";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(accountsRouter);
router.use(contactsRouter);
router.use(leadsRouter);
router.use(opportunitiesRouter);
router.use(activitiesRouter);
router.use(productsRouter);
router.use(casesRouter);
router.use(quotesRouter);
router.use(reportsRouter);

export default router;
