import adminRouter from "../src/server/adminRouter.js";
import { createVercelApp } from "../src/server/vercelApp.js";
import { requireAdminOrListingUpload } from "../src/server/listingUploadAuth.js";
import { requireAdmin } from "../src/server/authMiddleware.js";
import { requireAdminMenuPermission } from "../src/server/adminMenuAuthorization.js";
import { exitCouponAdminRouter } from "../src/server/exitCouponRouter.js";
import { landingCampaignAdminRouter } from "../src/server/landingCampaignRouter.js";

export default createVercelApp((app) => {
  // Keep Vercel's split serverless entrypoint in parity with fullApiRouter.
  // Mount specialised routes before the broad admin router so they cannot be
  // swallowed by the fallback handler.
  app.use("/api/admin/campaigns", requireAdmin, requireAdminMenuPermission("marketing_emails"), landingCampaignAdminRouter);
  app.use("/admin/campaigns", requireAdmin, requireAdminMenuPermission("marketing_emails"), landingCampaignAdminRouter);
  app.use("/api/admin/exit-coupons", requireAdmin, requireAdminMenuPermission("marketing_emails"), exitCouponAdminRouter);
  app.use("/admin/exit-coupons", requireAdmin, requireAdminMenuPermission("marketing_emails"), exitCouponAdminRouter);
  app.use("/api/admin", requireAdminOrListingUpload, adminRouter);
  app.use("/admin", requireAdminOrListingUpload, adminRouter);
});
