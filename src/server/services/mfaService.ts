import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateSecret, generateURI, verify as verifyTotp } from "otplib";
import { db } from "../../db.js";
import { sendTransactionalEmail } from "./emailService.js";

export type AccountContext = "admin" | "client";
export type ChallengePurpose = "login" | "enrollment" | "disable";
export type MfaLoginMode = "email_only" | "totp_only" | "combined";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtstring";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const TOTP_ISSUER = process.env.MFA_TOTP_ISSUER || "SPS Studio";

function encryptionKey(): Buffer {
  const configured = process.env.MFA_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("Authenticator setup is unavailable because MFA_ENCRYPTION_KEY is not configured."), { status: 503 });
  }
  return crypto.createHash("sha256").update(configured || `${JWT_SECRET}:local-mfa-only`).digest();
}

function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptSecret(value: string): string {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid encrypted authenticator secret.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

function recoveryHash(userId: string, accountContext: AccountContext, code: string): string {
  return crypto.createHmac("sha256", encryptionKey()).update(`${userId}:${accountContext}:${code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`).digest("hex");
}

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

export async function getFactorStatus(userId: string, accountContext: AccountContext) {
  const factors = await db.execute({ sql: "SELECT factor_type, is_enabled, is_primary FROM auth_factors WHERE user_id = ? AND account_context = ?", args: [userId, accountContext] });
  const recovery = await db.execute({ sql: "SELECT COUNT(*) AS count FROM auth_recovery_codes WHERE user_id = ? AND account_context = ? AND used_at IS NULL", args: [userId, accountContext] });
  const preference = await db.execute({ sql: "SELECT login_mode FROM auth_mfa_preferences WHERE user_id = ? AND account_context = ? LIMIT 1", args: [userId, accountContext] });
  const byType = new Map(factors.rows.map((row: any) => [String(row.factor_type), row]));
  const emailEnabled = Number((byType.get("email_otp") as any)?.is_enabled || 0) === 1;
  const totpEnabled = Number((byType.get("totp") as any)?.is_enabled || 0) === 1;
  const storedMode = String(preference.rows[0]?.login_mode || "");
  const loginMode: MfaLoginMode | null = storedMode === "combined" && emailEnabled && totpEnabled ? "combined"
    : storedMode === "email_only" && emailEnabled ? "email_only"
    : storedMode === "totp_only" && totpEnabled ? "totp_only"
    : totpEnabled ? "totp_only" : emailEnabled ? "email_only" : null;
  return {
    email_otp_enabled: emailEnabled,
    totp_enabled: totpEnabled,
    login_mode: loginMode,
    primary_method: factors.rows.find((row: any) => Number(row.is_enabled) === 1 && Number(row.is_primary) === 1)?.factor_type || null,
    recovery_codes_remaining: Number(recovery.rows[0]?.count || 0),
  };
}

export async function setMfaLoginMode(userId: string, accountContext: AccountContext, loginMode: MfaLoginMode) {
  const status = await getFactorStatus(userId, accountContext);
  if ((loginMode === "email_only" || loginMode === "combined") && !status.email_otp_enabled) throw Object.assign(new Error("Enable email verification before selecting this mode."), { status: 409 });
  if ((loginMode === "totp_only" || loginMode === "combined") && !status.totp_enabled) throw Object.assign(new Error("Enable an authenticator before selecting this mode."), { status: 409 });
  await db.execute({ sql: `INSERT INTO auth_mfa_preferences (user_id, account_context, login_mode, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, account_context) DO UPDATE SET login_mode = excluded.login_mode, updated_at = CURRENT_TIMESTAMP`, args: [userId, accountContext, loginMode] });
}

export async function startTotpEnrollment(input: { userId: string; accountContext: AccountContext; email: string; req: any }) {
  const status = await getFactorStatus(input.userId, input.accountContext);
  if (status.totp_enabled) throw Object.assign(new Error("Authenticator verification is already enabled."), { status: 409 });
  const secret = generateSecret();
  await db.execute({
    sql: `INSERT INTO auth_factors (id, user_id, account_context, factor_type, is_enabled, is_primary, secret_encrypted, last_totp_step, updated_at)
          VALUES (?, ?, ?, 'totp', 0, 0, ?, NULL, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, account_context, factor_type) DO UPDATE SET is_enabled = 0, is_primary = 0, secret_encrypted = excluded.secret_encrypted, last_totp_step = NULL, verified_at = NULL, updated_at = CURRENT_TIMESTAMP`,
    args: [crypto.randomUUID(), input.userId, input.accountContext, encryptSecret(secret)],
  });
  const token = jwt.sign({ purpose: "2fa_totp_enrollment", userId: input.userId, accountContext: input.accountContext }, JWT_SECRET, { expiresIn: "10m" });
  await recordSecurityEvent({ userId: input.userId, accountContext: input.accountContext, eventType: "totp_enrollment_started", req: input.req });
  return { secret, otpauthUri: generateURI({ issuer: TOTP_ISSUER, label: input.email, secret, digits: 6, period: 30 }), enrollmentToken: token };
}

async function verifyStoredTotp(userId: string, accountContext: AccountContext, token: string, requireEnabled: boolean) {
  const result = await db.execute({ sql: `SELECT id, secret_encrypted, last_totp_step, is_enabled FROM auth_factors WHERE user_id = ? AND account_context = ? AND factor_type = 'totp' LIMIT 1`, args: [userId, accountContext] });
  const factor: any = result.rows[0];
  if (!factor?.secret_encrypted || (requireEnabled && Number(factor.is_enabled) !== 1)) return false;
  const checked = await verifyTotp({ secret: decryptSecret(String(factor.secret_encrypted)), token, digits: 6, period: 30, epochTolerance: 30, afterTimeStep: factor.last_totp_step == null ? undefined : Number(factor.last_totp_step) });
  // `otplib` exposes a shared TOTP/HOTP result type. Only TOTP verifications
  // include a timeStep, which is required for our replay protection.
  if (!checked.valid || !("timeStep" in checked)) return false;
  const updated = await db.execute({ sql: "UPDATE auth_factors SET last_totp_step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (last_totp_step IS NULL OR last_totp_step < ?)", args: [checked.timeStep, factor.id, checked.timeStep] });
  return Number(updated.rowsAffected || 0) === 1;
}

function newRecoveryCode(): string {
  const raw = crypto.randomBytes(10).toString("hex").toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}

export async function confirmTotpEnrollment(input: { userId: string; accountContext: AccountContext; code: string; enrollmentToken: string; req: any }) {
  let payload: any;
  try { payload = jwt.verify(input.enrollmentToken, JWT_SECRET); } catch { throw Object.assign(new Error("The authenticator setup session is invalid or expired."), { status: 401 }); }
  if (payload?.purpose !== "2fa_totp_enrollment" || String(payload.userId) !== input.userId || payload.accountContext !== input.accountContext) throw Object.assign(new Error("The authenticator setup does not belong to this account."), { status: 403 });
  if (!await verifyStoredTotp(input.userId, input.accountContext, input.code, false)) throw Object.assign(new Error("The six-digit authenticator code is incorrect or was already used."), { status: 401 });
  await db.batch([
    { sql: "UPDATE auth_factors SET is_primary = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND account_context = ?", args: [input.userId, input.accountContext] },
    { sql: "UPDATE auth_factors SET is_enabled = 1, is_primary = 1, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND account_context = ? AND factor_type = 'totp'", args: [input.userId, input.accountContext] },
    { sql: "DELETE FROM auth_recovery_codes WHERE user_id = ? AND account_context = ?", args: [input.userId, input.accountContext] },
  ], "write");
  const codes = Array.from({ length: 10 }, newRecoveryCode);
  await db.batch(codes.map((code) => ({ sql: "INSERT INTO auth_recovery_codes (id, user_id, account_context, code_hash) VALUES (?, ?, ?, ?)", args: [crypto.randomUUID(), input.userId, input.accountContext, recoveryHash(input.userId, input.accountContext, code)] })), "write");
  await recordSecurityEvent({ userId: input.userId, accountContext: input.accountContext, eventType: "totp_factor_enabled", req: input.req });
  return codes;
}

export async function createTotpLoginChallenge(input: { userId: string; accountContext: AccountContext; req: any }) {
  const challengeId = crypto.randomUUID();
  await db.execute({ sql: `INSERT INTO auth_challenges (id, user_id, account_context, challenge_type, challenge_purpose, expires_at, max_attempts, ip_address, user_agent) VALUES (?, ?, ?, 'totp', 'login', ?, ?, ?, ?)`, args: [challengeId, input.userId, input.accountContext, new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(), MAX_ATTEMPTS, requestAddress(input.req), String(input.req.headers?.["user-agent"] || "").slice(0, 500)] });
  return { challengeId, preauthToken: jwt.sign({ purpose: "2fa_login", challengeId, userId: input.userId, accountContext: input.accountContext, method: "totp" }, JWT_SECRET, { expiresIn: "5m" }), expiresIn: 300 };
}

export async function verifyTotpLoginChallenge(input: { challengeId: string; preauthToken: string; code?: string; recoveryCode?: string; req: any }) {
  let payload: any;
  try { payload = jwt.verify(input.preauthToken, JWT_SECRET); } catch { throw Object.assign(new Error("The verification session is invalid or expired."), { status: 401 }); }
  const result = await db.execute({ sql: "SELECT * FROM auth_challenges WHERE id = ? LIMIT 1", args: [input.challengeId] });
  const challenge: any = result.rows[0];
  if (payload?.purpose !== "2fa_login" || payload?.method !== "totp" || payload.challengeId !== input.challengeId || !challenge || challenge.consumed_at || challenge.user_id !== payload.userId || new Date(String(challenge.expires_at)).getTime() <= Date.now()) throw Object.assign(new Error("The verification session is invalid or expired."), { status: 401 });
  if (Number(challenge.attempt_count) >= Number(challenge.max_attempts || MAX_ATTEMPTS)) throw Object.assign(new Error("Too many incorrect attempts. Start a new login."), { status: 429 });
  let method = "totp";
  let valid = false;
  if (input.recoveryCode) {
    method = "recovery_code";
    const hash = recoveryHash(String(challenge.user_id), challenge.account_context, input.recoveryCode);
    const used = await db.execute({ sql: "UPDATE auth_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND account_context = ? AND code_hash = ? AND used_at IS NULL", args: [challenge.user_id, challenge.account_context, hash] });
    valid = Number(used.rowsAffected || 0) === 1;
  } else if (input.code) valid = await verifyStoredTotp(String(challenge.user_id), challenge.account_context, input.code, true);
  if (!valid) {
    await db.execute({ sql: "UPDATE auth_challenges SET attempt_count = attempt_count + 1 WHERE id = ?", args: [input.challengeId] });
    await recordSecurityEvent({ userId: String(challenge.user_id), accountContext: challenge.account_context, eventType: `${method}_login_failed`, success: false, req: input.req });
    throw Object.assign(new Error(method === "totp" ? "The authenticator code is incorrect or was already used." : "The recovery code is invalid or was already used."), { status: 401 });
  }
  const consumed = await db.execute({ sql: "UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL", args: [input.challengeId] });
  if (Number(consumed.rowsAffected || 0) !== 1) throw Object.assign(new Error("This verification was already used."), { status: 401 });
  await recordSecurityEvent({ userId: String(challenge.user_id), accountContext: challenge.account_context, eventType: `${method}_login_verified`, req: input.req });
  return { userId: String(challenge.user_id), accountContext: challenge.account_context as AccountContext, method };
}

export async function disableTotpFactor(userId: string, accountContext: AccountContext) {
  await db.batch([
    { sql: "UPDATE auth_factors SET is_enabled = 0, is_primary = 0, secret_encrypted = NULL, last_totp_step = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND account_context = ? AND factor_type = 'totp'", args: [userId, accountContext] },
    { sql: "DELETE FROM auth_recovery_codes WHERE user_id = ? AND account_context = ?", args: [userId, accountContext] },
  ], "write");
  const status = await getFactorStatus(userId, accountContext);
  if (status.email_otp_enabled) await db.execute({ sql: "UPDATE auth_factors SET is_primary = 1 WHERE user_id = ? AND account_context = ? AND factor_type = 'email_otp'", args: [userId, accountContext] });
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
  previousAmr?: string[];
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
    templateId: "auth_2fa_code",
    templateData: {
      recipientName: escapeHtml(input.name || input.email.split("@")[0]),
      verification_code: code,
      verification_purpose_label: purpose === "login" ? "bejelentkezés megerősítése" : purpose === "enrollment" ? "emailes kétlépcsős ellenőrzés bekapcsolása" : "emailes kétlépcsős ellenőrzés kikapcsolása",
      account_context_label: input.accountContext === "admin" ? "adminisztrációs" : "kliensportál",
      expiresInMinutes: 5,
      request_time: new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Budapest" }).format(new Date()),
      header_subtitle: "Biztonságos fiókhozzáférés",
    },
  });
  if (!delivery.success || delivery.simulated) {
    await db.execute({ sql: "UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", args: [challengeId] });
    throw Object.assign(new Error(delivery.simulated ? "Email delivery is not configured for this environment." : "The verification email could not be delivered."), { status: 503 });
  }

  await recordSecurityEvent({ userId: input.userId, accountContext: input.accountContext, eventType: `email_otp_${purpose}_sent`, req: input.req });
  const preauthToken = jwt.sign({ purpose: `2fa_${purpose}`, challengeId, userId: input.userId, accountContext: input.accountContext, previousAmr: input.previousAmr || [] }, JWT_SECRET, { expiresIn: "5m" });
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
  return { userId: String(challenge.user_id), accountContext: challenge.account_context as AccountContext, previousAmr: Array.isArray(preauth.previousAmr) ? preauth.previousAmr.map(String) : [] };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] || character));
}
