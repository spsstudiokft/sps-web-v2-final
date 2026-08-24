import jwt from "jsonwebtoken";
import { db } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtstring";
const ACTIVITY_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const recentActivityUpdates = new Map<string, number>();

function recordUserActivity(userId: unknown) {
  const id = typeof userId === "string" ? userId.trim() : "";
  if (!id) return;

  const now = Date.now();
  const previousUpdate = recentActivityUpdates.get(id) || 0;
  if (now - previousUpdate < ACTIVITY_UPDATE_INTERVAL_MS) return;
  recentActivityUpdates.set(id, now);

  // Activity tracking must never delay or block an authenticated request.
  void db.execute({
    sql: "UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [id],
  }).catch((error) => {
    recentActivityUpdates.delete(id);
    console.warn("User activity update warning:", error);
  });
}

export const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const parts = authHeader.trim().split(/\s+/);
  const token = parts.length >= 2 && parts[0].toLowerCase() === "bearer"
    ? parts[1].trim()
    : parts.length === 1 && !parts[0].toLowerCase().startsWith("bearer")
      ? parts[0].trim()
      : "";

  if (!token || ["null", "undefined", "false", "[object Object]"].includes(token)) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    return res.status(401).json({ error: "Unauthorized: Invalid token format" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    recordUserActivity(req.user?.id);
    next();
  } catch (error: any) {
    const message = error.name === "TokenExpiredError"
      ? "Unauthorized: Session expired. Please log in again."
      : "Unauthorized: Invalid or expired token";
    return res.status(401).json({ error: message });
  }
};

export const requireAdmin = (req: any, res: any, next: any) => {
  requireAuth(req, res, async () => {
    const allowedRoles = ["admin", "editor", "viewer", "superadmin"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    try {
      const userCheck = await db.execute({
        sql: "SELECT is_active, role, admin_role, admin_is_active FROM users WHERE id = ?",
        args: [req.user.id],
      });
      const row: any = userCheck.rows[0];
      const primaryRole = String(row?.role || "").toLowerCase().replace(/[_-]/g, "");
      const secondaryRole = String(row?.admin_role || "").toLowerCase().replace(/[_-]/g, "");
      const tokenRole = String(req.user.role || "").toLowerCase().replace(/[_-]/g, "");
      const usesSecondaryAdmin = !allowedRoles.includes(primaryRole) && secondaryRole === tokenRole;
      if (!row || (usesSecondaryAdmin ? row.admin_is_active === 0 : row.is_active === 0)) {
        return res.status(403).json({ error: "Forbidden: Account is disabled" });
      }
      if (!allowedRoles.includes(primaryRole) && !allowedRoles.includes(secondaryRole)) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
    } catch {}
    next();
  });
};

export const requireClient = (req: any, res: any, next: any) => {
  requireAuth(req, res, async () => {
    if (req.user.role !== "client" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Client access required" });
    }
    try {
      const userCheck = await db.execute({
        sql: "SELECT is_active, email FROM users WHERE id = ?",
        args: [req.user.id],
      });
      if (userCheck.rows.length === 0 || userCheck.rows[0].is_active === 0) {
        return res.status(403).json({ error: "Portal access disabled: Account has been deactivated." });
      }
      const userEmail = String(userCheck.rows[0].email || "").trim().toLowerCase();
      if (userEmail) {
        const crmCheck = await db.execute({
          sql: "SELECT status FROM crm_records WHERE LOWER(TRIM(email)) = ? AND type = 'customer' LIMIT 1",
          args: [userEmail],
        });
        if (crmCheck.rows[0]?.status === "inactive") {
          return res.status(403).json({ error: "Portal access disabled: Customer account is marked inactive." });
        }
      }
    } catch (error) {
      console.warn("Client active verification warning:", error);
    }
    next();
  });
};
