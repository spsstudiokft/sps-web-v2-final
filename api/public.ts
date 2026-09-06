import coreRouter from "../src/server/api.js";
import { createVercelApp } from "../src/server/vercelApp.js";
import { exitCouponPublicRouter } from "../src/server/exitCouponRouter.js";
import { landingCampaignPublicRouter } from "../src/server/landingCampaignRouter.js";
import { publicPushRouter } from "../src/server/publicPushRouter.js";

export default createVercelApp((app) => {
  // These specialized public routers are mounted before the core fallback to
  // keep the Vercel function equivalent to the full local API router.
  app.use("/api/public/campaigns", landingCampaignPublicRouter);
  app.use("/public/campaigns", landingCampaignPublicRouter);
  app.use("/api/public/push", publicPushRouter);
  app.use("/public/push", publicPushRouter);
  app.use("/api/public/exit-coupons", exitCouponPublicRouter);
  app.use("/public/exit-coupons", exitCouponPublicRouter);
  app.use("/api", coreRouter);
  app.use(coreRouter);
});
