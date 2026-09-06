import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(new URL(path, `file://${root.replaceAll("\\", "/")}/`), "utf8");

const checks = [
  ["admin campaigns", "src/server/fullApiRouter.ts", 'fullApiRouter.use("/admin/campaigns"', "api/admin.ts", 'app.use("/api/admin/campaigns"'],
  ["admin exit coupons", "src/server/fullApiRouter.ts", 'fullApiRouter.use("/admin/exit-coupons"', "api/admin.ts", 'app.use("/api/admin/exit-coupons"'],
  ["public campaigns", "src/server/fullApiRouter.ts", 'fullApiRouter.use("/public/campaigns"', "api/public.ts", 'app.use("/api/public/campaigns"'],
  ["public push", "src/server/fullApiRouter.ts", 'fullApiRouter.use("/public/push"', "api/public.ts", 'app.use("/api/public/push"'],
  ["public exit coupons", "src/server/fullApiRouter.ts", 'fullApiRouter.use("/public/exit-coupons"', "api/public.ts", 'app.use("/api/public/exit-coupons"'],
];

const vercel = await read("vercel.json");
if (!vercel.includes('"source": "/api/health/:match*"') || !vercel.includes('"destination": "/api/system.ts"')) {
  console.error("Missing Vercel rewrite for nested public health routes (for example /api/health/lou).");
  process.exit(1);
}

let failed = false;
for (const [name, localFile, localRoute, vercelFile, vercelRoute] of checks) {
  const [local, vercel] = await Promise.all([read(localFile), read(vercelFile)]);
  if (!local.includes(localRoute) || !vercel.includes(vercelRoute)) {
    failed = true;
    console.error(`Missing Vercel route parity: ${name}`);
  }
}

if (failed) process.exit(1);
console.log(`Vercel route parity verified (${checks.length} specialized routes).`);
