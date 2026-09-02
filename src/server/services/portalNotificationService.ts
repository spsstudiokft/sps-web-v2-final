import crypto from "crypto";
import { db } from "../../db.js";

let schemaReady = false;

export async function ensurePortalNotificationSchema() {
  if (schemaReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS portal_notifications (
    id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL, recipient_portal TEXT NOT NULL,
    type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, link TEXT,
    read_at DATETIME DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_portal_notifications_recipient ON portal_notifications(recipient_id, recipient_portal, read_at, created_at)");
  schemaReady = true;
}

type Portal = "admin" | "client";
type NotificationInput = { recipientId: string; portal: Portal; type: string; title: string; body: string; link?: string | null };

export async function createPortalNotification(input: NotificationInput) {
  await ensurePortalNotificationSchema();
  await db.execute({
    sql: "INSERT INTO portal_notifications (id, recipient_id, recipient_portal, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [crypto.randomUUID(), input.recipientId, input.portal, input.type.slice(0, 80), input.title.slice(0, 240), input.body.slice(0, 2000), input.link?.slice(0, 1000) || null],
  });
}

export async function notifyAllAdmins(input: Omit<NotificationInput, "recipientId" | "portal">) {
  await ensurePortalNotificationSchema();
  const admins = await db.execute({ sql: "SELECT id FROM users WHERE role IN ('admin', 'editor', 'video_editor', 'real_estate_agent', 'advertiser', 'viewer', 'superadmin')", args: [] });
  await Promise.all((admins.rows as any[]).map((admin) => createPortalNotification({ ...input, recipientId: String(admin.id), portal: "admin" })));
}
