import clientRouter from "../src/server/clientRouter.js";
import { requireAuth } from "../src/server/authMiddleware.js";
import { db } from "../src/db.js";
import { createVercelApp } from "../src/server/vercelApp.js";

export default createVercelApp((app) => {
  app.use("/api/property-manager", (req: any, res: any, next: any) => requireAuth(req, res, async () => {
    if (req.user?.role !== "property_client" || req.user?.scope !== "property-listings" || !req.user?.propertyAccountId) {
      return res.status(403).json({ error: "Érvénytelen ingatlanos munkamenet." });
    }
    try {
      const account = await db.execute({
        sql: `SELECT pla.id FROM property_listing_accounts pla
              JOIN users u ON u.id = pla.portal_user_id
              WHERE pla.id = ? AND pla.portal_user_id = ?
                AND pla.is_active = 1 AND u.is_active = 1 LIMIT 1`,
        args: [req.user.propertyAccountId, req.user.id],
      });
      if (!account.rows.length) return res.status(403).json({ error: "A hirdetői fiók nem aktív." });
      next();
    } catch (error) {
      console.error("Failed to verify property-manager session", error);
      res.status(500).json({ error: "A hirdetői munkamenet nem ellenőrizhető." });
    }
  }), clientRouter);
});
