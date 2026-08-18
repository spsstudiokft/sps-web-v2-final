const fs = require('fs');
const path = './src/server/api.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/import adminRouter from "\.\/adminRouter\.js";/, 'import adminRouter from "./adminRouter.js";\nimport clientRouter from "./clientRouter.js";');

const requireClientCode = `
export const requireClient = (req: any, res: any, next: any) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'client' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Client access required" });
    }
    next();
  });
};
`;

content = content.replace(/export const requireAdmin = .*?};\n/s, (match) => match + '\n' + requireClientCode);
content = content.replace(/router\.use\("\/admin", requireAdmin, adminRouter\);/, 'router.use("/admin", requireAdmin, adminRouter);\nrouter.use("/client", requireClient, clientRouter);');

fs.writeFileSync(path, content);
