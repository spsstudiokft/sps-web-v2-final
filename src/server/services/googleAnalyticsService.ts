import crypto from "node:crypto";

type GoogleServiceAccount = { client_email: string; private_key: string; token_uri?: string };
let tokenCache: { token: string; expiresAt: number } | null = null;
let reportCache: { value: any; expiresAt: number } | null = null;

const base64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

function getConfig() {
  const propertyId = String(process.env.GOOGLE_ANALYTICS_PROPERTY_ID || "").trim().replace(/^properties\//, "");
  const raw = String(process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON || "").trim();
  if (!propertyId || !raw) return null;
  try { const account = JSON.parse(raw) as GoogleServiceAccount; if (!account.client_email || !account.private_key) throw new Error("incomplete"); return { propertyId, account }; }
  catch { throw new Error("A GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON nem érvényes szolgáltatásfiók JSON."); }
}

async function getAccessToken(account: GoogleServiceAccount) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: account.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = crypto.createSign("RSA-SHA256"); signer.update(`${header}.${payload}`); signer.end();
  const assertion = `${header}.${payload}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const data: any = await response.json(); if (!response.ok || !data.access_token) throw new Error(data.error_description || "Google-hitelesítés sikertelen.");
  tokenCache = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 }; return tokenCache.token;
}

async function runReport(propertyId: string, token: string, body: any) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data: any = await response.json(); if (!response.ok) throw new Error(data?.error?.message || "Google Analytics lekérdezés sikertelen."); return data;
}

const metric = (report: any, index: number) => Number(report?.rows?.[0]?.metricValues?.[index]?.value || 0);

export async function getGoogleAnalyticsOverview(days = 30) {
  const config = getConfig(); if (!config) return { configured: false, propertyId: null };
  if (reportCache && reportCache.expiresAt > Date.now()) return reportCache.value;
  const token = await getAccessToken(config.account); const dateRanges = [{ startDate: `${Math.max(1, Math.min(days, 365))}daysAgo`, endDate: "today" }];
  const [totals, timeline, pages, channels] = await Promise.all([
    runReport(config.propertyId, token, { dateRanges, metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "newUsers" }, { name: "engagedSessions" }] }),
    runReport(config.propertyId, token, { dateRanges, dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }] }),
    runReport(config.propertyId, token, { dateRanges, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 }),
    runReport(config.propertyId, token, { dateRanges, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 }),
  ]);
  const value = { configured: true, propertyId: config.propertyId, totals: { activeUsers: metric(totals, 0), sessions: metric(totals, 1), pageViews: metric(totals, 2), newUsers: metric(totals, 3), engagedSessions: metric(totals, 4) }, timeline: (timeline.rows || []).map((row: any) => ({ date: row.dimensionValues?.[0]?.value || "", activeUsers: Number(row.metricValues?.[0]?.value || 0), sessions: Number(row.metricValues?.[1]?.value || 0) })), topPages: (pages.rows || []).map((row: any) => ({ path: row.dimensionValues?.[0]?.value || "/", views: Number(row.metricValues?.[0]?.value || 0) })), channels: (channels.rows || []).map((row: any) => ({ name: row.dimensionValues?.[0]?.value || "(not set)", sessions: Number(row.metricValues?.[0]?.value || 0) })) };
  reportCache = { value, expiresAt: Date.now() + 5 * 60_000 }; return value;
}
