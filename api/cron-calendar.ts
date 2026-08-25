import { processDueCalendarReminders } from "../src/server/services/calendarReminderService.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const secret = String(process.env.CRON_SECRET || "");
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });
  try {
    const result = await processDueCalendarReminders();
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("[Calendar Reminder Cron] Processing failed:", error);
    return res.status(500).json({ success: false, error: error?.message || "Reminder processing failed" });
  }
}
