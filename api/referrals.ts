import { referralRouter } from "../src/server/referralRouter.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { requireAdminMenuPermission } from "../src/server/adminMenuAuthorization.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/admin/referrals", requireAdmin, requireAdminMenuPermission("referrals"), referralRouter);
  app.use("/admin/referrals", requireAdmin, requireAdminMenuPermission("referrals"), referralRouter);
});
