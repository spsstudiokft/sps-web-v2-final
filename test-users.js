import { getDb } from "./src/db.ts";
async function run() {
  const db = getDb();
  try {
    const res = await db.execute("SELECT email, password_hash, role FROM users");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}
run();
