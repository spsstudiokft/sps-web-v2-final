import adminRouter from "../src/server/adminRouter.js";
import { createVercelApp } from "../src/server/vercelApp.js";
import { requireAdminOrListingUpload } from "../src/server/listingUploadAuth.js";

export default createVercelApp((app) => {
  app.use("/api/admin", requireAdminOrListingUpload, adminRouter);
  app.use("/admin", requireAdminOrListingUpload, adminRouter);
});
