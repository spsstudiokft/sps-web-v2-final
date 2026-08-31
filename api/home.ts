import fs from "node:fs";
import path from "node:path";
import { createVercelApp } from "../src/server/vercelApp.js";
import { loadPublicSeoSnapshot } from "../src/server/api.js";
import { getCanonicalPublicUrl } from "../src/server/appUrl.js";
import { renderPublicSeoHome } from "../src/server/publicSeoHtml.js";

const crawlerPattern = /(Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|facebookexternalhit|Twitterbot|Slackbot)/i;

function readBuiltIndex() {
  const file = path.join(process.cwd(), "dist", "app-shell.html");
  if (!fs.existsSync(file)) throw new Error("Built public app shell is unavailable.");
  return fs.readFileSync(file, "utf8");
}

// Route every homepage request through a single function. This prevents the
// CDN from serving a cached human SPA shell to a crawler before a conditional
// rewrite can run. Both responses represent the same public page.
export default createVercelApp((app) => {
  app.get(["/", "/api/home"], async (req: any, res: any) => {
    try {
      res.set("Vary", "User-Agent");
      res.set("Vercel-CDN-Cache-Control", "no-store");
      if (crawlerPattern.test(String(req.get("user-agent") || ""))) {
        return res.status(200).type("html").send(
          renderPublicSeoHome(await loadPublicSeoSnapshot(), getCanonicalPublicUrl(req)),
        );
      }
      return res.status(200).type("html").send(readBuiltIndex());
    } catch (error) {
      console.error("Homepage render error:", error);
      return res.status(500).type("text/plain").send("Homepage unavailable");
    }
  });
}, { initializeDatabase: true });
