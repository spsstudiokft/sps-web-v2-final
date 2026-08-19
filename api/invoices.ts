import { invoiceRouter } from "../src/server/invoiceRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/invoices", requireAdmin, invoiceRouter);
  app.use("/admin/invoices", requireAdmin, invoiceRouter);
});
