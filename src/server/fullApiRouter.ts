import { Router } from "express";
import coreRouter from "./api.js";
import { requireAdmin, requireAuth, requireClient } from "./authMiddleware.js";
import adminRouter from "./adminRouter.js";
import clientRouter from "./clientRouter.js";
import budgetRouter from "./budgetRouter.js";
import { invoiceRouter } from "./invoiceRouter.js";
import { paymentRequestRouter } from "./paymentRequestRouter.js";
import { referralRouter } from "./referralRouter.js";
import { publicInvoiceRouter } from "./invoiceRouter.js";
import { publicReferralRouter } from "./referralRouter.js";
import systemRouter from "./systemRouter.js";
import { db } from "../db.js";
import { requireAdminOrListingUpload } from "./listingUploadAuth.js";
import { requireAdminMenuPermission } from "./adminMenuAuthorization.js";

const fullApiRouter = Router();

fullApiRouter.use(systemRouter);
fullApiRouter.use(coreRouter);
fullApiRouter.use("/public/invoices", publicInvoiceRouter);
fullApiRouter.use("/public/referrals", publicReferralRouter);
fullApiRouter.use("/admin/budgets", requireAdmin, requireAdminMenuPermission("budget"), budgetRouter);
fullApiRouter.use("/admin/invoices", requireAdmin, requireAdminMenuPermission("invoices"), invoiceRouter);
fullApiRouter.use("/admin/payment-requests", requireAdmin, requireAdminMenuPermission("payment_requests"), paymentRequestRouter);
fullApiRouter.use("/admin/referrals", requireAdmin, requireAdminMenuPermission("referrals"), referralRouter);
fullApiRouter.use("/admin", requireAdminOrListingUpload, requireAdminMenuPermission(), adminRouter);
fullApiRouter.use("/property-manager", (req: any, res, next) => requireAuth(req, res, async () => {
  if (req.user?.role !== "property_client" || req.user?.scope !== "property-listings" || !req.user?.propertyAccountId) {
    return res.status(403).json({ error: "Érvénytelen ingatlanos munkamenet." });
  }
  try {
    const account = await db.execute({ sql: `SELECT pla.id FROM property_listing_accounts pla JOIN users u ON u.id = pla.portal_user_id
      WHERE pla.id = ? AND pla.portal_user_id = ? AND pla.is_active = 1 AND u.is_active = 1 LIMIT 1`, args: [req.user.propertyAccountId, req.user.id] });
    if (!account.rows.length) return res.status(403).json({ error: "A hirdetői fiók nem aktív." });
    next();
  } catch (error) {
    console.error("Failed to verify property-manager session", error);
    res.status(500).json({ error: "A hirdetői munkamenet nem ellenőrizhető." });
  }
}), clientRouter);
fullApiRouter.use("/client", requireClient, clientRouter);

export default fullApiRouter;
