import crypto from "crypto";
import { db } from "../../db.js";
import webpush from "web-push";

let schemaReady = false;
let vapidReady = false;

export async function ensurePortalNotificationSchema() {
  if (schemaReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS portal_notifications (
    id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL, recipient_portal TEXT NOT NULL,
    type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, link TEXT,
    read_at DATETIME DEFAULT NULL, archived_at DATETIME DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  const columns = await db.execute("PRAGMA table_info(portal_notifications)");
  if (!(columns.rows as any[]).some((column: any) => String(column.name) === "archived_at")) {
    await db.execute("ALTER TABLE portal_notifications ADD COLUMN archived_at DATETIME DEFAULT NULL");
  }
  await db.execute("CREATE INDEX IF NOT EXISTS idx_portal_notifications_recipient ON portal_notifications(recipient_id, recipient_portal, archived_at, read_at, created_at)");
  await db.execute(`CREATE TABLE IF NOT EXISTS portal_push_subscriptions (
    id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL, recipient_portal TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE, subscription_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_portal_push_subscriptions_recipient ON portal_push_subscriptions(recipient_id, recipient_portal)");
  await db.execute(`CREATE TABLE IF NOT EXISTS portal_push_settings (
    id TEXT PRIMARY KEY, public_key TEXT NOT NULL, private_key TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  schemaReady = true;
}

export type Portal = "admin" | "client" | "public";
type NotificationInput = { recipientId: string; portal: Portal; type: string; title: string; body: string; link?: string | null };

async function vapid() {
  await ensurePortalNotificationSchema();
  const stored = await db.execute("SELECT public_key, private_key FROM portal_push_settings WHERE id = 'default' LIMIT 1");
  let row: any = stored.rows[0];
  if (!row) {
    const keys = webpush.generateVAPIDKeys();
    await db.execute({ sql: "INSERT INTO portal_push_settings (id, public_key, private_key) VALUES ('default', ?, ?)", args: [keys.publicKey, keys.privateKey] });
    row = { public_key: keys.publicKey, private_key: keys.privateKey };
  }
  if (!vapidReady) { webpush.setVapidDetails("mailto:contact@spsstudio.hu", String(row.public_key), String(row.private_key)); vapidReady = true; }
  return { publicKey: String(row.public_key) };
}

export async function getPortalPushPublicKey() { return (await vapid()).publicKey; }

export async function savePortalPushSubscription(recipientId: string, portal: Portal, subscription: any) {
  await vapid();
  const endpoint = String(subscription?.endpoint || "").slice(0, 2000);
  if (!endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) throw new Error("Invalid push subscription.");
  await db.execute({ sql: `INSERT INTO portal_push_subscriptions (id, recipient_id, recipient_portal, endpoint, subscription_json, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(endpoint) DO UPDATE SET recipient_id=excluded.recipient_id, recipient_portal=excluded.recipient_portal, subscription_json=excluded.subscription_json, updated_at=CURRENT_TIMESTAMP`, args: [crypto.randomUUID(), recipientId, portal, endpoint, JSON.stringify(subscription)] });
}

export async function removePortalPushSubscription(recipientId: string, portal: Portal, endpoint: string) {
  await ensurePortalNotificationSchema();
  await db.execute({ sql: "DELETE FROM portal_push_subscriptions WHERE recipient_id = ? AND recipient_portal = ? AND endpoint = ?", args: [recipientId, portal, String(endpoint || "").slice(0, 2000)] });
}

/** Public subscriptions are deliberately not connected to an account or email
 * address. They are only used for service-status, maintenance and incident
 * broadcasts to the browser that opted in. */
export async function savePublicPushSubscription(subscription: any) {
  await savePortalPushSubscription("anonymous", "public", subscription);
}

export async function removePublicPushSubscription(endpoint: string) {
  await removePortalPushSubscription("anonymous", "public", endpoint);
}

async function sendPortalPush(input: NotificationInput) {
  try {
    await vapid();
    const subscriptions = await db.execute({ sql: "SELECT id, endpoint, subscription_json FROM portal_push_subscriptions WHERE recipient_id = ? AND recipient_portal = ?", args: [input.recipientId, input.portal] });
    await Promise.all((subscriptions.rows as any[]).map(async row => {
      try { await webpush.sendNotification(JSON.parse(String(row.subscription_json)), JSON.stringify({ title: input.title, body: input.body, link: input.link || (input.portal === "admin" ? "/admin" : "/client") }), { TTL: 60 * 60 * 24 }); }
      catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await db.execute({ sql: "DELETE FROM portal_push_subscriptions WHERE id = ?", args: [row.id] }); else console.warn("Portal push delivery failed", error?.message || error); }
    }));
  } catch (error) { console.warn("Portal push setup/delivery failed", error); }
}

export async function createPortalNotification(input: NotificationInput) {
  await ensurePortalNotificationSchema();
  await db.execute({
    sql: "INSERT INTO portal_notifications (id, recipient_id, recipient_portal, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [crypto.randomUUID(), input.recipientId, input.portal, input.type.slice(0, 80), input.title.slice(0, 240), input.body.slice(0, 2000), input.link?.slice(0, 1000) || null],
  });
  await sendPortalPush(input);
}

export async function notifyAllAdmins(input: Omit<NotificationInput, "recipientId" | "portal">) {
  await ensurePortalNotificationSchema();
  const admins = await db.execute({ sql: "SELECT id FROM users WHERE role IN ('admin', 'editor', 'video_editor', 'real_estate_agent', 'advertiser', 'viewer', 'superadmin')", args: [] });
  await Promise.all((admins.rows as any[]).map((admin) => createPortalNotification({ ...input, recipientId: String(admin.id), portal: "admin" })));
}

export async function broadcastPublicPush(input: Pick<NotificationInput, "type" | "title" | "body" | "link">) {
  try {
    await vapid();
    const subscriptions = await db.execute({ sql: "SELECT id, subscription_json FROM portal_push_subscriptions WHERE recipient_portal = 'public'", args: [] });
    await Promise.all((subscriptions.rows as any[]).map(async (row) => {
      try {
        await webpush.sendNotification(JSON.parse(String(row.subscription_json)), JSON.stringify({ title: input.title, body: input.body, link: input.link || "/" }), { TTL: 60 * 60 * 24 });
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await db.execute({ sql: "DELETE FROM portal_push_subscriptions WHERE id = ?", args: [row.id] });
        else console.warn("Public push delivery failed", error?.message || error);
      }
    }));
    return { recipients: subscriptions.rows.length };
  } catch (error) {
    console.warn("Public push broadcast failed", error);
    throw error;
  }
}
