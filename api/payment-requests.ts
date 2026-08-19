import { paymentRequestRouter } from "../src/server/paymentRequestRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/payment-requests", requireAdmin, paymentRequestRouter);
  app.use("/admin/payment-requests", requireAdmin, paymentRequestRouter);
});
