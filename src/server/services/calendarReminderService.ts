import crypto from "node:crypto";
import { db } from "../../db.js";
import { getAppUrl } from "../appUrl.js";
import { sendTransactionalEmail } from "./emailService.js";

type ReminderEvent = {
  id: string; owner_id: string; recipient_ids?: string[]; start_at: string; reminder_at?: string | null; recurrence_rule?: string | null;
};

function nextOccurrence(value: Date, recurrence: string): Date | null {
  const next = new Date(value);
  if (recurrence === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (recurrence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else return null;
  return next;
}

export async function scheduleCalendarReminder(event: ReminderEvent) {
  await db.execute({ sql: "DELETE FROM calendar_notification_jobs WHERE event_id = ? AND status IN ('pending', 'processing', 'failed')", args: [event.id] });
  if (!event.reminder_at) return { scheduled: false };
  const occurrenceStart = new Date(event.start_at);
  const scheduledAt = new Date(event.reminder_at);
  if (!Number.isFinite(occurrenceStart.getTime()) || !Number.isFinite(scheduledAt.getTime())) return { scheduled: false };
  const recipients = [...new Set((event.recipient_ids?.length ? event.recipient_ids : [event.owner_id]).filter(Boolean))];
  for (const recipientId of recipients) await db.execute({
    sql: `INSERT INTO calendar_notification_jobs (id, event_id, recipient_id, occurrence_start, scheduled_at, status)
          VALUES (?, ?, ?, ?, ?, 'pending') ON CONFLICT(event_id, recipient_id, occurrence_start) DO NOTHING`,
    args: [crypto.randomUUID(), event.id, recipientId, occurrenceStart.toISOString(), scheduledAt.toISOString()],
  });
  return { scheduled: recipients.length > 0, recipients: recipients.length };
}

async function scheduleNextOccurrence(row: any) {
  const recurrence = String(row.recurrence_rule || "none");
  let occurrence = nextOccurrence(new Date(String(row.occurrence_start)), recurrence);
  if (!occurrence) return;
  const offset = new Date(String(row.reminder_at)).getTime() - new Date(String(row.start_at)).getTime();
  let scheduled = new Date(occurrence.getTime() + offset);
  const now = Date.now();
  while (scheduled.getTime() <= now) {
    const advanced = nextOccurrence(occurrence, recurrence);
    if (!advanced) return;
    occurrence = advanced;
    scheduled = new Date(occurrence.getTime() + offset);
  }
  await db.execute({
    sql: `INSERT INTO calendar_notification_jobs (id, event_id, recipient_id, occurrence_start, scheduled_at, status)
          VALUES (?, ?, ?, ?, ?, 'pending') ON CONFLICT(event_id, recipient_id, occurrence_start) DO NOTHING`,
    args: [crypto.randomUUID(), row.event_id, row.recipient_id, occurrence.toISOString(), scheduled.toISOString()],
  });
}

export async function processDueCalendarReminders(limit = 25) {
  await db.execute(`UPDATE calendar_notification_jobs SET status = 'pending', processing_started_at = NULL
                    WHERE status = 'processing' AND processing_started_at < datetime('now', '-15 minutes')`);
  const due = await db.execute({
    sql: `SELECT j.*, e.title, e.description, e.start_at, e.end_at, e.reminder_at, e.recurrence_rule,
                 e.is_all_day, u.email AS recipient_email, COALESCE(NULLIF(TRIM(u.name), ''), u.email) AS recipient_name
          FROM calendar_notification_jobs j
          JOIN calendar_events e ON e.id = j.event_id
          JOIN users u ON u.id = j.recipient_id
          WHERE j.status = 'pending' AND datetime(j.scheduled_at) <= CURRENT_TIMESTAMP
          ORDER BY j.scheduled_at ASC LIMIT ?`,
    args: [limit],
  });
  let sent = 0;
  for (const row of due.rows as any[]) {
    const claimed = await db.execute({
      sql: `UPDATE calendar_notification_jobs SET status = 'processing', processing_started_at = CURRENT_TIMESTAMP,
            attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`, args: [row.id],
    });
    if (Number(claimed.rowsAffected || 0) !== 1) continue;
    const occurrenceStart = new Date(String(row.occurrence_start));
    const duration = new Date(String(row.end_at)).getTime() - new Date(String(row.start_at)).getTime();
    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
    const formatter = new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest", dateStyle: "long", timeStyle: row.is_all_day ? undefined : "short" });
    const actionUrl = `${getAppUrl()}/admin/calendar`;
    const result = await sendTransactionalEmail({
      to: String(row.recipient_email), templateId: "calendar_reminder",
      templateData: {
        "user.name": row.recipient_name, "user.email": row.recipient_email, recipient_name: row.recipient_name,
        event_title: row.title, event_description: row.description || "Nincs további leírás.",
        event_start: formatter.format(occurrenceStart), event_end: formatter.format(occurrenceEnd),
        event_type: "Emlékeztető", action_url: actionUrl, action_text: "Naptár megnyitása",
      },
    });
    if (result.success) {
      sent += 1;
      await db.execute({ sql: "UPDATE calendar_notification_jobs SET status = 'sent', sent_at = CURRENT_TIMESTAMP, processing_started_at = NULL, last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [row.id] });
      await scheduleNextOccurrence(row);
    } else {
      const attempts = Number(row.attempts || 0) + 1;
      await db.execute({
        sql: `UPDATE calendar_notification_jobs SET status = CASE WHEN ? >= 5 THEN 'failed' ELSE 'pending' END,
              scheduled_at = datetime('now', '+15 minutes'), processing_started_at = NULL, last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [attempts, result.error || "Email delivery failed", row.id],
      });
    }
  }
  return { checked: due.rows.length, sent };
}
