import { Router } from "express";
import coreRouter from "./api.js";
import { requireAdmin, requireClient } from "./authMiddleware.js";
import adminRouter from "./adminRouter.js";
import clientRouter from "./clientRouter.js";
import budgetRouter from "./budgetRouter.js";
import { invoiceRouter } from "./invoiceRouter.js";
import { paymentRequestRouter } from "./paymentRequestRouter.js";
import { referralRouter } from "./referralRouter.js";
import { publicInvoiceRouter } from "./invoiceRouter.js";
import { publicReferralRouter } from "./referralRouter.js";
import systemRouter from "./systemRouter.js";

const fullApiRouter = Router();

fullApiRouter.use(systemRouter);
fullApiRouter.use(coreRouter);
fullApiRouter.use("/public/invoices", publicInvoiceRouter);
fullApiRouter.use("/public/referrals", publicReferralRouter);
fullApiRouter.use("/admin/budgets", requireAdmin, budgetRouter);
fullApiRouter.use("/admin/invoices", requireAdmin, invoiceRouter);
fullApiRouter.use("/admin/payment-requests", requireAdmin, paymentRequestRouter);
fullApiRouter.use("/admin/referrals", requireAdmin, referralRouter);
fullApiRouter.use("/admin", requireAdmin, adminRouter);
fullApiRouter.use("/client", requireClient, clientRouter);

export default fullApiRouter;
