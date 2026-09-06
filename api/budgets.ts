import budgetRouter from "../src/server/budgetRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { requireAdminMenuPermission } from "../src/server/adminMenuAuthorization.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/budgets", requireAdmin, requireAdminMenuPermission("budget"), budgetRouter);
  app.use("/admin/budgets", requireAdmin, requireAdminMenuPermission("budget"), budgetRouter);
});
