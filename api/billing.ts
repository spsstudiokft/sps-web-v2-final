import { Router } from "express";
import budgetRouter from "../src/server/budgetRouter.js";
import { invoiceRouter } from "../src/server/invoiceRouter.js";
import { paymentRequestRouter } from "../src/server/paymentRequestRouter.js";
import { referralRouter } from "../src/server/referralRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { createVercelApp } from "../src/server/vercelApp.js";

const billingRouter = Router();
billingRouter.use("/budgets", budgetRouter);
billingRouter.use("/invoices", invoiceRouter);
billingRouter.use("/payment-requests", paymentRequestRouter);
billingRouter.use("/referrals", referralRouter);

export default createVercelApp((app) => {
  app.use("/api/admin", requireAdmin, billingRouter);
  app.use("/admin", requireAdmin, billingRouter);
});
