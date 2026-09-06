import { paymentRequestRouter } from "../src/server/paymentRequestRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { requireAdminMenuPermission } from "../src/server/adminMenuAuthorization.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/payment-requests", requireAdmin, requireAdminMenuPermission("payment_requests"), paymentRequestRouter);
  app.use("/admin/payment-requests", requireAdmin, requireAdminMenuPermission("payment_requests"), paymentRequestRouter);
});
