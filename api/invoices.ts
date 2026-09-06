import { invoiceRouter } from "../src/server/invoiceRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { requireAdminMenuPermission } from "../src/server/adminMenuAuthorization.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/invoices", requireAdmin, requireAdminMenuPermission("invoices"), invoiceRouter);
  app.use("/admin/invoices", requireAdmin, requireAdminMenuPermission("invoices"), invoiceRouter);
});
