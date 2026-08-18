const fs = require('fs');
const path = './src/server/api.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const token = jwt\.sign\(\{ id: user\.id, email: user\.email \}, JWT_SECRET, \{ expiresIn: "1d" \}\);\s*res\.json\(\{ token \}\);/,
  `if (user.is_active === 0) return res.status(403).json({ error: "Account is disabled" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'admin' }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role || 'admin' } });`
);

const registerCode = `
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email]
    });
    if (existing.rows.length > 0) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await db.execute({
      sql: "INSERT INTO users (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)",
      args: [id, email, hash, 'client', 1]
    });

    const token = jwt.sign({ id, email, role: 'client' }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id, email, role: 'client' } });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

`;

content = content.replace(/\/\/ \.\.\. public endpoints/, registerCode + '// ... public endpoints');

const requireAdminCode = `
export const requireAdmin = (req: any, res: any, next: any) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    next();
  });
};
`;

content = content.replace(/export const requireAuth = .*?};\n/s, (match) => match + '\n' + requireAdminCode);
content = content.replace(/router\.use\("\/admin", requireAuth, adminRouter\);/, 'router.use("/admin", requireAdmin, adminRouter);');

fs.writeFileSync(path, content);
