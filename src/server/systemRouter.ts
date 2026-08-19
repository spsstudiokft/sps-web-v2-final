import { Router } from "express";

const systemRouter = Router();

systemRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

let cachedStatusSummary: any = null;
let lastStatusFetchTime = 0;
const STATUS_CACHE_TTL_MS = 25_000;

systemRouter.get("/status-summary", async (_req, res) => {
  const now = Date.now();
  if (cachedStatusSummary && now - lastStatusFetchTime < STATUS_CACHE_TTL_MS) {
    return res.json(cachedStatusSummary);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6_000);
    const response = await fetch("https://status.spsstudio.hu/api/v1/summary", {
      headers: {
        Accept: "application/json",
        "User-Agent": "SPSStudio-StatusWidget/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`incident.io API responded with ${response.status}`);

    const data = await response.json();
    cachedStatusSummary = { success: true, data };
    lastStatusFetchTime = now;
    return res.json(cachedStatusSummary);
  } catch (error: any) {
    console.debug("[StatusWidget] Failed to fetch incident.io summary:", error?.message || error);
    if (cachedStatusSummary) return res.json({ ...cachedStatusSummary, stale: true });
    return res.json({
      success: false,
      error: "Status summary unavailable",
      data: {
        summary: {
          status: "operational",
          ongoing_incidents: [],
          in_progress_maintenances: [],
        },
      },
    });
  }
});

export default systemRouter;
