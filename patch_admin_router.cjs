const fs = require('fs');
const path = './src/server/adminRouter.ts';
let content = fs.readFileSync(path, 'utf8');

const clientApi = `
// Client Management
adminRouter.get("/clients", async (req, res) => {
  try {
    const search = req.query.search || '';
    let sql = "SELECT id, email, role, is_active, created_at FROM users WHERE role = 'client'";
    let args = [];
    if (search) {
      sql += " AND email LIKE ?";
      args.push('%' + search + '%');
    }
    sql += " ORDER BY created_at DESC";
    
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

adminRouter.get("/clients/:id", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT id, email, role, is_active, created_at FROM users WHERE id = ?",
      args: [req.params.id]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: "Client not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

adminRouter.put("/clients/:id", async (req, res) => {
  try {
    const { email, is_active } = req.body;
    await db.execute({
      sql: "UPDATE users SET email = ?, is_active = ? WHERE id = ? AND role = 'client'",
      args: [email, is_active ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update client" });
  }
});

adminRouter.delete("/clients/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM users WHERE id = ? AND role = 'client'",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete client" });
  }
});
`;

content = content.replace(/export default adminRouter;/, clientApi + '\nexport default adminRouter;');
fs.writeFileSync(path, content);
