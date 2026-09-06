import { Router } from "express";
import { getPortalPushPublicKey, removePublicPushSubscription, savePublicPushSubscription } from "./services/portalNotificationService.js";

export const publicPushRouter = Router();

publicPushRouter.get("/public-key", async (_req, res) => {
  try { res.json({ publicKey: await getPortalPushPublicKey() }); }
  catch { res.status(503).json({ error: "Push notifications are unavailable." }); }
});

publicPushRouter.post("/subscribe", async (req, res) => {
  try {
    await savePublicPushSubscription(req.body?.subscription);
    res.status(201).json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid push subscription." });
  }
});

publicPushRouter.post("/unsubscribe", async (req, res) => {
  try {
    await removePublicPushSubscription(String(req.body?.endpoint || ""));
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: "Invalid push subscription." });
  }
});
