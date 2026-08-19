import systemRouter from "../src/server/systemRouter.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api", systemRouter);
  app.use(systemRouter);
}, { initializeDatabase: false });
