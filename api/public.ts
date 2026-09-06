import coreRouter from "../src/server/api.js";
import { createVercelApp } from "../src/server/vercelApp.js";
import { exitCouponPublicRouter } from "../src/server/exitCouponRouter.js";
import { landingCampaignPublicRouter } from "../src/server/landingCampaignRouter.js";
import { publicPushRouter } from "../src/server/publicPushRouter.js";

export default createVercelApp((app) => {
  // These responses support the public SPA during crawler rendering. Allow
  // fetching them in robots.txt, while ensuring the JSON itself is not indexed.
  app.use((_, res, next) => {
    res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });

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
