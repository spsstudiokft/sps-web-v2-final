import bcrypt from "bcryptjs";
import { db, LOCAL_DEMO_ADMIN, setupDatabase } from "../src/db.js";

async function main() {
  await setupDatabase();
  const result = await db.execute({
    sql: `SELECT email, password_hash, role, is_active, name, workspace
          FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
    args: [LOCAL_DEMO_ADMIN.email],
  });
  const row: any = result.rows[0];
  console.log({
    exists: Boolean(row),
    email: row?.email,
    role: row?.role,
    active: row?.is_active,
    name: row?.name,
    workspace: row?.workspace,
    passwordMatches: row
      ? await bcrypt.compare(LOCAL_DEMO_ADMIN.password, String(row.password_hash || ""))
      : false,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
