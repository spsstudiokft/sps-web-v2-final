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

const fullApiRouter = Router();

fullApiRouter.use(systemRouter);
fullApiRouter.use(coreRouter);
fullApiRouter.use("/public/invoices", publicInvoiceRouter);
fullApiRouter.use("/public/referrals", publicReferralRouter);
fullApiRouter.use("/admin/budgets", requireAdmin, budgetRouter);
fullApiRouter.use("/admin/invoices", requireAdmin, invoiceRouter);
fullApiRouter.use("/admin/payment-requests", requireAdmin, paymentRequestRouter);
fullApiRouter.use("/admin/referrals", requireAdmin, referralRouter);
const listingUploadPath = /^\/media\/upload(?:\/|$)/;
fullApiRouter.use("/admin", (req: any, res, next) => {
  if (!listingUploadPath.test(req.path)) return requireAdmin(req, res, next);
  return requireAuth(req, res, async () => {
    if (["admin", "superadmin", "editor", "viewer"].includes(String(req.user?.role || ""))) return next();
    if (!["client", "property_client"].includes(String(req.user?.role || ""))) return res.status(403).json({ error: "Nincs médiafeltöltési jogosultság." });
    try {
      const account = await db.execute({ sql: `SELECT pla.id FROM property_listing_accounts pla JOIN users u ON u.id = pla.portal_user_id
        WHERE pla.portal_user_id = ? AND pla.is_active = 1 AND u.is_active = 1 LIMIT 1`, args: [req.user?.id] });
      if (account.rows.length === 0) return res.status(403).json({ error: "A hirdetői fiók aktiválása szükséges a médiafeltöltéshez." });
      next();
    } catch (error) {
      console.error("Failed to authorize property-listing upload", error);
      res.status(500).json({ error: "A médiafeltöltési jogosultság nem ellenőrizhető." });
    }
  });
}, adminRouter);
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
