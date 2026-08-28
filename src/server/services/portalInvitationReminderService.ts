import { db } from "../../db.js";
import { getAppUrl } from "../appUrl.js";
import { sendTransactionalEmail } from "./emailService.js";

/** Sends one reminder after ~36h only for unused, still-valid signup links. */
export async function processDuePortalInvitationReminders(limit = 25) {
  const due = await db.execute({ sql: `SELECT ml.id, ml.email, ml.token, ml.expires_at, COALESCE(NULLIF(TRIM(u.name), ''), SUBSTR(ml.email, 1, INSTR(ml.email, '@') - 1)) AS recipient_name
    FROM magic_links ml LEFT JOIN users u ON LOWER(TRIM(u.email)) = LOWER(TRIM(ml.email))
    WHERE ml.type = 'signup' AND ml.used_at IS NULL AND ml.expires_at > CURRENT_TIMESTAMP
      AND ml.portal_invite_reminder_sent_at IS NULL AND ml.created_at <= datetime('now', '-36 hours')
    ORDER BY ml.created_at ASC LIMIT ?`, args: [limit] });
  let sent = 0;
  for (const row of due.rows as any[]) {
    const hours = Math.max(1, Math.ceil((new Date(String(row.expires_at)).getTime() - Date.now()) / 3600000));
    const link = `${getAppUrl().replace(/\/$/, "")}/auth/magic-link?token=${encodeURIComponent(String(row.token))}`;
    const result = await sendTransactionalEmail({ to: String(row.email), templateId: "portal_invitation_reminder", templateData: { "user.name": row.recipient_name || "there", "user.email": row.email, recipient_name: row.recipient_name || "there", invitation_link: link, action_url: link, action_text: "Activate Client Portal", remaining_hours: hours } });
    if (result.success) {
      await db.execute({ sql: "UPDATE magic_links SET portal_invite_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL AND portal_invite_reminder_sent_at IS NULL", args: [row.id] });
      sent++;
    }
  }
  return { checked: due.rows.length, sent };
}
