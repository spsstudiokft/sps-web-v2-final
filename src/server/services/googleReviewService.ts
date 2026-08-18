import crypto from "crypto";
import { db } from "../../db.js";
import { sendTransactionalEmail } from "./emailService.js";

// Cumulative schedule from the gallery_ready email: +1h, then +3h, +1d, +5d, +10d.
const REVIEW_DELAYS_MS = [
  1 * 60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  28 * 60 * 60 * 1000,
  148 * 60 * 60 * 1000,
  388 * 60 * 60 * 1000,
];

const elapsedLabels = ["1 hour", "4 hours", "1 day and 4 hours", "6 days and 4 hours", "16 days and 4 hours"];

export async function scheduleGoogleReviewCampaign(input: {
  projectId: string;
  recipientEmail: string;
  recipientName: string;
  projectName: string;
  appOrigin: string;
  destinationUrl: string;
}) {
  const startedAt = new Date();
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString("hex");

  await db.execute({
    sql: `UPDATE google_review_campaigns
          SET status = 'superseded', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ? AND status IN ('pending', 'processing')`,
    args: [input.projectId],
  });
  await db.execute({
    sql: `INSERT INTO google_review_campaigns
          (id, project_id, recipient_email, recipient_name, project_name, tracking_token,
           destination_url, app_origin, gallery_ready_sent_at, next_sequence, next_send_at, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending')`,
    args: [
      id,
      input.projectId,
      input.recipientEmail.trim().toLowerCase(),
      input.recipientName,
      input.projectName,
      token,
      input.destinationUrl,
      input.appOrigin.replace(/\/$/, ""),
      startedAt.toISOString(),
      new Date(startedAt.getTime() + REVIEW_DELAYS_MS[0]).toISOString(),
    ],
  });
  return { id, token };
}

export async function markGoogleReviewClicked(token: string) {
  const result = await db.execute({
    sql: `SELECT id, destination_url FROM google_review_campaigns WHERE tracking_token = ? LIMIT 1`,
    args: [token],
  });
  if (!result.rows.length) return null;
  await db.execute({
    sql: `UPDATE google_review_campaigns
          SET clicked_at = COALESCE(clicked_at, CURRENT_TIMESTAMP), completed_at = CURRENT_TIMESTAMP,
              status = 'completed', processing_started_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [result.rows[0].id],
  });
  return String(result.rows[0].destination_url || "");
}

export async function processDueGoogleReviewCampaigns(limit = 20) {
  await db.execute(`UPDATE google_review_campaigns SET status = 'pending', processing_started_at = NULL
                    WHERE status = 'processing' AND processing_started_at < datetime('now', '-15 minutes') AND clicked_at IS NULL`);
  const due = await db.execute({
    sql: `SELECT * FROM google_review_campaigns
          WHERE status = 'pending' AND clicked_at IS NULL AND next_sequence < ? AND datetime(next_send_at) <= CURRENT_TIMESTAMP
          ORDER BY next_send_at ASC LIMIT ?`,
    args: [REVIEW_DELAYS_MS.length, limit],
  });

  let sent = 0;
  for (const row of due.rows) {
    const claimed = await db.execute({
      sql: `UPDATE google_review_campaigns SET status = 'processing', processing_started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending' AND clicked_at IS NULL`,
      args: [row.id],
    });
    if (Number(claimed.rowsAffected || 0) !== 1) continue;

    const sequence = Number(row.next_sequence || 0);
    const trackingUrl = `${String(row.app_origin).replace(/\/$/, "")}/api/public/google-review/${row.tracking_token}`;
    const result = await sendTransactionalEmail({
      to: String(row.recipient_email),
      templateId: "google_review_request",
      templateData: {
        recipient_name: row.recipient_name,
        "user.name": row.recipient_name,
        project_name: row.project_name,
        review_url: trackingUrl,
        action_url: trackingUrl,
        action_text: "Leave a Google review",
        reminder_number: sequence + 1,
        reminder_total: REVIEW_DELAYS_MS.length,
        elapsed_time: elapsedLabels[sequence],
      },
    });

    if (result.success) {
      sent += 1;
      const nextSequence = sequence + 1;
      const nextSendAt = nextSequence < REVIEW_DELAYS_MS.length
        ? new Date(new Date(String(row.gallery_ready_sent_at)).getTime() + REVIEW_DELAYS_MS[nextSequence]).toISOString()
        : null;
      await db.execute({
        sql: `UPDATE google_review_campaigns
              SET next_sequence = ?, next_send_at = COALESCE(?, next_send_at), last_sent_at = CURRENT_TIMESTAMP,
                  status = CASE WHEN ? >= ? THEN 'exhausted' ELSE 'pending' END,
                  processing_started_at = NULL, last_error = NULL, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND clicked_at IS NULL`,
        args: [nextSequence, nextSendAt, nextSequence, REVIEW_DELAYS_MS.length, row.id],
      });
    } else {
      await db.execute({
        sql: `UPDATE google_review_campaigns SET status = 'pending', processing_started_at = NULL,
              next_send_at = datetime('now', '+15 minutes'), last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [result.error || "Email delivery failed", row.id],
      });
    }
  }
  return { checked: due.rows.length, sent };
}
