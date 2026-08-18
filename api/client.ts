import clientRouter from "../src/server/clientRouter.js";
import { requireClient } from "../src/server/authMiddleware.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/client", requireClient, clientRouter);
  app.use("/client", requireClient, clientRouter);
});
