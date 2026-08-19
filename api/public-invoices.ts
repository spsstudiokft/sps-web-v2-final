import { publicInvoiceRouter } from "../src/server/invoiceRouter.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/public/invoices", publicInvoiceRouter);
  app.use("/public/invoices", publicInvoiceRouter);
}, { initializeDatabase: false });
