import coreRouter from "../src/server/api.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api", coreRouter);
  app.use(coreRouter);
});
