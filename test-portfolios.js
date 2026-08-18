import { getDb } from "./src/db.ts";
async function run() {
  const db = getDb();
  try {
    const res = await db.execute(`
      SELECT p.*, c.name as category_name 
      FROM portfolio_items p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.sort_order ASC, p.created_at DESC
    `);
    console.log("Portfolios:", res.rows.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
