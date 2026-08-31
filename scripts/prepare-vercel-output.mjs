import fs from "node:fs";
import path from "node:path";

// Vercel serves a physical /index.html before applying rewrites. Rename the
// built SPA shell only in its production output, leaving / available for the
// cache-safe homepage renderer used by people and crawlers alike.
const outputDir = path.join(process.cwd(), "dist");
const source = path.join(outputDir, "index.html");
const destination = path.join(outputDir, "app-shell.html");

if (!fs.existsSync(source)) {
  throw new Error("Expected Vite output dist/index.html was not created.");
}

fs.rmSync(destination, { force: true });
fs.renameSync(source, destination);
