import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "../../db.js";
import { sendTransactionalEmail } from "./emailService.js";

export type AccountContext = "admin" | "client";
export type ChallengePurpose = "login" | "enrollment" | "disable";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtstring";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function requestAddress(req: any): string {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.ip || req.socket?.remoteAddress || "").slice(0, 120);
}

function codeHash(challengeId: string, code: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(`${challengeId}:${code}`).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export async function hasEnabledEmailFactor(userId: string, accountContext: AccountContext): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM auth_factors
          WHERE user_id = ? AND account_context = ? AND factor_type = 'email_otp' AND is_enabled = 1
          LIMIT 1`,
    args: [userId, accountContext],
  });
  return result.rows.length > 0;
}

export async function setEmailFactorEnabled(userId: string, accountContext: AccountContext, enabled: boolean) {
  await db.execute({
    sql: `INSERT INTO auth_factors
          (id, user_id, account_context, factor_type, is_enabled, is_primary, verified_at, updated_at)
          VALUES (?, ?, ?, 'email_otp', ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, account_context, factor_type) DO UPDATE SET
            is_enabled = excluded.is_enabled,
            is_primary = excluded.is_primary,
            verified_at = CASE WHEN excluded.is_enabled = 1 THEN COALESCE(auth_factors.verified_at, CURRENT_TIMESTAMP) ELSE auth_factors.verified_at END,
            updated_at = CURRENT_TIMESTAMP`,
    args: [crypto.randomUUID(), userId, accountContext, enabled ? 1 : 0, enabled ? 1 : 0, enabled ? 1 : 0],
  });
  if (!enabled) {
    await db.execute({
      sql: "UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND account_context = ? AND consumed_at IS NULL",
      args: [userId, accountContext],
    });
  }
}

export async function recordSecurityEvent(input: {
  userId?: string;
  accountContext?: AccountContext;
  eventType: string;
  success?: boolean;
  req?: any;
  metadata?: Record<string, unknown>;
}) {
  await db.execute({
    sql: `INSERT INTO auth_security_events
          (id, user_id, account_context, event_type, success, ip_address, user_agent, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [crypto.randomUUID(), input.userId || null, input.accountContext || null, input.eventType, input.success === false ? 0 : 1, input.req ? requestAddress(input.req) : "", String(input.req?.headers?.["user-agent"] || "").slice(0, 500), JSON.stringify(input.metadata || {})],
  });
}

export async function createAndSendEmailChallenge(input: {
  userId: string;
  email: string;
  name?: string;
  accountContext: AccountContext;
  req: any;
  previousChallengeId?: string;
  purpose?: ChallengePurpose;
}) {
  const purpose = input.purpose || "login";
  if (input.previousChallengeId) {
    const previous = await db.execute({
      sql: "SELECT sent_at FROM auth_challenges WHERE id = ? AND user_id = ? AND consumed_at IS NULL LIMIT 1",
      args: [input.previousChallengeId, input.userId],
    });
    if (previous.rows.length === 0) {
      throw Object.assign(new Error("This verification session is no longer active."), { status: 401 });
    }
    const sentAt = previous.rows[0]?.sent_at ? new Date(String(previous.rows[0].sent_at)).getTime() : 0;
    if (sentAt && Date.now() - sentAt < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - sentAt)) / 1000);
      throw Object.assign(new Error("Please wait before requesting another code."), { status: 429, retryAfter });
    }
    await db.execute({ sql: "UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", args: [input.previousChallengeId] });
  }

  const recent = await db.execute({
    sql: `SELECT COUNT(*) AS count FROM auth_challenges
          WHERE user_id = ? AND challenge_type = 'email_otp' AND created_at >= datetime('now', '-1 hour')`,
    args: [input.userId],
  });
  if (Number(recent.rows[0]?.count || 0) >= 10) {
    throw Object.assign(new Error("Too many verification emails were requested. Please try again later."), { status: 429 });
  }

  const challengeId = crypto.randomUUID();
  const code = String(crypto.randomInt(0, 100_000_000)).padStart(8, "0");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  await db.execute({
    sql: `INSERT INTO auth_challenges
          (id, user_id, account_context, challenge_type, challenge_purpose, code_hash, expires_at, max_attempts, sent_at, ip_address, user_agent)
          VALUES (?, ?, ?, 'email_otp', ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    args: [challengeId, input.userId, input.accountContext, purpose, codeHash(challengeId, code), expiresAt, MAX_ATTEMPTS, requestAddress(input.req), String(input.req.headers?.["user-agent"] || "").slice(0, 500)],
  });

  const delivery = await sendTransactionalEmail({
    to: input.email,
    templateId: "test_email",
    subject: "SPS Studio bejelentkezés megerősítése",
    customHtml: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a"><h2>Bejelentkezés megerősítése</h2><p>Kedves ${escapeHtml(input.name || input.email.split("@")[0])}!</p><p>Az egyszer használatos SPS Studio ellenőrzőkódod:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:24px 0">${code}</p><p>A kód 5 percig érvényes. Ha nem te kezdeményezted a belépést, ne add meg senkinek.</p></div>`,
    customText: `SPS Studio bejelentkezési kód: ${code}\n\nA kód 5 percig érvényes. Ha nem te kezdeményezted a belépést, ne add meg senkinek.`,
  });
  if (!delivery.success || delivery.simulated) {
    await db.execute({ sql: "UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", args: [challengeId] });
    throw Object.assign(new Error(delivery.simulated ? "Email delivery is not configured for this environment." : "The verification email could not be delivered."), { status: 503 });
  }

  await recordSecurityEvent({ userId: input.userId, accountContext: input.accountContext, eventType: `email_otp_${purpose}_sent`, req: input.req });
  const preauthToken = jwt.sign({ purpose: `2fa_${purpose}`, challengeId, userId: input.userId, accountContext: input.accountContext }, JWT_SECRET, { expiresIn: "5m" });
  return { challengeId, preauthToken, expiresIn: 300, resendAfter: 60 };
}

export async function verifyEmailChallenge(input: { challengeId: string; preauthToken: string; code: string; req: any; expectedPurpose?: ChallengePurpose }) {
  const expectedPurpose = input.expectedPurpose || "login";
  let preauth: any;
  try {
    preauth = jwt.verify(input.preauthToken, JWT_SECRET);
  } catch {
    throw Object.assign(new Error("The verification session is invalid or expired."), { status: 401 });
  }
  if (preauth?.purpose !== `2fa_${expectedPurpose}` || preauth.challengeId !== input.challengeId) {
    throw Object.assign(new Error("The verification session is invalid."), { status: 401 });
  }
  const result = await db.execute({ sql: "SELECT * FROM auth_challenges WHERE id = ? LIMIT 1", args: [input.challengeId] });
  const challenge: any = result.rows[0];
  if (!challenge || challenge.user_id !== preauth.userId || challenge.account_context !== preauth.accountContext || String(challenge.challenge_purpose || "login") !== expectedPurpose || challenge.consumed_at) {
    throw Object.assign(new Error("This verification code is no longer valid."), { status: 401 });
  }
  if (new Date(String(challenge.expires_at)).getTime() <= Date.now()) {
    throw Object.assign(new Error("The verification code has expired."), { status: 401 });
  }
  if (Number(challenge.attempt_count) >= Number(challenge.max_attempts || MAX_ATTEMPTS)) {
    throw Object.assign(new Error("Too many incorrect attempts. Start a new login."), { status: 429 });
  }
  const suppliedHash = codeHash(input.challengeId, input.code.trim());
  if (!safeEqualHex(String(challenge.code_hash || ""), suppliedHash)) {
    await db.execute({ sql: "UPDATE auth_challenges SET attempt_count = attempt_count + 1 WHERE id = ?", args: [input.challengeId] });
    await recordSecurityEvent({ userId: String(challenge.user_id), accountContext: challenge.account_context as AccountContext, eventType: `email_otp_${expectedPurpose}_failed`, success: false, req: input.req });
    throw Object.assign(new Error("Incorrect verification code."), { status: 401 });
  }
  const consumed = await db.execute({ sql: "UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL", args: [input.challengeId] });
  if (Number(consumed.rowsAffected || 0) !== 1) {
    throw Object.assign(new Error("This verification code was already used."), { status: 401 });
  }
  await recordSecurityEvent({ userId: String(challenge.user_id), accountContext: challenge.account_context as AccountContext, eventType: `email_otp_${expectedPurpose}_verified`, req: input.req });
  return { userId: String(challenge.user_id), accountContext: challenge.account_context as AccountContext };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] || character));
}
