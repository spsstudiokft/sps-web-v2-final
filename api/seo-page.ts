import fs from "node:fs";
import path from "node:path";
import { db, setupDatabase } from "../src/db.js";
import { getCanonicalPublicUrl } from "../src/server/appUrl.js";
import { renderPublicSeoPage } from "../src/server/publicSeoHtml.js";

const crawlerPattern = /(Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|AhrefsBot|SemrushBot|OAI-SearchBot|GPTBot|ChatGPT-User)/i;
const relatedLinks = [
  { href: "/", label: "SPS Studio főoldal" },
  { href: "/properties", label: "Ingatlanhirdetések" },
  { href: "/changelog", label: "Változásnapló" },
  { href: "/open-source", label: "Open Source projektek" },
  { href: "/installers", label: "SPS Studio alkalmazások" },
];

function readBuiltIndex() {
  const file = path.join(process.cwd(), "dist", "app-shell.html");
  if (!fs.existsSync(file)) throw new Error("Built public app shell is unavailable.");
  return fs.readFileSync(file, "utf8");
}

function queryValue(req: any, key: string) {
  const query = req.query || Object.fromEntries(new URL(req.url || "/", "https://spsstudio.hu").searchParams.entries());
  const value = query[key];
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function requestLike(req: any) {
  return { protocol: "https", get: (header: string) => String(req.headers?.[header.toLowerCase()] || "") };
}

/** Direct Vercel functions receive Node's ServerResponse, not Express' response. */
function send(res: any, status: number, contentType: string, body: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.end(body);
}

export default async function handler(req: any, res: any) {
  try {
    // Never let crawler-only data fetching affect the normal SPA response.
    if (!crawlerPattern.test(String(req.headers?.["user-agent"] || ""))) {
      res.setHeader("Vary", "User-Agent");
      res.setHeader("Vercel-CDN-Cache-Control", "no-store");
      return send(res, 200, "text/html; charset=utf-8", readBuiltIndex());
    }

    await setupDatabase();
    const kind = queryValue(req, "kind");
    const parameter = decodeURIComponent(queryValue(req, "value"));
    let page: { path: string; title: string; description: string } | null = null;

    if (kind === "portfolio" && parameter) {
      const result = await db.execute({ sql: "SELECT title, description FROM portfolio_items WHERE slug = ? AND is_published = 1 LIMIT 1", args: [parameter] });
      const item: any = result.rows[0];
      if (item) page = { path: `/portfolio/${encodeURIComponent(parameter)}`, title: String(item.title || "SPS Studio portfólió"), description: String(item.description || "SPS Studio portfóliómunka.") };
    } else if (kind === "property" && parameter) {
      const result = await db.execute({ sql: `SELECT pl.title, pl.description FROM property_listings pl JOIN properties p ON p.id = pl.property_id AND p.archived_at IS NULL WHERE pl.id = ? AND pl.is_enabled = 1 LIMIT 1`, args: [parameter] });
      const item: any = result.rows[0];
      if (item) page = { path: `/properties/${encodeURIComponent(parameter)}`, title: String(item.title || "Ingatlanhirdetés"), description: String(item.description || "SPS Studio ingatlanhirdetés.") };
    } else if (kind === "campaign" && parameter) {
      const result = await db.execute({ sql: "SELECT title, description FROM landing_campaigns WHERE slug = ? AND is_active = 1 LIMIT 1", args: [parameter] });
      const item: any = result.rows[0];
      if (item) page = { path: `/${encodeURIComponent(parameter)}`, title: String(item.title || "SPS Studio kampány"), description: String(item.description || "SPS Studio kampányoldal.") };
    } else {
      const staticPages: Record<string, { path: string; title: string; description: string }> = {
        properties: { path: "/properties", title: "Ingatlanhirdetések", description: "Aktív, részletes ingatlanhirdetések az SPS Studio felületén." },
        changelog: { path: "/changelog", title: "Változásnapló", description: "Az SPS Studio nyilvános fejlesztési változásnaplója." },
        "open-source": { path: "/open-source", title: "Open Source", description: "Az SPS Studio nyílt forrású projektjei és fejlesztői eszközei." },
        installers: { path: "/installers", title: "SPS Studio alkalmazások", description: "Telepítési útmutató az SPS Studio alkalmazásaihoz." },
      };
      page = staticPages[kind] || null;
    }

    if (!page) return send(res, 404, "text/plain; charset=utf-8", "Not found");
    const origin = getCanonicalPublicUrl(requestLike(req));
    res.setHeader("Vary", "User-Agent");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    return send(res, 200, "text/html; charset=utf-8", renderPublicSeoPage({
      origin,
      path: page.path,
      title: page.title,
      description: page.description,
      links: relatedLinks.filter((link) => link.href !== page!.path),
    }));
  } catch (error) {
    console.error("Public SEO subpage generation error:", error);
    return send(res, 500, "text/plain; charset=utf-8", "Public page snapshot unavailable");
  }
}
