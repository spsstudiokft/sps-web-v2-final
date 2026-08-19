import budgetRouter from "../src/server/budgetRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/budgets", requireAdmin, budgetRouter);
  app.use("/admin/budgets", requireAdmin, budgetRouter);
});
