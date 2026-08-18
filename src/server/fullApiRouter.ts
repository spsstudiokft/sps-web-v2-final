import { Router } from "express";
import coreRouter from "./api.js";
import { requireAdmin, requireClient } from "./authMiddleware.js";
import adminRouter from "./adminRouter.js";
import clientRouter from "./clientRouter.js";
import budgetRouter from "./budgetRouter.js";
import { invoiceRouter } from "./invoiceRouter.js";
import { paymentRequestRouter } from "./paymentRequestRouter.js";
import { referralRouter } from "./referralRouter.js";

const fullApiRouter = Router();

fullApiRouter.use(coreRouter);
fullApiRouter.use("/admin/budgets", requireAdmin, budgetRouter);
fullApiRouter.use("/admin/invoices", requireAdmin, invoiceRouter);
fullApiRouter.use("/admin/payment-requests", requireAdmin, paymentRequestRouter);
fullApiRouter.use("/admin/referrals", requireAdmin, referralRouter);
fullApiRouter.use("/admin", requireAdmin, adminRouter);
fullApiRouter.use("/client", requireClient, clientRouter);

export default fullApiRouter;
