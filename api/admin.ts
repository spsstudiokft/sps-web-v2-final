import adminRouter from "../src/server/adminRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin", requireAdmin, adminRouter);
  app.use("/admin", requireAdmin, adminRouter);
});
