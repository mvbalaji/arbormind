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
import enquiriesRouter from "./enquiries";
import emailsRouter from "./emails";
import campaignsRouter from "./campaigns";
import importRouter from "./import";
import seedRouter from "./seed";
import emailSettingsRouter from "./email-settings";
import ordersRouter from "./orders";
import aiRouter from "./ai";
import approvalsRouter from "./approvals";
import entityNotesRouter from "./entity-notes";
import accessControlRouter from "./access-control";
import { seedAccessControl } from "../lib/access-control";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(emailSettingsRouter);
router.use(enquiriesRouter);
router.use(emailsRouter);
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
router.use(campaignsRouter);
router.use(importRouter);
router.use(seedRouter);
router.use(ordersRouter);
router.use(aiRouter);
router.use(approvalsRouter);
router.use(entityNotesRouter);
router.use(accessControlRouter);

// Idempotent seed of roles, screens, and default admin access on startup.
void seedAccessControl();

export default router;
