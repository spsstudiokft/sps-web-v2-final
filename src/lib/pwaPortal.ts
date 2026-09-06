export type PwaPortal = "admin" | "client" | "property";

export type PwaPortalConfiguration = {
  portal: PwaPortal;
  manifest: string;
  worker: string;
  scope: string;
  launchPath: string;
  origin: string;
};

const productionHosts: Record<PwaPortal, string> = {
  admin: "admin.spsstudio.hu",
  client: "client.spsstudio.hu",
  property: "property.spsstudio.hu",
};

const configurations: Record<PwaPortal, Omit<PwaPortalConfiguration, "origin">> = {
  admin: { portal: "admin", manifest: "/admin/manifest.webmanifest", worker: "/admin/pwa-sw.js", scope: "/admin/", launchPath: "/admin/" },
  client: { portal: "client", manifest: "/client/manifest.webmanifest", worker: "/client/pwa-sw.js", scope: "/client/", launchPath: "/client/" },
  property: { portal: "property", manifest: "/property-listings/manifest.webmanifest", worker: "/property-listings/pwa-sw.js", scope: "/property-listings/", launchPath: "/property-listings/manager" },
};

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

export function getPortalForHostname(hostname: string): PwaPortal | null {
  const host = normalizeHost(hostname);
  return (Object.entries(productionHosts) as Array<[PwaPortal, string]>).find(([, expectedHost]) => host === expectedHost)?.[0] || null;
}

export function getPwaPortalConfiguration(pathname: string, hostname: string, origin: string): PwaPortalConfiguration | null {
  const portal = getPortalForHostname(hostname)
    || (pathname.startsWith("/admin/") ? "admin" : pathname.startsWith("/client/") ? "client" : pathname.startsWith("/property-listings/") ? "property" : null);
  return portal ? { ...configurations[portal], origin } : null;
}

export function getPortalLaunchUrl(portal: PwaPortal) {
  const configuredOrigin = String(import.meta.env.VITE_PWA_PORTAL_ORIGINS || "").split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .find((value) => {
      try { return new URL(value).hostname === productionHosts[portal]; } catch { return false; }
    });
  return `${configuredOrigin || `https://${productionHosts[portal]}`}${configurations[portal].launchPath}`;
}

export function getPortalLaunchPath(portal: PwaPortal) {
  return configurations[portal].launchPath;
}
