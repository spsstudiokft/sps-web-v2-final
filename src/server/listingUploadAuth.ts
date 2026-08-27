import { db } from "../db.js";
import { requireAdmin, requireAuth } from "./authMiddleware.js";

const listingUploadPath = /^\/media\/upload(?:\/|$)/;

export function requireAdminOrListingUpload(req: any, res: any, next: any) {
  if (!listingUploadPath.test(String(req.path || ""))) return requireAdmin(req, res, next);

  return requireAuth(req, res, async () => {
    const role = String(req.user?.role || "");
    if (["admin", "superadmin", "editor", "video_editor", "real_estate_agent", "advertiser", "viewer"].includes(role)) {
      return requireAdmin(req, res, next);
    }
    if (!(["client", "property_client"].includes(role))) {
      return res.status(403).json({ error: "Nincs médiafeltöltési jogosultság." });
    }
    if (role === "property_client" && (req.user?.scope !== "property-listings" || !req.user?.propertyAccountId)) {
      return res.status(403).json({ error: "Érvénytelen ingatlanos munkamenet." });
    }

    try {
      const account = role === "property_client"
        ? await db.execute({
            sql: `SELECT pla.id FROM property_listing_accounts pla
                  JOIN users u ON u.id = pla.portal_user_id
                  WHERE pla.id = ? AND pla.portal_user_id = ?
                    AND pla.is_active = 1 AND u.is_active = 1 LIMIT 1`,
            args: [req.user.propertyAccountId, req.user.id],
          })
        : await db.execute({
            sql: `SELECT pla.id FROM property_listing_accounts pla
                  JOIN users u ON u.id = pla.portal_user_id
                  WHERE pla.portal_user_id = ?
                    AND pla.is_active = 1 AND u.is_active = 1 LIMIT 1`,
            args: [req.user?.id],
          });
      if (!account.rows.length) {
        return res.status(403).json({ error: "A hirdetői fiók aktiválása szükséges a médiafeltöltéshez." });
      }
      next();
    } catch (error) {
      console.error("Failed to authorize property-listing upload", error);
      res.status(500).json({ error: "A médiafeltöltési jogosultság nem ellenőrizhető." });
    }
  });
}
