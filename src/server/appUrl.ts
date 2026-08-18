type RequestLike = {
  protocol?: string;
  get?: (header: string) => string | undefined;
};

/**
 * Returns the canonical public application URL used in transactional emails.
 * APP_URL always wins; the request origin is only a local-development fallback.
 */
export function getAppUrl(req?: RequestLike): string {
  const configuredUrl = String(process.env.APP_URL || "").trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const forwardedProto = req?.get?.("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req?.get?.("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req?.protocol || "http";
  const host = forwardedHost || req?.get?.("host") || "localhost:3000";

  return `${protocol}://${host}`.replace(/\/+$/, "");
}
