import { setupDatabase, getDb } from "./src/db.ts";
async function run() {
  try {
    console.log("DB URL inside getDb?:", process.env.TURSO_DATABASE_URL);
    await setupDatabase();
    const res = await getDb().execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables after setup:", res.rows);
  } catch (err) {
    console.error("Failed:", err);
  }
}
run();
