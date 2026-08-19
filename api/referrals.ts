import { referralRouter } from "../src/server/referralRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/referrals", requireAdmin, referralRouter);
  app.use("/admin/referrals", requireAdmin, referralRouter);
});
