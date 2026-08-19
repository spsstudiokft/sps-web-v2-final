import { publicReferralRouter } from "../src/server/referralRouter.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/public/referrals", publicReferralRouter);
  app.use("/public/referrals", publicReferralRouter);
}, { initializeDatabase: false });
