import fs from "node:fs";
import path from "node:path";
import { createVercelApp } from "../src/server/vercelApp.js";
import { getCanonicalPublicUrl } from "../src/server/appUrl.js";
import { db } from "../src/db.js";
import { renderPublicSeoPage } from "../src/server/publicSeoHtml.js";

const crawlerPattern = /(Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|facebookexternalhit|Twitterbot|Slackbot|AhrefsBot|SemrushBot)/i;
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

function requestedPath(req: any) {
  const value = Array.isArray(req.query?.path) ? req.query.path[0] : req.query?.path;
  const decoded = decodeURIComponent(String(value || "")).trim();
  return decoded.startsWith("/") ? decoded.replace(/\/+$/, "") || "/" : "/";
}

export default createVercelApp((app) => {
  app.get(["/api/seo-page", "/seo-page"], async (req: any, res: any) => {
    try {
      if (!crawlerPattern.test(String(req.get("user-agent") || ""))) return res.type("html").send(readBuiltIndex());
      const route = requestedPath(req);
      let title = "SPS Studio";
      let description = "SPS Studio publikus oldal.";

      if (/^\/portfolio\/[^/]+$/.test(route)) {
        const slug = route.split("/")[2];
        const result = await db.execute({ sql: "SELECT title, description FROM portfolio_items WHERE slug = ? AND is_published = 1 LIMIT 1", args: [slug] });
        if (!result.rows.length) return res.status(404).type("text/plain").send("Not found");
        const item: any = result.rows[0]; title = String(item.title || "SPS Studio portfólió"); description = String(item.description || "SPS Studio portfóliómunka.");
      } else if (/^\/properties\/[^/]+$/.test(route)) {
        const id = route.split("/")[2];
        const result = await db.execute({ sql: `SELECT pl.title, pl.description FROM property_listings pl JOIN properties p ON p.id = pl.property_id AND p.archived_at IS NULL WHERE pl.id = ? AND pl.is_enabled = 1 LIMIT 1`, args: [id] });
        if (!result.rows.length) return res.status(404).type("text/plain").send("Not found");
        const item: any = result.rows[0]; title = String(item.title || "Ingatlanhirdetés"); description = String(item.description || "SPS Studio ingatlanhirdetés.");
      } else if (route === "/properties") {
        title = "Ingatlanhirdetések"; description = "Aktív, részletes ingatlanhirdetések az SPS Studio felületén.";
      } else if (route === "/changelog") {
        title = "Változásnapló"; description = "Az SPS Studio nyilvános fejlesztési változásnaplója.";
      } else if (route === "/open-source") {
        title = "Open Source"; description = "Az SPS Studio nyílt forrású projektjei és fejlesztői eszközei.";
      } else if (route === "/installers") {
        title = "SPS Studio alkalmazások"; description = "Telepítési útmutató az SPS Studio alkalmazásaihoz.";
      } else {
        return res.status(404).type("text/plain").send("Not found");
      }

      res.set("Vary", "User-Agent").set("Vercel-CDN-Cache-Control", "no-store").type("html").send(
        renderPublicSeoPage({ origin: getCanonicalPublicUrl(req), path: route, title, description, links: relatedLinks.filter((link) => link.href !== route) }),
      );
    } catch (error) {
      console.error("Public SEO subpage generation error:", error);
      res.status(500).type("text/plain").send("Public page snapshot unavailable");
    }
  });
});
